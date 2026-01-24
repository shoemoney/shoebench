/**
 * Vision model configurations for OpenRouter
 * Only models with vision capabilities (can process images)
 */

export const VISION_CONCURRENCY = 5; // 5 concurrent requests per model

// Subset of vision-capable models for initial testing
// Full list can be expanded later
export const visionModelsToRun = [
  // OpenAI vision models
  'openai/gpt-4o',
  'openai/gpt-4o-mini',

  // Anthropic vision models
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',

  // Google vision models
  'google/gemini-2.0-flash-001',
  'google/gemini-3-flash-preview',

  // Open source vision models (via OpenRouter)
  'meta-llama/llama-3.2-11b-vision-instruct',
] as const;

export type VisionModel = typeof visionModelsToRun[number];

// For initial test run, use a smaller subset (faster, cheaper)
export const visionModelsForQuickTest = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-haiku',
  'google/gemini-2.0-flash-001',
] as const;
