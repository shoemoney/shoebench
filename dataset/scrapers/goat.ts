/**
 * GOAT shoe scraper
 *
 * Scrapes sneaker and streetwear data from GOAT product pages.
 * Extracts brand, model, and product images, then processes them
 * to 1024x1024 standardized format.
 */

import * as cheerio from "cheerio";
import { SiteScraperBase } from "../utils/rate-limiter";
import { downloadAndProcessImage } from "../utils/image-processor";
import type { ShoeEntry, ImageMetadata } from "../schema";

/**
 * Slugify a string for use in IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Infer image angle from URL or filename
 */
function inferImageAngle(
  url: string,
  index: number
): ImageMetadata["angle"] {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("side") || urlLower.includes("lateral")) return "side";
  if (urlLower.includes("top") || urlLower.includes("above")) return "top";
  if (urlLower.includes("back") || urlLower.includes("heel")) return "back";
  if (
    urlLower.includes("three-quarter") ||
    urlLower.includes("3q") ||
    urlLower.includes("angle")
  )
    return "three-quarter";

  // Default based on position: first image usually side view
  const defaultAngles: ImageMetadata["angle"][] = [
    "side",
    "three-quarter",
    "back",
    "top",
  ];
  return defaultAngles[index % defaultAngles.length];
}

/**
 * Partial shoe data extracted from GOAT page (before image processing)
 */
export interface PartialShoeData {
  brand: string;
  model: string;
  imageUrls: string[];
  releaseYear?: number;
}

/**
 * GOAT scraper class extending SiteScraperBase for rate limiting
 *
 * @example
 * ```ts
 * const scraper = new GOATScraper();
 * const shoe = await scraper.scrapeShoe(
 *   'https://www.goat.com/sneakers/...',
 *   './dataset/images/goat/'
 * );
 * ```
 */
export class GOATScraper extends SiteScraperBase {
  private scraperVersion = "1.0.0";

  constructor() {
    // Use conservative rate limiting: 6 req/min with 3-6s jitter
    super({
      requestsPerMinute: 6,
      randomDelayMs: [3000, 6000],
    });
  }

  /**
   * Scrape product data from a GOAT product page
   *
   * @param url - GOAT product page URL
   * @returns Partial shoe data with brand, model, and image URLs
   */
  async scrapeProductPage(url: string): Promise<PartialShoeData> {
    console.log(`Fetching GOAT page: ${url}`);
    const html = await this.fetchWithRateLimit(url);
    const $ = cheerio.load(html);

    // GOAT page structure extraction
    // Product name is typically in h1 or a specific product title element
    let productName = "";
    let brand = "";

    // Try multiple selectors for product name
    const titleSelectors = [
      'h1[data-qa="product-template-title"]',
      "h1.product-name",
      'h1[class*="ProductName"]',
      "h1",
      '[data-qa="product-template-title"]',
      ".product-title",
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        productName = element.text().trim();
        break;
      }
    }

    // Try to extract brand separately
    const brandSelectors = [
      '[data-qa="product-template-brand"]',
      ".product-brand",
      '[class*="Brand"]',
      ".brand-name",
    ];

    for (const selector of brandSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        brand = element.text().trim();
        break;
      }
    }

    // If brand not found separately, try to extract from product name
    if (!brand && productName) {
      // Common pattern: "Nike Air Max 90" -> brand = "Nike"
      const knownBrands = [
        "Nike",
        "Jordan",
        "Adidas",
        "New Balance",
        "Asics",
        "Puma",
        "Reebok",
        "Saucony",
        "Converse",
        "Vans",
        "Under Armour",
        "On",
        "Hoka",
        "Salomon",
      ];

      for (const knownBrand of knownBrands) {
        if (productName.toLowerCase().startsWith(knownBrand.toLowerCase())) {
          brand = knownBrand;
          break;
        }
      }
    }

    // Fallback: first word as brand
    if (!brand && productName) {
      brand = productName.split(" ")[0];
    }

    // Model is the product name minus brand prefix
    let model = productName;
    if (brand && productName.toLowerCase().startsWith(brand.toLowerCase())) {
      model = productName.slice(brand.length).trim();
    }

    // Extract image URLs from product gallery
    const imageUrls: string[] = [];
    const imageSelectors = [
      'img[data-qa*="product"]',
      ".product-image img",
      '[class*="ProductImage"] img',
      ".gallery img",
      'img[src*="image.goat.com"]',
      'picture source[srcset*="image.goat.com"]',
      "img",
    ];

    const seenUrls = new Set<string>();

    for (const selector of imageSelectors) {
      $(selector).each((_, el) => {
        const src =
          $(el).attr("src") ||
          $(el).attr("srcset")?.split(" ")[0] ||
          $(el).attr("data-src");
        if (src && !seenUrls.has(src)) {
          // Filter to only shoe images (skip icons, logos, etc.)
          if (
            src.includes("image.goat.com") ||
            src.includes("cdn.goat.com") ||
            src.includes("product")
          ) {
            // Get highest resolution version
            const highResUrl = src.replace(/\?.*$/, ""); // Remove query params for original
            if (!seenUrls.has(highResUrl)) {
              seenUrls.add(highResUrl);
              imageUrls.push(highResUrl);
            }
          }
        }
      });

      if (imageUrls.length >= 4) break; // Limit to 4 images
    }

    // Try to extract release year from page
    let releaseYear: number | undefined;
    const yearPatterns = [
      /release\s*(?:date|year)[:\s]*(\d{4})/i,
      /released\s*(?:in\s*)?(\d{4})/i,
      /\b(20[0-2]\d)\b/, // Years 2000-2029
    ];

    const pageText = $("body").text();
    for (const pattern of yearPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 1990 && year <= new Date().getFullYear()) {
          releaseYear = year;
          break;
        }
      }
    }

    if (!productName) {
      throw new Error(`Could not extract product name from ${url}`);
    }

    if (imageUrls.length === 0) {
      throw new Error(`Could not find any product images on ${url}`);
    }

    console.log(`  Found: ${brand} ${model} with ${imageUrls.length} images`);

    return {
      brand: brand || "Unknown",
      model: model || productName,
      imageUrls,
      releaseYear,
    };
  }

  /**
   * Scrape a complete shoe entry including downloading and processing images
   *
   * @param url - GOAT product page URL
   * @param outputDir - Directory to save processed images
   * @returns Complete ShoeEntry (without difficultyTier - set later)
   */
  async scrapeShoe(
    url: string,
    outputDir: string
  ): Promise<Omit<ShoeEntry, "difficultyTier" | "tierRationale" | "metadata">> {
    const data = await this.scrapeProductPage(url);

    // Generate unique ID
    const id = `goat-${slugify(data.brand)}-${slugify(data.model)}`;

    // Download and process images
    const images: ImageMetadata[] = [];
    for (let i = 0; i < data.imageUrls.length; i++) {
      const imageUrl = data.imageUrls[i];
      const angle = inferImageAngle(imageUrl, i);
      const filename = `${id}-${angle}-${i}.jpg`;
      const outputPath = `${outputDir}/${filename}`;

      try {
        console.log(`  Downloading image ${i + 1}/${data.imageUrls.length}...`);
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
        console.warn(
          `  Failed to download image ${imageUrl}: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    if (images.length === 0) {
      throw new Error(`Failed to download any images for ${url}`);
    }

    return {
      id,
      brand: data.brand,
      model: data.model,
      releaseYear: data.releaseYear,
      images,
      provenance: {
        source: "goat",
        scrapedAt: new Date().toISOString(),
        sourceUrl: url,
        scraperVersion: this.scraperVersion,
      },
    };
  }

  /**
   * Scrape multiple shoes from a list of URLs
   *
   * @param urls - Array of GOAT product page URLs
   * @param outputDir - Directory to save processed images
   * @returns Array of scraped ShoeEntry objects
   */
  async scrapeMultiple(
    urls: string[],
    outputDir: string
  ): Promise<Omit<ShoeEntry, "difficultyTier" | "tierRationale" | "metadata">[]> {
    const results: Omit<
      ShoeEntry,
      "difficultyTier" | "tierRationale" | "metadata"
    >[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n[${i + 1}/${urls.length}] Scraping: ${url}`);

      try {
        const shoe = await this.scrapeShoe(url, outputDir);
        results.push(shoe);
        console.log(`  Success: ${shoe.brand} ${shoe.model}`);
      } catch (error) {
        console.error(
          `  Failed: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    console.log(`\nCompleted: ${results.length}/${urls.length} shoes scraped`);
    return results;
  }
}

/**
 * Convenience function to scrape GOAT shoes
 *
 * @param urls - Array of GOAT product page URLs
 * @param outputDir - Directory to save processed images
 * @returns Array of scraped ShoeEntry objects
 */
export async function scrapeGOAT(
  urls: string[],
  outputDir: string
): Promise<Omit<ShoeEntry, "difficultyTier" | "tierRationale" | "metadata">[]> {
  const scraper = new GOATScraper();
  return scraper.scrapeMultiple(urls, outputDir);
}

// Main function for testing
async function main() {
  const urlsPath = new URL("../shoe-urls/goat-urls.json", import.meta.url);

  try {
    const urlsFile = Bun.file(urlsPath);
    const urlsData = await urlsFile.json();
    const urls = urlsData.urls.map(
      (entry: { url: string }) => entry.url
    ) as string[];

    console.log(`Loaded ${urls.length} URLs from goat-urls.json`);
    console.log("Testing with first 3 URLs...\n");

    const outputDir = new URL("../images/goat", import.meta.url).pathname;
    const testUrls = urls.slice(0, 3);

    const results = await scrapeGOAT(testUrls, outputDir);

    console.log("\n=== Results ===");
    for (const shoe of results) {
      console.log(`- ${shoe.brand} ${shoe.model}: ${shoe.images.length} images`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("No such file or directory")
    ) {
      console.log("No goat-urls.json found. Create it first with shoe URLs.");
    } else {
      throw error;
    }
  }
}

// Run main if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
