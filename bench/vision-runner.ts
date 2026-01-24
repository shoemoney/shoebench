/**
 * Vision test runner for shoe identification benchmark
 * Sends images to vision models via AI SDK multimodal API
 */

import { generateText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { readFile } from 'fs/promises';
import { join } from 'path';
import pLimit from 'p-limit';
import { VisionCache, computeCacheKey } from './cache';
import { type VisionTestResult, type TestStatus, type Shoe } from './vision-types';
import { SYSTEM_PROMPT, USER_PROMPT } from './prompts';

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

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check for Retry-After header
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const delayMs = parseInt(retryAfter) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }

  throw lastError!;
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
  cache: VisionCache;
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

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      shoeId: shoe.id,
      model,
      status: 'success', // Only successful responses are cached
      responseText: cached.response_text,
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

  // Cache only successful responses (not errors or refusals)
  if (result.status === 'success') {
    const promptHash = cacheKey.split(':')[2];
    cache.set({
      cache_key: cacheKey,
      model,
      shoe_id: shoe.id,
      prompt_hash: promptHash,
      response_text: result.responseText,
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
  cache?: VisionCache;
  onProgress?: (result: VisionTestResult, completed: number, total: number) => void;
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
    onProgress
  } = options;

  const limit = pLimit(concurrency);
  const results: VisionTestResult[] = [];
  let completed = 0;
  const total = models.length * shoes.length;

  // Process one model at a time (per CONTEXT.md decision)
  for (const model of models) {
    console.log(`Starting model: ${model}`);

    const modelResults = await Promise.all(
      shoes.map(shoe =>
        limit(async () => {
          const imagePath = join(projectRoot, shoe.images[0].localPath);

          try {
            const result = cache
              ? await runVisionTestWithCache({ model, shoe, imagePath, cache })
              : await runWithRetry(() => runVisionTest({ model, shoe, imagePath }));

            completed++;
            onProgress?.(result, completed, total);
            return result;
          } catch (error: any) {
            completed++;
            const errorResult: VisionTestResult = {
              shoeId: shoe.id,
              model,
              status: 'error',
              responseText: error.message || String(error),
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
        })
      )
    );

    results.push(...modelResults);
    console.log(`Completed model: ${model}`);
  }

  return results;
}
