---
created: 2026-01-24T14:30
title: Cache model scores with purge option
area: bench
files:
  - bench/cache.ts
  - bench/run-vision-benchmark.ts
  - bench/run-judge-benchmark.ts
---

## Problem

When running benchmarks with new models, we want to:
1. Only test models that haven't been tested yet (skip cached)
2. Allow purging cache when scoring methodology changes

Current state:
- Vision cache exists (bench/cache.ts) - caches raw model responses
- Judge results are separate - need to verify caching behavior
- `--no-cache` flag exists but doesn't delete existing entries
- No way to selectively purge (e.g., purge judge scores but keep vision)

## Solution

1. **Add `--purge-cache` flag** to clear existing cache before run
   - `--purge-cache=vision` - Clear vision responses only
   - `--purge-cache=judge` - Clear judge scores only
   - `--purge-cache=all` - Clear everything

2. **Add `--purge-model=<name>` flag** to clear specific model's cache
   - Useful when re-testing a single model

3. **Improve cache hit logging** - Show which models were skipped vs tested

4. **Consider separate judge cache table** if not already separate
   - Allows re-scoring without re-running vision tests
