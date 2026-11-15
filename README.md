# QUIP / Launch Observatory

[![Token Radar on Make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![Token Radar rank on Make.fun](https://make.fun/badge/token-radar-01/quipmontek/quip-launch-observatory/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![Token Radar reward on Make.fun](https://make.fun/badge/token-radar-01/quipmontek/quip-launch-observatory/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

An offline, evidence-led token launch radar for [Token Radar](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01).

**Free entry; ranking-only / no paid place. Not prize-eligible in the current session mode.**
Competition deadline: 2026-12-14 at 10:00 UTC. Free entry; advertised pool $1,325 does not imply eligibility for this candidate.

## Run locally

Node 22.18+; no install, API key or network needed. From this directory:

```sh
node main.ts --bot . --input ../token-radar-01-kit/input/snapshot.json --output out
node tests/model.test.ts ../token-radar-01-kit/input/snapshot.json
```

For reproducibility, build into two fresh directories, then run
`node tests/artifacts.test.ts <first-output> <second-output>` to compare every
output byte, verify the official dossier, and check source/image size limits.

Open `out/dashboard/index.html` directly in a browser. The page loads `../data.js` from the same output tree. Production defaults are `/bot`, `/input/snapshot.json`, `/output`; corresponding `MAKEFUN_*_DIR` settings and command-line overrides are supported. Use a fresh output directory for each reproducibility run.

## Evidence and model

The sealed snapshot is the only research source. Every official watchlist slug is included, plus screened discovery protocols with no recorded token. Existing-token protocols supply a separate, inspectable comparable pool and are never presented as prospective launches.

`lib/model.ts` selects exact-category peers (minimum four), related-family peers (minimum six), or a global fallback. Positive market-cap/TVL observations are winsorized at interpolated 10th/90th percentiles. Base = TVL × median ratio × bounded seven-day growth factor × tracking-maturity factor. Q25/Q75 and explicit 0.75/1.25 analyst multipliers generate sensitivity cases, not statistical confidence intervals. Stored factors reproduce integer values exactly; visual ratios are rounded for readability.

Tracking date is not launch date. TVL is not revenue. Circulating market cap is not FDV. Missing token records do not prove no token exists. Parent relationships, executable liquidity, token rights, eligibility, campaign rules and verified addresses are absent. None are invented. Category-derived plans give manual research and optional small tests, cost/time budgets and exit checks; no reward or qualifying activity is promised.

## Interface and artifacts

- Search, category/chain/risk filters, official-only and saved views, four sorts and JSON export.
- Every row opens valuation evidence, the complete peer pool and a six-step participation plan.
- Keyboard-operable dialogs and tabs; mobile layout and explicit empty state.
- `board.json` includes snapshot SHA-256 and ranking-only provenance.
- `screenshots/` holds original browser captures of the board, detail and filtered state.
- `dossier.json` is generated with the unmodified official `vendor/makefun-board.ts`.

Native OpenCode records are preserved outside the source commit. Never reconstruct, rewrite or invent them. Local artifact/browser tests are not an official server grade: this competition's judging is server-only. This entry is ranking-only, with no cash-prize eligibility claimed.
