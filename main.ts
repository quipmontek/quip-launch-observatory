import { copyFileSync, mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildResearch } from './lib/model.ts';
import type { Snapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// Only the three public runtime directory settings are read; no secrets or network are used.
const bot = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function argument(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1] ?? fallback;
}
const root = resolve(argument('bot', bot));
const inputPath = argument('input', join(input, 'snapshot.json'));
const out = resolve(argument('output', output));
const snapshotBytes = readFileSync(inputPath);
const snapshot = JSON.parse(snapshotBytes.toString('utf8')) as Snapshot;
const research = buildResearch(snapshot);
const provenance = { snapshot_sha256: createHash('sha256').update(snapshotBytes).digest('hex'),
  participation_mode: 'ranking-only', prize_eligibility_claimed: false };
mkdirSync(out, { recursive: true });

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from).sort()) {
    if (!/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(name)) throw new Error(`Unsafe asset name: ${name}`);
    const source = join(from, name), target = join(to, name);
    const stat = lstatSync(source);
    if (stat.isDirectory()) copyTree(source, target);
    else if (stat.isFile()) copyFileSync(source, target);
    else throw new Error('Assets must be regular files');
  }
}
copyTree(join(root, 'dashboard'), join(out, 'dashboard'));
copyTree(join(root, 'screenshots'), join(out, 'screenshots'));
writeFileSync(join(out, 'board.json'), JSON.stringify({ ...research, provenance }) + '\n');
// Keep data outside dashboard/: all interface source remains visible within the dossier text cap.
writeFileSync(join(out, 'data.js'), 'window.QUIP_DATA=' + JSON.stringify({ ...research, provenance }).replace(/</g, '\\u003c') + ';\n');
const shots = readdirSync(join(out, 'screenshots'));
if (shots.length < 3 || shots.length > 4) throw new Error('Supply 3–4 original browser screenshots');
const dossier = buildDossier(out, { text_max_bytes: 65536,
  screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
if (dossier.byteLength > 1572864) throw new Error('Dossier exceeds competition cap');
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`QUIP: ${research.rows.length} ranked rows; ${research.watchlist_count} watchlist; ${research.peer_count} peer observations. Frozen ${research.as_of}.`);
