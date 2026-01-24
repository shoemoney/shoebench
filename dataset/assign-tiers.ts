/**
 * Tier Assignment Script
 *
 * Assigns difficulty tiers (easy/medium/hard) to shoes based on heuristics.
 *
 * Tier criteria (from CONTEXT.md):
 * - Easy (~25%): Distinctive branding, cultural ubiquity (e.g., Air Jordan 1 Chicago)
 * - Medium (~35%): Recognizable but not iconic
 * - Hard (~40%): Obscure releases, minimal branding, vintage/rare
 *
 * Usage: Imported by assemble-catalog.ts
 */

import type { ShoeEntry, DifficultyTier } from "./schema";

// Iconic shoes that are instantly recognizable (EASY tier)
const ICONIC_SHOES: Set<string> = new Set([
  // Jordan
  "air jordan 1 retro high og chicago",
  "air jordan 1 retro high og bred toe",
  "air jordan 1 retro high og royal toe",
  "air jordan 3 retro white cement reimagined",
  "air jordan 4 retro white oreo",
  "air jordan 11 retro cherry",
  // Nike classics
  "dunk low retro white black panda",
  "air force 1 low white",
  "air max 97 silver bullet",
  "cortez white varsity red",
  // Adidas classics
  "yeezy boost 350 v2 zebra",
  "stan smith white green",
  "superstar white black",
  "samba og white black gum",
  // Other classics
  "chuck taylor all star 70 hi black",
  "chuck taylor all star low white",
  "old skool black white",
  // Luxury icons
  "triple s sneakers",
  "speed trainer",
  "so kate 120 pumps",
  "achilles low sneakers",
  "replica sneakers",
  "geobasket sneakers",
]);

// Well-known shoes that are recognizable but not iconic (MEDIUM tier)
const RECOGNIZABLE_PATTERNS: RegExp[] = [
  // Popular lines
  /air jordan [1-6]/i,
  /dunk (low|high)/i,
  /air force 1/i,
  /air max (1|90|95|97)/i,
  /yeezy (boost|slide)/i,
  /stan smith/i,
  /superstar/i,
  /samba/i,
  /gazelle/i,
  /campus/i,
  /forum/i,
  /550/i,
  /990/i,
  /chuck taylor/i,
  /old skool/i,
  /sk8-hi/i,
  /club c/i,
  /classic leather/i,
  /suede classic/i,
  // Luxury recognizable
  /ace.*sneakers/i,
  /rhyton/i,
  /track sneakers/i,
  /defender/i,
  /america.*cup/i,
  /cloudbust/i,
  /intrecciato/i,
  /tabi/i,
  /court classic/i,
  /wyatt/i,
  /rockstud/i,
];

// Brands with high visibility (helps determine tier)
const HIGH_VISIBILITY_BRANDS: Set<string> = new Set([
  "Jordan",
  "Nike",
  "Adidas",
  "Converse",
  "Vans",
  "Balenciaga",
  "Christian Louboutin",
  "Gucci",
]);

// Luxury/designer brands (often harder due to less mainstream recognition)
const LUXURY_BRANDS: Set<string> = new Set([
  "Gucci",
  "Balenciaga",
  "Christian Louboutin",
  "Prada",
  "Bottega Veneta",
  "Common Projects",
  "Maison Margiela",
  "Rick Owens",
  "Saint Laurent",
  "Valentino",
  "Jimmy Choo",
]);

// Less mainstream brands (harder tier)
const NICHE_BRANDS: Set<string> = new Set([
  "Saucony",
  "On",
  "Under Armour",
  "ASICS",
]);

/**
 * Determine if a shoe is iconic based on model name
 */
function isIconic(brand: string, model: string): boolean {
  const key = model.toLowerCase();
  return ICONIC_SHOES.has(key);
}

/**
 * Determine if a shoe matches recognizable patterns
 */
function isRecognizable(model: string): boolean {
  return RECOGNIZABLE_PATTERNS.some((pattern) => pattern.test(model));
}

/**
 * Assign tier and rationale to a single shoe
 */
function assignTier(
  shoe: ShoeEntry
): Pick<ShoeEntry, "difficultyTier" | "tierRationale" | "metadata"> {
  const brand = shoe.brand;
  const model = shoe.model;

  // Check for iconic status first
  if (isIconic(brand, model)) {
    return {
      difficultyTier: "easy",
      tierRationale: `Iconic ${brand} shoe with high cultural recognition and distinctive branding`,
      metadata: {
        isIconic: true,
        culturalSignificance: "Highly recognizable cultural icon",
        brandingVisibility: "high",
      },
    };
  }

  // Check for recognizable patterns
  if (isRecognizable(model)) {
    // Some luxury recognizable shoes are still medium
    if (LUXURY_BRANDS.has(brand)) {
      return {
        difficultyTier: "medium",
        tierRationale: `Recognizable ${brand} silhouette but luxury positioning limits mainstream awareness`,
        metadata: {
          isIconic: false,
          culturalSignificance: "Known in fashion circles",
          brandingVisibility: "medium",
        },
      };
    }

    // High visibility brands with recognizable models
    if (HIGH_VISIBILITY_BRANDS.has(brand)) {
      return {
        difficultyTier: "medium",
        tierRationale: `${brand} shoe from popular line with recognizable design elements`,
        metadata: {
          isIconic: false,
          culturalSignificance: "Popular model line",
          brandingVisibility: "medium",
        },
      };
    }

    // Other recognizable
    return {
      difficultyTier: "medium",
      tierRationale: `Recognizable silhouette from ${brand} with moderate brand visibility`,
      metadata: {
        isIconic: false,
        brandingVisibility: "medium",
      },
    };
  }

  // Niche brands default to hard
  if (NICHE_BRANDS.has(brand)) {
    return {
      difficultyTier: "hard",
      tierRationale: `${brand} is a niche brand with limited mainstream recognition; specific model identification challenging`,
      metadata: {
        isIconic: false,
        brandingVisibility: "low",
      },
    };
  }

  // Luxury non-iconic defaults to hard
  if (LUXURY_BRANDS.has(brand)) {
    return {
      difficultyTier: "hard",
      tierRationale: `Luxury ${brand} piece with minimal visible branding; requires fashion expertise to identify`,
      metadata: {
        isIconic: false,
        brandingVisibility: "low",
      },
    };
  }

  // Default to hard for unrecognized combinations
  return {
    difficultyTier: "hard",
    tierRationale: `Less common ${brand} model without distinctive identifying features`,
    metadata: {
      isIconic: false,
      brandingVisibility: "low",
    },
  };
}

/**
 * Balance tier distribution to approximate targets
 * Target: ~25% easy, ~35% medium, ~40% hard
 *
 * This adjusts borderline cases to meet distribution targets
 */
function balanceTiers(shoes: ShoeEntry[]): ShoeEntry[] {
  const total = shoes.length;
  const targets = {
    easy: Math.round(total * 0.25),
    medium: Math.round(total * 0.35),
    hard: Math.round(total * 0.40),
  };

  // Count current distribution
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const shoe of shoes) {
    counts[shoe.difficultyTier]++;
  }

  console.log(`  Initial distribution: easy=${counts.easy}, medium=${counts.medium}, hard=${counts.hard}`);
  console.log(`  Target distribution: easy=${targets.easy}, medium=${targets.medium}, hard=${targets.hard}`);

  // If hard is over target and easy is under, promote some hard to medium or easy
  const result = [...shoes];

  // Sort by brand visibility for promotion decisions
  const hardShoes = result.filter((s) => s.difficultyTier === "hard");
  const needMoreEasy = targets.easy - counts.easy;
  const needMoreMedium = targets.medium - counts.medium;

  if (needMoreEasy > 0 || needMoreMedium > 0) {
    // Promote high-visibility brand shoes from hard
    let promoted = 0;
    for (const shoe of hardShoes) {
      if (promoted >= Math.abs(needMoreEasy) + Math.abs(needMoreMedium)) break;

      if (HIGH_VISIBILITY_BRANDS.has(shoe.brand)) {
        if (needMoreEasy > promoted && counts.easy < targets.easy) {
          shoe.difficultyTier = "easy";
          shoe.tierRationale += " (promoted for distribution balance)";
          counts.easy++;
          counts.hard--;
          promoted++;
        } else if (needMoreMedium > 0 && counts.medium < targets.medium) {
          shoe.difficultyTier = "medium";
          shoe.tierRationale += " (promoted for distribution balance)";
          counts.medium++;
          counts.hard--;
          promoted++;
        }
      }
    }
  }

  console.log(`  Final distribution: easy=${counts.easy}, medium=${counts.medium}, hard=${counts.hard}`);

  return result;
}

/**
 * Assign difficulty tiers to all shoes in the collection
 *
 * @param shoes Array of ShoeEntry objects
 * @returns Shoes with difficultyTier, tierRationale, and metadata updated
 */
export function assignTiers(shoes: ShoeEntry[]): ShoeEntry[] {
  console.log(`Assigning tiers to ${shoes.length} shoes...`);

  // First pass: assign based on heuristics
  const tiered = shoes.map((shoe) => {
    const tierInfo = assignTier(shoe);
    return {
      ...shoe,
      ...tierInfo,
    };
  });

  // Second pass: balance distribution
  const balanced = balanceTiers(tiered);

  return balanced;
}

// Export for CLI usage
export default assignTiers;
