/**
 * Vision model configurations for OpenRouter
 * All vision-capable models with active pricing
 * Updated: 2026-01-24 from OpenRouter model list (173 models)
 */

export const VISION_CONCURRENCY = 5; // 5 concurrent requests per model

// ALL vision-capable models for comprehensive benchmarking
export const visionModelsToRun = [
  // ============ OpenAI ============
  'openai/gpt-5.2',                    // $1.75/$14
  'openai/gpt-5.2-pro',                // $21/$168
  'openai/gpt-5.2-codex',              // $1.75/$14
  'openai/gpt-5.1',                    // $1.25/$10
  'openai/gpt-5.1-codex',              // $1.25/$10
  'openai/gpt-5.1-codex-mini',         // $0.25/$2
  'openai/gpt-5.1-codex-max',          // $1.25/$10
  'openai/gpt-5',                      // $1.25/$10
  'openai/gpt-5-pro',                  // $15/$120
  'openai/gpt-5-mini',                 // $0.25/$2
  'openai/gpt-5-nano',                 // $0.05/$0.40
  'openai/gpt-5-codex',                // $1.25/$10
  'openai/gpt-5-image',                // $10/$10
  'openai/gpt-5-image-mini',           // $2.50/$2
  'openai/gpt-4o',                     // $2.50/$10
  'openai/gpt-4o-mini',                // $0.15/$0.60
  'openai/gpt-4.1',                    // $2/$8
  'openai/gpt-4.1-mini',               // $0.40/$1.60
  'openai/gpt-4.1-nano',               // $0.10/$0.40
  'openai/gpt-4-turbo',                // $10/$30
  'openai/o4-mini',                    // $1.10/$4.40
  'openai/o4-mini-high',               // $1.10/$4.40
  'openai/o3',                         // $2/$8
  'openai/o3-pro',                     // $20/$80
  'openai/o1',                         // $15/$60

  // ============ Anthropic ============
  'anthropic/claude-opus-4.5',         // $5/$25
  'anthropic/claude-opus-4.1',         // $15/$75
  'anthropic/claude-opus-4',           // $15/$75
  'anthropic/claude-sonnet-4.5',       // $3/$15
  'anthropic/claude-sonnet-4',         // $3/$15
  'anthropic/claude-haiku-4.5',        // $1/$5
  'anthropic/claude-3.7-sonnet',       // $3/$15
  'anthropic/claude-3.5-sonnet',       // $6/$30
  'anthropic/claude-3.5-haiku',        // $0.80/$4
  'anthropic/claude-3-haiku',          // $0.25/$1.25

  // ============ Google ============
  'google/gemini-3-pro-preview',       // $2/$12
  'google/gemini-3-flash-preview',     // $0.50/$3
  'google/gemini-3-pro-image-preview', // $2/$12
  'google/gemini-2.5-pro',             // $1.25/$10
  'google/gemini-2.5-flash',           // $0.30/$2.50
  'google/gemini-2.5-flash-lite',      // $0.10/$0.40
  'google/gemini-2.5-flash-image',     // $0.30/$2.50
  'google/gemini-2.0-flash-001',       // $0.10/$0.40
  'google/gemini-2.0-flash-lite-001',  // $0.075/$0.30
  'google/gemma-3-27b-it',             // $0.04/$0.15
  'google/gemma-3-12b-it',             // $0.03/$0.10
  'google/gemma-3-4b-it',              // $0.017/$0.068

  // ============ xAI ============
  'x-ai/grok-4.1-fast',                // $0.20/$0.50
  'x-ai/grok-4-fast',                  // $0.20/$0.50
  'x-ai/grok-4',                       // $3/$15

  // ============ Meta ============
  'meta-llama/llama-4-maverick',       // $0.15/$0.60
  'meta-llama/llama-4-scout',          // $0.08/$0.30
  'meta-llama/llama-3.2-11b-vision-instruct', // $0.049/$0.049

  // ============ Qwen ============
  'qwen/qwen3-vl-235b-a22b-instruct',  // $0.20/$1.20
  'qwen/qwen3-vl-32b-instruct',        // $0.50/$1.50
  'qwen/qwen3-vl-30b-a3b-instruct',    // $0.15/$0.60
  'qwen/qwen3-vl-8b-instruct',         // $0.08/$0.50
  'qwen/qwen2.5-vl-72b-instruct',      // $0.15/$0.60
  'qwen/qwen2.5-vl-32b-instruct',      // $0.05/$0.22
  'qwen/qwen-2.5-vl-7b-instruct',      // $0.20/$0.20
  'qwen/qwen-vl-max',                  // $0.80/$3.20
  'qwen/qwen-vl-plus',                 // $0.21/$0.63

  // ============ Mistral ============
  'mistralai/mistral-large-2512',      // $0.50/$1.50
  'mistralai/mistral-medium-3.1',      // $0.40/$2
  'mistralai/mistral-medium-3',        // $0.40/$2
  'mistralai/mistral-small-3.2-24b-instruct', // $0.06/$0.18
  'mistralai/mistral-small-3.1-24b-instruct', // $0.03/$0.11
  'mistralai/ministral-14b-2512',      // $0.20/$0.20
  'mistralai/ministral-8b-2512',       // $0.15/$0.15
  'mistralai/ministral-3b-2512',       // $0.10/$0.10
  'mistralai/pixtral-large-2411',      // $2/$6
  'mistralai/pixtral-12b',             // $0.10/$0.10

  // ============ ByteDance ============
  'bytedance-seed/seed-1.6',           // $0.25/$2
  'bytedance-seed/seed-1.6-flash',     // $0.075/$0.30
  'bytedance/ui-tars-1.5-7b',          // $0.10/$0.20

  // ============ Amazon ============
  'amazon/nova-premier-v1',            // $2.50/$12.50
  'amazon/nova-pro-v1',                // $0.80/$3.20
  'amazon/nova-2-lite-v1',             // $0.30/$2.50
  'amazon/nova-lite-v1',               // $0.06/$0.24

  // ============ Perplexity ============
  'perplexity/sonar-pro',              // $3/$15
  'perplexity/sonar',                  // $1/$1

  // ============ MiniMax ============
  'minimax/minimax-01',                // $0.20/$1.10

  // ============ Z.AI (GLM) ============
  'z-ai/glm-4.6v',                     // $0.30/$0.90
  'z-ai/glm-4.5v',                     // $0.60/$1.80

  // ============ NVIDIA ============
  'nvidia/nemotron-nano-12b-v2-vl',    // $0.20/$0.60

  // ============ OpenGVLab ============
  'opengvlab/internvl3-78b',           // $0.10/$0.39

  // ============ Baidu ============
  'baidu/ernie-4.5-vl-424b-a47b',      // $0.42/$1.25
  'baidu/ernie-4.5-vl-28b-a3b',        // $0.14/$0.56

  // ============ StepFun ============
  'stepfun-ai/step3',                  // $0.57/$1.42

  // ============ Arcee ============
  'arcee-ai/spotlight',                // $0.18/$0.18

  // ============ DeepCogito ============
  'deepcogito/cogito-v2-preview-llama-109b-moe', // $0.18/$0.59

  // ============ AllenAI ============
  'allenai/molmo-2-8b:free',           // FREE
] as const;

export type VisionModel = typeof visionModelsToRun[number];

// Quick test: 3 cheapest/fastest models
export const visionModelsForQuickTest = [
  'openai/gpt-4o-mini',                // $0.15/$0.60
  'anthropic/claude-3.5-haiku',        // $0.80/$4
  'google/gemini-2.0-flash-001',       // $0.10/$0.40
] as const;

// Budget tier: Cheapest models for cost-conscious testing
export const visionModelsForBudgetTest = [
  'openai/gpt-5-nano',                 // $0.05/$0.40
  'openai/gpt-4.1-nano',               // $0.10/$0.40
  'google/gemini-2.0-flash-lite-001',  // $0.075/$0.30
  'google/gemma-3-4b-it',              // $0.017/$0.068
  'mistralai/mistral-small-3.1-24b-instruct', // $0.03/$0.11
  'meta-llama/llama-3.2-11b-vision-instruct', // $0.049/$0.049
  'meta-llama/llama-4-scout',          // $0.08/$0.30
  'qwen/qwen3-vl-8b-instruct',         // $0.08/$0.50
  'amazon/nova-lite-v1',               // $0.06/$0.24
  'allenai/molmo-2-8b:free',           // FREE
] as const;

// Premium tier: Best quality models
export const visionModelsForPremiumTest = [
  'openai/gpt-5.2',
  'openai/gpt-5',
  'openai/o3',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-pro',
  'x-ai/grok-4',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'mistralai/pixtral-large-2411',
] as const;

// Mid tier: Good balance of quality and cost
export const visionModelsForMidTest = [
  'openai/gpt-5-mini',
  'openai/gpt-4o',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-3.7-sonnet',
  'google/gemini-2.5-flash',
  'google/gemini-3-flash-preview',
  'x-ai/grok-4-fast',
  'meta-llama/llama-4-maverick',
  'qwen/qwen2.5-vl-72b-instruct',
  'mistralai/mistral-large-2512',
] as const;

// Free tier: Models with no cost
export const visionModelsForFreeTest = [
  'allenai/molmo-2-8b:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
] as const;
