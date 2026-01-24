/**
 * Tier-based accuracy aggregation
 *
 * Groups judge results by model and difficulty tier, computing accuracy per tier.
 */

import type {
  VisionResult,
  JudgeEvaluation,
  CatalogShoe,
  TierAccuracy,
  DifficultyTier,
} from '../types';

/**
 * Creates a lookup map from vision response text to vision result
 * This is needed to join judge evaluations back to vision results
 */
function buildVisionResponseMap(
  visionResults: VisionResult[]
): Map<string, VisionResult> {
  const map = new Map<string, VisionResult>();
  for (const result of visionResults) {
    // Use response text as key since judge evaluations contain vision_response_text
    map.set(result.responseText, result);
  }
  return map;
}

/**
 * Creates a lookup map from shoe ID to catalog shoe
 */
function buildCatalogMap(catalog: CatalogShoe[]): Map<string, CatalogShoe> {
  const map = new Map<string, CatalogShoe>();
  for (const shoe of catalog) {
    map.set(shoe.id, shoe);
  }
  return map;
}

/**
 * Aggregates tier accuracy from judge results
 *
 * @param visionResults - Vision test results from bench/results/vision/*.json
 * @param judgeEvaluations - Judge evaluations from bench/results/judge/*.json
 * @param catalog - Shoe catalog from dataset/catalog.json
 * @returns Array of TierAccuracy objects (one per model+tier combination)
 */
export function aggregateTierAccuracy(
  visionResults: VisionResult[],
  judgeEvaluations: JudgeEvaluation[],
  catalog: CatalogShoe[]
): TierAccuracy[] {
  const visionMap = buildVisionResponseMap(visionResults);
  const catalogMap = buildCatalogMap(catalog);

  // Group by model + tier
  // Key: "modelName|tier"
  const groups = new Map<
    string,
    {
      tier: DifficultyTier;
      modelName: string;
      scores: number[];
      correct: number;
      total: number;
    }
  >();

  for (const evaluation of judgeEvaluations) {
    // Find the corresponding vision result
    const visionResult = visionMap.get(evaluation.vision_response_text);
    if (!visionResult) {
      // Skip if we can't find the vision result
      continue;
    }

    // Skip errors and refusals
    if (visionResult.status !== 'success') {
      continue;
    }

    // Find the shoe in the catalog
    const shoe = catalogMap.get(visionResult.shoeId);
    if (!shoe) {
      // Skip if shoe not in catalog
      continue;
    }

    const key = `${visionResult.model}|${shoe.difficultyTier}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        tier: shoe.difficultyTier,
        modelName: visionResult.model,
        scores: [],
        correct: 0,
        total: 0,
      };
      groups.set(key, group);
    }

    group.total++;
    group.scores.push(evaluation.score);

    // Count correct (exact or variant)
    if (evaluation.tier === 'exact' || evaluation.tier === 'variant') {
      group.correct++;
    }
  }

  // Convert groups to TierAccuracy array
  const result: TierAccuracy[] = [];
  for (const group of Array.from(groups.values())) {
    const avgScore =
      group.scores.length > 0
        ? group.scores.reduce((sum, s) => sum + s, 0) / group.scores.length
        : 0;

    result.push({
      tier: group.tier,
      modelName: group.modelName,
      totalShoes: group.total,
      correctCount: group.correct,
      accuracyPercent:
        group.total > 0
          ? Math.round((group.correct / group.total) * 100 * 10) / 10
          : 0,
      avgScore: Math.round(avgScore * 10) / 10,
    });
  }

  // Sort by model name, then by tier (easy, medium, hard)
  const tierOrder: Record<DifficultyTier, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
  };

  result.sort((a, b) => {
    const modelCompare = a.modelName.localeCompare(b.modelName);
    if (modelCompare !== 0) return modelCompare;
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  return result;
}
