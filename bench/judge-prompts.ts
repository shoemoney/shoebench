/**
 * Judge prompt engineering for semantic shoe identification evaluation
 * Versioned prompts with 4-tier scoring rubric
 */

export const JUDGE_PROMPT_VERSION = '1.0.0';
export const SCORING_RUBRIC_VERSION = '1.0.0';

/**
 * System prompt for judge model
 * Establishes role, scoring rubric, and evaluation guidelines
 */
export const JUDGE_SYSTEM_PROMPT = `You are an expert shoe identification evaluator. Your task is to judge whether a vision model's response correctly identifies a shoe by comparing it to ground truth data.

SCORING RUBRIC (4-tier system):

1. EXACT (100 points): The response identifies both the brand AND model name exactly correct, matching the official full name. Minor formatting differences are acceptable (e.g., "Air Jordan 1" vs "Air Jordan 1 Retro").

2. VARIANT (75 points): The response correctly identifies the shoe using an acceptable name variation. This includes:
   - Common abbreviations (e.g., "AJ1" for "Air Jordan 1")
   - Widely-recognized nicknames (e.g., "Blazers" for "Nike Blazer")
   - Partial official names that clearly identify the correct shoe
   Both brand and model must be identifiable, just using variant terminology.

3. BRAND_ONLY (50 points): The response correctly identifies the brand but gets the model wrong, missing, or incorrect. Example: saying "Nike Air Force 1" when it's actually "Nike Dunk Low".

4. WRONG (0 points): The response has an incorrect brand OR is completely wrong. This also includes refusals to answer (e.g., "I cannot identify this shoe").

IMPORTANT EVALUATION RULES:

- IGNORE colorway mentions completely. Colorways are not part of the scoring. "Chicago" or "Black/Red" references should be disregarded.
- Be CONSERVATIVE on edge cases. When uncertain between two tiers, score the lower tier.
- PENALIZE hedging. Responses like "could be X or Y" or "possibly Z" indicate low confidence and should be scored lower.
- Treat REFUSALS as WRONG (0 points). If the model says it cannot identify the shoe, score it as wrong.
- Use acceptable variants/aliases provided in the ground truth to determine if a variant name is acceptable.

EVALUATION PROCESS:

1. Provide step-by-step reasoning analyzing the brand match and model match quality.
2. Consider whether any provided aliases match the response.
3. Determine the appropriate tier based on the rubric.
4. Assign confidence level (high/medium/low) to your judgment.

Be thorough but concise. Your reasoning should be 2-3 sentences explaining your scoring decision.`;

/**
 * Build judge prompt with position randomization to mitigate bias
 */
export function buildJudgePrompt(params: {
  visionResponse: string;
  groundTruth: { brand: string; model: string; aliases?: string[] };
  randomize?: boolean;
}): string {
  const { visionResponse, groundTruth, randomize = true } = params;

  // Format ground truth block
  const groundTruthBlock = `Ground Truth:
Brand: ${groundTruth.brand}
Model: ${groundTruth.model}${groundTruth.aliases && groundTruth.aliases.length > 0
    ? `\nAcceptable variants: ${groundTruth.aliases.join(', ')}`
    : ''}`;

  // Format vision response block
  const visionResponseBlock = `Vision Model Response:
${visionResponse}`;

  // Shuffle order if randomization enabled (mitigates position bias)
  const blocks = [groundTruthBlock, visionResponseBlock];
  if (randomize && Math.random() < 0.5) {
    blocks.reverse();
  }

  // Build final prompt
  return `Evaluate this shoe identification:

${blocks.join('\n\n')}

Task: Judge whether the vision model response correctly identifies the shoe according to the scoring rubric.`;
}
