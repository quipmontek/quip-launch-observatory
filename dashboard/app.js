'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const data = window.QUIP_DATA;
  if (!data) { $('result-count').textContent = 'Snapshot data unavailable. Run main.ts, then open output/dashboard/index.html.'; return; }
  const esc = v => String(v ?? 'Unknown').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => '$' + (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n).toLocaleString('en-US'));
  const full = n => '$' + n.toLocaleString('en-US');
  const pct = n => n === null ? 'Unknown' : (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  const ratio = n => n.toFixed(3) + '×';
  let saved = new Set();
  try { const stored = JSON.parse(localStorage.getItem('quip-watchlist') || '[]');
    if (Array.isArray(stored)) saved = new Set(stored.filter(slug => data.rows.some(r => r.slug === slug)));
  } catch {}
  let onlySaved = false, limit = 25, visible = [], activeRow = null, returnFocus = null;
  let toastTimer;
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('active'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('active'), 2600); }
  function options(id, xs) { [...new Set(xs)].sort().forEach(x => { const o = document.createElement('option'); o.value = x; o.textContent = x; $(id).append(o); }); }
  options('category', data.rows.map(r => r.category || 'Unknown'));
  options('chain', data.rows.flatMap(r => r.chains));
  $('frozen').textContent = 'FROZEN / ' + data.as_of;
  $('footer-date').textContent = 'DefiLlama snapshot / ' + data.as_of;
  $('method-source').textContent = 'Source: ' + data.source + '. No live data, external verification or forecast inputs.';
  $('metrics').innerHTML = [
    ['Protocols on radar', data.rows.length, 'no token recorded'],
    ['Official coverage', data.watchlist_count + '/' + data.watchlist_count, 'plus ' + (data.rows.length - data.watchlist_count) + ' discovery rows'],
    ['Observed token peers', data.peer_count, 'market cap / TVL'],
    ['Snapshot universe', data.universe, data.excluded_count + ' kept off the board'],
  ].map(([a,b,c]) => `<div class="metric"><small>${a}</small><strong>${b}</strong><span>${c}</span></div>`).join('');
  function filterRows() {
    const q = $('search').value.trim().toLowerCase();
    return data.rows.filter(r => (!q || [r.name,r.slug,r.category,...r.chains].join(' ').toLowerCase().includes(q))
      && (!$('category').value || (r.category || 'Unknown') === $('category').value)
      && (!$('chain').value || r.chains.includes($('chain').value))
      && (!$('risk').value || r.risk === $('risk').value)
      && (!$('official').checked || r.watchlist) && (!onlySaved || saved.has(r.slug)))
      .sort((a,b) => $('sort').value === 'tvl' ? b.tvl_usd - a.tvl_usd || a.rank-b.rank
        : $('sort').value === 'growth' ? (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity) || a.rank-b.rank
        : $('sort').value === 'name' ? a.name.localeCompare(b.name, 'en') : a.rank-b.rank);
  }
  function render() {
    visible = filterRows();
    $('saved-count').textContent = saved.size;
    $('saved-toggle').setAttribute('aria-pressed', onlySaved);
    const sortLabel = { value: 'base implied cap ↓', tvl: 'snapshot TVL ↓', growth: '7-day change ↓', name: 'name A–Z' }[$('sort').value];
    $('result-count').textContent = `${visible.length} of ${data.rows.length} protocols · ${visible.filter(r => r.watchlist).length} official · ${sortLabel}`;
    $('rows').innerHTML = visible.slice(0, limit).map(r => `<tr>
      <td><div class="protocol"><span class="rank">${String(r.rank).padStart(2,'0')}</span><span class="monogram" aria-hidden="true">${esc(r.name[0])}</span><div><button data-detail="${esc(r.slug)}">${esc(r.name)}${r.watchlist ? '<span class="official-mark" title="Official watchlist">◆</span>' : ''}</button><small>No token recorded</small></div></div></td>
      <td>${esc(r.category)}<small>${esc(r.chains.slice(0,2).join(' · ') || 'Unknown chain')}${r.chains.length > 2 ? ' +' + (r.chains.length-2) : ''}</small></td>
      <td class="number">${money(r.tvl_usd)}</td><td class="number ${r.change_7d < 0 ? 'down' : 'up'}">${pct(r.change_7d)}</td>
      <td class="number"><span class="value">${money(r.implied_value_usd)}</span><small>${ratio(r.implied_value_usd/r.tvl_usd)} TVL</small></td>
      <td><div class="range" aria-hidden="true"><i style="left:${Math.max(0,Math.min(98,100*(r.implied_value_usd-r.bear_usd)/(r.bull_usd-r.bear_usd)))}%"></i></div><span class="range-label">${money(r.bear_usd)} – ${money(r.bull_usd)}</span></td>
      <td><span class="badge ${r.confidence === 'Low' ? 'low' : ''}">${r.confidence} confidence</span><small>${r.model.count} peers · ${r.model.scope === 'Category' ? 'category' : 'fallback'}</small></td>
      <td><button class="save" data-save="${esc(r.slug)}" aria-label="${saved.has(r.slug) ? 'Unsave' : 'Save'} ${esc(r.name)}" aria-pressed="${saved.has(r.slug)}">${saved.has(r.slug) ? '★' : '☆'}</button></td></tr>`).join('');
    $('empty').hidden = visible.length > 0;
    $('more').hidden = visible.length <= limit;
    $('shown').textContent = `Showing ${Math.min(visible.length, limit)} / ${visible.length} · ◆ Official watchlist`;
  }
  function reset() {
    $('filters').reset(); $('official').checked = false; onlySaved = false; limit = 25; render();
  }
  $('filters').addEventListener('submit', e => e.preventDefault());
  $('filters').addEventListener('input', () => { limit = 25; render(); });
  $('official').addEventListener('change', () => { limit = 25; render(); });
  $('reset').onclick = reset; $('empty-reset').onclick = reset;
  $('more').onclick = () => { limit += 25; render(); };
  $('saved-toggle').onclick = () => { onlySaved = !onlySaved; limit = 25; render(); };
  function save(slug) {
    saved.has(slug) ? saved.delete(slug) : saved.add(slug);
    try { localStorage.setItem('quip-watchlist', JSON.stringify([...saved].sort())); } catch { toast('Saved for this session only; storage is unavailable.'); }
    render();
  }
  $('rows').addEventListener('click', e => {
    const d = e.target.closest('[data-detail]'), s = e.target.closest('[data-save]');
    if (d) openDetail(d.dataset.detail);
    if (s) save(s.dataset.save);
  });
  function showDialog(id) { returnFocus = document.activeElement; $(id).showModal(); }
  function closeDialog(id) { $(id).close(); if (returnFocus?.isConnected) returnFocus.focus(); }
  document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) closeDialog(c.dataset.close); });
  ['detail','method'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) { const b = $(id).getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeDialog(id); } }));
  $('method-open').onclick = () => showDialog('method');
  function openDetail(slug) {
    activeRow = data.rows.find(r => r.slug === slug);
    const r = activeRow;
    $('detail-content').innerHTML = `<div class="dialog-head"><span class="eyebrow">PROTOCOL DOSSIER / RANK ${r.rank} ${r.watchlist ? '· OFFICIAL WATCHLIST' : '· DISCOVERY'}</span><button data-close="detail" aria-label="Close protocol detail">Close ×</button></div>
      <div class="detail-title"><span class="monogram" aria-hidden="true">${esc(r.name[0])}</span><div><h2 id="detail-title">${esc(r.name)}</h2><p>${esc(r.category)} · ${esc(r.chains.join(' · ') || 'Unknown chain')} · No token recorded</p></div></div>
      <div class="detail-tabs" role="tablist" aria-label="Protocol research"><button id="tab-value" role="tab" aria-selected="true" aria-controls="tab-panel" data-tab="value">Valuation & evidence</button><button id="tab-peers" role="tab" aria-selected="false" aria-controls="tab-panel" tabindex="-1" data-tab="peers">Peer comparables</button><button id="tab-plan" role="tab" aria-selected="false" aria-controls="tab-panel" tabindex="-1" data-tab="plan">Diligence plan</button></div><div id="tab-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-value"></div>`;
    detailTab('value'); showDialog('detail'); $('detail').scrollTop = 0;
  }
  function detailTab(tab) {
    const r = activeRow, m = r.model;
    document.querySelectorAll('[data-tab]').forEach(el => { const on = el.dataset.tab === tab; el.setAttribute('aria-selected', on); el.tabIndex = on ? 0 : -1; });
    $('tab-panel').setAttribute('aria-labelledby', 'tab-' + tab);
    if (tab === 'value') $('tab-panel').innerHTML = `<div class="detail-grid"><section class="panel"><p class="eyebrow">CONDITIONAL IMPLIED MARKET CAP</p><div class="big-value">${money(r.implied_value_usd)}</div><p class="subtle">${full(r.implied_value_usd)} · base scenario · not FDV</p><div class="scenario-bars">${[['Bear',r.bear_usd],['Base',r.implied_value_usd],['Bull',r.bull_usd]].map(([label,v]) => `<div class="scenario ${label.toLowerCase()}"><span>${label}</span><div class="track"><div class="fill" style="width:${100*v/r.bull_usd}%"></div></div><strong>${money(v)}</strong></div>`).join('')}</div><div class="decomposition"><span>TVL ${money(r.tvl_usd)}</span><span>× ${ratio(m.median)} peer median</span><span>× ${ratio(r.growth_factor)} growth</span><span>× ${ratio(r.maturity_factor)} maturity</span></div></section><section class="panel"><h3>Snapshot evidence</h3><dl class="facts"><div><dt>7D TVL change</dt><dd>${pct(r.change_7d)}</dd></div><div><dt>Tracked since</dt><dd>${esc(r.listed_at)}</dd></div><div><dt>Days tracked, not launch age</dt><dd>${r.age_days ?? 'Unknown'}</dd></div><div><dt>Evidence confidence</dt><dd>${r.confidence}</dd></div><div><dt>Peer pool</dt><dd>${m.count} / ${esc(m.scope)}</dd></div><div><dt>Risk lens</dt><dd>${r.risk}</dd></div></dl><p class="subtle">Source record: ${esc(r.slug)} · frozen ${data.as_of}. Token ID, symbol and observed market cap: ${r.gecko_id || r.symbol || r.mcap_usd ? 'see recorded fields in export' : 'not reported'}.</p></section></div><div class="caveat"><strong>Unknowns that matter.</strong> Circulating supply, dilution, token rights, launch intent and executable liquidity are unknown. No launch probability is predicted. Protocol leverage is unreported; plans avoid borrowing and leveraged trades. Smart-contract, deposit, counterparty and bridge risks remain.</div><section class="detail-section"><h3>Why this estimate moves</h3><p>${r.name ? esc(r.name) : ''} is valued against ${m.count} ${esc(m.scope.toLowerCase())} peers (${m.category_count} exact-category observations). TVL is the main scale driver; a ±10% TVL change moves implied cap ±10%, all else equal. Growth is bounded to a ±10% valuation effect; maturity ranges 0.70–1.00. ${r.change_7d === null ? 'Missing growth uses a neutral factor.' : 'Observed TVL change may reflect asset prices rather than user flows.'} ${m.scope !== 'Category' ? 'Fallback comparability is weak: inspect the peer pool before relying on it.' : 'Same category does not imply the same token economics.'}</p></section>`;
    if (tab === 'peers') $('tab-panel').innerHTML = `<h3>${esc(m.scope)} / ${m.count} observations</h3><p class="subtle">Raw market-cap/TVL ratios are shown below. Model winsorization caps: ${ratio(m.low)} / ${ratio(m.high)}. Full selected pool, not cherry-picked.</p><div class="peer-summary"><span>Q25 ${ratio(m.bear)}</span><span>Median ${ratio(m.median)}</span><span>Q75 ${ratio(m.bull)}</span><span>${m.category_count} exact-category peers</span></div><div class="peer-table"><table><thead><tr><th>Token-bearing protocol</th><th>Category</th><th class="number">Market cap</th><th class="number">TVL</th><th class="number">Raw ratio</th></tr></thead><tbody>${m.peers.map(p => `<tr><td>${esc(p.name)}<small>${esc(p.slug)}</small></td><td>${esc(p.category)}</td><td class="number">${money(p.mcap)}</td><td class="number">${money(p.tvl)}</td><td class="number">${ratio(p.ratio)}</td></tr>`).join('')}</tbody></table></div><div class="caveat">Market cap is not FDV. Peer tokens may have different circulating fractions, rights and fee capture. Multiple products may share a token valuation; observations are not necessarily independent.</div>`;
    if (tab === 'plan') $('tab-panel').innerHTML = `<h3>Research first. Participation optional.</h3><p class="subtle">Category-derived workflow, not verified project instructions. No campaign, point program, minimum deposit or eligibility promise is known.</p><ol class="plan">${r.farm_steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="copy-actions"><button id="copy-plan">Copy research plan</button><button data-save="${esc(r.slug)}">${saved.has(r.slug) ? 'Unsave protocol' : 'Save protocol'}</button></div>`;
  }
  $('detail').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]'), s = e.target.closest('[data-save]');
    if (tab) detailTab(tab.dataset.tab);
    if (s) { save(s.dataset.save); detailTab('plan'); }
    if (e.target.id === 'copy-plan') copyText(activeRow.name + '\n' + activeRow.farm_steps.map((s,i) => `${i+1}. ${s}`).join('\n\n'));
  });
  $('detail').addEventListener('keydown', e => {
    if (!e.target.matches('[data-tab]') || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault(); const tabs = [...document.querySelectorAll('[data-tab]')];
    let i = tabs.indexOf(e.target); i = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
    detailTab(tabs[i].dataset.tab); tabs[i].focus();
  });
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Research plan copied.'); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); const ok = document.execCommand('copy'); t.remove(); toast(ok ? 'Research plan copied.' : 'Copy unavailable; export the board instead.'); }
  }
  $('export').onclick = () => {
    const payload = { as_of: data.as_of, note: 'Conditional market cap scenarios, not FDV or investment advice. No launch/reward guarantee.', rows: visible };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'quip-watchlist-' + data.as_of + '.json'; a.click(); URL.revokeObjectURL(url); toast(`Exported ${visible.length} filtered protocols.`);
  };
  render();
})();
