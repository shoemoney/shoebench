/**
 * Contamination Check Script
 *
 * Checks for potential data contamination in benchmark images.
 * Vision models may have seen product images during training, which could
 * inflate benchmark scores if those exact images are used.
 *
 * Methods:
 * 1. Reverse image search (TinEye API) - checks if image exists elsewhere online
 * 2. Release date filtering - newer shoes are less likely to be in training data
 * 3. Source diversity - images from multiple sources reduce single-source contamination
 *
 * Usage: bun run dataset/contamination-check.ts [--api-key=TINEYE_API_KEY]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { ShoeDataset, ShoeEntry } from "./schema";

// TinEye API configuration
const TINEYE_API_URL = "https://api.tineye.com/rest/search/";

interface TinEyeResult {
  matches: number;
  firstSeenDate: string | null;
  domains: string[];
}

interface ContaminationResult {
  shoeId: string;
  imagePath: string;
  status: "clean" | "potential" | "contaminated" | "unchecked";
  tineyeMatches?: number;
  tineyeFirstSeen?: string;
  matchDomains?: string[];
  notes: string;
}

interface ContaminationReport {
  checkedAt: string;
  totalImages: number;
  checked: number;
  clean: number;
  potential: number;
  contaminated: number;
  unchecked: number;
  results: ContaminationResult[];
}

/**
 * Check a single image against TinEye reverse image search
 */
async function checkTinEye(
  imagePath: string,
  apiKey: string
): Promise<TinEyeResult | null> {
  if (!existsSync(imagePath)) {
    return null;
  }

  try {
    // Read image and encode as base64
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    // Make TinEye API request
    const response = await fetch(TINEYE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
      body: new URLSearchParams({
        image: base64Image,
        limit: "10",
        offset: "0",
      }),
    });

    if (!response.ok) {
      console.error(`TinEye API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as {
      status: string;
      results: {
        matches: Array<{
          domain: string;
          crawl_date: string;
        }>;
        total_results: number;
      };
    };

    if (data.status !== "ok") {
      return null;
    }

    const matches = data.results.matches || [];
    const domains = [...new Set(matches.map((m) => m.domain))];
    const crawlDates = matches.map((m) => m.crawl_date).filter(Boolean);
    const firstSeenDate = crawlDates.length > 0
      ? crawlDates.sort()[0]
      : null;

    return {
      matches: data.results.total_results,
      firstSeenDate,
      domains,
    };
  } catch (error) {
    console.error(`TinEye check failed for ${imagePath}:`, error);
    return null;
  }
}

/**
 * Analyze TinEye results to determine contamination status
 */
function analyzeContamination(result: TinEyeResult | null): {
  status: ContaminationResult["status"];
  notes: string;
} {
  if (!result) {
    return { status: "unchecked", notes: "Image not available or API check failed" };
  }

  if (result.matches === 0) {
    return { status: "clean", notes: "No matches found in reverse image search" };
  }

  // Check if matches are only on original source domains
  const originalSources = ["stockx.com", "goat.com", "farfetch.com"];
  const externalDomains = result.domains.filter(
    (d) => !originalSources.some((s) => d.includes(s))
  );

  if (externalDomains.length === 0) {
    return {
      status: "clean",
      notes: `${result.matches} matches, but only on original source domains`,
    };
  }

  // Check first seen date
  if (result.firstSeenDate) {
    const firstSeen = new Date(result.firstSeenDate);
    const modelCutoff = new Date("2024-01-01"); // Approximate training cutoff for current models

    if (firstSeen > modelCutoff) {
      return {
        status: "potential",
        notes: `${result.matches} matches on external domains, but first seen ${result.firstSeenDate} (after model training cutoff)`,
      };
    }
  }

  // High match count on external domains = likely contaminated
  if (result.matches > 50) {
    return {
      status: "contaminated",
      notes: `${result.matches} matches on ${externalDomains.length} external domains - high contamination risk`,
    };
  }

  return {
    status: "potential",
    notes: `${result.matches} matches found on ${externalDomains.join(", ")}`,
  };
}

/**
 * Run contamination check on the catalog
 */
export async function checkContamination(
  apiKey?: string,
  limit?: number
): Promise<ContaminationReport> {
  const datasetDir = join(import.meta.dir);
  const catalogPath = join(datasetDir, "catalog.json");

  if (!existsSync(catalogPath)) {
    throw new Error("catalog.json not found. Run assemble-catalog.ts first.");
  }

  const catalog: ShoeDataset = JSON.parse(readFileSync(catalogPath, "utf-8"));
  const results: ContaminationResult[] = [];

  const shoesToCheck = limit ? catalog.shoes.slice(0, limit) : catalog.shoes;

  for (const shoe of shoesToCheck) {
    for (const image of shoe.images) {
      const absolutePath = join(datasetDir, "..", image.localPath);

      if (apiKey && existsSync(absolutePath)) {
        // Run TinEye check
        console.log(`Checking ${shoe.id}...`);
        const tineyeResult = await checkTinEye(absolutePath, apiKey);
        const analysis = analyzeContamination(tineyeResult);

        results.push({
          shoeId: shoe.id,
          imagePath: image.localPath,
          status: analysis.status,
          tineyeMatches: tineyeResult?.matches,
          tineyeFirstSeen: tineyeResult?.firstSeenDate ?? undefined,
          matchDomains: tineyeResult?.domains,
          notes: analysis.notes,
        });

        // Rate limit
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        // No API key or image doesn't exist - mark as unchecked
        results.push({
          shoeId: shoe.id,
          imagePath: image.localPath,
          status: "unchecked",
          notes: apiKey
            ? "Image file not found (placeholder)"
            : "No TinEye API key provided",
        });
      }
    }
  }

  // Compile report
  const report: ContaminationReport = {
    checkedAt: new Date().toISOString(),
    totalImages: results.length,
    checked: results.filter((r) => r.status !== "unchecked").length,
    clean: results.filter((r) => r.status === "clean").length,
    potential: results.filter((r) => r.status === "potential").length,
    contaminated: results.filter((r) => r.status === "contaminated").length,
    unchecked: results.filter((r) => r.status === "unchecked").length,
    results,
  };

  // Write report
  const reportPath = join(datasetDir, "contamination-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}`);

  return report;
}

/**
 * Generate source diversity statistics
 */
export function analyzeSourceDiversity(
  catalog: ShoeDataset
): Record<string, number> {
  const sources: Record<string, number> = {};
  for (const shoe of catalog.shoes) {
    const source = shoe.provenance.source;
    sources[source] = (sources[source] || 0) + 1;
  }
  return sources;
}

// Main execution
async function main() {
  console.log("=== Contamination Check ===\n");

  // Parse CLI args
  const args = process.argv.slice(2);
  const apiKeyArg = args.find((a) => a.startsWith("--api-key="));
  const apiKey = apiKeyArg?.split("=")[1] || process.env.TINEYE_API_KEY;
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  try {
    const report = await checkContamination(apiKey, limit);

    console.log("\n=== Summary ===");
    console.log(`Total images: ${report.totalImages}`);
    console.log(`Checked: ${report.checked}`);
    console.log(`Clean: ${report.clean}`);
    console.log(`Potential: ${report.potential}`);
    console.log(`Contaminated: ${report.contaminated}`);
    console.log(`Unchecked: ${report.unchecked}`);

    if (!apiKey) {
      console.log("\nNote: No TinEye API key provided. Run with --api-key=YOUR_KEY to perform actual checks.");
      console.log("Get a TinEye API key at: https://api.tineye.com/");
    }

    // Load catalog for source diversity analysis
    const catalogPath = join(import.meta.dir, "catalog.json");
    const catalog: ShoeDataset = JSON.parse(readFileSync(catalogPath, "utf-8"));
    const sourceDiversity = analyzeSourceDiversity(catalog);

    console.log("\n=== Source Diversity ===");
    for (const [source, count] of Object.entries(sourceDiversity)) {
      const percentage = ((count / catalog.totalShoes) * 100).toFixed(1);
      console.log(`  ${source}: ${count} (${percentage}%)`);
    }

    console.log("\nContamination check complete!");
  } catch (error) {
    console.error("Contamination check failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
