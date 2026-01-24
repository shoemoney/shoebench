/**
 * StockX Scraper
 *
 * Scrapes sneaker brand, model, and images from StockX product pages.
 * Uses rate limiting and cheerio for HTML parsing.
 */

import * as cheerio from "cheerio";
import { SiteScraperBase } from "../utils/rate-limiter";
import { downloadAndProcessImage } from "../utils/image-processor";
import type { ShoeEntry, ImageMetadata, ProvenanceMetadata } from "../schema";
import { mkdir } from "fs/promises";
import { join } from "path";

const SCRAPER_VERSION = "1.0.0";

/**
 * Slugify a string for use in IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Detect image angle from URL or filename hints
 */
function detectImageAngle(
  url: string,
  index: number
): "side" | "top" | "three-quarter" | "back" {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("top") || urlLower.includes("above")) {
    return "top";
  }
  if (urlLower.includes("back") || urlLower.includes("heel")) {
    return "back";
  }
  if (
    urlLower.includes("angle") ||
    urlLower.includes("3q") ||
    urlLower.includes("quarter")
  ) {
    return "three-quarter";
  }
  // Default: first image is usually side view, vary others
  const angles: Array<"side" | "top" | "three-quarter" | "back"> = [
    "side",
    "three-quarter",
    "top",
    "back",
  ];
  return angles[index % angles.length];
}

/**
 * Extract brand and model from a product title
 * StockX titles often follow pattern: "Brand Model Colorway"
 */
function parseBrandAndModel(
  title: string,
  breadcrumbBrand?: string
): { brand: string; model: string } {
  const knownBrands = [
    "Nike",
    "Adidas",
    "Jordan",
    "Air Jordan",
    "New Balance",
    "Converse",
    "Vans",
    "Puma",
    "Reebok",
    "ASICS",
    "Yeezy",
    "Under Armour",
    "Saucony",
    "Brooks",
    "HOKA",
    "On",
    "Salomon",
    "Common Projects",
    "Alexander McQueen",
  ];

  let brand = breadcrumbBrand || "";
  let model = title;

  // If we have a breadcrumb brand, use it
  if (breadcrumbBrand) {
    brand = breadcrumbBrand;
    // Remove brand from title if it starts with it
    const titleLower = title.toLowerCase();
    const brandLower = breadcrumbBrand.toLowerCase();
    if (titleLower.startsWith(brandLower)) {
      model = title.slice(breadcrumbBrand.length).trim();
    }
  } else {
    // Try to extract brand from title
    for (const knownBrand of knownBrands) {
      if (title.toLowerCase().startsWith(knownBrand.toLowerCase())) {
        brand = knownBrand;
        model = title.slice(knownBrand.length).trim();
        break;
      }
    }

    // Special case: "Air Jordan" should become brand "Jordan"
    if (title.toLowerCase().startsWith("air jordan")) {
      brand = "Jordan";
      model = title.slice(4).trim(); // Remove "Air " prefix, keep "Jordan X..."
    }
  }

  // Clean up model - remove common suffixes that are colorway info
  // Keep the core model name but remove specific colorway details
  model = model.replace(/^[-\s]+/, "").trim();

  // If we still don't have a brand, use first word
  if (!brand && title.includes(" ")) {
    const parts = title.split(" ");
    brand = parts[0];
    model = parts.slice(1).join(" ");
  }

  // Fallback
  if (!brand) brand = "Unknown";
  if (!model) model = title;

  return { brand, model };
}

/**
 * Partial shoe entry before image processing
 */
export interface PartialShoeEntry {
  brand: string;
  model: string;
  imageUrls: string[];
  sourceUrl: string;
}

/**
 * StockX scraper class
 */
export class StockXScraper extends SiteScraperBase {
  constructor() {
    // Use conservative rate limiting for StockX
    super({
      requestsPerMinute: 4, // Very conservative for StockX
      randomDelayMs: [3000, 6000],
    });
  }

  /**
   * Scrape a StockX product page for brand, model, and image URLs
   */
  async scrapeProductPage(url: string): Promise<PartialShoeEntry> {
    console.log(`Scraping: ${url}`);

    const html = await this.fetchWithRateLimit(url);
    const $ = cheerio.load(html);

    // Extract product title - StockX uses various selectors
    let title =
      $('[data-component="primary-product-title"]').text().trim() ||
      $("h1").first().text().trim() ||
      $('[data-testid="product-name"]').text().trim() ||
      $(".product-title").text().trim();

    // Extract brand from breadcrumbs if available
    let breadcrumbBrand = "";
    $('[data-component="breadcrumb"] a, .breadcrumb a, nav[aria-label="breadcrumb"] a').each(
      (_, el) => {
        const text = $(el).text().trim();
        // Look for brand in breadcrumbs (usually second or third item)
        if (
          text &&
          !text.toLowerCase().includes("home") &&
          !text.toLowerCase().includes("sneaker")
        ) {
          breadcrumbBrand = text;
        }
      }
    );

    // Parse brand and model from title
    const { brand, model } = parseBrandAndModel(title, breadcrumbBrand);

    // Extract product images - StockX stores images in various ways
    const imageUrls: string[] = [];
    const seenUrls = new Set<string>();

    // Method 1: Look for product gallery images
    $(
      '[data-component="product-image"] img, .product-image img, [data-testid="product-image"] img'
    ).each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        imageUrls.push(src);
      }
    });

    // Method 2: Look for carousel/gallery images
    $(".carousel img, .gallery img, [role=\"img\"]").each((_, el) => {
      const src =
        $(el).attr("src") || $(el).attr("data-src") || $(el).attr("style");
      if (src && src.startsWith("http") && !seenUrls.has(src)) {
        seenUrls.add(src);
        imageUrls.push(src);
      }
    });

    // Method 3: Extract from JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (jsonText) {
          const data = JSON.parse(jsonText);
          if (data.image) {
            const images = Array.isArray(data.image)
              ? data.image
              : [data.image];
            for (const img of images) {
              const imgUrl = typeof img === "string" ? img : img.url;
              if (imgUrl && !seenUrls.has(imgUrl)) {
                seenUrls.add(imgUrl);
                imageUrls.push(imgUrl);
              }
            }
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    // Method 4: Look for og:image meta tag
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && !seenUrls.has(ogImage)) {
      seenUrls.add(ogImage);
      imageUrls.push(ogImage);
    }

    // Method 5: Find images with StockX CDN pattern
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        (src.includes("stockx") || src.includes("cdn")) &&
        !seenUrls.has(src)
      ) {
        // Filter out small icons, logos
        const isProduct =
          !src.includes("logo") &&
          !src.includes("icon") &&
          !src.includes("favicon");
        if (isProduct) {
          seenUrls.add(src);
          imageUrls.push(src);
        }
      }
    });

    if (!title) {
      throw new Error(`Could not extract product title from ${url}`);
    }

    console.log(`  Found: ${brand} - ${model} (${imageUrls.length} images)`);

    return {
      brand,
      model,
      imageUrls,
      sourceUrl: url,
    };
  }

  /**
   * Scrape a shoe and download/process all images
   */
  async scrapeShoe(url: string, outputDir: string): Promise<ShoeEntry> {
    const partialEntry = await this.scrapeProductPage(url);

    // Generate unique ID
    const id = `stockx-${slugify(partialEntry.brand)}-${slugify(partialEntry.model)}`;

    // Create output directory for this shoe
    const shoeDir = join(outputDir, id);
    await mkdir(shoeDir, { recursive: true });

    // Download and process images
    const images: ImageMetadata[] = [];

    for (let i = 0; i < partialEntry.imageUrls.length && i < 6; i++) {
      const imageUrl = partialEntry.imageUrls[i];
      const angle = detectImageAngle(imageUrl, i);
      const filename = `${id}-${angle}-${i}.jpg`;
      const outputPath = join(shoeDir, filename);

      try {
        console.log(`  Downloading image ${i + 1}/${Math.min(partialEntry.imageUrls.length, 6)}: ${angle}`);
        const result = await downloadAndProcessImage(imageUrl, outputPath);

        images.push({
          url: imageUrl,
          localPath: outputPath,
          angle,
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  Failed to download image ${i + 1}: ${message}`);
      }
    }

    if (images.length === 0) {
      throw new Error(`No images could be downloaded for ${url}`);
    }

    // Create provenance metadata
    const provenance: ProvenanceMetadata = {
      source: "stockx",
      scrapedAt: new Date().toISOString(),
      sourceUrl: url,
      scraperVersion: SCRAPER_VERSION,
    };

    // Return complete entry (difficultyTier will be added later)
    const entry: ShoeEntry = {
      id,
      brand: partialEntry.brand,
      model: partialEntry.model,
      difficultyTier: "medium", // Placeholder - will be assigned later
      tierRationale: "Auto-assigned during scraping",
      images,
      provenance,
      metadata: {
        isIconic: false, // Will be assessed later
        brandingVisibility: "medium", // Will be assessed later
      },
    };

    return entry;
  }

  /**
   * Scrape multiple shoes with progress logging
   */
  async scrapeMultiple(
    urls: string[],
    outputDir: string
  ): Promise<ShoeEntry[]> {
    const results: ShoeEntry[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    console.log(`\nStarting scrape of ${urls.length} shoes...\n`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

      try {
        const entry = await this.scrapeShoe(url, outputDir);
        results.push(entry);
        console.log(`  Success: ${entry.brand} ${entry.model}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  Error: ${message}`);
        errors.push({ url, error: message });
      }
    }

    console.log(`\n=== Scrape Complete ===`);
    console.log(`Success: ${results.length}/${urls.length}`);
    console.log(`Failed: ${errors.length}/${urls.length}`);

    if (errors.length > 0) {
      console.log(`\nFailed URLs:`);
      for (const { url, error } of errors) {
        console.log(`  - ${url}: ${error}`);
      }
    }

    return results;
  }
}

/**
 * Convenience function to scrape StockX URLs
 */
export async function scrapeStockX(
  urls: string[],
  outputDir: string
): Promise<ShoeEntry[]> {
  const scraper = new StockXScraper();
  return scraper.scrapeMultiple(urls, outputDir);
}

// Main function for testing
async function main() {
  const fs = await import("fs/promises");
  const path = await import("path");

  // Load URLs from stockx-urls.json
  const urlsPath = path.join(
    import.meta.dir,
    "../shoe-urls/stockx-urls.json"
  );

  let urls: string[] = [];
  try {
    const data = await fs.readFile(urlsPath, "utf-8");
    const parsed = JSON.parse(data);
    urls = parsed.urls.map((entry: { url: string }) => entry.url);
  } catch (error) {
    console.log("stockx-urls.json not found or invalid, using test URLs");
    // Test with a few example URLs
    urls = [
      "https://stockx.com/air-jordan-1-retro-high-og-chicago-reimagined-2022",
    ];
  }

  // Only test with first 3 URLs
  const testUrls = urls.slice(0, 3);
  console.log(`Testing with ${testUrls.length} URLs...`);

  // Create output directory
  const outputDir = path.join(import.meta.dir, "../images/stockx");
  await fs.mkdir(outputDir, { recursive: true });

  // Run scraper
  const scraper = new StockXScraper();
  const results = await scraper.scrapeMultiple(testUrls, outputDir);

  console.log(`\nScraped ${results.length} shoes:`);
  for (const shoe of results) {
    console.log(`  - ${shoe.brand} ${shoe.model} (${shoe.images.length} images)`);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
