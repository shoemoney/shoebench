# ShoeBench Visualizer - Claude Memory Bank

## Project Overview
Interactive dashboard for the ShoeBench vision model benchmark. Displays leaderboard, cost analysis, error analysis, and shoe-level metrics for 100+ vision models tested on shoe identification.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Runtime:** Bun
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **Tables:** TanStack Table (for ErrorAnalysisTable)

## Key Files
- `app/page.tsx` - Main dashboard with all tabs
- `components/charts/CostEfficiencyScatter.tsx` - Cost vs Accuracy scatter plot
- `components/charts/TierAccuracyChart.tsx` - Tier accuracy by difficulty (currently unused)
- `components/tables/ErrorAnalysisTable.tsx` - Filterable error analysis with inline images
- `lib/modelUtils.ts` - Provider icons and model name formatting
- `lib/modelClassification.ts` - Model type classification (open/closed/free)
- `data/shoebench-results.json` - Benchmark results data

## Provider Icons
Located in `lib/modelUtils.ts`:
- OpenAI: `֎`
- Anthropic: `⚛`
- Google/Gemini: `✦︎`
- Meta/Llama: `🦙`

Icon images from simple-icons CDN used in Tiers chart.

## Dashboard Tabs
1. **Leaderboard** - Model rankings by accuracy with sortable table
2. **Cost** - Cost efficiency chart (10 cheapest + 10 most expensive, ignores model filter)
3. **Cost vs Accuracy** - Scatter plot showing efficiency (accuracy per dollar)
4. **Errors** - Filterable error analysis table with shoe images
5. **Shoes** - Hardest/Easiest shoes to identify charts

**Removed tabs:** Tiers, Speed (2026-01-24)

## Model Selection Behavior
- Default: All models selected
- Global filter applies to: Leaderboard, Cost vs Accuracy, Errors, Shoes tabs
- Cost tab: Independent selection (always shows 10 cheapest + 10 most expensive)
- "Top 10" button resets to top 10 by accuracy

## Styling Conventions
- Dark theme: `bg-neutral-950`, `text-neutral-100`
- Card backgrounds: `bg-neutral-900/70`
- Chart axis text: `#9ca3af` (gray)
- Chart labels: `#ffffff` (white) for important text
- Font sizes: 11-14px for chart labels

## Cost Display
- Precision: 2 decimal places, rounded up (`Math.ceil(n * 100) / 100`)
- Format: `$X.XX`

## Recent Changes (2026-01-24)
- Added provider icons (OpenAI, Anthropic, Google, Meta)
- Split tier accuracy into 3 stacked charts (Easy/Medium/Hard)
- Cost chart: horizontal labels rotated -90°, white price labels above bars
- Shoes charts: white text, larger font, no wrapping
- Removed Tiers and Speed tabs from navigation
- Default selection changed from top 10 to all models

## Build Commands
```bash
bun run dev      # Development server (port 3000)
bun run build    # Production build
bun run start    # Start production server
```

## Data Structure
`shoebench-results.json` contains:
- `modelMetrics[]` - Per-model aggregated stats
- `tierAccuracy[]` - Accuracy by difficulty tier
- `errors[]` - Individual test errors with shoe images
- `shoeMetrics[]` - Per-shoe accuracy across models
- `metadata` - Run info, model count, timestamp
