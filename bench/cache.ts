/**
 * SQLite cache layer for vision testing responses
 * Uses bun:sqlite with WAL mode for concurrent access
 */

import { Database } from 'bun:sqlite';
import { createHash } from 'crypto';
import { type CacheEntry } from './vision-types';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Compute deterministic cache key from model, shoe ID, and prompt
 */
export function computeCacheKey(model: string, shoeId: string, prompt: string): string {
  const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  return `${model}:${shoeId}:${promptHash}`;
}

/**
 * SQLite cache for vision test responses
 * Prevents redundant API calls on re-runs
 */
export class VisionCache {
  private db: InstanceType<typeof Database>;
  private insertStmt: ReturnType<InstanceType<typeof Database>['prepare']>;
  private getStmt: ReturnType<InstanceType<typeof Database>['prepare']>;

  constructor(dbPath: string = 'bench/cache/vision-cache.db') {
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
    `);

    // Prepare statements for reuse
    this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO vision_responses (
        cache_key, model, shoe_id, prompt_hash, response_text,
        input_tokens, output_tokens, total_tokens, cost, latency_ms,
        created_at, image_width, image_height, image_size_bytes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    this.getStmt = this.db.prepare(`
      SELECT * FROM vision_responses WHERE cache_key = ?
    `);
  }

  /**
   * Get cached entry by cache key
   */
  get(cacheKey: string): CacheEntry | undefined {
    try {
      const row = this.getStmt.get(cacheKey) as CacheEntry | undefined;
      return row;
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  /**
   * Store entry in cache
   */
  set(entry: Omit<CacheEntry, 'cache_key'> & { cache_key: string }): void {
    try {
      this.insertStmt.run(
        entry.cache_key,
        entry.model,
        entry.shoe_id,
        entry.prompt_hash,
        entry.response_text,
        entry.input_tokens,
        entry.output_tokens,
        entry.total_tokens,
        entry.cost,
        entry.latency_ms,
        entry.created_at,
        entry.image_width,
        entry.image_height,
        entry.image_size_bytes
      );
    } catch (error) {
      console.error('Cache set error:', error);
      // Cache errors are non-fatal - continue execution
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
