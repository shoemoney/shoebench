# Benchmark Data Contamination Documentation

## Overview

Vision model benchmarks must guard against **data contamination** - the scenario where test images (or near-duplicates) appeared in model training data. If a model has "seen" benchmark images during training, its performance on those images doesn't reflect genuine capability.

## Risk Assessment

### High Risk Factors

1. **Popular Product Images**: Sneaker images from StockX, GOAT, and Farfetch are widely distributed across the internet
2. **Press/Marketing Photos**: Official product shots are reused across hundreds of retailer sites
3. **Social Media Spread**: Hype releases get millions of views across Instagram, Twitter, Reddit

### Mitigating Factors

1. **Recent Releases**: Shoes released after model training cutoffs (typically 2023-2024 for current models) have lower contamination risk
2. **Unique Angles**: Non-standard product shots are less likely to be in training data
3. **Source Diversity**: Using multiple sources reduces single-image contamination risk

## Contamination Check Methodology

### 1. Reverse Image Search (TinEye API)

The `contamination-check.ts` script uses TinEye's reverse image search API to find where each benchmark image appears online.

**Interpretation:**
- **0 matches**: Clean - image likely unique or very new
- **1-10 matches on source domains only**: Clean - expected for product pages
- **10-50 matches on external domains**: Potential contamination - widely distributed
- **50+ matches on external domains**: High contamination risk - likely in training data

### 2. First-Seen Date Analysis

TinEye provides the earliest date each image was crawled. Images first seen **after** model training cutoffs are lower risk.

**Training Cutoffs (Approximate):**
- GPT-4V: September 2023
- Claude 3: Early 2024
- Gemini: Late 2023

### 3. Source Diversity Check

The current catalog includes images from three sources to reduce single-source contamination risk:

| Source | Count | Percentage |
|--------|-------|------------|
| StockX | ~50 | 40% |
| GOAT | ~40 | 32% |
| Farfetch | ~40 | 32% |

## Running Contamination Checks

### Without API Key (Placeholder Report)

```bash
bun run dataset/contamination-check.ts
```

Generates a report showing all images as "unchecked" with source diversity statistics.

### With TinEye API Key

```bash
# Set API key
export TINEYE_API_KEY=your_key_here

# Run full check
bun run dataset/contamination-check.ts --api-key=$TINEYE_API_KEY

# Check limited sample (for testing)
bun run dataset/contamination-check.ts --api-key=$TINEYE_API_KEY --limit=10
```

### Getting a TinEye API Key

1. Visit https://api.tineye.com/
2. Sign up for an API account
3. Start with the free tier (500 searches/month)

## Current Status

### Catalog Summary (v1.0.0)

- **Total Shoes**: 126
- **Images Per Shoe**: 1 (placeholder)
- **Image Status**: All placeholder (pending download)

### Contamination Status

Images are currently placeholders. Full contamination check will be run after:
1. Images are downloaded via manual browser automation
2. Images are processed to 1024x1024 format
3. Processed images are stored in `dataset/images/{source}/`

### Tier-Based Risk Assessment

| Tier | Count | Contamination Risk | Rationale |
|------|-------|-------------------|-----------|
| Easy | 32 | HIGH | Iconic shoes with millions of online images |
| Medium | 48 | MEDIUM | Popular but not ubiquitous |
| Hard | 46 | LOW | Niche/obscure with fewer online appearances |

**Note**: Ironically, "easy" tier shoes (most recognizable) have the highest contamination risk. This is expected and actually beneficial - if models perform well on easy shoes, it validates either genuine recognition OR successful memorization of common images.

## Recommendations

### For Valid Benchmarking

1. **Use recent releases**: Prioritize shoes released in 2024+
2. **Capture unique angles**: Non-standard product shots reduce contamination
3. **Document contamination**: Include contamination status in benchmark reporting
4. **Score by tier**: Report performance separately for clean vs potentially contaminated images

### For Report Transparency

When publishing benchmark results, include:
- Contamination check methodology
- Percentage of images checked
- Distribution of clean/potential/contaminated
- Performance breakdown by contamination status

## Files

- `contamination-check.ts`: Main contamination check script
- `contamination-report.json`: Generated report (after running check)
- `catalog.json`: Source catalog with image metadata
