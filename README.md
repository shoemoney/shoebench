# 👟✨ ShoeBench 👟✨

> 🎯 An open source benchmark for vision-capable LLMs that tests shoe brand and model identification ability! 🔥

Models are shown images of shoes 📸 and asked to identify the brand and model name. Results are scored by an LLM-as-judge ⚖️ and ranked across accuracy, cost efficiency, and speed metrics! 📊🚀

---

## 🙏 Credits & Inspiration 💜

This project is **heavily inspired by** and built on top of the incredible work of **[Theo Brown](https://twitter.com/t3dotgg)** 🐐👑

### 💜✨ Massive Thanks To Theo For:

- 🎬 **[His YouTube Channel](https://youtube.com/@t3dotgg)** — Absolute gold mine of web dev content! 💎 If you're not subscribed, what are you even doing?? Go subscribe NOW! 📺🔥
- 🤖 **[T3 Chat](https://t3.chat)** — His amazing AI chat application that's absolutely cracked! 🧠💬 Seriously check it out if you haven't! ✨
- 🛹 **SkateBench** — The original benchmark this project is forked from! Theo's skateboard trick identification benchmark was the foundation for everything here! 🔥💪
- 🧠 **The T3 Stack Philosophy** — Type safety, great DX, and shipping fast! 🚀⚡

**Theo is genuinely one of the best content creators in the web dev space!** 🏆 His streams, videos, and takes are always entertaining AND educational. The man ships more in a week than most do in a month! 💪🔥🚀

---

## ✨🌟 Features 🌟✨

- 👟 **89-shoe dataset** with ground truth labels and difficulty tiers (🟢 Easy / 🟡 Medium / 🔴 Hard)
- 👁️ **120+ vision models** tested via OpenRouter (auto-updated from API! 🔄)
- ⚖️ **LLM-as-judge scoring** with 4-tier evaluation (✅ Exact / 🎯 Variant / 🏷️ Brand Only / ❌ Wrong)
- 💾 **Smart caching** to reduce API costs on re-runs 💰
- 📈 **Interactive dashboard** with leaderboard, charts, and error analysis 🎨
- 🏷️ **Model classification** filtering by 🔒 Closed / 🌐 Open Source / 🆓 Free
- 🚀 **One-command deploy** — benchmark + commit + push!

---

## 🚀⚡ Quick Start ⚡🚀

### 📋 Prerequisites

- 🥟 [Bun](https://bun.sh) runtime (v1.0+)
- 💚 [Node.js](https://nodejs.org) (v20+) for the visualizer
- 🔑 OpenRouter API key

### 📦 Installation

```bash
# 📥 Clone the repository
git clone https://github.com/shoemoney/shoebench.git
cd shoebench

# 🥟 Install bench dependencies
cd bench && bun install

# 💚 Install visualizer dependencies
cd ../visualizer && bun install
```

### ⚙️ Configuration

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 🏃💨 Run the Benchmark

```bash
cd bench

# 🚀🔥 FULL PIPELINE + AUTO DEPLOY (recommended!)
bun run deploy           # Run ALL + commit + push to GitHub! 🚀✨

# 🔥 FULL PIPELINE (local only)
bun run all              # All models × all shoes (no git) 🔥🔥🔥
bun run quick            # Quick test (3 models × 5 shoes) ⚡
bun run free             # Free models only (no API cost!) 🆓💸

# 📊 BY TIER - choose your budget! 💰
bun run vision:premium   # 15 best models (GPT-5, Claude Opus, etc.) 👑✨
bun run vision:mid       # 16 balanced models (great quality/cost) ⚖️
bun run vision:budget    # 13 cheapest models 💸
bun run vision:free      # Free models (zero cost!) 🆓

# 🎯 INDIVIDUAL STEPS
bun run vision           # Run vision benchmark (20 shoes default) 👁️
bun run vision:all       # All models × all 89 shoes 👟
bun run judge            # Score results with LLM-as-judge ⚖️
bun run export           # Export for visualizer 📤

# 🔄 MODEL UPDATES
bun run update-models    # Fetch latest vision models from OpenRouter API 🔄✨
bun run update-models:dry # Preview changes without writing 👀
```

### 👀🎨 View Results

```bash
# 🎨 Start dashboard
cd visualizer && bun run dev
# 🌐 Open http://localhost:3000
```

---

## 🏗️ Architecture

```
shoebench/
├── 🧪 bench/                        # Benchmark runner
│   ├── 👁️ vision-runner.ts          # Vision model testing
│   ├── ⚖️ judge-runner.ts           # LLM-as-judge evaluation
│   ├── 📋 vision-constants.ts       # Auto-generated model list
│   ├── 💾 cache.ts                  # SQLite caching layer
│   ├── 📂 scripts/
│   │   └── 🔄 update-vision-models.ts  # OpenRouter API model fetcher
│   └── 📊 results/                  # Raw benchmark results
├── 📁 dataset/
│   ├── 📋 catalog.json              # 89 shoes with metadata
│   └── 🖼️ images/                   # Downloaded shoe images
└── 🎨 visualizer/                   # Next.js dashboard
    ├── 📱 app/page.tsx              # 7-tab dashboard
    ├── 📊 lib/aggregation/          # Metrics calculations
    ├── 🏷️ lib/modelClassification.ts  # Open/Closed/Free classification
    └── 📦 data/                     # Aggregated results JSON
```

---

## 📊🎨 Dashboard Tabs

| Tab | Description |
|-----|-------------|
| 🏆 **Leaderboard** | Models ranked by overall accuracy (filter by 🔒/🌐/🆓) |
| 📊 **Tiers** | Accuracy breakdown by difficulty (🟢/🟡/🔴) |
| 💰 **Cost** | Total cost comparison per model 💸 |
| ⚡ **Speed** | Average latency comparison 🏎️ |
| 📈 **Cost vs Accuracy** | Scatter plot with efficiency metric 🎯 |
| 👟 **Shoes** | Per-shoe difficulty analysis (hardest/easiest) |
| ❌ **Errors** | Error analysis table with inline shoe images 🔍 |

---

## ⚖️ Scoring System

The LLM-as-judge evaluates each response with a 4-tier system:

| Tier | Score | Description |
|------|-------|-------------|
| ✅ **Exact** | 💯 100 | Perfect brand and model match! 🎉 |
| 🎯 **Variant** | 7️⃣5️⃣ 75 | Correct ID with name variation (e.g., "AJ1" = "Air Jordan 1") |
| 🏷️ **Brand Only** | 5️⃣0️⃣ 50 | Correct brand, wrong or missing model |
| ❌ **Wrong** | 0️⃣ 0 | Incorrect brand 😢 |

---

## 🎚️ Difficulty Tiers

- 🟢 **Easy**: Iconic shoes everyone recognizes (Air Jordan 1 👟, Stan Smith 🎾, Chuck Taylor ⭐)
- 🟡 **Medium**: Popular but less distinctive (specific Nike Dunk colorways 🎨, New Balance 550)
- 🔴 **Hard**: Obscure releases, vintage, or designer pieces requiring specialist knowledge 🧐👠

---

## 🤖✨ Supported Models (120+ and Growing!) 📈

ShoeBench tests **all vision-capable models** on OpenRouter, auto-updated via `bun run update-models` 🔄

### 🏷️ Model Categories

| Type | Description | Examples |
|------|-------------|----------|
| 🔒 **Closed** | Proprietary APIs 🏢 | GPT-5, Claude Opus, Gemini Pro, Grok |
| 🌐 **Open Source** | Open-weight models 💪 | Llama, Qwen, Mistral, NVIDIA Nemotron |
| 🆓 **Free** | Zero-cost tier! 💸 | Gemma 3, Molmo 2, Qwen-VL (free versions) |

### 🏢 Providers Include

- 🧠 **OpenAI**: GPT-5.x, GPT-4o, o3, o4-mini series
- 🟠 **Anthropic**: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5
- 🔵 **Google**: Gemini 3 Pro/Flash, Gemini 2.5, Gemma 3
- ⚡ **xAI**: Grok 4, Grok 4.1 Fast
- 🦙 **Meta**: Llama 4 Maverick/Scout, Llama 3.2 Vision
- 🐼 **Qwen**: Qwen3-VL 235B, Qwen2.5-VL series
- 🇫🇷 **Mistral**: Mistral Large, Pixtral, Ministral
- 🎵 **ByteDance**: Seed 1.6, UI-TARS
- 📦 **Amazon**: Nova Premier/Pro/Lite
- 🌍 **And 15+ more providers...** 🚀

Run `bun run update-models` to fetch the latest model list from OpenRouter! 🔄✨

---

## 🛠️ CLI Options

```bash
# 👁️ Vision benchmark
bun run ./run-vision-benchmark.ts [options]
  --quick           ⚡ Use 3 fastest models, 5 shoes
  --tier=TIER       💰 Model tier: budget, mid, premium, free
  --shoes=N         👟 Number of shoes to test (default: 20)
  --model=NAME      🎯 Test specific model only
  --no-cache        🔄 Skip cache, force fresh API calls

# ⚖️ Judge benchmark
bun run ./run-judge-benchmark.ts [options]
  --vision <file>   📄 Specific vision results file
  --no-cache        🔄 Skip judge cache
```

### 🎚️💰 Model Tiers

| Tier | Use Case |
|------|----------|
| 👑 **Premium** | Best accuracy (GPT-5, Claude Opus, Gemini Pro) ✨ |
| ⚖️ **Mid** | Great balance of quality and cost 🎯 |
| 💸 **Budget** | Cheapest options for high-volume testing |
| 🆓 **Free** | Zero cost! Perfect for testing 🎉 |

---

## 💻 Development

```bash
# ✅ Type check
cd bench && bun run typecheck

# 🏗️ Build visualizer
cd visualizer && bun run build

# 🔄 Update vision models from OpenRouter API
cd bench && bun run update-models

# 👀 Preview model changes without writing
cd bench && bun run update-models:dry

# 🚀 Full benchmark + deploy to GitHub
cd bench && bun run deploy
```

---

## 📸 Data Sources

Shoe images sourced from:
- 🏀 **StockX** (sneakers)
- 👟 **GOAT** (sneakers and streetwear)
- 👠 **Farfetch** (designer/luxury)

---

## 📜 License

MIT 📄✨

---

## 🤝 Contributing

Contributions welcome! 🎉 Please open an issue or PR! 🙌💪

---

## 🔗 Links

- 🐦 **Theo's Twitter**: [@t3dotgg](https://twitter.com/t3dotgg)
- 📺 **Theo's YouTube**: [youtube.com/@t3dotgg](https://youtube.com/@t3dotgg)
- 💬 **T3 Chat**: [t3.chat](https://t3.chat)
- 🌐 **T3 Stack**: [create.t3.gg](https://create.t3.gg)

---

### 💜✨ One More Time — Go Follow Theo! ✨💜

Seriously, if you found this project useful, go:
1. ⭐ **Star this repo** ⭐
2. 📺 **Subscribe to [Theo's YouTube](https://youtube.com/@t3dotgg)** 🔔
3. 🤖 **Check out [T3 Chat](https://t3.chat)** 💬
4. 🐦 **Follow [@t3dotgg](https://twitter.com/t3dotgg) on Twitter** 🐦

**Theo's content genuinely makes you a better developer!** 🚀🔥💪✨🎉

---

Made with 💜 and lots of ☕ by shoe enthusiasts! 👟✨
