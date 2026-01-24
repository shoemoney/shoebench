/**
 * Vision model configurations for OpenRouter
 * Only models with vision capabilities (can process images)
 * Updated: 2026-01-24 from OpenRouter model list
 */

export const VISION_CONCURRENCY = 5; // 5 concurrent requests per model

// Vision-capable models for benchmarking (curated for quality/cost balance)
export const visionModelsToRun = [
  // OpenAI vision models
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',

  // Anthropic vision models
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3.5-haiku',

  // Google vision models
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview',

  // xAI vision models
  'x-ai/grok-4-fast',

  // Meta vision models
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  'meta-llama/llama-3.2-11b-vision-instruct',

  // Qwen vision models
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen2.5-vl-72b-instruct',
] as const;

export type VisionModel = typeof visionModelsToRun[number];

// For initial test run, use a smaller subset (faster, cheapest)
export const visionModelsForQuickTest = [
  'openai/gpt-4o-mini',           // $0.15/$0.60 per 1M
  'anthropic/claude-3.5-haiku',   // $0.80/$4 per 1M
  'google/gemini-2.0-flash-001',  // $0.10/$0.40 per 1M
] as const;

// Premium models for comprehensive testing
export const visionModelsForFullTest = [
  'openai/gpt-4o',
  'openai/gpt-5-mini',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4.5',
  'google/gemini-2.5-flash',
  'google/gemini-3-flash-preview',
  'x-ai/grok-4-fast',
  'meta-llama/llama-4-maverick',
  'qwen/qwen2.5-vl-72b-instruct',
] as const;

// Budget models for cost-conscious testing
export const visionModelsForBudgetTest = [
  'openai/gpt-5-nano',            // $0.05/$0.40 per 1M
  'google/gemini-2.5-flash-lite', // $0.10/$0.40 per 1M
  'google/gemini-2.0-flash-001',  // $0.10/$0.40 per 1M
  'meta-llama/llama-4-scout',     // $0.08/$0.30 per 1M
  'qwen/qwen3-vl-8b-instruct',    // $0.08/$0.50 per 1M
] as const;
