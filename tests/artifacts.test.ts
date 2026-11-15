import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildDossier } from '../vendor/makefun-board.ts';
const a = process.argv[2] ?? '../tests/final-a';
const b = process.argv[3] ?? '../tests/final-b';
function files(root: string, prefix = ''): string[] {
  return readdirSync(join(root, prefix)).sort().flatMap(name => {
    const path = join(prefix, name);
    return statSync(join(root, path)).isDirectory() ? files(root, path) : [path];
  });
}
assert.deepEqual(files(a), files(b));
const manifest = files(a).map(path => {
  const bytes = readFileSync(join(a, path));
  assert.ok(bytes.equals(readFileSync(join(b, path))), `Non-deterministic: ${path}`);
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
assert.ok(readFileSync(join(a, 'dossier.json')).equals(buildDossier(a, { text_max_bytes: 65536 })));
assert.ok(statSync(join(a, 'dossier.json')).size <= 1572864);
const sourceBytes = files(join(a, 'dashboard')).reduce((n, path) => n + statSync(join(a, 'dashboard', path)).size, 0);
assert.ok(sourceBytes < 60000);
const shots = files(join(a, 'screenshots'));
assert.equal(shots.length, 3);
for (const shot of shots) {
  const bytes = readFileSync(join(a, 'screenshots', shot));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(Math.max(width, height) <= 1440 && Math.min(width, height) >= 800);
  assert.ok(bytes.length <= 524288);
}
console.log(JSON.stringify({ passed: true, source_bytes: sourceBytes, manifest }, null, 2));
