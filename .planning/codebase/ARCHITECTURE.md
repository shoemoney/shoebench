# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Monorepo with two distinct applications - a CLI-based benchmark runner and a Next.js web dashboard for visualization.

**Key Characteristics:**
- Task-driven architecture: CLI orchestrates LLM API calls through the `ai` SDK against structured test suites
- Event-driven result handling: Streaming events from test runner to CLI UI in real-time
- Cache-based optimization: Results are cached and reused across test runs to reduce API costs
- Static data visualization: Dashboard consumes pre-computed benchmark results from JSON

## Layers

**Test Suite Definition Layer:**
- Purpose: Define benchmarks with prompts, expected answers, and negative answers
- Location: `bench/tests/*.json`
- Contains: Structured test data with descriptions, system prompts, test cases
- Depends on: Nothing (static data)
- Used by: Test runner (`bench/index.ts`)

**Core Test Execution Layer:**
- Purpose: Execute LLM tests, manage concurrency, track results, handle caching
- Location: `bench/index.ts`
- Contains: `testRunner()` function, test execution pipeline, result aggregation
- Depends on: `ai` SDK (generateText), OpenRouter provider, file system (fs/promises)
- Used by: CLI (`bench/cli.tsx`)

**Model Configuration Layer:**
- Purpose: Centralize model definitions and provider options
- Location: `bench/constants.ts`
- Contains: `modelsToRun` array with LLM configurations, concurrency settings, timeouts
- Depends on: `ai` SDK, OpenRouter provider
- Used by: Test execution layer

**CLI/TUI Layer:**
- Purpose: Interactive terminal UI for test selection, versioning, and progress tracking
- Location: `bench/cli.tsx`
- Contains: React components using Ink for terminal rendering
- Depends on: Test runner, Ink framework, file system
- Used by: User (entry point via `bun run cli`)

**Visualization/Dashboard Layer:**
- Purpose: Web-based dashboard for browsing benchmark results
- Location: `visualizer/app/page.tsx`
- Contains: Next.js app router page, charting components, filtering/sorting logic
- Depends on: Static benchmark data JSON, Recharts for visualizations, Radix UI
- Used by: Browser

**UI Component Library:**
- Purpose: Reusable UI primitives built from Radix UI
- Location: `visualizer/components/ui/`
- Contains: Card, Button, Tabs, Dropdown, ScrollArea, etc.
- Depends on: Radix UI, TailwindCSS
- Used by: Dashboard page

## Data Flow

**Test Execution Flow:**

1. User selects test suite and version via CLI interactive menu (`cli.tsx`)
2. `testRunner()` initializes with suite and checks for cached results
3. Work queue is built: (model × test × runs) items
4. Cache lookup determines which tests can be reused vs executed
5. Reuse jobs load from `results/cache/{suiteId}/{version}/*.json`
6. Execute jobs run through `runTest()` → `generateText()` (via ai SDK) → LLM API
7. Each result is written to cache immediately: `results/cache/{suiteId}/{version}/{model}__{hash}__{timestamp}.json`
8. Events emitted: "plan", "start", "done"/"error"/"reuse"
9. CLI UI updates in real-time from events
10. Final aggregated results written to `results/{suiteId}/{version}/test-results-{timestamp}.json`
11. Summary statistics computed and saved to `summary-{timestamp}.json`

**Visualization Flow:**

1. Static `visualizer/data/benchmark-results.json` contains pre-computed rankings
2. Dashboard page loads data at build time
3. User can filter models, sort by metrics, view charts
4. Charts render with Recharts (success rate, cost vs speed, etc.)

**State Management:**

- Test Runner: Event-based state updates
- CLI: React hooks (`useState`, `useEffect`) track selected suite, version, and per-model stats
- Dashboard: Client-side filtering stored in component state (selected models, sort order)

## Key Abstractions

**TestSuite:**
- Purpose: Structured definition of a benchmark with tests
- Example: `skate-trick-test.json` - skateboard trick naming tests
- Pattern: JSON files with name, description, system_prompt, tests array
- File location: `bench/tests/*.json`

**TestCase:**
- Purpose: Individual test with prompt, expected answers, negative answers
- Pattern: Object with `prompt`, `answers`, and optional `negative_answers`
- Used in: Each test suite contains array of TestCase objects

**RunnableModel:**
- Purpose: Configuration wrapper for an LLM with provider options
- Pattern: Type in `bench/constants.ts` with name, llm (LanguageModel), providerOptions
- Example: `{ name: "gpt-5-high", llm: openrouter(...), reasoning: true }`

**RunnerEvent:**
- Purpose: Stream test execution status to CLI UI
- Pattern: Union type with variants: "plan", "start", "done", "error", "reuse"
- Flow: `testRunner()` emits via `onEvent` callback → CLI `setStats()` updates

**PreviousResultEntry:**
- Purpose: Cached result record for deduplication
- Pattern: Stored as JSON with model, prompt, answers, text, correctness, cost, tokens
- Location: `results/cache/{suiteId}/{version}/{model}__{hash}__{timestamp}.json`

## Entry Points

**CLI Entry:**
- Location: `bench/cli.tsx` (executed via `bun run cli`)
- Triggers: User runs `bun --bun run ./cli.tsx`
- Responsibilities:
  - Scan `bench/tests/` for test suite JSON files
  - Present interactive menu for suite selection
  - Prompt for version label
  - Invoke `testRunner()` with selected suite
  - Render real-time progress table via Ink components
  - Listen to runner events and update state

**Direct API Entry:**
- Location: `bench/index.ts` exports `testRunner()` and `loadSuiteFromFile()`
- Triggers: Programmatic calls (e.g., from tests)
- Responsibilities:
  - Load test suites from JSON
  - Execute tests with configurable options
  - Emit events for progress tracking
  - Persist results and cache

**Dashboard Entry:**
- Location: `visualizer/app/page.tsx`
- Triggers: User visits web URL (Next.js dev server or production build)
- Responsibilities:
  - Load benchmark results JSON
  - Render model rankings table
  - Display cost vs performance scatter plot
  - Filter and sort models by metrics

## Error Handling

**Strategy:** Exceptions bubble to caller; failed tests recorded separately.

**Patterns:**

- Test timeout: Catch via `Promise.race()` timeout promise; emit "error" event
- API errors: Caught in `runTest()`, error object logged, test result includes error field
- Cache mismatches: Throw error if cached entry differs from current test definition
- File I/O: Wrapped in try/catch, silent failures for cache reads (no break execution)
- Malformed JSON: Caught when loading suites; continues with next file

## Cross-Cutting Concerns

**Logging:**
- Console.log used in test runner (verbose when `silent: false`)
- CLI may emit debug info on runner events
- Error messages printed with prefixes like "✓", "✗", "↺"

**Validation:**
- Test suite structure validated when loading (checks name, system_prompt, tests array)
- Test signature computed with `computeTestSignature()` to detect changes
- Cache entries validated for system prompt, prompt, answers, negative_answers match

**Authentication:**
- OpenRouter API key required (passed via environment)
- No explicit auth handling in code; delegated to `ai` SDK and OpenRouter provider
- Cost/usage tracking via `providerMetadata` in response

**Caching:**
- Two-tier: per-run cache files in `cache/` subdirectory, aggregated results in main results directory
- Cache keyed by test signature (SHA1 hash of normalized test definition)
- Timestamp-based filenames to preserve history
- Version-scoped caching: separate cache per version label

---

*Architecture analysis: 2026-01-23*
