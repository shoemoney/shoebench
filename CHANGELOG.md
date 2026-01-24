# Changelog

All notable changes to ShoeBench will be documented in this file.

## [1.0.0] - 2026-01-24

### Added

#### Dataset Foundation
- 125-shoe catalog with brand, model, and ground truth labels
- Difficulty tier assignment (Easy/Medium/Hard) based on shoe recognizability
- Brand coverage across 23 brands (sneakers, designer, vintage, everyday)
- Shoe images downloaded and processed to 1024x1024
- Name aliases for common variations (AJ1, AM90, Yeezys, etc.)

#### Vision Testing
- Vision model testing via OpenRouter API
- Support for GPT-4o, Claude 3.5, Gemini, Llama 3.2 Vision, and more
- SQLite caching layer to reduce API costs on re-runs
- Concurrent execution with configurable parallelism
- Token usage and cost tracking per test

#### LLM-as-Judge Scoring
- 4-tier scoring system: Exact (100), Variant (75), Brand Only (50), Wrong (0)
- Name variant handling for equivalent identifications
- Position randomization to mitigate judge bias
- Separate evaluation caching from vision results
- Claude 3.5 Haiku as judge model

#### Metrics & Visualization
- Overall accuracy metric with model leaderboard
- Tier-based accuracy breakdown (Easy/Medium/Hard per model)
- Cost efficiency metric (accuracy per dollar)
- Speed/latency tracking per model
- Error analysis view with inline shoe images
- Filterable and sortable results

#### Dashboard
- Next.js 16 dashboard with 6 tabs:
  - Leaderboard (model rankings by accuracy)
  - Tiers (grouped bar chart by difficulty)
  - Cost (bar chart comparison)
  - Speed (latency comparison)
  - Cost vs Accuracy (scatter plot)
  - Errors (TanStack Table with filters and sorting)
- Model filter dropdown affecting all charts
- Responsive mobile layout
- Dark theme with gradient styling

### Technical Details

- **Runtime**: Bun for CLI/bench, Node.js for visualizer
- **Framework**: Next.js 16 with React 19
- **Charts**: Recharts with shadcn/ui components
- **Tables**: TanStack Table v8
- **API**: OpenRouter via AI SDK
- **Cache**: bun:sqlite with WAL mode

### Initial Benchmark Results

Quick test (3 models × 5 shoes):
- Claude 3.5 Haiku: 100% accuracy, 90 avg score
- GPT-4o-mini: 60% accuracy, 70 avg score
- Gemini 2.0 Flash: 60% accuracy, 65 avg score

---

*First public release*
