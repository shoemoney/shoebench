# 👟 ShoeBench 👟

> An open source benchmark for vision-capable LLMs that tests shoe brand and model identification ability! 🎯

Models are shown images of shoes and asked to identify the brand and model name. Results are scored by an LLM-as-judge and ranked across accuracy, cost efficiency, and speed metrics. 📊

---

## 🙏 Credits & Inspiration

This project is **heavily inspired by** and built on top of the incredible work of **[Theo Brown](https://twitter.com/t3dotgg)** 🐐

### 💜 Massive Thanks To Theo For:

- 🎬 **[His YouTube Channel](https://youtube.com/@t3dotgg)** — Absolute gold mine of web dev content! If you're not subscribed, what are you even doing?? Go subscribe NOW! 📺
- 🤖 **[T3 Chat](https://t3.chat)** — His amazing AI chat application that's absolutely cracked! Seriously check it out if you haven't! 💬✨
- 🛹 **SkateBench** — The original benchmark this project is forked from! Theo's skateboard trick identification benchmark was the foundation for everything here! 🔥
- 🧠 **The T3 Stack Philosophy** — Type safety, great DX, and shipping fast! 🚀

**Theo is genuinely one of the best content creators in the web dev space!** His streams, videos, and takes are always entertaining AND educational. The man ships more in a week than most do in a month! 💪

---

## ✨ Features

- 👟 **125-shoe dataset** with ground truth labels and difficulty tiers (Easy/Medium/Hard)
- 👁️ **Vision model testing** via OpenRouter (GPT-4o, Claude 3.5, Gemini, etc.)
- ⚖️ **LLM-as-judge scoring** with 4-tier evaluation (Exact, Variant, Brand Only, Wrong)
- 💾 **Result caching** to reduce API costs on re-runs
- 📈 **Interactive dashboard** with leaderboard, charts, and error analysis

---

## 🚀 Quick Start

### 📋 Prerequisites

- 🥟 [Bun](https://bun.sh) runtime (v1.0+)
- 💚 [Node.js](https://nodejs.org) (v20+) for the visualizer
- 🔑 OpenRouter API key

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/shoemoney/shoebench.git
cd shoebench

# Install bench dependencies
cd bench && bun install

# Install visualizer dependencies
cd ../visualizer && npm install
```

### ⚙️ Configuration

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 🏃 Run the Benchmark

```bash
cd bench

# 🚀 FULL PIPELINE (recommended) - vision + judge + export
bun run all              # All 173 models × all shoes 🔥🔥🔥
bun run quick            # Quick test (3 models × 5 shoes) ⚡
bun run free             # Free models only (no API cost!) 🆓

# 📊 BY TIER - choose your budget
bun run vision:premium   # 15 best models (GPT-5, Claude Opus, etc.) 👑
bun run vision:mid       # 16 balanced models (great quality/cost) ⚖️
bun run vision:budget    # 13 cheapest models 💸
bun run vision:free      # 8 free models (zero cost!) 🆓

# 🎯 INDIVIDUAL STEPS
bun run vision           # Run vision benchmark (20 shoes default)
bun run vision:all       # All 173 models × all 89 shoes
bun run judge            # Score results with LLM-as-judge
bun run export           # Export for visualizer
```

### 👀 View Results

```bash
# Start dashboard 🎨
cd visualizer && npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Architecture

```
shoebench/
├── 🧪 bench/                    # Benchmark runner
│   ├── vision-runner.ts         # Vision model testing
│   ├── judge-runner.ts          # LLM-as-judge evaluation
│   ├── cache.ts                 # SQLite caching layer
│   └── results/                 # Raw benchmark results
├── 📁 dataset/
│   ├── catalog.json             # 125 shoes with metadata
│   └── images/                  # Downloaded shoe images
└── 🎨 visualizer/               # Next.js dashboard
    ├── app/page.tsx             # 6-tab dashboard
    ├── lib/aggregation/         # Metrics calculations
    └── data/                    # Aggregated results JSON
```

---

## 📊 Dashboard Tabs

| Tab | Description |
|-----|-------------|
| 🏆 **Leaderboard** | Models ranked by overall accuracy |
| 📊 **Tiers** | Accuracy breakdown by difficulty (Easy/Medium/Hard) |
| 💰 **Cost** | Total cost comparison per model |
| ⚡ **Speed** | Average latency comparison |
| 📈 **Cost vs Accuracy** | Scatter plot with efficiency metric |
| ❌ **Errors** | Error analysis table with inline shoe images |

---

## ⚖️ Scoring System

The LLM-as-judge evaluates each response with a 4-tier system:

| Tier | Score | Description |
|------|-------|-------------|
| ✅ **Exact** | 100 | Perfect brand and model match |
| 🎯 **Variant** | 75 | Correct identification with name variation (e.g., "AJ1" = "Air Jordan 1") |
| 🏷️ **Brand Only** | 50 | Correct brand, wrong or missing model |
| ❌ **Wrong** | 0 | Incorrect brand |

---

## 🎚️ Difficulty Tiers

- 🟢 **Easy**: Iconic shoes everyone recognizes (Air Jordan 1, Stan Smith, Chuck Taylor)
- 🟡 **Medium**: Popular but less distinctive (specific Nike Dunk colorways, New Balance 550)
- 🔴 **Hard**: Obscure releases, vintage, or designer pieces requiring specialist knowledge

---

## 🤖 Supported Models (173 Total!) 🤯

ShoeBench tests **ALL 173 vision-capable models** on OpenRouter! Here's the full lineup:

### 🧠 OpenAI (40+ models)
GPT-5.2, GPT-5.2-Pro, GPT-5.1, GPT-5, GPT-5-Pro, GPT-5-Mini, GPT-5-Nano, GPT-4o, GPT-4o-mini, GPT-4.1, GPT-4-Turbo, o4-mini, o3, o3-Pro, o1, o1-Pro, Codex-Mini, and more!

### 🟠 Anthropic (15 models)
Claude Opus 4.5, Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4.5, Claude Sonnet 4, Claude Haiku 4.5, Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Haiku, Claude 3 Sonnet, Claude 3 Opus

### 🔵 Google (30+ models)
Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash, Gemini Pro 1.5, Gemma 3 (27B, 12B, 4B, 1B), and experimental versions!

### ⚡ xAI (5 models)
Grok 4.1 Fast, Grok 4 Fast, Grok 4, Grok 2 Vision, Grok Vision Beta

### 🦙 Meta (5 models)
Llama 4 Maverick, Llama 4 Scout, Llama Guard 4, Llama 3.2 90B Vision, Llama 3.2 11B Vision

### 🐼 Qwen (14 models)
Qwen3-VL 235B, Qwen3-VL 32B, Qwen3-VL 8B, Qwen2.5-VL 72B/32B/3B, Qwen-VL Max/Plus

### 🇫🇷 Mistral (11 models)
Mistral Large, Mistral Medium 3.1/3, Mistral Small 3.2/3.1, Ministral 14B/8B/3B, Pixtral Large/12B

### 🌍 And Many More!
- **ByteDance**: Seed 1.6, UI-TARS 72B/7B, Seedream 4.5
- **Amazon**: Nova Premier, Nova Pro, Nova Lite
- **Perplexity**: Sonar Pro, Sonar, Sonar Reasoning Pro
- **NVIDIA**: Nemotron Nano 12B
- **Baidu**: ERNIE 4.5-VL (424B, 28B)
- **OpenGVLab**: InternVL3 (78B, 14B, 2B)
- **Microsoft**: Phi-4 Multimodal
- **Z.AI**: GLM 4.6v, GLM 4.5v
- **StepFun**: Step3
- **Arcee**: Spotlight
- **DeepCogito**: Cogito v2 Preview
- **01.AI**: Yi Vision
- **Moonshot**: Kimi-VL
- **AllenAI**: Molmo 2 8B (FREE!)
- **NousResearch**: Nous Hermes 2 Vision
- **Fireworks**: FireLLaVA 13B
- **LiuHaotian**: LLaVA Yi 34B, LLaVA 13B
- **OpenRouter Experimental**: Horizon, Optimus, Quasar, Polaris, and more!

---

## 🛠️ CLI Options

```bash
# Vision benchmark 👁️
bun run ./run-vision-benchmark.ts [options]
  --quick           Use 3 fastest models, 5 shoes ⚡
  --tier=TIER       Model tier: budget, mid, premium, free 💰
  --shoes=N         Number of shoes to test (default: 20)
  --model=NAME      Test specific model only
  --no-cache        Skip cache, force fresh API calls

# Judge benchmark ⚖️
bun run ./run-judge-benchmark.ts [options]
  --vision <file>   Specific vision results file
  --no-cache        Skip judge cache
```

### 🎚️ Model Tiers

| Tier | Models | Use Case |
|------|--------|----------|
| 👑 **Premium** | 15 models | Best accuracy (GPT-5, Claude Opus, Gemini Pro) |
| ⚖️ **Mid** | 16 models | Great balance of quality and cost |
| 💸 **Budget** | 13 models | Cheapest options for high-volume testing |
| 🆓 **Free** | 8 models | Zero cost! Perfect for testing |

---

## 💻 Development

```bash
# Type check ✅
cd bench && bun run typecheck

# Build visualizer 🏗️
cd visualizer && npm run build
```

---

## 📸 Data Sources

Shoe images sourced from:
- 🏀 StockX (sneakers)
- 👟 GOAT (sneakers and streetwear)
- 👠 Farfetch (designer/luxury)

---

## 📜 License

MIT 📄

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR! 🙌

---

## 🔗 Links

- 🐦 **Theo's Twitter**: [@t3dotgg](https://twitter.com/t3dotgg)
- 📺 **Theo's YouTube**: [youtube.com/@t3dotgg](https://youtube.com/@t3dotgg)
- 💬 **T3 Chat**: [t3.chat](https://t3.chat)
- 🌐 **T3 Stack**: [create.t3.gg](https://create.t3.gg)

---

### 💜 One More Time — Go Follow Theo!

Seriously, if you found this project useful, go:
1. ⭐ Star this repo
2. 📺 Subscribe to [Theo's YouTube](https://youtube.com/@t3dotgg)
3. 🤖 Check out [T3 Chat](https://t3.chat)
4. 🐦 Follow [@t3dotgg](https://twitter.com/t3dotgg) on Twitter

**Theo's content genuinely makes you a better developer!** 🚀🔥💪
