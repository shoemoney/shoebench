#!/usr/bin/env bun
/**
 * Judge Benchmark Runner
 *
 * Processes vision test results and evaluates them using LLM-as-judge scoring.
 *
 * Usage:
 *   bun bench/run-judge-benchmark.ts --input=<vision-results.json> [options]
 *   bun bench/run-judge-benchmark.ts <vision-results.json> [options]
 *
 * Options:
 *   --input=FILE        Path to vision results JSON file (required)
 *   --no-cache          Skip cache, re-judge all results
 *   --concurrency=N     Parallel judge calls (default: 50)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (override existing env vars)
config({ path: resolve(__dirname, '../.env'), override: true });

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { runJudgeWithCache } from './judge-runner';
import { createJudgeCache, computeJudgeCacheKey } from './judge-cache';
import { JUDGE_PROMPT_VERSION, SCORING_RUBRIC_VERSION } from './judge-prompts';
import type { JudgeCacheBackend } from './cache-types';
import type { ShoeCatalog, VisionTestResult } from './vision-types';
import type { JudgeEvaluation } from './judge-types';
import pLimit from 'p-limit';

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

// Get positional argument (input file)
const positionalArg = args.find(a => !a.startsWith('--'));

async function main() {
  console.log('Judge Benchmark Runner');
  console.log('======================\n');

  // Check for API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY not set');
    console.error('Please set it in .env file or environment');
    process.exit(1);
  }
  console.log('OpenRouter API key loaded from .env');

  // Get input file path (auto-detect latest if not provided)
  let inputFile = getArg('input') || positionalArg;

  if (!inputFile) {
    // Auto-detect latest vision results file
    const resultsDir = join(__dirname, 'results/vision');
    if (existsSync(resultsDir)) {
      const files = (await import('fs')).readdirSync(resultsDir)
        .filter(f => f.startsWith('vision-results-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        inputFile = join(resultsDir, files[0]);
        console.log(`Auto-detected latest results: ${files[0]}`);
      }
    }
  }

  if (!inputFile) {
    console.error('\nERROR: No vision results found');
    console.error('Usage: bun bench/run-judge-benchmark.ts --input=<vision-results.json>');
    console.error('   or: bun bench/run-judge-benchmark.ts <vision-results.json>');
    console.error('   or: run vision benchmark first to generate results');
    process.exit(1);
  }

  if (!existsSync(inputFile)) {
    console.error(`ERROR: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`Input file: ${inputFile}`);

  // Load vision results
  const visionData = JSON.parse(await readFile(inputFile, 'utf-8'));
  const visionResults: VisionTestResult[] = visionData.results || [];
  console.log(`Loaded ${visionResults.length} vision test results`);

  // Filter to successful results only (errors and refusals can't be judged)
  const successfulResults = visionResults.filter(r => r.status === 'success');
  console.log(`Successful results: ${successfulResults.length}/${visionResults.length}`);

  if (successfulResults.length === 0) {
    console.error('ERROR: No successful vision results to judge');
    process.exit(1);
  }

  // Load catalog for ground truth and aliases
  const catalogPath = join(__dirname, '../dataset/catalog.json');
  const catalogRaw = await readFile(catalogPath, 'utf-8');
  const catalog: ShoeCatalog = JSON.parse(catalogRaw);
  console.log(`Loaded catalog: ${catalog.totalShoes} shoes`);

  // Build shoe lookup map
  const shoeMap = new Map(catalog.shoes.map(shoe => [shoe.id, shoe]));

  // Get concurrency setting
  const concurrency = parseInt(getArg('concurrency') || '50');
  console.log(`Concurrency: ${concurrency}`);

  // Initialize cache (unless --no-cache)
  const useCache = !hasFlag('no-cache');
  let cache: JudgeCacheBackend | undefined;
  if (useCache) {
    cache = await createJudgeCache();
    console.log(`Cache enabled (${process.env.CACHE_BACKEND === 'mysql' ? 'mysql' : 'sqlite'})`);
  } else {
    console.log('Cache disabled');
  }

  console.log(`\nJudging ${successfulResults.length} results...\n`);

  const startTime = Date.now();

  // Process with concurrency control
  const limit = pLimit(concurrency);
  const evaluations: JudgeEvaluation[] = [];
  let completed = 0;
  let cacheHits = 0;

  const judgePromises = successfulResults.map(visionResult =>
    limit(async () => {
      const shoe = shoeMap.get(visionResult.shoeId);
      if (!shoe) {
        console.error(`Warning: Shoe not found in catalog: ${visionResult.shoeId}`);
        return;
      }

      // Check if cached (to track cache hits)
      const wasCached = cache ? Boolean(await cache.get(
        computeJudgeCacheKey({
          visionResponse: visionResult.responseText,
          groundTruthBrand: shoe.brand,
          groundTruthModel: shoe.model,
          aliases: shoe.aliases || [],
          judgePromptVersion: JUDGE_PROMPT_VERSION,
          rubricVersion: SCORING_RUBRIC_VERSION,
        })
      )) : false;

      if (wasCached) {
        cacheHits++;
      }

      // Use cache if available, otherwise call judge directly
      const evaluation = cache
        ? await runJudgeWithCache({ visionResult, shoe, cache })
        : await require('./judge-runner').runJudge({ visionResult, shoe });

      evaluations.push(evaluation);
      completed++;

      const pct = Math.round((completed / successfulResults.length) * 100);
      const cacheLabel = wasCached ? '(cached)' : '';
      console.log(`[${pct}%] ${visionResult.model} | ${visionResult.shoeId} | ${evaluation.tier} ${cacheLabel}`);
    })
  );

  await Promise.all(judgePromises);

  // Close cache
  await cache?.close();
  if (process.env.CACHE_BACKEND === 'mysql') {
    const { closePool } = await import('./db');
    await closePool();
  }

  const duration = Date.now() - startTime;

  // Calculate statistics
  const tierCounts = {
    exact: evaluations.filter(e => e.tier === 'exact').length,
    variant: evaluations.filter(e => e.tier === 'variant').length,
    brand_only: evaluations.filter(e => e.tier === 'brand_only').length,
    wrong: evaluations.filter(e => e.tier === 'wrong').length,
  };

  const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
  const avgScore = totalScore / evaluations.length;

  const totalCost = evaluations.reduce((sum, e) => sum + e.cost, 0);
  const totalTokens = evaluations.reduce((sum, e) => sum + e.total_tokens, 0);

  console.log('\n=== Judge Results Summary ===');
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Total evaluated: ${evaluations.length}`);
  console.log(`Average score: ${avgScore.toFixed(1)}%`);
  console.log('\nTier breakdown:');
  console.log(`  Exact:      ${tierCounts.exact} (${((tierCounts.exact / evaluations.length) * 100).toFixed(1)}%)`);
  console.log(`  Variant:    ${tierCounts.variant} (${((tierCounts.variant / evaluations.length) * 100).toFixed(1)}%)`);
  console.log(`  Brand only: ${tierCounts.brand_only} (${((tierCounts.brand_only / evaluations.length) * 100).toFixed(1)}%)`);
  console.log(`  Wrong:      ${tierCounts.wrong} (${((tierCounts.wrong / evaluations.length) * 100).toFixed(1)}%)`);
  console.log(`\nCache hits: ${cacheHits}/${evaluations.length}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
  console.log(`Total tokens: ${totalTokens}`);

  // Save results to file
  const outputDir = join(__dirname, 'results/judge');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = join(outputDir, `judge-results-${timestamp}.json`);

  const outputData = {
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      inputFile,
      visionResultsCount: visionResults.length,
      evaluatedCount: evaluations.length,
      avgScore,
      tierCounts,
      cacheHits,
      totalCost,
      totalTokens,
    },
    evaluations,
  };

  await writeFile(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`\nResults saved to: ${outputFile}`);
}

main().catch(console.error);
