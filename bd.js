/* ================= Bangladesh Monitor + Forecast lab ================= */
const BDX = (() => {
const BD = (() => { try { const n = document.getElementById('bd-data'); return n ? JSON.parse(n.textContent) : null; } catch (e) { return null; } })();
const pad2 = n => String(n).padStart(2, '0');
const bdLab = (f, k) => f === 'M' ? Math.floor(k / 12) + '-' + pad2(k % 12 + 1) : f === 'Q' ? Math.floor(k / 4) + '-Q' + (k % 4 + 1) : f === 'FY' ? 'FY' + k : String(k);
const mLabAdd = (lab, n) => { const k = +lab.slice(0, 4) * 12 + (+lab.slice(5, 7)) - 1 + n; return bdLab('M', k); };
const nf = (v, d = 1) => v == null || !isFinite(v) ? '–' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
function dpOf(unit, v) {
  if (v == null) return 1;
  const a = Math.abs(v);
  if (/US\$ mn|Tk crore/.test(unit || '')) return a >= 100 ? 0 : 1;
  if (/Tk per/.test(unit || '')) return 2;
  return a >= 1000 ? 0 : a >= 10 ? 1 : 2;
}
const fv = (unit, v) => nf(v, dpOf(unit, v));
const fp = p => p == null ? '–' : p < 0.001 ? '<0.001' : nf(p, 3);
const stars = p => p == null ? '' : p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '';
const SER = k => BD && BD.series[k];
const PK = k => SER(k) && SER(k).series;
const EVENTS = [['Global financial crisis', '2008-09', '2009-06', 'GFC'], ['COVID-19', '2020-03', '2020-12', 'COVID-19'], ['Commodity price shock', '2022-03', '2022-12', 'Commodity shock'], ['Political transition', '2024-08', '2024-10', 'Transition']];
const DIR = { infl: -1, infl_avg: -1, food: -1, nonfood: -1, gdp_fy: 1, gdp_q: 1, iip: 1, inv_gdp: 1, sav_gdp: 1, pcredit: 1, cdr: -1, npl: -1, crar: 1, spread: -1,
  xr: -1, xr_dep: -1, res: 1, res_bpm6: 1, cover: 1, remit: 1, remit_g: 1, exp: 1, exp_g: 1, ca: 1, goods: 1, secinc: 1, bop: 1, fdi: 1, govcredit: -1, tax: 1, tax_g: 1, mcap: 1, mcap_g: 1 };
const CHUNKS = [
  { id: 'glance', name: 'At a glance' },
  { id: 'prices', name: 'Prices and inflation', keys: ['infl', 'infl_avg', 'food', 'nonfood'], lede: 'Consumer price inflation and its food and non-food components, with model projections and the forces behind them.' },
  { id: 'real', name: 'Real sector', keys: ['gdp_fy', 'gdp_q', 'iip', 'inv_gdp', 'sav_gdp', 'cons_gdp'], lede: 'Output growth, industrial production and the savings–investment balance.' },
  { id: 'money', name: 'Money and banking', keys: ['m2', 'rm', 'pcredit', 'cdr', 'npl', 'crar'], lede: 'Money and credit growth, bank liquidity and the health of the banking system.' },
  { id: 'rates', name: 'Interest rates', keys: ['call', 'lend', 'dep', 'spread', 'real_lend', 'bankrate'], lede: 'Money-market and bank interest rates, in nominal and real terms.' },
  { id: 'ext', name: 'External sector', keys: ['xr', 'xr_dep', 'res', 'res_bpm6', 'cover', 'remit', 'remit_g', 'exp', 'exp_g', 'imp', 'ca', 'fa', 'goods', 'secinc', 'bop', 'fdi'], lede: 'The Taka, foreign exchange reserves, remittances, trade and the balance of payments.' },
  { id: 'fiscal', name: 'Fiscal', keys: ['govcredit', 'nsav_net', 'nsav_out', 'tax', 'tax_g'], lede: 'Revenue collection and how the budget is financed.' },
  { id: 'cap', name: 'Capital market', keys: ['mcap', 'mcap_g'], lede: 'Market capitalisation of listed companies and its sector composition.' },
  { id: 'catalog', name: 'Data catalogue' }
];
const GLANCE = ['infl', 'food', 'nonfood', 'gdp_q', 'iip', 'm2', 'pcredit', 'npl', 'call', 'lend', 'real_lend', 'xr', 'res', 'cover', 'remit_g', 'exp_g', 'govcredit', 'tax_g', 'mcap'];
const LAB_TABS = [['overview', 'Projections'], ['data', 'Data and tests'], ['arima', 'ARIMA / SARIMA'], ['var', 'SVAR'], ['robust', 'Robustness and placebo'], ['dsge', 'DSGE'], ['world', 'World analysis'], ['refs', 'References']];
const bdState = { tab: 'glance' }, labState = { tab: 'overview', arima: 'infl', shock: 3, fevd: 0, ci: '95', het: 0, desc_ci: '95' };
let FIGN = 0;

function srcText(list, calc) {
  const seen = new Set(), parts = [];
  (list || []).forEach(s => {
    const pub = s.pub === 'Economic Trends' ? 'Bangladesh Bank, Monthly Economic Trends' : s.pub === 'NSDP' ? 'Bangladesh Bank, National Summary Data Page (NSDP)' : 'Bangladesh Bank, ' + s.pub;
    const ed = s.newest ? ' (' + s.newest.replace(/ Table.*$/, '').replace(/,.*$/, '') + ' edition)' : '';
    const t = pub + ed + ', ' + String(s.table || '').replace(/^ET /, '');
    if (!seen.has(t)) { seen.add(t); parts.push(t); }
  });
  const codes = (list || []).map(s => s.code).join(', ');
  return parts.join('; ') + (codes ? ' [series ' + codes + ']' : '') + (calc ? '; author’s calculations.' : '.');
}
function srcKeys(keys, calc) { const list = []; keys.forEach(k => (SER(k) ? SER(k).src : []).forEach(s => { if (!list.some(x => x.code === s.code)) list.push(s); })); return srcText(list, calc); }
function align(keys, from) {
  const ps = keys.map(PK);
  const f = (ps.find(Boolean) || {}).f || 'M';
  let k0 = Infinity, k1 = -Infinity;
  ps.forEach(p => { if (p) { k0 = Math.min(k0, p.k0); k1 = Math.max(k1, p.k0 + p.v.length - 1); } });
  if (from != null) k0 = Math.max(k0, from);
  const labels = [], cols = keys.map(() => []);
  for (let k = k0; k <= k1; k++) {
    labels.push(bdLab(f, k));
    ps.forEach((p, j) => { const i = p ? k - p.k0 : -1; cols[j].push(p && i >= 0 && i < p.v.length ? p.v[i] : null); });
  }
  return { labels, cols, f };
}
const M0 = y => y * 12;
function toCsv(rows) { return '\ufeff' + rows.map(r => r.map(c => { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\n'); }
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
function smallBtn(label, fn) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.textContent = label; b.addEventListener('click', fn); return b; }

function axisBase(TH) { return { axisLine: { lineStyle: { color: TH.line } }, axisTick: { show: false }, axisLabel: { color: TH.muted, fontSize: 11, hideOverlap: true } }; }
function valAxis(TH, name, o) {
  o = o || {};
  return { type: 'value', name: name || '', nameTextStyle: { color: TH.muted, fontSize: 11, align: o.right ? 'right' : 'left' }, scale: !!o.scale, min: o.min, max: o.max,
    splitLine: { show: !o.right, lineStyle: { color: TH.grid } }, axisLabel: { color: TH.muted, fontSize: 11, formatter: o.fmt } };
}
function tsOption(TH, labels, series, o) {
  o = o || {};
  const monthly = labels.length && /^\d{4}-\d{2}$/.test(labels[0]);
  const evs = monthly && o.events !== false ? EVENTS.filter(e => e[1] >= labels[0] && e[1] <= labels[labels.length - 1]) : [];
  if (evs.length && series[0]) {
    series[0].markArea = { silent: true, itemStyle: { color: TH.dark ? 'rgba(255,255,255,.055)' : 'rgba(14,28,43,.055)' },
      label: { show: window.innerWidth >= 900, color: TH.muted, fontSize: 10, position: 'insideTop', distance: 3 },
      data: evs.map(e => [{ name: e[3], xAxis: e[1] }, { xAxis: labels.includes(e[2]) ? e[2] : labels[labels.length - 1] }]) };
  }
  if (o.marks && series[0]) series[0].markLine = { silent: true, symbol: 'none', label: { color: TH.muted, fontSize: 10, position: 'insideEndTop', formatter: p => p.name || '' }, lineStyle: { color: TH.muted, type: 'dashed', width: 1 }, data: o.marks };
  const pal = o.pal || TH.pal;
  let anyEnd = false;
  series.forEach((s, k) => {
    if (s._end == null) return;
    const val = d => d == null ? null : typeof d === 'object' ? (Array.isArray(d) ? d[1] : d.value) : d;
    let i = s.data.length - 1;
    while (i >= 0 && val(s.data[i]) == null) i--;
    if (i >= 0) {
      const v = val(s.data[i]);
      const col = (s.itemStyle && s.itemStyle.color) || pal[k % pal.length];
      s.markPoint = { symbol: 'circle', symbolSize: 6, silent: true, animation: false, itemStyle: { color: col, borderColor: TH.paper, borderWidth: 1 },
        label: { show: true, position: o.y2 ? 'top' : 'right', distance: 5, formatter: nf(v, s._end), color: col, fontSize: 11, fontWeight: 700 }, data: [{ coord: [i, v] }] };
      anyEnd = true;
    }
    delete s._end;
  });
  const zoom = o.zoom && labels.length > 40;
  const startPct = zoom && o.zoomFrom ? Math.max(0, 100 * labels.indexOf(o.zoomFrom) / labels.length) : 0;
  return {
    aria: { enabled: true }, animation: !RM, animationDuration: 500, textStyle: { fontFamily: FONT }, color: o.pal || TH.pal,
    grid: { left: 6, right: o.y2 ? 8 : anyEnd ? 46 : 18, top: 50, bottom: zoom ? 44 : 6, containLabel: true },
    legend: { top: 0, left: 0, type: 'scroll', icon: 'roundRect', itemWidth: 12, itemHeight: 4, itemGap: 14, textStyle: { color: TH.ink2, fontSize: 12 }, pageIconColor: TH.ink2, pageTextStyle: { color: TH.muted },
      data: series.filter(x => x.name && !/ lower$/.test(x.name)).map(x => x.name) },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink, fontSize: 12 }, extraCssText: 'border-radius:8px;box-shadow:0 8px 22px rgba(0,0,0,.16)',
      valueFormatter: v => v == null || Array.isArray(v) ? '–' : nf(v, o.dec == null ? 2 : o.dec), axisPointer: { type: o.bar ? 'shadow' : 'line', lineStyle: { color: TH.muted } } },
    xAxis: { type: 'category', data: labels, boundaryGap: !!o.bar, ...axisBase(TH) },
    yAxis: [valAxis(TH, o.y1, { scale: o.scale, min: o.min }), ...(o.y2 ? [valAxis(TH, o.y2, { right: true, scale: o.scale2, min: o.min2 })] : [])],
    dataZoom: zoom ? [{ type: 'inside', start: startPct }, { type: 'slider', start: startPct, height: 16, bottom: 4, borderColor: TH.line, textStyle: { color: TH.muted, fontSize: 10 },
      fillerColor: TH.dark ? 'rgba(111,168,232,.16)' : 'rgba(31,95,168,.12)', handleStyle: { color: TH.paper, borderColor: TH.muted }, dataBackground: { lineStyle: { color: TH.line }, areaStyle: { color: TH.grid } } }] : [],
    series
  };
}
function S(name, data, o) {
  o = o || {};
  const s = { name, type: o.bar ? 'bar' : 'line', data, yAxisIndex: o.ax || 0, showSymbol: false, symbolSize: 5, connectNulls: !!o.connect, smooth: false,
    lineStyle: { width: o.w || 2, type: o.dash ? 'dashed' : 'solid' }, barMaxWidth: 16, z: o.z || 2, step: o.step || false };
  if (o.color) { s.itemStyle = { color: o.color }; s.lineStyle.color = o.color; }
  if (o.area) s.areaStyle = { opacity: o.area === true ? 0.1 : o.area };
  if (o.end) s._end = o.dec == null ? 1 : o.dec;
  if (o.stack) s.stack = o.stack;
  return s;
}
function signBars(vals, TH) { return vals.map(v => v == null ? null : { value: v, itemStyle: { color: v >= 0 ? TH.pos : TH.neg } }); }
function bandSeries(name, lo, hi, color, op, stack) {
  return [{ name: name + ' lower', type: 'line', data: lo, stack, lineStyle: { opacity: 0 }, showSymbol: false, silent: true, tooltip: { show: false }, legendHoverLink: false, z: 1 },
    { name, type: 'line', data: hi.map((h, i) => h == null || lo[i] == null ? null : h - lo[i]), stack, lineStyle: { opacity: 0 }, showSymbol: false, itemStyle: { color, opacity: Math.min(1, op * 2.5) }, areaStyle: { color, opacity: op }, silent: true, tooltip: { show: false }, z: 1 }];
}
function figure(host, o) {
  FIGN++;
  const f = document.createElement('figure');
  f.className = 'fig' + (o.wide ? ' wide' : '');
  f.innerHTML = '<figcaption><span class="fig-n">Figure ' + (o.prefix || 'B') + FIGN + '</span><b>' + esc(o.title) + '</b>' + (o.sub ? '<span class="fig-sub">' + esc(o.sub) + '</span>' : '') + '</figcaption>' +
    '<div class="chart" style="height:' + (o.h || 300) + 'px" role="img" aria-label="' + esc(o.title + (o.sub ? '. ' + o.sub : '')) + '"></div>' +
    '<div class="fig-foot">' + (o.notes ? '<p><i>Notes:</i> ' + esc(o.notes) + '</p>' : '') + (o.source ? '<p><i>Source:</i> ' + esc(o.source) + '</p>' : '') + '<div class="fig-act"></div></div>';
  host.append(f);
  const node = f.querySelector('.chart');
  chartOn(node, o.render);
  const act = f.querySelector('.fig-act');
  if (STANDALONE) {
    act.append(smallBtn('Image', () => {
      const r = charts.get(node);
      if (!r || !r.inst) return;
      const a = document.createElement('a');
      a.href = r.inst.getDataURL({ type: 'svg' });
      a.download = slug(o.title) + '.svg';
      document.body.append(a); a.click(); a.remove();
    }));
    if (o.csv) act.append(smallBtn('Data (CSV)', () => blobSave(slug(o.title) + '.csv', toCsv(o.csv()), 'text/csv;charset=utf-8')));
  }
  return f;
}
function csvAligned(keys, from) { const a = align(keys, from); return [['period', ...keys.map(k => SER(k).label + (SER(k).sub ? ' (' + SER(k).sub + ')' : '') + ' [' + SER(k).unit + ']')], ...a.labels.map((l, i) => [l, ...a.cols.map(c => c[i])])]; }
function sec(host, title, lede, id) {
  const s = document.createElement('section');
  s.className = 'bd-sec';
  if (id) s.id = id;
  s.innerHTML = '<div class="block-head"><h2>' + esc(title) + '</h2>' + (lede ? '<p class="note">' + esc(lede) + '</p>' : '') + '</div>';
  host.append(s);
  return s;
}
function grid(host) { const g = document.createElement('div'); g.className = 'figs'; host.append(g); return g; }
function tableWrap(host, html, cap, note) {
  const d = document.createElement('div');
  d.className = 'mx-wrap';
  d.innerHTML = (cap ? '<div class="mx-cap">' + cap + '</div>' : '') + '<div class="table-wrap"><table class="mx">' + html + '</table></div>' + (note ? '<p class="mx-note">' + note + '</p>' : '');
  host.append(d);
  return d;
}
let TABN = 0;
function tcap(t) { TABN++; return '<span class="fig-n">Table ' + (labState.prefix || '') + TABN + '</span>' + esc(t); }

/* ---------- key-indicator matrix ---------- */
function spark(key, n) {
  const p = PK(key);
  if (!p) return '';
  const v = p.v.slice(-(n || (p.f === 'M' ? 36 : p.f === 'Q' ? 16 : 12))).filter(x => x != null);
  if (v.length < 3) return '';
  const mn = Math.min(...v), mx = Math.max(...v), w = 92, h = 24;
  const xy = v.map((x, i) => [(i * (w - 6) / (v.length - 1) + 3), mx === mn ? h / 2 : (h - 3) - (x - mn) / (mx - mn) * (h - 6)]);
  const last = xy[xy.length - 1];
  return '<svg class="spk" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + xy.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') +
    '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.7" fill="var(--signal)"/></svg>';
}
function chg(unit, a, b, dir) {
  if (a == null || b == null) return '<td class="num muted">–</td>';
  const d = a - b;
  const pct = /US\$ mn|Tk crore|Tk per/.test(unit) && b ? (a / b - 1) * 100 : null;
  const good = dir ? (d * dir > 0 ? 'up-good' : d * dir < 0 ? 'up-bad' : '') : '';
  const txt = pct != null ? (pct >= 0 ? '+' : '') + nf(pct, 1) + '%' : (d >= 0 ? '+' : '') + nf(d, Math.abs(d) >= 100 ? 0 : 2);
  return '<td class="num ' + good + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + txt + '</td>';
}
function matrix(host, keys, caption, groupBy) {
  let html = '<thead><tr><th scope="col">Indicator</th><th scope="col">Period</th><th scope="col" class="num">Latest</th><th scope="col" class="num">Previous</th><th scope="col" class="num">Change</th>' +
    '<th scope="col" class="num">Year ago</th><th scope="col" class="num">Change on year</th><th scope="col" class="num">12-period average</th><th scope="col">Position in history</th><th scope="col">Trend</th><th scope="col">Source</th></tr></thead><tbody>';
  let lastChunk = null;
  keys.forEach(k => {
    const s = SER(k);
    if (!s || !s.reading) return;
    const r = s.reading;
    if (groupBy && s.chunk !== lastChunk) {
      lastChunk = s.chunk;
      html += '<tr class="grp"><th colspan="11" scope="rowgroup"><button type="button" class="linklike" data-bdtab="' + s.chunk + '">' + esc(BD.meta.chunks[s.chunk]) + ' →</button></th></tr>';
    }
    const dir = DIR[k] || 0;
    const pct = r.pct == null ? null : Math.max(0, Math.min(100, r.pct));
    html += '<tr><th scope="row"><span class="mx-l">' + esc(s.label) + '</span>' + (s.sub ? '<span class="mx-s">' + esc(s.sub) + '</span>' : '') + '<span class="mx-u">' + esc(s.unit) + '</span></th>' +
      '<td>' + esc(r.period) + '</td><td class="num big">' + fv(s.unit, r.v) + '</td><td class="num">' + fv(s.unit, r.prev) + '</td>' + chg(s.unit, r.v, r.prev, dir) +
      '<td class="num">' + fv(s.unit, r.ya) + '</td>' + chg(s.unit, r.v, r.ya, dir) + '<td class="num">' + fv(s.unit, r.avg) + '</td>' +
      '<td class="rngc">' + (pct == null ? '' : '<span class="rng" title="Percentile ' + nf(pct, 0) + ' of ' + r.n + ' observations"><i style="left:' + pct + '%"></i></span><span class="rng-l"><small>' + fv(s.unit, r.min) + '</small><small>' + fv(s.unit, r.max) + '</small></span>') + '</td>' +
      '<td class="spkc">' + spark(k) + '</td><td class="srcc"><span class="code" title="' + esc(srcKeys([k], s.how !== 'raw')) + '">' + esc((s.src[0] || {}).code || '') + (s.src.length > 1 ? ' +' + (s.src.length - 1) : '') + '</span></td></tr>';
  });
  html += '</tbody>';
  return tableWrap(host, html, caption, '▲▼ show the direction of change; green means a favourable move and red an unfavourable one (no colour where there is no clear “good” direction). “Position in history” marks the latest value within its full range; hover a code for its full source.');
}
function modelMatrix(host, keys, caption) {
  const rows = keys.map(k => BD.arima[k]).filter(Boolean);
  if (!rows.length) return;
  let html = '<thead><tr><th scope="col">Variable</th><th scope="col">Model (AIC-selected)</th><th scope="col" class="num">Latest</th><th scope="col" class="num">+1 month</th><th scope="col" class="num">+6 months</th><th scope="col" class="num">+12 months</th>' +
    '<th scope="col" class="num">Skill vs naive, 1m</th><th scope="col" class="num">Skill vs naive, 12m</th><th scope="col" class="num">DM p (1m)</th><th scope="col" class="num">Ljung–Box p (12)</th><th scope="col">Reading</th></tr></thead><tbody>';
  rows.forEach(a => {
    const u = a.unit, last = a.hist.v[a.hist.v.length - 1];
    const b80 = a.bands['80'];
    const cell = i => '<td class="num"><b>' + fv(u, a.fc[i]) + '</b><small class="pi">' + fv(u, b80[0][i]) + ' to ' + fv(u, b80[1][i]) + '</small></td>';
    const bt = h => (a.backtest.find(r => r.h === h) || {});
    const sk = h => { const v = bt(h).skill; return v == null ? '–' : (v > 0 ? '+' : '') + nf(v * 100, 0) + '%'; };
    const lb = (a.ljungbox.find(l => l.lag === 12) || {}).p;
    const d12 = a.fc[11] - last;
    const rel = Math.abs(d12) / (Math.abs(last) || 1);
    let read = rel < 0.02 ? 'Broadly stable' : d12 > 0 ? 'Rising' : 'Easing';
    const s12 = bt(12).skill, s1 = bt(1).skill;
    read += s1 != null && s1 > 0.05 ? '; beats the naive forecast at 1 month' : '; no better than a naive forecast at 1 month';
    if (s12 != null && s12 <= 0) read += ', or at 12 months, so treat the path as indicative';
    if (lb != null && lb < 0.05) read += '. Residual autocorrelation remains: interpret with caution';
    html += '<tr><th scope="row"><span class="mx-l">' + esc(a.label) + '</span><span class="mx-u">' + esc(u) + '</span></th><td>' + esc(a.spec) + '</td><td class="num">' + fv(u, last) + '</td>' + cell(0) + cell(5) + cell(11) +
      '<td class="num">' + sk(1) + '</td><td class="num">' + sk(12) + '</td><td class="num">' + fp(bt(1).dm_p) + '</td><td class="num' + (lb != null && lb < 0.05 ? ' up-bad' : '') + '">' + fp(lb) + '</td><td class="rd">' + esc(read) + '.</td></tr>';
  });
  html += '</tbody>';
  tableWrap(host, html, caption, 'Point forecasts with 80% prediction intervals underneath. Skill = 1 − RMSE(model) / RMSE(naive “no change” forecast) in a rolling-origin backtest over the last 24 months, so positive is better than naive. DM = Diebold–Mariano test of equal accuracy (Harvey–Leybourne–Newbold correction). Ljung–Box tests remaining autocorrelation in the residuals. Details in the Forecast lab.');
}

/* ---------- Bangladesh view ---------- */
function initBD() {
  const v = $('#v-bangladesh');
  if (!BD) { v.querySelector('.wrap').innerHTML = '<p class="empty">The Bangladesh data could not be loaded.</p>'; return; }
  $('#bd-vintage').textContent = BD.meta.vintage + '. Models estimated ' + BD.meta.estimated + '.';
  const tabs = $('#bd-tabs');
  tabs.innerHTML = CHUNKS.map(c => '<button type="button" role="tab" data-bdtab="' + c.id + '">' + esc(c.name) + '</button>').join('');
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-bdtab]');
    if (b) { e.preventDefault(); bdState.tab = b.getAttribute('data-bdtab'); renderBD(); try { history.replaceState(null, '', '#bangladesh~' + bdState.tab); } catch (err) { /* framed */ } window.scrollTo(0, $('#bd-tabs').offsetTop - 80); }
    const l = e.target.closest('[data-labtab]');
    if (l) { e.preventDefault(); labState.tab = l.getAttribute('data-labtab'); go('lab'); renderLab(); }
  });
  renderBD();
}
function renderBD() {
  if (!BD) return;
  const body = $('#bd-body');
  disposeIn(body);
  body.innerHTML = '';
  FIGN = 0; TABN = 0; labState.prefix = 'B';
  $$('#bd-tabs [data-bdtab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-bdtab') === bdState.tab ? 'true' : 'false'));
  const c = CHUNKS.find(x => x.id === bdState.tab) || CHUNKS[0];
  if (c.id === 'glance') return bdGlance(body);
  if (c.id === 'catalog') return bdCatalog(body);
  const s = sec(body, c.name, c.lede);
  matrix(s, c.keys, tcap('Key indicators: ' + c.name.toLowerCase()));
  ({ prices: bdPrices, real: bdReal, money: bdMoney, rates: bdRates, ext: bdExt, fiscal: bdFiscal, cap: bdCap })[c.id](body);
}
function bdGlance(body) {
  const s = sec(body, 'Bangladesh at a glance', 'The latest reading of every headline indicator, grouped as in Bangladesh Bank’s Weekly Selected Economic Indicators. Select a group to open its full page.');
  matrix(s, GLANCE, tcap('Headline indicators by sector'), true);
  const e = BD.ensemble.path, a = BD.arima.infl;
  const p = sec(body, 'Outlook', 'Statistical projections from the Forecast lab. These are model-based, not official forecasts.');
  const g = grid(p);
  infFan(g, true);
  const keys = ['infl', 'xr', 'res', 'remit', 'exp', 'm2', 'pcredit', 'call'];
  modelMatrix(p, keys, tcap('Model readings for headline indicators'));
  const n = document.createElement('p');
  n.className = 'note';
  n.innerHTML = 'Inflation in 12 months: <b>' + nf(e[11].mean, 1) + '%</b> (80% interval ' + nf(e[11].lo80, 1) + '–' + nf(e[11].hi80, 1) + '%), from ' + nf(a.hist.v[a.hist.v.length - 1], 1) + '% now. Probability it is still above 8%: <b>' + nf(e[11].p_gt8 * 100, 0) + '%</b>. <button type="button" class="linklike" data-labtab="overview">Open the Forecast lab →</button>';
  p.append(n);
}
function infFan(host, compact) {
  const a = BD.arima.infl, e = BD.ensemble.path;
  const histN = compact ? 36 : 60;
  const hl = [], hv = [];
  const h0 = a.hist.s;
  a.hist.v.forEach((v, i) => { hl.push(mLabAdd(h0, i)); hv.push(v); });
  const hL = hl.slice(-histN), hV = hv.slice(-histN);
  const fl = e.map((x, i) => mLabAdd(BD.ensemble.start, i));
  const labels = [...hL, ...fl];
  const pad = Array(hL.length).fill(null);
  const lastV = hV[hV.length - 1];
  const mean = [...pad.slice(1), lastV, ...e.map(x => x.mean)];
  const lo95 = [...pad.slice(1), lastV, ...e.map(x => x.lo95)], hi95 = [...pad.slice(1), lastV, ...e.map(x => x.hi95)];
  const lo80 = [...pad.slice(1), lastV, ...e.map(x => x.lo80)], hi80 = [...pad.slice(1), lastV, ...e.map(x => x.hi80)];
  figure(host, {
    prefix: labState.prefix, wide: !compact, title: 'Headline inflation: outturn and projection', sub: '% year on year, point-to-point; ensemble of ARIMA and SVAR with 80% and 95% bands', h: compact ? 300 : 360,
    notes: 'Projection combines ARIMA and SVAR forecasts with weights inversely proportional to their backtest mean squared errors (Bates and Granger, 1969). Bands use the backtest forecast-error spread at each horizon. Shaded periods mark major shocks.',
    source: srcKeys(['infl'], true),
    csv: () => [['month', 'actual', 'projection', 'lower 80', 'upper 80', 'lower 95', 'upper 95'], ...labels.map((l, i) => [l, i < hV.length ? hV[i] : '', mean[i] == null ? '' : mean[i], lo80[i] == null ? '' : lo80[i], hi80[i] == null ? '' : hi80[i], lo95[i] == null ? '' : lo95[i], hi95[i] == null ? '' : hi95[i]])],
    render: TH => tsOption(TH, labels, [S('Actual', [...hV, ...Array(fl.length).fill(null)], { color: TH.ink, w: 2.2 }),
      ...bandSeries('95% band', lo95, hi95, TH.pos, TH.dark ? 0.16 : 0.12, 'b95'), ...bandSeries('80% band', lo80, hi80, TH.pos, TH.dark ? 0.3 : 0.22, 'b80'),
      S('Projection', mean, { color: TH.pos, dash: true, w: 2.2, end: true })], { y1: '%', dec: 2, marks: [{ yAxis: 8, name: '8%' }, { yAxis: 6, name: '6%' }] })
  });
}
function bdPrices(body) {
  const s = sec(body, 'Charts', 'Shaded bands mark the global financial crisis, COVID-19, the 2022 commodity price shock and the 2024 political transition.');
  const g = grid(s);
  const a = align(['infl', 'infl_avg'], M0(2010));
  figure(g, { title: 'Headline inflation', sub: '% year on year; point-to-point and 12-month average', notes: SER('infl').note,
    source: srcKeys(['infl', 'infl_avg']), csv: () => csvAligned(['infl', 'infl_avg'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Point-to-point', a.cols[0], { color: TH.pal[0], end: true }), S('12-month average', a.cols[1], { color: TH.pal[1], dash: true, end: true })],
      { y1: '%', zoom: true }) });
  const b = align(['food', 'nonfood'], M0(2010));
  figure(g, { title: 'Food and non-food inflation', sub: '% year on year, point-to-point', notes: 'The gap between the two lines shows whether price pressure is coming from food (supply, harvests, imports) or from broader non-food demand and costs. ' + SER('food').note,
    source: srcKeys(['food', 'nonfood']), csv: () => csvAligned(['food', 'nonfood'], M0(2010)),
    render: TH => tsOption(TH, b.labels, [S('Food', b.cols[0], { color: TH.pal[6], end: true }), S('Non-food', b.cols[1], { color: TH.pal[5], end: true })], { y1: '%', zoom: true }) });
  const comp = BD.cpi_components.slice().sort((x, y) => x.v - y.v);
  figure(g, { title: 'Inflation by CPI group', sub: '% year on year, ' + (comp[0] || {}).period + '; base 2021–22 = 100', h: 340, notes: 'Calculated from the group price indices. Bars above the headline line are adding to inflation more than average.',
    source: srcText([{ code: 'ET.CPI_B.004–020', pub: 'Economic Trends', table: 'Table VIII: Consumer price index (base 2021–22 = 100)', newest: 'Sep 2026' }], true),
    csv: () => [['group', 'inflation % y/y', 'previous month'], ...comp.map(c => [c.name, c.v, c.prev])],
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 40, top: 8, bottom: 6, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, valueFormatter: v => nf(v, 2) + '%' },
      xAxis: valAxis(TH, '%'), yAxis: { type: 'category', data: comp.map(c => c.name), ...axisBase(TH), axisLabel: { color: TH.ink2, fontSize: 11 } },
      series: [{ type: 'bar', data: comp.map(c => ({ value: c.v, itemStyle: { color: c.name === 'Food' ? TH.pal[6] : c.v > SER('infl').reading.v ? TH.neg : TH.pos } })), barMaxWidth: 14,
        label: { show: true, position: 'right', color: TH.ink2, fontSize: 11, formatter: p => nf(p.value, 1) },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: TH.ink, type: 'dashed' }, label: { color: TH.ink2, fontSize: 10, formatter: 'Headline ' + nf(SER('infl').reading.v, 1) + '%' }, data: [{ xAxis: SER('infl').reading.v }] } }] }) });
  ridgeFig(g, BD.ridge_bd, { title: 'Distribution of monthly inflation by fiscal year (“mountain map”)', sub: 'kernel density of the 12 monthly readings in each fiscal year (July–June)', xname: '% y/y',
    notes: 'Each ridge is a smoothed histogram (Gaussian kernel, Scott’s bandwidth). Ridges shifting right show higher inflation; wider ridges show more volatile years.', source: srcKeys(['infl'], true) });
  modelMatrix(body, ['infl', 'food', 'nonfood'], tcap('Model readings: inflation'));
  const V = BD.var, gi = V.granger.filter(x => x.effect === 0);
  const f12 = V.fevd[0].map(c => c[12]);
  let html = '<thead><tr><th scope="col">Driver</th><th scope="col" class="num">Granger F</th><th scope="col" class="num">p-value</th><th scope="col" class="num">Share of inflation forecast-error variance, 12 months</th><th scope="col">Evidence</th></tr></thead><tbody>';
  [3, 2, 1].forEach(i => {
    const r = gi.find(x => x.cause === i);
    html += '<tr><th scope="row">' + esc(V.vars[i]) + '</th><td class="num">' + nf(r.f, 2) + stars(r.p) + '</td><td class="num">' + fp(r.p) + '</td><td class="num">' + nf(f12[i], 1) + '%</td><td>' + (r.p < 0.05 ? 'Significant predictor of inflation' : r.p < 0.1 ? 'Weak evidence' : 'No significant evidence') + '</td></tr>';
  });
  html += '<tr><th scope="row">Inflation’s own past</th><td class="num">–</td><td class="num">–</td><td class="num">' + nf(f12[0], 1) + '%</td><td>Inflation is highly persistent</td></tr></tbody>';
  tableWrap(body, html, tcap('What moves inflation: evidence from the SVAR'), 'SVAR(' + V.p + ') on monthly data, ' + V.sample[0] + ' to ' + V.sample[1] + '. *** p<0.01, ** p<0.05, * p<0.1. Full diagnostics in the <button type="button" class="linklike" data-labtab="var">Forecast lab</button>.');
}
function bdReal(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const p = PK('gdp_fy'), lab = p.v.map((v, i) => bdLab('FY', p.k0 + i));
  const avg = p.v.filter(x => x != null).reduce((a, b) => a + b, 0) / p.v.filter(x => x != null).length;
  figure(g, { title: 'Real GDP growth by fiscal year', sub: '%; fiscal years run July to June', notes: SER('gdp_fy').note + ' Dashed line: average over the period shown.', source: srcKeys(['gdp_fy']),
    csv: () => csvAligned(['gdp_fy']), render: TH => tsOption(TH, lab, [Object.assign(S('Real GDP growth', signBars(p.v, TH), { bar: true }), { markLine: { symbol: 'none', silent: true, lineStyle: { color: TH.ink2, type: 'dashed' }, label: { color: TH.ink2, fontSize: 10, formatter: 'Average ' + nf(avg, 1) + '%' }, data: [{ yAxis: avg }] } })], { y1: '%', bar: true, events: false }) });
  const q = align(['gdp_q']);
  figure(g, { title: 'Quarterly real GDP growth', sub: '% year on year, constant prices', source: srcKeys(['gdp_q']), csv: () => csvAligned(['gdp_q']),
    render: TH => tsOption(TH, q.labels, [S('Real GDP growth', signBars(q.cols[0], TH), { bar: true })], { y1: '%', bar: true }) });
  const f = align(['inv_gdp', 'sav_gdp', 'cons_gdp']);
  figure(g, { title: 'Investment, savings and consumption', sub: '% of GDP, fiscal years', notes: 'When national savings exceed investment the economy lends to the rest of the world (a current-account surplus), and vice versa.', source: srcKeys(['inv_gdp', 'sav_gdp', 'cons_gdp']),
    csv: () => csvAligned(['inv_gdp', 'sav_gdp', 'cons_gdp']), render: TH => tsOption(TH, f.labels, [S('Investment', f.cols[0], { end: true }), S('National savings', f.cols[1], { end: true }), S('Consumption (right)', f.cols[2], { ax: 1, dash: true, end: true })], { y1: '% of GDP', y2: '% of GDP', scale: true, scale2: true, events: false }) });
  const ip = align(['iip']);
  figure(g, { title: 'Industrial production', sub: '% year on year; manufacturing, mining and electricity', notes: 'Calculated from the monthly index. The series in this source starts in July 2022.', source: srcKeys(['iip'], true),
    csv: () => csvAligned(['iip']), render: TH => tsOption(TH, ip.labels, [S('Industrial production', signBars(ip.cols[0], TH), { bar: true })], { y1: '% y/y', bar: true }) });
}
function bdMoney(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['m2', 'rm', 'pcredit'], M0(2010));
  figure(g, { title: 'Money and private credit growth', sub: '% year on year', notes: 'Year-on-year growth calculated from end-month stocks.', source: srcKeys(['m2', 'rm', 'pcredit'], true), csv: () => csvAligned(['m2', 'rm', 'pcredit'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Broad money (M2)', a.cols[0], { end: true }), S('Reserve money', a.cols[1], { dash: true }), S('Private sector credit', a.cols[2], { end: true, color: TH.pal[6] })], { y1: '% y/y', zoom: true, zoomFrom: '2016-01' }) });
  const b = align(['cdr'], M0(2010));
  figure(g, { title: 'Credit–deposit ratio of banks', sub: '%', notes: 'Above 100% banks are lending more than they hold in deposits and must rely on other funding.', source: srcKeys(['cdr']), csv: () => csvAligned(['cdr'], M0(2010)),
    render: TH => tsOption(TH, b.labels, [S('Credit–deposit ratio', b.cols[0], { area: 0.08, end: true })], { y1: '%', scale: true, marks: [{ yAxis: 100, name: '100%' }] }) });
  const c = align(['npl', 'crar']);
  figure(g, { title: 'Bank soundness: bad loans and capital', sub: 'deposit takers, % (quarterly)', notes: 'Bars: non-performing loans as a share of gross loans. Line: regulatory capital to risk-weighted assets; the dashed line marks 12.5% (10% minimum plus the 2.5% conservation buffer under Basel III).', source: srcKeys(['npl', 'crar']),
    csv: () => csvAligned(['npl', 'crar']), render: TH => tsOption(TH, c.labels, [Object.assign(S('Non-performing loans', c.cols[0], { bar: true, color: TH.neg }), {}), Object.assign(S('Capital ratio (right)', c.cols[1], { ax: 1, color: TH.pos, w: 2.4, end: true }), { markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dashed', color: TH.pos }, label: { formatter: '12.5%', color: TH.muted, fontSize: 10 }, data: [{ yAxis: 12.5 }] } })], { y1: '% of loans', y2: '% of RWA', bar: true }) });
}
function bdRates(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['call', 'lend', 'dep', 'bankrate'], M0(2010));
  figure(g, { title: 'Interest rates', sub: '% a year; call money and scheduled banks’ weighted averages', source: srcKeys(['call', 'lend', 'dep', 'bankrate']), csv: () => csvAligned(['call', 'lend', 'dep', 'bankrate'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Call money', a.cols[0], { end: true }), S('Lending rate', a.cols[1], { end: true }), S('Deposit rate', a.cols[2], { end: true }), S('Bank rate', a.cols[3], { dash: true, step: 'end' })], { y1: '%', zoom: true }) });
  const r = align(['real_lend', 'spread'], M0(2010));
  figure(g, { title: 'Real lending rate and the spread', sub: 'percentage points', notes: SER('real_lend').note + ' Negative real rates mean borrowers repay less in real terms than they borrowed.', source: srcKeys(['real_lend', 'spread'], true),
    csv: () => csvAligned(['real_lend', 'spread'], M0(2010)), render: TH => tsOption(TH, r.labels, [S('Real lending rate', signBars(r.cols[0], TH), { bar: true }), S('Lending–deposit spread', r.cols[1], { color: TH.ink2, end: true })], { y1: 'pp', bar: true, zoom: true }) });
  modelMatrix(body, ['call'], tcap('Model reading: call money rate'));
}
function bdExt(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['xr', 'xr_dep'], M0(2010));
  figure(g, { title: 'Exchange rate of the Taka', sub: 'Taka per US dollar (left) and depreciation, % year on year (right)', notes: SER('xr_dep').note, source: srcKeys(['xr'], true), csv: () => csvAligned(['xr', 'xr_dep'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Taka per US$', a.cols[0], { color: TH.ink, w: 2.4, end: true }), S('Depreciation (right)', signBars(a.cols[1], TH).map(x => x && Object.assign(x, { itemStyle: { color: x.value > 0 ? TH.neg : TH.pos } })), { bar: true, ax: 1 })], { y1: 'Tk/US$', y2: '% y/y', scale: true, zoom: true }) });
  const b = align(['res', 'res_bpm6', 'cover'], M0(2010));
  figure(g, { title: 'Foreign exchange reserves and import cover', sub: 'US$ million (left); months of imports (right)', notes: SER('cover').note + ' ' + SER('imp').note, source: srcKeys(['res', 'res_bpm6', 'imp'], true), csv: () => csvAligned(['res', 'res_bpm6', 'cover'], M0(2010)),
    render: TH => tsOption(TH, b.labels, [S('Gross reserves', b.cols[0], { area: 0.1, end: true, dec: 0 }), S('BPM6 reserves', b.cols[1], { end: true, dec: 0 }), Object.assign(S('Import cover (right)', b.cols[2], { ax: 1, dash: true, color: TH.pal[6] }), { markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dotted', color: TH.pal[6] }, label: { formatter: '3 months', color: TH.muted, fontSize: 10 }, data: [{ yAxis: 3 }] } })], { y1: 'US$ mn', y2: 'months', zoom: true, dec: 1 }) });
  const r = align(['remit', 'remit_g'], M0(2012));
  figure(g, { title: 'Remittances', sub: 'US$ million a month (bars) and % year on year (line)', source: srcKeys(['remit'], true), csv: () => csvAligned(['remit', 'remit_g'], M0(2012)),
    render: TH => tsOption(TH, r.labels, [S('Remittances', r.cols[0], { bar: true, color: TH.pal[2] }), S('Growth (right)', r.cols[1], { ax: 1, color: TH.ink, w: 1.6 })], { y1: 'US$ mn', y2: '% y/y', bar: true, zoom: true, zoomFrom: '2019-01', dec: 1 }) });
  const t = align(['exp', 'imp'], M0(2012));
  figure(g, { title: 'Merchandise exports and imports', sub: 'US$ million a month', notes: SER('imp').note, source: srcKeys(['exp', 'imp']), csv: () => csvAligned(['exp', 'imp'], M0(2012)),
    render: TH => tsOption(TH, t.labels, [S('Exports', t.cols[0], { color: TH.pos, end: true, dec: 0 }), S('Imports', t.cols[1], { color: TH.neg, end: true, dec: 0 })], { y1: 'US$ mn', zoom: true, zoomFrom: '2018-01', dec: 0 }) });
  const bp = align(['goods', 'secinc', 'ca', 'fa', 'bop']);
  figure(g, { wide: true, title: 'Balance of payments by fiscal year', sub: 'US$ million', h: 340, notes: 'Bars: the trade deficit in goods is largely financed by secondary income, mostly workers’ remittances. Lines: the current account, financial account and overall balance.', source: srcKeys(['goods', 'secinc', 'ca', 'fa', 'bop']),
    csv: () => csvAligned(['goods', 'secinc', 'ca', 'fa', 'bop']),
    render: TH => tsOption(TH, bp.labels, [S('Goods balance', bp.cols[0], { bar: true, color: TH.neg, stack: 'cab' }), S('Secondary income', bp.cols[1], { bar: true, color: TH.pal[2], stack: 'cab' }),
      S('Current account', bp.cols[2], { color: TH.ink, w: 2.6 }), S('Financial account', bp.cols[3], { color: TH.pal[1], dash: true }), S('Overall balance', bp.cols[4], { color: TH.pal[5] })], { y1: 'US$ mn', bar: true, events: false, dec: 0 }) });
  modelMatrix(body, ['xr', 'res', 'remit', 'exp'], tcap('Model readings: external sector'));
  const peers = BD.saarc.filter(x => x.ind === 'Foreign Exchange Reserve');
  const fx = BD.saarc.filter(x => x.ind !== 'Foreign Exchange Reserve');
  let html = '<thead><tr><th scope="col">Economy</th><th scope="col" class="num">Reserves, US$ mn</th><th scope="col">Quarter</th><th scope="col" class="num">Exchange rate, per US$</th><th scope="col">Quarter</th></tr></thead><tbody>';
  peers.sort((x, y) => y.v - x.v).forEach(p => {
    const f = fx.find(x => x.country === p.country) || {};
    html += '<tr' + (p.country === 'Bangladesh' ? ' class="hl"' : '') + '><th scope="row">' + esc(p.country) + '</th><td class="num">' + nf(p.v, 0) + '</td><td>' + esc(p.period) + '</td><td class="num">' + nf(f.v, 2) + '</td><td>' + esc(f.period || '') + '</td></tr>';
  });
  html += '</tbody>';
  tableWrap(body, html, tcap('South Asian peers: reserves and exchange rates'), 'Source: Bangladesh Bank, Monthly Economic Trends, Table XXVII: Important economic indicators of SAARC countries (latest quarter available for each). Exchange rates are in each country’s own currency per US dollar.');
}
function bdFiscal(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['govcredit'], M0(2012));
  figure(g, { title: 'Net bank credit to the government', sub: '% year on year', notes: 'Rapid growth means the budget is being financed more heavily by the banking system, which can crowd out private credit.', source: srcKeys(['govcredit'], true),
    csv: () => csvAligned(['govcredit'], M0(2012)), render: TH => tsOption(TH, a.labels, [S('Net bank credit to government', a.cols[0], { area: 0.1, end: true, color: TH.pal[5] })], { y1: '% y/y', zoom: true }) });
  const n = align(['nsav_net', 'nsav_out']);
  figure(g, { title: 'National savings certificates', sub: 'Tk crore: net sales a month (bars) and outstanding stock (line)', notes: 'Net sales below zero mean redemptions exceed new sales, so the government must borrow elsewhere.', source: srcKeys(['nsav_net', 'nsav_out']),
    csv: () => csvAligned(['nsav_net', 'nsav_out']), render: TH => tsOption(TH, n.labels, [S('Net sales', signBars(n.cols[0], TH), { bar: true }), S('Outstanding (right)', n.cols[1], { ax: 1, color: TH.ink, end: true, dec: 0 })], { y1: 'Tk crore', y2: 'Tk crore', bar: true, scale2: true, dec: 0 }) });
  if (SER('tax')) {
    const t = align(['tax', 'tax_g'], M0(2012));
    figure(g, { title: 'NBR tax revenue', sub: 'Tk crore a month (bars) and % year on year (line)', source: srcKeys(['tax'], true), csv: () => csvAligned(['tax', 'tax_g'], M0(2012)),
      render: TH => tsOption(TH, t.labels, [S('Tax revenue', t.cols[0], { bar: true, color: TH.pal[2] }), S('Growth (right)', t.cols[1], { ax: 1, color: TH.ink, w: 1.5 })], { y1: 'Tk crore', y2: '% y/y', bar: true, zoom: true, zoomFrom: '2019-01', dec: 1 }) });
  }
}
function bdCap(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['mcap', 'mcap_g'], M0(2010));
  figure(g, { title: 'Market capitalisation', sub: 'Tk crore (line) and % year on year (bars)', source: srcKeys(['mcap'], true), csv: () => csvAligned(['mcap', 'mcap_g'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Market capitalisation', a.cols[0], { color: TH.ink, w: 2.2, end: true, dec: 0 }), S('Growth (right)', signBars(a.cols[1], TH), { bar: true, ax: 1 })], { y1: 'Tk crore', y2: '% y/y', zoom: true, dec: 1 }) });
  const sc = BD.mcap_sectors.slice().sort((x, y) => y.v - x.v);
  const tot = sc.reduce((x, y) => x + y.v, 0);
  figure(g, { title: 'Market capitalisation by sector', sub: 'share of total, ' + (sc[0] || {}).period, h: 340, notes: 'Box size is proportional to market value.', source: 'Bangladesh Bank, Monthly Economic Trends, ' + ((SER('mcap').src[0] || {}).table || '').replace(/^ET /, '') + ' [series ET.MCAP.001–015]; author’s calculations.',
    csv: () => [['sector', 'Tk crore', 'share %'], ...sc.map(x => [x.name, x.v, x.v / tot * 100])],
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, tooltip: { backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, formatter: p => esc(p.name) + '<br><b>' + nf(p.value, 0) + '</b> Tk crore (' + nf(p.value / tot * 100, 1) + '%)' },
      series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, top: 4, bottom: 4, left: 4, right: 4, data: sc.map((x, i) => ({ name: x.name, value: x.v, itemStyle: { color: TH.pal[i % TH.pal.length], borderColor: TH.paper, borderWidth: 2, gapWidth: 2 } })),
        label: { color: '#fff', fontSize: 11, fontWeight: 600, formatter: p => p.name + '\n' + nf(p.value / tot * 100, 1) + '%' }, upperLabel: { show: false } }] }) });
}

/* ---------- ridgeline ("mountain map") ---------- */
function ridgeFig(host, R, o) {
  if (!R || !R.rows.length) return;
  const rows = R.rows;
  const mx = Math.max(...rows.flatMap(r => r.y));
  const gap = 1, scale = 2.4 / mx;
  figure(host, { prefix: o.prefix || labState.prefix, wide: o.wide, title: o.title, sub: o.sub, h: Math.max(320, 30 + rows.length * 22), notes: o.notes, source: o.source,
    csv: () => [['x', ...rows.map(r => r.label)], ...R.x.map((x, i) => [x, ...rows.map(r => r.y[i])])],
    render: TH => {
      const series = [];
      rows.forEach((r, j) => {
        const off = (rows.length - 1 - j) * gap;
        const col = TH.pal[j % 2 === 0 ? 0 : 1];
        series.push({ name: r.label, type: 'line', data: R.x.map((x, i) => [x, off + r.y[i] * scale]), smooth: true, showSymbol: false, lineStyle: { color: TH.ink, width: 1.1 },
          areaStyle: { color: col, opacity: TH.dark ? 0.6 : 0.55, origin: off }, z: 2 * j + 1,
          markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: TH.paper, width: 1.4 }, data: [[{ coord: [r.median, off] }, { coord: [r.median, off + gap * 0.9] }]] } });
      });
      return { aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 18, top: 8, bottom: 6, containLabel: true },
        tooltip: { trigger: 'item', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, formatter: p => { const r = rows.find(x => x.label === p.seriesName); return r ? '<b>' + esc(r.label) + '</b><br>median ' + nf(r.median, 1) + '<br>n = ' + r.n : ''; } },
        xAxis: { type: 'value', name: o.xname, nameLocation: 'end', nameTextStyle: { color: TH.muted, fontSize: 11 }, min: R.x[0], max: R.x[R.x.length - 1], splitLine: { lineStyle: { color: TH.grid } }, ...axisBase(TH) },
        yAxis: { type: 'value', min: 0, max: rows.length * gap + 1.6, interval: gap, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: TH.ink2, fontSize: 11, formatter: v => { const j = rows.length - 1 - Math.round(v / gap); return Math.abs(v - Math.round(v / gap) * gap) < 1e-6 && rows[j] ? rows[j].label : ''; } } },
        series };
    } });
}

/* ---------- data catalogue (all series) ---------- */
const CATS = { cat: null, files: {} };
async function bdFetch(name) {
  if (CATS.files[name]) return CATS.files[name];
  const r = await fetch(name, { cache: 'force-cache' });
  if (!r.ok) throw new Error(name + ' ' + r.status);
  CATS.files[name] = await r.json();
  return CATS.files[name];
}
function bdCatalog(body) {
  const s = sec(body, 'Data catalogue', 'Search all ' + nf(BD.meta.n_catalog, 0) + ' Bangladesh series behind this section, see exactly where each one comes from, chart it and download it.');
  const box = document.createElement('div');
  box.className = 'cat';
  box.innerHTML = '<div class="controls"><label class="field grow"><span>Search by name, table or code</span><input type="search" id="cat-q" placeholder="e.g. remittances, call money, ET.SEI_B" autocomplete="off"></label></div><p class="note" id="cat-status">Loading the catalogue…</p><div id="cat-res"></div><div id="cat-one"></div>';
  s.append(box);
  if (!/^https?:$/.test(location.protocol)) {
    $('#cat-status').innerHTML = 'The full catalogue opens on the website, <a href="https://www.macroarianalytics.com/#bangladesh~catalog" target="_blank" rel="noopener">macroarianalytics.com</a>.';
    return;
  }
  bdFetch('bd_catalog.json').then(cat => {
    CATS.cat = cat;
    $('#cat-status').textContent = nf(cat.length, 0) + ' series from Bangladesh Bank’s Monthly Economic Trends, the National Summary Data Page (NSDP) and banking statistics.';
    const q = $('#cat-q');
    const run = () => {
      const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = (terms.length ? cat.filter(r => { const t = (r[0] + ' ' + r[2] + ' ' + r[3] + ' ' + r[4]).toLowerCase(); return terms.every(x => t.includes(x)); }) : cat).slice(0, 80);
      $('#cat-res').innerHTML = '<div class="table-wrap"><table class="mx cat-t"><thead><tr><th scope="col">Code</th><th scope="col">Series</th><th scope="col">Table</th><th scope="col">Unit</th><th scope="col">Frequency</th></tr></thead><tbody>' +
        hits.map(r => '<tr tabindex="0" data-code="' + esc(r[0]) + '"><td><span class="code">' + esc(r[0]) + '</span></td><td>' + esc(r[3]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[4]) + '</td><td>' + esc(r[5]) + '</td></tr>').join('') + '</tbody></table></div>' +
        (hits.length === 80 ? '<p class="note">Showing the first 80 matches. Add words to narrow the search.</p>' : '');
    };
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 160); });
    run();
    const pick = tr => { if (tr) catShow(tr.getAttribute('data-code')); };
    $('#cat-res').addEventListener('click', e => pick(e.target.closest('tr[data-code]')));
    $('#cat-res').addEventListener('keydown', e => { if (e.key === 'Enter') pick(e.target.closest('tr[data-code]')); });
  }).catch(() => { $('#cat-status').innerHTML = 'The catalogue couldn’t load here. It opens on the website: <a href="https://www.macroarianalytics.com/#bangladesh~catalog" target="_blank" rel="noopener">macroarianalytics.com</a>.'; });
}
async function catShow(code) {
  const r = CATS.cat.find(x => x[0] === code);
  const host = $('#cat-one');
  disposeIn(host);
  host.innerHTML = '<p class="note">Loading ' + esc(code) + '…</p>';
  const freqs = [];
  for (const f of ['M', 'Q', 'FY', 'CY']) {
    try { const d = await bdFetch('bd_' + f + '.json'); if (d[code]) freqs.push([f, d[code]]); } catch (e) { /* skip */ }
  }
  host.innerHTML = '';
  const s = document.createElement('div');
  s.className = 'cat-one';
  s.innerHTML = '<h3>' + esc(r[3]) + '</h3><dl class="prov"><dt>Code</dt><dd><span class="code">' + esc(r[0]) + '</span></dd><dt>Publication</dt><dd>' + esc(r[1]) + '</dd><dt>Table</dt><dd>' + esc(r[2]) + '</dd><dt>Unit</dt><dd>' + esc(r[4] || '–') + '</dd><dt>Provenance</dt><dd>' + esc(r[6] || '–') + '</dd>' + (r[7] ? '<dt>Note</dt><dd>' + esc(r[7]) + '</dd>' : '') + '</dl>';
  host.append(s);
  const g = grid(host);
  FIGN = 0;
  freqs.forEach(([f, arr]) => {
    const fl = { M: 'Monthly', Q: 'Quarterly', FY: 'Fiscal year', CY: 'Calendar year' }[f];
    const st = arr[0], vals = arr.slice(1);
    const k0 = f === 'M' ? +st.slice(0, 4) * 12 + (+st.slice(5, 7)) - 1 : f === 'Q' ? +st.slice(0, 4) * 4 + (+st.slice(-1)) - 1 : f === 'FY' ? +st.slice(2) : +st;
    const labels = vals.map((v, i) => bdLab(f, k0 + i));
    figure(g, { prefix: 'C', title: r[3].split('|').slice(-2).join(' | '), sub: fl + (r[4] ? ', ' + r[4] : ''), source: 'Bangladesh Bank, ' + (r[1] === 'NSDP' ? 'National Summary Data Page (NSDP)' : r[1]) + ', ' + r[2] + ' [series ' + r[0] + '].',
      csv: () => [['period', r[0]], ...labels.map((l, i) => [l, vals[i]])], render: TH => tsOption(TH, labels, [S(r[0], vals, { end: true, area: 0.08 })], { y1: r[4] || '', zoom: labels.length > 60, scale: true, events: f === 'M' }) });
  });
  host.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
}

/* ---------- Forecast lab ---------- */
function initLab() {
  const v = $('#v-lab');
  if (!BD) { v.querySelector('.wrap').innerHTML = '<p class="empty">The model results could not be loaded.</p>'; return; }
  $('#lab-tabs').innerHTML = LAB_TABS.map(t => '<button type="button" role="tab" data-lab="' + t[0] + '">' + esc(t[1]) + '</button>').join('');
  $('#lab-est').textContent = 'Estimated ' + BD.meta.estimated + ' on data to ' + BD.arima.infl.sample[1] + '.';
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-lab]');
    if (b) { labState.tab = b.getAttribute('data-lab'); renderLab(); try { history.replaceState(null, '', '#lab~' + labState.tab); } catch (err) { /* framed */ } }
    const l = e.target.closest('[data-labtab]');
    if (l) { e.preventDefault(); labState.tab = l.getAttribute('data-labtab'); renderLab(); }
    const t = e.target.closest('[data-bdtab]');
    if (t) { e.preventDefault(); bdState.tab = t.getAttribute('data-bdtab'); go('bangladesh'); renderBD(); }
  });
  v.addEventListener('change', e => {
    const s = e.target.closest('[data-lset]');
    if (s) { labState[s.getAttribute('data-lset')] = /^\d+$/.test(s.value) && s.getAttribute('data-lset') !== 'ci' && s.getAttribute('data-lset') !== 'desc_ci' ? +s.value : s.value; renderLab(true); }
  });
  renderLab();
}
function renderLab(keep) {
  if (!BD) return;
  const body = $('#lab-body');
  const y = window.scrollY;
  disposeIn(body);
  body.innerHTML = '';
  FIGN = 0; TABN = 0; labState.prefix = 'L';
  $$('#lab-tabs [data-lab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-lab') === labState.tab ? 'true' : 'false'));
  ({ overview: labOverview, data: labData, arima: labArima, var: labVar, robust: labRobust, dsge: labDsge, world: labWorld, refs: labRefs })[labState.tab in { overview: 1, data: 1, arima: 1, var: 1, robust: 1, dsge: 1, world: 1, refs: 1 } ? labState.tab : 'overview'](body);
  if (keep) window.scrollTo(0, y);
}
function sel(key, opts, cur, label) { return '<label class="field"><span>' + esc(label) + '</span><select data-lset="' + key + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>'; }
function ctrl(host, html) { const d = document.createElement('div'); d.className = 'controls'; d.innerHTML = html; host.append(d); return d; }
function labOverview(body) {
  const s = sec(body, 'Projections', 'Model-based projections for Bangladesh, with the uncertainty around them and a check of how each model has performed against a naive “no change” forecast. Statistical projections, not official forecasts.');
  const g = grid(s);
  infFan(g, false);
  const e = BD.ensemble.path;
  let html = '<thead><tr><th scope="col">Horizon</th><th scope="col">Month</th><th scope="col" class="num">Projection</th><th scope="col" class="num">80% interval</th><th scope="col" class="num">95% interval</th><th scope="col" class="num">P(above 10%)</th><th scope="col" class="num">P(above 8%)</th><th scope="col" class="num">P(below 6%)</th></tr></thead><tbody>';
  [0, 2, 5, 8, 11].forEach(i => { const x = e[i]; html += '<tr><th scope="row">+' + x.h + ' month' + (x.h > 1 ? 's' : '') + '</th><td>' + mLabAdd(BD.ensemble.start, i) + '</td><td class="num big">' + nf(x.mean, 2) + '%</td><td class="num">' + nf(x.lo80, 1) + ' to ' + nf(x.hi80, 1) + '</td><td class="num">' + nf(x.lo95, 1) + ' to ' + nf(x.hi95, 1) + '</td><td class="num">' + nf(x.p_gt10 * 100, 0) + '%</td><td class="num">' + nf(x.p_gt8 * 100, 0) + '%</td><td class="num">' + nf(x.p_lt6 * 100, 0) + '%</td></tr>'; });
  tableWrap(s, html + '</tbody>', tcap('Inflation projection and probabilities'), 'Probabilities assume normally distributed forecast errors with the backtest standard deviation at each horizon. Application: a central bank targeting inflation in a 5–6% range can read the chance of returning there within a year directly from the last column.');
  let bt = '<thead><tr><th scope="col">Horizon</th><th scope="col" class="num">Backtest forecasts</th><th scope="col" class="num">RMSE, ARIMA</th><th scope="col" class="num">RMSE, SVAR</th><th scope="col" class="num">SVAR weight</th><th scope="col" class="num">RMSE, ensemble</th><th scope="col" class="num">RMSE, naive</th><th scope="col" class="num">DM vs naive</th><th scope="col" class="num">p-value</th></tr></thead><tbody>';
  BD.ensemble.backtest.forEach(r => { bt += '<tr><th scope="row">' + r.h + ' month' + (r.h > 1 ? 's' : '') + '</th><td class="num">' + r.n + '</td><td class="num">' + nf(r.rmse_arima, 3) + '</td><td class="num">' + nf(r.rmse_var, 3) + '</td><td class="num">' + nf(r.w_var, 2) + '</td><td class="num"><b>' + nf(r.rmse_ens, 3) + '</b></td><td class="num">' + nf(r.rmse_rw, 3) + '</td><td class="num">' + nf(r.dm_vs_rw, 2) + stars(r.dm_p) + '</td><td class="num">' + fp(r.dm_p) + '</td></tr>'; });
  tableWrap(s, bt + '</tbody>', tcap('Out-of-sample accuracy of the inflation models'), 'Rolling-origin evaluation: each model is re-estimated at every forecast origin in the last 24 months and judged only on data it had not seen. RMSE in percentage points. A negative DM statistic favours the ensemble. Monthly inflation is close to a random walk, so a naive forecast is a demanding benchmark (Atkeson and Ohanian, 2001).');
  modelMatrix(s, Object.keys(BD.arima), tcap('Projection matrix: all modelled indicators'));
}
function labData(body) {
  const s = sec(body, 'Summary statistics', 'Monthly data from January 2010. Use the selector to change the confidence level of the interval for the mean.');
  ctrl(s, sel('desc_ci', [['68', '68%'], ['80', '80%'], ['90', '90%'], ['95', '95%'], ['99', '99%']], labState.desc_ci, 'Confidence interval for the mean'));
  const lv = labState.desc_ci;
  let html = '<thead><tr><th scope="col">Variable</th><th scope="col" class="num">N</th><th scope="col" class="num">Mean</th><th scope="col" class="num">' + lv + '% CI of mean</th><th scope="col" class="num">Median</th><th scope="col" class="num">SD</th><th scope="col" class="num">Min</th><th scope="col" class="num">Q1</th><th scope="col" class="num">Q3</th><th scope="col" class="num">Max</th><th scope="col" class="num">Skew</th><th scope="col" class="num">Ex. kurtosis</th><th scope="col" class="num">Jarque–Bera</th><th scope="col" class="num">AR(1)</th></tr></thead><tbody>';
  BD.desc.forEach(d => {
    const t = d.t[lv], u = d.unit;
    html += '<tr><th scope="row"><span class="mx-l">' + esc(d.label) + '</span><span class="mx-u">' + esc(u) + '</span></th><td class="num">' + d.n + '</td><td class="num">' + fv(u, d.mean) + '</td><td class="num">' + fv(u, d.mean - t * d.se) + ' to ' + fv(u, d.mean + t * d.se) + '</td><td class="num">' + fv(u, d.median) + '</td><td class="num">' + fv(u, d.sd) + '</td><td class="num">' + fv(u, d.min) + '</td><td class="num">' + fv(u, d.q1) + '</td><td class="num">' + fv(u, d.q3) + '</td><td class="num">' + fv(u, d.max) + '</td><td class="num">' + nf(d.skew, 2) + '</td><td class="num">' + nf(d.kurt, 2) + '</td><td class="num">' + nf(d.jb, 1) + stars(d.jb_p) + '</td><td class="num">' + nf(d.ar1, 3) + '</td></tr>';
  });
  tableWrap(s, html + '</tbody>', tcap('Descriptive statistics'), 'CI uses the t distribution. Jarque–Bera tests normality (Jarque and Bera, 1980): *** p<0.01, ** p<0.05, * p<0.1 reject normality. AR(1) is the first-order autocorrelation; values near 1 indicate high persistence. With strongly persistent data the CI of the mean understates uncertainty.');
  const u = sec(body, 'Unit-root and stationarity tests', 'ADF tests the null of a unit root; KPSS tests the null of stationarity. Agreement between the two gives a clear verdict.');
  let ur = '<thead><tr><th scope="col" rowspan="2">Variable</th><th scope="colgroup" colspan="4" class="cg">Level</th><th scope="colgroup" colspan="4" class="cg">First difference</th><th scope="col" rowspan="2">Verdict</th></tr><tr><th scope="col" class="num">ADF</th><th scope="col" class="num">p</th><th scope="col" class="num">KPSS</th><th scope="col" class="num">p</th><th scope="col" class="num">ADF</th><th scope="col" class="num">p</th><th scope="col" class="num">KPSS</th><th scope="col" class="num">p</th></tr></thead><tbody>';
  BD.unitroot.forEach(r => {
    const L = r.level || {}, D = r.diff || {};
    const pk = p => p == null ? '–' : (p <= 0.01 ? '≤0.01' : p >= 0.1 ? '≥0.10' : nf(p, 3));
    ur += '<tr><th scope="row">' + esc(r.label) + '</th><td class="num">' + nf(L.adf, 2) + stars(L.adf_p) + '</td><td class="num">' + fp(L.adf_p) + '</td><td class="num">' + nf(L.kpss, 3) + '</td><td class="num">' + pk(L.kpss_p) + '</td><td class="num">' + nf(D.adf, 2) + stars(D.adf_p) + '</td><td class="num">' + fp(D.adf_p) + '</td><td class="num">' + nf(D.kpss, 3) + '</td><td class="num">' + pk(D.kpss_p) + '</td><td>' + esc(r.verdict || '') + '</td></tr>';
  });
  tableWrap(u, ur + '</tbody>', tcap('Stationarity tests'), 'ADF (Dickey and Fuller, 1979) with a constant and AIC-selected lags; KPSS (Kwiatkowski et al., 1992) with a constant and automatic bandwidth (its p-values are bounded by the published tables). Stars mark rejection of the ADF unit-root null. Verdict uses 5% on both tests. Application: I(1) series enter the ARIMA models in first differences.');
  const r = sec(body, 'Distributions over time');
  ridgeFig(r, BD.ridge_bd, { prefix: 'L', wide: true, title: 'Inflation distribution by fiscal year (“mountain map”)', sub: 'kernel density of monthly headline inflation, % y/y', xname: '% y/y', notes: 'Light vertical lines mark each year’s median.', source: srcKeys(['infl'], true) });
}
function labArima(body) {
  const a = BD.arima[labState.arima] || BD.arima.infl;
  const s = sec(body, 'ARIMA and seasonal ARIMA', 'Box–Jenkins models chosen by the Akaike information criterion from a grid of candidate specifications, then checked for leftover autocorrelation and tested out of sample.');
  ctrl(s, sel('arima', Object.keys(BD.arima).map(k => [k, BD.arima[k].label + (BD.arima[k].log ? ' (log)' : '')]), labState.arima, 'Variable') + sel('ci', [['68', '68%'], ['80', '80%'], ['95', '95%']], labState.ci, 'Prediction band'));
  const g = grid(s);
  const hl = a.hist.v.map((v, i) => mLabAdd(a.hist.s, i));
  const fl = a.fc.map((v, i) => mLabAdd(a.fc_start, i));
  const labels = [...hl, ...fl];
  const last = a.hist.v[a.hist.v.length - 1];
  const pad = Array(hl.length - 1).fill(null);
  const b = a.bands[labState.ci];
  figure(g, { prefix: 'L', wide: true, title: a.label + ': ' + a.spec, sub: a.unit + '; last 8 years, fitted values and 12-month forecast with ' + labState.ci + '% band', h: 360,
    notes: 'Sample ' + a.sample[0] + ' to ' + a.sample[1] + ' (' + a.nobs + ' observations).' + (a.log ? ' Estimated in logs; forecasts are medians transformed back to levels.' : '') + (a.seasonal ? ' Seasonal ARIMA with a 12-month cycle.' : ''),
    source: srcKeys([a.key], true),
    csv: () => [['month', 'actual', 'fitted', 'forecast', 'lower', 'upper'], ...labels.map((l, i) => [l, i < hl.length ? a.hist.v[i] : '', i < hl.length ? a.fitted[i] : '', i >= hl.length ? a.fc[i - hl.length] : '', i >= hl.length ? b[0][i - hl.length] : '', i >= hl.length ? b[1][i - hl.length] : ''])],
    render: TH => tsOption(TH, labels, [S('Actual', [...a.hist.v, ...Array(fl.length).fill(null)], { color: TH.ink, w: 2 }), S('Fitted', [...a.fitted, ...Array(fl.length).fill(null)], { color: TH.pal[1], dash: true, w: 1.4 }),
      ...bandSeries(labState.ci + '% band', [...pad, last, ...b[0]], [...pad, last, ...b[1]], TH.pos, TH.dark ? 0.24 : 0.18, 'band'), S('Forecast', [...pad, last, ...a.fc], { color: TH.pos, w: 2.4, end: true, dec: 2 })], { y1: a.unit, scale: true, dec: 2 }) });
  let ct = '<thead><tr><th scope="col">Term</th><th scope="col" class="num">Coefficient</th><th scope="col" class="num">Std. error</th><th scope="col" class="num">z</th><th scope="col" class="num">p-value</th></tr></thead><tbody>';
  a.coefs.forEach(c => { ct += '<tr><th scope="row">' + esc(c.term) + '</th><td class="num">' + nf(c.coef, 4) + stars(c.p) + '</td><td class="num">(' + nf(c.se, 4) + ')</td><td class="num">' + nf(c.z, 2) + '</td><td class="num">' + fp(c.p) + '</td></tr>'; });
  ct += '<tr class="foot"><th scope="row">Observations</th><td class="num">' + a.nobs + '</td><td colspan="3"></td></tr><tr class="foot"><th scope="row">AIC / BIC</th><td class="num">' + nf(a.aic, 1) + '</td><td class="num">' + nf(a.bic, 1) + '</td><td colspan="2"></td></tr>';
  const two = document.createElement('div');
  two.className = 'twocol';
  body.append(two);
  tableWrap(two, ct + '</tbody>', tcap('Estimated coefficients'), 'Maximum-likelihood estimates; *** p<0.01, ** p<0.05, * p<0.1. sigma2 is the residual variance.');
  let lb = '<thead><tr><th scope="col">Lag</th><th scope="col" class="num">Ljung–Box Q</th><th scope="col" class="num">p-value</th><th scope="col">Result</th></tr></thead><tbody>';
  a.ljungbox.forEach(l => { lb += '<tr><th scope="row">' + l.lag + '</th><td class="num">' + nf(l.q, 2) + '</td><td class="num">' + fp(l.p) + '</td><td>' + (l.p < 0.05 ? 'Autocorrelation remains' : 'Residuals look like white noise') + '</td></tr>'; });
  let al = '<thead><tr><th scope="col">Rank</th><th scope="col">Specification</th><th scope="col" class="num">AIC</th><th scope="col" class="num">BIC</th></tr></thead><tbody>';
  a.alts.forEach((m, i) => { al += '<tr' + (i === 0 ? ' class="hl"' : '') + '><th scope="row">' + (i + 1) + '</th><td>' + esc(m.spec) + '</td><td class="num">' + nf(m.aic, 1) + '</td><td class="num">' + nf(m.bic, 1) + '</td></tr>'; });
  const col = document.createElement('div');
  two.append(col);
  tableWrap(col, lb + '</tbody>', tcap('Residual diagnostics'), 'Ljung and Box (1978).');
  tableWrap(col, al + '</tbody>', tcap('Best five candidate models'), 'Robustness to specification: close AIC values mean several models fit about equally well.');
  let bt = '<thead><tr><th scope="col">Horizon</th><th scope="col" class="num">N</th><th scope="col" class="num">RMSE</th><th scope="col" class="num">MAE</th><th scope="col" class="num">RMSE naive</th>' + (a.seasonal ? '<th scope="col" class="num">RMSE seasonal naive</th>' : '') + '<th scope="col" class="num">Theil’s U</th><th scope="col" class="num">Skill</th><th scope="col" class="num">DM</th><th scope="col" class="num">p-value</th></tr></thead><tbody>';
  a.backtest.forEach(r => { bt += '<tr><th scope="row">' + r.h + ' month' + (r.h > 1 ? 's' : '') + '</th><td class="num">' + r.n + '</td><td class="num">' + fv(a.unit, r.rmse) + '</td><td class="num">' + fv(a.unit, r.mae) + '</td><td class="num">' + fv(a.unit, r.rmse_rw) + '</td>' + (a.seasonal ? '<td class="num">' + fv(a.unit, r.rmse_sn) + '</td>' : '') + '<td class="num">' + nf(r.theil_u, 3) + '</td><td class="num ' + (r.skill > 0 ? 'up-good' : r.skill < 0 ? 'up-bad' : '') + '">' + (r.skill == null ? '–' : (r.skill > 0 ? '+' : '') + nf(r.skill * 100, 1) + '%') + '</td><td class="num">' + nf(r.dm, 2) + stars(r.dm_p) + '</td><td class="num">' + fp(r.dm_p) + '</td></tr>'; });
  tableWrap(body, bt + '</tbody>', tcap('Rolling-origin backtest'), 'The model is re-estimated at each of the last 24 forecast origins with its selected specification. Theil’s U below 1 and positive skill mean the model beats the naive forecast. DM: Diebold and Mariano (1995) with the Harvey, Leybourne and Newbold (1997) small-sample correction; negative values favour the model.');
}
function heat(TH, labels, vals, txt, o) {
  const data = [];
  vals.forEach((row, i) => row.forEach((v, j) => { if (v != null) data.push([j, i, v]); }));
  return { aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 10, bottom: 46, containLabel: true },
    tooltip: { backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, formatter: p => esc(o.tip(p.value[1], p.value[0])) },
    xAxis: { type: 'category', data: labels, name: o.xname, nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: TH.muted }, ...axisBase(TH), axisLabel: { color: TH.ink2, fontSize: 11, interval: 0, rotate: labels.length > 5 ? 30 : 0 }, splitArea: { show: false } },
    yAxis: { type: 'category', data: labels, name: o.yname, nameTextStyle: { color: TH.muted }, ...axisBase(TH), axisLabel: { color: TH.ink2, fontSize: 11 }, inverse: true },
    visualMap: { show: false, min: o.min, max: o.max, inRange: { color: o.colors(TH) } },
    series: [{ type: 'heatmap', data, label: { show: true, fontSize: 11, color: TH.ink, formatter: p => txt(p.value[1], p.value[0]) }, itemStyle: { borderColor: TH.paper, borderWidth: 2 } }] };
}
function labVar(body) {
  const V = BD.var;
  const s = sec(body, 'Structural VAR', 'A ' + V.vars.length + '-variable vector autoregression for inflation, money growth, the call money rate and Taka depreciation, identified recursively (Sims, 1980). Sample ' + V.sample[0] + ' to ' + V.sample[1] + ', ' + V.nobs + ' observations, ' + V.p + ' lags.');
  let lt = '<thead><tr><th scope="col">Lags</th><th scope="col" class="num">AIC</th><th scope="col" class="num">BIC</th><th scope="col" class="num">HQIC</th><th scope="col" class="num">FPE</th></tr></thead><tbody>';
  const mins = {};
  ['aic', 'bic', 'hqic', 'fpe'].forEach(k => { mins[k] = Math.min(...V.lagtab.map(r => r[k]).filter(x => x != null)); });
  V.lagtab.forEach(r => { lt += '<tr' + (r.p === V.p ? ' class="hl"' : '') + '><th scope="row">' + r.p + '</th>' + ['aic', 'bic', 'hqic', 'fpe'].map(k => '<td class="num' + (r[k] === mins[k] ? ' best' : '') + '">' + (k === 'fpe' ? Number(r[k]).toExponential(3) : nf(r[k], 3)) + (r[k] === mins[k] ? ' ◆' : '') + '</td>').join('') + '</tr>'; });
  const two = document.createElement('div');
  two.className = 'twocol';
  s.append(two);
  tableWrap(two, lt + '</tbody>', tcap('Lag-length selection'), '◆ marks each criterion’s minimum. Highlighted row: the lag length used (' + V.lag_rule + '). Year-on-year rates overlap across 12 months, so 12 lags capture their base effects.');
  const col = document.createElement('div');
  two.append(col);
  let dg = '<thead><tr><th scope="col">Check</th><th scope="col" class="num">Statistic</th><th scope="col" class="num">p-value</th><th scope="col">Result</th></tr></thead><tbody>' +
    '<tr><th scope="row">Stability: largest root modulus</th><td class="num">' + nf(V.moduli[0], 4) + '</td><td class="num">–</td><td>' + (V.stable ? 'Stable: all roots inside the unit circle' : 'Not stable') + '</td></tr>' +
    '<tr><th scope="row">Portmanteau (24 lags, df ' + V.white.df + ')</th><td class="num">' + nf(V.white.stat, 1) + '</td><td class="num">' + fp(V.white.p) + '</td><td>' + (V.white.p < 0.05 ? 'Residual autocorrelation remains' : 'White-noise residuals') + '</td></tr>' +
    '<tr><th scope="row">Normality (Jarque–Bera, joint)</th><td class="num">' + nf(V.normal.stat, 1) + '</td><td class="num">' + fp(V.normal.p) + '</td><td>' + (V.normal.p < 0.05 ? 'Fat-tailed residuals' : 'Normal residuals') + '</td></tr>' +
    '<tr><th scope="row">Interpolated gaps</th><td class="num">' + V.filled + '</td><td class="num">–</td><td>Isolated missing months filled linearly</td></tr></tbody>';
  tableWrap(col, dg, tcap('Model diagnostics'), 'Residual autocorrelation and fat tails are common with overlapping year-on-year rates and shock-driven samples. They are why the robustness, subsample and placebo checks matter, and why bands are wide.');
  const g = grid(s);
  figure(g, { prefix: 'L', title: 'Granger causality matrix', sub: 'p-values: does the column variable help predict the row variable?', h: 330,
    notes: 'F-tests that all lags of one variable are jointly zero in another’s equation (Granger, 1969). Darker cells are stronger evidence; *** p<0.01, ** p<0.05, * p<0.1.', source: srcKeys(V.keys, true),
    csv: () => [['cause', 'effect', 'F', 'p'], ...V.granger.map(x => [V.vars[x.cause], V.vars[x.effect], x.f, x.p])],
    render: TH => { const M = V.vars.map((_, i) => V.vars.map((_, j) => { if (i === j) return null; const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? -Math.log10(Math.max(r.p, 1e-6)) : null; }));
      return heat(TH, V.vars, M, (i, j) => { const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? fp(r.p) + stars(r.p) : ''; },
        { min: 0, max: 4, xname: 'Cause', yname: 'Effect', colors: T => [T.paper, T.dark ? '#2B5C93' : '#9DC0E6', T.pos], tip: (i, j) => { const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? V.vars[j] + ' → ' + V.vars[i] + ': F = ' + nf(r.f, 2) + ', p = ' + fp(r.p) : ''; } }); } });
  const f12 = V.fevd[labState.fevd];
  const hs = Array.from({ length: 25 }, (_, i) => i);
  figure(g, { prefix: 'L', title: 'Forecast-error variance decomposition: ' + V.vars[labState.fevd], sub: '% of forecast-error variance explained by each shock, horizons 0–24 months', h: 330,
    notes: 'Recursive (Cholesky) identification in the order shown in the legend.', source: srcKeys(V.keys, true),
    csv: () => [['horizon', ...V.vars], ...hs.map(h => [h, ...f12.map(c => c[h])])],
    render: TH => tsOption(TH, hs.map(String), V.vars.map((n, i) => S(n, f12[i], { stack: 'f', area: 0.85, w: 0.5 })), { y1: '%', min: 0, events: false, dec: 1 }) });
  ctrl(s, sel('fevd', V.vars.map((n, i) => [i, n]), labState.fevd, 'Variance decomposition for') + sel('shock', V.vars.map((n, i) => [i, n]), labState.shock, 'Impulse responses to a shock in'));
  const ir = sec(body, 'Impulse responses', 'Responses of each variable to a one-standard-deviation orthogonalised shock, with 90% Monte Carlo bands (500 replications).');
  const g2 = grid(ir);
  V.vars.forEach((resp, r) => {
    const sh = labState.shock;
    const m = V.irf.mean[r][sh], lo = V.irf.lo[r][sh], hi = V.irf.hi[r][sh];
    figure(g2, { prefix: 'L', title: 'Response of ' + resp.toLowerCase(), sub: 'to a ' + V.vars[sh].toLowerCase() + ' shock; percentage points, months after the shock', h: 250,
      source: srcKeys(V.keys, true), csv: () => [['month', 'response', 'lower 90', 'upper 90'], ...m.map((v, i) => [i, v, lo[i], hi[i]])],
      render: TH => tsOption(TH, hs.map(String), [...bandSeries('90% band', lo, hi, TH.pos, TH.dark ? 0.26 : 0.18, 'b'), Object.assign(S('Response', m, { color: TH.pos, w: 2.2 }), { markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: TH.ink2, width: 1 }, data: [{ yAxis: 0 }] } })], { y1: 'pp', events: false, dec: 3 }) });
  });
  let ft = '<thead><tr><th scope="col">Variable</th><th scope="col">Horizon</th>' + V.vars.map(n => '<th scope="col" class="num">' + esc(n) + ' shock</th>').join('') + '</tr></thead><tbody>';
  V.vars.forEach((n, v) => [1, 6, 12, 24].forEach((h, k) => { ft += '<tr' + (k === 0 ? ' class="gtop"' : '') + '>' + (k === 0 ? '<th scope="rowgroup" rowspan="4">' + esc(n) + '</th>' : '') + '<td>' + h + ' month' + (h > 1 ? 's' : '') + '</td>' + V.fevd[v].map(c => '<td class="num">' + nf(c[h], 1) + '</td>').join('') + '</tr>'; }));
  tableWrap(ir, ft + '</tbody>', tcap('Variance decomposition table (%)'), 'Each row sums to 100%.');
  const fc = V.fc;
  let vt = '<thead><tr><th scope="col">Variable</th><th scope="col" class="num">+1 month</th><th scope="col" class="num">+3 months</th><th scope="col" class="num">+6 months</th><th scope="col" class="num">+12 months</th></tr></thead><tbody>';
  V.vars.forEach((n, i) => { vt += '<tr><th scope="row">' + esc(n) + '</th>' + [0, 2, 5, 11].map(h => '<td class="num"><b>' + nf(fc.mean[i][h], 2) + '</b><small class="pi">' + nf(fc.lo80[i][h], 1) + ' to ' + nf(fc.hi80[i][h], 1) + '</small></td>').join('') + '</tr>'; });
  tableWrap(ir, vt + '</tbody>', tcap('SVAR forecasts from ' + fc.start), 'Point forecasts with 80% intervals (analytic, Lütkepohl, 2005).');
}
function labRobust(body) {
  const R = BD.robust, V = BD.var, P = BD.placebo;
  const s = sec(body, 'Robustness checks', 'Do the main findings survive different modelling choices? Each table changes one assumption at a time.');
  const lp = R.lags.map(r => r.g_xr_p), n10 = R.lags.filter(r => r.g_xr_p < 0.1).length, posAll = R.lags.every(r => r.irf_xr_peak > 0);
  const lagNote = 'The peak response of inflation to a Taka depreciation shock is ' + (posAll ? 'positive at every lag length' : 'not of consistent sign across lag lengths') + '. The Granger test is significant at 10% in ' + n10 + ' of ' + R.lags.length + ' specifications (p from ' + fp(Math.min(...lp)) + ' to ' + fp(Math.max(...lp)) + '), so the evidence for exchange-rate pass-through over the full sample is ' + (n10 >= R.lags.length - 1 ? 'robust' : n10 * 2 >= R.lags.length ? 'moderate' : 'weak') + '.';
  const cs = R.orders.map(r => Math.sign(r.call_peak)), sameSign = cs.every(x => x === cs[0]), xs = R.orders.map(r => r.xr_peak);
  const ordNote = 'Highlighted: baseline. The peak Taka effect ranges from ' + nf(Math.min(...xs), 3) + ' to ' + nf(Math.max(...xs), 3) + ' points across orderings. ' + (sameSign ? (cs[0] > 0 ? 'Inflation rises after a call-rate increase in every ordering: the well-known “price puzzle” of recursive VARs (Sims, 1992), which usually means the rate shock also carries news about future inflation, so read the interest-rate channel with care.' : 'The call-rate effect keeps its sign in every ordering.') : 'The sign of the call-rate response changes with the ordering, so that result is not robust to identification.');
  const sa = R.subsamples[0] || {}, sb = R.subsamples[1] || {};
  const subNote = 'Split at January 2020. ' + [['Taka depreciation', 'g_xr_p'], ['the call money rate', 'g_call_p'], ['M2 growth', 'g_m2_p']].map(([n, k]) => { const pa = sa[k] < 0.05, pb = sb[k] < 0.05; return pa === pb ? (pa ? n + ' predicts inflation in both periods' : n + ' predicts inflation in neither') : n + ' predicts inflation only in ' + (pa ? sa.sample : sb.sample); }).join('; ') + ' (5% level). Channels that switch on or off between periods signal structural change that a single full-sample model averages away. Standard errors in parentheses.';
  let lt = '<thead><tr><th scope="col">Lags</th><th scope="col" class="num">AIC</th><th scope="col">Stable</th><th scope="col" class="num">Peak inflation response to a Taka shock (pp)</th><th scope="col" class="num">at month</th><th scope="col" class="num">Peak response to a call-rate shock</th><th scope="col" class="num">Taka → inflation, p</th><th scope="col" class="num">M2 → inflation, p</th></tr></thead><tbody>';
  R.lags.forEach(r => { lt += '<tr' + (r.p === V.p ? ' class="hl"' : '') + '><th scope="row">' + r.p + '</th><td class="num">' + nf(r.aic, 3) + '</td><td>' + (r.stable ? 'Yes' : 'No') + '</td><td class="num">' + nf(r.irf_xr_peak, 3) + '</td><td class="num">' + r.irf_xr_at + '</td><td class="num">' + nf(r.irf_call_peak, 3) + '</td><td class="num">' + fp(r.g_xr_p) + stars(r.g_xr_p) + '</td><td class="num">' + fp(r.g_m2_p) + stars(r.g_m2_p) + '</td></tr>'; });
  tableWrap(s, lt + '</tbody>', tcap('Sensitivity to lag length'), lagNote);
  let ot = '<thead><tr><th scope="col">Cholesky ordering (first is most exogenous)</th><th scope="col" class="num">Peak response to Taka shock</th><th scope="col" class="num">month</th><th scope="col" class="num">to call-rate shock</th><th scope="col" class="num">month</th><th scope="col" class="num">to M2 shock</th><th scope="col" class="num">month</th></tr></thead><tbody>';
  R.orders.forEach((r, i) => { ot += '<tr' + (i === 0 ? ' class="hl"' : '') + '><th scope="row">' + esc(r.order.join(' → ')) + '</th><td class="num">' + nf(r.xr_peak, 3) + '</td><td class="num">' + r.xr_at + '</td><td class="num">' + nf(r.call_peak, 3) + '</td><td class="num">' + r.call_at + '</td><td class="num">' + nf(r.m2_peak, 3) + '</td><td class="num">' + r.m2_at + '</td></tr>'; });
  tableWrap(s, ot + '</tbody>', tcap('Sensitivity to the identification ordering'), ordNote);
  let st = '<thead><tr><th scope="col">Sample</th><th scope="col" class="num">N</th><th scope="col" class="num">Lags</th><th scope="col" class="num">Mean inflation</th><th scope="col" class="num">Persistence, AR(1)</th><th scope="col" class="num">Taka → inflation, p</th><th scope="col" class="num">Call rate → inflation, p</th><th scope="col" class="num">M2 → inflation, p</th></tr></thead><tbody>';
  R.subsamples.forEach(r => { st += '<tr><th scope="row">' + esc(r.sample) + '</th><td class="num">' + r.n + '</td><td class="num">' + r.p + '</td><td class="num">' + nf(r.mean_infl, 2) + '%</td><td class="num">' + nf(r.ar1, 3) + ' <small>(' + nf(r.ar1_se, 3) + ')</small></td><td class="num">' + fp(r.g_xr_p) + stars(r.g_xr_p) + '</td><td class="num">' + fp(r.g_call_p) + stars(r.g_call_p) + '</td><td class="num">' + fp(r.g_m2_p) + stars(r.g_m2_p) + '</td></tr>'; });
  tableWrap(s, st + '</tbody>', tcap('Heterogeneity over time: subsample estimates'), subNote);
  const g = grid(s);
  const rl_ = R.rolling;
  figure(g, { prefix: 'L', title: 'Rolling inflation persistence', sub: 'AR(1) coefficient over 60-month windows with 95% band', notes: 'Values near 1 mean shocks to inflation fade very slowly.', source: srcKeys(['infl'], true),
    csv: () => [['window end', 'AR(1)', 'lower 95', 'upper 95'], ...rl_.map(r => [r[0], r[1], r[2], r[3]])],
    render: TH => tsOption(TH, rl_.map(r => r[0]), [...bandSeries('95% band', rl_.map(r => r[2]), rl_.map(r => r[3]), TH.pos, 0.18, 'b'), S('AR(1) coefficient', rl_.map(r => r[1]), { color: TH.pos, w: 2.2, end: true, dec: 2 })], { y1: 'coefficient', scale: true, marks: [{ yAxis: 1, name: 'unit root' }], dec: 3 }) });
  figure(g, { prefix: 'L', title: 'Rolling correlation: inflation and Taka depreciation', sub: '36-month windows', notes: 'A rising correlation is consistent with stronger exchange-rate pass-through.', source: srcKeys(['infl', 'xr_dep'], true),
    csv: () => [['window end', 'correlation'], ...rl_.map(r => [r[0], r[4]])],
    render: TH => tsOption(TH, rl_.map(r => r[0]), [S('Correlation', signBars(rl_.map(r => r[4]), TH), { bar: true })], { y1: 'r', bar: true, min: -1, dec: 2 }) });
  const p = sec(body, 'Placebo tests', 'If the exchange-rate finding were spurious, it should also appear when the timing of the exchange rate is scrambled, or when the “driver” is pure noise.');
  const g2 = grid(p);
  const e = P.hist.edges, c = P.hist.counts;
  const mids = c.map((_, i) => (e[i] + e[i + 1]) / 2);
  figure(g2, { prefix: 'L', title: 'Placebo distribution of the Granger F-statistic', sub: P.n_shift + ' circular shifts of the Taka depreciation series', h: 300,
    notes: 'Shifting the series in time keeps its own dynamics but breaks its timing relative to inflation. Placebo p-value = share of placebo F-statistics at least as large as the actual one: ' + fp(P.p_placebo) + '.', source: srcKeys(['infl', 'xr_dep'], true),
    csv: () => [['F bin mid', 'count'], ...mids.map((m, i) => [m, c[i]])],
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 18, top: 24, bottom: 6, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink } },
      xAxis: { type: 'category', data: mids.map(m => nf(m, 2)), name: 'F', ...axisBase(TH) }, yAxis: valAxis(TH, 'count'),
      series: [{ type: 'bar', name: 'Placebo F', data: c, barCategoryGap: '8%', itemStyle: { color: TH.muted },
        markLine: { symbol: 'none', lineStyle: { color: TH.neg, width: 2 }, label: { color: TH.neg, formatter: 'Actual F = ' + nf(P.f_actual, 2) }, data: [{ xAxis: Math.min(mids.length - 1, Math.max(0, mids.findIndex(m => m >= P.f_actual))) }] } }] }) });
  let pt = '<thead><tr><th scope="col">Test</th><th scope="col" class="num">Result</th><th scope="col">Reading</th></tr></thead><tbody>' +
    '<tr><th scope="row">Actual Granger test, Taka → inflation (bivariate, ' + V.p + ' lags)</th><td class="num">F = ' + nf(P.f_actual, 2) + ', p = ' + fp(P.p_actual) + '</td><td>Conventional test</td></tr>' +
    '<tr><th scope="row">Placebo p-value (timing scrambled)</th><td class="num">' + fp(P.p_placebo) + '</td><td>' + (P.p_placebo < 0.05 ? 'The real timing matters: the effect is not an artefact of the series’ own dynamics' : 'Not distinguishable from scrambled timing') + '</td></tr>' +
    '<tr><th scope="row">95th percentile of placebo F</th><td class="num">' + nf(P.f_q95, 2) + '</td><td>Critical value implied by the placebo distribution</td></tr>' +
    '<tr><th scope="row">Fake random-walk drivers rejected at 5%</th><td class="num">' + nf(P.fake_rate05 * 100, 1) + '% of ' + P.fake_n + '</td><td>Nominal size is 5%; the excess shows how much Granger tests over-reject with persistent data</td></tr>' +
    '<tr><th scope="row">Size-adjusted 5% threshold for p</th><td class="num">' + fp(P.fake_q05) + '</td><td>' + (P.p_actual < P.fake_q05 ? 'The actual p-value passes the stricter threshold' : 'The actual p-value does not pass the stricter threshold') + '</td></tr></tbody>';
  tableWrap(p, pt, tcap('Placebo and size checks'), 'Applications: these checks guard against “discovering” a driver that is really just two trending series moving together.');
}
function labDsge(body) {
  const D = BD.dsge;
  const s = sec(body, 'New Keynesian DSGE model', 'A small dynamic stochastic general equilibrium model in the canonical three-equation form: an IS curve, a New Keynesian Phillips curve and a Taylor rule. It shows how shocks travel through the economy in theory, as a structural complement to the statistical models.');
  const eq = document.createElement('div');
  eq.className = 'formula';
  eq.innerHTML = '<p><b>IS curve:</b> x<sub>t</sub> = E<sub>t</sub>x<sub>t+1</sub> − (1/σ)(i<sub>t</sub> − E<sub>t</sub>π<sub>t+1</sub>) + d<sub>t</sub></p><p><b>Phillips curve:</b> π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + κx<sub>t</sub> + u<sub>t</sub></p><p><b>Taylor rule:</b> i<sub>t</sub> = φ<sub>π</sub>π<sub>t</sub> + φ<sub>y</sub>x<sub>t</sub> + v<sub>t</sub></p><p class="note">x: output gap; π: inflation; i: policy rate; d, u, v: demand, cost-push and monetary shocks, each AR(1). Quarterly model solved by undetermined coefficients; inflation and interest rates shown annualised.</p>';
  s.append(eq);
  let pt = '<thead><tr><th scope="col">Parameter</th><th scope="col">Meaning</th><th scope="col" class="num">Value</th><th scope="col">Source</th></tr></thead><tbody>';
  D.params.forEach(p => { pt += '<tr><th scope="row">' + esc(p.sym) + '</th><td>' + esc(p.name) + '</td><td class="num">' + nf(p.v, p.v < 1 ? 3 : 2) + '</td><td>' + esc(p.src) + '</td></tr>'; });
  pt += '<tr class="foot"><th scope="row">Determinacy</th><td>κ(φπ − 1) + (1 − β)φy > 0 (Taylor principle)</td><td class="num">' + nf(D.determinacy, 4) + '</td><td>' + (D.determinacy > 0 ? 'Satisfied: unique stable equilibrium' : 'Violated') + '</td></tr>';
  tableWrap(s, pt + '</tbody>', tcap('Calibration'), 'Calibrated to the textbook benchmark (Galí, 2015, chapter 3), not estimated for Bangladesh. Use it to read the direction and timing of effects; use the SVAR and ARIMA tables for magnitudes in Bangladesh data.');
  const g = grid(s);
  const hs = Array.from({ length: 17 }, (_, i) => String(i));
  Object.entries(D.irf).forEach(([name, r]) => {
    figure(g, { prefix: 'L', title: name + ' shock', sub: 'responses over 16 quarters; output gap in %, inflation and policy rate in annualised pp', h: 260,
      notes: 'Shock persistence ρ = ' + r.rho + '.', source: 'Model simulation; calibration from Galí (2015) and Taylor (1993).',
      csv: () => [['quarter', 'output gap', 'inflation', 'policy rate'], ...hs.map((h, i) => [h, r.x[i], r.pi[i], r.i[i]])],
      render: TH => tsOption(TH, hs, [S('Output gap', r.x, { w: 2.2 }), S('Inflation', r.pi, { w: 2.2 }), S('Policy rate', r.i, { dash: true, w: 2 })].map((x, i) => i === 0 ? Object.assign(x, { markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: TH.ink2, width: 1 }, data: [{ yAxis: 0 }] } }) : x), { y1: '%/pp', events: false, dec: 3 }) });
  });
}
function labWorld(body) {
  const W = BD.world;
  const s = sec(body, 'Heterogeneity across regions', 'Do inflation dynamics and growth volatility differ systematically between world regions? Box plots of country-level estimates, with a Kruskal–Wallis test of equal distributions.');
  const m = W.het.measures[labState.het] || W.het.measures[0];
  ctrl(s, sel('het', W.het.measures.map((x, i) => [i, x.label]), labState.het, 'Measure'));
  const g = grid(s);
  figure(g, { prefix: 'L', title: m.label, sub: 'by region; one observation per economy', h: 320, notes: 'Boxes span the interquartile range, the line marks the median and whiskers extend to 1.5 × IQR. The dashed line marks Bangladesh. Economies with any year above 100% inflation are excluded.',
    source: 'World Bank, World Development Indicators (CC BY 4.0); author’s calculations.', csv: () => [['region', 'n', 'lower whisker', 'Q1', 'median', 'Q3', 'upper whisker'], ...m.rows.map(r => [r.region, r.n, ...r.box])],
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 18, top: 16, bottom: 6, containLabel: true },
      tooltip: { trigger: 'item', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, formatter: p => { const r = m.rows[p.dataIndex]; return r ? '<b>' + esc(r.region) + '</b> (n = ' + r.n + ')<br>median ' + nf(r.box[2], 2) + '<br>IQR ' + nf(r.box[1], 2) + ' to ' + nf(r.box[3], 2) : ''; } },
      xAxis: { type: 'category', data: m.rows.map(r => r.region + ' (' + r.n + ')'), ...axisBase(TH), axisLabel: { color: TH.ink2, fontSize: 11 } }, yAxis: valAxis(TH, '', { scale: true }),
      series: [{ type: 'boxplot', data: m.rows.map((r, i) => ({ value: r.box, itemStyle: { color: TH.dark ? 'rgba(111,168,232,.22)' : 'rgba(31,95,168,.14)', borderColor: ['#D4583A', '#1F5FA8', '#C98500', '#6B2CB0', '#1F8A7D'][i % 5], borderWidth: 1.8 } })),
        markLine: m.bgd == null ? undefined : { symbol: 'none', silent: true, lineStyle: { color: TH.signal, type: 'dashed', width: 2 }, label: { color: TH.ink, formatter: 'Bangladesh ' + nf(m.bgd, 2) }, data: [{ yAxis: m.bgd }] } }] }) });
  let kt = '<thead><tr><th scope="col">Measure</th><th scope="col" class="num">Kruskal–Wallis H</th><th scope="col" class="num">df</th><th scope="col" class="num">p-value</th><th scope="col" class="num">Bangladesh</th><th scope="col">Reading</th></tr></thead><tbody>';
  W.het.measures.forEach(x => { kt += '<tr><th scope="row">' + esc(x.label) + '</th><td class="num">' + nf(x.kw_h, 2) + stars(x.kw_p) + '</td><td class="num">' + x.kw_df + '</td><td class="num">' + fp(x.kw_p) + '</td><td class="num">' + nf(x.bgd, 2) + '</td><td>' + (x.kw_p < 0.05 ? 'Regions differ significantly' : 'No significant difference between regions') + '</td></tr>'; });
  tableWrap(s, kt + '</tbody>', tcap('Heterogeneity tests'), 'Kruskal and Wallis (1952): a rank-based test that does not assume normality. *** p<0.01, ** p<0.05, * p<0.1.');
  const c = sec(body, 'Income convergence', 'Do poorer countries grow faster than richer ones? β-convergence regresses growth in income per person on its starting level (Barro and Sala-i-Martin, 1992); σ-convergence tracks whether incomes are becoming less dispersed.');
  const C = W.conv;
  const g2 = grid(c);
  const regs = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'], rc = ['#D4583A', '#1F5FA8', '#C98500', '#6B2CB0', '#1F8A7D'];
  figure(g2, { prefix: 'L', wide: true, title: 'β-convergence, 2000–2024', sub: 'average real growth of GDP per person (%) against log GDP per person in 2000 (PPP)', h: 380,
    notes: 'Each dot is an economy, coloured by region. Fitted line with 95% confidence band from OLS. Growth per person = real GDP growth minus population growth.', source: 'World Bank, World Development Indicators (CC BY 4.0); author’s calculations.',
    csv: () => [['code', 'economy', 'region', 'ln GDP per person 2000', 'growth per person %'], ...C.pts.map(p => [p[2], p[3], p[4], p[0], p[1]])],
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 18, top: 36, bottom: 6, containLabel: true },
      legend: { top: 0, left: 0, textStyle: { color: TH.ink2, fontSize: 12 }, data: regs.map((r, k) => ({ name: r, itemStyle: { color: rc[k] } })) },
      tooltip: { trigger: 'item', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, formatter: p => p.data && p.data.name ? '<b>' + esc(p.data.name) + '</b><br>ln GDP per person 2000: ' + nf(p.data.value[0], 2) + '<br>growth: ' + nf(p.data.value[1], 2) + '%' : '' },
      xAxis: { type: 'value', name: 'ln GDP per person, 2000', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: TH.muted }, scale: true, splitLine: { lineStyle: { color: TH.grid } }, ...axisBase(TH) },
      yAxis: valAxis(TH, '% a year', { scale: true }),
      series: [{ type: 'custom', name: '95% CI', silent: true, z: 1, tooltip: { show: false }, data: [[C.line.x[0], C.line.y[0]]],
          renderItem: (params, api) => ({ type: 'polygon', shape: { points: C.line.x.map((x, i) => api.coord([x, C.line.lo[i]])).concat(C.line.x.map((x, i) => api.coord([x, C.line.hi[i]])).reverse()) },
            style: { fill: TH.dark ? 'rgba(231,238,244,.12)' : 'rgba(14,28,43,.09)' } }) },
        { type: 'line', name: 'Fitted', data: C.line.y.map((v, i) => [C.line.x[i], v]), showSymbol: false, lineStyle: { color: TH.ink, width: 2 }, silent: true, tooltip: { show: false } },
        ...regs.map((rg, k) => ({ type: 'scatter', name: rg, symbolSize: p => 7, data: C.pts.filter(p => p[4] === rg).map(p => ({ name: p[3], value: [p[0], p[1]], symbolSize: p[2] === 'BGD' ? 15 : 7, itemStyle: p[2] === 'BGD' ? { color: TH.signal, borderColor: TH.ink, borderWidth: 1.5 } : undefined, label: p[2] === 'BGD' ? { show: true, formatter: 'Bangladesh', position: 'top', color: TH.ink, fontWeight: 700 } : undefined })), itemStyle: { color: rc[k], opacity: 0.8 } }))] }) });
  const row = (mod, i) => { const r = mod.rows[i]; return r ? '<td class="num">' + nf(r.coef, 3) + stars(r.p) + '<small class="pi">(' + nf(r.se, 3) + ')</small></td>' : '<td class="num muted">–</td>'; };
  const terms = C.m2.rows.map(r => r.term);
  let rt = '<thead><tr><th scope="col">Dependent variable: growth per person, % a year</th><th scope="col" class="num">(1) Unconditional</th><th scope="col" class="num">(2) Conditional</th></tr></thead><tbody>';
  terms.forEach((t, i) => { const j = C.m1.rows.findIndex(r => r.term === t); rt += '<tr><th scope="row">' + esc(t) + '</th>' + (j >= 0 ? row(C.m1, j) : '<td class="num muted">–</td>') + row(C.m2, i) + '</tr>'; });
  rt += '<tr class="foot"><th scope="row">Observations</th><td class="num">' + C.m1.n + '</td><td class="num">' + C.m2.n + '</td></tr><tr class="foot"><th scope="row">R²</th><td class="num">' + nf(C.m1.r2, 3) + '</td><td class="num">' + nf(C.m2.r2, 3) + '</td></tr><tr class="foot"><th scope="row">F-test p-value</th><td class="num">' + fp(C.m1.f_p) + '</td><td class="num">' + fp(C.m2.f_p) + '</td></tr>';
  tableWrap(c, rt + '</tbody>', tcap('β-convergence regressions'), 'OLS with heteroskedasticity-robust (HC1) standard errors in parentheses; *** p<0.01, ** p<0.05, * p<0.1. Column (2) adds the Solow determinants of the steady state (Mankiw, Romer and Weil, 1992)' + (Math.abs(C.m2.rows[1].coef) > Math.abs(C.m1.rows[1].coef) ? ': convergence is faster once investment and population growth are held equal' : '') + '. Implied unconditional half-life: about ' + nf(C.half_life, 0) + ' years.');
  figure(g2, { prefix: 'L', title: 'σ-convergence', sub: 'cross-country standard deviation of log GDP per person (PPP)', source: 'World Bank, World Development Indicators (CC BY 4.0); author’s calculations.',
    csv: () => [['year', 'SD of log GDP per person', 'economies'], ...C.sigma],
    render: TH => tsOption(TH, C.sigma.map(r => String(r[0])), [S('Dispersion', C.sigma.map(r => r[1]), { area: 0.1, end: true, dec: 3 })], { y1: 'SD', scale: true, events: false, dec: 3 }) });
  ridgeFig(g2, W.ridge, { prefix: 'L', title: 'World inflation distribution (“mountain map”)', sub: 'kernel density across economies, selected years; values clipped to −5% to 25%', xname: '%',
    notes: 'Compare the 2021–2023 ridges with earlier years: a whole ridge moving right means a broad-based surge, while a long right tail alone means a few outliers. Light lines mark medians.', source: 'World Bank, World Development Indicators (CC BY 4.0); author’s calculations.' });
  const K = W.corr;
  const cs = sec(body, 'How indicators move together across countries', 'Spearman rank correlations across economies in ' + K.year + '.');
  const g3 = grid(cs);
  figure(g3, { prefix: 'L', wide: true, title: 'Correlation matrix, ' + K.year, sub: 'Spearman ρ across economies; stars mark significance', h: 420, notes: 'Rank correlations are robust to outliers. Each cell uses all economies with both values (pairwise).', source: 'World Bank, World Development Indicators (CC BY 4.0); author’s calculations.',
    csv: () => [['', ...K.labels], ...K.labels.map((l, i) => [l, ...K.rho[i]])],
    render: TH => heat(TH, K.labels, K.rho, (i, j) => i === j ? '' : nf(K.rho[i][j], 2) + stars(K.p[i][j]), { min: -1, max: 1, colors: T => [T.neg, T.paper, T.pos], tip: (i, j) => K.labels[i] + ' × ' + K.labels[j] + ': ρ = ' + nf(K.rho[i][j], 3) + ', p = ' + fp(K.p[i][j]) + ', n = ' + K.n[i][j] }) });
  const f = sec(body, 'Cross-country projections', 'ARMA models for annual real GDP growth and inflation, chosen by AIC, three years ahead with 80% intervals. Mechanical statistical projections, not official forecasts.');
  let ft = '<thead><tr><th scope="col" rowspan="2">Economy</th><th scope="colgroup" colspan="5" class="cg">Real GDP growth, %</th><th scope="colgroup" colspan="5" class="cg">Inflation, %</th></tr><tr>' +
    ['Latest', 'Model', '+1 year', '+2 years', '+3 years', 'Latest', 'Model', '+1 year', '+2 years', '+3 years'].map(x => '<th scope="col" class="num">' + x + '</th>').join('') + '</tr></thead><tbody>';
  W.fc.forEach(r => {
    const part = d => d ? '<td class="num">' + nf(d.last[1], 1) + '<small class="pi">' + d.last[0] + '</small></td><td>' + esc(d.spec) + '<small class="pi">RMSE ' + nf(d.rmse, 2) + ' vs ' + nf(d.rmse_naive, 2) + '</small></td>' + [0, 1, 2].map(i => '<td class="num"><b>' + nf(d.fc[i], 1) + '</b><small class="pi">' + nf(d.lo80[i], 1) + ' to ' + nf(d.hi80[i], 1) + '</small></td>').join('') : '<td colspan="5" class="muted">Not enough data</td>';
    ft += '<tr' + (r.code === 'BGD' ? ' class="hl"' : '') + '><th scope="row">' + esc(r.name) + '</th>' + part(r.gdp_growth) + part(r.inflation) + '</tr>';
  });
  tableWrap(f, ft + '</tbody>', tcap('Projections by economy'), 'Estimated on 1995–2025 annual data (World Bank WDI). Under “Model”: one-step-ahead RMSE over the last 8 years against a naive forecast; where the naive RMSE is lower, give the projection little weight.');
}
function labRefs(body) {
  const s = sec(body, 'References', 'Methods used in the Forecast lab and the Bangladesh section.');
  const R = ['Akaike, H. (1974). A new look at the statistical model identification. IEEE Transactions on Automatic Control, 19(6), 716–723.',
    'Atkeson, A., & Ohanian, L. E. (2001). Are Phillips curves useful for forecasting inflation? Federal Reserve Bank of Minneapolis Quarterly Review, 25(1), 2–11.',
    'Barro, R. J., & Sala-i-Martin, X. (1992). Convergence. Journal of Political Economy, 100(2), 223–251.',
    'Bates, J. M., & Granger, C. W. J. (1969). The combination of forecasts. Operational Research Quarterly, 20(4), 451–468.',
    'Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). Time Series Analysis: Forecasting and Control (5th ed.). Wiley.',
    'Dickey, D. A., & Fuller, W. A. (1979). Distribution of the estimators for autoregressive time series with a unit root. Journal of the American Statistical Association, 74(366), 427–431.',
    'Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. Journal of Business & Economic Statistics, 13(3), 253–263.',
    'Galí, J. (2015). Monetary Policy, Inflation, and the Business Cycle (2nd ed.). Princeton University Press.',
    'Granger, C. W. J. (1969). Investigating causal relations by econometric models and cross-spectral methods. Econometrica, 37(3), 424–438.',
    'Harvey, D., Leybourne, S., & Newbold, P. (1997). Testing the equality of prediction mean squared errors. International Journal of Forecasting, 13(2), 281–291.',
    'Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice (3rd ed.). OTexts.',
    'Jarque, C. M., & Bera, A. K. (1980). Efficient tests for normality, homoscedasticity and serial independence of regression residuals. Economics Letters, 6(3), 255–259.',
    'Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association, 47(260), 583–621.',
    'Kwiatkowski, D., Phillips, P. C. B., Schmidt, P., & Shin, Y. (1992). Testing the null hypothesis of stationarity against the alternative of a unit root. Journal of Econometrics, 54(1–3), 159–178.',
    'Ljung, G. M., & Box, G. E. P. (1978). On a measure of lack of fit in time series models. Biometrika, 65(2), 297–303.',
    'Lütkepohl, H. (2005). New Introduction to Multiple Time Series Analysis. Springer.',
    'Mankiw, N. G., Romer, D., & Weil, D. N. (1992). A contribution to the empirics of economic growth. Quarterly Journal of Economics, 107(2), 407–437.',
    'Sims, C. A. (1980). Macroeconomics and reality. Econometrica, 48(1), 1–48.',
    'Sims, C. A. (1992). Interpreting the macroeconomic time series facts: The effects of monetary policy. European Economic Review, 36(5), 975–1000.',
    'Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.'];
  const D = ['Bangladesh Bank. Monthly Economic Trends (September 2026 edition and earlier editions back to 2009). Tables IA, IB, IIA, IID, IV, VII, VIII, XVI, XVIII, XXIII, XXVII and others, as cited under each figure.',
    'Bangladesh Bank. National Summary Data Page (NSDP) for the IMF Enhanced General Data Dissemination System: balance of payments (BPM6), financial soundness indicators and related tables.',
    'Bangladesh Bureau of Statistics (BBS). Consumer price index and national accounts, as published in Bangladesh Bank’s Monthly Economic Trends.',
    'World Bank. World Development Indicators. Licensed under CC BY 4.0.',
    'Software: statsmodels (Seabold and Perktold, 2010), SciPy, NumPy; charts by Apache ECharts.'];
  const ol = document.createElement('div');
  ol.className = 'refs';
  ol.innerHTML = '<h3>Methods</h3><ol>' + R.map(r => '<li>' + esc(r) + '</li>').join('') + '</ol><h3>Data</h3><ol>' + D.map(r => '<li>' + esc(r) + '</li>').join('') + '</ol><p class="note">References are listed from the author’s knowledge of the literature; please check them against the original publications before citing.</p>';
  s.append(ol);
}
function routeBD(h) {
  const m = /^(bangladesh|lab)(?:~([a-z]+))?$/.exec(h);
  if (!m) return false;
  if (m[1] === 'bangladesh' && m[2] && CHUNKS.some(c => c.id === m[2])) bdState.tab = m[2];
  if (m[1] === 'lab' && m[2] && LAB_TABS.some(t => t[0] === m[2])) labState.tab = m[2];
  const was = inited[m[1]];
  go(m[1]);
  if (was) (m[1] === 'bangladesh' ? renderBD : renderLab)();
  if (m[2]) try { history.replaceState(null, '', '#' + h); } catch (err) { /* framed */ }
  return true;
}
return { initBD, initLab, routeBD };
})();
function initBD() { return BDX.initBD(); }
function initLab() { return BDX.initLab(); }
function routeBD(h) { return BDX.routeBD(h); }
