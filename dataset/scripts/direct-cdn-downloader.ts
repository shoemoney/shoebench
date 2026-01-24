/**
 * Direct CDN Image Downloader
 *
 * Downloads shoe images directly from CDN URLs constructed from product slugs.
 * StockX, GOAT, and Farfetch all serve images from CDNs that can be accessed directly.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const CATALOG_PATH = join(dirname(import.meta.dir), 'catalog.json');

// Rate limiting - 5 seconds between requests
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

function extractSlug(url: string): string {
  // Extract the product slug from the URL
  // StockX: https://stockx.com/air-jordan-1-retro-high-og-chicago -> air-jordan-1-retro-high-og-chicago
  // GOAT: https://www.goat.com/sneakers/dunk-low-sb-court-purple-bq6817-500 -> dunk-low-sb-court-purple-bq6817-500
  // Farfetch: https://www.farfetch.com/shopping/men/gucci-ace-sneakers-item-12345678.aspx -> gucci-ace-sneakers
  const parts = url.split('/');
  let slug = parts[parts.length - 1] || parts[parts.length - 2];
  slug = slug.replace('.aspx', '').replace(/item-\d+/, '');
  return slug;
}

function toTitleCase(str: string): string {
  // Convert "air jordan 1 retro high og chicago" to "Air-Jordan-1-Retro-High-OG-Chicago"
  return str
    .split(/[\s-]+/)
    .map(word => {
      // Keep certain words uppercase
      if (['OG', 'UNC', 'CDG', 'RS', 'V2'].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('-');
}

function buildCdnUrl(source: string, slug: string, brand?: string, model?: string): string[] {
  // Return array of possible CDN URLs to try
  switch (source) {
    case 'stockx':
      // Build from brand + model in title case (working pattern!)
      const titleCaseUrls: string[] = [];
      if (brand && model) {
        const fullName = toTitleCase(`${brand} ${model}`);
        const modelOnly = toTitleCase(model);
        titleCaseUrls.push(
          `https://images.stockx.com/images/${fullName}-Product.jpg`,
          `https://images.stockx.com/images/${modelOnly}-Product.jpg`,
        );
      }
      // Also try slug-based patterns
      const slugTitleCase = toTitleCase(slug.replace(/-/g, ' '));
      return [
        ...titleCaseUrls,
        `https://images.stockx.com/images/${slugTitleCase}-Product.jpg`,
        `https://images.stockx.com/images/${slug}.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=0`,
      ];
    case 'goat':
      return [
        // GOAT CDN patterns
        `https://image.goat.com/transform/v1/attachments/product_template_pictures/images/0/${slug}/original.png`,
        `https://cdn.goat.com/images/w_600/product_templates/${slug}.png`,
      ];
    case 'farfetch':
      return [
        // Farfetch CDN patterns
        `https://cdn-images.farfetch-contents.com/15/09/76/92/15097692_26026850_1000.jpg`,
      ];
    default:
      return [];
  }
}

async function downloadAndProcessImage(
  imageUrl: string,
  outputPath: string
): Promise<{ sizeBytes: number; width: number; height: number; actualUrl: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Referer': 'https://stockx.com/'
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('image')) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Verify it's actually an image
    if (buffer.length < 1000) {
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

    return {
      sizeBytes: stats.size,
      width: 1024,
      height: 1024,
      actualUrl: imageUrl
    };
  } catch (error) {
    return null;
  }
}

async function tryDownloadFromCdn(
  source: string,
  slug: string,
  outputPath: string,
  brand?: string,
  model?: string
): Promise<{ sizeBytes: number; width: number; height: number; actualUrl: string } | null> {
  const urls = buildCdnUrl(source, slug, brand, model);

  for (const url of urls) {
    console.log(`  Trying: ${url.substring(0, 80)}...`);
    const result = await downloadAndProcessImage(url, outputPath);
    if (result) {
      console.log(`  ✓ Success!`);
      return result;
    }
  }

  return null;
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
  const sourceArg = args.find(a => a.startsWith('--source='));
  const source = sourceArg ? sourceArg.split('=')[1] : null;
  const dryRun = args.includes('--dry-run');

  console.log('Direct CDN Image Downloader');
  console.log('============================\n');

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
    console.log('\n[DRY RUN] Would try:');
    toProcess.forEach(s => {
      const slug = extractSlug(s.provenance.sourceUrl);
      console.log(`  - ${s.brand} ${s.model} -> ${slug}`);
    });
    return;
  }

  // Process each shoe
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const shoe = toProcess[i];
    const slug = extractSlug(shoe.provenance.sourceUrl);
    console.log(`\n[${i + 1}/${toProcess.length}] ${shoe.brand} ${shoe.model}`);
    console.log(`  Slug: ${slug}`);

    // Generate output filename based on source
    const sourceDir = shoe.provenance.source;
    const filename = `${shoe.id.replace(`${sourceDir}-`, '')}.jpg`;
    const outputDir = join(dirname(import.meta.dir), 'images', sourceDir);
    const outputPath = join(outputDir, filename);

    const result = await tryDownloadFromCdn(sourceDir, slug, outputPath, shoe.brand, shoe.model);

    if (result) {
      // Update catalog entry
      const catalogIndex = catalog.shoes.findIndex(s => s.id === shoe.id);
      if (catalogIndex !== -1) {
        catalog.shoes[catalogIndex].images[0] = {
          ...catalog.shoes[catalogIndex].images[0],
          url: result.actualUrl,
          localPath: `dataset/images/${sourceDir}/${filename}`,
          status: 'downloaded',
          sizeBytes: result.sizeBytes,
          width: result.width,
          height: result.height
        };
      }
      successCount++;
    } else {
      console.log(`  ✗ All CDN URLs failed`);
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

  console.log('\n============================');
  console.log(`Complete: ${successCount} success, ${failCount} failed`);
  console.log(`Catalog updated: ${CATALOG_PATH}`);
}

main().catch(console.error);
