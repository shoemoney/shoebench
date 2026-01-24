# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
shoebench/
├── bench/                  # Benchmark runner (Node.js/Bun CLI app)
│   ├── index.ts           # Core test execution engine
│   ├── cli.tsx            # Interactive TUI for test selection and progress
│   ├── constants.ts       # Model configs, concurrency settings
│   ├── tests/             # Test suite definitions (JSON)
│   └── package.json       # Bun/Node dependencies
├── visualizer/            # Next.js web dashboard
│   ├── app/               # App router pages and layout
│   ├── components/        # React components (UI library + custom)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── data/              # Static benchmark data (JSON)
│   ├── styles/            # Global CSS
│   ├── public/            # Static assets
│   └── package.json       # Next.js dependencies
├── .planning/
│   └── codebase/          # GSD planning documents
├── README.md              # Project overview
└── .gitignore
```

## Directory Purposes

**`bench/`:**
- Purpose: Benchmark execution engine and CLI interface
- Contains: TypeScript source for test runner, model configs, interactive UI
- Key files: `index.ts` (test logic), `cli.tsx` (UI), `constants.ts` (models)
- Runtime: Bun (primary), Node.js compatible

**`bench/tests/`:**
- Purpose: Test suite definitions in JSON format
- Contains: Structured benchmarks with system prompts, test cases, expected answers
- Key files: `skate-trick-test.json`, `uploadthing-test.json`
- Format: `{ name, description, system_prompt, tests: [{prompt, answers, negative_answers?}] }`

**`visualizer/`:**
- Purpose: Web dashboard for viewing benchmark results
- Contains: Next.js app with React components, styles, data
- Framework: Next.js 16 with App Router
- Build: Webpack (specified in scripts)

**`visualizer/app/`:**
- Purpose: Next.js app router pages and layout
- Key files: `page.tsx` (main dashboard), `layout.tsx` (HTML root)

**`visualizer/components/`:**
- Purpose: React UI components
- `ui/` subdirectory: Radix UI primitive wrappers (Card, Button, Tabs, etc.)
- Custom: `theme-provider.tsx` for theme context

**`visualizer/hooks/`:**
- Purpose: Custom React hooks
- Key files: `use-mobile.tsx` (responsive breakpoint detection), `use-toast.ts`

**`visualizer/lib/`:**
- Purpose: Utility functions
- Key files: `utils.ts` (TailwindCSS class merging with `cn()`)

**`visualizer/data/`:**
- Purpose: Static benchmark results
- Key files: `benchmark-results.json` (pre-computed rankings, imported at build time)

**`visualizer/styles/`:**
- Purpose: Global CSS and TailwindCSS config
- Key files: `globals.css`, `tailwind.config.ts`

**`.planning/codebase/`:**
- Purpose: GSD documentation (generated)
- Contains: ARCHITECTURE.md, STRUCTURE.md, etc.

## Key File Locations

**Entry Points:**
- `bench/cli.tsx`: Interactive test runner (run: `bun run cli`)
- `bench/index.ts`: Programmatic test API (exports `testRunner()`, `loadSuiteFromFile()`)
- `visualizer/app/page.tsx`: Web dashboard (rendered at `/`)

**Configuration:**
- `bench/constants.ts`: Model definitions, concurrency limits, timeouts
- `visualizer/tailwind.config.ts`: TailwindCSS theme and plugin config
- `visualizer/tsconfig.json`: TypeScript compiler options, path aliases (`@/*`)

**Core Logic:**
- `bench/index.ts`: Test execution pipeline (lines 586-1235: `testRunner()` function)
- `bench/index.ts`: Result caching (lines 507-584: `writeCacheEntry()`)
- `bench/index.ts`: Cache lookup (lines 260-419: `findPreviousResultsForSuite()`)

**Testing:**
- `bench/tests/*.json`: Test suite definitions
- `bench/negative-answers.test.ts`: Test validation (not analyzed in detail)

## Naming Conventions

**Files:**
- `.ts` for Node.js scripts and utilities
- `.tsx` for React components
- `.json` for test suites and benchmark data
- PascalCase for component files: `theme-provider.tsx`
- kebab-case for hooks: `use-mobile.tsx`

**Directories:**
- lowercase singular for feature areas: `bench`, `visualizer`, `data`, `lib`
- plural for component/file collections: `components`, `hooks`
- `tests/` for test suites (JSON data)
- `ui/` for primitive components

**Functions/Exports:**
- camelCase for functions and variables
- PascalCase for React components and TypeScript interfaces
- UPPER_CASE for constants: `MAX_CONCURRENCY`, `OUTPUT_DIRECTORY`

**Test Suites:**
- kebab-case with `-test.json` suffix: `skate-trick-test.json`

**Cache/Results:**
- Timestamp format: ISO string with colons replaced by hyphens: `2026-01-23T15-30-45-123Z`
- Filenames: `{model}__{runNumber}__{signatureHash}__{timestamp}.json`
- Directory structure: `results/{suiteId}/{version}/*.json`

## Where to Add New Code

**New Test Suite:**
- Location: `bench/tests/{name}-test.json`
- Structure: Follow format in `skate-trick-test.json`
- Required fields: `name`, `system_prompt`, `tests` array
- Optional: `description`, `id` (for suite identification)

**New Model/LLM:**
- Location: `bench/constants.ts`, in `modelsToRun` array
- Pattern: Add object with `name`, `llm` (LanguageModel), optional `providerOptions`, `reasoning`
- Example: `{ name: "my-model", llm: openrouter("provider/model"), reasoning: true }`

**New CLI Feature:**
- Location: `bench/cli.tsx`
- Pattern: React component that hooks into `testRunner()` events
- State management: Use `useState` and `useEffect` hooks
- UI framework: Ink components (`Box`, `Text`, `SelectInput`, `TextInput`)

**New Dashboard Section/Chart:**
- Location: `visualizer/app/page.tsx` (or split into `visualizer/components/`)
- Data source: Import from `benchmark-results.json`
- UI pattern: Use Radix UI primitives + Recharts for charts
- Styling: TailwindCSS classes (merge with `cn()` utility)

**New UI Component:**
- Location: `visualizer/components/ui/` for primitives, or `visualizer/components/` for custom
- Pattern: Radix UI wrapper or custom React component
- Import from Radix: `@radix-ui/react-{component}`
- Styling: TailwindCSS with CSS modules or inline

**New Hook:**
- Location: `visualizer/hooks/use-{name}.ts` or `.tsx`
- Pattern: Custom React hook that returns state/handlers
- Example: `use-mobile.tsx` - detects mobile breakpoint

**Utility Function:**
- Location: `visualizer/lib/utils.ts` (existing file) or new file
- Pattern: Pure functions, no React dependencies
- Export from: `lib/utils.ts` for reuse

## Special Directories

**`results/`:**
- Purpose: Benchmark execution results and cache
- Generated: Yes (created at runtime)
- Committed: No (in .gitignore)
- Structure:
  - `results/{suiteId}/{version}/test-results-{timestamp}.json` - aggregated results
  - `results/{suiteId}/{version}/summary-{timestamp}.json` - summary statistics
  - `results/cache/{suiteId}/{version}/{model}__{hash}__{timestamp}.json` - per-run cache

**`visualizer/.next/`:**
- Purpose: Next.js build output and server files
- Generated: Yes (created by `next build`)
- Committed: No (in .gitignore)

**`visualizer/node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (created by package manager)
- Committed: No (in .gitignore)

**`bench/node_modules/`:**
- Purpose: Installed dependencies for CLI
- Generated: Yes (created by bun install)
- Committed: No (in .gitignore)

## Import Path Aliases

**Visualizer:**
- `@/*` resolves to `visualizer/` (configured in `visualizer/tsconfig.json`)
- Example: `import { Card } from "@/components/ui/card"`

---

*Structure analysis: 2026-01-23*
