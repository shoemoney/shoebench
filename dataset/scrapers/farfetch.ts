/**
 * Farfetch luxury shoe scraper
 *
 * Extracts designer shoe data from Farfetch product pages.
 * Covers luxury brands: Gucci, Balenciaga, Louboutin, Prada, etc.
 */

import * as cheerio from "cheerio";
import { SiteScraperBase } from "../utils/rate-limiter";
import { downloadAndProcessImage } from "../utils/image-processor";
import type { ShoeEntry, ImageMetadata } from "../schema";

/**
 * Farfetch-specific rate limiting configuration
 * Lower rate limit due to stricter anti-bot measures
 */
const FARFETCH_CONFIG = {
  requestsPerMinute: 6,
  randomDelayMs: [3000, 6000] as [number, number],
};

/**
 * Scraper for Farfetch luxury shoe product pages
 */
export class FarfetchScraper extends SiteScraperBase {
  private scraperVersion = "1.0.0";

  constructor() {
    super(FARFETCH_CONFIG);
  }

  /**
   * Scrape product page data without downloading images
   *
   * @param url - Farfetch product page URL
   * @returns Partial shoe entry with brand, model, and image URLs
   */
  async scrapeProductPage(url: string): Promise<{
    brand: string;
    model: string;
    imageUrls: string[];
  }> {
    const html = await this.fetchWithRateLimit(url);
    const $ = cheerio.load(html);

    // Extract brand/designer name
    // Farfetch typically shows designer in the product title or dedicated element
    const brand = this.extractBrand($);
    const model = this.extractModel($);
    const imageUrls = this.extractImageUrls($);

    if (!brand) {
      throw new Error(`Could not extract brand from ${url}`);
    }

    if (!model) {
      throw new Error(`Could not extract model from ${url}`);
    }

    if (imageUrls.length === 0) {
      throw new Error(`Could not extract images from ${url}`);
    }

    return { brand, model, imageUrls };
  }

  /**
   * Extract brand/designer name from page
   */
  private extractBrand($: cheerio.CheerioAPI): string {
    // Try multiple selectors - Farfetch structure varies
    const selectors = [
      // Common brand selectors
      '[data-component="ProductDesignerName"]',
      '[data-testid="product-designer-name"]',
      'a[data-component="DesignerLink"]',
      ".ltr-4y8w0i", // Designer name class
      'h1 a[href*="/shopping/"]', // Brand link in title
      '[itemprop="brand"] [itemprop="name"]',
      // JSON-LD structured data
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text && text.length > 0 && text.length < 100) {
          return text;
        }
      }
    }

    // Try JSON-LD structured data
    const jsonLd = this.extractJsonLd($);
    if (jsonLd?.brand?.name) {
      return jsonLd.brand.name;
    }

    return "";
  }

  /**
   * Extract product model name from page
   */
  private extractModel($: cheerio.CheerioAPI): string {
    const selectors = [
      '[data-component="ProductName"]',
      '[data-testid="product-name"]',
      'h1[data-component="ProductTitle"]',
      ".ltr-1l82qx2", // Product name class
      '[itemprop="name"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        // Avoid picking up brand name again
        if (text && text.length > 0 && text.length < 200) {
          return text;
        }
      }
    }

    // Try JSON-LD structured data
    const jsonLd = this.extractJsonLd($);
    if (jsonLd?.name) {
      return jsonLd.name;
    }

    return "";
  }

  /**
   * Extract product image URLs
   */
  private extractImageUrls($: cheerio.CheerioAPI): string[] {
    const urls: Set<string> = new Set();

    // Try multiple image selectors
    const selectors = [
      'img[data-component="ProductImage"]',
      '[data-testid="product-gallery"] img',
      'picture source[srcset]',
      'img[src*="cdn.farfetch.net"]',
      'img[src*="images.farfetch.com"]',
      '[data-component="ProductGallery"] img',
    ];

    for (const selector of selectors) {
      $(selector).each((_, elem) => {
        const src = $(elem).attr("src");
        const srcset = $(elem).attr("srcset");

        if (src && this.isValidImageUrl(src)) {
          urls.add(this.normalizeImageUrl(src));
        }

        if (srcset) {
          // Parse srcset and get highest resolution
          const srcsetUrls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
          for (const url of srcsetUrls) {
            if (this.isValidImageUrl(url)) {
              urls.add(this.normalizeImageUrl(url));
            }
          }
        }
      });
    }

    // Also check JSON-LD for images
    const jsonLd = this.extractJsonLd($);
    if (jsonLd?.image) {
      const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
      for (const img of images) {
        const imgUrl = typeof img === "string" ? img : img?.url;
        if (imgUrl && this.isValidImageUrl(imgUrl)) {
          urls.add(this.normalizeImageUrl(imgUrl));
        }
      }
    }

    return Array.from(urls).slice(0, 5); // Limit to 5 images
  }

  /**
   * Extract JSON-LD structured data from page
   */
  private extractJsonLd($: cheerio.CheerioAPI): any {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const content = $(scripts[i]).html();
        if (content) {
          const data = JSON.parse(content);
          // Look for Product schema
          if (data["@type"] === "Product") {
            return data;
          }
          // Check for array of schemas
          if (Array.isArray(data)) {
            const product = data.find((d) => d["@type"] === "Product");
            if (product) return product;
          }
        }
      }
    } catch {
      // JSON parsing failed, return null
    }
    return null;
  }

  /**
   * Check if URL is a valid product image
   */
  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      (lower.includes("farfetch") || lower.startsWith("https://")) &&
      (lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.includes("/images/") ||
        lower.includes("cdn."))
    );
  }

  /**
   * Normalize image URL to highest resolution
   */
  private normalizeImageUrl(url: string): string {
    // Remove width/height parameters to get full resolution
    let normalized = url.replace(/\?.*$/, "");
    // Ensure HTTPS
    if (normalized.startsWith("//")) {
      normalized = "https:" + normalized;
    }
    return normalized;
  }

  /**
   * Create URL-safe slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  /**
   * Determine image angle from index (heuristic)
   */
  private getImageAngle(index: number): ImageMetadata["angle"] {
    const angles: ImageMetadata["angle"][] = ["side", "three-quarter", "top", "back"];
    return angles[index % angles.length];
  }

  /**
   * Scrape a single shoe, including downloading and processing images
   *
   * @param url - Farfetch product page URL
   * @param outputDir - Directory to save processed images
   * @returns Complete ShoeEntry (without difficultyTier)
   */
  async scrapeShoe(
    url: string,
    outputDir: string
  ): Promise<Omit<ShoeEntry, "difficultyTier" | "tierRationale">> {
    const { brand, model, imageUrls } = await this.scrapeProductPage(url);

    const brandSlug = this.slugify(brand);
    const modelSlug = this.slugify(model);
    const id = `farfetch-${brandSlug}-${modelSlug}`;

    const images: ImageMetadata[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const angle = this.getImageAngle(i);
      const filename = `${id}-${angle}-${i}.jpg`;
      const localPath = `${outputDir}/${filename}`;

      try {
        const result = await downloadAndProcessImage(imageUrl, localPath);
        images.push({
          url: imageUrl,
          localPath,
          angle,
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
        });
        console.log(`  Downloaded: ${filename}`);
      } catch (error) {
        console.warn(`  Failed to download image ${i}: ${error}`);
      }
    }

    if (images.length === 0) {
      throw new Error(`No images could be downloaded for ${url}`);
    }

    return {
      id,
      brand,
      model,
      images,
      provenance: {
        source: 'farfetch',
        scrapedAt: new Date().toISOString(),
        sourceUrl: url,
        scraperVersion: this.scraperVersion,
      },
      metadata: {
        isIconic: false, // Will be determined during tier assignment
        brandingVisibility: "medium", // Default, will be adjusted
      },
    };
  }

  /**
   * Scrape multiple shoes from a list of URLs
   *
   * @param urls - Array of Farfetch product page URLs
   * @param outputDir - Directory to save processed images
   * @returns Array of scraped ShoeEntry objects
   */
  async scrapeMultiple(
    urls: string[],
    outputDir: string
  ): Promise<Array<Omit<ShoeEntry, "difficultyTier" | "tierRationale">>> {
    const results: Array<Omit<ShoeEntry, "difficultyTier" | "tierRationale">> = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\nScraping ${i + 1}/${urls.length}: ${url}`);

      try {
        const shoe = await this.scrapeShoe(url, outputDir);
        results.push(shoe);
        console.log(`  Success: ${shoe.brand} ${shoe.model}`);
      } catch (error) {
        console.error(`  Failed: ${error}`);
      }
    }

    return results;
  }
}

/**
 * Convenience function to scrape Farfetch shoes
 *
 * @param urls - Array of Farfetch product page URLs
 * @param outputDir - Directory to save processed images
 * @returns Array of scraped ShoeEntry objects
 */
export async function scrapeFarfetch(
  urls: string[],
  outputDir: string
): Promise<Array<Omit<ShoeEntry, "difficultyTier" | "tierRationale">>> {
  const scraper = new FarfetchScraper();
  return scraper.scrapeMultiple(urls, outputDir);
}

/**
 * URL list entry with expected values for validation
 */
interface FarfetchUrl {
  url: string;
  expectedBrand: string;
  expectedModel: string;
}

/**
 * Main function for testing the scraper
 */
async function main() {
  const urlsPath = new URL("../shoe-urls/farfetch-urls.json", import.meta.url).pathname;
  const outputDir = new URL("../images/farfetch", import.meta.url).pathname;

  let urlData: { urls: FarfetchUrl[] };
  try {
    const file = Bun.file(urlsPath);
    urlData = await file.json();
  } catch (error) {
    console.error(`Failed to load URLs from ${urlsPath}:`, error);
    console.log("\nPlease create farfetch-urls.json with Farfetch product URLs.");
    return;
  }

  console.log(`Loaded ${urlData.urls.length} URLs from ${urlsPath}`);
  console.log(`Output directory: ${outputDir}`);

  // Test with first 3 URLs only
  const testUrls = urlData.urls.slice(0, 3).map((u) => u.url);
  console.log(`\nTesting with first 3 URLs...`);

  const scraper = new FarfetchScraper();
  const results = await scraper.scrapeMultiple(testUrls, outputDir);

  console.log(`\n--- Results ---`);
  console.log(`Successfully scraped: ${results.length}/${testUrls.length}`);

  for (const shoe of results) {
    console.log(`\n${shoe.brand} - ${shoe.model}`);
    console.log(`  ID: ${shoe.id}`);
    console.log(`  Images: ${shoe.images.length}`);
    console.log(`  Source: ${shoe.provenance.sourceUrl}`);
  }
}

// Run main when executed directly
if (import.meta.main) {
  main().catch(console.error);
}
