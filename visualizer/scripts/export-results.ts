#!/usr/bin/env bun
/**
 * Export benchmark results to JSON for visualizer
 *
 * Usage: bun visualizer/scripts/export-results.ts [--vision <file>] [--judge <file>]
 *
 * If files not specified, uses most recent files in bench/results/
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import aggregation functions
import { aggregateTierAccuracy } from '../lib/aggregation/tierMetrics';
import { calculateModelMetrics } from '../lib/aggregation/costMetrics';
import { aggregateErrors } from '../lib/aggregation/errorMetrics';
import type {
  BenchmarkData,
  VisionResultsFile,
  JudgeResultsFile,
  CatalogFile,
} from '../lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

/**
 * Find the most recent file matching a prefix in a directory
 */
async function findLatestFile(dir: string, prefix: string): Promise<string> {
  const files = await readdir(dir);
  const matching = files.filter(
    (f) => f.startsWith(prefix) && f.endsWith('.json')
  );
  if (matching.length === 0) {
    throw new Error(`No ${prefix}*.json files in ${dir}`);
  }
  // Sort in reverse order - ISO timestamps sort correctly lexicographically
  matching.sort().reverse();
  return join(dir, matching[0]);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { vision?: string; judge?: string } {
  const result: { vision?: string; judge?: string } = {};

  const visionIdx = args.indexOf('--vision');
  if (visionIdx !== -1 && args[visionIdx + 1]) {
    result.vision = args[visionIdx + 1];
  }

  const judgeIdx = args.indexOf('--judge');
  if (judgeIdx !== -1 && args[judgeIdx + 1]) {
    result.judge = args[judgeIdx + 1];
  }

  return result;
}

async function main() {
  console.log('Exporting benchmark results to JSON...\n');

  // Parse args
  const args = parseArgs(process.argv.slice(2));

  // Find or use specified files
  let visionFile: string;
  let judgeFile: string;

  if (args.vision) {
    visionFile = args.vision;
  } else {
    visionFile = await findLatestFile(
      join(projectRoot, 'bench/results/vision'),
      'vision-results'
    );
  }

  if (args.judge) {
    judgeFile = args.judge;
  } else {
    judgeFile = await findLatestFile(
      join(projectRoot, 'bench/results/judge'),
      'judge-results'
    );
  }

  console.log(`Vision results: ${visionFile}`);
  console.log(`Judge results:  ${judgeFile}`);
  console.log('');

  // Load data
  const visionData: VisionResultsFile = JSON.parse(
    await readFile(visionFile, 'utf-8')
  );
  const judgeData: JudgeResultsFile = JSON.parse(
    await readFile(judgeFile, 'utf-8')
  );
  const catalogData: CatalogFile = JSON.parse(
    await readFile(join(projectRoot, 'dataset/catalog.json'), 'utf-8')
  );

  const visionResults = visionData.results;
  const judgeEvaluations = judgeData.evaluations;
  const catalog = catalogData.shoes;

  console.log(`Loaded ${visionResults.length} vision results`);
  console.log(`Loaded ${judgeEvaluations.length} judge evaluations`);
  console.log(`Loaded ${catalog.length} catalog shoes`);
  console.log('');

  // Aggregate
  console.log('Aggregating metrics...');
  const modelMetrics = calculateModelMetrics(
    visionResults,
    judgeEvaluations,
    catalog
  );
  const tierAccuracy = aggregateTierAccuracy(
    visionResults,
    judgeEvaluations,
    catalog
  );
  const errors = aggregateErrors(visionResults, judgeEvaluations, catalog);

  // Build output
  const output: BenchmarkData = {
    metadata: {
      timestamp: new Date().toISOString(),
      visionResultsFile: visionFile.split('/').pop() || '',
      judgeResultsFile: judgeFile.split('/').pop() || '',
      totalModels: modelMetrics.length,
      totalShoes: new Set(visionResults.map((v) => v.shoeId)).size,
      totalTests: visionResults.length,
    },
    modelMetrics,
    tierAccuracy,
    errors,
  };

  // Ensure output directory exists
  const outDir = join(__dirname, '../data');
  await mkdir(outDir, { recursive: true });

  // Write output
  const outPath = join(outDir, 'shoebench-results.json');
  await writeFile(outPath, JSON.stringify(output, null, 2));

  console.log('');
  console.log(`Wrote ${outPath}`);
  console.log('');
  console.log('Summary:');
  console.log(`  Models: ${output.metadata.totalModels}`);
  console.log(`  Shoes:  ${output.metadata.totalShoes}`);
  console.log(`  Tests:  ${output.metadata.totalTests}`);
  console.log(`  Errors: ${output.errors.length}`);
  console.log('');

  // Print leaderboard preview
  console.log('Model Leaderboard:');
  console.log('------------------');
  for (const model of modelMetrics) {
    console.log(
      `  ${model.modelName}: ${model.overallAccuracy}% accuracy (${model.avgScore} avg score)`
    );
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
