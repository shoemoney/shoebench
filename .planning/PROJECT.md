# ShoeBench

## What This Is

An open source benchmark for vision-capable LLMs on OpenRouter that tests shoe identification ability. Models are shown images of shoes and asked to identify the brand and model name. Results are scored by an LLM-as-judge and ranked across accuracy, cost efficiency, and speed metrics.

## Core Value

Vision models can accurately identify shoe brand and model from product images — the benchmark reliably measures this capability.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inherited from Skatebench foundation. -->

- ✓ Test runner executes LLM tests against multiple models via OpenRouter — existing
- ✓ Results are cached to reduce API costs on re-runs — existing
- ✓ CLI with interactive TUI for test selection and progress tracking — existing
- ✓ Next.js visualizer dashboard displays benchmark results — existing
- ✓ Model leaderboard with rankings and metrics — existing
- ✓ Real-time progress streaming during test execution — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Vision model support: send images as input to OpenRouter vision-capable models
- [ ] LLM-as-judge scoring: another model evaluates if brand+model identification is correct
- [ ] Shoe image scrapers: automated acquisition from StockX, GOAT, Farfetch/SSENSE
- [ ] Shoe test suite: 100-150 shoes with ground truth brand+model labels
- [ ] Difficulty tiers: Easy (iconic) / Medium / Hard (obscure releases)
- [ ] Tier-based accuracy metrics: breakdown by difficulty level
- [ ] Balanced brand coverage: sneakers, designer, vintage, everyday — no single brand dominates
- [ ] Cost efficiency metric: accuracy per dollar spent
- [ ] Speed metric: response time for vision inference

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Mobile app — web-first, CLI + dashboard sufficient for benchmarking
- Real-time model comparison tool — benchmark runs are batch, not interactive
- Shoe price tracking — this is a vision benchmark, not a resale tracker
- User accounts / authentication — open benchmark, no personalization needed
- Historical shoe data / database — only need current images for testing
- Colorway identification — brand+model is the target, colorway adds excessive complexity

## Context

**Foundation:** Builds on existing Skatebench codebase which tests LLMs on skateboard trick identification. The core architecture (test runner, caching, CLI, visualizer) is proven and reusable.

**Technical environment:**
- Bun runtime for CLI/test execution
- TypeScript throughout
- Next.js 16 for visualizer dashboard
- OpenRouter as LLM gateway (already integrated via AI SDK)
- Vision models available through OpenRouter: GPT-4o, Claude 3.5 Sonnet, Gemini Pro Vision, etc.

**Image sources:**
- StockX: Sneaker resale marketplace — great product photography
- GOAT: Sneakers and streetwear — extensive catalog
- Farfetch/SSENSE: Designer and luxury shoes — covers high-end segment

**Difficulty tier logic:**
- Easy: Iconic shoes everyone knows (Air Jordan 1, Stan Smith, Chuck Taylor)
- Medium: Popular but less distinctive (specific Nike Dunk colorways, New Balance 550)
- Hard: Obscure releases, vintage, or designer pieces that require specialist knowledge

## Constraints

- **Tech stack**: Bun + TypeScript + Next.js — maintain consistency with existing codebase
- **API provider**: OpenRouter — already integrated, supports vision models
- **Image hosting**: Local or CDN — scraped images must be accessible to vision models via URL
- **Scraping legality**: Terms of service compliance — scrapers must be respectful (rate limiting, no circumvention)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LLM-as-judge over string matching | Shoe names have many valid variations ("Jordan 1" vs "Air Jordan 1 High" vs "AJ1") | — Pending |
| Scrape catalogs vs manual curation | Need 100-150 shoes with consistent quality images; manual is too slow | — Pending |
| Brand+model only (no colorway) | Colorway identification is much harder and less standardized | — Pending |
| Three difficulty tiers | Provides meaningful breakdown without over-complicating | — Pending |

---
*Last updated: 2026-01-23 after initialization*
