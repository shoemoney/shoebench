/**
 * Judge runner for LLM-based shoe identification evaluation
 * Uses AI SDK generateText with manual JSON parsing (OpenRouter doesn't reliably proxy structured output)
 */

import { generateText } from 'ai';
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
 * JSON output instruction to append to judge prompt
 */
const JSON_OUTPUT_INSTRUCTION = `

IMPORTANT: You must respond ONLY with a valid JSON object in this exact format, no other text:
{
  "brandMatch": true or false,
  "modelMatch": true or false,
  "tier": "exact" or "variant" or "brand_only" or "wrong",
  "score": 100 or 75 or 50 or 0,
  "confidence": "high" or "medium" or "low",
  "reasoning": "Brief 1-sentence explanation"
}

Do not include any text before or after the JSON. Only output the JSON object.`;

/**
 * Extract JSON from text response (handles markdown code blocks)
 */
function extractJSON(text: string): any {
  // Try to find JSON in markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // Try parsing the whole text as JSON
  return JSON.parse(text.trim());
}

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
    // Build judge prompt with position randomization + JSON instruction
    const judgePrompt = buildJudgePrompt({
      visionResponse: visionResult.responseText,
      groundTruth: {
        brand: shoe.brand,
        model: shoe.model,
        aliases: shoe.aliases
      },
      randomize: true
    }) + JSON_OUTPUT_INSTRUCTION;

    const startTime = Date.now();

    // Call judge model with generateText (OpenRouter doesn't reliably proxy structured output)
    const result = await generateText({
      model: openrouter(JUDGE_MODEL, { usage: { include: true } }),
      system: JUDGE_SYSTEM_PROMPT,
      prompt: judgePrompt
    });

    const latencyMs = Date.now() - startTime;

    // Parse JSON from text response
    const rawResponse = result.text;
    let judgment: z.infer<typeof JudgeResultSchema>;

    try {
      const parsed = extractJSON(rawResponse);
      judgment = JudgeResultSchema.parse(parsed);
    } catch (parseError: any) {
      console.error('Failed to parse judge response:', rawResponse);
      throw new Error(`JSON parse failed: ${parseError.message}`);
    }

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
