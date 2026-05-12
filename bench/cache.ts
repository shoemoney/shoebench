/**
 * Vision response cache — dispatches to SQLite or MySQL backend.
 *
 * Backend selected by CACHE_BACKEND env var:
 *   CACHE_BACKEND=sqlite (default) — bun:sqlite at bench/cache/vision-cache.db
 *   CACHE_BACKEND=mysql            — mysql2 pool, reads MYSQL_URL
 */

import { Database } from 'bun:sqlite';
import { createHash } from 'crypto';
import { type CacheEntry } from './vision-types';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { VisionCacheBackend } from './cache-types';

const DEFAULT_DB_PATH = join(__dirname, 'cache', 'vision-cache.db');

/**
 * Compute deterministic cache key from model, shoe ID, and prompt
 */
export function computeCacheKey(model: string, shoeId: string, prompt: string): string {
  const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  return `${model}:${shoeId}:${promptHash}`;
}

/**
 * Pick a backend implementation based on CACHE_BACKEND env var.
 */
export async function createVisionCache(): Promise<VisionCacheBackend> {
  if (process.env.CACHE_BACKEND === 'mysql') {
    const { MysqlVisionCache } = await import('./cache-mysql');
    return new MysqlVisionCache();
  }
  return new SqliteVisionCache();
}

/**
 * SQLite-backed vision cache. Methods are async to match the unified
 * VisionCacheBackend interface; internals are bun:sqlite synchronous calls.
 */
export class SqliteVisionCache implements VisionCacheBackend {
  private db: InstanceType<typeof Database>;
  private insertStmt: ReturnType<InstanceType<typeof Database>['prepare']>;
  private getStmt: ReturnType<InstanceType<typeof Database>['prepare']>;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_responses (
        cache_key TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        shoe_id TEXT NOT NULL,
        prompt_hash TEXT NOT NULL,
        response_text TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        cost REAL,
        latency_ms INTEGER,
        created_at INTEGER NOT NULL,
        image_width INTEGER,
        image_height INTEGER,
        image_size_bytes INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_model_shoe ON vision_responses(model, shoe_id);

      CREATE TABLE IF NOT EXISTS excluded_models (
        model TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        error_text TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO vision_responses (
        cache_key, model, shoe_id, prompt_hash, response_text,
        input_tokens, output_tokens, total_tokens, cost, latency_ms,
        created_at, image_width, image_height, image_size_bytes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getStmt = this.db.prepare(`SELECT * FROM vision_responses WHERE cache_key = ?`);
  }

  async get(cacheKey: string): Promise<CacheEntry | undefined> {
    try {
      return this.getStmt.get(cacheKey) as CacheEntry | undefined;
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  async set(entry: CacheEntry): Promise<void> {
    try {
      this.insertStmt.run(
        entry.cache_key, entry.model, entry.shoe_id, entry.prompt_hash, entry.response_text,
        entry.input_tokens, entry.output_tokens, entry.total_tokens, entry.cost, entry.latency_ms,
        entry.created_at, entry.image_width, entry.image_height, entry.image_size_bytes
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async purgeModel(model: string): Promise<number> {
    try {
      return this.db.prepare('DELETE FROM vision_responses WHERE model = ?').run(model).changes;
    } catch (error) {
      console.error('Cache purge error:', error);
      return 0;
    }
  }

  async getModelErrorRate(model: string): Promise<{ total: number; errors: number; rate: number }> {
    try {
      const row = this.db.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN response_text LIKE '__ERROR__%' THEN 1 ELSE 0 END) as errors
        FROM vision_responses WHERE model = ?
      `).get(model) as { total: number; errors: number } | undefined;
      if (!row || row.total === 0) return { total: 0, errors: 0, rate: 0 };
      return { total: row.total, errors: row.errors, rate: row.errors / row.total };
    } catch (error) {
      console.error('Cache error rate check error:', error);
      return { total: 0, errors: 0, rate: 0 };
    }
  }

  async getSkippedModels(_errorThreshold: number = 0): Promise<string[]> {
    try {
      const rows = this.db.prepare(`SELECT model FROM excluded_models`).all() as { model: string }[];
      return rows.map(r => r.model);
    } catch (error) {
      console.error('Cache skip list error:', error);
      return [];
    }
  }

  async excludeModel(model: string, reason: string, errorText?: string): Promise<void> {
    try {
      this.db.prepare(`
        INSERT OR IGNORE INTO excluded_models (model, reason, error_text, created_at)
        VALUES (?, ?, ?, ?)
      `).run(model, reason, errorText ?? null, Date.now());
      this.db.prepare(`
        DELETE FROM vision_responses WHERE model = ? AND response_text LIKE '__ERROR%'
      `).run(model);
    } catch (error) {
      console.error('Cache excludeModel error:', error);
    }
  }

  async unexcludeModel(model: string): Promise<void> {
    try {
      this.db.prepare(`DELETE FROM excluded_models WHERE model = ?`).run(model);
    } catch (error) {
      console.error('Cache unexcludeModel error:', error);
    }
  }

  async removeErrorRows(model: string): Promise<number> {
    try {
      return this.db.prepare(`
        DELETE FROM vision_responses WHERE model = ? AND response_text LIKE '__ERROR%'
      `).run(model).changes;
    } catch (error) {
      console.error('Cache removeErrorRows error:', error);
      return 0;
    }
  }

  async close(): Promise<void> {
    try { this.db.close(); } catch (error) { console.error('Cache close error:', error); }
  }
}

/** @deprecated Use createVisionCache() factory instead. Kept for callers that still `new VisionCache()`. */
export const VisionCache = SqliteVisionCache;
export type VisionCache = SqliteVisionCache;
