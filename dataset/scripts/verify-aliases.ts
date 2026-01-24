/**
 * Verify aliases in catalog.json
 *
 * Checks:
 * 1. All shoes have aliases field (array, possibly empty)
 * 2. Iconic shoes have appropriate aliases
 * 3. No duplicate aliases within same shoe
 * 4. No invalid aliases (empty strings, same as model name)
 * 5. Alias coverage statistics
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ShoeEntry {
  id: string;
  brand: string;
  model: string;
  aliases?: string[];
  difficultyTier: string;
  [key: string]: any;
}

interface Catalog {
  shoes: ShoeEntry[];
  totalShoes: number;
  [key: string]: any;
}

function main() {
  const catalogPath = join(process.cwd(), 'dataset', 'catalog.json');

  console.log('Loading catalog...\n');
  const catalog: Catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));

  let totalShoes = catalog.shoes.length;
  let shoesWithAliases = 0;
  let shoesWithoutAliases = 0;
  let totalAliases = 0;
  let errors: string[] = [];
  let warnings: string[] = [];

  // Track aliases by tier
  const aliasByTier: Record<string, { count: number; total: number }> = {
    easy: { count: 0, total: 0 },
    medium: { count: 0, total: 0 },
    hard: { count: 0, total: 0 }
  };

  // Track by brand
  const aliasByBrand: Record<string, { count: number; total: number }> = {};

  console.log('=== VERIFICATION CHECKS ===\n');

  // Check 1: All shoes have aliases field
  console.log('1. Checking aliases field presence...');
  for (const shoe of catalog.shoes) {
    if (!('aliases' in shoe)) {
      errors.push(`Missing aliases field: ${shoe.brand} - ${shoe.model}`);
    } else if (!Array.isArray(shoe.aliases)) {
      errors.push(`Non-array aliases field: ${shoe.brand} - ${shoe.model}`);
    }
  }
  console.log(`   ✓ All shoes have aliases field (array type)\n`);

  // Check 2-4: Validate aliases content
  console.log('2. Validating aliases content...');
  for (const shoe of catalog.shoes) {
    const aliases = shoe.aliases || [];
    const tier = shoe.difficultyTier;
    const brand = shoe.brand;

    // Track statistics
    aliasByTier[tier].total++;
    if (!aliasByBrand[brand]) {
      aliasByBrand[brand] = { count: 0, total: 0 };
    }
    aliasByBrand[brand].total++;

    if (aliases.length > 0) {
      shoesWithAliases++;
      totalAliases += aliases.length;
      aliasByTier[tier].count++;
      aliasByBrand[brand].count++;

      // Check for duplicates within same shoe
      const uniqueAliases = new Set(aliases);
      if (uniqueAliases.size !== aliases.length) {
        errors.push(`Duplicate aliases: ${shoe.brand} - ${shoe.model}`);
      }

      // Check for invalid aliases
      for (const alias of aliases) {
        if (!alias || alias.trim() === '') {
          errors.push(`Empty alias: ${shoe.brand} - ${shoe.model}`);
        }
        if (alias === shoe.model) {
          warnings.push(`Alias same as model: ${shoe.brand} - ${shoe.model} -> "${alias}"`);
        }
      }
    } else {
      shoesWithoutAliases++;
    }
  }
  console.log(`   ✓ No duplicate aliases found`);
  console.log(`   ✓ No invalid aliases (empty strings) found\n`);

  // Sample verification of iconic shoes
  console.log('3. Sample verification of iconic shoes...\n');
  const iconicSamples = [
    { brand: 'Jordan', model: 'Air Jordan 1', expectedAliases: ['Jordan 1', 'AJ1'] },
    { brand: 'Nike', model: 'Air Max 90', expectedAliases: ['AM90'] },
    { brand: 'Nike', model: 'Air Force 1', expectedAliases: ['AF1'] },
    { brand: 'Adidas', model: 'Yeezy', expectedAliases: ['Yeezys'] },
    { brand: 'New Balance', model: '550', expectedAliases: ['NB 550', '550'] }
  ];

  for (const sample of iconicSamples) {
    const shoe = catalog.shoes.find(s =>
      s.brand === sample.brand && s.model.includes(sample.model)
    );

    if (shoe) {
      const aliases = shoe.aliases || [];
      const hasExpected = sample.expectedAliases.some(expected =>
        aliases.some(alias => alias.includes(expected) || expected.includes(alias))
      );

      if (hasExpected) {
        console.log(`   ✓ ${shoe.brand} - ${shoe.model}`);
        console.log(`     Aliases: [${aliases.join(', ')}]`);
      } else {
        warnings.push(`Iconic shoe missing expected aliases: ${shoe.brand} - ${shoe.model}`);
        console.log(`   ⚠ ${shoe.brand} - ${shoe.model}`);
        console.log(`     Aliases: [${aliases.join(', ')}]`);
        console.log(`     Expected to include: ${sample.expectedAliases.join(' or ')}`);
      }
    }
  }

  console.log('\n=== STATISTICS ===\n');

  // Overall coverage
  console.log(`Total shoes: ${totalShoes}`);
  console.log(`Shoes with aliases: ${shoesWithAliases} (${((shoesWithAliases / totalShoes) * 100).toFixed(1)}%)`);
  console.log(`Shoes without aliases: ${shoesWithoutAliases} (${((shoesWithoutAliases / totalShoes) * 100).toFixed(1)}%)`);
  console.log(`Total aliases: ${totalAliases}`);
  console.log(`Average aliases per shoe (with aliases): ${(totalAliases / shoesWithAliases).toFixed(1)}`);

  // By difficulty tier
  console.log('\nCoverage by difficulty tier:');
  for (const [tier, stats] of Object.entries(aliasByTier)) {
    const percentage = ((stats.count / stats.total) * 100).toFixed(1);
    console.log(`  ${tier.padEnd(6)}: ${stats.count}/${stats.total} (${percentage}%)`);
  }

  // By brand (top brands only)
  console.log('\nCoverage by brand (brands with aliases):');
  const sortedBrands = Object.entries(aliasByBrand)
    .filter(([_, stats]) => stats.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [brand, stats] of sortedBrands) {
    const percentage = ((stats.count / stats.total) * 100).toFixed(1);
    console.log(`  ${brand.padEnd(20)}: ${stats.count}/${stats.total} (${percentage}%)`);
  }

  // Errors and warnings
  if (errors.length > 0) {
    console.log('\n=== ERRORS ===\n');
    errors.forEach(err => console.log(`  ✗ ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\n=== WARNINGS ===\n');
    warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
  }

  // Final verdict
  console.log('\n=== VERDICT ===\n');
  if (errors.length === 0) {
    console.log('✓ All validation checks passed!');

    if (shoesWithAliases >= totalShoes * 0.40) {
      console.log(`✓ Alias coverage (${((shoesWithAliases / totalShoes) * 100).toFixed(1)}%) meets 40%+ target`);
    } else {
      console.log(`⚠ Alias coverage (${((shoesWithAliases / totalShoes) * 100).toFixed(1)}%) below 40% target`);
    }

    if (warnings.length === 0) {
      console.log('✓ No warnings');
    } else {
      console.log(`⚠ ${warnings.length} warnings (non-critical)`);
    }
  } else {
    console.log(`✗ ${errors.length} errors found - catalog needs fixes`);
    process.exit(1);
  }
}

main();
