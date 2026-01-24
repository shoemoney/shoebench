#!/usr/bin/env node
/**
 * Shoe Image Downloader using Puppeteer
 * Downloads images from StockX, GOAT, and Farfetch for the ShoeBench catalog
 */

import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, '../catalog.json');
const IMAGES_BASE = resolve(__dirname, '../images');

// Configuration
const CONFIG = {
  rateLimit: 3, // requests per minute per source
  pageTimeout: 30000, // 30 seconds
  baseViewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  outputSize: 1024,
  jpegQuality: 90,
};

// Source-specific image selectors
const IMAGE_SELECTORS = {
  stockx: [
    'img[data-testid="product-image"]',
    '.ProductImage img',
    'img[alt*="Product Image"]',
    '.product-media img',
    'picture source',
    'img[src*="stockx-assets"]',
    'img[src*="stockx"]',
  ],
  goat: [
    '.ProductImageCarousel img',
    '[data-testid="pdp-image"]',
    '.product-image img',
    'img[alt*="Product"]',
    'picture img',
    'img[src*="goat"]',
  ],
  farfetch: [
    '.ProductImages img',
    'picture source[srcset]',
    '[data-testid="product-image"]',
    'img[data-component="ProductGalleryImageZoom"]',
    'img[alt*="product"]',
    'picture img',
    'img[src*="farfetch"]',
  ],
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: null,
    limit: Infinity,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Load catalog
function loadCatalog() {
  const data = readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(data);
}

// Save catalog
function saveCatalog(catalog) {
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
}

// Get random delay between min and max seconds
function randomDelay(minSec, maxSec) {
  const ms = (minSec + Math.random() * (maxSec - minSec)) * 1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get viewport with jitter
function getViewportWithJitter() {
  const jitter = Math.floor(Math.random() * 100) - 50; // +/- 50px
  return {
    width: CONFIG.baseViewport.width + jitter,
    height: CONFIG.baseViewport.height + jitter,
  };
}

// Simulate human-like mouse movement
async function humanMouseMove(page) {
  const x = 100 + Math.random() * 800;
  const y = 100 + Math.random() * 600;
  await page.mouse.move(x, y, { steps: 10 });
  await randomDelay(0.1, 0.3);
}

// Extract best image URL from page
async function extractImageUrl(page, source) {
  const selectors = IMAGE_SELECTORS[source] || [];

  for (const selector of selectors) {
    try {
      const imgUrl = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        // Try srcset first (usually has highest resolution)
        if (element.srcset) {
          const srcsetParts = element.srcset.split(',').map(s => s.trim());
          // Get the largest one (last in srcset usually)
          const largest = srcsetParts[srcsetParts.length - 1];
          if (largest) {
            const url = largest.split(' ')[0];
            if (url && url.startsWith('http')) return url;
          }
        }

        // Try data-src (lazy loaded images)
        if (element.dataset && element.dataset.src) {
          const dataSrc = element.dataset.src;
          if (dataSrc.startsWith('http')) return dataSrc;
        }

        // Try regular src
        if (element.src && element.src.startsWith('http')) {
          return element.src;
        }

        // For picture elements, try to get source
        if (element.tagName === 'SOURCE' && element.srcset) {
          const url = element.srcset.split(',')[0].split(' ')[0];
          if (url && url.startsWith('http')) return url;
        }

        return null;
      }, selector);

      if (imgUrl) {
        console.log(`  Found image with selector: ${selector}`);
        return imgUrl;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // Fallback: Try to find any large product image
  const fallbackUrl = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    for (const img of images) {
      const src = img.src || img.dataset?.src;
      if (src && (src.includes('product') || src.includes('shoe') || img.width > 400)) {
        return src;
      }
    }
    return null;
  });

  return fallbackUrl;
}

// Download and process image
async function downloadAndProcessImage(page, imageUrl, localPath) {
  // Create directory if needed
  const dir = dirname(localPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    // Use page's session to download (preserves cookies)
    const response = await page.goto(imageUrl, {
      waitUntil: 'networkidle0',
      timeout: CONFIG.pageTimeout
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load image: ${response?.status()}`);
    }

    const buffer = await response.buffer();

    // Process with Sharp: resize to 1024x1024 with white background
    await sharp(buffer)
      .resize(CONFIG.outputSize, CONFIG.outputSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: CONFIG.jpegQuality })
      .toFile(localPath);

    const stats = statSync(localPath);
    return stats.size;
  } catch (error) {
    console.error(`  Error downloading image: ${error.message}`);
    return 0;
  }
}

// Take screenshot of product area as fallback
async function screenshotFallback(page, localPath, source) {
  const dir = dirname(localPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    // Try to find and screenshot the product image area
    const selectors = IMAGE_SELECTORS[source] || [];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const tempPath = localPath.replace('.jpg', '-temp.png');
          await element.screenshot({ path: tempPath });

          // Process with Sharp
          await sharp(tempPath)
            .resize(CONFIG.outputSize, CONFIG.outputSize, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: CONFIG.jpegQuality })
            .toFile(localPath);

          // Clean up temp file
          try { require('fs').unlinkSync(tempPath); } catch {}

          const stats = statSync(localPath);
          console.log(`  Used screenshot fallback (${selector})`);
          return stats.size;
        }
      } catch {}
    }

    // Full page screenshot crop as last resort
    const tempPath = localPath.replace('.jpg', '-temp.png');
    await page.screenshot({
      path: tempPath,
      clip: { x: 0, y: 0, width: 800, height: 800 }
    });

    await sharp(tempPath)
      .resize(CONFIG.outputSize, CONFIG.outputSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ quality: CONFIG.jpegQuality })
      .toFile(localPath);

    try { require('fs').unlinkSync(tempPath); } catch {}

    const stats = statSync(localPath);
    console.log(`  Used full page screenshot fallback`);
    return stats.size;
  } catch (error) {
    console.error(`  Screenshot fallback failed: ${error.message}`);
    return 0;
  }
}

// Process a single catalog entry
async function processEntry(browser, entry, dryRun) {
  const source = entry.provenance.source;
  const sourceUrl = entry.provenance.sourceUrl;
  const localPath = resolve(__dirname, '..', '..', entry.images[0].localPath);

  console.log(`\nProcessing: ${entry.id}`);
  console.log(`  URL: ${sourceUrl}`);
  console.log(`  Local: ${localPath}`);

  // Check if already downloaded
  if (existsSync(localPath)) {
    const stats = statSync(localPath);
    if (stats.size > 10000) { // > 10KB is likely a real image
      console.log(`  Skipping: Already downloaded (${stats.size} bytes)`);
      return { success: true, skipped: true, sizeBytes: stats.size };
    }
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would download from ${sourceUrl}`);
    return { success: true, skipped: false, sizeBytes: 0, dryRun: true };
  }

  const page = await browser.newPage();

  try {
    // Set up stealth settings
    await page.setViewport(getViewportWithJitter());
    await page.setUserAgent(CONFIG.userAgent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Disable webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Navigate to page
    console.log(`  Loading page...`);
    await page.goto(sourceUrl, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.pageTimeout
    });

    // Human-like behavior
    await humanMouseMove(page);
    await randomDelay(1, 2);

    // Extract image URL
    const imageUrl = await extractImageUrl(page, source);

    let sizeBytes = 0;

    if (imageUrl) {
      console.log(`  Found image: ${imageUrl.substring(0, 80)}...`);

      // Download the image directly
      sizeBytes = await downloadAndProcessImage(page, imageUrl, localPath);
    }

    // Fallback to screenshot if direct download failed
    if (sizeBytes === 0) {
      console.log(`  Trying screenshot fallback...`);
      // Re-navigate to source page first
      await page.goto(sourceUrl, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.pageTimeout
      });
      await randomDelay(1, 2);
      sizeBytes = await screenshotFallback(page, localPath, source);
    }

    if (sizeBytes > 0) {
      console.log(`  Success: ${sizeBytes} bytes`);
      return { success: true, skipped: false, sizeBytes, imageUrl };
    } else {
      console.log(`  Failed: Could not download or screenshot`);
      return { success: false, skipped: false, sizeBytes: 0 };
    }

  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { success: false, skipped: false, sizeBytes: 0, error: error.message };
  } finally {
    await page.close();
  }
}

// Main execution
async function main() {
  const options = parseArgs();
  console.log('ShoeBench Image Downloader');
  console.log('==========================');
  console.log(`Options: ${JSON.stringify(options)}`);

  // Load catalog
  const catalog = loadCatalog();
  console.log(`\nLoaded catalog with ${catalog.shoes.length} entries`);

  // Filter entries
  let entries = catalog.shoes.filter(entry => {
    // Filter by source if specified
    if (options.source && entry.provenance.source !== options.source) {
      return false;
    }
    return true;
  });

  // Apply limit
  if (options.limit < entries.length) {
    entries = entries.slice(0, options.limit);
  }

  console.log(`Processing ${entries.length} entries`);

  if (options.dryRun) {
    console.log('\n[DRY RUN MODE - No downloads will occur]');
    for (const entry of entries) {
      console.log(`\nWould process: ${entry.id}`);
      console.log(`  Source: ${entry.provenance.source}`);
      console.log(`  URL: ${entry.provenance.sourceUrl}`);
      console.log(`  Local: ${entry.images[0].localPath}`);
    }
    console.log(`\nDry run complete. Would process ${entries.length} entries.`);
    return;
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  const stats = {
    total: entries.length,
    success: 0,
    skipped: 0,
    failed: 0,
  };

  const delayBetweenRequests = 60000 / CONFIG.rateLimit; // ms between requests

  try {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      console.log(`\n[${i + 1}/${entries.length}]`);
      const result = await processEntry(browser, entry, options.dryRun);

      if (result.success) {
        if (result.skipped) {
          stats.skipped++;
        } else {
          stats.success++;
        }

        // Update catalog entry
        entry.images[0].sizeBytes = result.sizeBytes;
        entry.images[0].status = result.sizeBytes > 0 ? 'downloaded' : 'placeholder';
        if (result.imageUrl) {
          entry.images[0].url = result.imageUrl;
        }
      } else {
        stats.failed++;
      }

      // Save progress every 10 images
      if ((i + 1) % 10 === 0) {
        console.log('\nSaving progress...');
        saveCatalog(catalog);
      }

      // Rate limiting delay (skip if this was the last entry)
      if (i < entries.length - 1) {
        const jitteredDelay = delayBetweenRequests + (Math.random() * 5000 - 2500);
        console.log(`  Waiting ${Math.round(jitteredDelay / 1000)}s before next request...`);
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    // Final save
    console.log('\nSaving final catalog...');
    saveCatalog(catalog);

  } finally {
    await browser.close();
  }

  console.log('\n==========================');
  console.log('Download Complete');
  console.log(`Total: ${stats.total}`);
  console.log(`Success: ${stats.success}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
