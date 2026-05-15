/**
 * Cost and performance metrics aggregation
 *
 * Computes per-model metrics including accuracy, cost, and latency.
 */

import type {
  VisionResult,
  JudgeEvaluation,
  CatalogShoe,
  ModelMetrics,
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
 * Creates a lookup map from shoe ID to catalog shoe.
 * Inlined here (instead of imported from tierMetrics.ts) to keep this
 * module self-contained per ARCHITECTURE.md decision 4.
 */
function buildCatalogMap(catalog: CatalogShoe[]): Map<string, CatalogShoe> {
  const map = new Map<string, CatalogShoe>();
  for (const shoe of catalog) {
    map.set(shoe.id, shoe);
  }
  return map;
}

/**
 * Calculates model metrics from vision and judge results
 *
 * @param visionResults - Vision test results from bench/results/vision/*.json
 * @param judgeEvaluations - Judge evaluations from bench/results/judge/*.json
 * @param catalog - Shoe catalog (used to join evaluations → difficulty tier)
 * @returns Array of ModelMetrics objects (one per model)
 */
export function calculateModelMetrics(
  visionResults: VisionResult[],
  judgeEvaluations: JudgeEvaluation[],
  catalog: CatalogShoe[]
): ModelMetrics[] {
  const visionMap = buildVisionResponseMap(visionResults);
  const catalogMap = buildCatalogMap(catalog);

  // Group by model
  const groups = new Map<
    string,
    {
      modelName: string;
      totalTests: number;
      exactMatches: number;
      variantMatches: number;
      brandOnlyMatches: number;
      wrongMatches: number;
      scores: number[];
      totalCost: number;
      latencies: number[];
      easyCorrect: number;
      easyTotal: number;
      mediumCorrect: number;
      mediumTotal: number;
      hardCorrect: number;
      hardTotal: number;
    }
  >();

  // First, aggregate vision results by model for cost, latency, and tokens
  const visionByModel = new Map<
    string,
    {
      totalCost: number;
      latencies: number[];
      inputTokensSum: number;
      outputTokensSum: number;
      tokenRowsCounted: number;
    }
  >();

  for (const result of visionResults) {
    if (result.status !== 'success') {
      continue;
    }

    let modelData = visionByModel.get(result.model);
    if (!modelData) {
      modelData = {
        totalCost: 0,
        latencies: [],
        inputTokensSum: 0,
        outputTokensSum: 0,
        tokenRowsCounted: 0,
      };
      visionByModel.set(result.model, modelData);
    }

    modelData.totalCost += result.cost;
    // Only include non-cached latencies (cached results have 0 latency)
    if (!result.fromCache && result.latencyMs > 0) {
      modelData.latencies.push(result.latencyMs);
    }

    // Token aggregation: skip rows whose token fields are missing at runtime
    // (old cached rows pre-date token tracking and have `undefined` even though
    // the static VisionResult type claims `number`). Present-but-zero rows
    // count as 0 — only missing rows skip.
    if (
      typeof result.inputTokens === 'number' &&
      typeof result.outputTokens === 'number'
    ) {
      modelData.inputTokensSum += result.inputTokens;
      modelData.outputTokensSum += result.outputTokens;
      modelData.tokenRowsCounted++;
    }
  }

  // Process judge evaluations for accuracy
  for (const evaluation of judgeEvaluations) {
    const visionResult = visionMap.get(evaluation.vision_response_text);
    if (!visionResult) {
      continue;
    }

    if (visionResult.status !== 'success') {
      continue;
    }

    const modelName = visionResult.model;
    let group = groups.get(modelName);
    if (!group) {
      const visionData = visionByModel.get(modelName) || {
        totalCost: 0,
        latencies: [],
        inputTokensSum: 0,
        outputTokensSum: 0,
        tokenRowsCounted: 0,
      };
      group = {
        modelName,
        totalTests: 0,
        exactMatches: 0,
        variantMatches: 0,
        brandOnlyMatches: 0,
        wrongMatches: 0,
        scores: [],
        totalCost: visionData.totalCost,
        latencies: visionData.latencies,
        easyCorrect: 0,
        easyTotal: 0,
        mediumCorrect: 0,
        mediumTotal: 0,
        hardCorrect: 0,
        hardTotal: 0,
      };
      groups.set(modelName, group);
    }

    group.totalTests++;
    group.scores.push(evaluation.score);

    switch (evaluation.tier) {
      case 'exact':
        group.exactMatches++;
        break;
      case 'variant':
        group.variantMatches++;
        break;
      case 'brand_only':
        group.brandOnlyMatches++;
        break;
      case 'wrong':
        group.wrongMatches++;
        break;
    }

    // Per-tier accuracy: look up shoe difficulty and bump counters.
    // Skip if shoe not in catalog (matches tierMetrics.ts behavior at line 84-87).
    const shoe = catalogMap.get(visionResult.shoeId);
    if (shoe) {
      const isCorrect =
        evaluation.tier === 'exact' || evaluation.tier === 'variant';
      switch (shoe.difficultyTier) {
        case 'easy':
          group.easyTotal++;
          if (isCorrect) group.easyCorrect++;
          break;
        case 'medium':
          group.mediumTotal++;
          if (isCorrect) group.mediumCorrect++;
          break;
        case 'hard':
          group.hardTotal++;
          if (isCorrect) group.hardCorrect++;
          break;
      }
    }
  }

  // Convert to ModelMetrics array
  const result: ModelMetrics[] = [];
  for (const group of Array.from(groups.values())) {
    const correctMatches = group.exactMatches + group.variantMatches;
    const avgScore =
      group.scores.length > 0
        ? group.scores.reduce((sum, s) => sum + s, 0) / group.scores.length
        : 0;
    const avgLatency =
      group.latencies.length > 0
        ? group.latencies.reduce((sum, l) => sum + l, 0) / group.latencies.length
        : 0;

    // Token totals: null when no contributing rows had token data
    // (per D-old-cache-tokens / METR-09 null semantics). Denominator for
    // tokensPerShoe is group.totalTests (locked formula in CONTEXT.md),
    // not tokenRowsCounted.
    const tokenData = visionByModel.get(group.modelName);
    const hasTokens =
      tokenData !== undefined && tokenData.tokenRowsCounted > 0;
    const inputTokensTotal = hasTokens ? tokenData.inputTokensSum : null;
    const outputTokensTotal = hasTokens ? tokenData.outputTokensSum : null;
    const tokensPerShoe =
      hasTokens && group.totalTests > 0
        ? Math.round(
            ((tokenData.inputTokensSum + tokenData.outputTokensSum) /
              group.totalTests) *
              10
          ) / 10
        : null;

    result.push({
      modelName: group.modelName,
      totalTests: group.totalTests,
      exactMatches: group.exactMatches,
      variantMatches: group.variantMatches,
      brandOnlyMatches: group.brandOnlyMatches,
      wrongMatches: group.wrongMatches,
      overallAccuracy:
        group.totalTests > 0
          ? Math.round((correctMatches / group.totalTests) * 100 * 10) / 10
          : 0,
      avgScore: Math.round(avgScore * 10) / 10,
      totalCost: Math.round(group.totalCost * 1000000) / 1000000, // Round to 6 decimals
      avgLatency: Math.round(avgLatency),
      // v1.1 derived fields. Explicit null per METR-09 (never NaN, never 0).
      costPerCorrect:
        correctMatches === 0
          ? null
          : Math.round((group.totalCost / correctMatches) * 1_000_000) /
            1_000_000, // 6 decimals, mirrors totalCost
      easyAccuracy:
        group.easyTotal === 0
          ? null
          : Math.round((group.easyCorrect / group.easyTotal) * 100 * 10) / 10,
      mediumAccuracy:
        group.mediumTotal === 0
          ? null
          : Math.round((group.mediumCorrect / group.mediumTotal) * 100 * 10) /
            10,
      hardAccuracy:
        group.hardTotal === 0
          ? null
          : Math.round((group.hardCorrect / group.hardTotal) * 100 * 10) / 10,
      inputTokensTotal,
      outputTokensTotal,
      tokensPerShoe,
    });
  }

  // Sort by overall accuracy descending (leaderboard order)
  result.sort((a, b) => b.overallAccuracy - a.overallAccuracy);

  return result;
}
