/**
 * Add aliases to catalog.json for common shoe name variants
 *
 * Purpose: Ground truth variant enumeration (JUDG-03) - explicitly list
 * acceptable name variations so judge can match "AJ1" to "Air Jordan 1"
 * without relying solely on discretion.
 *
 * Alias Strategy:
 * - For iconic shoes, add 2-3 common abbreviations/variants
 * - For less-known shoes, may have empty aliases array or 1-2 variants
 * - Focus on: brand abbreviations, model shorthand, common nicknames
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ShoeEntry {
  id: string;
  brand: string;
  model: string;
  aliases?: string[];
  [key: string]: any;
}

interface Catalog {
  shoes: ShoeEntry[];
  [key: string]: any;
}

// Alias pattern rules based on sneaker culture naming conventions
const ALIAS_PATTERNS: Record<string, (model: string) => string[]> = {
  // Jordan brand - iconic numbered models
  'Jordan': (model: string) => {
    const aliases: string[] = [];

    // Air Jordan 1
    if (model.includes('Air Jordan 1')) {
      aliases.push('Jordan 1', 'AJ1');
      if (model.includes('High')) aliases.push('Air Jordan 1 High');
      if (model.includes('Low')) aliases.push('Air Jordan 1 Low');
      if (model.includes('Mid')) aliases.push('Air Jordan 1 Mid');
    }
    // Air Jordan 3
    else if (model.includes('Air Jordan 3')) {
      aliases.push('Jordan 3', 'AJ3', 'Air Jordan 3');
    }
    // Air Jordan 4
    else if (model.includes('Air Jordan 4')) {
      aliases.push('Jordan 4', 'AJ4', 'Air Jordan 4');
    }
    // Air Jordan 5
    else if (model.includes('Air Jordan 5')) {
      aliases.push('Jordan 5', 'AJ5', 'Air Jordan 5');
    }
    // Air Jordan 6
    else if (model.includes('Air Jordan 6')) {
      aliases.push('Jordan 6', 'AJ6', 'Air Jordan 6');
    }
    // Air Jordan 11
    else if (model.includes('Air Jordan 11')) {
      aliases.push('Jordan 11', 'AJ11', 'Air Jordan 11');
    }
    // Air Jordan 12
    else if (model.includes('Air Jordan 12')) {
      aliases.push('Jordan 12', 'AJ12', 'Air Jordan 12');
    }
    // Air Jordan 13
    else if (model.includes('Air Jordan 13')) {
      aliases.push('Jordan 13', 'AJ13', 'Air Jordan 13');
    }

    return aliases;
  },

  // Nike brand - Air Max, Dunk, Air Force, etc.
  'Nike': (model: string) => {
    const aliases: string[] = [];

    // Air Max series
    if (model.includes('Air Max 1')) {
      aliases.push('AM1', 'Air Max 1');
    }
    else if (model.includes('Air Max 90')) {
      aliases.push('AM90', 'Air Max 90');
    }
    else if (model.includes('Air Max 95')) {
      aliases.push('AM95', 'Air Max 95');
    }
    else if (model.includes('Air Max 97')) {
      aliases.push('AM97', 'Air Max 97');
    }
    else if (model.includes('Air Max Plus')) {
      aliases.push('TN', 'Air Max Plus', 'Tuned 1');
    }

    // Dunk series
    else if (model.includes('Dunk Low')) {
      aliases.push('Dunk Low', 'Nike Dunk Low');
    }
    else if (model.includes('Dunk High')) {
      aliases.push('Dunk High', 'Nike Dunk High');
    }

    // Air Force 1
    else if (model.includes('Air Force 1')) {
      aliases.push('AF1', 'Air Force 1');
      if (model.includes('Low')) aliases.push('AF1 Low');
      if (model.includes('High')) aliases.push('AF1 High');
    }

    // Blazer
    else if (model.includes('Blazer')) {
      aliases.push('Nike Blazer');
      if (model.includes('Mid')) aliases.push('Blazer Mid');
    }

    // Cortez
    else if (model.includes('Cortez')) {
      aliases.push('Nike Cortez', 'Cortez');
    }

    // Pegasus
    else if (model.includes('Pegasus')) {
      aliases.push('Nike Pegasus');
    }

    // Vaporfly
    else if (model.includes('Vaporfly')) {
      aliases.push('Nike Vaporfly');
    }

    return aliases;
  },

  // Adidas brand - Yeezy, Ultraboost, Stan Smith, etc.
  'Adidas': (model: string) => {
    const aliases: string[] = [];

    // Yeezy series
    if (model.includes('Yeezy Boost 350')) {
      aliases.push('Yeezy 350', 'Yeezys', '350 V2');
    }
    else if (model.includes('Yeezy Boost 700')) {
      aliases.push('Yeezy 700', 'Yeezys');
    }
    else if (model.includes('Yeezy')) {
      aliases.push('Yeezys');
    }

    // Ultraboost
    else if (model.includes('Ultraboost')) {
      aliases.push('UB', 'Ultra Boost', 'Adidas Ultraboost');
    }

    // Stan Smith
    else if (model.includes('Stan Smith')) {
      aliases.push('Stan Smith', 'Adidas Stan Smith');
    }

    // Superstar
    else if (model.includes('Superstar')) {
      aliases.push('Adidas Superstar', 'Superstars');
    }

    // Samba
    else if (model.includes('Samba')) {
      aliases.push('Adidas Samba', 'Samba');
    }

    // Gazelle
    else if (model.includes('Gazelle')) {
      aliases.push('Adidas Gazelle', 'Gazelle');
    }

    // NMD
    else if (model.includes('NMD')) {
      aliases.push('NMD', 'Adidas NMD');
    }

    return aliases;
  },

  // New Balance - numbered models
  'New Balance': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('550')) {
      aliases.push('NB 550', '550');
    }
    else if (model.includes('574')) {
      aliases.push('NB 574', '574');
    }
    else if (model.includes('990')) {
      aliases.push('NB 990', '990');
    }
    else if (model.includes('2002R')) {
      aliases.push('NB 2002R', '2002R');
    }
    else if (model.includes('327')) {
      aliases.push('NB 327', '327');
    }
    else if (model.includes('1906R')) {
      aliases.push('NB 1906R', '1906R');
    }

    return aliases;
  },

  // Converse
  'Converse': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Chuck Taylor') || model.includes('Chuck 70')) {
      aliases.push('Chucks', 'Converse');
      if (model.includes('High')) aliases.push('Chuck Taylor High');
      if (model.includes('Low')) aliases.push('Chuck Taylor Low');
    }
    else if (model.includes('One Star')) {
      aliases.push('Converse One Star');
    }

    return aliases;
  },

  // Vans
  'Vans': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Old Skool')) {
      aliases.push('Old Skool', 'Vans Old Skool');
    }
    else if (model.includes('Sk8-Hi')) {
      aliases.push('Sk8 Hi', 'Vans Sk8-Hi');
    }
    else if (model.includes('Authentic')) {
      aliases.push('Vans Authentic');
    }
    else if (model.includes('Era')) {
      aliases.push('Vans Era');
    }

    return aliases;
  },

  // Puma
  'Puma': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Suede')) {
      aliases.push('Puma Suede');
    }
    else if (model.includes('Clyde')) {
      aliases.push('Puma Clyde');
    }
    else if (model.includes('RS-X')) {
      aliases.push('RS-X', 'Puma RS-X');
    }

    return aliases;
  },

  // ASICS
  'ASICS': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Gel-Lyte III')) {
      aliases.push('Gel-Lyte 3', 'ASICS Gel-Lyte III');
    }
    else if (model.includes('Gel-Kayano')) {
      aliases.push('Kayano', 'ASICS Gel-Kayano');
    }
    else if (model.includes('Gel-Nimbus')) {
      aliases.push('Nimbus', 'ASICS Gel-Nimbus');
    }

    return aliases;
  },

  // Reebok
  'Reebok': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Club C')) {
      aliases.push('Club C', 'Reebok Club C');
    }
    else if (model.includes('Classic Leather')) {
      aliases.push('Reebok Classic', 'Classic Leather');
    }
    else if (model.includes('Question')) {
      aliases.push('Reebok Question');
    }

    return aliases;
  },

  // Saucony
  'Saucony': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Jazz')) {
      aliases.push('Saucony Jazz');
    }
    else if (model.includes('Shadow')) {
      aliases.push('Saucony Shadow');
    }

    return aliases;
  },

  // On
  'On': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Cloud')) {
      aliases.push('On Cloud');
    }
    else if (model.includes('Cloudmonster')) {
      aliases.push('On Cloudmonster');
    }

    return aliases;
  },

  // Under Armour
  'Under Armour': (model: string) => {
    const aliases: string[] = [];

    if (model.includes('Curry')) {
      aliases.push('UA Curry');
    }
    else if (model.includes('HOVR')) {
      aliases.push('UA HOVR');
    }

    return aliases;
  }
};

function generateAliases(brand: string, model: string): string[] {
  const aliasGenerator = ALIAS_PATTERNS[brand];
  if (!aliasGenerator) {
    return []; // No aliases for luxury brands or unknown brands
  }

  const aliases = aliasGenerator(model);
  // Remove duplicates and the original model name
  return [...new Set(aliases)].filter(alias => alias !== model);
}

function main() {
  const catalogPath = join(process.cwd(), 'dataset', 'catalog.json');

  console.log('Loading catalog...');
  const catalog: Catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));

  console.log(`Processing ${catalog.shoes.length} shoes...`);

  let shoesWithAliases = 0;
  let totalAliases = 0;

  // Add aliases to each shoe
  for (const shoe of catalog.shoes) {
    const aliases = generateAliases(shoe.brand, shoe.model);
    shoe.aliases = aliases;

    if (aliases.length > 0) {
      shoesWithAliases++;
      totalAliases += aliases.length;
      console.log(`  ${shoe.brand} - ${shoe.model}: [${aliases.join(', ')}]`);
    }
  }

  // Write updated catalog
  console.log('\nWriting updated catalog...');
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Total shoes: ${catalog.shoes.length}`);
  console.log(`Shoes with aliases: ${shoesWithAliases} (${((shoesWithAliases / catalog.shoes.length) * 100).toFixed(1)}%)`);
  console.log(`Total aliases added: ${totalAliases}`);
  console.log(`Average aliases per shoe with aliases: ${(totalAliases / shoesWithAliases).toFixed(1)}`);
  console.log('\nDone! Updated catalog.json with aliases field.');
}

main();
