#!/usr/bin/env bun
/**
 * One-shot importer: SQLite caches -> MySQL.
 *
 * Idempotent (INSERT IGNORE). Safe to re-run.
 *
 * Requires:
 *   MYSQL_URL=mysql://user:pass@host:3306/shoebench
 *
 * Usage:
 *   bun run bench/scripts/migrate-sqlite-to-mysql.ts
 *   bun run bench/scripts/migrate-sqlite-to-mysql.ts --dry-run
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { getPool, closePool } from '../db';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

const VISION_DB = join(__dirname, '..', 'cache', 'vision-cache.db');
const JUDGE_DB  = join(__dirname, '..', 'cache', 'judge-cache.db');

async function migrateTable<T extends Record<string, unknown>>(opts: {
  label: string;
  sqliteDb: string;
  sqliteSelect: string;
  mysqlTable: string;
  columns: string[];
  rowToValues: (row: T) => unknown[];
}) {
  const { label, sqliteDb, sqliteSelect, mysqlTable, columns, rowToValues } = opts;

  console.log(`\n=== ${label} ===`);
  const db = new Database(sqliteDb, { readonly: true });
  const rows = db.prepare(sqliteSelect).all() as T[];
  console.log(`  read ${rows.length} rows from ${sqliteDb}`);

  if (DRY_RUN) {
    console.log(`  DRY RUN: would insert into ${mysqlTable}`);
    db.close();
    return;
  }

  if (rows.length === 0) {
    db.close();
    return;
  }

  const pool = getPool();
  const placeholders = `(${columns.map(() => '?').join(',')})`;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const sql =
      `INSERT IGNORE INTO ${mysqlTable} (${columns.join(',')}) VALUES ` +
      batch.map(() => placeholders).join(',');
    const values = batch.flatMap(rowToValues);

    const [result] = await pool.query(sql, values);
    inserted += (result as { affectedRows?: number }).affectedRows ?? 0;
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }

  console.log(`  inserted ${inserted} new rows into ${mysqlTable}`);
  db.close();
}

async function main() {
  if (!process.env.MYSQL_URL) {
    console.error('MYSQL_URL is not set. Aborting.');
    process.exit(1);
  }

  // 1. vision_responses
  await migrateTable({
    label: 'vision_responses',
    sqliteDb: VISION_DB,
    sqliteSelect: 'SELECT * FROM vision_responses',
    mysqlTable: 'vision_responses',
    columns: [
      'cache_key', 'model', 'shoe_id', 'prompt_hash', 'response_text',
      'input_tokens', 'output_tokens', 'total_tokens', 'cost', 'latency_ms',
      'created_at', 'image_width', 'image_height', 'image_size_bytes',
    ],
    rowToValues: (r: any) => [
      r.cache_key, r.model, r.shoe_id, r.prompt_hash, r.response_text,
      r.input_tokens, r.output_tokens, r.total_tokens, r.cost, r.latency_ms,
      r.created_at, r.image_width, r.image_height, r.image_size_bytes,
    ],
  });

  // 2. excluded_models
  await migrateTable({
    label: 'excluded_models',
    sqliteDb: VISION_DB,
    sqliteSelect: 'SELECT * FROM excluded_models',
    mysqlTable: 'excluded_models',
    columns: ['model', 'reason', 'error_text', 'created_at'],
    rowToValues: (r: any) => [r.model, r.reason, r.error_text, r.created_at],
  });

  // 3. judge_evaluations
  await migrateTable({
    label: 'judge_evaluations',
    sqliteDb: JUDGE_DB,
    sqliteSelect: 'SELECT * FROM judge_evaluations',
    mysqlTable: 'judge_evaluations',
    columns: [
      'cache_key', 'vision_response_text', 'ground_truth_brand', 'ground_truth_model',
      'aliases', 'tier', 'score', 'confidence', 'reasoning', 'brand_match', 'model_match',
      'judge_model', 'judge_prompt_version', 'rubric_version', 'raw_judge_response',
      'input_tokens', 'output_tokens', 'total_tokens', 'cost', 'latency_ms', 'created_at',
    ],
    rowToValues: (r: any) => [
      r.cache_key, r.vision_response_text, r.ground_truth_brand, r.ground_truth_model,
      r.aliases, r.tier, r.score, r.confidence, r.reasoning, r.brand_match, r.model_match,
      r.judge_model, r.judge_prompt_version, r.rubric_version, r.raw_judge_response,
      r.input_tokens, r.output_tokens, r.total_tokens, r.cost, r.latency_ms, r.created_at,
    ],
  });

  await closePool();
  console.log('\nMigration complete.');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  await closePool();
  process.exit(1);
});
