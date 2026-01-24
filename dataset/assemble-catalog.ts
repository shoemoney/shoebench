/**
 * Catalog Assembly Script
 *
 * Combines shoe data from URL lists (StockX, GOAT, Farfetch) into a unified catalog.
 * Since scrapers hit 403 errors, this uses expectedBrand/expectedModel from URL lists
 * as ground truth, creating placeholder image paths for later population.
 *
 * Usage: bun run dataset/assemble-catalog.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { ShoeDataset, ShoeEntry, type DifficultyTier } from "./schema";
import { assignTiers } from "./assign-tiers";

// URL list structure matching shoe-urls/*.json files
interface UrlEntry {
  url: string;
  expectedBrand: string;
  expectedModel: string;
  notes?: string;
}

interface UrlList {
  urls: UrlEntry[];
  source?: string;
  description?: string;
}

// Slugify a string for use in IDs and file paths
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Normalize brand names for consistency
function normalizeBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    jordan: "Jordan",
    nike: "Nike",
    adidas: "Adidas",
    "new balance": "New Balance",
    converse: "Converse",
    vans: "Vans",
    puma: "Puma",
    reebok: "Reebok",
    asics: "ASICS",
    on: "On",
    "under armour": "Under Armour",
    saucony: "Saucony",
    gucci: "Gucci",
    balenciaga: "Balenciaga",
    "christian louboutin": "Christian Louboutin",
    prada: "Prada",
    "bottega veneta": "Bottega Veneta",
    "common projects": "Common Projects",
    "maison margiela": "Maison Margiela",
    "rick owens": "Rick Owens",
    "saint laurent": "Saint Laurent",
    valentino: "Valentino",
    "jimmy choo": "Jimmy Choo",
  };

  const lower = brand.toLowerCase();
  return brandMap[lower] || brand;
}

// Create a unique deduplication key
function makeDedupeKey(brand: string, model: string): string {
  return `${normalizeBrand(brand).toLowerCase()}::${model.toLowerCase()}`;
}

// Determine source from URL
function getSourceFromUrl(url: string): "stockx" | "goat" | "farfetch" {
  if (url.includes("stockx.com")) return "stockx";
  if (url.includes("goat.com")) return "goat";
  if (url.includes("farfetch.com")) return "farfetch";
  throw new Error(`Unknown source for URL: ${url}`);
}

// Load URL list from JSON file
function loadUrlList(filePath: string): UrlList {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as UrlList;
}

// Calculate brand distribution
function calculateBrandDistribution(
  shoes: ShoeEntry[]
): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const shoe of shoes) {
    distribution[shoe.brand] = (distribution[shoe.brand] || 0) + 1;
  }
  return distribution;
}

// Validate brand distribution (no single brand exceeds 15%)
function validateBrandDistribution(
  distribution: Record<string, number>,
  totalShoes: number
): { valid: boolean; violations: string[] } {
  const maxAllowed = Math.ceil(totalShoes * 0.15);
  const violations: string[] = [];

  for (const [brand, count] of Object.entries(distribution)) {
    const percentage = (count / totalShoes) * 100;
    if (count > maxAllowed) {
      violations.push(
        `${brand}: ${count} shoes (${percentage.toFixed(1)}%) exceeds 15% limit (max ${maxAllowed})`
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Assemble catalog from URL lists
 *
 * @returns The assembled and validated ShoeDataset
 */
export async function assembleCatalog(): Promise<ShoeDataset> {
  const datasetDir = join(import.meta.dir);
  const urlsDir = join(datasetDir, "shoe-urls");

  console.log("Loading URL lists...");

  // Load all URL lists
  const stockxList = loadUrlList(join(urlsDir, "stockx-urls.json"));
  const goatList = loadUrlList(join(urlsDir, "goat-urls.json"));
  const farfetchList = loadUrlList(join(urlsDir, "farfetch-urls.json"));

  const allUrls: UrlEntry[] = [
    ...stockxList.urls,
    ...goatList.urls,
    ...farfetchList.urls,
  ];

  console.log(
    `Loaded ${stockxList.urls.length} StockX + ${goatList.urls.length} GOAT + ${farfetchList.urls.length} Farfetch = ${allUrls.length} total URLs`
  );

  // Deduplicate by brand+model
  const seen = new Set<string>();
  const uniqueUrls: UrlEntry[] = [];

  for (const entry of allUrls) {
    const key = makeDedupeKey(entry.expectedBrand, entry.expectedModel);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueUrls.push(entry);
    } else {
      console.log(`  Skipping duplicate: ${entry.expectedBrand} ${entry.expectedModel}`);
    }
  }

  console.log(`After deduplication: ${uniqueUrls.length} unique shoes`);

  // Ensure images directory exists
  const imagesDir = join(datasetDir, "images");
  for (const source of ["stockx", "goat", "farfetch"]) {
    const sourceDir = join(imagesDir, source);
    if (!existsSync(sourceDir)) {
      mkdirSync(sourceDir, { recursive: true });
    }
  }

  // Create ShoeEntry for each unique URL
  const now = new Date().toISOString();
  const shoes: ShoeEntry[] = [];

  for (const entry of uniqueUrls) {
    const brand = normalizeBrand(entry.expectedBrand);
    const model = entry.expectedModel;
    const source = getSourceFromUrl(entry.url);
    const id = `${source}-${slugify(brand)}-${slugify(model)}`;

    // Placeholder image path - will be populated later via manual download or automation
    const localPath = `dataset/images/${source}/${slugify(brand)}-${slugify(model)}.jpg`;

    const shoe: ShoeEntry = {
      id,
      brand,
      model,
      difficultyTier: "medium" as DifficultyTier, // Will be overwritten by assignTiers
      tierRationale: "Pending tier assignment",
      images: [
        {
          url: entry.url,
          localPath,
          angle: "side" as const,
          width: 1024, // Placeholder dimensions
          height: 1024,
          sizeBytes: 0, // Unknown until downloaded
          status: "placeholder" as const,
        },
      ],
      provenance: {
        source,
        scrapedAt: now,
        sourceUrl: entry.url,
        scraperVersion: "url-list-v1.0.0", // Indicate this is from URL list, not scraper
      },
      metadata: {
        isIconic: false, // Will be set by tier assignment
        brandingVisibility: "medium" as const,
      },
    };

    shoes.push(shoe);
  }

  console.log(`Created ${shoes.length} shoe entries`);

  // Assign difficulty tiers
  console.log("Assigning difficulty tiers...");
  const tieredShoes = assignTiers(shoes);

  // Calculate brand distribution
  const brandDistribution = calculateBrandDistribution(tieredShoes);

  // Validate brand distribution
  const validation = validateBrandDistribution(
    brandDistribution,
    tieredShoes.length
  );
  if (!validation.valid) {
    console.warn("Brand distribution warnings:");
    for (const v of validation.violations) {
      console.warn(`  - ${v}`);
    }
    console.warn(
      "Note: Some brands exceed 15% threshold. Consider adjusting URL lists."
    );
  }

  // Create dataset
  const dataset: ShoeDataset = {
    version: "1.0.0",
    createdAt: now,
    totalShoes: tieredShoes.length,
    brandDistribution,
    shoes: tieredShoes,
  };

  // Validate against schema
  console.log("Validating against ShoeDataset schema...");
  const parsed = ShoeDataset.parse(dataset);

  // Write catalog to file
  const catalogPath = join(datasetDir, "catalog.json");
  writeFileSync(catalogPath, JSON.stringify(parsed, null, 2));
  console.log(`Wrote catalog to ${catalogPath}`);

  return parsed;
}

// Main execution
async function main() {
  console.log("=== Shoe Catalog Assembly ===\n");

  try {
    const catalog = await assembleCatalog();

    // Summary statistics
    console.log("\n=== Summary ===");
    console.log(`Total shoes: ${catalog.totalShoes}`);

    // Tier distribution
    const tierCounts = { easy: 0, medium: 0, hard: 0 };
    for (const shoe of catalog.shoes) {
      tierCounts[shoe.difficultyTier]++;
    }
    console.log("\nTier distribution:");
    console.log(
      `  Easy:   ${tierCounts.easy} (${((tierCounts.easy / catalog.totalShoes) * 100).toFixed(1)}%)`
    );
    console.log(
      `  Medium: ${tierCounts.medium} (${((tierCounts.medium / catalog.totalShoes) * 100).toFixed(1)}%)`
    );
    console.log(
      `  Hard:   ${tierCounts.hard} (${((tierCounts.hard / catalog.totalShoes) * 100).toFixed(1)}%)`
    );

    // Brand distribution
    console.log("\nBrand distribution:");
    const sortedBrands = Object.entries(catalog.brandDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    for (const [brand, count] of sortedBrands) {
      const percentage = ((count / catalog.totalShoes) * 100).toFixed(1);
      console.log(`  ${brand}: ${count} (${percentage}%)`);
    }
    if (Object.keys(catalog.brandDistribution).length > 10) {
      console.log(
        `  ... and ${Object.keys(catalog.brandDistribution).length - 10} more brands`
      );
    }

    console.log("\nCatalog assembly complete!");
  } catch (error) {
    console.error("Catalog assembly failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
