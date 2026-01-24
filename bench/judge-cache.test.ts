import { JudgeCache, computeJudgeCacheKey } from './judge-cache';
import { unlinkSync, existsSync } from 'fs';

const testDb = 'bench/cache/judge-cache-test.db';

// Clean up
if (existsSync(testDb)) unlinkSync(testDb);
if (existsSync(testDb + '-shm')) unlinkSync(testDb + '-shm');
if (existsSync(testDb + '-wal')) unlinkSync(testDb + '-wal');

const cache = new JudgeCache(testDb);

// Test 1: Key computation
console.log('Test 1: Cache key computation');
const key1 = computeJudgeCacheKey({
  visionResponse: 'Nike Air Jordan 1',
  groundTruthBrand: 'Jordan',
  groundTruthModel: 'Air Jordan 1',
  aliases: ['AJ1', 'Jordan 1'],
  judgePromptVersion: '1.0.0',
  rubricVersion: '1.0.0'
});
console.log('✓ Cache key generated:', key1.slice(0, 16) + '...');

// Test 2: Key determinism
console.log('\nTest 2: Key determinism');
const key2 = computeJudgeCacheKey({
  visionResponse: 'Nike Air Jordan 1',
  groundTruthBrand: 'Jordan',
  groundTruthModel: 'Air Jordan 1',
  aliases: ['Jordan 1', 'AJ1'],  // Different order
  judgePromptVersion: '1.0.0',
  rubricVersion: '1.0.0'
});
if (key1 === key2) {
  console.log('✓ Same key despite alias reordering');
} else {
  console.error('✗ Keys differ despite same inputs!');
  process.exit(1);
}

// Test 3: Version changes cache key
console.log('\nTest 3: Version invalidation');
const key3 = computeJudgeCacheKey({
  visionResponse: 'Nike Air Jordan 1',
  groundTruthBrand: 'Jordan',
  groundTruthModel: 'Air Jordan 1',
  aliases: ['AJ1', 'Jordan 1'],
  judgePromptVersion: '2.0.0',  // Changed version
  rubricVersion: '1.0.0'
});
if (key1 !== key3) {
  console.log('✓ Different key for different version');
} else {
  console.error('✗ Version change did not invalidate key!');
  process.exit(1);
}

// Test 4: Set/get round-trip
console.log('\nTest 4: Set/get round-trip');
const entry = {
  cache_key: key1,
  vision_response_text: 'Nike Air Jordan 1',
  ground_truth_brand: 'Jordan',
  ground_truth_model: 'Air Jordan 1',
  aliases: ['AJ1', 'Jordan 1'],
  tier: 'variant' as const,
  score: 75,
  confidence: 'high' as const,
  reasoning: 'Brand identified as Nike (Jordan is Nike subsidiary). Model variant match.',
  brand_match: true,
  model_match: true,
  judge_model: 'anthropic/claude-3.5-haiku',
  judge_prompt_version: '1.0.0',
  rubric_version: '1.0.0',
  raw_judge_response: '{"reasoning":"..."}',
  input_tokens: 100,
  output_tokens: 50,
  total_tokens: 150,
  cost: 0.001,
  latency_ms: 500,
  created_at: Date.now()
};

cache.set(entry);
const retrieved = cache.get(key1);

if (!retrieved) {
  console.error('✗ Failed to retrieve entry!');
  process.exit(1);
}
console.log('✓ Entry retrieved successfully');

// Test 5: Data integrity
console.log('\nTest 5: Data integrity');
if (retrieved.score !== 75) {
  console.error('✗ Score mismatch!');
  process.exit(1);
}
console.log('✓ Score matches:', retrieved.score);

if (!Array.isArray(retrieved.aliases)) {
  console.error('✗ Aliases not parsed as array!');
  process.exit(1);
}
console.log('✓ Aliases parsed as array:', retrieved.aliases);

if (retrieved.brand_match !== true) {
  console.error('✗ Boolean brand_match not preserved!');
  process.exit(1);
}
console.log('✓ Booleans preserved correctly');

if (retrieved.tier !== 'variant') {
  console.error('✗ Tier mismatch!');
  process.exit(1);
}
console.log('✓ Tier matches:', retrieved.tier);

// Test 6: Purge functionality
console.log('\nTest 6: Purge functionality');
cache.purge();
const afterPurge = cache.get(key1);
if (afterPurge) {
  console.error('✗ Entry still exists after purge!');
  process.exit(1);
}
console.log('✓ Cache purged successfully');

// Cleanup
cache.close();
unlinkSync(testDb);
if (existsSync(testDb + '-shm')) unlinkSync(testDb + '-shm');
if (existsSync(testDb + '-wal')) unlinkSync(testDb + '-wal');

console.log('\n✅ All tests passed!');
