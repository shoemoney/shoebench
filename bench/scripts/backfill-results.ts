#!/usr/bin/env bun
/**
 * Backfill historical JSON results into the SQLite vision cache.
 *
 * Reads every bench/results/vision/vision-results-*.json:
 *   - success rows  → inserted into vision_responses
 *   - permanent error rows (capability/availability) → model added to
 *     excluded_models so it's skipped on future runs; the row itself is
 *     NOT stored
 *   - rate-limit / transient errors → dropped on the floor; they'll
 *     retry naturally on the next run
 *
 * Later files override earlier ones for the same (model, shoe).
 *
 * Usage: bun bench/scripts/backfill-results.ts [--dry-run]
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createVisionCache, computeCacheKey } from '../cache';
import { SYSTEM_PROMPT, USER_PROMPT } from '../prompts';
import { classifyError } from '../vision-runner';
import type { VisionTestResult } from '../vision-types';

const dryRun = process.argv.includes('--dry-run');
const resultsDir = join(__dirname, '../results/vision');
const fullPrompt = SYSTEM_PROMPT + USER_PROMPT;

const files = readdirSync(resultsDir)
  .filter(f => f.startsWith('vision-results-') && f.endsWith('.json'))
  .sort();

console.log(`Found ${files.length} result files`);

const cache = dryRun ? null : await createVisionCache();
let inserted = 0;
let permanentExclusions = 0;
let transientDropped = 0;
let refusalsDropped = 0;
const excluded = new Map<string, string>(); // model → first error text seen

for (const file of files) {
  const path = join(resultsDir, file);
  const data = JSON.parse(readFileSync(path, 'utf-8')) as { results: VisionTestResult[] };
  const results = data.results || [];

  for (const r of results) {
    if (r.status === 'success') {
      const cacheKey = computeCacheKey(r.model, r.shoeId, fullPrompt);
      const promptHash = cacheKey.split(':').pop()!;
      if (!dryRun) {
        await cache!.set({
          cache_key: cacheKey,
          model: r.model,
          shoe_id: r.shoeId,
          prompt_hash: promptHash,
          response_text: r.responseText,
          input_tokens: r.inputTokens ?? 0,
          output_tokens: r.outputTokens ?? 0,
          total_tokens: r.totalTokens ?? 0,
          cost: r.cost ?? 0,
          latency_ms: r.latencyMs ?? 0,
          created_at: r.createdAt ?? Date.now(),
          image_width: r.imageWidth ?? 0,
          image_height: r.imageHeight ?? 0,
          image_size_bytes: r.imageSizeBytes ?? 0,
        });
      }
      inserted++;
    } else if (r.status === 'error') {
      const cls = classifyError(r.responseText);
      if (cls === 'permanent') {
        if (!excluded.has(r.model)) excluded.set(r.model, r.responseText);
      } else {
        transientDropped++;
      }
    } else {
      refusalsDropped++;
    }
  }
  console.log(`  ${file}: ${results.length} rows`);
}

if (!dryRun) {
  for (const [model, errText] of excluded) {
    await cache!.excludeModel(model, 'permanent_error', errText);
    permanentExclusions++;
  }
}

await cache?.close();
if (process.env.CACHE_BACKEND === 'mysql') {
  const { closePool } = await import('../db');
  await closePool();
}

console.log(`\n${dryRun ? '[dry-run] would insert' : 'Inserted'} ${inserted} success rows`);
console.log(`Excluded ${dryRun ? excluded.size : permanentExclusions} models permanently`);
console.log(`Dropped ${transientDropped} transient errors (will retry)`);
console.log(`Dropped ${refusalsDropped} refusal rows`);
