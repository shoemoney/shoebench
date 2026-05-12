/**
 * Vision test runner for shoe identification benchmark
 * Sends images to vision models via AI SDK multimodal API
 */

import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { readFile } from 'fs/promises';
import { join } from 'path';
import pLimit from 'p-limit';
import { computeCacheKey } from './cache';
import type { VisionCacheBackend } from './cache-types';
import { type VisionTestResult, type TestStatus, type Shoe } from './vision-types';
import { SYSTEM_PROMPT, USER_PROMPT } from './prompts';

/**
 * Classify an error message as permanent (capability/availability) or
 * transient (rate limit, intermittent provider failure). Permanent
 * errors poison the cache and cause the model to be excluded on future
 * runs. Transient errors are not cached so they retry next time.
 */
export type ErrorClass = 'rate_limit' | 'permanent' | 'transient';

export function classifyError(text: string): ErrorClass {
  const t = text.toLowerCase();
  if (t.includes('rate limit') || t.includes('rate-limit') || t.includes('429') || t.includes('too many requests')) {
    return 'rate_limit';
  }
  if (
    t.includes('no endpoints found') ||
    t.includes('alpha period for this model has ended') ||
    t.includes('were stealth models') ||
    t.includes('not a vision') ||
    t.includes('does not support image') ||
    t.includes('model not found') ||
    t.includes('404') ||
    t.includes('provider returned error')
  ) {
    return 'permanent';
  }
  return 'transient';
}

/**
 * Refusal detection keywords
 */
const REFUSAL_KEYWORDS = [
  'cannot',
  'unable',
  "can't",
  'not able to',
  'cannot determine',
  'cannot identify',
  "i'm unable",
  'not able to identify',
  'cannot provide',
  "i can't"
];

/**
 * Detect if response is a refusal
 */
export function isRefusal(responseText: string): boolean {
  const lower = responseText.toLowerCase();
  return REFUSAL_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * Load image as base64 data URL
 */
export async function loadImageAsBase64(imagePath: string): Promise<string> {
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Extract cost from provider metadata (OpenRouter pattern)
 */
function extractCost(providerMetadata: any): number {
  if (!providerMetadata?.openrouter) return 0;
  const meta = providerMetadata.openrouter as any;
  if (meta?.usage?.costDetails?.upstreamInferenceCost) {
    return meta.usage.costDetails.upstreamInferenceCost;
  }
  if (meta?.usage?.cost) {
    return meta.usage.cost;
  }
  return 0;
}

/**
 * Run test with retry logic and exponential backoff
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  // For rate-limit errors we extend the retry budget significantly and
  // back off harder; transient/permanent errors use the normal budget.
  let attempt = 0;
  let rateLimitAttempts = 0;
  const maxRateLimitAttempts = 6;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const cls = classifyError(error?.message ?? String(error));

      if (cls === 'rate_limit') {
        if (rateLimitAttempts >= maxRateLimitAttempts) throw lastError;
        const retryAfter = error.response?.headers?.['retry-after'];
        const delayMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(60_000, Math.pow(2, rateLimitAttempts) * 2000); // 2,4,8,16,32,60s
        await new Promise(r => setTimeout(r, delayMs));
        rateLimitAttempts++;
        continue;
      }

      if (attempt >= maxRetries) throw lastError;
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, backoffMs));
      attempt++;
    }
  }
}

/**
 * Run vision test (uncached)
 */
export async function runVisionTest(params: {
  model: string;
  shoe: Shoe;
  imagePath: string;
  systemPrompt?: string;
  userPrompt?: string;
}): Promise<VisionTestResult> {
  const {
    model,
    shoe,
    imagePath,
    systemPrompt = SYSTEM_PROMPT,
    userPrompt = USER_PROMPT
  } = params;

  // Load and encode image
  const imageBase64 = await loadImageAsBase64(imagePath);

  // Get image metadata (from catalog or file stats)
  const imageInfo = shoe.images[0];

  const startTime = Date.now();

  const result = await generateText({
    model: openrouter(model, { usage: { include: true } }),
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image', image: imageBase64 }
      ]
    }]
  });

  const latencyMs = Date.now() - startTime;

  // Extract metrics
  const cost = extractCost(result.providerMetadata);
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;
  const totalTokens = result.usage?.totalTokens ?? inputTokens + outputTokens;

  // Determine status
  let status: TestStatus = 'success';
  if (isRefusal(result.text)) {
    status = 'refusal';
  }

  return {
    shoeId: shoe.id,
    model,
    status,
    responseText: result.text,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    latencyMs,
    imageWidth: imageInfo.width,
    imageHeight: imageInfo.height,
    imageSizeBytes: imageInfo.sizeBytes,
    fromCache: false,
    createdAt: Date.now()
  };
}

/**
 * Run vision test with cache awareness
 */
export async function runVisionTestWithCache(params: {
  model: string;
  shoe: Shoe;
  imagePath: string;
  cache: VisionCacheBackend;
  systemPrompt?: string;
  userPrompt?: string;
}): Promise<VisionTestResult> {
  const {
    model,
    shoe,
    imagePath,
    cache,
    systemPrompt = SYSTEM_PROMPT,
    userPrompt = USER_PROMPT
  } = params;

  const fullPrompt = systemPrompt + userPrompt;
  const cacheKey = computeCacheKey(model, shoe.id, fullPrompt);

  // Check cache first.
  // Permanent errors stay cached (model is structurally unreachable).
  // Transient errors are not written to cache going forward, and any
  // legacy unclassified __ERROR__ rows from older runs are treated as
  // a cache miss so they get retried.
  const cached = await cache.get(cacheKey);
  const isPerm = cached?.response_text.startsWith('__ERROR_PERM__:');
  const isLegacyErr = cached?.response_text.startsWith('__ERROR__:');
  if (cached && !isLegacyErr) {
    return {
      shoeId: shoe.id,
      model,
      status: isPerm ? 'error' : 'success',
      responseText: isPerm ? cached.response_text.slice(15) : cached.response_text,
      inputTokens: cached.input_tokens,
      outputTokens: cached.output_tokens,
      totalTokens: cached.total_tokens,
      cost: cached.cost,
      latencyMs: cached.latency_ms,
      imageWidth: cached.image_width,
      imageHeight: cached.image_height,
      imageSizeBytes: cached.image_size_bytes,
      fromCache: true,
      createdAt: cached.created_at
    };
  }

  // Run test with retry
  const result = await runWithRetry(() =>
    runVisionTest({ model, shoe, imagePath, systemPrompt, userPrompt })
  );

  // Cache only successful responses. Errors are never written as rows;
  // permanent ones are recorded by exclude_models via the batch runner.
  if (result.status === 'success') {
    const promptHash = cacheKey.split(':')[2];
    const responseText = result.responseText;
    await cache.set({
      cache_key: cacheKey,
      model,
      shoe_id: shoe.id,
      prompt_hash: promptHash,
      response_text: responseText,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      total_tokens: result.totalTokens,
      cost: result.cost,
      latency_ms: result.latencyMs,
      created_at: result.createdAt,
      image_width: result.imageWidth,
      image_height: result.imageHeight,
      image_size_bytes: result.imageSizeBytes
    });
  }

  return result;
}

/**
 * Batch execution options
 */
export type VisionBatchOptions = {
  models: string[];
  shoes: Shoe[];
  projectRoot: string; // Required: project root for resolving image paths
  concurrency?: number; // default 5
  cache?: VisionCacheBackend;
  onProgress?: (result: VisionTestResult, completed: number, total: number) => void;
  errorThreshold?: number; // default 0.5 - skip models with error rate above this
};

/**
 * Run vision tests in batch with concurrency control
 */
export async function runVisionBatch(options: VisionBatchOptions): Promise<VisionTestResult[]> {
  const {
    models,
    shoes,
    projectRoot,
    concurrency = 5,
    cache,
    onProgress,
    errorThreshold = 0.5
  } = options;

  const limit = pLimit(concurrency);
  const results: VisionTestResult[] = [];
  let completed = 0;
  const total = models.length * shoes.length;

  // Models excluded from previous runs (capability/availability errors)
  const skippedModels = cache ? await cache.getSkippedModels() : [];
  if (skippedModels.length > 0) {
    console.log(`\nSkipping ${skippedModels.length} previously excluded models:`);
    skippedModels.forEach(m => console.log(`  - ${m}`));
    console.log('');
  }

  // Process one model at a time (per CONTEXT.md decision)
  for (const model of models) {
    if (skippedModels.includes(model)) {
      console.log(`Skipping excluded model: ${model}`);
      completed += shoes.length;
      continue;
    }

    console.log(`Starting model: ${model}`);
    let excluded = false;
    let exclusionError = '';

    // Probe-then-fan-out: run one shoe alone first so a permanent
    // failure short-circuits the rest of the batch instead of racing
    // 50 parallel calls before the first error lands.
    const runOne = async (shoe: Shoe): Promise<VisionTestResult> => {
      const imagePath = join(projectRoot, shoe.images[0].localPath);
      try {
        const result = cache
          ? await runVisionTestWithCache({ model, shoe, imagePath, cache })
          : await runWithRetry(() => runVisionTest({ model, shoe, imagePath }));
        completed++;
        onProgress?.(result, completed, total);
        if (result.status === 'error' && !result.fromCache) {
          const cls = classifyError(result.responseText);
          if (cls === 'permanent' && !excluded) {
            excluded = true;
            exclusionError = result.responseText;
          }
        }
        return result;
      } catch (error: any) {
        completed++;
        const message = error.message || String(error);
        const cls = classifyError(message);
        if (cls === 'permanent' && !excluded) {
          excluded = true;
          exclusionError = message;
        }
        const errorResult: VisionTestResult = {
          shoeId: shoe.id,
          model,
          status: 'error',
          responseText: message,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          latencyMs: 0,
          imageWidth: shoe.images[0].width,
          imageHeight: shoe.images[0].height,
          imageSizeBytes: shoe.images[0].sizeBytes,
          fromCache: false,
          createdAt: Date.now()
        };
        onProgress?.(errorResult, completed, total);
        return errorResult;
      }
    };

    const modelResults: VisionTestResult[] = [];

    // Probe with first shoe
    modelResults.push(await runOne(shoes[0]));

    if (excluded) {
      // Mark the rest as skipped (no API calls)
      for (let i = 1; i < shoes.length; i++) {
        completed++;
      }
    } else {
      const rest = await Promise.all(
        shoes.slice(1).map(shoe =>
          limit(async (): Promise<VisionTestResult | null> => {
            if (excluded) {
              completed++;
              return null;
            }
            return runOne(shoe);
          })
        )
      );
      for (const r of rest) if (r) modelResults.push(r);
    }

    results.push(...modelResults);

    if (excluded && cache) {
      console.log(`⛔  Excluding model ${model} permanently: ${exclusionError.slice(0, 120)}`);
      await cache.excludeModel(model, 'permanent_error', exclusionError);
    } else {
      console.log(`Completed model: ${model}`);
    }
  }

  return results;
}
