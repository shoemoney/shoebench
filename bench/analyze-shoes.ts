import { readFileSync } from 'fs';

// Load both files
const visionData = JSON.parse(readFileSync('./results/vision/vision-results-2026-01-24T19-42-18-847Z.json', 'utf8'));
const judgeData = JSON.parse(readFileSync('./results/judge/judge-results-2026-01-24T19-52-32-974Z.json', 'utf8'));

// Create a map of responseText -> shoeId from vision results
const responseToShoe = new Map<string, string>();
for (const v of visionData.results) {
  if (v.status === 'success') {
    responseToShoe.set(v.responseText, v.shoeId);
  }
}

// Group evaluations by shoe
const shoeStats: Record<string, { exact: number; variant: number; brand_only: number; wrong: number; total: number }> = {};

for (const e of judgeData.evaluations) {
  const shoeId = responseToShoe.get(e.vision_response_text);
  if (!shoeId) continue;

  if (!shoeStats[shoeId]) {
    shoeStats[shoeId] = { exact: 0, variant: 0, brand_only: 0, wrong: 0, total: 0 };
  }
  const tier = e.tier as 'exact' | 'variant' | 'brand_only' | 'wrong';
  shoeStats[shoeId][tier]++;
  shoeStats[shoeId].total++;
}

// Calculate accuracy and sort
const ranked = Object.entries(shoeStats)
  .map(([shoe, s]) => ({
    shoe: shoe.replace('stockx-', '').replace('goat-', '').replace('farfetch-', ''),
    accuracy: Math.round((s.exact + s.variant) / s.total * 100),
    avgScore: Math.round((s.exact * 100 + s.variant * 75 + s.brand_only * 50) / s.total),
    exact: s.exact,
    variant: s.variant,
    brand: s.brand_only,
    wrong: s.wrong,
    total: s.total
  }))
  .sort((a, b) => a.accuracy - b.accuracy);

console.log('');
console.log('🔴 HARDEST SHOES TO IDENTIFY (Lowest Accuracy)');
console.log('═'.repeat(90));
console.log('Rank | Acc% | Score | E / V / B / W  | Shoe');
console.log('─'.repeat(90));
ranked.slice(0, 20).forEach((s, i) => {
  const stats = `${s.exact.toString().padStart(2)}/${s.variant.toString().padStart(2)}/${s.brand.toString().padStart(2)}/${s.wrong.toString().padStart(2)}`;
  console.log(`${(i+1).toString().padStart(4)} | ${s.accuracy.toString().padStart(3)}% |  ${s.avgScore.toString().padStart(2)}   | ${stats}         | ${s.shoe}`);
});

console.log('');
console.log('🟢 EASIEST SHOES TO IDENTIFY (Highest Accuracy)');
console.log('═'.repeat(90));
console.log('Rank | Acc% | Score | E / V / B / W  | Shoe');
console.log('─'.repeat(90));
ranked.slice(-20).reverse().forEach((s, i) => {
  const stats = `${s.exact.toString().padStart(2)}/${s.variant.toString().padStart(2)}/${s.brand.toString().padStart(2)}/${s.wrong.toString().padStart(2)}`;
  console.log(`${(i+1).toString().padStart(4)} | ${s.accuracy.toString().padStart(3)}% |  ${s.avgScore.toString().padStart(2)}   | ${stats}         | ${s.shoe}`);
});

console.log('');
console.log(`Total shoes analyzed: ${ranked.length}`);
