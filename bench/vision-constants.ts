/**
 * Vision model configurations for OpenRouter
 * All vision-capable models with active pricing
 * Updated: 2026-01-24 from OpenRouter model list (173 models)
 */

export const VISION_CONCURRENCY = 5; // 5 concurrent requests per model

// ALL vision-capable models for comprehensive benchmarking
export const visionModelsToRun = [
  // ============ OpenAI ============
  'openai/gpt-5.2',
  'openai/gpt-5.2-pro',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2-chat',
  'openai/gpt-5.1',
  'openai/gpt-5.1-codex',
  'openai/gpt-5.1-codex-mini',
  'openai/gpt-5.1-codex-max',
  'openai/gpt-5.1-chat',
  'openai/gpt-5',
  'openai/gpt-5-pro',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5-codex',
  'openai/gpt-5-chat',
  'openai/gpt-5-image',
  'openai/gpt-5-image-mini',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4o-mini-2024-07-18',
  'openai/gpt-4o-2024-11-20',
  'openai/gpt-4o-2024-08-06',
  'openai/gpt-4o-2024-05-13',
  'openai/gpt-4o:extended',
  'openai/chatgpt-4o-latest',
  'openai/gpt-4.5-preview',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'openai/gpt-4-turbo',
  'openai/gpt-4-vision-preview',
  'openai/o4-mini',
  'openai/o4-mini-high',
  'openai/o4-mini-deep-research',
  'openai/o3',
  'openai/o3-pro',
  'openai/o3-deep-research',
  'openai/o1',
  'openai/o1-pro',
  'openai/codex-mini',

  // ============ Anthropic ============
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.7-sonnet:thinking',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-sonnet-20240620',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.5-haiku-20241022',
  'anthropic/claude-3-haiku',
  'anthropic/claude-3-sonnet',
  'anthropic/claude-3-opus',

  // ============ Google ============
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-pro-preview-05-06',
  'google/gemini-2.5-pro-exp-03-25',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'google/gemini-2.5-flash-image',
  'google/gemini-2.5-flash-image-preview',
  'google/gemini-2.5-flash-preview-09-2025',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-lite-001',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5',
  'google/gemini-flash-1.5-8b',
  'google/gemini-flash-1.5-exp',
  'google/gemini-pro-1.5',
  'google/gemini-pro-1.5-exp',
  'google/gemini-exp-1121',
  'google/gemini-exp-1114',
  'google/gemma-3-27b-it',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it',
  'google/gemma-3-4b-it:free',
  'google/gemma-3-1b-it',

  // ============ xAI ============
  'x-ai/grok-4.1-fast',
  'x-ai/grok-4-fast',
  'x-ai/grok-4',
  'x-ai/grok-2-vision-1212',
  'x-ai/grok-vision-beta',

  // ============ Meta ============
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  'meta-llama/llama-guard-4-12b',
  'meta-llama/llama-3.2-90b-vision-instruct',
  'meta-llama/llama-3.2-11b-vision-instruct',

  // ============ Qwen ============
  'qwen/qwen3-vl-235b-a22b-instruct',
  'qwen/qwen3-vl-235b-a22b-thinking',
  'qwen/qwen3-vl-32b-instruct',
  'qwen/qwen3-vl-30b-a3b-instruct',
  'qwen/qwen3-vl-30b-a3b-thinking',
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen3-vl-8b-thinking',
  'qwen/qwen2.5-vl-72b-instruct',
  'qwen/qwen2.5-vl-32b-instruct',
  'qwen/qwen2.5-vl-3b-instruct',
  'qwen/qwen-2.5-vl-7b-instruct',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'qwen/qwen-vl-max',
  'qwen/qwen-vl-plus',

  // ============ Mistral ============
  'mistralai/mistral-large-2512',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-medium-3',
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/mistral-small-3.1-24b-instruct',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'mistralai/ministral-14b-2512',
  'mistralai/ministral-8b-2512',
  'mistralai/ministral-3b-2512',
  'mistralai/pixtral-large-2411',
  'mistralai/pixtral-12b',

  // ============ ByteDance ============
  'bytedance-seed/seed-1.6',
  'bytedance-seed/seed-1.6-flash',
  'bytedance-seed/seedream-4.5',
  'bytedance/ui-tars-1.5-7b',
  'bytedance-research/ui-tars-72b',

  // ============ Amazon ============
  'amazon/nova-premier-v1',
  'amazon/nova-pro-v1',
  'amazon/nova-2-lite-v1',
  'amazon/nova-lite-v1',

  // ============ Perplexity ============
  'perplexity/sonar-pro',
  'perplexity/sonar-pro-search',
  'perplexity/sonar',
  'perplexity/sonar-reasoning-pro',

  // ============ MiniMax ============
  'minimax/minimax-01',

  // ============ Z.AI (GLM) ============
  'z-ai/glm-4.6v',
  'z-ai/glm-4.5v',
  'thudm/glm-4.1v-9b-thinking',

  // ============ NVIDIA ============
  'nvidia/nemotron-nano-12b-v2-vl',
  'nvidia/nemotron-nano-12b-v2-vl:free',

  // ============ OpenGVLab ============
  'opengvlab/internvl3-78b',
  'opengvlab/internvl3-14b',
  'opengvlab/internvl3-2b',

  // ============ Baidu ============
  'baidu/ernie-4.5-vl-424b-a47b',
  'baidu/ernie-4.5-vl-28b-a3b',

  // ============ StepFun ============
  'stepfun-ai/step3',

  // ============ Arcee ============
  'arcee-ai/spotlight',

  // ============ DeepCogito ============
  'deepcogito/cogito-v2-preview-llama-109b-moe',

  // ============ AllenAI ============
  'allenai/molmo-2-8b:free',

  // ============ Microsoft ============
  'microsoft/phi-4-multimodal-instruct',

  // ============ 01.AI ============
  '01-ai/yi-vision',

  // ============ Moonshot ============
  'moonshotai/kimi-vl-a3b-thinking',

  // ============ Sourceful ============
  'sourceful/riverflow-v2-standard-preview',
  'sourceful/riverflow-v2-max-preview',
  'sourceful/riverflow-v2-fast-preview',

  // ============ Black Forest Labs (Image Gen) ============
  'black-forest-labs/flux.2-klein-4b',
  'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux.2-max',
  'black-forest-labs/flux.2-flex',

  // ============ OpenRouter Experimental ============
  'openrouter/bert-nebulon-alpha',
  'openrouter/sherlock-dash-alpha',
  'openrouter/sherlock-think-alpha',
  'openrouter/polaris-alpha',
  'openrouter/andromeda-alpha',
  'openrouter/sonoma-dusk-alpha',
  'openrouter/sonoma-sky-alpha',
  'openrouter/horizon-beta',
  'openrouter/horizon-alpha',
  'openrouter/optimus-alpha',
  'openrouter/quasar-alpha',

  // ============ NousResearch ============
  'nousresearch/nous-hermes-2-vision-7b',

  // ============ Fireworks ============
  'fireworks/firellava-13b',

  // ============ LiuHaotian (LLaVA) ============
  'liuhaotian/llava-yi-34b',
  'liuhaotian/llava-13b',
] as const;

export type VisionModel = typeof visionModelsToRun[number];

// Quick test: 3 cheapest/fastest models
export const visionModelsForQuickTest = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'google/gemini-2.0-flash-001',
] as const;

// Budget tier: Cheapest models for cost-conscious testing
export const visionModelsForBudgetTest = [
  'openai/gpt-5-nano',
  'openai/gpt-4.1-nano',
  'google/gemini-2.0-flash-lite-001',
  'google/gemma-3-4b-it',
  'google/gemma-3-1b-it',
  'mistralai/mistral-small-3.1-24b-instruct',
  'mistralai/ministral-3b-2512',
  'meta-llama/llama-3.2-11b-vision-instruct',
  'meta-llama/llama-4-scout',
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen2.5-vl-3b-instruct',
  'amazon/nova-lite-v1',
  'opengvlab/internvl3-2b',
] as const;

// Premium tier: Best quality models
export const visionModelsForPremiumTest = [
  'openai/gpt-5.2',
  'openai/gpt-5.2-pro',
  'openai/gpt-5',
  'openai/gpt-5-pro',
  'openai/o3',
  'openai/o3-pro',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-pro',
  'x-ai/grok-4',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'mistralai/pixtral-large-2411',
  'amazon/nova-premier-v1',
] as const;

// Mid tier: Good balance of quality and cost
export const visionModelsForMidTest = [
  'openai/gpt-5-mini',
  'openai/gpt-4o',
  'openai/gpt-4.1',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-haiku-4.5',
  'google/gemini-2.5-flash',
  'google/gemini-3-flash-preview',
  'x-ai/grok-4-fast',
  'x-ai/grok-4.1-fast',
  'meta-llama/llama-4-maverick',
  'qwen/qwen2.5-vl-72b-instruct',
  'qwen/qwen3-vl-32b-instruct',
  'mistralai/mistral-large-2512',
  'bytedance-seed/seed-1.6',
  'amazon/nova-pro-v1',
] as const;

// Free tier: Models with no cost
export const visionModelsForFreeTest = [
  'allenai/molmo-2-8b:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
] as const;
