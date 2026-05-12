#!/usr/bin/env bun
/**
 * Fetch vision-capable models from OpenRouter API and update vision-constants.ts
 *
 * Usage:
 *   bun bench/scripts/update-vision-models.ts [--dry-run] [--save-raw]
 *   npm run update-models
 *
 * Options:
 *   --dry-run   Print changes without writing files
 *   --save-raw  Save raw API response to bench/cache/openrouter-models.json
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const OPENROUTER_MODELS_API = 'https://openrouter.ai/api/v1/models';

// Models/prefixes to exclude (known broken or not actually vision models)
const EXCLUDED_MODELS = [
  // Image generation models (not vision)
  'black-forest-labs/flux',

  // Safety/classifier models
  'meta-llama/llama-guard',

  // Deprecated or broken OpenAI models
  'openai/gpt-4-vision-preview',
  'openai/gpt-4o:extended',
  'openai/gpt-4.5-preview',
  'openai/codex-mini',

  // Broken/problematic models
  'sourceful/riverflow',
];

interface OpenRouterModel {
  id: string;
  name: string;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
    image: string;
  };
}

interface ModelsResponse {
  data: OpenRouterModel[];
}

function groupByProvider(models: OpenRouterModel[]): Map<string, OpenRouterModel[]> {
  const groups = new Map<string, OpenRouterModel[]>();

  for (const model of models) {
    const provider = model.id.split('/')[0];
    if (!groups.has(provider)) {
      groups.set(provider, []);
    }
    groups.get(provider)!.push(model);
  }

  return groups;
}

function generateConstantsFile(models: OpenRouterModel[]): string {
  const grouped = groupByProvider(models);
  const providers = Array.from(grouped.keys()).sort();

  let content = `/**
 * Vision model constants for benchmarking
 *
 * AUTO-GENERATED from OpenRouter API
 * Last updated: ${new Date().toISOString()}
 *
 * To update: bun bench/scripts/update-vision-models.ts
 */

/** Concurrent requests per model */
export const VISION_CONCURRENCY = 50;

/** All vision-capable models from OpenRouter */
export const visionModelsToRun = [
`;

  for (const provider of providers) {
    const providerModels = grouped.get(provider)!;
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    content += `\n  // ============ ${providerName} ============\n`;

    for (const model of providerModels.sort((a, b) => a.id.localeCompare(b.id))) {
      content += `  '${model.id}',\n`;
    }
  }

  content += `] as const;

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
`;

  return content;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const saveRaw = process.argv.includes('--save-raw');

  try {
    // Fetch all models from API
    console.log('Fetching models from OpenRouter API...');
    const response = await fetch(OPENROUTER_MODELS_API);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data: ModelsResponse = await response.json();
    console.log(`Total models: ${data.data.length}`);

    // Save raw response if requested
    if (saveRaw) {
      const cacheDir = join(__dirname, '../cache');
      await mkdir(cacheDir, { recursive: true });
      const rawPath = join(cacheDir, 'openrouter-models.json');
      await writeFile(rawPath, JSON.stringify(data, null, 2));
      console.log(`Saved raw API response to ${rawPath}`);
    }

    // Filter for vision-capable models
    const visionModels = data.data.filter(model =>
      model.architecture.input_modalities?.includes('image')
    );
    console.log(`Vision-capable models: ${visionModels.length}`);

    // Exclude known broken/non-vision models and ~-prefixed "latest"
    // aliases (they duplicate concrete models and are unstable references).
    const filteredModels = visionModels.filter(model => {
      if (model.id.startsWith('~')) return false;
      if (EXCLUDED_MODELS.some(excluded => model.id.startsWith(excluded))) return false;
      return true;
    });
    console.log(`After exclusions: ${filteredModels.length}`);

    const content = generateConstantsFile(filteredModels);
    const outputPath = join(__dirname, '../vision-constants.ts');

    if (dryRun) {
      console.log('\n--- DRY RUN ---\n');
      console.log(content);
      console.log('\n--- END DRY RUN ---');
    } else {
      await writeFile(outputPath, content);
      console.log(`\nWrote ${outputPath}`);
      console.log(`Total vision models: ${filteredModels.length}`);
    }

    // Print summary by provider
    const grouped = groupByProvider(filteredModels);
    console.log('\nModels by provider:');
    for (const [provider, providerModels] of Array.from(grouped.entries()).sort()) {
      console.log(`  ${provider}: ${providerModels.length}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
