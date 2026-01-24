/**
 * Judge evaluation types for LLM-as-judge scoring system
 */

// Scoring tier (4-tier system)
export type JudgeTier = 'exact' | 'variant' | 'brand_only' | 'wrong';

// Judge confidence level
export type JudgeConfidence = 'high' | 'medium' | 'low';

// Output from judge model (Zod-compatible structure)
export type JudgeResult = {
  reasoning: string;           // Step-by-step analysis (2-3 sentences)
  brandMatch: boolean;         // Did vision model get brand right?
  modelMatch: boolean;         // Did vision model get model name or acceptable variant?
  tier: JudgeTier;            // Scoring tier
  score: number;               // 100, 75, 50, or 0
  confidence: JudgeConfidence; // Confidence level
};

// Full database row structure (snake_case for SQLite convention)
export type JudgeEvaluation = {
  cache_key: string;
  vision_response_text: string;
  ground_truth_brand: string;
  ground_truth_model: string;
  aliases: string[];            // Stored as JSON in DB
  tier: JudgeTier;
  score: number;
  confidence: JudgeConfidence;
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
  created_at: number;           // Timestamp
};
