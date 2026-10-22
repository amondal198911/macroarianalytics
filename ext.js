/* ================= version 1.1 additions ================= */
const ARTIFACT_URL = 'https://claude.ai/artifact/JpwNpmbYD85T4QmYirumxV';
const STANDALONE = !window.claude && /^https?:$/.test(location.protocol);
const BASE_URL = STANDALONE ? location.origin + location.pathname : ARTIFACT_URL;
const EMAIL = ['arian.hu.idec', 'gmail.com'].join('@');
function blobSave(filename, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
  const a = el('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function renderEmail() {
  $$('[data-email]').forEach(n => { n.textContent = EMAIL; n.setAttribute('href', 'mailto:' + EMAIL); });
  $$('[data-email-btn]').forEach(n => n.setAttribute('href', 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Macro-Economic Monitor')));
}
const NAVNAME = { overview: 'Overview', countries: 'Countries', compare: 'Compare', explore: 'Explore', map: 'World map', rankings: 'Rankings', markets: 'Markets', learn: 'Learn the indicators', methods: 'Methods and notes', about: 'About', contact: 'Contact', privacy: 'Privacy' };
let CM = null;
let dotDrawn = false;
let cLog = !!store.get('mm.log', false);
if (!cmp.scale) cmp.scale = 'lin';
const LOGGABLE = k => ['usd', 'usdbn', 'mn', 'fx'].includes(IND[k].fmt);
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

/* ---------- gap-aware lookup for survey-based indicators ---------- */
function pick(key, code, y) {
  const v = val(key, code, y);
  if (v != null) return { v, y };
  if (!IND[key] || !IND[key].sparse) return null;
  for (let k = 1; k <= 5; k++) { const w = val(key, code, y - k); if (w != null) return { v: w, y: y - k }; }
  return null;
}
function defaultYear(key) {
  const c = COV[key];
  if (!c) return LAST;
  if (!IND[key].sparse) return c.best;
  const cnt = y => COUNTRIES.reduce((n, e) => n + (pick(key, e.code, y) ? 1 : 0), 0);
  let best = c.last, bestN = cnt(c.last);
  for (let y = c.last - 1; y >= c.last - 6; y--) { const n = cnt(y); if (n > bestN * 1.05) { best = y; bestN = n; } }
  return best;
}
function valueCell(key, pk, Y) {
  const td = el('td', { class: 'c' });
  if (!pk) { td.append(el('span', { class: 'cell dash', text: '–' })); return td; }
  const span = el('span', { class: 'cell', text: fmt(key, pk.v) });
  if (pk.y !== Y) span.append(el('sup', { text: yy(pk.y) }));
  const c = colorOf(key, pk.v);
  if (c) { span.style.background = c; span.style.color = textOn(c); }
  td.append(span);
  return td;
}

/* ---------- toast, share ---------- */
let toastTimer = null;
function toast(text) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
}
async function shareView(token, label) {
  const url = BASE_URL + '#' + token;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); toast('Link copied: ' + label); return; }
  } catch (e) { /* use the share sheet instead */ }
  $('#share-what').textContent = label;
  $('#share-url').value = url;
  $('#share-sheet').hidden = false;
  setTimeout(() => { const i = $('#share-url'); i.focus(); i.select(); }, 40);
}
function closeShare() { $('#share-sheet').hidden = true; }

/* ---------- chart image export and data tables ---------- */
async function exportChart(node, title, sub, filename, src) {
  const rec = charts.get(node);
  if (!DL && !STANDALONE) { toast('Images can be downloaded when the site is open in Claude.'); return; }
  if (!rec || !rec.inst || typeof rec.inst.renderToSVGString !== 'function') { toast('Scroll the chart into view, then try again.'); return; }
  const TH = theme();
  const w = Math.max(320, node.clientWidth), h = Math.max(200, node.clientHeight);
  const pad = 24, head = 64, foot = 34, scale = 2;
  const W = w + pad * 2, H = h + head + foot;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(rec.inst.renderToSVGString());
  try { await img.decode(); } catch (e) { toast('That chart couldn’t be turned into an image.'); return; }
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = H * scale;
  const cx = cv.getContext('2d');
  cx.scale(scale, scale);
  cx.fillStyle = TH.paper; cx.fillRect(0, 0, W, H);
  cx.fillStyle = TH.ink; cx.font = '700 18px Archivo, Arial, sans-serif'; cx.fillText(title, pad, pad + 14);
  cx.fillStyle = TH.muted; cx.font = '13px Archivo, Arial, sans-serif'; cx.fillText(sub.slice(0, 120), pad, pad + 34);
  cx.drawImage(img, pad, head, w, h);
  cx.fillText('Macro-Economic Monitor by Arian Mondal. Source: ' + (src || WB) + '.', pad, H - 12);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if (!blob) { toast('That chart couldn’t be turned into an image.'); return; }
  if (!DL) { blobSave(filename, blob); return; }
  try { await DL.save({ filename, data: blob }); }
  catch (e) { const c = e && e.code; if (c !== 'declined' && c !== 'rate_limited') toast('The download didn’t start. Try again.'); }
}
function cardTools(card, box, o) {
  const bar = el('div', { class: 'ctools' });
  const tb = el('button', { type: 'button', class: 'mini', 'aria-expanded': 'false', text: 'Table' });
  tb.addEventListener('click', () => {
    const open = tb.getAttribute('aria-expanded') === 'true';
    const old = card.querySelector('.ctable');
    if (old) old.remove();
    if (open) { tb.setAttribute('aria-expanded', 'false'); tb.textContent = 'Table'; return; }
    const t = o.table();
    const tbl = el('table');
    tbl.append(el('thead', null, el('tr', null, t.head.map(x => el('th', { scope: 'col', text: x })))));
    const body = el('tbody');
    t.rows.forEach(r => body.append(el('tr', null, r.map((c, i) => (i ? el('td', { text: c }) : el('th', { scope: 'row', text: c }))))));
    tbl.append(body);
    box.after(el('div', { class: 'ctable' }, tbl));
    tb.setAttribute('aria-expanded', 'true'); tb.textContent = 'Hide table';
  });
  const ib = el('button', { type: 'button', class: 'mini', 'data-dl': '', text: 'Image' });
  ib.hidden = !(DL || STANDALONE);
  ib.addEventListener('click', () => exportChart(box, o.title, o.sub(), o.file, o.src));
  bar.append(tb, ib);
  card.prepend(bar);
}
function profileTable(code, sp) {
  const keys = sp.k.filter(k => S[k] && S[k][code]);
  let y0 = 9999, y1 = 0;
  keys.forEach(k => { const s = S[k][code]; y0 = Math.min(y0, s.y0); y1 = Math.max(y1, s.y0 + s.v.length - 1); });
  const head = ['Year'].concat(keys.map(k => (sp.names ? sp.names[sp.k.indexOf(k)] : IND[k].short)));
  const rows = [];
  for (let y = y1; y >= y0; y--) {
    const vals = keys.map(k => val(k, code, y));
    if (vals.every(v => v == null)) continue;
    rows.push([String(y)].concat(vals.map((v, i) => (v == null ? '–' : fmt(keys[i], v)))));
  }
  return { head, rows };
}
function scaleOpt(opt, mode, values) {
  const vs = values.filter(v => typeof v === 'number' && isFinite(v));
  if (mode === 'log' && vs.length && vs.every(v => v > 0)) {
    opt.yAxis.type = 'log'; opt.yAxis.logBase = 10; delete opt.yAxis.scale; delete opt.yAxis.splitNumber;
    opt.series.forEach(s => { delete s.areaStyle; });
  } else if (mode === 'trim' && vs.length > 8) {
    const sorted = vs.slice().sort((a, b) => a - b);
    const q = p => sorted[Math.floor(p * (sorted.length - 1))];
    const lo = q(0.05), hi = q(0.95), pad = (hi - lo) * 0.15 || 1;
    opt.yAxis.min = Math.floor(lo - pad); opt.yAxis.max = Math.ceil(hi + pad);
  }
  return opt;
}

/* ---------- flags ---------- */
function detectFlags() {
  try {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.textBaseline = 'top'; x.font = '20px sans-serif';
    x.fillText('\u{1F1FA}\u{1F1F8}', 0, 0);
    const d = x.getImageData(0, 0, 24, 24).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) colored++;
    return colored > 10;
  } catch (e) { return true; }
}

/* ---------- home page: count-up, dot map, ticker, insights ---------- */
function heroCount() {
  const g = latest('gdp_growth', 'WLD');
  if (!g) return;
  const h = $('#hero-title');
  const target = Math.abs(g.v);
  const finalText = 'The world economy ' + (g.v >= 0 ? 'grew ' : 'shrank ') + num(target, 1) + '% in ' + g.y + '.';
  h.setAttribute('aria-label', finalText);
  const span = el('span', { class: 'count', 'aria-hidden': 'true', text: num(RM ? target : 0, 1) });
  h.textContent = '';
  h.append(el('span', { 'aria-hidden': 'true', text: 'The world economy ' + (g.v >= 0 ? 'grew ' : 'shrank ') }), span, el('span', { 'aria-hidden': 'true', text: '% in ' + g.y + '.' }));
  if (RM) return;
  const t0 = performance.now(), dur = 1300;
  const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); span.textContent = num(target * e, 1); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const DOT_BINS = [['neg', 'Shrank'], ['b1', '0 to 1.5%'], ['b2', '1.5 to 3%'], ['b3', '3 to 5%'], ['b4', '5% or more'], ['none', 'No figure']];
function dotClass(v) { return v == null ? 'none' : v < 0 ? 'neg' : v < 1.5 ? 'b1' : v < 3 ? 'b2' : v < 5 ? 'b3' : 'b4'; }
function drawDotMap() {
  const host = $('#dotmap-svg'), G = RAW.geo.dots;
  if (!host || !G) return;
  const s = G.s, W = RAW.geo.w, H = RAW.geo.h;
  const g = latest('gdp_growth', 'WLD'), Y = g ? g.y : LAST;
  const vals = G.iso.map(iso => (iso ? val('gdp_growth', iso, Y) : null));
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Dot map of the world. Each dot is land, coloured by that economy’s real GDP growth in ' + Y + '.' });
  const groups = {};
  for (let i = 0; i < G.d.length; i += 3) {
    const k = G.d[i + 2], cls = dotClass(vals[k]);
    (groups[cls] || (groups[cls] = [])).push(i);
  }
  for (const [cls] of DOT_BINS.slice().reverse()) {
    const list = groups[cls]; if (!list) continue;
    const gg = sv('g', { class: 'dm dm-' + cls });
    for (const i of list) gg.append(sv('circle', { cx: (s / 2 + G.d[i] * s).toFixed(1), cy: (s / 2 + G.d[i + 1] * s).toFixed(1), r: (s * 0.37).toFixed(2), 'data-k': G.d[i + 2] }));
    svg.append(gg);
  }
  host.innerHTML = '';
  host.append(svg);
  const lg = $('#dot-legend'); lg.innerHTML = '';
  for (const [cls, label] of DOT_BINS) lg.append(el('span', null, el('i', { class: 'k-' + cls }), label));
  $('#dotmap-cap').textContent = 'Each dot is land, coloured by that economy’s real GDP growth in ' + Y + '. Hover or tap a dot.';
  const tip = $('#dot-tip');
  const hit = ev => { const t = ev.target; return t && t.tagName === 'circle' ? Number(t.getAttribute('data-k')) : -1; };
  const show = ev => {
    const k = hit(ev);
    if (k < 0) { tip.style.opacity = 0; return; }
    const iso = G.iso[k], e = ECON[iso], v = vals[k];
    tip.innerHTML = '';
    tip.append(el('b', { text: e ? e.name : 'No data' }), document.createTextNode(e ? (v == null ? 'No growth figure for ' + Y : 'Real growth ' + num(v, 1) + '% in ' + Y) : ''));
    const r = host.getBoundingClientRect();
    let x = ev.clientX - r.left + 12;
    const yv = ev.clientY - r.top + 12;
    if (x > r.width - 190) x = ev.clientX - r.left - 200;
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = yv + 'px'; tip.style.opacity = 1;
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
  svg.addEventListener('click', ev => {
    const k = hit(ev); if (k < 0) return;
    show(ev);
    const iso = G.iso[k], e = ECON[iso]; if (!e) return;
    const info = $('#dot-info'); info.innerHTML = '';
    info.append(el('span', null, el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(e) + ' ' }), el('b', { text: e.name }), document.createTextNode(vals[k] == null ? ': no growth figure for ' + Y : ': ' + num(vals[k], 1) + '% in ' + Y)),
      el('button', { type: 'button', class: 'btn glow small', 'data-country': iso, text: 'Open ' + e.name }));
  });
  if (!dotDrawn && !RM) { const f = $('#dotmap'); f.classList.add('sweep'); setTimeout(() => f.classList.remove('sweep'), 2600); }
  dotDrawn = true;
}
function buildTicker() {
  const track = $('#ticker-track');
  if (!track) return;
  const items = [];
  const g = latest('gdp_growth', 'WLD');
  if (g) items.push({ name: 'World growth', value: num(g.v, 1) + '%', chg: null, when: String(g.y) });
  for (const k of ['brent', 'wti', 'gas', 'gold', 'us10y', 'uscpi']) {
    const D = MKD[k];
    items.push({ name: MK[k].name, value: mkFmt(k, D.last.v), chg: mkChange(k, D.last.v, D.back.y1), when: D.last.daily ? fmtDay(D.last.d) : fmtMonth(D.last.d) });
  }
  for (const c of ['EUR', 'JPY', 'GBP', 'CNY', 'INR']) {
    const D = FXD[c]; if (!D) continue;
    items.push({ name: 'US$ in ' + c, value: sig(D.last.v), chg: mkChange('fx', D.last.v, D.back.y1), when: fmtMonth(D.last.d) });
  }
  const set = hidden => {
    const s = el('div', { class: 'tk-set' });
    if (hidden) s.setAttribute('aria-hidden', 'true');
    for (const it of items) s.append(el('span', { class: 'tk' }, el('b', { text: it.name }), el('span', { class: 'tk-v', text: it.value }),
      it.chg ? el('span', { class: 'tk-c ' + (it.chg.charAt(0) === '▲' ? 'up' : 'down'), text: it.chg + ' y/y' }) : null, el('span', { class: 'tk-w', text: it.when })));
    return s;
  };
  track.innerHTML = '';
  track.append(set(false), set(true));
  const btn = $('#ticker-btn'), tk = $('#ticker');
  const setPaused = p => { tk.classList.toggle('paused', p); btn.innerHTML = p ? ICON_PLAY : ICON_PAUSE; btn.setAttribute('aria-label', p ? 'Play the price ticker' : 'Pause the price ticker'); };
  btn.addEventListener('click', () => { const p = !tk.classList.contains('paused'); setPaused(p); store.set('mm.tkpause', p); });
  setPaused(RM || !!store.get('mm.tkpause', false));
}
function renderInsights() {
  const box = $('#insights');
  if (!box) return;
  box.innerHTML = '';
  const Y = LAST;
  const cards = [];
  const shrank = y => COUNTRIES.filter(e => bigEnough(e.code, y) && val('gdp_growth', e.code, y) != null && val('gdp_growth', e.code, y) < 0).length;
  cards.push({ big: String(shrank(Y)), text: 'economies shrank in ' + Y + ', compared with ' + shrank(2020) + ' in the pandemic year of 2020.', cta: 'See the slowest', act: () => openRank('gdp_growth', Y, 'asc') });
  const hot = y => COUNTRIES.filter(e => bigEnough(e.code, y) && val('inflation', e.code, y) != null && val('inflation', e.code, y) > 10).length;
  let peakY = Y, peakN = hot(Y);
  for (let y = Y - 5; y < Y; y++) { const n = hot(y); if (n > peakN) { peakN = n; peakY = y; } }
  cards.push({ big: String(hot(Y)), text: 'economies had inflation above 10% in ' + Y + (peakY !== Y ? ', down from ' + peakN + ' in ' + peakY + '.' : '.'), cta: 'Map inflation', act: () => openMap('inflation', Y) });
  const large = COUNTRIES.filter(e => (popAt(e.code, Y) || 0) >= 50).map(e => ({ e, v: val('gdp_growth', e.code, Y) })).filter(r => r.v != null).sort((a, b) => b.v - a.v)[0];
  if (large) cards.push({ big: num(large.v, 1) + '%', text: large.e.name + ' was the fastest-growing large economy (more than 50 million people) in ' + Y + '.', cta: 'Open ' + large.e.name, act: () => go('countries', { code: large.e.code }) });
  const w = val('gdp_usd', 'WLD', Y), trio = ['USA', 'CHN', 'IND'].map(c => val('gdp_usd', c, Y));
  if (w && trio.every(v => v != null)) cards.push({ big: num(trio.reduce((a, b) => a + b, 0) / w * 100, 0) + '%', text: 'of world GDP in ' + Y + ' came from just three economies: the United States, China and India.', cta: 'Compare them', act: () => { cmp.key = 'gdp_usd'; cmp.codes = ['USA', 'CHN', 'IND']; if (inited.compare) $('#cmp-ind').value = 'gdp_usd'; go('compare'); } });
  const b = MKD.brent;
  if (b.back.y1) { const p = (b.last.v / b.back.y1 - 1) * 100; cards.push({ big: (p >= 0 ? '+' : MINUS) + num(Math.abs(p), 0) + '%', text: 'change in the price of Brent crude oil over the past year, to $' + num(b.last.v, 2) + ' a barrel on ' + fmtDay(b.last.d) + '.', cta: 'See oil prices', act: () => { mkSel = 'brent'; go('markets'); } }); }
  const pov = COUNTRIES.map(e => pick('poverty', e.code, Y)).filter(Boolean);
  if (pov.length > 30) cards.push({ big: String(pov.filter(p => p.v >= 20).length), text: 'economies have one person in five or more living on less than $3.00 a day, on their latest figures from the past five years.', cta: 'Map poverty', act: () => openMap('poverty', null) });
  for (const c of cards) box.append(el('button', { type: 'button', class: 'insight', onclick: c.act }, el('span', { class: 'in-big', text: c.big }), el('span', { class: 'in-text', text: c.text }), el('span', { class: 'in-cta', text: c.cta })));
}
function initOverviewExt() {
  heroCount();
  drawDotMap();
  buildTicker();
  renderInsights();
  const s = S.gdp_growth.WLD;
  if (s) $('#pulse-h').textContent = (LAST - s.y0 + 1) + ' years of world growth';
}

/* ---------- deep links to every view ---------- */
function openMap(key, year) {
  if (IND[key] && IND[key].scale) mapKey = key;
  mapYear = year || null;
  if (inited.map) { $('#map-ind').value = mapKey; setupYear(); paintMap(); }
  go('map');
}
function openRank(key, year, sort) {
  if (IND[key] && IND[key].scale) rk.key = key;
  rk.year = year || null;
  if (sort) rk.sort = sort;
  if (inited.rankings) { $('#rk-ind').value = rk.key; setupRankYears(); }
  go('rankings');
}
function openExplore(x, y, year) {
  ex.x = IND[x] && IND[x].scale ? x : ex.x;
  ex.y = IND[y] && IND[y].scale ? y : ex.y;
  ex.pendingYear = year || null;
  if (inited.explore) setEx(ex.x, ex.y, year);
  go('explore');
}
function routeExt(h) {
  const parts = h.split('~'), head = parts[0];
  if (parts.length < 2) return false;
  if (head === 'compare') {
    if (IND[parts[1]] && parts[1] !== 'fx') cmp.key = parts[1];
    if (parts[2]) { const cs = parts[2].split('.').map(c => c.toUpperCase()).filter(c => ECON[c]); if (cs.length) cmp.codes = cs.slice(0, 8); }
    if (inited.compare) $('#cmp-ind').value = cmp.key;
    go('compare'); return true;
  }
  if (head === 'map') { openMap(parts[1], Number(parts[2]) || null); return true; }
  if (head === 'rank') { openRank(parts[1], Number(parts[2]) || null, parts[3] === 'asc' ? 'asc' : 'desc'); return true; }
  if (head === 'explore') { openExplore(parts[1], parts[2], Number(parts[3]) || null); return true; }
  if (head === 'markets') { if (MK[parts[1]]) mkSel = parts[1]; if (parts[1] === 'fx' && parts[2] && FXD[parts[2]]) fxCur = parts[2]; go('markets'); return true; }
  return false;
}

/* ---------- country page additions ---------- */
const FY_SPAN = { IND: 'April to March', PAK: 'July to June', BGD: 'July to June', EGY: 'July to June', NPL: 'mid-July to mid-July', IRN: 'late March to late March', ETH: 'July to July' };
function countryNotes(code) {
  const e = ECON[code], out = [];
  if (FY_SPAN[code]) out.push('The World Bank records ' + poss(e.name) + ' national accounts by its fiscal year (' + FY_SPAN[code] + '), not the calendar year, so a year shown here can span two calendar years.');
  const g = latest('gdp_growth', code);
  if (!e.group && g && g.y <= LAST - 3) out.push('The latest World Bank growth figure for ' + e.name + ' is for ' + g.y + '. Newer national accounts are not available in this source.');
  if (!e.group && !g) out.push('The World Bank publishes no GDP growth figures for ' + e.name + '.');
  const M = RAW.meta;
  if (M.euro && M.euro[code]) out.push('Exchange rates from before ' + e.name + ' adopted the euro in ' + M.euro[code][0] + ' are converted to euros at the fixed conversion rate of ' + M.euro[code][1] + ' to the euro, so the series runs smoothly.');
  if (M.fx_breaks && M.fx_breaks[code]) out.push('The exchange-rate series changes currency unit in ' + M.fx_breaks[code].join(', ') + ', for example after a redenomination or a switch to another currency, so the currency change for ' + (M.fx_breaks[code].length > 1 ? 'those years' : 'that year') + ' is left blank.');
  if (S.gov_debt[code]) out.push('Government debt covers the central government only, so it can be lower than broader measures that include regional and local government.');
  if (S.poverty[code] || S.gini[code]) out.push('Poverty and inequality come from household surveys, which are run every few years. Lines on those charts join the survey years.');
  return out;
}
function renderCountryNotes(code) {
  const box = $('#c-notes');
  box.innerHTML = '';
  const notes = countryNotes(code);
  box.hidden = !notes.length;
  if (!notes.length) return;
  box.append(el('details', null, el('summary', { text: 'Notes on the data (' + notes.length + ')' }), el('ul', null, notes.map(n => el('li', { text: n }))),
    el('button', { type: 'button', class: 'linklike', 'data-go': 'methods', 'data-anchor': 'me-notes-h', text: 'Read the methods and notes' })));
}
const RANK_KEYS = [['gdp_growth', 'higher'], ['gdp_pc_ppp', 'higher'], ['inflation', null], ['unemployment', 'lower'], ['poverty', 'lower'], ['gini', 'lower'], ['current_account', null], ['budget', null]];
function renderRanks(code) {
  const box = $('#c-ranks');
  box.innerHTML = '';
  const e = ECON[code];
  if (e.group) { box.hidden = true; return; }
  const items = [];
  for (const [k, better] of RANK_KEYS) {
    const me = IND[k].sparse ? pick(k, code, LAST) : latest(k, code);
    if (!me) continue;
    const pool = COUNTRIES.filter(x => bigEnough(x.code, LAST)).map(x => (IND[k].sparse ? pick(k, x.code, LAST) : (val(k, x.code, me.y) == null ? null : { v: val(k, x.code, me.y) }))).filter(Boolean).map(p => p.v);
    if (pool.length < 25) continue;
    const below = pool.filter(v => v < me.v).length, same = pool.filter(v => v === me.v).length;
    items.push({ k, v: me.v, y: me.y, p: ((below + same / 2) / pool.length) * 100, n: pool.length, better });
  }
  box.hidden = !items.length;
  if (!items.length) return;
  box.append(el('h2', { text: 'How ' + e.name + ' compares' }),
    el('p', { class: 'note', text: 'Where each figure sits among economies with at least 1 million people, from the lowest value (left) to the highest (right).' }));
  const grid = el('div', { class: 'ranks' });
  for (const it of items) {
    const I = IND[it.k];
    grid.append(el('div', { class: 'rk' },
      el('div', { class: 'rk-h' }, el('span', { class: 'rk-l', text: I.short }), el('span', { class: 'rk-v', text: fmt(it.k, it.v) + ' (' + it.y + ')' })),
      el('div', { class: 'rk-track', 'aria-hidden': 'true' }, el('i', { style: 'left:' + Math.max(0, Math.min(100, it.p)).toFixed(1) + '%' })),
      el('div', { class: 'rk-s', text: 'Higher than ' + Math.round(it.p) + '% of ' + it.n + ' economies' + (it.better ? '. ' + (it.better === 'higher' ? 'Higher' : 'Lower') + ' is generally better.' : '.') })));
  }
  box.append(grid);
}
function initCountriesExt() {
  $('#c-share').addEventListener('click', () => shareView('country-' + curCountry, ECON[curCountry].name));
  const lg = $('#c-log');
  lg.checked = cLog;
  lg.addEventListener('change', () => {
    cLog = lg.checked; store.set('mm.log', cLog);
    for (const [node, rec] of charts) if ($('#c-sections').contains(node)) { rec.dirty = true; rec.reset = true; if (rec.visible) applyChart(node, rec); }
  });
}

/* ---------- compare, map, rankings, markets additions ---------- */
function syncCmpScale() {
  const vals = [];
  for (const c of cmp.codes) { const s = S[cmp.key][c]; if (s) s.v.forEach(v => { if (v != null) vals.push(v); }); }
  const canLog = vals.length > 0 && vals.every(v => v > 0);
  if (cmp.scale === 'log' && !canLog) cmp.scale = 'lin';
  $$('#cmp-scale button').forEach(b => {
    const s = b.getAttribute('data-s');
    b.setAttribute('aria-pressed', s === cmp.scale ? 'true' : 'false');
    if (s === 'log') { b.disabled = !canLog; b.title = canLog ? 'Equal steps mean equal percentage changes' : 'Log scale needs every value to be above zero'; }
  });
  $('#cmp-scale-note').textContent = cmp.scale === 'trim' ? 'Extreme values run off the chart so the rest are easier to read. Hover a line to see its exact value.'
    : cmp.scale === 'log' ? 'Log scale: equal steps on the chart mean equal percentage changes.' : '';
}
function initCompareExt() {
  $('#cmp-scale').addEventListener('click', e => {
    const b = e.target.closest('button[data-s]'); if (!b || b.disabled) return;
    cmp.scale = b.getAttribute('data-s');
    const rec = charts.get($('#cmp-chart')); if (rec) rec.reset = true;
    renderCompare();
  });
  $('#cmp-share').addEventListener('click', () => shareView('compare~' + cmp.key + '~' + cmp.codes.join('.'), IND[cmp.key].label + ' for ' + cmp.codes.length + ' economies'));
  $('#cmp-dl').addEventListener('click', () => exportChart($('#cmp-chart'), IND[cmp.key].label, cmp.codes.map(c => ECON[c].name).join(', '), 'macro-monitor-compare-' + cmp.key + '.png', IND[cmp.key].src));
}
function initMapExt() {
  $('#map-share').addEventListener('click', () => shareView('map~' + mapKey + '~' + mapYear, 'World map of ' + IND[mapKey].label.toLowerCase() + ', ' + mapYear));
}
function initRankExt() {
  $('#rk-share').addEventListener('click', () => shareView('rank~' + rk.key + '~' + rk.year + '~' + rk.sort, 'Ranking of ' + IND[rk.key].label.toLowerCase() + ', ' + rk.year));
}
function initMarketsExt() {
  $('#mk-share').addEventListener('click', () => shareView('markets~' + mkSel + (mkSel === 'fx' ? '~' + fxCur : ''), mkSel === 'fx' ? 'US dollar in ' + CUR[fxCur] : MK[mkSel].name));
  $('#mk-img').addEventListener('click', () => exportChart($('#mk-chart'), $('#mk-title').textContent, MK[mkSel].unit, 'macro-monitor-' + mkSel + '.png', MK[mkSel].src));
}

/* ---------- explore: animated bubble chart ---------- */
const ex = { x: 'gdp_pc_ppp', y: 'poverty', year: null, logX: true, logY: false, timer: null, pendingYear: null };
const EX_PRESETS = [
  ['Income and poverty', 'gdp_pc_ppp', 'poverty'], ['Inflation and unemployment', 'unemployment', 'inflation'],
  ['Investment and growth', 'investment', 'gdp_growth'], ['Debt and deficits', 'gov_debt', 'budget'],
  ['Income and inequality', 'gdp_pc_ppp', 'gini'], ['Women at work and income', 'gdp_pc_ppp', 'lfp_f'],
  ['Remittances and income', 'gdp_pc', 'remittances'], ['Trade and income', 'exports', 'gdp_pc']
];
const REG_L = { Africa: '#D4583A', Americas: '#1F5FA8', Asia: '#C98500', Europe: '#6B2CB0', Oceania: '#1F8A7D' };
const REG_D = { Africa: '#F4A27F', Americas: '#6FA8E8', Asia: '#F2B630', Europe: '#B388EB', Oceania: '#4CC9B0' };
function exPoints(Y, raw) {
  const out = [];
  for (const e of COUNTRIES) {
    const a = pick(ex.x, e.code, Y), b = pick(ex.y, e.code, Y);
    if (!a || !b) continue;
    if (!raw && ((ex.logX && a.v <= 0) || (ex.logY && b.v <= 0))) continue;
    out.push({ e, x: a.v, y: b.v, xy: a.y, yy: b.y, pop: popAt(e.code, Y) });
  }
  return out;
}
function exRange() {
  const a = COV[ex.x], b = COV[ex.y], sx = IND[ex.x].sparse, sy = IND[ex.y].sparse;
  const lo = Math.max(a.first, b.first, 1970);
  const hi = sx && !sy ? b.last : sy && !sx ? a.last : sx && sy ? Math.max(a.last, b.last) : Math.min(a.last, b.last);
  return [lo, Math.max(lo, hi)];
}
function exBestYear() {
  const [lo, hi] = exRange();
  let best = hi, bestN = exPoints(hi).length;
  for (let y = hi - 1; y >= Math.max(lo, hi - 6); y--) { const n = exPoints(y).length; if (n > bestN * 1.1) { best = y; bestN = n; } }
  return best;
}
function trend(pts) {
  if (pts.length < 8) return null;
  const tx = v => (ex.logX ? Math.log10(v) : v), ty = v => (ex.logY ? Math.log10(v) : v);
  const X = pts.map(p => tx(p.x)), Yv = pts.map(p => ty(p.y));
  const n = X.length, mx = X.reduce((a, b) => a + b, 0) / n, my = Yv.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const dx = X[i] - mx, dy = Yv[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  if (!sxx || !syy) return null;
  const b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy);
  const x0 = Math.min(...X), x1 = Math.max(...X), inv = (v, lg) => (lg ? Math.pow(10, v) : v);
  const ymin = Math.min(...Yv), ymax = Math.max(...Yv), seg = [];
  for (let i = 0; i <= 40; i++) { const xv = x0 + ((x1 - x0) * i) / 40, yv = a + b * xv; if (yv >= ymin && yv <= ymax) seg.push([inv(xv, ex.logX), inv(yv, ex.logY)]); }
  const ar = Math.abs(r);
  const strength = ar < 0.2 ? 'little or no' : ar < 0.4 ? 'a weak' : ar < 0.6 ? 'a moderate' : 'a strong';
  const dir = ar < 0.2 ? '' : r > 0 ? ' positive' : ' negative';
  return { line: seg.length >= 2 ? [seg[0], seg[seg.length - 1]] : [], r,
    text: 'Correlation r = ' + num(r, 2) + ', ' + strength + dir + ' relationship. A correlation shows a pattern, not a cause.' };
}
function exOption(TH, pts, T, node) {
  if (pts.length < 3) return null;
  const RC = TH.dark ? REG_D : REG_L;
  const narrow = node && node.clientWidth < 600;
  const LABEL = new Set((narrow ? ['CHN', 'IND', 'USA', 'NGA', 'BRA'] : ['CHN', 'IND', 'USA', 'IDN', 'PAK', 'NGA', 'BRA', 'BGD', 'JPN', 'DEU', 'MEX', 'EGY', 'ETH', 'GBR']).concat(pins));
  const size = p => (p.pop == null ? 7 : Math.max(5, Math.min(narrow ? 40 : 56, Math.sqrt(p.pop) * (narrow ? 1.0 : 1.4))));
  const series = REGIONS.map(r => ({
    id: 'r-' + r, name: r, type: 'scatter',
    data: pts.filter(p => p.e.region === r).sort((a, b) => (b.pop || 0) - (a.pop || 0)).map(p => ({
      id: p.e.code, name: p.e.name, value: [p.x, p.y, p.pop || 0, p.xy, p.yy], symbolSize: size(p),
      label: LABEL.has(p.e.code) ? { show: true, formatter: p.e.name, position: 'top', distance: 3, color: TH.ink2, fontSize: 11, fontFamily: FONT } : { show: false }
    })),
    itemStyle: { color: RC[r], opacity: 0.8, borderColor: TH.paper, borderWidth: 0.8 },
    emphasis: { scale: 1.15, itemStyle: { opacity: 1, borderColor: TH.ink, borderWidth: 1.5 } },
    animationDurationUpdate: 750, animationEasingUpdate: 'cubicInOut'
  }));
  series.push({ id: 'trend', name: 'Trend', type: 'line', data: T ? T.line : [], showSymbol: false, silent: true, z: 1,
    lineStyle: { color: TH.muted, type: 'dashed', width: 1.5 }, tooltip: { show: false }, emphasis: { disabled: true } });
  const ax = (k, lg, nameLoc) => ({
    type: lg ? 'log' : 'value', scale: !lg, name: IND[k].label + (lg ? ' (log scale)' : ''), nameLocation: nameLoc,
    nameGap: nameLoc === 'middle' ? 30 : 14, nameTextStyle: { color: TH.ink2, fontSize: 12, fontFamily: FONT, align: nameLoc === 'middle' ? 'center' : 'left' },
    axisLine: { show: true, lineStyle: { color: TH.line } }, axisTick: { show: false }, splitLine: { lineStyle: { color: TH.grid } },
    axisLabel: { color: TH.muted, fontSize: 11, fontFamily: FONT, formatter: axisFmt(k), hideOverlap: true }
  });
  const row = (label, k, v, y) => '<div class="r"><span>' + esc(label) + '</span><b>' + esc(fmt(k, v)) + (y !== ex.year ? ' (' + y + ')' : '') + '</b></div>';
  return {
    aria: { enabled: true }, animation: !RM, animationDurationUpdate: 750, textStyle: { fontFamily: FONT },
    grid: { left: 10, right: 26, top: 40, bottom: 40, containLabel: true },
    graphic: [{ id: 'yr', type: 'text', right: 30, bottom: 56, z: 0, silent: true,
      style: { text: String(ex.year), font: '800 ' + (narrow ? 52 : 84) + 'px Archivo, Arial, sans-serif', fill: TH.dark ? 'rgba(231,238,244,0.09)' : 'rgba(14,28,43,0.08)' } }],
    tooltip: { trigger: 'item', confine: true, backgroundColor: TH.paper, borderColor: TH.line, borderWidth: 1, padding: [8, 10],
      extraCssText: 'box-shadow:0 8px 22px rgba(0,0,0,.16);border-radius:8px;', textStyle: { color: TH.ink, fontSize: 12.5, fontFamily: FONT },
      formatter: p => {
        if (!p || p.seriesId === 'trend' || !Array.isArray(p.value)) return '';
        const v = p.value;
        return '<div class="tt"><div class="y">' + esc(p.name) + '</div>' + row(IND[ex.x].short, ex.x, v[0], v[3]) + row(IND[ex.y].short, ex.y, v[1], v[4]) +
          (v[2] ? '<div class="r"><span>Population</span><b>' + esc(fmt('population', v[2])) + '</b></div>' : '') + '</div>';
      } },
    xAxis: ax(ex.x, ex.logX, 'middle'), yAxis: ax(ex.y, ex.logY, 'end'), series
  };
}
function resetEx() { const rec = charts.get($('#ex-chart')); if (rec) rec.reset = true; }
function initExplore() {
  const xs = $('#ex-x'), ys = $('#ex-y');
  fillIndSelect(xs, MAP_KEYS, ex.x);
  fillIndSelect(ys, MAP_KEYS, ex.y);
  xs.addEventListener('change', () => setEx(xs.value, ex.y));
  ys.addEventListener('change', () => setEx(ex.x, ys.value));
  const pr = $('#ex-presets');
  EX_PRESETS.forEach(([name, x, y]) => pr.append(el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', text: name, onclick: () => setEx(x, y) })));
  $('#ex-logx').addEventListener('change', e => { ex.logX = e.target.checked; resetEx(); renderExplore(); });
  $('#ex-logy').addEventListener('change', e => { ex.logY = e.target.checked; resetEx(); renderExplore(); });
  const yr = $('#ex-year');
  yr.addEventListener('input', () => { ex.year = Number(yr.value); $('#ex-yr').textContent = ex.year; renderExplore(); });
  $('#ex-play').addEventListener('click', () => (ex.timer ? exStop() : exPlay()));
  $('#ex-share').addEventListener('click', () => shareView('explore~' + ex.x + '~' + ex.y + '~' + ex.year, IND[ex.y].label + ' and ' + IND[ex.x].label.toLowerCase() + ', ' + ex.year));
  $('#ex-dl').addEventListener('click', () => exportChart($('#ex-chart'), IND[ex.y].label + ' and ' + IND[ex.x].label.toLowerCase() + ', ' + ex.year, 'Each bubble is an economy, sized by population and coloured by region.', 'macro-monitor-explore-' + ex.x + '-' + ex.y + '-' + ex.year + '.png', WB));
  setEx(ex.x, ex.y, ex.pendingYear);
}
function setEx(x, y, year) {
  exStop();
  ex.x = IND[x] && IND[x].scale ? x : 'gdp_pc_ppp';
  ex.y = IND[y] && IND[y].scale ? y : 'poverty';
  $('#ex-x').value = ex.x; $('#ex-y').value = ex.y;
  ex.logX = LOGGABLE(ex.x); ex.logY = LOGGABLE(ex.y);
  $('#ex-logx').checked = ex.logX; $('#ex-logy').checked = ex.logY;
  const [lo, hi] = exRange(), yr = $('#ex-year');
  yr.min = lo; yr.max = hi;
  ex.year = year && year >= lo && year <= hi ? year : exBestYear();
  ex.pendingYear = null;
  yr.value = ex.year; $('#ex-yr').textContent = ex.year;
  $$('#ex-presets .chip').forEach((c, i) => c.setAttribute('aria-pressed', EX_PRESETS[i][1] === ex.x && EX_PRESETS[i][2] === ex.y ? 'true' : 'false'));
  resetEx();
  renderExplore();
}
function renderExplore() {
  if (!inited.explore) return;
  const all = exPoints(ex.year, true);
  const canX = all.length > 0 && all.every(p => p.x > 0), canY = all.length > 0 && all.every(p => p.y > 0);
  const lx = $('#ex-logx'), ly = $('#ex-logy');
  lx.disabled = !canX; ly.disabled = !canY;
  if (!canX && ex.logX) { ex.logX = false; lx.checked = false; resetEx(); }
  if (!canY && ex.logY) { ex.logY = false; ly.checked = false; resetEx(); }
  const pts = exPoints(ex.year), T = trend(pts);
  const TH = theme(), RC = TH.dark ? REG_D : REG_L;
  const lg = $('#ex-legend'); lg.innerHTML = '';
  REGIONS.forEach(r => { const n = pts.filter(p => p.e.region === r).length; if (n) lg.append(el('span', null, el('i', { style: 'background:' + RC[r] + ';border-radius:50%' }), r + ' (' + n + ')')); });
  const filled = pts.filter(p => p.xy !== ex.year || p.yy !== ex.year).length;
  let note = pts.length + ' economies have both figures for ' + ex.year + '. Bubbles are sized by population.';
  if (filled) note += ' For ' + filled + ' of them, a survey-based figure comes from up to five years earlier.';
  if (T) note += ' ' + T.text;
  else if (pts.length < 8) note += ' Too few economies to measure a relationship. Try another year.';
  $('#ex-note').textContent = note;
  const node = $('#ex-chart');
  chartOn(node, TH2 => exOption(TH2, pts, T, node), { merge: true, onInit: inst => inst.on('click', p => { if (p && p.seriesId !== 'trend' && p.data && p.data.id) go('countries', { code: p.data.id }); }) });
}
function exPlay() {
  const [lo, hi] = exRange();
  if (ex.year >= hi) ex.year = lo;
  $('#ex-play').textContent = 'Pause';
  $('#ex-year').value = ex.year; $('#ex-yr').textContent = ex.year;
  renderExplore();
  ex.timer = setInterval(() => {
    if (ex.year >= hi) { exStop(); return; }
    ex.year++; $('#ex-year').value = ex.year; $('#ex-yr').textContent = ex.year; renderExplore();
  }, RM ? 1500 : 950);
}
function exStop() { if (ex.timer) clearInterval(ex.timer); ex.timer = null; const b = $('#ex-play'); if (b) b.textContent = 'Play'; }

/* ---------- methods, contact, privacy ---------- */
function initMethods() {
  $('#me-fy').textContent = Object.keys(FY_SPAN).filter(c => ECON[c]).map(c => ECON[c].name + ' (' + FY_SPAN[c] + ')').join(', ') + '.';
  const stale = COUNTRIES.filter(e => bigEnough(e.code, LAST)).map(e => ({ e, g: latest('gdp_growth', e.code) })).filter(r => !r.g || r.g.y <= LAST - 3).sort((a, b) => a.e.name.localeCompare(b.e.name));
  $('#me-stale').textContent = stale.length ? stale.map(r => r.e.name + ' (' + (r.g ? r.g.y : 'none') + ')').join(', ') + '.' : 'None.';
  const C = RAW.meta.checks;
  $('#me-checks').textContent = 'This release holds ' + C.values.toLocaleString('en-US') + ' annual values across ' + C.indicators + ' indicators. Each was checked against a plausible range: ' + C.flagged_n.toLocaleString('en-US') +
    ' (' + num((C.flagged_n / C.values) * 100, 1) + '%) fall outside it. They are kept exactly as published, because extreme years such as hyperinflations and wars are real, but they deserve a second look. As a consistency test, GDP divided by population matches the published GDP per person within 1% in ' +
    C.pc_within1.toLocaleString('en-US') + ' of ' + C.pc_pairs.toLocaleString('en-US') + ' cases (' + num((C.pc_within1 / C.pc_pairs) * 100, 1) + '%).';
  const tb = $('#me-flags');
  tb.innerHTML = '';
  tb.append(el('thead', null, el('tr', null, el('th', { text: 'Economy' }), el('th', { text: 'Indicator' }), el('th', { text: 'Year' }), el('th', { text: 'Value' }))));
  const body = el('tbody');
  C.flagged.slice(0, 10).forEach(([k, code, y, v]) => { if (ECON[code] && IND[k]) body.append(el('tr', { 'data-country': code, tabindex: '0' }, el('td', { text: ECON[code].name }), el('td', { text: IND[k].label }), el('td', { text: y }), el('td', { text: fmt(k, v) }))); });
  tb.append(body);
  const cite = 'Mondal, A. (2026). Macro-Economic Monitor (data release ' + fmtDay(RAW.meta.built) + '). ' + BASE_URL + '. Underlying data: World Bank, World Development Indicators (CC BY 4.0); U.S. Energy Information Administration; Federal Reserve Board; U.S. Bureau of Labor Statistics.';
  $('#me-cite').textContent = cite;
  $('#me-cite-btn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cite); toast('Citation copied'); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#me-cite')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Citation selected. Use your device’s copy command.'); }
  });
  $('#me-dl').addEventListener('click', downloadAll);
}
function downloadAll() {
  const rows = [['economy_code', 'economy', 'indicator_code', 'indicator', 'unit', 'year', 'value']];
  for (const k of Object.keys(IND)) {
    const I = IND[k], unit = I.fmt === 'usdbn' ? 'US$ billions' : I.fmt === 'mn' ? 'millions' : I.unit;
    for (const code in S[k]) {
      const s = S[k][code], e = ECON[code];
      if (!e) continue;
      s.v.forEach((v, i) => { if (v != null) rows.push([code, e.name, k, I.label, unit, s.y0 + i, v]); });
    }
  }
  rows.push([]);
  rows.push(['Source: World Bank, World Development Indicators (CC BY 4.0), compiled by Macro-Economic Monitor, data release ' + RAW.meta.built]);
  saveCSV('macro-monitor-all-data-' + RAW.meta.built + '.csv', rows);
}
function syncContact() {
  const card = $('#ct-target');
  if (card) card.hidden = !CM;
  const a = $('#ct-avail');
  if (a) a.textContent = 'Comments are saved with this page on claude.ai, where Arian can read and reply to them.';
}
function initContact() {
  $('#ct-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email address copied'); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#ct-email')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Address selected. Use your device’s copy command.'); }
  });
  $('#ct-btn').addEventListener('click', async () => {
    if (!CM) { toast('Comments are available when you open this site in Claude.'); return; }
    try { const r = await CM.openComposer({ element: $('#ct-target') }); if (!r || !r.opened) toast('Tap anywhere on the page once, then press the button again.'); }
    catch (e) { toast('Comments aren’t available in this view.'); }
  });
  syncContact();
}
function initPrivacy() {
  $('#pv-clear').addEventListener('click', () => {
    try { Object.keys(localStorage).filter(k => k.indexOf('mm.') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage unavailable */ }
    pins = [];
    document.documentElement.removeAttribute('data-theme');
    syncThemeBtn(); repaintAll();
    toast('Your saved settings were cleared from this browser.');
  });
}

/* ---------- search, startup ---------- */
function openSearch() { openPicker('Search the monitor', code => go('countries', { code }), null, 'all'); }
function bootEarly() {
  FLAG_OK = detectFlags();
  if (!FLAG_OK) document.documentElement.classList.add('noflag');
  renderEmail();
  if (STANDALONE) $$('[data-dl]').forEach(b => { b.hidden = false; });
  $('#search-btn').addEventListener('click', openSearch);
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag);
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k')) { if (PK.root.hidden) { e.preventDefault(); openSearch(); } }
    if (e.key === 'Escape' && !$('#share-sheet').hidden) closeShare();
  });
  $('#share-close').addEventListener('click', closeShare);
  $('#share-sheet').addEventListener('click', e => { if (e.target === $('#share-sheet')) closeShare(); });
  $('#foot-vintage').textContent = 'Data release ' + fmtDay(RAW.meta.built) + '. Annual figures run to ' + LAST + '; market prices to ' + fmtDay(MKD.brent.last.d) + '.';
}
