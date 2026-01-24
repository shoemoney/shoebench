/**
 * eBay Image Downloader
 *
 * Searches eBay for each shoe (brand + model) and downloads product images.
 * eBay has extensive shoe listings and good product photography.
 */

import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const CATALOG_PATH = join(dirname(import.meta.dir), 'catalog.json');

// Rate limiting - 5 seconds between searches
const DELAY_MS = 5000;

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

async function searchEbayImages(page: Page, brand: string, model: string): Promise<string | null> {
  try {
    const query = `${brand} ${model} shoes`;
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=93427&LH_BIN=1`;
    console.log(`  Searching eBay: "${query}"`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);

    // Try to find product listing images
    // eBay uses s-l500.jpg, s-l1600.jpg etc. for different sizes
    const listings = await page.$$('.s-item__image-wrapper img');

    for (const listing of listings.slice(0, 5)) {
      let src = await listing.getAttribute('src');
      if (!src || src.includes('ir.ebaystatic')) continue;

      // Upgrade to larger image if possible
      if (src.includes('s-l')) {
        src = src.replace(/s-l\d+/, 's-l1600');
      }

      // Skip placeholder images
      if (src.includes('thumbs') || src.length < 30) continue;

      console.log(`  Found eBay listing image`);
      return src;
    }

    // Alternative: Look for images in results
    const allImages = await page.$$eval('img', (imgs) => {
      return (imgs as HTMLImageElement[])
        .filter(img => {
          const src = img.src || '';
          return src.includes('ebayimg.com') &&
                 !src.includes('ebaystatic') &&
                 src.length > 50;
        })
        .map(img => img.src);
    });

    for (const imgSrc of allImages.slice(0, 10)) {
      // Upgrade to 1600px version
      const largeSrc = imgSrc.replace(/s-l\d+/, 's-l1600');
      console.log(`  Using eBay fallback image`);
      return largeSrc;
    }

    console.log('  No suitable eBay image found');
    return null;
  } catch (error) {
    console.error(`  Error searching eBay: ${error}`);
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*'
      }
    });

    if (!response.ok) {
      console.log(`  Download failed: ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Verify it's an actual image (not tiny placeholder)
    if (buffer.length < 5000) {
      console.log(`  Image too small: ${buffer.length} bytes`);
      return null;
    }

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
    console.log(`  ✓ Saved: ${outputPath} (${stats.size} bytes)`);

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

  console.log('eBay Image Downloader');
  console.log('=====================\n');

  // Load catalog
  const catalog: Catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

  // Filter to entries that need images (placeholder or missing file)
  // localPath is "dataset/images/...", script is in dataset/scripts/
  const projectRoot = dirname(dirname(import.meta.dir));
  let shoesToProcess = catalog.shoes.filter(s => {
    const imagePath = join(projectRoot, s.images[0].localPath);
    const isMissing = !existsSync(imagePath);
    return s.images[0].status === 'placeholder' || isMissing;
  });

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
    console.log(`\n[${i + 1}/${toProcess.length}] ${shoe.brand} ${shoe.model}`);

    const imageUrl = await searchEbayImages(page, shoe.brand, shoe.model);

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

    // Save progress every 10 images
    if ((i + 1) % 10 === 0) {
      console.log('\n  [Saving progress...]');
      writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
    }

    // Rate limiting
    if (i < toProcess.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // Final save
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  await browser.close();

  console.log('\n=====================');
  console.log(`Complete: ${successCount} success, ${failCount} failed`);
  console.log(`Catalog updated: ${CATALOG_PATH}`);
}

main().catch(console.error);
