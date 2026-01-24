/**
 * Judge runner for LLM-based shoe identification evaluation
 * Uses AI SDK generateObject with Claude 3.5 Haiku
 */

import { generateObject } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { type JudgeEvaluation } from './judge-types';
import { type VisionTestResult, type Shoe } from './vision-types';
import { JudgeCache, computeJudgeCacheKey } from './judge-cache';
import { JUDGE_SYSTEM_PROMPT, buildJudgePrompt, JUDGE_PROMPT_VERSION, SCORING_RUBRIC_VERSION } from './judge-prompts';

/**
 * Zod schema for structured judge output
 * No extended reasoning - judge decision is straightforward for local evaluation
 */
export const JudgeResultSchema = z.object({
  brandMatch: z.boolean().describe('Does the response correctly identify the brand?'),
  modelMatch: z.boolean().describe('Does the response correctly identify the model name or use an acceptable variant?'),
  tier: z.enum(['exact', 'variant', 'brand_only', 'wrong']).describe('Match quality tier'),
  score: z.number().describe('Numeric score: 100 (exact), 75 (variant), 50 (brand_only), 0 (wrong)'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence in this judgment'),
  reasoning: z.string().describe('Brief explanation (1 sentence)')
});

/**
 * Judge model (Claude 3.5 Haiku via OpenRouter)
 */
const JUDGE_MODEL = 'anthropic/claude-3.5-haiku';

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
 * Run judge evaluation (uncached)
 */
export async function runJudge(params: {
  visionResult: VisionTestResult;
  shoe: Shoe;
}): Promise<JudgeEvaluation> {
  const { visionResult, shoe } = params;

  try {
    // Build judge prompt with position randomization
    const judgePrompt = buildJudgePrompt({
      visionResponse: visionResult.responseText,
      groundTruth: {
        brand: shoe.brand,
        model: shoe.model,
        aliases: shoe.aliases
      },
      randomize: true
    });

    const startTime = Date.now();

    // Call judge model with structured output (generateObject)
    const result = await generateObject({
      model: openrouter(JUDGE_MODEL, { usage: { include: true } }),
      system: JUDGE_SYSTEM_PROMPT,
      schema: JudgeResultSchema,
      prompt: judgePrompt
    });

    const latencyMs = Date.now() - startTime;

    // Extract structured output
    const judgment = result.object;

    // Extract metrics
    const cost = extractCost(result.providerMetadata);
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;
    const totalTokens = result.usage?.totalTokens ?? inputTokens + outputTokens;

    // Build JudgeEvaluation
    return {
      cache_key: '', // Will be set by cache layer
      vision_response_text: visionResult.responseText,
      ground_truth_brand: shoe.brand,
      ground_truth_model: shoe.model,
      aliases: shoe.aliases || [],
      tier: judgment.tier,
      score: judgment.score,
      confidence: judgment.confidence,
      reasoning: judgment.reasoning,
      brand_match: judgment.brandMatch,
      model_match: judgment.modelMatch,
      judge_model: JUDGE_MODEL,
      judge_prompt_version: JUDGE_PROMPT_VERSION,
      rubric_version: SCORING_RUBRIC_VERSION,
      raw_judge_response: JSON.stringify(judgment),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost,
      latency_ms: latencyMs,
      created_at: Date.now()
    };
  } catch (error: any) {
    console.error('Judge evaluation error:', error);

    // Return error result
    return {
      cache_key: '',
      vision_response_text: visionResult.responseText,
      ground_truth_brand: shoe.brand,
      ground_truth_model: shoe.model,
      aliases: shoe.aliases || [],
      tier: 'wrong',
      score: 0,
      confidence: 'low',
      reasoning: `Error during evaluation: ${error.message || String(error)}`,
      brand_match: false,
      model_match: false,
      judge_model: JUDGE_MODEL,
      judge_prompt_version: JUDGE_PROMPT_VERSION,
      rubric_version: SCORING_RUBRIC_VERSION,
      raw_judge_response: JSON.stringify({ error: error.message || String(error) }),
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      cost: 0,
      latency_ms: 0,
      created_at: Date.now()
    };
  }
}

/**
 * Run judge evaluation with cache awareness
 */
export async function runJudgeWithCache(params: {
  visionResult: VisionTestResult;
  shoe: Shoe;
  cache: JudgeCache;
}): Promise<JudgeEvaluation> {
  const { visionResult, shoe, cache } = params;

  // Compute cache key
  const cacheKey = computeJudgeCacheKey({
    visionResponse: visionResult.responseText,
    groundTruthBrand: shoe.brand,
    groundTruthModel: shoe.model,
    aliases: shoe.aliases || [],
    judgePromptVersion: JUDGE_PROMPT_VERSION,
    rubricVersion: SCORING_RUBRIC_VERSION
  });

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - run judge
  const result = await runJudge({ visionResult, shoe });

  // Set cache key and store
  result.cache_key = cacheKey;
  cache.set(result);

  return result;
}
