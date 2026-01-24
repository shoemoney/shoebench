# Codebase Concerns

**Analysis Date:** 2026-01-23

## Tech Debt

**Pervasive Use of `any` Type:**
- Issue: Widespread use of `any` type annotations bypasses TypeScript safety, reducing type checking value across the codebase
- Files: `bench/index.ts` (lines 202, 220, 252, 429, 433, 787-810), `bench/cli.tsx` (lines 16, 23-25, 81-82, 300), `visualizer/app/page.tsx` (lines 104, 126, 154, 163, 191, 512, 642, 774, 872, 901)
- Impact: Bugs in metadata extraction and type coercion won't be caught at compile time. Particularly risky in `runTest()` where provider metadata is cast as `any`
- Fix approach: Introduce strict interfaces for provider metadata responses. Create types for `openrouter`, `google`, and other provider metadata shapes. Replace `any` with concrete types in function signatures

**Duplicated Test Validation Logic:**
- Issue: The `isCorrect()` function is duplicated in `bench/negative-answers.test.ts` (lines 4-23) instead of imported from `bench/index.ts`
- Files: `bench/index.ts` (lines 132-151), `bench/negative-answers.test.ts` (lines 4-23)
- Impact: If validation logic changes, test file won't be updated automatically. Creates risk of test/production behavior divergence
- Fix approach: Export `isCorrect` from `bench/index.ts` and import it in test file

**Hardcoded Constants with Long Lists:**
- Issue: 40+ models hardcoded in `constants.ts` with no structure. Adding/removing/organizing models is error-prone
- Files: `bench/constants.ts` (lines 25-311)
- Impact: Growing model list decreases readability. No categorization system makes it hard to understand which models are experimental vs stable
- Fix approach: Organize models into categories (OpenAI, Anthropic, Google, Open Weight) with separate objects. Create a factory function to generate model configurations

## Known Bugs

**Implicit Cost Extraction Logic:**
- Symptoms: Cost calculation differs between OpenRouter and Google providers without clear documentation
- Files: `bench/index.ts` (lines 199-215, 217-229)
- Trigger: Any test run against OpenRouter with `costDetails.upstreamInferenceCost` or Google models with `usageMetadata`
- Workaround: Currently accepts whichever metadata is available, but logic is fragile
- Issue: No fallback if provider format changes. Commented-out code (lines 182-186, 210, 213) suggests prior iterations that failed

**Cache Mismatch Detection Only on Load:**
- Symptoms: System prompt changes in cached entries are only detected when reusing results, not during planning phase
- Files: `bench/index.ts` (lines 381-393, 698-715, 959-973)
- Trigger: When a cached entry has `systemPrompt` field and suite's `system_prompt` differs, error thrown during preload or job execution
- Workaround: Users must manually delete cache directory at `./results/cache/[suiteId]/[version]/`
- Issue: Error message is helpful but doesn't prevent the error. No dry-run mode to detect cache issues before test starts

## Security Considerations

**API Keys in Environment Variables (Implicit):**
- Risk: Code references API keys through environment variables (OpenRouter key is required), but no `.env` file or validation shown in codebase
- Files: `bench/constants.ts` (uses `@openrouter/ai-sdk-provider` which reads env vars), `bench/package.json` (depends on external providers)
- Current mitigation: Relies on user to set environment variables correctly. AI SDK handles credential passing
- Recommendations: Add `.env.example` file documenting required variables. Add validation in CLI startup that checks required env vars exist before running tests

**No Input Validation on Test Suites:**
- Risk: Test suite JSON files are loaded without validation of structure
- Files: `bench/index.ts` (lines 1237-1241), `bench/cli.tsx` (lines 32-46)
- Current mitigation: Runtime errors if structure is wrong, but no early validation
- Recommendations: Add JSON schema validation for test suite format. Validate at load time with clear error messages

**Cache Files Not Validated:**
- Risk: Arbitrary JSON files in cache directory are trusted without validation
- Files: `bench/index.ts` (lines 356-415)
- Current mitigation: Try/catch blocks around JSON parsing, but no schema validation
- Recommendations: Add version field validation to cache format. Validate cache entry structure matches expected schema

## Performance Bottlenecks

**Recursive Directory Walk on Every Run:**
- Problem: Finding previous results requires walking entire cache/results directory structure with no indexing
- Files: `bench/index.ts` (lines 269-287, 355-415)
- Cause: `findPreviousResultsForSuite()` does recursive file system traversal each time runner starts
- Impact: For large result sets (100+ test runs), this becomes O(n) file system operations
- Improvement path: Implement results manifest file listing previous runs. Cache directory listing in memory during single run

**Signature Computation on Each Job Creation:**
- Problem: Test signature is computed multiple times for same test (during plan totaling AND during job queue building)
- Files: `bench/index.ts` (lines 672-677, 897-902)
- Cause: Same signature calculated in two separate loops (planning phase and job scheduling)
- Impact: Unnecessary hashing of same inputs
- Improvement path: Compute signatures once during initial work queue creation, cache in WorkItem

**Concurrent Requests Without Rate Limiting:**
- Problem: MAX_CONCURRENCY (40) is applied globally but providers have individual rate limits
- Files: `bench/constants.ts` (line 3), `bench/index.ts` (lines 875-882)
- Cause: All 40 workers can hit same provider simultaneously if multiple models use same endpoint
- Impact: Rate limiting errors or quota exhaustion when testing many models from single provider
- Improvement path: Implement per-provider concurrency limits. Create provider-aware worker pool that distributes concurrency

## Fragile Areas

**Provider Metadata Extraction:**
- Files: `bench/index.ts` (lines 199-229)
- Why fragile: Multiple code paths for different providers with inconsistent metadata shapes. Relies on type casting with `as any`
- Safe modification: Add provider-specific metadata extractors (functions). Create interfaces for each provider's response shape. Test with actual provider responses
- Test coverage: Only generic test coverage exists. No provider-specific integration tests

**Cache Entry Validation Logic:**
- Files: `bench/index.ts` (lines 381-393, 698-715, 959-973)
- Why fragile: Same validation logic duplicated in three places (manifest loading, preload phase, worker processing). Field name inconsistency (`systemPrompt` vs `system_prompt`)
- Safe modification: Extract to single validation function. Standardize field naming in cache entries
- Test coverage: `negative-answers.test.ts` only covers `isCorrect()`, not cache handling

**File Path Handling for Results:**
- Files: `bench/index.ts` (lines 548-584, 1074-1118)
- Why fragile: Multiple places construct file paths. Timestamp format used for uniqueness could collide on fast systems
- Safe modification: Use UUID or higher-resolution timestamps. Add directory existence checks
- Test coverage: No tests for file I/O or path construction

**Markdown Report Generation:**
- Files: `bench/index.ts` (lines 421-497)
- Why fragile: Assumes specific structure of result objects. Uses optional chaining but doesn't gracefully handle missing fields
- Safe modification: Add defensive checks for all accessed properties. Test with malformed result objects
- Test coverage: No tests for report generation with edge cases (empty results, missing fields)

## Scaling Limits

**Single-Process Concurrency Limit:**
- Current capacity: 40 concurrent API requests per instance
- Limit: Tests scale linearly with number of models × runs per model. 30 models × 30 runs = 900 jobs. At 40 concurrent max, this takes hours
- Scaling path: Implement job queue persistence (Redis/file-based). Allow multiple instances to process same queue. Add horizontal scaling support

**In-Memory Results Accumulation:**
- Current capacity: All results stored in memory until end of run
- Limit: Large test suites (1000+ tests × 30 models × 30 runs) could exhaust memory
- Scaling path: Stream results to database instead of accumulating array. Write results as tests complete

**File System Results Directory Growth:**
- Current capacity: Results stored in flat directory structure under `./results`
- Limit: Thousands of small JSON files become slow to list and manage
- Scaling path: Implement date-based directory sharding. Compress old results. Add result archival

**Model List Hardcoding:**
- Current capacity: 40+ models hardcoded in constants
- Limit: Adding/removing models requires code change and deployment
- Scaling path: Load model configuration from external config file or database

## Dependencies at Risk

**Deprecated/Unstable Provider SDKs:**
- Risk: Using multiple AI provider SDKs simultaneously (@openrouter, @ai-sdk/google, openai). If any SDK has breaking changes, tests break
- Impact: Need to update all SDKs independently. Version mismatches possible
- Migration plan: Consider unified AI client abstraction (like `ai` package provides) to insulate from SDK changes. Pin versions aggressively

**Ink Rendering in CLI:**
- Risk: `ink` (React for terminal) used for CLI UI. Actively maintained but has specific Node.js version constraints
- Impact: Terminal output rendering could break on Node.js updates
- Migration plan: Test with new Node.js versions in CI. Consider pure string-based output as fallback

**Direct TypeScript Dependency:**
- Risk: Codebase runs as `.ts` files directly via Bun. Not compiled. If Bun drops TypeScript support or compatibility changes
- Impact: Must compile to JavaScript or switch runtimes
- Migration plan: Add build step to compile TypeScript. Generate `.js` output as backup option

## Missing Critical Features

**No Persistent Job Queue:**
- Problem: If process crashes during test run, all progress is lost. No way to resume interrupted tests
- Blocks: Large test suites. Long-running benchmarks. Reliable CI pipelines
- Fix approach: Persist completed job list to file. Check on startup for previous results before rerunning

**No Distributed Test Execution:**
- Problem: All tests must run on single machine. Can't parallelize across multiple compute resources
- Blocks: Scaling to thousands of tests. Reducing total benchmark time
- Fix approach: Add job queue service (Temporal, Bull Queue, etc.). Allow workers on different machines to consume jobs

**No A/B Comparison Tools:**
- Problem: Can run benchmarks but no built-in way to compare two runs side-by-side
- Blocks: Validating model improvements. Regression detection
- Fix approach: Add CLI command to diff two result sets. Show improvement/regression percentages

**No Scheduled/Recurring Runs:**
- Problem: Must manually trigger each benchmark. No way to schedule regular test runs
- Blocks: Monitoring model quality over time. Detecting regressions
- Fix approach: Add cron scheduling support. Integrate with CI/CD pipeline

**No Results Database/API:**
- Problem: Results only stored as JSON files. No structured access to historical data
- Blocks: Long-term trend analysis. Aggregating results across runs
- Fix approach: Add optional database backend (SQLite minimum). Create API endpoint to query results

## Test Coverage Gaps

**isCorrect() Function:**
- What's not tested: Behavior with null/undefined inputs. Empty string results. Unicode characters. Extremely long result strings
- Files: `bench/index.ts` (lines 132-151) - tested in `bench/negative-answers.test.ts` but only for happy paths
- Risk: Edge cases in answer matching could silently pass/fail incorrectly
- Priority: High - core evaluation logic

**Provider Metadata Extraction:**
- What's not tested: Different metadata response formats from each provider. Missing fields. Malformed metadata
- Files: `bench/index.ts` (lines 199-229)
- Risk: Provider changes could break cost/token tracking without notice
- Priority: High - directly impacts data accuracy

**Cache Loading and Validation:**
- What's not tested: Corrupted cache files. Missing cache files. Cache version mismatches
- Files: `bench/index.ts` (lines 260-418)
- Risk: Invalid cache could lead to incorrect test reuse or silent data loss
- Priority: Medium - affects reliability but has partial error handling

**File I/O Error Handling:**
- What's not tested: Disk full during results write. Permission errors. File path too long
- Files: `bench/index.ts` (lines 1073-1232)
- Risk: Tests could fail silently or with unclear error messages
- Priority: Medium - edge case but impacts production reliability

**Markdown Report Generation:**
- What's not tested: Empty result sets. Missing/malformed result objects. Very large result counts
- Files: `bench/index.ts` (lines 421-497)
- Risk: Report generation could crash or produce invalid markdown
- Priority: Low - report is secondary output

**Visualizer Data Loading:**
- What's not tested: Malformed JSON in `data/benchmark-results.json`. Missing required fields. Type mismatches
- Files: `visualizer/app/page.tsx` (line 15)
- Risk: Visualizer crashes if data format changes
- Priority: Low - affects UI only

---

*Concerns audit: 2026-01-23*
