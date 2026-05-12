/**
 * Backend-agnostic interfaces for the vision and judge caches.
 * Implementations: cache-sqlite.ts (bun:sqlite), cache-mysql.ts (mysql2).
 */

import type { CacheEntry } from './vision-types';
import type { JudgeEvaluation } from './judge-types';

export interface VisionCacheBackend {
  get(cacheKey: string): Promise<CacheEntry | undefined>;
  set(entry: CacheEntry): Promise<void>;
  purgeModel(model: string): Promise<number>;
  getModelErrorRate(model: string): Promise<{ total: number; errors: number; rate: number }>;
  getSkippedModels(errorThreshold?: number): Promise<string[]>;
  excludeModel(model: string, reason: string, errorText?: string): Promise<void>;
  unexcludeModel(model: string): Promise<void>;
  removeErrorRows(model: string): Promise<number>;
  close(): Promise<void>;
}

export interface JudgeCacheBackend {
  get(cacheKey: string): Promise<JudgeEvaluation | undefined>;
  set(entry: JudgeEvaluation): Promise<void>;
  purge(): Promise<void>;
  close(): Promise<void>;
}
