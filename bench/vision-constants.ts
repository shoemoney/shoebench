/**
 * Vision model constants for benchmarking
 *
 * AUTO-GENERATED from OpenRouter API
 * Last updated: 2026-05-17T08:00:01.426Z
 *
 * To update: bun bench/scripts/update-vision-models.ts
 */

/** Concurrent requests per model */
export const VISION_CONCURRENCY = 50;

/** All vision-capable models from OpenRouter */
export const visionModelsToRun = [

  // ============ Amazon ============
  'amazon/nova-2-lite-v1',
  'amazon/nova-lite-v1',
  'amazon/nova-premier-v1',
  'amazon/nova-pro-v1',

  // ============ Anthropic ============
  'anthropic/claude-3-haiku',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.6-fast',
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.7-fast',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4.6',

  // ============ Arcee-ai ============
  'arcee-ai/spotlight',

  // ============ Baidu ============
  'baidu/ernie-4.5-vl-28b-a3b',
  'baidu/ernie-4.5-vl-424b-a47b',
  'baidu/qianfan-ocr-fast',

  // ============ Bytedance ============
  'bytedance/ui-tars-1.5-7b',

  // ============ Bytedance-seed ============
  'bytedance-seed/seed-1.6',
  'bytedance-seed/seed-1.6-flash',
  'bytedance-seed/seed-2.0-lite',
  'bytedance-seed/seed-2.0-mini',

  // ============ Google ============
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-image',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-pro-preview-05-06',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3.1-flash-lite',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.1-pro-preview-customtools',
  'google/gemma-3-12b-it',
  'google/gemma-3-27b-it',
  'google/gemma-3-4b-it',
  'google/gemma-4-26b-a4b-it',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it',
  'google/gemma-4-31b-it:free',
  'google/lyria-3-clip-preview',
  'google/lyria-3-pro-preview',

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
  'mistralai/mistral-medium-3-5',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-2603',
  'mistralai/mistral-small-3.1-24b-instruct',
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/pixtral-large-2411',

  // ============ Moonshotai ============
  'moonshotai/kimi-k2.5',
  'moonshotai/kimi-k2.6',

  // ============ Nvidia ============
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',

  // ============ Openai ============
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
  'openai/gpt-5.3-chat',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.4',
  'openai/gpt-5.4-image-2',
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.4-pro',
  'openai/gpt-5.5',
  'openai/gpt-5.5-pro',
  'openai/gpt-chat-latest',
  'openai/o1',
  'openai/o1-pro',
  'openai/o3',
  'openai/o3-deep-research',
  'openai/o3-pro',
  'openai/o4-mini',
  'openai/o4-mini-deep-research',
  'openai/o4-mini-high',

  // ============ Openrouter ============
  'openrouter/auto',
  'openrouter/free',

  // ============ Perceptron ============
  'perceptron/perceptron-mk1',

  // ============ Perplexity ============
  'perplexity/sonar',
  'perplexity/sonar-pro',
  'perplexity/sonar-pro-search',
  'perplexity/sonar-reasoning-pro',

  // ============ Qwen ============
  'qwen/qwen2.5-vl-72b-instruct',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'qwen/qwen3-vl-235b-a22b-thinking',
  'qwen/qwen3-vl-30b-a3b-instruct',
  'qwen/qwen3-vl-30b-a3b-thinking',
  'qwen/qwen3-vl-32b-instruct',
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen3-vl-8b-thinking',
  'qwen/qwen3.5-122b-a10b',
  'qwen/qwen3.5-27b',
  'qwen/qwen3.5-35b-a3b',
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3.5-9b',
  'qwen/qwen3.5-flash-02-23',
  'qwen/qwen3.5-plus-02-15',
  'qwen/qwen3.5-plus-20260420',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.6-35b-a3b',
  'qwen/qwen3.6-flash',
  'qwen/qwen3.6-plus',

  // ============ Rekaai ============
  'rekaai/reka-edge',

  // ============ X-ai ============
  'x-ai/grok-4.20',
  'x-ai/grok-4.20-multi-agent',
  'x-ai/grok-4.3',

  // ============ Xiaomi ============
  'xiaomi/mimo-v2-omni',
  'xiaomi/mimo-v2.5',

  // ============ Z-ai ============
  'z-ai/glm-4.5v',
  'z-ai/glm-4.6v',
  'z-ai/glm-5v-turbo',
] as const;

/** Type for valid model names */
export type VisionModel = typeof visionModelsToRun[number];

// === Tier-based exports for selective testing ===
// NOTE: These are manually curated lists - update when new flagship models release

/** Quick test: 3 fast, cheap models */
export const visionModelsForQuickTest = [
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
] as const;

/** Budget tier: Cheapest models */
export const visionModelsForBudgetTest = [
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-4o-mini',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-haiku-4.5',
  'mistralai/ministral-3b-2512',
  'mistralai/ministral-8b-2512',
  'qwen/qwen-2.5-vl-7b-instruct',
  'meta-llama/llama-3.2-11b-vision-instruct',
] as const;

/** Mid tier: Balanced quality/cost */
export const visionModelsForMidTest = [
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash',
  'openai/gpt-4o',
  'openai/gpt-4.1',
  'openai/gpt-5',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-4',
  'mistralai/pixtral-12b',
  'mistralai/mistral-medium-3.1',
  'qwen/qwen2.5-vl-32b-instruct',
  'qwen/qwen2.5-vl-72b-instruct',
  'meta-llama/llama-4-scout',
  'amazon/nova-pro-v1',
  'x-ai/grok-4-fast',
  'bytedance-seed/seed-1.6-flash',
] as const;

/** Premium tier: Best models */
export const visionModelsForPremiumTest = [
  'google/gemini-2.5-pro',
  'google/gemini-3-pro-preview',
  'openai/gpt-5-pro',
  'openai/gpt-5.2-pro',
  'openai/o1',
  'openai/o1-pro',
  'openai/o3',
  'openai/o3-pro',
  'anthropic/claude-opus-4',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-4.5',
  'mistralai/pixtral-large-2411',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'x-ai/grok-4',
] as const;

/** Free tier: Zero cost models */
export const visionModelsForFreeTest = visionModelsToRun.filter(m => m.endsWith(':free'));

/** Get models by provider */
export function getModelsByProvider(provider: string): readonly string[] {
  return visionModelsToRun.filter(m => m.startsWith(provider + '/'));
}
