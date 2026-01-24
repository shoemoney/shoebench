/**
 * Fix Brand Balance Script
 *
 * Removes one Nike shoe to bring Nike percentage below 15% threshold.
 * Current: 19/126 = 15.08% (exceeds 15%)
 * Target: 18/125 = 14.4% (below 15%)
 *
 * Selection criteria (in priority order):
 * 1. Prefer "hard" tier (least impact on easy/medium benchmark coverage)
 * 2. Prefer shoes with less distinctive models (avoid iconic pairs)
 * 3. If tie, pick alphabetically last by model name
 */

import { readFileSync, writeFileSync } from "fs";
import { ShoeDataset, type ShoeEntry } from "./schema";

const CATALOG_PATH = "./dataset/catalog.json";

function main() {
  console.log("=== Brand Balance Fix ===\n");

  // Read catalog
  const rawData = readFileSync(CATALOG_PATH, "utf-8");
  const catalog = JSON.parse(rawData);

  // Validate against schema
  const parseResult = ShoeDataset.safeParse(catalog);
  if (!parseResult.success) {
    console.error("Schema validation failed:", parseResult.error);
    process.exit(1);
  }

  const data = parseResult.data;

  // Find Nike shoes (not Jordan - Jordan is separate brand)
  const nikeShoes = data.shoes.filter((shoe) => shoe.brand === "Nike");
  console.log(`Current Nike count: ${nikeShoes.length}`);
  console.log(`Current total shoes: ${data.totalShoes}`);
  console.log(`Current Nike %: ${((nikeShoes.length / data.totalShoes) * 100).toFixed(2)}%\n`);

  if (nikeShoes.length <= 18) {
    console.log("Nike already at or below target (18). No changes needed.");
    return;
  }

  // Group by tier
  const byTier = {
    hard: nikeShoes.filter((s) => s.difficultyTier === "hard"),
    medium: nikeShoes.filter((s) => s.difficultyTier === "medium"),
    easy: nikeShoes.filter((s) => s.difficultyTier === "easy"),
  };

  console.log("Nike shoes by tier:");
  console.log(`  - hard: ${byTier.hard.length}`);
  console.log(`  - medium: ${byTier.medium.length}`);
  console.log(`  - easy: ${byTier.easy.length}\n`);

  // Select removal candidates based on priority
  let candidates: ShoeEntry[];
  let tierSelected: string;

  if (byTier.hard.length > 0) {
    candidates = byTier.hard;
    tierSelected = "hard";
  } else if (byTier.medium.length > 0) {
    // For medium tier, prefer less distinctive models (not iconic)
    const nonIconic = byTier.medium.filter((s) => !s.metadata.isIconic);
    if (nonIconic.length > 0) {
      candidates = nonIconic;
      tierSelected = "medium (non-iconic)";
    } else {
      candidates = byTier.medium;
      tierSelected = "medium";
    }
  } else {
    // For easy tier, prefer non-iconic
    const nonIconic = byTier.easy.filter((s) => !s.metadata.isIconic);
    if (nonIconic.length > 0) {
      candidates = nonIconic;
      tierSelected = "easy (non-iconic)";
    } else {
      candidates = byTier.easy;
      tierSelected = "easy";
    }
  }

  console.log(`Selected tier for removal: ${tierSelected}`);
  console.log(`Candidates: ${candidates.length}`);

  // Sort alphabetically by model and pick last
  candidates.sort((a, b) => a.model.localeCompare(b.model));
  const toRemove = candidates[candidates.length - 1];

  console.log(`\nShoe to remove: "${toRemove.model}"`);
  console.log(`  ID: ${toRemove.id}`);
  console.log(`  Tier: ${toRemove.difficultyTier}`);
  console.log(`  Iconic: ${toRemove.metadata.isIconic}`);

  // Remove the shoe
  const newShoes = data.shoes.filter((shoe) => shoe.id !== toRemove.id);

  // Update counts
  const newTotalShoes = newShoes.length;
  const newNikeCount = newShoes.filter((s) => s.brand === "Nike").length;

  // Update brand distribution
  const newBrandDistribution = { ...data.brandDistribution };
  newBrandDistribution.Nike = newNikeCount;

  // Create updated catalog
  const updatedCatalog = {
    ...data,
    totalShoes: newTotalShoes,
    brandDistribution: newBrandDistribution,
    shoes: newShoes,
  };

  // Validate updated catalog
  const validateResult = ShoeDataset.safeParse(updatedCatalog);
  if (!validateResult.success) {
    console.error("\nValidation of updated catalog failed:", validateResult.error);
    process.exit(1);
  }

  // Write updated catalog
  writeFileSync(CATALOG_PATH, JSON.stringify(updatedCatalog, null, 2) + "\n");

  console.log("\n=== Results ===");
  console.log(`Removed: "${toRemove.model}" (${toRemove.id})`);
  console.log(`New Nike count: ${newNikeCount}`);
  console.log(`New total shoes: ${newTotalShoes}`);
  console.log(`New Nike %: ${((newNikeCount / newTotalShoes) * 100).toFixed(2)}%`);
  console.log(`\nCatalog updated successfully!`);

  // Idempotency check message
  if (newNikeCount === 18) {
    console.log("\nScript is idempotent - running again will have no effect.");
  }
}

main();
