/**
 * Error analysis aggregation
 *
 * Extracts error cases (brand_only, wrong) with full context for debugging.
 */

import type {
  VisionResult,
  JudgeEvaluation,
  CatalogShoe,
  ErrorCase,
} from '../types';

/**
 * Creates a lookup map from vision response text to vision result
 */
function buildVisionResponseMap(
  visionResults: VisionResult[]
): Map<string, VisionResult> {
  const map = new Map<string, VisionResult>();
  for (const result of visionResults) {
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
 * Aggregates error cases from judge results
 *
 * Filters for brand_only and wrong tiers, providing full context
 * for error analysis and debugging.
 *
 * @param visionResults - Vision test results from bench/results/vision/*.json
 * @param judgeEvaluations - Judge evaluations from bench/results/judge/*.json
 * @param catalog - Shoe catalog from dataset/catalog.json
 * @returns Array of ErrorCase objects
 */
export function aggregateErrors(
  visionResults: VisionResult[],
  judgeEvaluations: JudgeEvaluation[],
  catalog: CatalogShoe[]
): ErrorCase[] {
  const visionMap = buildVisionResponseMap(visionResults);
  const catalogMap = buildCatalogMap(catalog);

  const errors: ErrorCase[] = [];

  for (const evaluation of judgeEvaluations) {
    // Only include error cases (brand_only or wrong)
    if (evaluation.tier !== 'brand_only' && evaluation.tier !== 'wrong') {
      continue;
    }

    // Find the corresponding vision result
    const visionResult = visionMap.get(evaluation.vision_response_text);
    if (!visionResult) {
      continue;
    }

    // Skip non-success results
    if (visionResult.status !== 'success') {
      continue;
    }

    // Find the shoe in the catalog
    const shoe = catalogMap.get(visionResult.shoeId);
    if (!shoe) {
      continue;
    }

    // Get the first image path (primary image)
    const imagePath =
      shoe.images.length > 0 ? shoe.images[0].localPath : '';

    errors.push({
      shoeId: shoe.id,
      shoeBrand: shoe.brand,
      shoeModel: shoe.model,
      difficultyTier: shoe.difficultyTier,
      imagePath,
      modelName: visionResult.model,
      visionResponse: evaluation.vision_response_text,
      judgeReasoning: evaluation.reasoning,
      errorType: evaluation.tier as 'brand_only' | 'wrong',
      score: evaluation.score,
    });
  }

  // Sort by error type (wrong first, more severe), then by model, then by shoe
  errors.sort((a, b) => {
    // Wrong errors first (score 0 vs 50)
    if (a.score !== b.score) return a.score - b.score;
    // Then by model
    const modelCompare = a.modelName.localeCompare(b.modelName);
    if (modelCompare !== 0) return modelCompare;
    // Then by shoe
    return a.shoeId.localeCompare(b.shoeId);
  });

  return errors;
}
