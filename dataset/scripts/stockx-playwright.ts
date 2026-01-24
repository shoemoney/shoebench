/**
 * StockX Image Downloader using Playwright
 *
 * Uses headless browser to bypass anti-bot protection and download
 * actual product images from StockX.
 */

import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const CATALOG_PATH = join(dirname(import.meta.dir), 'catalog.json');
const IMAGES_BASE = join(dirname(import.meta.dir), 'images', 'stockx');

// Rate limiting - 3 requests per minute (20 seconds between)
const DELAY_MS = 20000;

interface CatalogEntry {
  id: string;
  brand: string;
  model: string;
  images: Array<{
    url: string;
    localPath: string;
    angle: string;
    width: number;
    height: number;
    sizeBytes: number;
    status: string;
  }>;
  provenance: {
    source: string;
    sourceUrl: string;
    scrapedAt: string;
    scraperVersion: string;
  };
}

interface Catalog {
  version: string;
  createdAt: string;
  totalShoes: number;
  brandDistribution: Record<string, number>;
  shoes: CatalogEntry[];
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractStockXImage(page: Page, url: string): Promise<string | null> {
  try {
    console.log(`  Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for product image to load
    await page.waitForSelector('img', { timeout: 10000 });

    // Try multiple selectors for the main product image
    const selectors = [
      'img[data-testid="product-primary-image"]',
      'img[data-component-type="ProductImageCarousel"]',
      '.product-primary-image img',
      '[data-testid="ProductDetailsCarousel"] img',
      '.ProductImage img',
      'main img[src*="stockx"]',
      'main img[src*="images.stockx"]',
    ];

    for (const selector of selectors) {
      const img = await page.$(selector);
      if (img) {
        const src = await img.getAttribute('src');
        if (src && src.includes('http')) {
          console.log(`  Found image with selector: ${selector}`);
          return src;
        }
      }
    }

    // Fallback: Find any large image that looks like a product image
    const images = await page.$$('img');
    for (const img of images) {
      const src = await img.getAttribute('src');
      const width = await img.evaluate(el => el.naturalWidth);
      if (src && width > 300 && (src.includes('stockx') || src.includes('images.stockx'))) {
        console.log(`  Found image via fallback (width: ${width})`);
        return src;
      }
    }

    console.log('  No suitable image found');
    return null;
  } catch (error) {
    console.error(`  Error extracting image: ${error}`);
    return null;
  }
}

async function downloadAndProcessImage(
  imageUrl: string,
  outputPath: string
): Promise<{ sizeBytes: number; width: number; height: number } | null> {
  try {
    console.log(`  Downloading: ${imageUrl.substring(0, 80)}...`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`  Download failed: ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Ensure output directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Process with Sharp - resize to 1024x1024 with white background
    await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    const stats = statSync(outputPath);
    console.log(`  Saved: ${outputPath} (${stats.size} bytes)`);

    return {
      sizeBytes: stats.size,
      width: 1024,
      height: 1024
    };
  } catch (error) {
    console.error(`  Error processing image: ${error}`);
    return null;
  }
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
  const dryRun = args.includes('--dry-run');

  console.log('StockX Image Downloader (Playwright)');
  console.log('=====================================\n');

  // Load catalog
  const catalog: Catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

  // Filter to StockX entries that need images
  const stockxShoes = catalog.shoes.filter(s =>
    s.provenance.source === 'stockx' &&
    s.images[0].status === 'placeholder'
  );

  const toProcess = stockxShoes.slice(0, limit);
  console.log(`Found ${stockxShoes.length} StockX shoes to download`);
  console.log(`Processing ${toProcess.length} (limit: ${limit === Infinity ? 'none' : limit})`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would download:');
    toProcess.forEach(s => console.log(`  - ${s.brand} ${s.model}`));
    return;
  }

  // Ensure images directory exists
  if (!existsSync(IMAGES_BASE)) {
    mkdirSync(IMAGES_BASE, { recursive: true });
  }

  // Launch browser with stealth settings
  console.log('\nLaunching browser...');
  const browser: Browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  const page: Page = await context.newPage();

  // Download images
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const shoe = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] ${shoe.brand} ${shoe.model}`);

    const imageUrl = await extractStockXImage(page, shoe.provenance.sourceUrl);

    if (imageUrl) {
      // Generate output filename
      const filename = `${shoe.id.replace('stockx-', '')}.jpg`;
      const outputPath = join(IMAGES_BASE, filename);

      const result = await downloadAndProcessImage(imageUrl, outputPath);

      if (result) {
        // Update catalog entry
        const catalogIndex = catalog.shoes.findIndex(s => s.id === shoe.id);
        if (catalogIndex !== -1) {
          catalog.shoes[catalogIndex].images[0] = {
            ...catalog.shoes[catalogIndex].images[0],
            url: imageUrl,
            localPath: `dataset/images/stockx/${filename}`,
            status: 'downloaded',
            sizeBytes: result.sizeBytes,
            width: result.width,
            height: result.height
          };
        }
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }

    // Save progress every 5 images
    if ((i + 1) % 5 === 0) {
      console.log('\n  [Saving progress...]');
      writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    }

    // Rate limiting
    if (i < toProcess.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s before next request...`);
      await delay(DELAY_MS);
    }
  }

  // Final save
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  await browser.close();

  console.log('\n=====================================');
  console.log(`Complete: ${successCount} success, ${failCount} failed`);
  console.log(`Catalog updated: ${CATALOG_PATH}`);
}

main().catch(console.error);
