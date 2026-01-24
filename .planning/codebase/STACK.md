# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.x - Used across both `bench` and `visualizer` packages
- TSX/JSX - Used for CLI UI components and React frontend

**Secondary:**
- JavaScript - Configuration files (Next.js, PostCSS, Tailwind configs)

## Runtime

**Environment:**
- Bun (JavaScript runtime) - Primary execution environment for `bench` package
- Node.js 22 - Type definitions available via `@types/node`

**Package Manager:**
- Bun - Handles package management and script execution
- Lockfile: Present (implied by package.json structure)

## Frameworks

**Core:**
- Next.js 16.0.10 - Frontend framework for `visualizer` package
- React 19.x - UI library for both CLI (`bench`) and frontend (`visualizer`)
- Ink 6.5.1 - Terminal UI framework for CLI components in `bench`
- Vercel AI SDK 5.0.107 - LLM abstraction layer for text generation

**Testing:**
- Bun's built-in test framework - Used for `negative-answers.test.ts`

**Build/Dev:**
- Webpack - Next.js build backend (explicitly configured: `--webpack` flag)
- PostCSS 8.5 - CSS processing for Tailwind CSS
- Tailwind CSS 3.4.17 - Utility-first CSS framework

## Key Dependencies

**Critical:**
- `@openrouter/ai-sdk-provider` 1.4.0 - Multi-model LLM provider integration through OpenRouter API
- `@ai-sdk/google` 2.0.46 - Google Gemini/Claude API integration
- `openai` 6.10.0 - Direct OpenAI API client (for provider metadata extraction)

**Infrastructure:**
- `@radix-ui/*` (multiple packages) - Headless UI component library with 25+ primitive components
- `react-hook-form` 7.54.1 - Form state management
- `recharts` latest - Data visualization/charting library
- `zod` 3.24.1 - TypeScript-first schema validation
- `sonner` 1.7.1 - Toast notification library
- `lucide-react` 0.454.0 - Icon library
- `ink-select-input` 6.2.0 - Terminal UI select component
- `ink-text-input` 6.0.0 - Terminal UI text input component
- `embla-carousel-react` 8.5.1 - Carousel component
- `react-resizable-panels` 2.1.7 - Resizable panel layout
- `vaul` 0.9.6 - Drawer component
- `date-fns` 4.1.0 - Date utility functions
- `class-variance-authority` 0.7.1 - Variant pattern CSS generation
- `clsx` 2.1.1 - Conditional className utility
- `cmdk` 1.0.4 - Command palette component
- `next-themes` 0.4.4 - Dark mode/theming support

## Configuration

**Environment:**
- No explicit `.env` files found in repository
- Configuration driven through:
  - `bench/constants.ts` - Hardcoded model list and test parameters
  - Environment variables expected to be set at runtime (not checked in)

**Build:**
- `visualizer/next.config.mjs` - Next.js configuration with Webpack backend
- `visualizer/tsconfig.json` - TypeScript configuration with path aliases (`@/*`)
- `bench/tsconfig.json` - TypeScript configuration targeting ESNext
- `visualizer/tailwind.config.ts` - Tailwind CSS theming configuration
- `visualizer/postcss.config.mjs` - PostCSS configuration

## Platform Requirements

**Development:**
- Bun runtime (latest)
- TypeScript 5.0+
- Node.js 22.7.8+ (for type definitions)

**Production:**
- Benchmark runner (`bench`): Bun runtime
- Visualizer (`visualizer`): Node.js environment for Next.js server OR static export (since `unoptimized: true` in Next.js config suggests potential static deployment)

## Architecture Notes

**Dual-Package Structure:**
- `bench/` - CLI tool with TUI for running LLM benchmarks against multiple models
- `visualizer/` - Next.js web application for viewing benchmark results

**Script Commands:**
- `bench`: `bun --bun run ./cli.tsx` - Starts interactive CLI
- `visualizer build`: `next build --webpack` - Production build
- `visualizer dev`: `next dev --webpack` - Development server

---

*Stack analysis: 2026-01-23*
