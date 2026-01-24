/**
 * Aggregation functions for per-shoe metrics
 */

import type { VisionResult, JudgeEvaluation, CatalogShoe, ShoeMetric } from '../types';

/**
 * Calculate metrics for each shoe across all models
 */
export function calculateShoeMetrics(
  visionResults: VisionResult[],
  judgeEvaluations: JudgeEvaluation[],
  catalog: CatalogShoe[]
): ShoeMetric[] {
  // Create a map of responseText -> shoeId from vision results
  const responseToShoe = new Map<string, { shoeId: string; model: string }>();
  for (const v of visionResults) {
    if (v.status === 'success') {
      responseToShoe.set(v.responseText, { shoeId: v.shoeId, model: v.model });
    }
  }

  // Create catalog lookup
  const catalogMap = new Map(catalog.map(s => [s.id, s]));

  // Group evaluations by shoe
  const shoeStats: Record<string, {
    exact: number;
    variant: number;
    brand_only: number;
    wrong: number;
    total: number;
    models: Set<string>;
  }> = {};

  for (const e of judgeEvaluations) {
    const visionInfo = responseToShoe.get(e.vision_response_text);
    if (!visionInfo) continue;

    const { shoeId, model } = visionInfo;

    if (!shoeStats[shoeId]) {
      shoeStats[shoeId] = {
        exact: 0,
        variant: 0,
        brand_only: 0,
        wrong: 0,
        total: 0,
        models: new Set()
      };
    }

    const tier = e.tier as 'exact' | 'variant' | 'brand_only' | 'wrong';
    shoeStats[shoeId][tier]++;
    shoeStats[shoeId].total++;
    shoeStats[shoeId].models.add(model);
  }

  // Calculate metrics and sort
  const metrics: ShoeMetric[] = Object.entries(shoeStats)
    .map(([shoeId, s]) => {
      const catalogEntry = catalogMap.get(shoeId);
      const displayName = shoeId
        .replace('stockx-', '')
        .replace('goat-', '')
        .replace('farfetch-', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        shoeId,
        displayName,
        brand: catalogEntry?.brand || 'Unknown',
        model: catalogEntry?.model || displayName,
        difficulty: catalogEntry?.difficultyTier || 'medium',
        accuracy: Math.round((s.exact + s.variant) / s.total * 100),
        avgScore: Math.round((s.exact * 100 + s.variant * 75 + s.brand_only * 50) / s.total),
        exactCount: s.exact,
        variantCount: s.variant,
        brandOnlyCount: s.brand_only,
        wrongCount: s.wrong,
        totalTests: s.total,
        modelsTestedCount: s.models.size,
        imagePath: catalogEntry?.images?.[0]?.localPath || '',
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  return metrics;
}
