/**
 * MySQL/MariaDB-backed vision cache. Same public API as SqliteVisionCache.
 */

import { getPool } from './db';
import type { CacheEntry } from './vision-types';
import type { VisionCacheBackend } from './cache-types';
import type * as mysql from 'mysql2/promise';

export class MysqlVisionCache implements VisionCacheBackend {
  private pool: mysql.Pool;

  constructor() {
    this.pool = getPool();
  }

  async get(cacheKey: string): Promise<CacheEntry | undefined> {
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM vision_responses WHERE cache_key = ?',
        [cacheKey]
      );
      return rows[0] as CacheEntry | undefined;
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  async set(entry: CacheEntry): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO vision_responses (
          cache_key, model, shoe_id, prompt_hash, response_text,
          input_tokens, output_tokens, total_tokens, cost, latency_ms,
          created_at, image_width, image_height, image_size_bytes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          response_text = VALUES(response_text),
          input_tokens  = VALUES(input_tokens),
          output_tokens = VALUES(output_tokens),
          total_tokens  = VALUES(total_tokens),
          cost          = VALUES(cost),
          latency_ms    = VALUES(latency_ms),
          created_at    = VALUES(created_at)`,
        [
          entry.cache_key, entry.model, entry.shoe_id, entry.prompt_hash, entry.response_text,
          entry.input_tokens, entry.output_tokens, entry.total_tokens, entry.cost, entry.latency_ms,
          entry.created_at, entry.image_width, entry.image_height, entry.image_size_bytes,
        ]
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async purgeModel(model: string): Promise<number> {
    try {
      const [res] = await this.pool.query<mysql.ResultSetHeader>(
        'DELETE FROM vision_responses WHERE model = ?',
        [model]
      );
      return res.affectedRows;
    } catch (error) {
      console.error('Cache purge error:', error);
      return 0;
    }
  }

  async getModelErrorRate(model: string): Promise<{ total: number; errors: number; rate: number }> {
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN response_text LIKE '__ERROR__%' THEN 1 ELSE 0 END) AS errors
         FROM vision_responses WHERE model = ?`,
        [model]
      );
      const row = rows[0] as { total: number; errors: number } | undefined;
      if (!row || row.total === 0) return { total: 0, errors: 0, rate: 0 };
      return { total: row.total, errors: row.errors, rate: row.errors / row.total };
    } catch (error) {
      console.error('Cache error rate check error:', error);
      return { total: 0, errors: 0, rate: 0 };
    }
  }

  async getSkippedModels(_errorThreshold: number = 0): Promise<string[]> {
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT model FROM excluded_models');
      return (rows as { model: string }[]).map(r => r.model);
    } catch (error) {
      console.error('Cache skip list error:', error);
      return [];
    }
  }

  async excludeModel(model: string, reason: string, errorText?: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT IGNORE INTO excluded_models (model, reason, error_text, created_at)
         VALUES (?, ?, ?, ?)`,
        [model, reason, errorText ?? null, Date.now()]
      );
      await this.pool.query(
        `DELETE FROM vision_responses WHERE model = ? AND response_text LIKE '__ERROR%'`,
        [model]
      );
    } catch (error) {
      console.error('Cache excludeModel error:', error);
    }
  }

  async unexcludeModel(model: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM excluded_models WHERE model = ?', [model]);
    } catch (error) {
      console.error('Cache unexcludeModel error:', error);
    }
  }

  async removeErrorRows(model: string): Promise<number> {
    try {
      const [res] = await this.pool.query<mysql.ResultSetHeader>(
        `DELETE FROM vision_responses WHERE model = ? AND response_text LIKE '__ERROR%'`,
        [model]
      );
      return res.affectedRows;
    } catch (error) {
      console.error('Cache removeErrorRows error:', error);
      return 0;
    }
  }

  /**
   * No-op for pool-backed connections — the process-wide pool is closed
   * by closePool() in db.ts when the process exits.
   */
  async close(): Promise<void> {
    // Intentionally a no-op; pool lifetime is process-scoped.
  }
}
