/**
 * Google Images Shoe Downloader
 *
 * Searches Google Images for each shoe (brand + model) and downloads
 * the best high-resolution product image.
 */

import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const CATALOG_PATH = join(dirname(import.meta.dir), 'catalog.json');

// Rate limiting - be respectful to Google (10 seconds between searches)
const DELAY_MS = 10000;

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

async function searchGoogleImages(page: Page, query: string): Promise<string | null> {
  try {
    // Build Google Images search URL for large images
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' shoe product')}&tbm=isch&tbs=isz:l`;
    console.log(`  Searching: "${query}"`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait a bit for images to start loading
    await delay(3000);

    // Click on first image result to get full-size URL
    const firstResult = await page.$('div[data-ri="0"]');
    if (firstResult) {
      await firstResult.click();
      await delay(3000); // Wait for side panel to load

      // Look for the full-size image in the side panel
      // The actual image shows up with class containing certain patterns
      const panelImg = await page.$('img.sFlh5c.pT0Scc.iPVvYb');
      if (panelImg) {
        const src = await panelImg.getAttribute('src');
        if (src && src.startsWith('http') && !src.includes('google.com')) {
          console.log(`  Found panel image`);
          return src;
        }
      }

      // Alternative: Look for large images in panel
      const panelImgs = await page.$$('div[jsname="CGzTgf"] img, div[jscontroller] img');
      for (const img of panelImgs) {
        const src = await img.getAttribute('src');
        if (src && src.startsWith('http') && !src.includes('google.com') && !src.includes('gstatic')) {
          console.log(`  Found panel fallback image`);
          return src;
        }
      }
    }

    // Fallback: Parse any image links we can find
    const allLinks = await page.$$eval('a[href*="imgurl="]', (anchors) => {
      return anchors.map(a => {
        const href = a.getAttribute('href') || '';
        const match = href.match(/imgurl=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : null;
      }).filter(Boolean);
    });

    if (allLinks.length > 0) {
      console.log(`  Using href fallback`);
      return allLinks[0] as string;
    }

    // Last resort: grab any external image
    const images = await page.$$eval('img', (imgs) => {
      return (imgs as HTMLImageElement[])
        .filter(img => img.src && img.src.startsWith('http') && !img.src.includes('google') && !img.src.includes('gstatic'))
        .map(img => img.src);
    });

    if (images.length > 0) {
      console.log(`  Using any external image`);
      return images[0];
    }

    console.log('  No suitable image found');
    return null;
  } catch (error) {
    console.error(`  Error searching: ${error}`);
    return null;
  }
}

async function downloadAndProcessImage(
  imageUrl: string,
  outputPath: string
): Promise<{ sizeBytes: number; width: number; height: number } | null> {
  try {
    console.log(`  Downloading: ${imageUrl.substring(0, 80)}...`);

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

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
  const sourceArg = args.find(a => a.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : null;
  const dryRun = args.includes('--dry-run');

  console.log('Google Images Shoe Downloader');
  console.log('==============================\n');

  // Load catalog
  const catalog: Catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

  // Filter to entries that need images
  let shoesToProcess = catalog.shoes.filter(s => s.images[0].status === 'placeholder');

  if (source) {
    shoesToProcess = shoesToProcess.filter(s => s.provenance.source === source);
    console.log(`Filtering to source: ${source}`);
  }

  const toProcess = shoesToProcess.slice(0, limit);
  console.log(`Found ${shoesToProcess.length} shoes needing images`);
  console.log(`Processing ${toProcess.length} (limit: ${limit === Infinity ? 'none' : limit})`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would download:');
    toProcess.forEach(s => console.log(`  - ${s.brand} ${s.model} (${s.provenance.source})`));
    return;
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  const page: Page = await context.newPage();

  // Process each shoe
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const shoe = toProcess[i];
    const searchQuery = `${shoe.brand} ${shoe.model}`;
    console.log(`\n[${i + 1}/${toProcess.length}] ${searchQuery}`);

    const imageUrl = await searchGoogleImages(page, searchQuery);

    if (imageUrl) {
      // Generate output filename based on source
      const sourceDir = shoe.provenance.source;
      const filename = `${shoe.id.replace(`${sourceDir}-`, '')}.jpg`;
      const outputDir = join(dirname(import.meta.dir), 'images', sourceDir);
      const outputPath = join(outputDir, filename);

      const result = await downloadAndProcessImage(imageUrl, outputPath);

      if (result) {
        // Update catalog entry
        const catalogIndex = catalog.shoes.findIndex(s => s.id === shoe.id);
        if (catalogIndex !== -1) {
          catalog.shoes[catalogIndex].images[0] = {
            ...catalog.shoes[catalogIndex].images[0],
            url: imageUrl,
            localPath: `dataset/images/${sourceDir}/${filename}`,
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
      console.log(`  Waiting ${DELAY_MS / 1000}s before next search...`);
      await delay(DELAY_MS);
    }
  }

  // Final save
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  await browser.close();

  console.log('\n==============================');
  console.log(`Complete: ${successCount} success, ${failCount} failed`);
  console.log(`Catalog updated: ${CATALOG_PATH}`);
}

main().catch(console.error);
