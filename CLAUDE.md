# ShoeBench - Claude Memory Bank

## Project Overview
Open source benchmark for vision-capable LLMs testing shoe brand and model identification. Inspired by Theo Brown's SkateBench.

## Repository Structure
```
shoebench/
├── bench/           # Benchmark runner (Bun + TypeScript)
├── dataset/         # 89 shoe images with ground truth labels
├── visualizer/      # Next.js dashboard (see visualizer/CLAUDE.md)
├── .planning/       # GSD planning docs (gitignored)
└── README.md
```

## Key Decisions
- **LLM-as-judge** over string matching for flexible shoe name matching
- **Brand+model only** (no colorway) to reduce complexity
- **Claude 3.5 Haiku** as judge model (cost/capability balance)
- **generateText + JSON parsing** (OpenRouter structured output unreliable)

## Model Categories
- **Closed:** Proprietary APIs (GPT-5, Claude Opus, Gemini Pro)
- **Open Source:** Open-weight models (Llama, Qwen, Mistral)
- **Free:** Models with $0 cost on OpenRouter

## Scoring System
- **Exact Match:** Brand + model correct
- **Variant Match:** Correct but different variant/colorway
- **Brand Only:** Brand correct, model wrong
- **Wrong:** Completely incorrect

## Provider Icons (used in visualizer)
- OpenAI: `֎`
- Anthropic: `⚛`
- Google/Gemini: `✦︎`
- Meta/Llama: `🦙`

## Live Dashboard
https://shoemoneybench.vercel.app

## Development
```bash
# Benchmark
cd bench && bun install && bun run vision:quick

# Visualizer
cd visualizer && bun install && bun run dev
```

## Data Flow
1. `bench/` runs vision tests via OpenRouter API
2. Results cached in `bench/results/`
3. Export script generates `visualizer/data/shoebench-results.json`
4. Visualizer reads JSON and renders dashboard
