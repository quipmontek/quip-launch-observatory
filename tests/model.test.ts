import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildResearch, peerModel, quantile, tokenRecorded, productLike } from '../lib/model.ts';
const input = process.argv[2] ?? '../token-radar-01-kit/input/snapshot.json';
const snapshot = JSON.parse(readFileSync(input, 'utf8'));
const board = buildResearch(snapshot);
assert.equal(JSON.stringify(board), JSON.stringify(buildResearch(snapshot)));
assert.equal(JSON.stringify(board), JSON.stringify(buildResearch({ ...snapshot, protocols: [...snapshot.protocols].reverse() })));
assert.equal(new Set(board.rows.map(r => r.slug)).size, board.rows.length);
assert.ok(board.rows.length >= 100);
assert.equal(board.rows.filter(r => r.watchlist).length, snapshot.watchlist.length);
for (const [i, r] of board.rows.entries()) {
  assert.equal(r.rank, i + 1);
  assert.ok(!tokenRecorded(r));
  assert.ok(r.watchlist || !productLike(r));
  assert.ok(Number.isSafeInteger(r.implied_value_usd));
  assert.equal(r.implied_value_usd, Math.max(1, Math.round(r.tvl_usd * r.model.median * r.growth_factor * r.maturity_factor)));
  assert.ok(r.bear_usd <= r.implied_value_usd && r.bull_usd >= r.implied_value_usd);
  if (i) assert.ok(board.rows[i - 1].implied_value_usd >= r.implied_value_usd);
  assert.ok(r.farm_steps.length >= 3 && r.farm_steps.length <= 12);
  for (const step of r.farm_steps) assert.ok(step.trim().length >= 20 && step.trim().length <= 600);
}
assert.equal(quantile([1, 2, 3, 100], .5), 2.5);
const sample = snapshot.protocols[0];
const pool = Array.from({ length: 8 }, (_, i) => ({ ...sample, slug: String(i), category: null, mcap_usd: 100, tvl_usd: 100 }));
assert.notEqual(peerModel({ ...sample, category: null }, pool).scope, 'Category');
console.log(`PASS: ${board.rows.length} rows, ${board.watchlist_count} watchlist, exact decomposition, stable order, plans and missing-category fallback.`);
