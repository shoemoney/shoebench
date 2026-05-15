/**
 * Pure transform from BenchmarkData → ModelRow[] for the Phase 6 Results table.
 *
 * Constraints (per ARCHITECTURE.md Decision 3 + PITFALLS.md Pitfall 3):
 * - NO math (no division, no arithmetic, no aggregation — costPerCorrect,
 *   tokensPerShoe, and per-tier accuracy are precomputed by export-results.ts)
 * - NO async
 * - NO React imports
 * - NO IO
 *
 * Input order is preserved; sorting is the table's responsibility.
 */

import type { BenchmarkData, ModelRow } from './types';
import { getProviderIcon, getShortName } from './modelUtils';
import { classifyModel } from './modelClassification';

export function buildModelRows(data: BenchmarkData): ModelRow[] {
  return data.modelMetrics.map((m) => ({
    ...m,
    displayName: getShortName(m.modelName),
    providerIcon: getProviderIcon(m.modelName),
    modelType: classifyModel(m.modelName),
  }));
}
