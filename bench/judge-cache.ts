/**
 * SQLite cache layer for judge evaluation responses
 * Uses bun:sqlite with WAL mode for concurrent access
 */

import { Database } from 'bun:sqlite';
import { createHash } from 'crypto';
import { type JudgeEvaluation } from './judge-types';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Compute deterministic cache key from vision response, ground truth, aliases, and versions
 */
export function computeJudgeCacheKey(params: {
  visionResponse: string;
  groundTruthBrand: string;
  groundTruthModel: string;
  aliases: string[];
  judgePromptVersion: string;
  rubricVersion: string;
}): string {
  const deterministic = JSON.stringify({
    visionResponse: params.visionResponse,
    groundTruth: `${params.groundTruthBrand}:${params.groundTruthModel}`,
    aliases: params.aliases.sort(),
    judgePromptVersion: params.judgePromptVersion,
    rubricVersion: params.rubricVersion,
  });

  return createHash('sha256').update(deterministic).digest('hex');
}

/**
 * SQLite cache for judge evaluation responses
 * Prevents redundant API calls on re-runs
 */
export class JudgeCache {
  private db: InstanceType<typeof Database>;
  private insertStmt: ReturnType<InstanceType<typeof Database>['prepare']>;
  private getStmt: ReturnType<InstanceType<typeof Database>['prepare']>;

  constructor(dbPath: string = 'bench/cache/judge-cache.db') {
    // Ensure cache directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');

    // Create table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS judge_evaluations (
        cache_key TEXT PRIMARY KEY,
        vision_response_text TEXT NOT NULL,
        ground_truth_brand TEXT NOT NULL,
        ground_truth_model TEXT NOT NULL,
        aliases TEXT NOT NULL,
        tier TEXT NOT NULL,
        score INTEGER NOT NULL,
        confidence TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        brand_match INTEGER NOT NULL,
        model_match INTEGER NOT NULL,
        judge_model TEXT NOT NULL,
        judge_prompt_version TEXT NOT NULL,
        rubric_version TEXT NOT NULL,
        raw_judge_response TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        cost REAL,
        latency_ms INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_judge_model ON judge_evaluations(judge_model);
      CREATE INDEX IF NOT EXISTS idx_tier ON judge_evaluations(tier);
    `);

    // Prepare statements for reuse
    this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO judge_evaluations (
        cache_key, vision_response_text, ground_truth_brand, ground_truth_model, aliases,
        tier, score, confidence, reasoning, brand_match, model_match,
        judge_model, judge_prompt_version, rubric_version, raw_judge_response,
        input_tokens, output_tokens, total_tokens, cost, latency_ms, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    this.getStmt = this.db.prepare(`
      SELECT * FROM judge_evaluations WHERE cache_key = ?
    `);
  }

  /**
   * Get cached entry by cache key
   */
  get(cacheKey: string): JudgeEvaluation | undefined {
    try {
      const row = this.getStmt.get(cacheKey) as any;
      if (!row) return undefined;

      // Parse JSON aliases and convert booleans
      return {
        ...row,
        aliases: JSON.parse(row.aliases),
        brand_match: Boolean(row.brand_match),
        model_match: Boolean(row.model_match),
      } as JudgeEvaluation;
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  /**
   * Store entry in cache
   */
  set(entry: JudgeEvaluation): void {
    try {
      this.insertStmt.run(
        entry.cache_key,
        entry.vision_response_text,
        entry.ground_truth_brand,
        entry.ground_truth_model,
        JSON.stringify(entry.aliases),
        entry.tier,
        entry.score,
        entry.confidence,
        entry.reasoning,
        entry.brand_match ? 1 : 0,
        entry.model_match ? 1 : 0,
        entry.judge_model,
        entry.judge_prompt_version,
        entry.rubric_version,
        entry.raw_judge_response,
        entry.input_tokens,
        entry.output_tokens,
        entry.total_tokens,
        entry.cost,
        entry.latency_ms,
        entry.created_at
      );
    } catch (error) {
      console.error('Cache set error:', error);
      // Cache errors are non-fatal - continue execution
    }
  }

  /**
   * Purge all entries from cache (for methodology changes)
   */
  purge(): void {
    try {
      this.db.exec('DELETE FROM judge_evaluations');
      console.log('Judge cache purged');
    } catch (error) {
      console.error('Cache purge error:', error);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    try {
      this.db.close();
    } catch (error) {
      console.error('Cache close error:', error);
    }
  }
}
