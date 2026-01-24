#!/usr/bin/env bun
/**
 * Vision Benchmark Runner
 *
 * Usage:
 *   bun run bench/run-vision-benchmark.ts [options]
 *
 * Options:
 *   --shoes=N      Number of shoes to test (default: 20)
 *   --quick        Use quick test models (3 fastest models)
 *   --tier=TIER    Model tier: budget, mid, premium, free (default: all)
 *   --model=NAME   Test specific model only
 *   --no-cache     Disable caching (re-run all tests)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (override existing env vars)
config({ path: resolve(__dirname, '../.env'), override: true });

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { runVisionBatch } from './vision-runner';
import { VisionCache } from './cache';
import {
  visionModelsToRun,
  visionModelsForQuickTest,
  visionModelsForBudgetTest,
  visionModelsForMidTest,
  visionModelsForPremiumTest,
  visionModelsForFreeTest,
  VISION_CONCURRENCY
} from './vision-constants';
import type { ShoeCatalog } from './vision-types';

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

async function main() {
  console.log('Vision Benchmark Runner');
  console.log('=======================\n');

  // Check for API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY not set');
    console.error('Please set it in .env file or environment');
    process.exit(1);
  }
  console.log('OpenRouter API key loaded from .env');

  // Load catalog
  const catalogPath = join(__dirname, '../dataset/catalog.json');
  const catalogRaw = await readFile(catalogPath, 'utf-8');
  const catalog: ShoeCatalog = JSON.parse(catalogRaw);
  console.log(`Loaded catalog: ${catalog.totalShoes} shoes`);

  // Filter to shoes with existing images
  const shoesWithImages = catalog.shoes.filter(shoe => {
    const imagePath = join(__dirname, '..', shoe.images[0].localPath);
    return existsSync(imagePath);
  });
  console.log(`Shoes with images: ${shoesWithImages.length}/${catalog.totalShoes}`);

  // Select shoes (default 20, or specified via --shoes=N)
  const shoeCount = parseInt(getArg('shoes') || '20');
  const selectedShoes = shoesWithImages.slice(0, shoeCount);
  console.log(`Selected ${selectedShoes.length} shoes for testing`);

  // Select models
  let models: string[];
  const specificModel = getArg('model');
  const tier = getArg('tier');

  if (specificModel) {
    models = [specificModel];
    console.log(`Testing single model: ${specificModel}`);
  } else if (hasFlag('quick')) {
    models = [...visionModelsForQuickTest];
    console.log(`Quick mode: ${models.length} models`);
  } else if (tier) {
    switch (tier) {
      case 'budget':
        models = [...visionModelsForBudgetTest];
        console.log(`Budget tier: ${models.length} models (cheapest)`);
        break;
      case 'mid':
        models = [...visionModelsForMidTest];
        console.log(`Mid tier: ${models.length} models (balanced)`);
        break;
      case 'premium':
        models = [...visionModelsForPremiumTest];
        console.log(`Premium tier: ${models.length} models (best quality)`);
        break;
      case 'free':
        models = [...visionModelsForFreeTest];
        console.log(`Free tier: ${models.length} models (no cost)`);
        break;
      default:
        console.error(`ERROR: Unknown tier '${tier}'. Valid options: budget, mid, premium, free`);
        process.exit(1);
    }
  } else {
    models = [...visionModelsToRun];
    console.log(`Full mode: ${models.length} models`);
  }

  // Initialize cache (unless --no-cache)
  const useCache = !hasFlag('no-cache');
  let cache: VisionCache | undefined;
  if (useCache) {
    cache = new VisionCache();
    console.log('Cache enabled');
  } else {
    console.log('Cache disabled');
  }

  const totalTests = models.length * selectedShoes.length;
  console.log(`\nRunning ${totalTests} tests (${models.length} models x ${selectedShoes.length} shoes)`);
  console.log(`Concurrency: ${VISION_CONCURRENCY} per model\n`);

  const startTime = Date.now();

  // Run benchmark
  const projectRoot = join(__dirname, '..');
  const results = await runVisionBatch({
    models,
    shoes: selectedShoes,
    projectRoot,
    concurrency: VISION_CONCURRENCY,
    cache,
    onProgress: (result, completed, total) => {
      const pct = Math.round((completed / total) * 100);
      const status = result.fromCache ? '(cached)' : result.status;
      console.log(`[${pct}%] ${result.model} | ${result.shoeId} | ${status}`);
    }
  });

  // Close cache
  cache?.close();

  const duration = Date.now() - startTime;

  // Calculate summary stats
  const stats = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    error: results.filter(r => r.status === 'error').length,
    refusal: results.filter(r => r.status === 'refusal').length,
    cached: results.filter(r => r.fromCache).length,
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
    totalTokens: results.reduce((sum, r) => sum + r.totalTokens, 0),
    avgLatency: results.filter(r => !r.fromCache).reduce((sum, r) => sum + r.latencyMs, 0) / results.filter(r => !r.fromCache).length || 0
  };

  console.log('\n=== Results Summary ===');
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Success: ${stats.success}/${stats.total}`);
  console.log(`Errors: ${stats.error}`);
  console.log(`Refusals: ${stats.refusal}`);
  console.log(`From cache: ${stats.cached}`);
  console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`Total tokens: ${stats.totalTokens}`);
  console.log(`Avg latency: ${stats.avgLatency.toFixed(0)}ms`);

  // Save results to file
  const outputDir = join(__dirname, 'results/vision');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = join(outputDir, `vision-results-${timestamp}.json`);

  const outputData = {
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      models,
      shoeCount: selectedShoes.length,
      ...stats
    },
    results
  };

  await writeFile(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`\nResults saved to: ${outputFile}`);

  // Per-model breakdown
  console.log('\n=== Per-Model Breakdown ===');
  for (const model of models) {
    const modelResults = results.filter(r => r.model === model);
    const modelSuccess = modelResults.filter(r => r.status === 'success').length;
    const modelCost = modelResults.reduce((sum, r) => sum + r.cost, 0);
    console.log(`${model}: ${modelSuccess}/${modelResults.length} success, $${modelCost.toFixed(4)}`);
  }
}

main().catch(console.error);
