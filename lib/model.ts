/** QUIP research model. Snapshot-only, deterministic, no protocol-name valuation overrides. */
export interface Protocol {
  slug: string; name: string; category: string | null; chains: string[];
  tvl_usd: number; change_7d: number | null; mcap_usd: number | null;
  listed_at: string | null; gecko_id: string | null; symbol: string | null;
}
export interface Snapshot {
  as_of: string; source: string; floor_usd: number; protocols: Protocol[]; watchlist: string[];
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const round = (x: number) => Math.round(x * 10000) / 10000;
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const excludedCategories = new Set(['Bridge', 'Cross Chain Bridge', 'Canonical Bridge', 'Liquid Staking',
  'Liquid Restaking', 'Restaked BTC', 'CEX', 'Staking Pool', 'Restaking', 'Stablecoin Wrapper', 'Anchor BTC']);
export function tokenRecorded(p: Protocol): boolean {
  return p.symbol !== null || p.gecko_id !== null || (p.mcap_usd !== null && p.mcap_usd > 0);
}
export function productLike(p: Protocol): boolean {
  return excludedCategories.has(p.category ?? '') || /\b(wrapped|staked|staking|bridged)\b/i.test(p.name)
    || /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name)
    || /\s(v\d+(\.\d+)?|\d+\.\d+)$/i.test(p.name)
    || /^(wbtc|weth|usdt0|btc\.b|cbeth|cbbtc|tbtc)$/i.test(p.slug);
}
export function family(category: string | null): string {
  if (/Lending|CDP|Collateral/.test(category ?? '')) return 'Credit';
  if (/Dexs|Derivatives|Options|Synthetics|Prediction|Liquidity Manager/.test(category ?? '')) return 'Trading';
  if (/RWA|Stablecoin|Stable|Payments|CeDeFi/.test(category ?? '')) return 'Asset issuance';
  if (/Yield|Farm|Curator|Allocator|Basis|Indexes/.test(category ?? '')) return 'Capital management';
  return 'Infrastructure';
}
export function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = (s.length - 1) * q, i = Math.floor(n);
  return s[i] + (s[Math.ceil(n)] - s[i]) * (n - i);
}
export function peerModel(p: Protocol, peers: Protocol[]) {
  const exact = peers.filter(x => p.category !== null && x.category === p.category);
  const related = peers.filter(x => family(x.category) === family(p.category));
  const pool = exact.length >= 4 ? exact : related.length >= 6 ? related : peers;
  const scope = exact.length >= 4 ? 'Category' : related.length >= 6 ? 'Related-category fallback' : 'Global fallback';
  const ratios = pool.map(x => x.mcap_usd! / x.tvl_usd);
  const low = quantile(ratios, .1), high = quantile(ratios, .9);
  const wins = ratios.map(x => clamp(x, low, high));
  // Ratios are winsorized at 10/90 percentiles, then a robust median and IQR are used.
  return { scope, category_count: exact.length, count: pool.length,
    median: round(quantile(wins, .5)), bear: round(quantile(wins, .25)), bull: round(quantile(wins, .75)),
    low: round(low), high: round(high),
    peers: pool.map(x => ({ slug: x.slug, name: x.name, category: x.category, tvl: x.tvl_usd,
      mcap: x.mcap_usd!, ratio: round(x.mcap_usd! / x.tvl_usd) })) };
}
export function actionFor(p: Protocol): string {
  switch (family(p.category)) {
    case 'Credit': return 'Read collateral, liquidation, utilization and withdrawal rules. If a supply-only market is available, compare its supported assets and caps. Do not borrow or loop collateral to manufacture activity.';
    case 'Trading': return 'Inspect pool depth, spread, price impact and exit liquidity in a read-only quote. Prefer a small unlevered spot test only if supported; skip derivatives and liquidity provision if liquidation or impermanent loss is unclear.';
    case 'Asset issuance': return 'Check issuer, custody, redemption rights, reserve reporting, jurisdiction and access restrictions. Do not mint or buy a receipt until both entry and redemption are documented; a transferable token may still be hard to redeem.';
    case 'Capital management': return 'Trace the vault or curator to its underlying markets and assets. Inspect allocation, operator permissions, performance fees, withdrawal queue and loss waterfall. Avoid recursive collateral, opaque strategies and leverage.';
    default: return 'Identify whether this is a user-facing application, an infrastructure service or a tracked asset. Read its participation and exit documentation. If there is no clear low-risk user action, keep this as research-only and skip funding.';
  }
}
export function farmSteps(p: Protocol): string[] {
  const chain = p.chains.length ? p.chains.slice(0, 3).join(', ') : 'an unreported chain';
  const test = family(p.category) === 'Credit'
    ? 'If documented, supply a small supported asset without borrowing, then test a partial withdrawal.'
    : family(p.category) === 'Trading'
    ? 'If an unlevered spot market exists, quote a small swap and its reverse; proceed only within your slippage cap. Do not open a derivatives position.'
    : family(p.category) === 'Capital management'
    ? 'If documented, compare a small vault deposit with its redemption preview; test a partial exit before adding capital.'
    : family(p.category) === 'Asset issuance'
    ? 'If access is permitted and redemption is documented, compare a small mint or purchase with the redeem preview; otherwise remain read-only.'
    : 'Use only a documented free user workflow; if this is a tracked asset or infrastructure without a clear user action, do not fund it.';
  return [
    `Research ${p.name} (${p.slug}) through independently authenticated project documentation; no URL or contract is verified by this snapshot. Confirm the product identity and current token status before connecting a wallet. Budget: $0; 10–20 minutes.`,
    `${p.category ?? 'Unknown category'} diligence: ${actionFor(p)} Budget: $0 in read-only research; 15–30 minutes.`,
    `The snapshot lists ${chain}${p.chains.length > 3 ? ' and other chains' : ''}. Choose an already funded supported chain only after checking documentation. Avoid bridging just for speculation: bridge, counterparty and smart-contract risks add up. Budget: $0 to compare; 5–10 minutes.`,
    `Optional category-derived test for ${p.name}: ${test} Set a personal loss limit, for example $20 total including gas (not a protocol minimum). Skip if fees exceed it. Cost: chosen capital plus variable fees; 10–15 minutes.`,
    `If you choose to proceed manually, use one legitimate account, a limited approval and no leverage. Record the transaction, fees and a tested exit route; never share a seed phrase. No automatic transaction or repeated activity is needed. Cost: variable gas plus any chosen deposit; 10–20 minutes.`,
    `Review once after 7 days or sooner if a risk changes; withdraw only after checking queue and exit fees, and revoke unused approvals where appropriate. No points program or qualifying action is verified, and no reward is promised. Cost: variable exit/revocation fees; 10 minutes.`,
  ];
}
export function buildResearch(s: Snapshot) {
  if (!Array.isArray(s.protocols) || !s.watchlist.length) throw new Error('Invalid snapshot');
  const watch = new Set(s.watchlist);
  const peers = s.protocols.filter(p => tokenRecorded(p) && p.mcap_usd !== null && p.mcap_usd > 0
    && p.tvl_usd > 0 && !productLike(p)).sort((a, b) => order(a.slug, b.slug));
  if (peers.length < 6) throw new Error('Insufficient observed peer market caps');
  const selected = s.protocols.filter(p => watch.has(p.slug) || (!tokenRecorded(p) && !productLike(p)));
  const rows = selected.map(p => {
    const model = peerModel(p, peers);
    const age = p.listed_at === null ? null : Math.max(0, Math.floor((Date.parse(s.as_of) - Date.parse(p.listed_at)) / 86400000));
    const growth = p.change_7d === null ? 1 : 1 + clamp(p.change_7d, -50, 50) / 100 * .2;
    const maturity = age === null ? .85 : .7 + .3 * Math.min(age / 1095, 1);
    const base = p.tvl_usd * model.median * growth * maturity;
    const risk = model.scope !== 'Category' || p.change_7d === null || age === null ? 'Elevated uncertainty'
      : Math.abs(p.change_7d) > 20 || family(p.category) === 'Trading' ? 'High exposure' : 'Standard caution';
    return { ...p, rank: 0, token_status: 'No token recorded', watchlist: watch.has(p.slug),
      implied_value_usd: Math.max(1, Math.round(base)),
      bear_usd: Math.max(1, Math.round(p.tvl_usd * model.bear * growth * maturity * .75)),
      bull_usd: Math.max(1, Math.round(p.tvl_usd * model.bull * growth * maturity * 1.25)),
      age_days: age, growth_factor: growth, maturity_factor: maturity, model,
      confidence: model.scope === 'Category' && model.count >= 8 && age !== null && p.change_7d !== null ? 'Moderate' : 'Low',
      risk, family: family(p.category), farm_steps: farmSteps(p) };
  }).sort((a, b) => b.implied_value_usd - a.implied_value_usd || order(a.slug, b.slug));
  rows.forEach((r, i) => r.rank = i + 1);
  const missing = s.watchlist.filter(slug => !rows.some(r => r.slug === slug));
  if (missing.length || rows.length < 100 || rows.length > 4000) throw new Error(`Coverage failure: ${rows.length} rows, missing ${missing}`);
  for (const r of rows) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd > 1e14) throw new Error('Invalid valuation');
    if (r.farm_steps.length < 3 || r.farm_steps.some(x => x.trim().length < 20 || x.trim().length > 600)) throw new Error(`Invalid plan: ${r.slug}`);
  }
  return { as_of: s.as_of, source: s.source, floor_usd: s.floor_usd, version: 'QUIP robust-comps 1.1',
    participation_mode: 'ranking-only', prize_eligibility_claimed: false,
    universe: s.protocols.length, watchlist_count: s.watchlist.length, peer_count: peers.length,
    excluded_count: s.protocols.length - rows.length, rows };
}
