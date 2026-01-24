# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework

**Runner:**
- Bun test framework (built-in test runtime)
- Version: Latest (specified as "latest" in `package.json` for `@types/bun`)
- Config: No separate config file; tests run with `bun run` command
- Minimal setup required - tests import directly from `bun:test`

**Assertion Library:**
- Bun's built-in expect API with `.toBe()` method
- No external assertion library needed

**Run Commands:**
```bash
# Not explicitly configured in package.json scripts
# Inferred approach: bun run negative-answers.test.ts
```

**Test File Location:**
- Test files placed in same directory as source code (co-located pattern)
- Naming convention: `[feature].test.ts`
- Example: `negative-answers.test.ts` tests functionality related to negative answer evaluation

## Test File Organization

**Location:**
- Co-located: Tests live alongside source code in same directory
- Example: `/Users/shoemoney/Projects/shoebench/bench/` contains both `index.ts` and `negative-answers.test.ts`

**Naming:**
- Feature-based naming: `negative-answers.test.ts` describes what's being tested
- Pattern: `[feature-name].test.ts`

**Structure:**
```
bench/
├── index.ts                    # Main implementation
├── cli.tsx                     # CLI implementation
├── constants.ts                # Configuration
└── negative-answers.test.ts    # Tests for negative answer logic
```

## Test Structure

**Suite Organization:**
```typescript
import { expect, test, describe } from "bun:test";

describe("Negative Answers Feature", () => {
  describe("Case Sensitivity", () => {
    test("should pass when result contains correct answer with different capitalization", () => {
      const result = isCorrect({
        answers: ["tre flip", "360 flip"],
        negative_answers: ["backside 360 kickflip"],
        result: "This trick is called a **Tre Flip**..."
      });

      expect(result).toBe(true);
    });
  });
});
```

**Patterns:**
- Top-level describe blocks for feature grouping: "Negative Answers Feature"
- Nested describe blocks for test categories: "Case Sensitivity", "Negative Answer Override", "Edge Cases"
- Each test is a complete unit: prepares input, calls function, asserts result
- No setup/teardown hooks detected; tests are stateless and isolated

## Mocking

**Framework:** Not used - tests are pure unit tests without external dependencies

**Patterns:**
- No mocking library imported or used in test files
- Tests call functions directly with prepared input objects
- Complete function isolation: `isCorrect()` function is copied into test file (lines 4-23) to avoid dependency

**What to Mock:**
- External API calls would require mocking (e.g., LLM API calls via `ai` package)
- File system operations would use mocking in integration tests
- Network requests would be mocked

**What NOT to Mock:**
- Pure utility functions like `isCorrect()` - test directly with real implementation
- Type definitions and interfaces - use actual types
- Simple data transformations - test end-to-end behavior

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data objects with clear structure
const result = isCorrect({
  answers: ["tre flip", "360 flip"],
  negative_answers: [
    "backside 360 kickflip",
    "backside 360 flip",
    "360 heelflip"
  ],
  result: "This trick is called a **Tre Flip**..."
});

// Real-world example fixture (line 137)
describe("Real World Skateboarding Examples", () => {
  test("tre flip vs backside 360 kickflip distinction", () => {
    const correctResult = isCorrect({
      answers: ["tre flip", "360 flip"],
      negative_answers: ["backside 360 kickflip"],
      result: "A tre flip is when the board spins 360 degrees..."
    });
    expect(correctResult).toBe(true);
  });
});
```

**Location:**
- Inline fixtures directly in test functions (no separate fixtures directory)
- Data defined at point of use for clarity and test isolation
- No factory functions detected; simple object literals used

## Coverage

**Requirements:** Not enforced - no coverage tool configured

**View Coverage:**
- No coverage configuration found
- Manual approach: Run tests and inspect implementation paths

## Test Types

**Unit Tests:**
- Scope: Single function (`isCorrect`)
- Approach: Direct function calls with prepared inputs
- Focus: Return value correctness with various input combinations
- Example: Testing case-insensitive matching, negative answer override logic

**Integration Tests:**
- Not detected in current codebase
- Future: Would test `testRunner()` with actual file I/O and caching

**E2E Tests:**
- Not implemented
- Framework: Not used
- Visualizer app would benefit from browser-based E2E tests (Playwright, Cypress)

## Common Patterns

**Async Testing:**
- Not heavily used in current tests
- Pattern would be:
```typescript
test("async operation", async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expectedValue);
});
```

**Error Testing:**
```typescript
// Not currently implemented; pattern would be:
test("should throw error on invalid input", () => {
  expect(() => {
    isCorrect(invalidInput);
  }).toThrow();
});
```

**Parametrized Tests:**
```typescript
// Not currently implemented; pattern would be:
const cases = [
  { answers: ["a"], result: "a", expected: true },
  { answers: ["a"], result: "b", expected: false }
];

cases.forEach(({ answers, result, expected }) => {
  test(`should handle ${result}`, () => {
    expect(isCorrect({ answers, result })).toBe(expected);
  });
});
```

## Test Categories in negative-answers.test.ts

**Case Sensitivity (4 tests, lines 26-50):**
- Validates that matching is case-insensitive
- Tests both answers and negative_answers with mixed cases
- Examples: "TRE FLIP" vs "tre flip", "BACKSIDE 360 KICKFLIP" vs "backside 360 kickflip"

**Negative Answer Override (4 tests, lines 53-90):**
- Validates that presence of negative answers causes failure
- Tests exact matches, substring matches, and case-insensitive matching
- Ensures negative answers take precedence over positive matches

**Edge Cases (4 tests, lines 93-135):**
- Tests partial matches that shouldn't trigger negative answers
- Tests scenarios without negative answers
- Tests complete absence of positive matches
- Validates behavior with optional fields

**Real World Skateboarding Examples (2 tests, lines 137-172):**
- Practical test cases with actual skateboarding trick descriptions
- Validates distinction between tre flip (backside 360 shuvit + kickflip) and backside 360 kickflip
- Validates distinction between laser flip (frontside 360 + heelflip) and 360 heelflip

## Test Execution

**Current Test Count:** 14 tests in `negative-answers.test.ts`

**Test Results Pattern:**
- Each test returns boolean result
- Assertions use `.toBe()` for equality checks
- All tests are synchronous and complete immediately

**No Detected Testing Infrastructure:**
- No test coverage reports generated
- No test CI/CD integration configured
- Tests run locally with `bun run`
- No pre-commit hooks to run tests

---

*Testing analysis: 2026-01-23*
