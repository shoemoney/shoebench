# ShoeBench

An open source benchmark for vision-capable LLMs that tests shoe brand and model identification ability. Models are shown images of shoes and asked to identify the brand and model name. Results are scored by an LLM-as-judge and ranked across accuracy, cost efficiency, and speed metrics.

## Features

- **125-shoe dataset** with ground truth labels and difficulty tiers (Easy/Medium/Hard)
- **Vision model testing** via OpenRouter (GPT-4o, Claude 3.5, Gemini, etc.)
- **LLM-as-judge scoring** with 4-tier evaluation (Exact, Variant, Brand Only, Wrong)
- **Result caching** to reduce API costs on re-runs
- **Interactive dashboard** with leaderboard, charts, and error analysis

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- [Node.js](https://nodejs.org) (v20+) for the visualizer
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone https://github.com/shoemoney/shoebench.git
cd shoebench

# Install bench dependencies
cd bench && bun install

# Install visualizer dependencies
cd ../visualizer && npm install
```

### Configuration

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Run the Benchmark

```bash
# Quick test (3 models × 5 shoes)
cd bench && bun run vision:quick

# Full benchmark
bun run vision

# Judge the results
bun run ./run-judge-benchmark.ts
```

### View Results

```bash
# Export results for visualizer
cd visualizer && bun scripts/export-results.ts

# Start dashboard
npm run dev
# Open http://localhost:3000
```

## Architecture

```
shoebench/
├── bench/                    # Benchmark runner
│   ├── vision-runner.ts      # Vision model testing
│   ├── judge-runner.ts       # LLM-as-judge evaluation
│   ├── cache.ts              # SQLite caching layer
│   └── results/              # Raw benchmark results
├── dataset/
│   ├── catalog.json          # 125 shoes with metadata
│   └── images/               # Downloaded shoe images
└── visualizer/               # Next.js dashboard
    ├── app/page.tsx          # 6-tab dashboard
    ├── lib/aggregation/      # Metrics calculations
    └── data/                 # Aggregated results JSON
```

## Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Leaderboard** | Models ranked by overall accuracy |
| **Tiers** | Accuracy breakdown by difficulty (Easy/Medium/Hard) |
| **Cost** | Total cost comparison per model |
| **Speed** | Average latency comparison |
| **Cost vs Accuracy** | Scatter plot with efficiency metric |
| **Errors** | Error analysis table with inline shoe images |

## Scoring System

The LLM-as-judge evaluates each response with a 4-tier system:

| Tier | Score | Description |
|------|-------|-------------|
| **Exact** | 100 | Perfect brand and model match |
| **Variant** | 75 | Correct identification with name variation (e.g., "AJ1" = "Air Jordan 1") |
| **Brand Only** | 50 | Correct brand, wrong or missing model |
| **Wrong** | 0 | Incorrect brand |

## Difficulty Tiers

- **Easy**: Iconic shoes everyone recognizes (Air Jordan 1, Stan Smith, Chuck Taylor)
- **Medium**: Popular but less distinctive (specific Nike Dunk colorways, New Balance 550)
- **Hard**: Obscure releases, vintage, or designer pieces requiring specialist knowledge

## Supported Models

All OpenRouter vision-capable models, including:
- OpenAI: GPT-4o, GPT-4o-mini
- Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku
- Google: Gemini 2.0 Flash, Gemini Pro Vision
- Meta: Llama 3.2 Vision

## CLI Options

```bash
# Vision benchmark
bun run ./run-vision-benchmark.ts [options]
  --quick           Use 3 fastest models, 5 shoes
  --shoes <n>       Number of shoes to test (default: 20)
  --model <name>    Test specific model only
  --no-cache        Skip cache, force fresh API calls

# Judge benchmark
bun run ./run-judge-benchmark.ts [options]
  --vision <file>   Specific vision results file
  --no-cache        Skip judge cache
```

## Development

```bash
# Type check
cd bench && bun run typecheck

# Build visualizer
cd visualizer && npm run build
```

## Data Sources

Shoe images sourced from:
- StockX (sneakers)
- GOAT (sneakers and streetwear)
- Farfetch (designer/luxury)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
