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
 * Calculates model metrics from vision and judge results
 *
 * @param visionResults - Vision test results from bench/results/vision/*.json
 * @param judgeEvaluations - Judge evaluations from bench/results/judge/*.json
 * @param _catalog - Shoe catalog (unused but kept for consistent API)
 * @returns Array of ModelMetrics objects (one per model)
 */
export function calculateModelMetrics(
  visionResults: VisionResult[],
  judgeEvaluations: JudgeEvaluation[],
  _catalog: CatalogShoe[]
): ModelMetrics[] {
  const visionMap = buildVisionResponseMap(visionResults);

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
      // v1.1: Plan 03 will fill in costPerCorrect + per-tier accuracy.
      // Placeholders kept here only so the contract from Plan 01 typechecks
      // for the token-field-only intermediate state of this plan.
      costPerCorrect: null,
      easyAccuracy: null,
      mediumAccuracy: null,
      hardAccuracy: null,
      inputTokensTotal,
      outputTokensTotal,
      tokensPerShoe,
    });
  }

  // Sort by overall accuracy descending (leaderboard order)
  result.sort((a, b) => b.overallAccuracy - a.overallAccuracy);

  return result;
}
