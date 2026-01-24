/**
 * Types for benchmark data aggregation and visualization
 *
 * These types match the source data from bench/results/ and define
 * the aggregated structures for the dashboard.
 */

// === Source Data Types (from bench/results/) ===

/** Judge evaluation tier (4-tier scoring system) */
export type JudgeTier = 'exact' | 'variant' | 'brand_only' | 'wrong';

/** Difficulty tier from catalog */
export type DifficultyTier = 'easy' | 'medium' | 'hard';

/** Test execution status */
export type TestStatus = 'success' | 'error' | 'refusal';

/**
 * Vision result from bench/results/vision/*.json
 * Matches VisionTestResult in bench/vision-types.ts
 */
export type VisionResult = {
  shoeId: string;
  model: string;
  status: TestStatus;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  imageWidth: number;
  imageHeight: number;
  imageSizeBytes: number;
  fromCache: boolean;
  createdAt: number;
};

/**
 * Judge evaluation from bench/results/judge/*.json
 * Matches JudgeEvaluation in bench/judge-types.ts
 */
export type JudgeEvaluation = {
  cache_key: string;
  vision_response_text: string;
  ground_truth_brand: string;
  ground_truth_model: string;
  aliases: string[];
  tier: JudgeTier;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  brand_match: boolean;
  model_match: boolean;
  judge_model: string;
  judge_prompt_version: string;
  rubric_version: string;
  raw_judge_response: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  latency_ms: number;
  created_at: number;
};

/**
 * Image metadata from catalog
 */
export type CatalogImage = {
  url: string;
  localPath: string;
  angle: string;
  width: number;
  height: number;
  sizeBytes: number;
  status: string;
};

/**
 * Shoe from dataset/catalog.json
 */
export type CatalogShoe = {
  id: string;
  brand: string;
  model: string;
  difficultyTier: DifficultyTier;
  tierRationale?: string;
  aliases?: string[];
  images: CatalogImage[];
  provenance: {
    source: string;
    scrapedAt: string;
    sourceUrl: string;
    scraperVersion: string;
  };
  metadata: {
    isIconic: boolean;
    culturalSignificance: string;
    brandingVisibility: string;
  };
};

// === Aggregated Types (for dashboard) ===

/**
 * Per-model aggregated metrics for the leaderboard
 */
export type ModelMetrics = {
  modelName: string;
  totalTests: number;
  exactMatches: number;
  variantMatches: number;
  brandOnlyMatches: number;
  wrongMatches: number;
  overallAccuracy: number; // (exact + variant) / total * 100
  avgScore: number; // Average of all scores (0-100)
  totalCost: number; // Vision cost only (what user pays)
  avgLatency: number; // Average latency in ms
};

/**
 * Accuracy breakdown by difficulty tier for each model
 */
export type TierAccuracy = {
  tier: DifficultyTier;
  modelName: string;
  totalShoes: number;
  correctCount: number; // exact + variant
  accuracyPercent: number; // correctCount / totalShoes * 100
  avgScore: number;
};

/**
 * Individual error case for error analysis
 */
export type ErrorCase = {
  shoeId: string;
  shoeBrand: string;
  shoeModel: string;
  difficultyTier: DifficultyTier;
  imagePath: string;
  modelName: string;
  visionResponse: string;
  judgeReasoning: string;
  errorType: 'brand_only' | 'wrong';
  score: number;
};

/**
 * Complete benchmark data structure for the visualizer
 */
export type BenchmarkData = {
  metadata: {
    timestamp: string;
    visionResultsFile: string;
    judgeResultsFile: string;
    totalModels: number;
    totalShoes: number;
    totalTests: number;
  };
  modelMetrics: ModelMetrics[];
  tierAccuracy: TierAccuracy[];
  errors: ErrorCase[];
};

// === File Format Types ===

/**
 * Vision results file structure
 */
export type VisionResultsFile = {
  metadata: {
    timestamp: string;
    duration: number;
    models: string[];
    shoeCount: number;
    total: number;
    success: number;
    error: number;
    refusal: number;
    cached: number;
    totalCost: number;
    totalTokens: number;
    avgLatency: number;
  };
  results: VisionResult[];
};

/**
 * Judge results file structure
 */
export type JudgeResultsFile = {
  metadata: {
    timestamp: string;
    duration: number;
    inputFile: string;
    visionResultsCount: number;
    evaluatedCount: number;
    avgScore: number;
    tierCounts: {
      exact: number;
      variant: number;
      brand_only: number;
      wrong: number;
    };
    cacheHits: number;
    totalCost: number;
    totalTokens: number;
  };
  evaluations: JudgeEvaluation[];
};

/**
 * Catalog file structure
 */
export type CatalogFile = {
  version: string;
  createdAt: string;
  totalShoes: number;
  brandDistribution: Record<string, number>;
  shoes: CatalogShoe[];
};
