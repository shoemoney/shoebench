# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**LLM Providers (via OpenRouter):**
- OpenRouter API - Unified interface for multiple LLM models
  - SDK/Client: `@openrouter/ai-sdk-provider` 1.4.0
  - Auth: Environment variable (not explicitly named in code, likely `OPENROUTER_API_KEY`)
  - Models served: 30+ models including OpenAI, Anthropic, Google, DeepSeek, Grok, Moonshot, etc.

**Google APIs:**
- Google Gemini (via OpenRouter) - Accessed through `@ai-sdk/google` 2.0.46
  - Metadata extraction: Handles usage tokens from Google provider metadata
  - Provider-specific metadata: `providerMetadata.google.usageMetadata` for token counts

**OpenAI (Direct):**
- OpenAI API - Direct client available via `openai` 6.10.0 package
  - Used for: Provider metadata extraction (cost tracking)
  - Note: Benchmarks primarily use OpenAI models via OpenRouter, but direct client available

## Data Storage

**Databases:**
- Not applicable - No database integration detected

**File Storage:**
- Local filesystem only
  - Results written to: `./results/` directory structure
  - Cache stored in: `./results/cache/{suiteId}/{version}/{model}__run{n}__*.json`
  - Summary files: `./results/{suiteId}/{version}/summary-*.json`
  - Test results: `./results/{suiteId}/{version}/test-results-*.json`
  - Markdown reports: `./results/{suiteId}/{version}/test-results-*.md`

**Frontend Data:**
- Visualizer reads static benchmark-results.json from `visualizer/data/benchmark-results.json`

**Caching:**
- None (no caching service) - Local file-based caching of test results

## Authentication & Identity

**Auth Provider:**
- Custom API key authentication
  - OpenRouter API Key: Environment variable (assumed `OPENROUTER_API_KEY`)
  - Implementation: SDK handles key injection via environment
  - Code location: `bench/constants.ts` - `openrouter()` provider initialization

**Provider-Specific Headers:**
- Usage tracking enabled via `defaultProviderOptions.usage.include: true` in `bench/constants.ts`
- Reasoning effort configuration: Per-model `providerOptions.reasoning.effort` settings

## Monitoring & Observability

**Error Tracking:**
- None (no integration detected)
- Manual error handling: Try/catch blocks in `bench/index.ts`

**Logs:**
- Console logging via `console.log()` and `console.error()`
- Structured output to terminal via Ink CLI framework
- File-based event tracking: JSON test results saved to `./results/`

**Metrics Collected:**
- Cost per test (extracted from provider metadata)
- Duration per test run
- Token counts (completion tokens, sometimes thinking tokens for reasoning models)
- Success/failure rates
- TPS (tokens per second) calculations in summary

## CI/CD & Deployment

**Hosting:**
- Not detected - Benchmark tool appears designed for local/manual execution
- Visualizer can be deployed as static Next.js export (suggested by `images.unoptimized: true`)

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `OPENROUTER_API_KEY` - OpenRouter API authentication (implicit, not validated in code)

**Optional env vars:**
- None explicitly detected in code review
- Model selection hardcoded in `bench/constants.ts`

**Secrets location:**
- Runtime environment variables (not committed to repository)
- `.gitignore` present (prevents accidental secret commits)

## Model Configuration

**Configured Models (bench/constants.ts):**

AI SDK Provider Models:
- Moonshot Kimi (k2-thinking, k2)
- Alibaba Qwen (qwen3-32b, qwen3-235b with thinking)
- Zhipu GLM (glm-4.5, glm-4.5v with variants)
- DeepSeek (v3.1, v3.2, r1-0528)
- OpenAI GPT series (4.1, 4o, 5, 5-mini, 5-nano, 5.1, 5.2 variants)
- OpenAI o-series (o3, o3-pro, o4-mini)
- Anthropic Claude (4-sonnet, 4-opus, 4.5-opus, 4.5-sonnet variants)
- Google Gemini (2.5-pro, 2.5-flash, 3-pro, 3-flash variants)
- Grok (4, 4.1-fast, 3-mini)

**Model Capabilities:**
- Reasoning enabled: Configurable per-model via `reasoning` flag
- Effort levels: minimal, low, default, high, xhigh per model
- Temperature: Fixed at 1.0 for all tests
- Timeout: 400 seconds per test (from `TIMEOUT_SECONDS`)

## Webhook Integration

**Incoming:**
- Not applicable

**Outgoing:**
- Not applicable

## Data Flow

**Test Execution Pipeline:**
1. CLI loads test suite from JSON file
2. Batch creates work items (test × model combinations)
3. For each work item:
   - Check cache for previous result
   - If cached: reuse result
   - If not: Call LLM via Vercel AI SDK with model provider
4. Extract cost/token metadata from provider response
5. Save to local cache
6. Aggregate results to JSON summary
7. Visualizer reads summary and renders charts

**Cost Tracking:**
- Extracts from `providerMetadata.openrouter.usage.costDetails.upstreamInferenceCost`
- Falls back to `providerMetadata.openrouter.usage.cost` if upstream cost unavailable
- Token counts: Preferentially uses Google provider metadata when available, falls back to standard usage

---

*Integration audit: 2026-01-23*
