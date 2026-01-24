/**
 * Vision model constants for benchmarking
 *
 * AUTO-GENERATED from OpenRouter API
 * Last updated: 2026-01-24T20:51:06.010Z
 *
 * To update: bun bench/scripts/update-vision-models.ts
 */

/** Concurrent requests per model */
export const VISION_CONCURRENCY = 50;

/** All vision-capable models from OpenRouter */
export const visionModelsToRun = [

  // ============ Allenai ============
  'allenai/molmo-2-8b:free',

  // ============ Amazon ============
  'amazon/nova-2-lite-v1',
  'amazon/nova-lite-v1',
  'amazon/nova-premier-v1',
  'amazon/nova-pro-v1',

  // ============ Anthropic ============
  'anthropic/claude-3-haiku',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.7-sonnet:thinking',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-sonnet-4.5',

  // ============ Arcee-ai ============
  'arcee-ai/spotlight',

  // ============ Baidu ============
  'baidu/ernie-4.5-vl-28b-a3b',
  'baidu/ernie-4.5-vl-424b-a47b',

  // ============ Bytedance ============
  'bytedance/ui-tars-1.5-7b',

  // ============ Bytedance-seed ============
  'bytedance-seed/seed-1.6',
  'bytedance-seed/seed-1.6-flash',

  // ============ Deepcogito ============
  'deepcogito/cogito-v2-preview-llama-109b-moe',

  // ============ Google ============
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-image',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'google/gemini-2.5-flash-preview-09-2025',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-pro-preview-05-06',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-3-pro-preview',
  'google/gemma-3-12b-it',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-27b-it',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-4b-it',
  'google/gemma-3-4b-it:free',

  // ============ Meta-llama ============
  'meta-llama/llama-3.2-11b-vision-instruct',
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',

  // ============ Minimax ============
  'minimax/minimax-01',

  // ============ Mistralai ============
  'mistralai/ministral-14b-2512',
  'mistralai/ministral-3b-2512',
  'mistralai/ministral-8b-2512',
  'mistralai/mistral-large-2512',
  'mistralai/mistral-medium-3',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-3.1-24b-instruct',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/pixtral-12b',
  'mistralai/pixtral-large-2411',

  // ============ Nvidia ============
  'nvidia/nemotron-nano-12b-v2-vl',
  'nvidia/nemotron-nano-12b-v2-vl:free',

  // ============ Openai ============
  'openai/chatgpt-4o-latest',
  'openai/gpt-4-turbo',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'openai/gpt-4o',
  'openai/gpt-4o-2024-05-13',
  'openai/gpt-4o-2024-08-06',
  'openai/gpt-4o-2024-11-20',
  'openai/gpt-4o-mini',
  'openai/gpt-4o-mini-2024-07-18',
  'openai/gpt-5',
  'openai/gpt-5-chat',
  'openai/gpt-5-codex',
  'openai/gpt-5-image',
  'openai/gpt-5-image-mini',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5-pro',
  'openai/gpt-5.1',
  'openai/gpt-5.1-chat',
  'openai/gpt-5.1-codex',
  'openai/gpt-5.1-codex-max',
  'openai/gpt-5.1-codex-mini',
  'openai/gpt-5.2',
  'openai/gpt-5.2-chat',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2-pro',
  'openai/o1',
  'openai/o1-pro',
  'openai/o3',
  'openai/o3-deep-research',
  'openai/o3-pro',
  'openai/o4-mini',
  'openai/o4-mini-deep-research',
  'openai/o4-mini-high',

  // ============ Opengvlab ============
  'opengvlab/internvl3-78b',

  // ============ Perplexity ============
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'perplexity/sonar-pro-search',
  'perplexity/sonar-reasoning-pro',

  // ============ Qwen ============
  'qwen/qwen-2.5-vl-7b-instruct',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'qwen/qwen-vl-max',
  'qwen/qwen-vl-plus',
  'qwen/qwen2.5-vl-32b-instruct',
  'qwen/qwen2.5-vl-72b-instruct',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'qwen/qwen3-vl-235b-a22b-thinking',
  'qwen/qwen3-vl-30b-a3b-instruct',
  'qwen/qwen3-vl-30b-a3b-thinking',
  'qwen/qwen3-vl-32b-instruct',
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen3-vl-8b-thinking',

  // ============ Stepfun-ai ============
  'stepfun-ai/step3',

  // ============ X-ai ============
  'x-ai/grok-4',
  'x-ai/grok-4-fast',
  'x-ai/grok-4.1-fast',

  // ============ Z-ai ============
  'z-ai/glm-4.5v',
  'z-ai/glm-4.6v',
] as const;

/** Type for valid model names */
export type VisionModel = typeof visionModelsToRun[number];

// === Tier-based exports for selective testing ===

/** Budget tier: Free models */
export const visionModelsForFreeTest = visionModelsToRun.filter(m => m.endsWith(':free'));

/** Get models by provider */
export function getModelsByProvider(provider: string): readonly string[] {
  return visionModelsToRun.filter(m => m.startsWith(provider + '/'));
}
