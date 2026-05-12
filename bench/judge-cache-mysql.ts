/**
 * MySQL/MariaDB-backed judge cache. Same public API as SqliteJudgeCache.
 */

import { getPool } from './db';
import type { JudgeEvaluation } from './judge-types';
import type { JudgeCacheBackend } from './cache-types';
import type * as mysql from 'mysql2/promise';

export class MysqlJudgeCache implements JudgeCacheBackend {
  private pool: mysql.Pool;

  constructor() {
    this.pool = getPool();
  }

  async get(cacheKey: string): Promise<JudgeEvaluation | undefined> {
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM judge_evaluations WHERE cache_key = ?',
        [cacheKey]
      );
      const row = rows[0];
      if (!row) return undefined;
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

  async set(entry: JudgeEvaluation): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO judge_evaluations (
          cache_key, vision_response_text, ground_truth_brand, ground_truth_model, aliases,
          tier, score, confidence, reasoning, brand_match, model_match,
          judge_model, judge_prompt_version, rubric_version, raw_judge_response,
          input_tokens, output_tokens, total_tokens, cost, latency_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          score = VALUES(score),
          confidence = VALUES(confidence),
          reasoning = VALUES(reasoning),
          brand_match = VALUES(brand_match),
          model_match = VALUES(model_match),
          raw_judge_response = VALUES(raw_judge_response),
          created_at = VALUES(created_at)`,
        [
          entry.cache_key, entry.vision_response_text, entry.ground_truth_brand, entry.ground_truth_model,
          JSON.stringify(entry.aliases), entry.tier, entry.score, entry.confidence, entry.reasoning,
          entry.brand_match ? 1 : 0, entry.model_match ? 1 : 0,
          entry.judge_model, entry.judge_prompt_version, entry.rubric_version, entry.raw_judge_response,
          entry.input_tokens, entry.output_tokens, entry.total_tokens, entry.cost, entry.latency_ms, entry.created_at,
        ]
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async purge(): Promise<void> {
    try {
      await this.pool.query('DELETE FROM judge_evaluations');
      console.log('Judge cache purged');
    } catch (error) {
      console.error('Cache purge error:', error);
    }
  }

  async close(): Promise<void> {
    // No-op; pool is process-scoped via db.ts closePool().
  }
}
