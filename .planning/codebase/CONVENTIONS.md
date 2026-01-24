# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- TypeScript/React source files use `.ts` or `.tsx` extensions
- Component files use `.tsx` for React components: `theme-provider.tsx`, `page.tsx`
- Non-component TypeScript files use `.ts`: `index.ts`, `constants.ts`
- Test files use `.test.ts` pattern: `negative-answers.test.ts`
- UI components placed in `components/ui/` directory with short descriptive names: `button.tsx`, `card.tsx`, `alert-dialog.tsx`

**Functions:**
- Use camelCase for all function names: `isCorrect`, `computeSuiteId`, `generateMarkdownReport`, `findTestSuites`, `ensureRefUnref`
- Private/internal functions may use double underscore prefix: `internal__testRun` (see `index.ts` line 173)
- Async functions explicitly named with async keyword: `async function runTest`, `async function testRunner`

**Variables:**
- camelCase for all variables: `modelStats`, `testResults`, `workQueue`, `previousMap`, `startTime`
- Constants in UPPER_SNAKE_CASE: `MAX_CONCURRENCY`, `TEST_RUNS_PER_MODEL`, `TIMEOUT_SECONDS`, `OUTPUT_DIRECTORY`, `MOBILE_BREAKPOINT`
- Props destructured with camelCase: `{ completed, total }`, `{ className, ...props }`
- Type parameters use PascalCase: `T`, `R`, `HTMLElement`, `ComponentPropsWithoutRef`

**Types:**
- Type aliases in PascalCase: `TestCase`, `TestSuite`, `WorkItem`, `PreviousResultEntry`, `RunnerEvent`
- Interface names in PascalCase (though not prevalent): `ModelData`
- Discriminated union types use `type` field: `RunnerPlanEvent`, `RunnerStartEvent`, `RunnerDoneEvent` (all with `type: "plan"`, `type: "start"`, etc.)
- Optional properties marked with `?`: `negative_answers?: string[]`, `silent?: boolean`

## Code Style

**Formatting:**
- No explicit prettier configuration found; inferred style from codebase:
- Indentation: 2 spaces (observed in all `.tsx` and `.ts` files)
- Line length: No strict limit enforced, but typically under 120 characters
- Trailing commas in multiline structures
- Semicolons used consistently in TypeScript files
- Single quotes in JavaScript/TypeScript: `'use client'`, `'next-themes'`
- Double quotes in JSX attributes and strings: `"use client"`, template literals for dynamic strings

**Linting:**
- No `.eslintrc` file detected in project
- TypeScript strict mode enabled in `tsconfig.json`: `"strict": true`
- Some strict flags disabled: `"noUnusedLocals": false`, `"noUnusedParameters": false` (allows flexibility during development)
- Next.js linting configured in visualizer: `lint: "next lint"`

## Import Organization

**Order:**
1. External library imports (Node.js, React, third-party packages): `import React from "react"`, `import { generateText } from "ai"`
2. Type imports: `import { type RunnableModel } from "./constants"`
3. Local imports: `import { testRunner } from "./index"`, `import { Button } from "@/components/ui/button"`
4. Side effects (rarely used)

**Path Aliases:**
- Visualizer uses `@/*` alias pointing to project root (see `tsconfig.json` paths)
- Usage: `import { cn } from "@/lib/utils"`, `import { Button } from "@/components/ui/button"`
- Bench package does not use path aliases, imports are relative: `./constants`, `./index`

**Special imports:**
- React imports use named imports for hooks and utilities
- Default imports for main modules: `import { render, Box, Text } from "ink"`
- Type-safe imports with `type` keyword for TypeScript types: `import type { TestSuite, RunnerEvent }`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: `try { ... } catch (error) { ... }`
- Type narrowing on errors: `error instanceof Error ? error.message : String(error)` (line 841)
- Silent mode support: check `!silent` before logging errors
- Specific error handling for missing data: early returns or continue statements in loops
- Promise.race() for timeout management: `Promise.race([internal__testRun(), timeoutPromise])` (line 242)
- Cleanup in finally blocks: `if (timeoutId) clearTimeout(timeoutId)`
- Swallowing non-critical errors with empty catch blocks: `catch {}` for file system operations (line 285, 345)
- Error rethrow for critical issues: `if (e instanceof Error) throw e;` to distinguish cached vs. transient errors (line 413)

## Logging

**Framework:** Console API (console.log, console.error, console.warn)

**Patterns:**
- Conditional logging based on `silent` flag: `if (!silent) console.log(...)`
- Progress indicators using symbols: `✓` (checkmark), `✗` (X), `↺` (rotate arrow)
- Structured logging with key information: model name, test index, duration, status
- Error logging with context: `console.error(`Test failed for model ${model.name}:`, error)`
- Console metadata logging (debug): `console.log("PROVIDER METADATA", testResult.providerMetadata)` (line 201)

## Comments

**When to Comment:**
- Inline comments for non-obvious logic: `// Add upstream cost for when we BYOK` (line 204)
- Block comments for disabled code: `// openrouter: { ... }` (lines 182-186)
- Comments explaining intent, not what code does: "Safety check" comments before validation logic (line 699)
- Comments on data structure notes: `// Note: Errors are NOT cached so they will be retried on next run` (line 856)

**JSDoc/TSDoc:**
- Not extensively used in codebase; only used where helpful for exported APIs
- Exported functions document parameter types via TypeScript signatures
- Test files include describe/test labels as documentation

## Function Design

**Size:** Functions typically 20-100 lines; larger functions like `testRunner` (line 586) broken into smaller internal functions or use helper functions

**Parameters:**
- Destructured object parameters for complex inputs: `{ completed, total }`, `{ model, system_prompt, prompt, answers, negative_answers }`
- Single parameter objects preferred over multiple parameters
- Optional parameters at end of object: `silent?: boolean`, `onEvent?: (event: RunnerEvent) => void`

**Return Values:**
- Explicit return types in async functions: `async function runTest(...): Promise<{...}>`
- Union types for discriminated unions: `RunnerEvent = RunnerPlanEvent | RunnerStartEvent | ...`
- Array returns for multiple items: `Promise<Map<string, PreviousResultEntry[]>>`

## Module Design

**Exports:**
- Named exports for reusable functions: `export async function testRunner`, `export async function loadSuiteFromFile`
- Type exports with `export type`: `export type TestCase`, `export type RunnerEvent`
- Mixed exports (both types and functions) in same file: `index.ts` exports TestSuite type and testRunner function

**Barrel Files:**
- UI components barrel file in `components/ui/` with individual imports
- Re-export pattern: `export { AlertDialog }` from component primitives
- Not heavily used for grouping; mostly individual file imports

## React Patterns

**Component Structure:**
- Use Client directive: `'use client'` for client-side components in Next.js
- Functional components with hooks: `useState`, `useEffect`, `useMemo`
- Forward refs for UI primitives: `React.forwardRef<RefType, PropsType>`
- Display names for debugging: `Component.displayName = "ComponentName"`

**Hook Usage:**
- Custom hooks extracted to separate files: `use-mobile.tsx`, `use-toast.ts`
- Hook prefixed with `use`: `useIsMobile()`, `useBenchRoot()`
- React.memo for performance optimization where needed (not extensively used)

**Component Props:**
- Destructured props with spread syntax: `{ className, ...props }`
- ComponentPropsWithoutRef for native elements: `ComponentPropsWithoutRef<"svg">`
- Type definitions at top of file for complex props

## Testing Patterns

**Structure:**
- Test runner from Bun runtime: `import { expect, test, describe } from "bun:test"`
- Describe blocks for grouping related tests
- Nested describes for sub-categories: "Case Sensitivity", "Negative Answer Override", "Edge Cases"
- Test naming: descriptive strings starting with "should": "should pass when result contains correct answer"

**Assertions:**
- Simple expect assertions: `expect(result).toBe(true)`, `expect(result).toBe(false)`

---

*Convention analysis: 2026-01-23*
