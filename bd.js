/* ================= Bangladesh Monitor + Forecast lab ================= */
const BDX = (() => {
const BD = (() => { try { const n = document.getElementById('bd-data'); return n ? JSON.parse(n.textContent) : null; } catch (e) { return null; } })();
const ALLOW_DL = false; // downloads switched off site-wide
const pad2 = n => String(n).padStart(2, '0');
const bdLab = (f, k) => f === 'M' ? Math.floor(k / 12) + '-' + pad2(k % 12 + 1) : f === 'Q' ? Math.floor(k / 4) + '-Q' + (k % 4 + 1) : f === 'FY' ? 'FY' + k : String(k);
const mLabAdd = (lab, n) => { const k = +lab.slice(0, 4) * 12 + (+lab.slice(5, 7)) - 1 + n; return bdLab('M', k); };
const nf = (v, d = 2) => { if (v == null || !isFinite(v)) return '–'; const dd = d === 0 && Number.isInteger(+v) ? 0 : 2; return Number(v).toLocaleString('en-US', { minimumFractionDigits: dd, maximumFractionDigits: dd }); };
function dpOf(unit, v) {
  if (v == null) return 1;
  const a = Math.abs(v);
  if (/US\$ mn|Tk crore/.test(unit || '')) return a >= 100 ? 0 : 1;
  if (/Tk per/.test(unit || '')) return 2;
  return a >= 1000 ? 0 : a >= 10 ? 1 : 2;
}
const fv = (unit, v) => nf(v, dpOf(unit, v));
const fp = p => p == null ? '–' : p < 0.001 ? '<0.001' : Number(p).toFixed(3);
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
const LAB_TABS = [['overview', 'Projections'], ['data', 'Data and tests'], ['arima', 'ARIMA / SARIMA'], ['var', 'SVAR'], ['robust', 'Robustness and placebo'], ['dsge', 'DSGE'], ['world', 'World analysis'], ['nowcast', 'Nowcasting'], ['fc5', 'Forecast comparison'], ['rc', 'Reality check'], ['models', 'Model library'], ['refs', 'References']];
const STD = {
  infl: { lo: 2, hi: 6, txt: '2–6%', src: 'Reserve Bank of India target band (4% ± 2%), a common emerging-market benchmark' },
  gdp: { lo: 0, txt: 'above 0%', src: 'Below zero the economy is contracting' },
  cover: { lo: 3, txt: 'at least 3 months', src: 'IMF rule of thumb for reserve adequacy' },
  crar: { lo: 12.5, txt: 'at least 12.5%', src: 'Bangladesh Bank’s Basel III rule: 10% minimum plus a 2.5% conservation buffer (the global Basel III floor is 8% plus 2.5%)' },
  npl: { hi: 8, txt: 'at most 8%', src: 'European Banking Authority risk thresholds (above 8% is high risk)' },
  credit: { lo: 0, hi: 20, txt: '0–20%', src: 'Credit-boom threshold of 20% a year (Dell’Ariccia and others, 2012, IMF)' },
  real: { lo: 0, txt: 'above 0%', src: 'Negative real interest rates signal financial repression (McKinnon, 1973)' },
  dep: { hi: 25, txt: 'below 25%', src: 'Currency-crash threshold (Frankel and Rose, 1996)' },
  ca: { lo: -5, txt: 'deficit below 5% of GDP', src: 'Deficits above about 5% of GDP tend to precede adjustment (Freund, 2005)' }
};
const STDK = { infl: 'infl', infl_avg: 'infl', food: 'infl', nonfood: 'infl', gdp_q: 'gdp', gdp_fy: 'gdp', cover: 'cover', crar: 'crar', npl: 'npl', pcredit: 'credit', real_lend: 'real', xr_dep: 'dep', inflation: 'infl', gdp_growth: 'gdp', current_account: 'ca' };
const stdOf = k => STD[STDK[k]] || null;
function stdOut(rule, v) { return !!rule && v != null && isFinite(v) && ((rule.lo != null && v < rule.lo) || (rule.hi != null && v > rule.hi)); }
const bandK = k => { const p = PK(k); return p ? band312(p.v) : null; };
const flagOn = (k, r) => stdOut(stdOf(k), r.v) || (!stdOf(k) && !!(bandK(k) || {}).out);
const flagMsg = (k, r) => stdOf(k) ? stdMsg(stdOf(k), r.v) + ': ' + stdOf(k).src : bandMsg(bandK(k) || { a3: NaN, a12: NaN });
function stdMsg(rule, v) { return (rule.lo != null && v < rule.lo ? 'Below' : 'Above') + ' benchmark (' + rule.txt + ')'; }
const bdState = { tab: 'glance' }, labState = { tab: 'overview', arima: 'infl', shock: 3, fevd: 0, ci: '95', het: 0, desc_ci: '95' };
let FIGN = 0;

const BBS_RE = /^ET\.(CPI|CPI_B|NA_KEY|QGDP|INDPROD)\.|^ET\.SEI_B\.00[1-8]$/;
function agencyOf(s) { if (BBS_RE.test(s.code || '')) return 'BBS'; if (/dots/i.test((s.prov || '') + ' ' + (s.code || ''))) return 'IMF'; return 'Bangladesh Bank'; }
function srcText(list, calc) {
  const ag = [];
  (list || []).forEach(s => { const x = agencyOf(s); if (!ag.includes(x)) ag.push(x); });
  return (ag.length ? ag.join(', ') : 'Bangladesh Bank') + (calc === 'model' ? '; model estimates' : '') + '.';
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
  return { type: 'value', name: name || '', nameTextStyle: { color: TH.muted, fontSize: 11, align: o.right ? 'right' : 'left' }, nameTruncate: { maxWidth: 150, ellipsis: '…' }, scale: !!o.scale, min: o.min, max: o.max,
    splitLine: { show: !o.right, lineStyle: { color: TH.grid } }, axisLabel: { color: TH.muted, fontSize: 11, formatter: o.fmt } };
}
function tsOption(TH, labels, series, o) { return declutter(tsOption0(TH, labels, series, o), labels); }
function declutter(r, labels) {
  if (!r || !Array.isArray(r.series)) return r;
  const lines = r.series.filter(s => s && s.type === 'line' && !s.stack).length;
  const dense = (labels || []).length > 36 || (lines > 1 && (labels || []).length > 18);
  r.series.forEach(s => {
    if (!s || s.type !== 'line') return;
    s.labelLayout = Object.assign({ hideOverlap: true }, s.labelLayout || {});
    if (dense && s.label && s.label.show) s.label = Object.assign({}, s.label, { show: false });
    if (dense && Array.isArray(s.data)) s.data = s.data.map(d => (d && typeof d === 'object' && !Array.isArray(d) && d.label ? Object.assign({}, d, { label: Object.assign({}, d.label, { show: false }) }) : d));
  });
  (Array.isArray(r.graphic) ? r.graphic : r.graphic ? [r.graphic] : []).forEach(x => { if (x && x.style && /macroarianalytics/.test(x.style.text || '')) { delete x.top; x.bottom = 34; x.right = 14; x.style.opacity = 0.3; x.style.fontSize = 10; } });
  return r;
}
function tsOption0(TH, labels, series, o) {
  o = o || {};
  if (FSTATE && labels.length) {
    const t = tsTransform(labels.map(String), series, FSTATE);
    if (t) {
      const mapL = l => (l ? t.keyOf(String(l)) : l);
      labels = t.labels; series = t.series;
      o = Object.assign({}, o, { zoomFrom: o.zoomFrom ? mapL(o.zoomFrom) : o.zoomFrom, _evmap: mapL, marks: o.marks ? o.marks.map(m => m.xAxis ? Object.assign({}, m, { xAxis: mapL(m.xAxis) }) : m) : o.marks });
    }
  }
  const evMap = o._evmap || (l => l);
  const natL = labels.length ? natFreqOf(labels[0]) : null;
  const evs = (natL === 'M' || ((natL === 'Q' || natL === 'A') && o._evmap)) && o.events !== false ? EVENTS.map(e => [e[0], evMap(e[1]), evMap(e[2]), e[3]]).filter(e => labels.includes(e[1])) : [];
  if (evs.length && series[0]) {
    series[0].markArea = { silent: true, itemStyle: { color: TH.dark ? 'rgba(255,255,255,.055)' : 'rgba(14,28,43,.055)' },
      label: { show: FWIDE && window.innerWidth >= 900, color: TH.muted, fontSize: 10, position: 'insideTop', distance: 3 },
      data: evs.map(e => [{ name: e[3], xAxis: e[1] }, { xAxis: labels.includes(e[2]) ? e[2] : labels[labels.length - 1] }]) };
  }
  if (o.marks && series[0]) series[0].markLine = { silent: true, symbol: 'none', label: { color: TH.muted, fontSize: 10, position: 'insideEndTop', formatter: p => p.name || '' }, lineStyle: { color: TH.muted, type: 'dashed', width: 1 }, data: o.marks };
  series.forEach((sr, si) => { if (sr && sr._std) { const rule = sr._std; o.warn = (o.warn || []).concat([{ s: si, test: v => stdOut(rule, v), label: '', rule }]); delete sr._std; } });
  if (o.warn) o.warn.forEach(w => {
    const sr = series[w.s];
    if (!sr || !Array.isArray(sr.data)) return;
    const vv = d => d == null ? null : typeof d === 'object' ? (Array.isArray(d) ? d[1] : d.value) : d;
    let i = sr.data.length - 1;
    while (i >= 0 && vv(sr.data[i]) == null) i--;
    if (i < 0 || !w.test(vv(sr.data[i]))) return;
    series.push(warnPoint(labels[i], vv(sr.data[i]), w.rule ? stdMsg(w.rule, vv(sr.data[i])) : w.label, sr.yAxisIndex || 0));
  });
  const pal = o.pal || TH.pal;
  let anyEnd = false;
  series.forEach((s, k) => {
    if (s._end == null) return;
    const val = d => d == null ? null : typeof d === 'object' ? (Array.isArray(d) ? d[1] : d.value) : d;
    let i = s.data.length - 1;
    while (i >= 0 && val(s.data[i]) == null) i--;
    if (i >= 0) anyEnd = true;
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
  if (o.agg) s._agg = o.agg;
  if (o.std) s._std = stdOf(o.std);
  return s;
}
function blinkOn() { const c = document.documentElement.classList; return !RM && !c.contains('no-blink') && !c.contains('safe'); }
function warnPoint(x, y, label, ax) {
  return { name: 'Warning', type: blinkOn() && !(window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'effectScatter' : 'scatter', data: [[x, y]], yAxisIndex: ax, symbolSize: 10, z: 6, silent: true, tooltip: { show: false },
    rippleEffect: { brushType: 'stroke', scale: 3.4, period: 2.2 }, itemStyle: { color: BADC }, label: { show: false } };
}
function signBars(vals, TH) { return vals.map(v => v == null ? null : { value: v, itemStyle: { color: v >= 0 ? TH.pos : TH.neg } }); }
function bandSeries(name, lo, hi, color, op, stack) {
  return [{ name: name + ' lower', type: 'line', data: lo, stack, lineStyle: { opacity: 0 }, showSymbol: false, silent: true, tooltip: { show: false }, legendHoverLink: false, z: 1 },
    { name, type: 'line', data: hi.map((h, i) => h == null || lo[i] == null ? null : h - lo[i]), stack, lineStyle: { opacity: 0 }, showSymbol: false, itemStyle: { color, opacity: Math.min(1, op * 2.5) }, areaStyle: { color, opacity: op }, silent: true, tooltip: { show: false }, z: 1 }];
}
const FL = { D: 'Day', M: 'Month', Q: 'Quarter', Y: 'Year' };
let FSTATE = null, FWIDE = false;
const FIGREG = [];
const BDG = { freq: 'M', span: 'all' };
function natFreqOf(l) { l = String(l); return /^\d{4}-\d{2}-\d{2}$/.test(l) ? 'D' : /^\d{4}-\d{2}$/.test(l) ? 'M' : /^\d{4}-Q\d$/.test(l) ? 'Q' : /^FY\d{4}$/.test(l) ? 'FY' : /^\d{4}$/.test(l) ? 'A' : null; }
function availF(nat) { return nat === 'D' ? ['D', 'M', 'Q', 'Y'] : nat === 'M' ? ['M', 'Q', 'Y'] : nat === 'Q' ? ['Q', 'Y'] : ['Y']; }
function natDefault(nat) { return nat === 'FY' || nat === 'A' ? 'Y' : nat; }
function tsTransform(labels, series, st) {
  const nat = natFreqOf(labels[0]);
  if (!nat) return null;
  const tgt = st.freq;
  if ((tgt === natDefault(nat)) && st.span === 'all') return null;
  const qOf = l => l.slice(0, 4) + '-Q' + (Math.floor((+l.slice(5, 7) - 1) / 3) + 1);
  const keyOf = l => {
    if (nat === 'D') return tgt === 'M' ? l.slice(0, 7) : tgt === 'Q' ? qOf(l) : tgt === 'Y' ? l.slice(0, 4) : l;
    if (nat === 'M') return tgt === 'Q' ? qOf(l) : tgt === 'Y' ? l.slice(0, 4) : l;
    if (nat === 'Q') return tgt === 'Y' ? l.slice(0, 4) : l;
    return l;
  };
  const yearOf = l => +(String(l).match(/\d{4}/) || [0])[0];
  const groups = [], idx = new Map();
  labels.forEach((l, i) => { const k = keyOf(l); if (!idx.has(k)) { idx.set(k, groups.length); groups.push({ k, is: [] }); } groups[idx.get(k)].is.push(i); });
  let keep = groups;
  if (st.span !== 'all' && groups.length) { const ly = yearOf(groups[groups.length - 1].k), n = +st.span; keep = groups.filter(g => yearOf(g.k) > ly - n); if (keep.length < 3) keep = groups; }
  const vOf = d => d == null ? null : typeof d === 'object' ? (Array.isArray(d) ? d[1] : d.value) : d;
  const out = series.map(se => {
    if (!Array.isArray(se.data) || se.data.length !== labels.length) return se;
    const agg = se._agg || 'avg';
    const data = keep.map(g => {
      const items = g.is.map(i => se.data[i]);
      const vs = items.map(vOf).filter(v => v != null && isFinite(v));
      if (!vs.length) return null;
      const v = agg === 'last' ? vs[vs.length - 1] : vs.reduce((x, y) => x + y, 0) / vs.length;
      const objs = items.filter(x => x != null && typeof x === 'object' && !Array.isArray(x) && x.itemStyle);
      if (objs.length) { const ref = objs.find(x => Math.sign(vOf(x)) === Math.sign(v)) || objs[0]; return { value: v, itemStyle: ref.itemStyle }; }
      return v;
    });
    return Object.assign({}, se, { data });
  });
  return { labels: keep.map(g => g.k), series: out, keyOf };
}
function ctlHTML(nat, st) {
  const fs = nat === 'D' ? ['D', 'M', 'Q', 'Y'] : ['M', 'Q', 'Y'], av = availF(nat);
  return '<div class="seg2" data-k="freq" role="group" aria-label="Frequency">' + fs.map(f => '<button type="button" data-v="' + f + '"' + (av.includes(f) ? '' : ' disabled title="Not available for this series"') + ' aria-pressed="' + (st.freq === f) + '">' + FL[f] + '</button>').join('') + '</div>' +
    '<div class="seg2" data-k="span" role="group" aria-label="Time span">' + [['5', '5y'], ['10', '10y'], ['15', '15y'], ['20', '20y'], ['25', '25y'], ['all', 'All']].concat(['5', '10', '15', '20', '25', 'all'].includes(st.span) ? [] : [[st.span, st.span + 'y']]).map(([v, t]) => '<button type="button" data-v="' + v + '" title="' + (v === 'all' ? 'All years' : v + ' years') + '" aria-pressed="' + (st.span === v) + '">' + t + '</button>').join('') + '</div>' +
    '<div class="span-x"><label class="span-c"><span class="sr-only">Custom number of years</span><input type="number" min="1" max="80" step="1" inputmode="numeric" placeholder="yrs" title="Custom number of years" data-x="custom"></label><button type="button" class="btn sm" data-x="auto" aria-pressed="false" title="Cycle through the time spans automatically">▶ Auto</button><label class="span-c"><span class="sr-only">Seconds between changes</span><input type="number" min="2" max="120" step="1" value="6" title="Seconds between automatic changes" data-x="secs"></label><button type="button" class="btn sm" data-x="blink" aria-pressed="' + !document.documentElement.classList.contains('no-blink') + '" title="Blinking warnings on or off">Blink</button></div>';
}
function syncCtl(box, st) { box.querySelectorAll('.seg2 button').forEach(b => b.setAttribute('aria-pressed', String(st[b.parentElement.getAttribute('data-k')] === b.getAttribute('data-v')))); }
function rerender(node) { const rc = charts.get(node); if (rc) { rc.dirty = true; rc.reset = true; applyChart(node, rc); } }
function applyGlobal() {
  FIGREG.filter(x => document.body.contains(x.node)).forEach(x => { const av = availF(x.nat); x.st.freq = av.includes(BDG.freq) ? BDG.freq : natDefault(x.nat); x.st.span = BDG.span; syncCtl(x.ctl, x.st); rerender(x.node); });
}
function figure(host, o) {
  if (o.num !== false) FIGN++;
  const f = document.createElement('figure');
  f.className = 'fig' + (o.wide ? ' wide' : '');
  f.innerHTML = '<figcaption>' + (o.num === false ? (o.badge ? '<span class="fig-n">' + esc(o.badge) + '</span>' : '') : '<span class="fig-n">Figure ' + (o.prefix || 'B') + FIGN + '</span>') + '<b>' + esc(o.title) + '</b>' + (o.sub ? '<span class="fig-sub">' + esc(o.sub) + '</span>' : '') + '</figcaption>' +
    '<div class="chart" style="height:' + (o.h || 300) + 'px" role="img" aria-label="' + esc(o.title + (o.sub ? '. ' + o.sub : '')) + '"></div>' +
    '<div class="fig-foot">' + (o.notes ? '<p><i>Notes:</i> ' + esc(o.notes) + '</p>' : '') + (o.source ? '<p><i>Source:</i> ' + esc(o.source) + '</p>' : '') + '<div class="fig-act"></div></div>';
  host.append(f);
  if (host.classList && host.classList.contains('figs')) fillReg(host, o, f);
  const node = f.querySelector('.chart');
  let nat = o.ts;
  if (nat === undefined) {
    try { const op = o.render(theme()); const xa = op && (Array.isArray(op.xAxis) ? op.xAxis[0] : op.xAxis); nat = xa && xa.type === 'category' && Array.isArray(xa.data) && xa.data.length ? natFreqOf(xa.data[0]) : null; } catch (e) { nat = null; }
  }
  if (nat) {
    const st = o.state || { freq: availF(nat).includes(BDG.freq) ? BDG.freq : natDefault(nat), span: BDG.span };
    if (!availF(nat).includes(st.freq)) st.freq = natDefault(nat);
    const ctl = document.createElement('div');
    ctl.className = 'fctl';
    ctl.innerHTML = ctlHTML(nat, st);
    f.querySelector('figcaption').after(ctl);
    ctl.addEventListener('click', e => { const b = e.target.closest('.seg2 button'); if (!b || b.disabled) return; st[b.parentElement.getAttribute('data-k')] = b.getAttribute('data-v'); syncCtl(ctl, st); rerender(node); });
    FIGREG.push({ node, st, nat, ctl });
    chartOn(node, TH => { FSTATE = st; FWIDE = !!o.wide; try { return o.render(TH); } finally { FSTATE = null; FWIDE = false; } });
  } else chartOn(node, TH => { FWIDE = !!o.wide; try { return o.render(TH); } finally { FWIDE = false; } });
  const act = f.querySelector('.fig-act');
  {
    act.append(smallBtn('Image', () => {
      const r = charts.get(node);
      if (!r || !r.inst) return;
      const a = document.createElement('a');
      a.href = r.inst.getDataURL({ type: 'svg' });
      a.download = slug(o.title) + '.svg';
      document.body.append(a); a.click(); a.remove();
    }));
    if (o.csv) act.append(smallBtn('Data (CSV)', () => blobSave(slug(o.title) + '.csv', toCsv(o.csv()), 'text/csv;charset=utf-8')));
    act.querySelectorAll('button').forEach(b => b.classList.add('dl-btn'));
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
let TSRC = 'Bangladesh Bank.';
function tableWrap(host, html, cap, note, opt) {
  const d = document.createElement('div');
  d.className = 'mx-wrap';
  const hasSrc = /Source:/.test(note || '');
  d.innerHTML = (cap ? '<div class="mx-cap">' + cap + '</div>' : '') + '<div class="table-wrap"><table class="mx">' + html + '</table></div>' + (note ? '<p class="mx-note">' + note + '</p>' : '') +
    (hasSrc ? '' : '<p class="src-line"><b>Source:</b> ' + esc((opt && opt.src) || TSRC) + '</p>');
  host.append(d);
  pillify(d.querySelector('table'), opt || {});
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
  const H = (t, full, num) => '<th scope="col"' + (num ? ' class="num"' : '') + ' title="' + full + '">' + t + '</th>';
  let html = '<thead><tr>' + H('Indicator', 'Indicator and unit') + H('Period', 'Latest period') + H('Latest', 'Latest value', 1) + H('Prev.', 'Previous period', 1) + H('Chg', 'Change on the previous period', 1) +
    H('Yr ago', 'Same period a year earlier', 1) + H('Chg y/y', 'Change on a year earlier', 1) + H('Avg 12', 'Average of the last 12 periods', 1) + H('Range', 'Latest value within its full history, minimum to maximum') + H('Trend', 'Recent trend') + H('Source', 'Series code; hover for the full source') + '</tr></thead><tbody>';
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
      '<td>' + esc(r.period) + '</td><td class="num big' + (flagOn(k, r) ? ' warn-std' : '') + '"' + (flagOn(k, r) ? ' title="' + esc(flagMsg(k, r)) + '"' : '') + (pct == null ? '' : ' data-pct="' + pct + '"') + '>' + fv(s.unit, r.v) + '</td><td class="num">' + fv(s.unit, r.prev) + '</td>' + chg(s.unit, r.v, r.prev, dir) +
      '<td class="num">' + fv(s.unit, r.ya) + '</td>' + chg(s.unit, r.v, r.ya, dir) + '<td class="num">' + fv(s.unit, r.avg) + '</td>' +
      '<td class="rngc">' + (pct == null ? '' : '<span class="rng" title="Percentile ' + nf(pct, 0) + ' of ' + r.n + ' observations"><i style="left:' + pct + '%"></i></span><span class="rng-l"><small>' + fv(s.unit, r.min) + '</small><small>' + fv(s.unit, r.max) + '</small></span>') + '</td>' +
      '<td class="spkc">' + spark(k) + '</td><td class="srcc"><span class="src-ag" title="' + esc('Series ' + s.src.map(x => x.code).join(', ')) + '">' + esc(srcKeys([k]).replace(/\.$/, '')) + '</span></td></tr>';
  });
  html += '</tbody>';
  return tableWrap(host, html, caption, 'Blinking values are outside their international benchmark range (listed under Benchmarks on the At a glance page). ▲▼ show the direction of change; green means a favourable move and red an unfavourable one. “Range” marks the latest value within its full history, from minimum to maximum; hover a heading for its full name and a source for its series code.');
}
function modelMatrix(host, keys, caption) {
  const rows = keys.map(k => BD.arima[k]).filter(Boolean);
  if (!rows.length) return;
  const H = (t, full, num) => '<th scope="col"' + (num ? ' class="num"' : '') + ' title="' + full + '">' + t + '</th>';
  let html = '<thead><tr>' + H('Variable', 'Variable and unit') + H('Model', 'Model chosen by the Akaike information criterion') + H('Latest', 'Latest value', 1) + H('+1m', 'Forecast 1 month ahead (80% interval)', 1) + H('+6m', 'Forecast 6 months ahead (80% interval)', 1) + H('+12m', 'Forecast 12 months ahead (80% interval)', 1) +
    H('Skill 1m', 'Skill against a naive forecast, 1 month ahead', 1) + H('Skill 12m', 'Skill against a naive forecast, 12 months ahead', 1) + H('DM p', 'Diebold–Mariano p-value, 1 month ahead', 1) + H('LB p', 'Ljung–Box p-value, 12 lags', 1) + H('Reading', 'Plain-language reading') + '</tr></thead><tbody>';
  rows.forEach(a => {
    const u = a.unit, last = a.hist.v[a.hist.v.length - 1];
    const b80 = a.bands['80'];
    const cell = i => '<td class="num"><b>' + fv(u, a.fc[i]) + '</b><small class="pi">' + fv(u, b80[0][i]) + ' to ' + fv(u, b80[1][i]) + '</small></td>';
    const bt = h => (a.backtest.find(r => r.h === h) || {});
    const sk = h => { const v = bt(h).skill; return v == null ? '–' : (v > 0 ? '+' : '') + nf(v * 100, 0) + '%'; };
    const skc = h => { const v = bt(h).skill; return v == null ? '' : v > 0.02 ? ' up-good' : v < -0.02 ? ' up-bad' : ''; };
    const lb = (a.ljungbox.find(l => l.lag === 12) || {}).p;
    const d12 = a.fc[11] - last;
    const rel = Math.abs(d12) / (Math.abs(last) || 1);
    let read = rel < 0.02 ? 'Broadly stable' : d12 > 0 ? 'Rising' : 'Easing';
    const s12 = bt(12).skill, s1 = bt(1).skill;
    read += s1 != null && s1 > 0.05 ? '; beats the naive forecast at 1 month' : '; no better than a naive forecast at 1 month';
    if (s12 != null && s12 <= 0) read += ', or at 12 months, so treat the path as indicative';
    if (lb != null && lb < 0.05) read += '. Residual autocorrelation remains: interpret with caution';
    html += '<tr><th scope="row"><span class="mx-l">' + esc(a.label) + '</span><span class="mx-u">' + esc(u) + '</span></th><td>' + esc(a.spec) + '</td><td class="num">' + fv(u, last) + '</td>' + cell(0) + cell(5) + cell(11) +
      '<td class="num' + skc(1) + '">' + sk(1) + '</td><td class="num' + skc(12) + '">' + sk(12) + '</td><td class="num">' + fp(bt(1).dm_p) + '</td><td class="num' + (lb != null && lb < 0.05 ? ' up-bad' : '') + '">' + fp(lb) + '</td><td class="rd">' + (/caution|no better/.test(read) ? '<span class="warn-ico" aria-hidden="true">⚠ </span>' : '') + esc(read) + '.</td></tr>';
  });
  html += '</tbody>';
  tableWrap(host, html, caption, 'Point forecasts with 80% prediction intervals underneath. Skill = 1 − RMSE(model) / RMSE(naive “no change” forecast) in a rolling-origin backtest over the last 24 months, so positive is better than naive. DM = Diebold–Mariano test of equal accuracy (Harvey–Leybourne–Newbold correction). Ljung–Box tests remaining autocorrelation in the residuals. Details in the Forecast lab.', { src: srcKeys(rows.map(a => a.key), 'model') });
}

/* ---------- Bangladesh view ---------- */
function initBD() {
  const v = $('#v-bangladesh');
  if (!BD) { v.querySelector('.wrap').innerHTML = '<p class="empty">The Bangladesh data could not be loaded.</p>'; return; }
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
  TSRC = 'Bangladesh Bank, BBS.';
  $$('#bd-tabs [data-bdtab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-bdtab') === bdState.tab ? 'true' : 'false'));
  const c = CHUNKS.find(x => x.id === bdState.tab) || CHUNKS[0];
  if (c.id === 'glance') return bdGlance(body);
  if (c.id === 'catalog') return bdCatalog(body);
  const gc = document.createElement('div');
  gc.className = 'gctl';
  gc.innerHTML = '<span>All charts on this page</span>' + ctlHTML('M', BDG);
  gc.addEventListener('click', e => { const b = e.target.closest('.seg2 button'); if (!b || b.disabled) return; BDG[b.parentElement.getAttribute('data-k')] = b.getAttribute('data-v'); syncCtl(gc, BDG); applyGlobal(); });
  body.append(gc);
  TSRC = srcKeys(c.keys);
  const s = sec(body, c.name, c.lede);
  matrix(s, c.keys, tcap('Key indicators: ' + c.name.toLowerCase()));
  ({ prices: bdPrices, real: bdReal, money: bdMoney, rates: bdRates, ext: bdExt, fiscal: bdFiscal, cap: bdCap })[c.id](body);
  sectorOutlook(body, c);
}
function ownerStatusNote(body) {
  if (!document.documentElement.classList.contains('owner')) return;
  const P = PK('infl'); let last = ''; if (P) for (let j = P.v.length - 1; j >= 0; j--) if (P.v[j] != null) { last = bdLab('M', P.k0 + j); break; }
  body.insertAdjacentHTML('afterbegin', '<div class="owner-note"><b>Owner notice:</b> the newest Bangladesh data are for ' + esc(last) + ' (Bangladesh Bank, Monthly Economic Trends). Figures for later months are not yet published. <a href="/owner/#status">Data status and download links →</a></div>');
}
function bdGlance(body) {
  ownerStatusNote(body);
  const s1 = sec(body, 'Charts', 'The inflation outlook beside a map of Bangladesh.');
  const top = document.createElement('div');
  top.className = 'live-top';
  s1.append(top);
  const gl = document.createElement('div');
  top.append(gl);
  inflExplorer(gl, s1);
  const mb = document.createElement('div');
  mb.className = 'mapbox';
  top.append(mb);
  bdMapBox(mb);
  const s2 = sec(body, 'Summary', 'The latest reading of every headline indicator, grouped as in Bangladesh Bank’s Weekly Selected Economic Indicators. Select a group to open its full page.');
  matrix(s2, GLANCE, tcap('Headline indicators by sector'), true);
  const s3 = sec(body, 'Country summary', 'Geography and people of Bangladesh.');
  profileTable(s3, 'BGD', null);
  const s4 = sec(body, 'Analysis', 'Model readings for the headline indicators.');
  modelMatrix(s4, ['infl', 'xr', 'res', 'remit', 'exp', 'm2', 'pcredit', 'call'], tcap('Model readings for headline indicators'));
  body.append(resultsSection(true));
  const s6 = sec(body, 'Benchmarks', 'The international ranges behind the blinking warnings.');
  benchTable(s6);
}
function infFan(host, compact) { infFan0(host, compact); if (!compact) longInfl(host); }
function infFan0(host, compact) {
  const a = BD.arima.infl, e = BD.ensemble.path;
  const histN = compact ? 36 : Infinity;
  const hl = [], hv = [];
  const h0 = a.hist.s, FP = !compact && PK('infl'), kS = (+BD.ensemble.start.slice(0, 4)) * 12 + (+BD.ensemble.start.slice(5, 7)) - 1;
  if (FP && FP.k0 < kS) { for (let k = FP.k0; k < kS; k++) { hl.push(bdLab('M', k)); hv.push(FP.v[k - FP.k0] == null ? null : FP.v[k - FP.k0]); } }
  else a.hist.v.forEach((v, i) => { hl.push(mLabAdd(h0, i)); hv.push(v); });
  const hL = histN === Infinity ? hl : hl.slice(-histN), hV = histN === Infinity ? hv : hv.slice(-histN);
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
    source: srcKeys(['infl'], 'model'),
    csv: () => [['month', 'actual', 'projection', 'lower 80', 'upper 80', 'lower 95', 'upper 95'], ...labels.map((l, i) => [l, i < hV.length ? hV[i] : '', mean[i] == null ? '' : mean[i], lo80[i] == null ? '' : lo80[i], hi80[i] == null ? '' : hi80[i], lo95[i] == null ? '' : lo95[i], hi95[i] == null ? '' : hi95[i]])],
    render: TH => tsOption(TH, labels, [S('Actual', [...hV, ...Array(fl.length).fill(null)], { color: TH.ink, w: 2.2, std: 'infl' }),
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
    render: TH => tsOption(TH, a.labels, [S('Point-to-point', a.cols[0], { color: TH.pal[0], end: true, std: 'infl' }), S('12-month average', a.cols[1], { color: TH.pal[1], dash: true, end: true })],
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
    render: TH => tsOption(TH, a.labels, [S('Broad money (M2)', a.cols[0], { end: true }), S('Reserve money', a.cols[1], { dash: true }), S('Private sector credit', a.cols[2], { end: true, color: TH.pal[6], std: 'pcredit' })], { y1: '% y/y', zoom: true, zoomFrom: '2016-01' }) });
  const b = align(['cdr'], M0(2010));
  figure(g, { title: 'Credit–deposit ratio of banks', sub: '%', notes: 'Above 100% banks are lending more than they hold in deposits and must rely on other funding.', source: srcKeys(['cdr']), csv: () => csvAligned(['cdr'], M0(2010)),
    render: TH => tsOption(TH, b.labels, [S('Credit–deposit ratio', b.cols[0], { area: 0.08, end: true })], { y1: '%', scale: true, marks: [{ yAxis: 100, name: '100%' }] }) });
  const c = align(['npl', 'crar']);
  figure(g, { title: 'Bank soundness: bad loans and capital', sub: 'deposit takers, % (quarterly)', notes: 'Bars: non-performing loans as a share of gross loans. Line: regulatory capital to risk-weighted assets; the dashed line marks 12.5% (Bangladesh Bank’s 10% minimum plus the 2.5% conservation buffer under Basel III).', source: srcKeys(['npl', 'crar']),
    csv: () => csvAligned(['npl', 'crar']), render: TH => tsOption(TH, c.labels, [Object.assign(S('Non-performing loans', c.cols[0], { bar: true, color: TH.neg, std: 'npl' }), {}), Object.assign(S('Capital ratio (right)', c.cols[1], { ax: 1, color: TH.pos, w: 2.4, end: true, std: 'crar' }), { markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dashed', color: TH.pos }, label: { formatter: '12.5%', color: TH.muted, fontSize: 10 }, data: [{ yAxis: 12.5 }] } })], { y1: '% of loans', y2: '% of RWA', bar: true }) });
}
function bdRates(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['call', 'lend', 'dep', 'bankrate'], M0(2010));
  figure(g, { title: 'Interest rates', sub: '% a year; call money and scheduled banks’ weighted averages', source: srcKeys(['call', 'lend', 'dep', 'bankrate']), csv: () => csvAligned(['call', 'lend', 'dep', 'bankrate'], M0(2010)),
    render: TH => tsOption(TH, a.labels, [S('Call money', a.cols[0], { end: true }), S('Lending rate', a.cols[1], { end: true }), S('Deposit rate', a.cols[2], { end: true }), S('Bank rate', a.cols[3], { dash: true, step: 'end' })], { y1: '%', zoom: true }) });
  const r = align(['real_lend', 'spread'], M0(2010));
  figure(g, { title: 'Real lending rate and the spread', sub: 'percentage points', notes: SER('real_lend').note + ' Negative real rates mean borrowers repay less in real terms than they borrowed.', source: srcKeys(['real_lend', 'spread'], true),
    csv: () => csvAligned(['real_lend', 'spread'], M0(2010)), render: TH => tsOption(TH, r.labels, [S('Real lending rate', signBars(r.cols[0], TH), { bar: true, std: 'real' }), S('Lending–deposit spread', r.cols[1], { color: TH.ink2, end: true })], { y1: 'pp', bar: true, zoom: true }) });
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
    render: TH => tsOption(TH, b.labels, [S('Gross reserves', b.cols[0], { area: 0.1, end: true, dec: 0, agg: 'last' }), S('BPM6 reserves', b.cols[1], { end: true, dec: 0, agg: 'last' }), Object.assign(S('Import cover (right)', b.cols[2], { ax: 1, dash: true, color: TH.pal[6], std: 'cover' }), { markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dotted', color: TH.pal[6] }, label: { formatter: '3 months', color: TH.muted, fontSize: 10 }, data: [{ yAxis: 3 }] } })], { y1: 'US$ mn', y2: 'months', zoom: true, dec: 1 }) });
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
  tableWrap(body, html, tcap('South Asian peers: reserves and exchange rates'), 'Latest quarter available for each economy. Exchange rates are in each country’s own currency per US dollar.');
}
function bdFiscal(body) {
  const s = sec(body, 'Charts');
  const g = grid(s);
  const a = align(['govcredit'], M0(2012));
  figure(g, { title: 'Net bank credit to the government', sub: '% year on year', notes: 'Rapid growth means the budget is being financed more heavily by the banking system, which can crowd out private credit.', source: srcKeys(['govcredit'], true),
    csv: () => csvAligned(['govcredit'], M0(2012)), render: TH => tsOption(TH, a.labels, [S('Net bank credit to government', a.cols[0], { area: 0.1, end: true, color: TH.pal[5] })], { y1: '% y/y', zoom: true }) });
  const n = align(['nsav_net', 'nsav_out']);
  figure(g, { title: 'National savings certificates', sub: 'Tk crore: net sales a month (bars) and outstanding stock (line)', notes: 'Net sales below zero mean redemptions exceed new sales, so the government must borrow elsewhere.', source: srcKeys(['nsav_net', 'nsav_out']),
    csv: () => csvAligned(['nsav_net', 'nsav_out']), render: TH => tsOption(TH, n.labels, [S('Net sales', signBars(n.cols[0], TH), { bar: true }), S('Outstanding (right)', n.cols[1], { ax: 1, color: TH.ink, end: true, dec: 0, agg: 'last' })], { y1: 'Tk crore', y2: 'Tk crore', bar: true, scale2: true, dec: 0 }) });
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
    render: TH => tsOption(TH, a.labels, [S('Market capitalisation', a.cols[0], { color: TH.ink, w: 2.2, end: true, dec: 0, agg: 'last' }), S('Growth (right)', signBars(a.cols[1], TH), { bar: true, ax: 1 })], { y1: 'Tk crore', y2: '% y/y', zoom: true, dec: 1 }) });
  const sc = BD.mcap_sectors.slice().sort((x, y) => y.v - x.v);
  const tot = sc.reduce((x, y) => x + y.v, 0);
  figure(g, { title: 'Market capitalisation by sector', sub: 'share of total, ' + (sc[0] || {}).period, h: 340, notes: 'Box size is proportional to market value.', source: 'Bangladesh Bank.',
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
    figure(g, { prefix: 'C', title: r[3].split('|').slice(-2).join(' | '), sub: fl + (r[4] ? ', ' + r[4] : ''), source: agencyOf({ code: r[0], prov: r[6] }) + '.',
      csv: () => [['period', r[0]], ...labels.map((l, i) => [l, vals[i]])], render: TH => tsOption(TH, labels, [S(r[0], vals, { end: true, area: 0.08 })], { y1: r[4] || '', zoom: labels.length > 60, scale: true, events: f === 'M' }) });
  });
  host.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
}

/* ---------- Forecast lab ---------- */
function initLab() {
  const v = $('#v-lab');
  if (!BD) { v.querySelector('.wrap').innerHTML = '<p class="empty">The model results could not be loaded.</p>'; return; }
  $('#lab-tabs').innerHTML = LAB_TABS.map(t => '<button type="button" role="tab" data-lab="' + t[0] + '">' + esc(t[1]) + '</button>').join('');
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
  TSRC = labState.tab === 'world' ? 'World Bank; model estimates.' : labState.tab === 'dsge' ? 'Model simulation.' : 'Bangladesh Bank, BBS; model estimates.';
  $$('#lab-tabs [data-lab]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-lab') === labState.tab ? 'true' : 'false'));
  ({ overview: b => { labOverview(b); fc5Five(b, 'overview'); }, data: labData, arima: b => { labArima(b); fc5Five(b, 'arima'); }, var: b => { labVar(b); fc5Five(b, 'var'); }, robust: labRobust, dsge: b => { labDsge(b); dsgeChecks(b); fc5Five(b, 'dsge'); }, world: b => { worldExplorer(b); labWorld(b); }, refs: b => { modelDocs(b); labRefs(b); }, models: labModels, fc5: labFc5, nowcast: labNowcast, rc: labRc })[labState.tab in { overview: 1, data: 1, arima: 1, var: 1, robust: 1, dsge: 1, world: 1, refs: 1, models: 1, fc5: 1, nowcast: 1, rc: 1 } ? labState.tab : 'overview'](body);
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
    source: srcKeys([a.key], 'model'),
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
    notes: 'F-tests that all lags of one variable are jointly zero in another’s equation (Granger, 1969). Darker cells are stronger evidence; *** p<0.01, ** p<0.05, * p<0.1.', source: srcKeys(V.keys, 'model'),
    csv: () => [['cause', 'effect', 'F', 'p'], ...V.granger.map(x => [V.vars[x.cause], V.vars[x.effect], x.f, x.p])],
    render: TH => { const M = V.vars.map((_, i) => V.vars.map((_, j) => { if (i === j) return null; const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? -Math.log10(Math.max(r.p, 1e-6)) : null; }));
      return heat(TH, V.vars, M, (i, j) => { const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? fp(r.p) + stars(r.p) : ''; },
        { min: 0, max: 4, xname: 'Cause', yname: 'Effect', colors: T => [T.paper, T.dark ? '#2B5C93' : '#9DC0E6', T.pos], tip: (i, j) => { const r = V.granger.find(x => x.cause === j && x.effect === i); return r ? V.vars[j] + ' → ' + V.vars[i] + ': F = ' + nf(r.f, 2) + ', p = ' + fp(r.p) : ''; } }); } });
  const f12 = V.fevd[labState.fevd];
  const hs = Array.from({ length: 25 }, (_, i) => i);
  figure(g, { prefix: 'L', title: 'Forecast-error variance decomposition: ' + V.vars[labState.fevd], sub: '% of forecast-error variance explained by each shock, horizons 0–24 months', h: 330,
    notes: 'Recursive (Cholesky) identification in the order shown in the legend.', source: srcKeys(V.keys, 'model'),
    csv: () => [['horizon', ...V.vars], ...hs.map(h => [h, ...f12.map(c => c[h])])],
    render: TH => tsOption(TH, hs.map(String), V.vars.map((n, i) => S(n, f12[i], { stack: 'f', area: 0.85, w: 0.5 })), { y1: '%', min: 0, events: false, dec: 1 }) });
  ctrl(s, sel('fevd', V.vars.map((n, i) => [i, n]), labState.fevd, 'Variance decomposition for') + sel('shock', V.vars.map((n, i) => [i, n]), labState.shock, 'Impulse responses to a shock in'));
  const ir = sec(body, 'Impulse responses', 'Responses of each variable to a one-standard-deviation orthogonalised shock, with 90% Monte Carlo bands (500 replications).');
  const g2 = grid(ir);
  V.vars.forEach((resp, r) => {
    const sh = labState.shock;
    const m = V.irf.mean[r][sh], lo = V.irf.lo[r][sh], hi = V.irf.hi[r][sh];
    figure(g2, { prefix: 'L', title: 'Response of ' + resp.toLowerCase(), sub: 'to a ' + V.vars[sh].toLowerCase() + ' shock; percentage points, months after the shock', h: 250,
      source: srcKeys(V.keys, 'model'), csv: () => [['month', 'response', 'lower 90', 'upper 90'], ...m.map((v, i) => [i, v, lo[i], hi[i]])],
      render: TH => tsOption(TH, hs.map(String), [...bandSeries('90% band', lo, hi, TH.pos, TH.dark ? 0.26 : 0.18, 'b'), Object.assign(S('Response', m, { color: TH.pos, w: 2.2 }), { markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: TH.ink2, width: 1 }, data: [{ yAxis: 0 }] } })], { y1: 'pp', events: false, dec: 3 }) });
  });
  let ft = '<thead><tr><th scope="col">Variable</th><th scope="col">Horizon</th>' + V.vars.map(n => '<th scope="col" class="num">' + esc(n) + ' shock</th>').join('') + '</tr></thead><tbody>';
  V.vars.forEach((n, v) => [1, 6, 12, 24].forEach((h, k) => { ft += '<tr' + (k === 0 ? ' class="gtop"' : '') + '>' + (k === 0 ? '<th scope="rowgroup" rowspan="4">' + esc(n) + '</th>' : '') + '<td>' + h + ' month' + (h > 1 ? 's' : '') + '</td>' + V.fevd[v].map(c => '<td class="num">' + nf(c[h], 1) + '</td>').join('') + '</tr>'; }));
  tableWrap(ir, ft + '</tbody>', tcap('Variance decomposition table (%)'), 'Each row sums to 100%.', { heat: 'col' });
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
  figure(g, { prefix: 'L', title: 'Rolling inflation persistence', sub: 'AR(1) coefficient over 60-month windows with 95% band', notes: 'Values near 1 mean shocks to inflation fade very slowly.', source: srcKeys(['infl'], 'model'),
    csv: () => [['window end', 'AR(1)', 'lower 95', 'upper 95'], ...rl_.map(r => [r[0], r[1], r[2], r[3]])],
    render: TH => tsOption(TH, rl_.map(r => r[0]), [...bandSeries('95% band', rl_.map(r => r[2]), rl_.map(r => r[3]), TH.pos, 0.18, 'b'), S('AR(1) coefficient', rl_.map(r => r[1]), { color: TH.pos, w: 2.2, end: true, dec: 2 })], { y1: 'coefficient', scale: true, marks: [{ yAxis: 1, name: 'unit root' }], dec: 3 }) });
  figure(g, { prefix: 'L', title: 'Rolling correlation: inflation and Taka depreciation', sub: '36-month windows', notes: 'A rising correlation is consistent with stronger exchange-rate pass-through.', source: srcKeys(['infl', 'xr_dep'], 'model'),
    csv: () => [['window end', 'correlation'], ...rl_.map(r => [r[0], r[4]])],
    render: TH => tsOption(TH, rl_.map(r => r[0]), [S('Correlation', signBars(rl_.map(r => r[4]), TH), { bar: true })], { y1: 'r', bar: true, min: -1, dec: 2 }) });
  const p = sec(body, 'Placebo tests', 'If the exchange-rate finding were spurious, it should also appear when the timing of the exchange rate is scrambled, or when the “driver” is pure noise.');
  const g2 = grid(p);
  const e = P.hist.edges, c = P.hist.counts;
  const mids = c.map((_, i) => (e[i] + e[i + 1]) / 2);
  figure(g2, { prefix: 'L', title: 'Placebo distribution of the Granger F-statistic', sub: P.n_shift + ' circular shifts of the Taka depreciation series', h: 300,
    notes: 'Shifting the series in time keeps its own dynamics but breaks its timing relative to inflation. Placebo p-value = share of placebo F-statistics at least as large as the actual one: ' + fp(P.p_placebo) + '.', source: srcKeys(['infl', 'xr_dep'], 'model'),
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
    figure(g, { prefix: 'L', title: name + (r.rho === 'combined' ? ' (combined scenario)' : ' shock'), sub: 'responses over 16 quarters; output gap in %, inflation and policy rate in annualised pp', h: 260,
      notes: (r.note ? r.note + ' ' : '') + (r.rho === 'combined' ? '' : 'Shock persistence ρ = ' + r.rho + '.'), source: 'Model simulation.',
      csv: () => [['quarter', 'output gap', 'inflation', 'policy rate'], ...hs.map((h, i) => [h, r.x[i], r.pi[i], r.i[i]])],
      render: TH => tsOption(TH, hs, [S('Output gap', r.x, { w: 2.2 }), S('Inflation', r.pi, { w: 2.2 }), S('Policy rate', r.i, { dash: true, w: 2 })].map((x, i) => i === 0 ? Object.assign(x, { markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: TH.ink2, width: 1 }, data: [{ yAxis: 0 }] } }) : x), { y1: '%/pp', events: false, dec: 3 }) });
  });
  dsgeExtras(body, D);
}
function labWorld(body) {
  const W = BD.world;
  const s = sec(body, 'Heterogeneity across regions', 'Do inflation dynamics and growth volatility differ systematically between world regions? Box plots of country-level estimates, with a Kruskal–Wallis test of equal distributions.');
  const m = W.het.measures[labState.het] || W.het.measures[0];
  ctrl(s, sel('het', W.het.measures.map((x, i) => [i, x.label]), labState.het, 'Measure'));
  const g = grid(s);
  figure(g, { prefix: 'L', title: m.label, sub: 'by region; one observation per economy', h: 320, notes: 'Boxes span the interquartile range, the line marks the median and whiskers extend to 1.5 × IQR. The dashed line marks Bangladesh. Economies with any year above 100% inflation are excluded.',
    source: 'World Bank.', csv: () => [['region', 'n', 'lower whisker', 'Q1', 'median', 'Q3', 'upper whisker'], ...m.rows.map(r => [r.region, r.n, ...r.box])],
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
    notes: 'Each dot is an economy, coloured by region. Fitted line with 95% confidence band from OLS. Growth per person = real GDP growth minus population growth.', source: 'World Bank.',
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
  figure(g2, { prefix: 'L', title: 'σ-convergence', sub: 'cross-country standard deviation of log GDP per person (PPP)', source: 'World Bank.',
    csv: () => [['year', 'SD of log GDP per person', 'economies'], ...C.sigma],
    render: TH => tsOption(TH, C.sigma.map(r => String(r[0])), [S('Dispersion', C.sigma.map(r => r[1]), { area: 0.1, end: true, dec: 3 })], { y1: 'SD', scale: true, events: false, dec: 3 }) });
  ridgeFig(g2, W.ridge, { prefix: 'L', title: 'World inflation distribution (“mountain map”)', sub: 'kernel density across economies, selected years; values clipped to −5% to 25%', xname: '%',
    notes: 'Compare the 2021–2023 ridges with earlier years: a whole ridge moving right means a broad-based surge, while a long right tail alone means a few outliers. Light lines mark medians.', source: 'World Bank.' });
  const K = W.corr;
  const cs = sec(body, 'How indicators move together across countries', 'Spearman rank correlations across economies in ' + K.year + '.');
  const g3 = grid(cs);
  figure(g3, { prefix: 'L', wide: true, title: 'Correlation matrix, ' + K.year, sub: 'Spearman ρ across economies; stars mark significance', h: 420, notes: 'Rank correlations are robust to outliers. Each cell uses all economies with both values (pairwise).', source: 'World Bank.',
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
    'Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.',
    'Dell’Ariccia, G., Igan, D., Laeven, L., Tong, H., Bakker, B., & Vandenbussche, J. (2012). Policies for macrofinancial stability: How to deal with credit booms. IMF Staff Discussion Note 12/06.',
    'Frankel, J. A., & Rose, A. K. (1996). Currency crashes in emerging markets: An empirical treatment. Journal of International Economics, 41(3–4), 351–366.',
    'Freund, C. (2005). Current account adjustment in industrial countries. Journal of International Money and Finance, 24(8), 1278–1298.',
    'McKinnon, R. I. (1973). Money and Capital in Economic Development. Brookings Institution.'];
  const D = ['International Monetary Fund (IMF). IMF Data. https://www.imf.org/en/Data',
    'World Bank. World Development Indicators (CC BY 4.0). https://data.worldbank.org',
    'Asian Development Bank (ADB). Key Indicators Database. https://kidb.adb.org',
    'Regional development banks: African Development Bank (https://www.afdb.org), Inter-American Development Bank (https://www.iadb.org), European Bank for Reconstruction and Development (https://www.ebrd.com), European Investment Bank (https://www.eib.org), Asian Infrastructure Investment Bank (https://www.aiib.org).',
    'Central banks of every country: Bank for International Settlements, directory of central bank websites. https://www.bis.org/cbanks.htm',
    'National statistics offices of every country: United Nations Statistics Division, directory of national statistical offices. https://unstats.un.org/home/nso_sites/',
    'Bangladesh Bureau of Statistics (BBS). https://bbs.gov.bd',
    'Finance Division, Ministry of Finance, Bangladesh. https://mof.gov.bd',
    'Natural Earth. Free vector map data (public domain). https://www.naturalearthdata.com',
    'Bangladesh Bank. Monthly Economic Trends (September 2026 edition and earlier editions back to 2009). Tables IA, IB, IIA, IID, IV, VII, VIII, XVI, XVIII, XXIII, XXVII and others, as cited under each figure.',
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
  if (/^cl(~|$)/.test(h)) return routeCL(h);
  const m = /^(bangladesh|lab|learn|faq)(?:~([a-z0-9-]+))?$/.exec(h);
  if (!m) return false;
  if (m[1] === 'learn' || m[1] === 'faq') {
    const was2 = inited[m[1]];
    if (m[1] === 'learn') LEARN_OPEN = m[2] || null;
    go(m[1]);
    if (m[2]) {
      if (m[1] === 'learn' && was2) openTerm(m[2]);
      if (m[1] === 'faq') setTimeout(() => { const d = document.getElementById('faq-' + m[2]); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }, 50);
      try { history.replaceState(null, '', '#' + h); } catch (err) { /* framed */ }
    }
    return true;
  }
  if (m[1] === 'bangladesh' && m[2] && CHUNKS.some(c => c.id === m[2])) bdState.tab = m[2];
  if (m[1] === 'lab' && m[2] && LAB_TABS.some(t => t[0] === m[2])) labState.tab = m[2];
  const was = inited[m[1]];
  go(m[1]);
  if (was) (m[1] === 'bangladesh' ? renderBD : renderLab)();
  if (m[2]) try { history.replaceState(null, '', '#' + h); } catch (err) { /* framed */ }
  return true;
}

/* ---------- Pill-style values in every table (as in the Compare table) ---------- */
const SEQ = ['#C9E7EF', '#9AD0E0', '#63B3D1', '#3891BE', '#256FA2', '#1B5185', '#143B66'];
const GOODC = '#1F8A4D', BADC = '#C8473A';
const NUMRE = /^[▲▼]?\s*[+\-−]?\s*\$?\s*\d[\d,]*(\.\d+)?(e[+\-]?\d+)?\s*(%|pp|k)?$/i, PRE = /^[<≤≥]\s*\d*\.?\d+$/;
function gridOf(rows) {
  const g = [];
  rows.forEach((r, ri) => { g[ri] = g[ri] || []; let ci = 0; [...r.cells].forEach(c => { while (g[ri][ci]) ci++; const cs = c.colSpan || 1, rs = c.rowSpan || 1; for (let a = 0; a < rs; a++) for (let b = 0; b < cs; b++) { g[ri + a] = g[ri + a] || []; g[ri + a][ci + b] = c; } ci += cs; }); });
  return g;
}
function mainText(td) { const b = td.querySelector(':scope > b'); if (b) return b.textContent.trim(); let t = ''; td.childNodes.forEach(n => { if (n.nodeType === 3) t += n.textContent; }); return t.trim(); }
function numOf(t) {
  t = t.replace(/\s*◆$/, '').replace(/\*+$/, '').trim();
  if (PRE.test(t)) { const v = parseFloat(t.replace(/[<≤≥\s]/g, '')); return t[0] === '<' ? v / 2 : v; }
  if (!NUMRE.test(t)) return null;
  const v = parseFloat(t.replace(/[▲▼$,%k\s]|pp/gi, '').replace('−', '-'));
  return isFinite(v) ? v : null;
}
function wrapPill(td, color, warn) {
  const span = document.createElement('span');
  span.className = 'cell' + (color ? '' : ' nv') + (warn ? ' warn' : '');
  const b = td.querySelector(':scope > b');
  if (b) { span.textContent = b.textContent; b.replaceWith(span); }
  else {
    let txt = '', sup = null;
    const smalls = [];
    [...td.childNodes].forEach(n => { if (n.nodeType === 3) txt += n.textContent; else if (n.nodeName === 'SUP') sup = n; else if (n.nodeName === 'SMALL') smalls.push(n); });
    td.textContent = '';
    span.textContent = txt.trim();
    if (sup) span.append(sup);
    td.append(span);
    smalls.forEach(n => td.append(' ', n));
  }
  if (color) { span.style.background = color; span.style.color = textOn(color); }
}
function pillify(tbl, opt) {
  if (!tbl) return;
  opt = opt || {};
  const head = gridOf(tbl.tHead ? [...tbl.tHead.rows] : []);
  const hl = (head[head.length - 1] || []).map(c => c ? ((c.getAttribute('title') || '') + ' ' + c.textContent).toLowerCase() : '');
  const body = [...tbl.tBodies].flatMap(b => [...b.rows]);
  const g = gridOf(body);
  const cols = {};
  g.forEach(row => row.forEach((c, ci) => {
    if (!c || c.tagName !== 'TD' || c.querySelector('.cell, svg, .pe-badge, .rng, a, button, .bartrack')) return;
    if (row.indexOf(c) !== ci) return;
    if (!opt.all && !c.classList.contains('num')) return;
    if (opt.all && ci === 0) return;
    const t = mainText(c);
    if (t === '–' || t === '') { if (c.classList.contains('num') || opt.all) { c.textContent = ''; c.append(Object.assign(document.createElement('span'), { className: 'cell dash', textContent: '–' })); } return; }
    const v = numOf(t);
    if (v == null) return;
    (cols[ci] = cols[ci] || []).push([c, v]);
  }));
  Object.entries(cols).forEach(([ci, cells]) => {
    const h = hl[ci] || '';
    const pMode = /(^|[\s(])p(\)|\s|$)|p-value|p value|\bdm p\b|\blb p\b/.test(h);
    const sorted = cells.map(x => x[1]).sort((a, b) => a - b);
    const heat = (opt.heat === 'col' || opt.all) && sorted.length >= 4 && !/^\s*#|rank/.test(h) && !pMode;
    cells.forEach(([c, v]) => {
      let col = null, warn = false;
      if (c.classList.contains('warn-std')) { col = BADC; warn = true; }
      else if (c.classList.contains('up-bad')) col = BADC;
      else if (c.classList.contains('up-good')) col = GOODC;
      else if (c.hasAttribute('data-pct')) col = SEQ[Math.round(Math.max(0, Math.min(100, +c.getAttribute('data-pct'))) / 100 * (SEQ.length - 1))];
      else if (pMode) col = v < 0.01 ? SEQ[6] : v < 0.05 ? SEQ[5] : v < 0.1 ? SEQ[3] : SEQ[0];
      else if (heat) { const r = sorted.length > 1 ? sorted.indexOf(v) / (sorted.length - 1) : 0.5; col = SEQ[Math.round(r * (SEQ.length - 1))]; }
      wrapPill(c, col, warn);
    });
  });
}
function watchTable(sel) {
  const t = $(sel);
  if (!t) return;
  let q = false;
  const mo = new MutationObserver(() => { if (!q) { q = true; requestAnimationFrame(run); } });
  /* stop watching while the cells are restyled, so the restyling cannot trigger itself in an endless loop */
  function run() { q = false; mo.disconnect(); try { pillify(t, { all: true }); } finally { mo.takeRecords(); mo.observe(t, { childList: true, subtree: true }); } }
  run();
}

/* ---------- Data source under every chart, table and map ---------- */
const SRCS = { wdi: 'World Bank.', mk: 'EIA, World Bank, Federal Reserve, BLS.', fx: 'Federal Reserve.', methods: 'World Bank.' };
function srcFor(node) { const v = node.closest('.view'); const id = v ? v.id : ''; if (id === 'v-markets' || node.closest('#ov-markets')) return SRCS.mk; if (id === 'v-methods') return SRCS.methods; return SRCS.wdi; }
function addSrcAfter(el, text) {
  if (!el || !el.parentElement) return;
  const nx = el.nextElementSibling;
  if (nx && nx.classList.contains('src-line')) return;
  el.insertAdjacentHTML('afterend', '<p class="src-line mm-src"><b>Source:</b> ' + esc(text) + '</p>');
  const line = el.nextElementSibling;
  const dedupe = () => { const par = line.parentElement; if (par && [...par.querySelectorAll('*')].some(c => c !== line && !line.contains(c) && !c.contains(line) && c.children.length === 0 && /Source:/.test(c.textContent))) line.remove(); };
  setTimeout(dedupe, 0); setTimeout(dedupe, 600);
}
function staticSources() {
  [['#heat', 'wdi'], ['#regions', 'wdi'], ['#cmp-table', 'wdi'], ['#rk-table', 'wdi'], ['#fx-table', 'fx'], ['#me-flags', 'methods'], ['#pulse', 'wdi'], ['#dotmap', 'wdi'], ['#map-note', 'wdi'], ['#ov-markets', 'mk']].forEach(([sel, k]) => {
    const n = $(sel);
    if (n) addSrcAfter(n.closest('.table-wrap') || n, SRCS[k]);
  });
  ['#regions', '#rk-table', '#fx-table', '#me-flags'].forEach(watchTable);
}

/* ---------- Sign-in (Firebase): everything except the front page and Privacy needs an account ---------- */
const AUTH = { cfg: window.MM_AUTH || null, ready: false, user: null, pending: null, fb: null, db: null, last: '', lastAt: 0 };
const PUBLIC_VIEWS = ['overview', 'privacy'];
const OWNER = { state: 'no', fromUrl: null };
(() => {
  const m = /^#owner=([A-Za-z0-9_-]{16,})$/.exec(location.hash || '');
  if (m) { OWNER.fromUrl = m[1]; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* framed */ } }
  let saved = null;
  try { saved = localStorage.getItem('mm.owner'); } catch (e) { /* private mode */ }
  if (OWNER.fromUrl || saved) OWNER.state = 'checking';
})();
function ownerOK() { return OWNER.state === 'yes'; }
async function sha256hex(t) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function checkOwner() {
  if (OWNER.state !== 'checking') return;
  const want = window.MM_OWNERH || (AUTH.cfg && AUTH.cfg.owner);
  let saved = null;
  try { saved = localStorage.getItem('mm.owner'); } catch (e) { /* private mode */ }
  const code = OWNER.fromUrl || saved;
  let ok = false;
  try { ok = !!(want && code && crypto.subtle && (await sha256hex(code)) === want); } catch (e) { ok = false; }
  OWNER.state = ok ? 'yes' : 'no';
  document.documentElement.classList.toggle('owner', ok);
  if (!ok) addWatermark();
  if (ok) { try { localStorage.setItem('mm.owner', code); } catch (e) { /* private mode */ } if (OWNER.fromUrl) toast('Owner pass saved: this device no longer needs to sign in.'); }
  else { try { localStorage.removeItem('mm.owner'); } catch (e) { /* private mode */ } if (OWNER.fromUrl) toast('That owner link isn’t valid.'); }
  renderAcct();
  if (ok) { hideGate(); if (AUTH.pending) { const pd = AUTH.pending; AUTH.pending = null; if (pd.hash && pd.hash.length > 1) { if (location.hash === pd.hash) route(pd.hash); else location.hash = pd.hash; } else go(pd.view, pd.opts); } }
  else if (AUTH.pending) showGate(AUTH.ready ? 'signin' : 'wait');
}
const SDK = v => ['app', 'auth', 'firestore'].map(n => 'https://www.gstatic.com/firebasejs/' + v + '/firebase-' + n + '-compat.js');
function authActive() { const f = AUTH.cfg && AUTH.cfg.firebase; return !!(f && f.apiKey && f.authDomain && f.projectId && f.appId); }
function curView() { const v = document.querySelector('.view.on'); return v ? v.id.slice(2) : ''; }
function gateBlocks(view, opts) {
  if (!authActive() || PUBLIC_VIEWS.includes(view)) { if (AUTH.user) logVisit(view, opts); return false; }
  if (ownerOK()) return false;
  if (AUTH.user) { logVisit(view, opts); return false; }
  AUTH.pending = { view, opts: opts || {}, hash: location.hash };
  showGate(AUTH.ready && OWNER.state !== 'checking' ? 'signin' : 'wait');
  if (!PUBLIC_VIEWS.includes(curView())) setTimeout(() => { if (AUTH.pending && !PUBLIC_VIEWS.includes(curView())) go('overview'); }, 0);
  return true;
}
function showGate(mode) {
  const g = $('#gate');
  if (!g) return;
  g.hidden = false;
  document.documentElement.classList.add('gated');
  $('#gate-wait').hidden = mode !== 'wait';
  $('#gate-btns').hidden = mode === 'wait';
  $('#gate-apple').hidden = !(AUTH.cfg && AUTH.cfg.apple);
  if (mode !== 'wait') { $('#gate-msg').textContent = mode === 'error' ? AUTH.err || '' : ''; setTimeout(() => { const b = $('#gate-google'); if (b) b.focus(); }, 30); }
}
function hideGate() { const g = $('#gate'); if (g) g.hidden = true; document.documentElement.classList.remove('gated'); }
function authErr(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/unauthorized-domain') return 'This web address isn’t on the sign-in list yet. In Firebase, add it under Authentication, then Settings, then Authorized domains.';
  if (c === 'auth/network-request-failed') return 'There’s no connection. Check your internet and try again.';
  if (c === 'auth/operation-not-allowed') return 'This sign-in method isn’t switched on yet in Firebase.';
  return 'Sign-in didn’t work' + (c ? ' (' + c.replace('auth/', '') + ')' : '') + '. Please try again.';
}
function provider(kind) {
  if (kind === 'apple') { const pr = new firebase.auth.OAuthProvider('apple.com'); pr.addScope('email'); pr.addScope('name'); return pr; }
  return new firebase.auth.GoogleAuthProvider();
}
function signIn(kind) {
  if (!AUTH.fb) return;
  $('#gate-msg').textContent = '';
  const pr = provider(kind);
  AUTH.fb.signInWithPopup(pr).catch(e => {
    const c = (e && e.code) || '';
    if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') return AUTH.fb.signInWithRedirect(pr);
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
    $('#gate-msg').textContent = authErr(e);
  });
}
function logVisit(view, opts) {
  if (!AUTH.db || !AUTH.user) return;
  const page = view + (opts && opts.code ? ':' + opts.code : '');
  if (page === AUTH.last && Date.now() - AUTH.lastAt < 3000) return;
  AUTH.last = page; AUTH.lastAt = Date.now();
  try { AUTH.db.collection('users').doc(AUTH.user.uid).collection('visits').add({ page, at: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {}); } catch (e) { /* offline */ }
}
function saveUser(u) {
  if (!AUTH.db) return;
  try {
    AUTH.db.collection('users').doc(u.uid).set({ name: u.displayName || '', email: u.email || '', provider: ((u.providerData || [])[0] || {}).providerId || '', joined: (u.metadata && u.metadata.creationTime) || '',
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(), sessions: firebase.firestore.FieldValue.increment(1) }, { merge: true }).catch(() => {});
  } catch (e) { /* offline */ }
}
function renderAcct() {
  const b = $('#acct-btn');
  if (!b) return;
  b.hidden = !authActive() && !ownerOK();
  const rf = $('#acct-refresh'); if (rf) rf.hidden = !ownerOK();
  const u = AUTH.user;
  b.classList.toggle('own', ownerOK());
  if (ownerOK() && !u) { b.textContent = 'Owner'; b.classList.remove('in'); b.setAttribute('aria-label', 'Owner pass is on for this device'); $('#acct-name').textContent = 'Owner pass'; $('#acct-email').textContent = 'This device opens every page without signing in, and isn’t tracked.'; return; }
  if (!u) { b.textContent = 'Sign in'; b.classList.remove('in'); b.setAttribute('aria-label', 'Sign in'); return; }
  const nm = u.displayName || u.email || 'Account';
  b.classList.add('in');
  b.setAttribute('aria-label', 'Account: ' + nm);
  b.innerHTML = u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="" referrerpolicy="no-referrer">' : '<span>' + esc(nm.trim().charAt(0).toUpperCase()) + '</span>';
  $('#acct-name').textContent = u.displayName || 'Signed in';
  $('#acct-email').textContent = u.email || '';
}
function closeMenu() { const m = $('#acct-menu'); if (m) m.hidden = true; const b = $('#acct-btn'); if (b) b.setAttribute('aria-expanded', 'false'); }
async function deleteAccount() {
  const u = AUTH.user;
  if (!u || !confirm('This deletes your account and the record of pages you opened. Continue?')) return;
  try {
    if (AUTH.db) {
      const ref = AUTH.db.collection('users').doc(u.uid);
      const vs = await ref.collection('visits').get();
      const docs = vs.docs || [];
      for (let i = 0; i < docs.length; i += 400) { const bt = AUTH.db.batch(); docs.slice(i, i + 400).forEach(d => bt.delete(d.ref)); await bt.commit(); }
      await ref.delete();
    }
    try { await u.delete(); }
    catch (e) { if (e && e.code === 'auth/requires-recent-login') { await u.reauthenticateWithPopup(provider(((u.providerData || [])[0] || {}).providerId === 'apple.com' ? 'apple' : 'google')); await u.delete(); } else throw e; }
    toast('Your account and record were deleted.');
  } catch (e) { toast('That didn’t work. Please try again.'); }
}
function loadScript(src) { return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.append(sc); }); }
let ACCT_BOUND = false;
function bindAcct() {
  if (ACCT_BOUND || !$('#acct-btn')) return;
  ACCT_BOUND = true;
  $('#acct-btn').addEventListener('click', e => {
    e.stopPropagation();
    if (!AUTH.user && !ownerOK()) { AUTH.pending = null; showGate(AUTH.ready ? 'signin' : 'wait'); return; }
    $('#acct-out').textContent = AUTH.user ? 'Sign out' : 'Turn off the owner pass on this device';
    $('#acct-del').hidden = !AUTH.user;
    const m = $('#acct-menu'), open = m.hidden;
    if (open) { const rr = $('#acct-btn').getBoundingClientRect(); m.style.top = (rr.bottom + 8) + 'px'; m.style.right = Math.max(8, window.innerWidth - rr.right) + 'px'; }
    m.hidden = !open; $('#acct-btn').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => { if (!e.target.closest('#acct-menu')) closeMenu(); });
  $('#acct-out').addEventListener('click', () => {
    closeMenu();
    if (AUTH.user) { if (AUTH.fb) AUTH.fb.signOut(); return; }
    if (ownerOK()) { OWNER.state = 'no'; document.documentElement.classList.remove('owner'); addWatermark(); try { localStorage.removeItem('mm.owner'); } catch (e) { /* private mode */ } renderAcct(); toast('Owner pass turned off on this device.'); if (authActive() && !PUBLIC_VIEWS.includes(curView())) go('overview'); }
  });
  $('#acct-del').addEventListener('click', () => { closeMenu(); deleteAccount(); });
}
async function initOwner() {
  bindAcct();
  if (OWNER.state === 'checking') await checkOwner(); else addWatermark();
  renderAcct();
}
async function initAuth() {
  if (!authActive()) return;
  $$('[data-auth-only]').forEach(n => { n.hidden = false; });
  $$('[data-auth-off]').forEach(n => { n.hidden = true; });
  renderAcct();
  $('#gate-google').addEventListener('click', () => signIn('google'));
  $('#gate-apple').addEventListener('click', () => signIn('apple'));
  $('#gate-back').addEventListener('click', () => { AUTH.pending = null; hideGate(); go('overview'); });
  $('#gate-privacy').addEventListener('click', e => { e.preventDefault(); AUTH.pending = null; hideGate(); go('privacy'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#gate').hidden) { AUTH.pending = null; hideGate(); go('overview'); } });
  bindAcct();
  try {
    const v = AUTH.cfg.sdk || '10.12.2';
    for (const src of SDK(v)) await loadScript(src);
    firebase.initializeApp(AUTH.cfg.firebase);
    AUTH.fb = firebase.auth();
    AUTH.db = firebase.firestore ? firebase.firestore() : null;
    AUTH.fb.getRedirectResult().catch(e => { AUTH.err = authErr(e); showGate('error'); });
    AUTH.fb.onAuthStateChanged(u => {
      const was = AUTH.user;
      AUTH.user = u || null; try { checkSub(AUTH.user); } catch (e) { /* subscriptions optional */ }
      AUTH.ready = true;
      renderAcct();
      if (u) {
        if (!was) saveUser(u);
        hideGate();
        if (AUTH.pending) { const pd = AUTH.pending; AUTH.pending = null; if (pd.hash && pd.hash.length > 1) { if (location.hash === pd.hash) route(pd.hash); else location.hash = pd.hash; } else go(pd.view, pd.opts); }
        else logVisit(curView());
      } else {
        if (ownerOK() || OWNER.state === 'checking') return;
        if (AUTH.pending) showGate('signin');
        else if (!PUBLIC_VIEWS.includes(curView())) go('overview');
        if (was) toast('You’re signed out.');
      }
    });
  } catch (e) {
    AUTH.ready = true;
    AUTH.err = 'Sign-in couldn’t load. Check your connection, then reload the page.';
    if (AUTH.pending) showGate('error');
  }
}

/* ---------- Maps (Natural Earth) and country profiles (World Bank) ---------- */
const MAPS = { data: window.MM_MAPS || null, p: null };
function loadMaps() {
  if (MAPS.data) return Promise.resolve(MAPS.data);
  if (!MAPS.p) MAPS.p = fetch('maps.json', { cache: 'force-cache' }).then(x => { if (!x.ok) throw new Error(String(x.status)); return x.json(); }).then(d => (MAPS.data = d));
  return MAPS.p;
}
const EMAPB = () => { if (!EMAPB.m) { EMAPB.m = {}; RAW.econ.forEach(e => { EMAPB.m[e[0]] = e; }); } return EMAPB.m; };
function projFor(b, W, H, pad) {
  const lat0 = (b[1] + b[3]) / 2, k = Math.cos(lat0 * Math.PI / 180) || 1;
  const w = Math.max((b[2] - b[0]) * k, 1e-6), hh = Math.max(b[3] - b[1], 1e-6);
  const sc = Math.min((W - 2 * pad) / w, (H - 2 * pad) / hh);
  const ox = (W - w * sc) / 2, oy = (H - hh * sc) / 2;
  return { f: (lon, lat) => [ox + (lon - b[0]) * k * sc, oy + (b[3] - lat) * sc], sc, k };
}
const shiftLon = (lon, on) => (on && lon < 0 ? lon + 360 : lon);
function ringsPath(rings, P, sh) { return rings.map(rg => 'M' + rg.map(c => { const q = P.f(shiftLon(c[0], sh), c[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L') + 'Z').join(''); }
function geoOf(c) {
  if (c.b[2] - c.b[0] < 300) return { b: c.b, sh: false };
  let mn = 999, mx = -999;
  c.r.forEach(rg => rg.forEach(pt => { const x = shiftLon(pt[0], true); if (x < mn) mn = x; if (x > mx) mx = x; }));
  return { b: [mn, c.b[1], mx, c.b[3]], sh: true };
}
function niceKm(km) { const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]; return steps.reduce((best, s) => (Math.abs(s - km) < Math.abs(best - km) ? s : best), steps[0]); }
function countrySVG(iso, M) {
  const c = M.c[iso];
  if (!c) return '';
  const EM = EMAPB(), G = geoOf(c), W = 640, H = 420, P = projFor(G.b, W, H, 28), uid = 'm' + iso;
  let sv = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cmap" role="img" aria-label="' + esc('Map of ' + ((EM[iso] || [])[1] || iso)) + '">';
  sv += '<defs><linearGradient id="' + uid + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#63B3D1"/><stop offset="1" stop-color="#1B5185"/></linearGradient>' +
    '<filter id="' + uid + 's" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0E1C2B" flood-opacity=".28"/></filter></defs>';
  sv += '<rect class="sea" width="' + W + '" height="' + H + '" rx="14"/>';
  (c.nb || []).forEach(n => { const m = M.c[n]; if (m) sv += '<path class="nbr" d="' + ringsPath(m.r, P, G.sh) + '"><title>' + esc((EM[n] || [])[1] || n) + '</title></path>'; });
  sv += '<path class="ctry" d="' + ringsPath(c.r, P, G.sh) + '" fill="url(#' + uid + 'g)" fill-rule="evenodd" filter="url(#' + uid + 's)"><title>' + esc((EM[iso] || [])[1] || iso) + '</title></path>';
  const placed = [];
  const lab = (x, y, t, cls) => { if (placed.some(q => Math.abs(q[0] - x) < 70 && Math.abs(q[1] - y) < 16)) return ''; placed.push([x, y]); return '<text x="' + (x + 8).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" class="' + cls + '">' + esc(t) + '</text>'; };
  if (c.cap) { const q = P.f(shiftLon(c.cap[1], G.sh), c.cap[2]); sv += '<path class="capm" d="' + starPath(q[0], q[1], 8, 3.6) + '"/>' + lab(q[0], q[1], c.cap[0], 'capl'); }
  (c.top || []).forEach(ct => { const q = P.f(shiftLon(ct[1], G.sh), ct[2]); if (q[0] < 0 || q[0] > W || q[1] < 0 || q[1] > H) return; sv += '<circle class="citym" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.6"/>' + lab(q[0], q[1], ct[0], 'cityl'); });
  const kmPx = P.sc / 111.32, km = niceKm(120 / kmPx), px = km * kmPx;
  sv += '<g class="scale" transform="translate(22,' + (H - 26) + ')"><rect width="' + px.toFixed(1) + '" height="5" rx="2"/><text y="-6">' + km.toLocaleString('en-US') + ' km</text></g>';
  if (RAW.geo && RAW.geo.p) {
    const gw = RAW.geo.w || 1000, gh = RAW.geo.h || 500, ss = 150 / gw;
    sv += '<g class="inset" transform="translate(' + (W - 162) + ',12)"><rect x="-6" y="-6" width="' + (gw * ss + 12).toFixed(0) + '" height="' + (gh * ss + 12).toFixed(0) + '" rx="8"/><g transform="scale(' + ss.toFixed(4) + ')">' +
      RAW.geo.p.map(pp => '<path d="' + pp[1] + '" class="' + (pp[0] === iso ? 'on' : '') + '"/>').join('') + '</g></g>';
  }
  return sv + '</svg>';
}
function starPath(cx, cy, R, r) { let d = ''; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; }
const PROF_DEF = [['population', 'Population', 'million people', 2], ['area', 'Surface area', 'km²', 0], ['land', 'Land area', 'km²', 0], ['density', 'Population density', 'people per km² of land', 2], ['urban', 'Urban population', '% of total', 2],
  ['life', 'Life expectancy at birth', 'years', 2], ['fert', 'Fertility rate', 'births per woman', 2], ['birth', 'Birth rate', 'per 1,000 people', 2], ['young', 'Aged 0–14', '% of population', 2], ['old', 'Aged 65 and over', '% of population', 2],
  ['female', 'Female population', '% of total', 2], ['literacy', 'Adult literacy', '% of people 15+', 2], ['elec', 'Access to electricity', '% of population', 2], ['u5mort', 'Under-5 mortality', 'per 1,000 live births', 2],
  ['infmort', 'Infant mortality', 'per 1,000 live births', 2], ['forest', 'Forest area', '% of land', 2], ['agri', 'Agricultural land', '% of land', 2]];
function profileTable(host, iso, M) {
  const EM = EMAPB(), e = EM[iso] || [], P = (RAW.prof || {})[iso] || {}, c = M && M.c[iso];
  let html = '<thead><tr><th scope="col">Indicator</th><th scope="col" class="num">Value</th><th scope="col">Unit</th><th scope="col">Year</th></tr></thead><tbody>';
  const facts = [];
  if (c && c.cap) facts.push(['Capital', esc(c.cap[0])]);
  if (e[3]) facts.push(['Region', esc(e[3] + (e[4] ? ' · ' + e[4] : ''))]);
  if (c) {
    const G = geoOf(c), lat = (c.b[1] + c.b[3]) / 2;
    let lon = (G.b[0] + G.b[2]) / 2;
    if (lon > 180) lon -= 360;
    facts.push(['Centre', Math.abs(lat).toFixed(2) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(lon).toFixed(2) + '° ' + (lon >= 0 ? 'E' : 'W')]);
    facts.push(['Extent', nf((G.b[3] - G.b[1]) * 111.32, 0) + ' km north–south, ' + nf((G.b[2] - G.b[0]) * 111.32 * Math.cos(lat * Math.PI / 180), 0) + ' km east–west (approx.)']);
    facts.push(['Borders', c.nb && c.nb.length ? c.nb.map(n => '<a href="#country-' + n + '">' + esc((EM[n] || [])[1] || n) + '</a>').join(', ') : 'No land borders']);
    if (c.top && c.top.length) facts.push(['Largest other cities', esc(c.top.map(t => t[0]).join(', '))]);
  }
  facts.forEach(f => { html += '<tr><th scope="row">' + f[0] + '</th><td colspan="3">' + f[1] + '</td></tr>'; });
  const popL = latestOf('population', iso);
  PROF_DEF.forEach(([k, lab, unit, d]) => {
    const x = k === 'population' ? popL : P[k] ? [P[k][0], P[k][1]] : null;
    if (!x) return;
    html += '<tr><th scope="row">' + esc(lab) + '</th><td class="num">' + nf(x[1], d) + '</td><td>' + esc(unit) + '</td><td>' + x[0] + '</td></tr>';
  });
  tableWrap(host, html + '</tbody>', '<span class="fig-n">Profile</span>' + esc('Geography and people: ' + (e[1] || iso)), 'Latest year available for each figure. Extent is approximate, measured from the map outline.', { src: 'World Bank; map: Natural Earth.' });
}
function renderGeo(iso) {
  const host = $('#c-geo');
  if (!host || !RAW.econ) return;
  host.innerHTML = '<div class="block-head"><h2>Geography and people</h2><p class="note">Where the economy is, who lives there and how they live. Tap a neighbour to open its profile.</p><p><a class="btn sm" href="#cl~' + iso + '~inflation~charts">Analyse this economy topic by topic →</a></p></div><div class="geo-grid"><div class="geo-map" id="c-geo-map"><p class="note">Loading map…</p></div><div class="geo-prof" id="c-geo-prof"></div></div>';
  const done = M => { const mp = $('#c-geo-map'); if (!mp) return; const svg = M ? countrySVG(iso, M) : ''; mp.innerHTML = svg ? svg + '<p class="src-line"><b>Source:</b> Natural Earth.</p>' : '<p class="note">' + (M ? 'No map outline is available for this economy.' : 'The map opens on macroarianalytics.com.') + '</p>'; worldLocator(mp, iso); $('#c-geo-prof').innerHTML = ''; profileTable($('#c-geo-prof'), iso, M); };
  profileTable($('#c-geo-prof'), iso, null);
  loadMaps().then(done).catch(() => done(null));
}
const DIVC = ['#E4572E', '#17A398', '#F2B134', '#2E86AB', '#76B041', '#9B5DE5', '#E8578B', '#4C6EF5'];
function bdMapSVG(B) {
  const W = 520, H = 600, P = projFor([87.85, 20.55, 92.75, 26.75], W, H, 10);
  let sv = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bdmap" role="img" aria-label="Map of Bangladesh with its divisions, main rivers and cities">';
  sv += '<defs><filter id="bdsh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0E1C2B" flood-opacity=".3"/></filter><linearGradient id="bdsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D7ECF6"/><stop offset="1" stop-color="#9FD0E8"/></linearGradient></defs>';
  sv += '<rect width="' + W + '" height="' + H + '" rx="16" fill="url(#bdsea)" class="bdsea"/>';
  (B.nb || []).forEach(n => { sv += '<path class="bdnb" d="' + ringsPath(n.r, P, false) + '"><title>' + esc(n.n) + '</title></path>'; });
  sv += '<g filter="url(#bdsh)">' + B.div.map((d, i) => '<path class="bddiv" style="fill:' + DIVC[i % DIVC.length] + '" d="' + ringsPath(d.r, P, false) + '"><title>' + esc(({ Chittagong: 'Chattogram', Barisal: 'Barishal' }[d.n] || d.n) + ' Division') + '</title></path>').join('') + '</g>';
  (B.rv || []).forEach(rv => { sv += '<path class="bdriv" d="M' + rv.l.map(c => P.f(c[0], c[1]).map(v => v.toFixed(1)).join(',')).join('L') + '"><title>' + esc(rv.n || 'River') + '</title></path>'; });
  const OFF = { Chittagong: 'Chattogram', Barisal: 'Barishal' };
  B.div.forEach(d => { const q = P.f(d.c[0], d.c[1]); sv += '<text class="bddivl" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '">' + esc(OFF[d.n] || d.n) + '</text>'; });
  (B.city || []).slice(0, 7).forEach(ct => { const q = P.f(ct[1], ct[2]); sv += ct[0] === 'Dhaka' ? '<path class="capm" d="' + starPath(q[0], q[1], 9, 4) + '"/><text class="capl" x="' + (q[0] + 10).toFixed(1) + '" y="' + (q[1] + 16).toFixed(1) + '">Dhaka</text>' : '<circle class="citym" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.4"/>'; });
  const bay = P.f(90.2, 21.05), ind = P.f(88.25, 25.9), mya = P.f(92.45, 21.3);
  sv += '<text class="bdsea-l" x="' + bay[0].toFixed(1) + '" y="' + bay[1].toFixed(1) + '">Bay of Bengal</text><text class="bdnb-l" x="' + ind[0].toFixed(1) + '" y="' + ind[1].toFixed(1) + '">INDIA</text><text class="bdnb-l" x="' + mya[0].toFixed(1) + '" y="' + mya[1].toFixed(1) + '">MYANMAR</text>';
  return sv + '</svg>';
}
function bdMapExtra(B) {
  const OFFN = { Barisal: 'Barishal', Chittagong: 'Chattogram' };
  let areas = []; try { areas = B.div.map(d => ({ n: OFFN[d.n] || d.n, a: divArea(d.r) })); } catch (e) { areas = []; }
  const tot = areas.reduce((s, x) => s + x.a, 0);
  const leg = areas.length ? '<div class="bd-legend">' + areas.map((x, i) => '<span><i style="background:' + DIVC[i % DIVC.length] + '"></i>' + esc(x.n) + ' <small>' + nf(x.a / 1000, 1) + 'k km² · ' + nf(x.a / tot * 100, 1) + '%' + (BD_DIVPOP[x.n] ? ' · ' + nf(BD_DIVPOP[x.n] / 1e6, 1) + ' m people · ' + nf(BD_DIVPOP[x.n] / x.a, 0) + ' per km²' : '') + '</small></span>').join('') + '</div>' : '';
  const L = k => lastOfS(k, 'BGD'), f = (lab, v, u) => (v ? '<div class="bdf"><span>' + lab + '</span><b>' + v + '</b>' + (u ? '<small>' + u + '</small>' : '') + '</div>' : '');
  const gdp = L('gdp_usd'), gpc = L('gdp_pc'), gr = L('gdp_growth'), pv = L('poverty'), lit = L('literacy') || L('lit'), el = L('electricity') || L('elec');
  const inf = PK('infl'); let iv = null, ip = '';
  if (inf) { for (let j = inf.v.length - 1; j >= 0; j--) if (inf.v[j] != null) { iv = inf.v[j]; ip = bdLab('M', inf.k0 + j); break; } }
  const econ = f('GDP', gdp ? 'US$ ' + nf(gdp[1] > 1e6 ? gdp[1] / 1e9 : gdp[1], 1) + ' bn' : '', gdp ? String(gdp[0]) : '') + f('GDP per person', gpc ? 'US$ ' + nf(gpc[1], 0) : '', gpc ? String(gpc[0]) : '') + f('Real growth', gr ? nf(gr[1], 2) + '%' : '', gr ? String(gr[0]) : '') + f('Inflation', iv != null ? nf(iv, 2) + '%' : '', ip) + f('Poverty ($3/day)', pv ? nf(pv[1], 2) + '%' : '', pv ? String(pv[0]) : '');
  return leg + (econ ? '<div class="bdfacts bdfacts2">' + econ + '</div>' : '') + bdDemog();
}
function divArea(rings) {
  const R = 6371.0088, rad = Math.PI / 180; let tot = 0;
  (rings || []).forEach((ring, ri) => { let s = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; s += (b[0] - a[0]) * rad * (2 + Math.sin(a[1] * rad) + Math.sin(b[1] * rad)); } tot += Math.abs(s * R * R / 2); });  /* every outline adds: islands are separate outlines, not holes */
  return Math.abs(tot);
}
function bdMapBox(host) {
  const B = window.MM_BDMAP;
  if (!host || !B) return;
  const P = (RAW.prof || {}).BGD || {}, pop = latestOf('population', 'BGD');
  const fact = (k, v) => '<div class="bdf"><span>' + k + '</span><b>' + v + '</b></div>';
  host.innerHTML = '<div class="mapbox-head"><h3>Bangladesh</h3><a class="mapbox-link" href="#country-BGD">Geography and people →</a></div>' + bdMapSVG(B) +
    '<div class="bdfacts">' + fact('Capital', 'Dhaka') + (pop ? fact('Population', nf(pop[1], 2) + ' million') : '') + (P.area ? fact('Area', nf(P.area[1], 0) + ' km²') : '') + (P.density ? fact('Density', nf(P.density[1], 2) + ' per km²') : '') + (P.urban ? fact('Urban', nf(P.urban[1], 2) + '%') : '') + (P.life ? fact('Life expectancy', nf(P.life[1], 2) + ' years') : '') + '</div>' +
    bdMapExtra(B) + '<p class="mx-note">' + esc(B.note) + ' Tap a division for its name. Division areas are the land area of the Natural Earth outlines, which leave out wide rivers, estuaries and coastal waters; official areas are larger (Bangladesh: about 148,000 km²).</p><p class="src-line"><b>Source:</b> World Bank; BBS via Bangladesh Bank; map: Natural Earth.</p>';
}

/* ---------- Results and conclusions (written from the model results) ---------- */
let PEER_RANKS = {};
function resultsCards(bdOnly) {
  const e = BD.ensemble.path, a = BD.arima.infl, V = BD.var, R = BD.robust, Wd = BD.world;
  const now = a.hist.v[a.hist.v.length - 1], f12 = e[e.length - 1];
  const gp = i => ((V.granger.find(x => x.effect === 0 && x.cause === i)) || {}).p;
  const sig = p => p != null && p < 0.05;
  const npl = SER('npl').reading, crar = SER('crar').reading, cov = SER('cover').reading;
  const sb = R.subsamples || [], s0 = sb[0] || {}, s1 = sb[1] || {};
  const after = [['the call money rate', 'g_call_p'], ['Taka depreciation', 'g_xr_p'], ['money growth', 'g_m2_p']].filter(([, k]) => s1[k] < 0.05 && !(s0[k] < 0.05)).map(x => x[0]);
  const before = [['the call money rate', 'g_call_p'], ['Taka depreciation', 'g_xr_p'], ['money growth', 'g_m2_p']].filter(([, k]) => s0[k] < 0.05 && !(s1[k] < 0.05)).map(x => x[0]);
  const C = [];
  C.push({ t: 'Inflation outlook', big: nf(f12.mean, 2) + '%', s: 'Projected for ' + fmtPeriod(mLabAdd(BD.ensemble.start, e.length - 1)) + ', from ' + nf(now, 2) + '% now (80% range ' + nf(f12.lo80, 2) + '–' + nf(f12.hi80, 2) + '%). The benchmark band is 2–6%; the chance inflation is still above 8% is ' + nf(f12.p_gt8 * 100, 2) + '%.', go: '#lab~overview', bad: stdOut(STD.infl, f12.mean) });
  C.push({ t: 'What moves prices', big: sig(gp(2)) ? 'Interest rates' : sig(gp(3)) ? 'The Taka' : 'Own momentum', s: 'The call money rate ' + (sig(gp(2)) ? 'helps' : 'does not help') + ' predict inflation (p = ' + fp(gp(2)) + '); Taka depreciation ' + (sig(gp(3)) ? 'helps' : 'adds little') + ' (p = ' + fp(gp(3)) + '); money growth ' + (sig(gp(1)) ? 'helps' : 'adds little') + ' (p = ' + fp(gp(1)) + ').', go: '#lab~var' });
  if (after.length || before.length) C.push({ t: 'A change since 2020', big: 'Regime shift', s: (after.length ? 'Since 2020, ' + after.join(' and ') + ' predict' + (after.length > 1 ? '' : 's') + ' inflation. ' : '') + (before.length ? 'Before 2020, ' + before.join(' and ') + ' did, but no longer does.' : ''), go: '#lab~robust' });
  if (npl && crar) C.push({ t: 'Banking stress', big: nf(npl.v, 2) + '%', s: 'Bad loans as a share of all loans (' + fmtPeriod(npl.period) + '), against an 8% high-risk benchmark. Banks’ capital ratio is ' + nf(crar.v, 2) + '%, against Bangladesh Bank’s 12.5% requirement.', go: '#bangladesh~money', bad: stdOut(STD.npl, npl.v) || stdOut(STD.crar, crar.v) });
  if (cov) C.push({ t: 'External buffers', big: nf(cov.v, 2) + ' months', s: 'Foreign exchange reserves cover ' + nf(cov.v, 2) + ' months of imports (' + fmtPeriod(cov.period) + '), against the IMF’s 3-month benchmark.', go: '#bangladesh~ext', bad: stdOut(STD.cover, cov.v) });
  if (!bdOnly) {
    if (PEER_RANKS.gdp_growth) C.push({ t: 'Bangladesh among its peers', big: '#' + PEER_RANKS.gdp_growth[0] + ' of ' + PEER_RANKS.gdp_growth[1], s: 'Rank for growth among the 20 economies in the table; ' + (PEER_RANKS.inflation ? '#' + PEER_RANKS.inflation[0] + ' for inflation (closest to 3% ranks best).' : ''), go: '#peers' });
    const c1 = Wd.conv.m1.rows[1];
    C.push({ t: 'The world: slow catch-up', big: 'β = ' + nf(c1.coef, 2), s: 'Poorer economies have grown ' + (c1.coef < 0 ? 'faster' : 'slower') + ' than richer ones since 2000 (p = ' + fp(c1.p) + '), but the income gap halves only about every ' + nf(Wd.conv.half_life, 0) + ' years.', go: '#lab~world' });
    const kw = Wd.het.measures.find(m => m.key === 'mean');
    if (kw) C.push({ t: 'Regions differ on inflation', big: 'p = ' + fp(kw.kw_p), s: 'Average inflation since 2000 ' + (kw.kw_p < 0.05 ? 'differs significantly' : 'does not differ significantly') + ' between world regions (Kruskal–Wallis test).', go: '#lab~world' });
  }
  return C;
}
function conclusionText() {
  const f12 = BD.ensemble.path[BD.ensemble.path.length - 1], now = BD.arima.infl.hist.v.slice(-1)[0];
  const npl = SER('npl').reading, cov = SER('cover').reading;
  const parts = [];
  parts.push('Inflation in Bangladesh is ' + (stdOut(STD.infl, now) ? 'outside' : 'inside') + ' the 2–6% benchmark band at ' + nf(now, 2) + '% and is projected at ' + nf(f12.mean, 2) + '% in a year' + (f12.mean < now ? ', so it should ease, but slowly' : '') + '.');
  if (npl && stdOut(STD.npl, npl.v)) parts.push('Banking-sector stress is the clearest risk, with bad loans at ' + nf(npl.v, 2) + '% of all loans.');
  if (cov) parts.push('Reserves cover ' + nf(cov.v, 2) + ' months of imports, ' + (stdOut(STD.cover, cov.v) ? 'below' : 'above') + ' the 3-month benchmark.');
  parts.push('These are model-based readings of official data, not forecasts by Bangladesh Bank.');
  return parts.join(' ');
}
function resultsSection(bdOnly) {
  const sct = document.createElement('section');
  sct.className = 'block results';
  sct.id = bdOnly ? 'bd-results' : 'results';
  sct.innerHTML = '<div class="block-head"><h2>Results and conclusions</h2><p class="note">Key findings, worked out automatically from the latest data and models. Tap a card for the evidence.</p></div><div class="res-grid">' +
    resultsCards(bdOnly).map(c => '<a class="res-card' + (c.bad ? ' bad' : '') + '" href="' + c.go + '"><span class="res-t">' + esc(c.t) + '</span><b class="res-big' + (c.bad ? ' warn-txt' : '') + '">' + esc(c.big) + '</b><span class="res-s">' + esc(c.s) + '</span><span class="res-go">Evidence →</span></a>').join('') + '</div>' +
    '<div class="concl"><b>Conclusion.</b> ' + esc(conclusionText()) + '</div><p class="src-line"><b>Source:</b> Bangladesh Bank, BBS, World Bank; model estimates.</p>';
  return sct;
}
function benchTable(host) {
  let html = '<thead><tr><th scope="col">Indicator</th><th scope="col">Benchmark range</th><th scope="col">Basis</th></tr></thead><tbody>';
  [['Inflation (headline, food, non-food)', STD.infl], ['Real GDP growth', STD.gdp], ['Import cover of reserves', STD.cover], ['Bank capital to risk-weighted assets', STD.crar], ['Non-performing loans', STD.npl], ['Private credit growth', STD.credit], ['Real lending rate', STD.real], ['Taka depreciation against the US$', STD.dep], ['Current account balance', STD.ca]].forEach(([n, rl]) => { html += '<tr><th scope="row">' + esc(n) + '</th><td>' + esc(rl.txt) + '</td><td>' + esc(rl.src) + '</td></tr>'; });
  tableWrap(host, html + '</tbody>', tcap('Benchmarks used for warnings'), 'A value blinks when it falls outside its range, in either direction. Benchmarks are rules of thumb from the sources shown, not targets set by Bangladesh Bank.', { src: 'IMF, BIS, EBA, Reserve Bank of India; academic sources as listed.' });
}

/* ---------- Front page order: charts, summary, groups, analysis, results, more ---------- */
function initFront() {
  bdMapBox($('#bd-mapbox'));
  const ov = $('#v-overview'), live = $('#live'), peers = $('#peers');
  if (!ov || !live || !peers || $('#results')) return;
  const wrap = peers.parentElement;
  const pw = document.createElement('div');
  pw.className = 'wrap';
  pw.innerHTML = '<p class="eyebrow">3 · Country summary by groups</p>';
  pw.append(peers);
  live.after(pw);
  const band = ov.querySelector('section.band');
  if (band) { const eb = document.createElement('div'); eb.className = 'wrap'; eb.innerHTML = '<p class="eyebrow">4 · Analysis</p>'; band.before(eb); }
  const ins = wrap.querySelector('[aria-labelledby="in-h"]'), pul = wrap.querySelector('[aria-labelledby="pulse-h"]');
  if (pul) wrap.prepend(pul);
  if (ins) wrap.prepend(ins);
  const res = resultsSection(false);
  const e5 = document.createElement('p'); e5.className = 'eyebrow'; e5.textContent = '5 · Results and conclusions';
  const e6 = document.createElement('p'); e6.className = 'eyebrow'; e6.textContent = '6 · More combinations';
  (pul || ins || wrap.firstChild).after(e5, res, e6);
}

/* ---------- Contact form (Google Forms) ---------- */
function initContact() {
  const host = $('#ct-form');
  if (!host) return;
  const url = window.MM_FORM;
  if (!url) { host.innerHTML = '<p class="note">The contact form is being set up. Please check back soon.</p>'; return; }
  const src = url + (url.includes('?') ? '&' : '?') + 'embedded=true';
  host.innerHTML = '<iframe class="ct-frame" src="' + esc(src) + '" title="Contact form" loading="lazy"></iframe><p class="note">If the form doesn’t appear, <a href="' + esc(url) + '" target="_blank" rel="noopener">open it in a new tab</a>.</p>';
}
function addWatermark() { /* watermark is drawn inside charts, tables and cards by CSS (no full-screen layer) */ }
function showProblem(msg) {
  if (document.getElementById('boot-bar')) return;
  const b = document.createElement('div');
  b.id = 'boot-bar';
  b.setAttribute('role', 'alert');
  b.innerHTML = '<span>Part of the page didn’t load. ' + (document.documentElement.classList.contains('owner') && msg ? esc(String(msg).slice(0, 160)) + ' ' : '') + '</span><button type="button" class="btn sm" id="boot-reload">Reload</button>';
  document.body.append(b);
  b.querySelector('#boot-reload').addEventListener('click', () => location.reload());
}
window.addEventListener('error', e => { if (e && e.message && !/ResizeObserver|Script error/.test(e.message)) showProblem(e.message); });
setTimeout(() => { const v = $('#v-overview'); if (v && v.classList.contains('on') && !document.querySelector('#live-grid tr.lt')) showProblem('dashboard not rendered'); }, 12000);

/* ---------- Learn: reference for every key term on the site ---------- */
const LSRC = {
  SNA08: 'European Commission, IMF, OECD, United Nations and World Bank (2009). System of National Accounts 2008. United Nations.',
  BPM6: 'IMF (2009). Balance of Payments and International Investment Position Manual, Sixth Edition (BPM6). International Monetary Fund.',
  CPI20: 'IMF, ILO, Eurostat, UNECE, OECD and World Bank (2020). Consumer Price Index Manual: Concepts and Methods. International Monetary Fund.',
  MFSM16: 'IMF (2016). Monetary and Financial Statistics Manual and Compilation Guide. International Monetary Fund.',
  GFSM14: 'IMF (2014). Government Finance Statistics Manual 2014. International Monetary Fund.',
  FSI19: 'IMF (2019). Financial Soundness Indicators Compilation Guide. International Monetary Fund.',
  BASEL: 'Basel Committee on Banking Supervision (2011). Basel III: A global regulatory framework for more resilient banks and banking systems. Bank for International Settlements.',
  ILO13: 'ILO (2013). Resolution concerning statistics of work, employment and labour underutilization. 19th International Conference of Labour Statisticians.',
  WDI: 'World Bank. World Development Indicators (CC BY 4.0). https://data.worldbank.org',
  ICP: 'World Bank (2024). Purchasing Power Parities and the Size of World Economies: Results from the 2021 International Comparison Program.',
  PIP: 'World Bank. Poverty and Inequality Platform. https://pip.worldbank.org',
  WPP24: 'United Nations DESA (2024). World Population Prospects 2024.',
  WUP18: 'United Nations DESA (2019). World Urbanization Prospects: The 2018 Revision.',
  IGME: 'UN Inter-agency Group for Child Mortality Estimation (UN IGME). Levels and Trends in Child Mortality.',
  UIS: 'UNESCO Institute for Statistics. Literacy rate, adult (15+). https://uis.unesco.org',
  SDG7: 'IEA, IRENA, UNSD, World Bank and WHO. Tracking SDG 7: The Energy Progress Report.',
  IRIIP: 'United Nations Statistics Division (2010). International Recommendations for the Index of Industrial Production 2010.',
  IDS: 'World Bank. International Debt Statistics.',
  IMF11: 'IMF (2011). Assessing Reserve Adequacy. IMF Policy Paper.',
  OECDFDI: 'OECD (2008). OECD Benchmark Definition of Foreign Direct Investment, Fourth Edition.',
  EIA: 'U.S. Energy Information Administration. Spot prices for crude oil and natural gas.',
  FED: 'Board of Governors of the Federal Reserve System. Selected Interest Rates (H.15) and Foreign Exchange Rates (H.10).',
  BLS: 'U.S. Bureau of Labor Statistics. Consumer Price Index for All Urban Consumers (CPI-U).',
  PINK: 'World Bank. Commodity Price Data (the Pink Sheet). CC BY 4.0.',
  BB: 'Bangladesh Bank. Monthly Economic Trends and Major Economic Indicators. https://www.bb.org.bd',
  BBS: 'Bangladesh Bureau of Statistics (BBS). https://bbs.gov.bd',
  EU: 'Treaty on the Functioning of the European Union, Protocol (No 12) on the excessive deficit procedure (reference values of 3% and 60% of GDP).',
  FISHER11: 'Fisher, I. (1911). The Purchasing Power of Money. Macmillan.',
  FISHER30: 'Fisher, I. (1930). The Theory of Interest. Macmillan.',
  FISHER35: 'Fisher, R. A. (1935). The Design of Experiments. Oliver and Boyd.',
  KONUS: 'Konüs, A. A. (1939). The problem of the true index of the cost of living. Econometrica, 7(1), 10–29.',
  CASSEL: 'Cassel, G. (1918). Abnormal deviations in international exchanges. Economic Journal, 28(112), 413–415.',
  BALASSA: 'Balassa, B. (1964). The purchasing-power parity doctrine: A reappraisal. Journal of Political Economy, 72(6), 584–596.',
  SOLOW: 'Solow, R. M. (1956). A contribution to the theory of economic growth. Quarterly Journal of Economics, 70(1), 65–94.',
  OKUN: 'Okun, A. M. (1962). Potential GNP: Its measurement and significance. Proceedings of the Business and Economic Statistics Section, American Statistical Association, 98–104.',
  FGT: 'Foster, J., Greer, J., & Thorbecke, E. (1984). A class of decomposable poverty measures. Econometrica, 52(3), 761–766.',
  GINI: 'Gini, C. (1912). Variabilità e mutabilità. Tipografia di Paolo Cuppini.',
  MISHKIN: 'Mishkin, F. S. (2019). The Economics of Money, Banking and Financial Markets (12th ed.). Pearson.',
  DELL: 'Dell’Ariccia, G., Igan, D., Laeven, L., Tong, H., Bakker, B., & Vandenbussche, J. (2012). Policies for macrofinancial stability: How to deal with credit booms. IMF Staff Discussion Note 12/06.',
  MCK: 'McKinnon, R. I. (1973). Money and Capital in Economic Development. Brookings Institution.',
  GK97: 'Goldberg, P. K., & Knetter, M. M. (1997). Goods prices and exchange rates: What have we learned? Journal of Economic Literature, 35(3), 1243–1272.',
  FR96: 'Frankel, J. A., & Rose, A. K. (1996). Currency crashes in emerging markets: An empirical treatment. Journal of International Economics, 41(3–4), 351–366.',
  FREUND: 'Freund, C. (2005). Current account adjustment in industrial countries. Journal of International Money and Finance, 24(8), 1278–1298.',
  CB02: 'Casella, G., & Berger, R. L. (2002). Statistical Inference (2nd ed.). Duxbury.',
  NEYMAN: 'Neyman, J. (1937). Outline of a theory of statistical estimation based on the classical theory of probability. Philosophical Transactions of the Royal Society A, 236, 333–380.',
  WL16: 'Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on p-values: Context, process, and purpose. The American Statistician, 70(2), 129–133.',
  PEARSON: 'Pearson, K. (1896). Mathematical contributions to the theory of evolution III: Regression, heredity and panmixia. Philosophical Transactions of the Royal Society A, 187, 253–318.',
  SPEARMAN: 'Spearman, C. (1904). The proof and measurement of association between two things. American Journal of Psychology, 15(1), 72–101.',
  WOOLD: 'Wooldridge, J. M. (2020). Introductory Econometrics: A Modern Approach (7th ed.). Cengage.',
  WHITE: 'White, H. (1980). A heteroskedasticity-consistent covariance matrix estimator and a direct test for heteroskedasticity. Econometrica, 48(4), 817–838.',
  MW85: 'MacKinnon, J. G., & White, H. (1985). Some heteroskedasticity-consistent covariance matrix estimators with improved finite sample properties. Journal of Econometrics, 29(3), 305–325.',
  DF79: 'Dickey, D. A., & Fuller, W. A. (1979). Distribution of the estimators for autoregressive time series with a unit root. Journal of the American Statistical Association, 74(366), 427–431.',
  SD84: 'Said, S. E., & Dickey, D. A. (1984). Testing for unit roots in autoregressive-moving average models of unknown order. Biometrika, 71(3), 599–607.',
  KPSS: 'Kwiatkowski, D., Phillips, P. C. B., Schmidt, P., & Shin, Y. (1992). Testing the null hypothesis of stationarity against the alternative of a unit root. Journal of Econometrics, 54(1–3), 159–178.',
  GN74: 'Granger, C. W. J., & Newbold, P. (1974). Spurious regressions in econometrics. Journal of Econometrics, 2(2), 111–120.',
  BOX: 'Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). Time Series Analysis: Forecasting and Control (5th ed.). Wiley.',
  HYND: 'Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice (3rd ed.). OTexts.',
  AIC: 'Akaike, H. (1974). A new look at the statistical model identification. IEEE Transactions on Automatic Control, 19(6), 716–723.',
  SCHWARZ: 'Schwarz, G. (1978). Estimating the dimension of a model. Annals of Statistics, 6(2), 461–464.',
  HQ: 'Hannan, E. J., & Quinn, B. G. (1979). The determination of the order of an autoregression. Journal of the Royal Statistical Society B, 41(2), 190–195.',
  LB: 'Ljung, G. M., & Box, G. E. P. (1978). On a measure of lack of fit in time series models. Biometrika, 65(2), 297–303.',
  HK06: 'Hyndman, R. J., & Koehler, A. B. (2006). Another look at measures of forecast accuracy. International Journal of Forecasting, 22(4), 679–688.',
  TASH: 'Tashman, L. J. (2000). Out-of-sample tests of forecasting accuracy: An analysis and review. International Journal of Forecasting, 16(4), 437–450.',
  DM95: 'Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. Journal of Business & Economic Statistics, 13(3), 253–263.',
  HLN: 'Harvey, D., Leybourne, S., & Newbold, P. (1997). Testing the equality of prediction mean squared errors. International Journal of Forecasting, 13(2), 281–291.',
  BG69: 'Bates, J. M., & Granger, C. W. J. (1969). The combination of forecasts. Operational Research Quarterly, 20(4), 451–468.',
  BFW: 'Britton, E., Fisher, P., & Whitley, J. (1998). The Inflation Report projections: Understanding the fan chart. Bank of England Quarterly Bulletin, 38(1), 30–37.',
  SIMS: 'Sims, C. A. (1980). Macroeconomics and reality. Econometrica, 48(1), 1–48.',
  LUT: 'Lütkepohl, H. (2005). New Introduction to Multiple Time Series Analysis. Springer.',
  HAM: 'Hamilton, J. D. (1994). Time Series Analysis. Princeton University Press.',
  GRANGER: 'Granger, C. W. J. (1969). Investigating causal relations by econometric models and cross-spectral methods. Econometrica, 37(3), 424–438.',
  KW: 'Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association, 47(260), 583–621.',
  BSM: 'Barro, R. J., & Sala-i-Martin, X. (1992). Convergence. Journal of Political Economy, 100(2), 223–251.',
  MRW: 'Mankiw, N. G., Romer, D., & Weil, D. N. (1992). A contribution to the empirics of economic growth. Quarterly Journal of Economics, 107(2), 407–437.',
  SILV: 'Silverman, B. W. (1986). Density Estimation for Statistics and Data Analysis. Chapman and Hall.',
  SCOTT: 'Scott, D. W. (1992). Multivariate Density Estimation: Theory, Practice, and Visualization. Wiley.',
  GALI: 'Galí, J. (2015). Monetary Policy, Inflation, and the Business Cycle (2nd ed.). Princeton University Press.',
  SW07: 'Smets, F., & Wouters, R. (2007). Shocks and frictions in US business cycles: A Bayesian DSGE approach. American Economic Review, 97(3), 586–606.',
  CALVO: 'Calvo, G. A. (1983). Staggered prices in a utility-maximizing framework. Journal of Monetary Economics, 12(3), 383–398.',
  TAYLOR: 'Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.',
  WOOD: 'Woodford, M. (2003). Interest and Prices: Foundations of a Theory of Monetary Policy. Princeton University Press.',
  PHIL: 'Phillips, A. W. (1958). The relation between unemployment and the rate of change of money wage rates in the United Kingdom, 1861–1957. Economica, 25(100), 283–299.',
  HF96: 'Hyndman, R. J., & Fan, Y. (1996). Sample quantiles in statistical packages. The American Statistician, 50(4), 361–365.',
  JB: 'Jarque, C. M., & Bera, A. K. (1980). Efficient tests for normality, homoscedasticity and serial independence of regression residuals. Economics Letters, 6(3), 255–259.',
  RBI: 'Reserve Bank of India. Flexible inflation targeting framework: CPI inflation target of 4% with a band of ±2% (RBI Act, 1934, Section 45ZA).',
  EBA: 'European Banking Authority. Risk Dashboard: thresholds for the non-performing loan ratio.',
  NE: 'Natural Earth. Free vector and raster map data (public domain). https://www.naturalearthdata.com'
};
const Lr = k => { try { const s = SER(k); return (s && s.reading) || {}; } catch (e) { return {}; } };
const Lw = (k, c) => { try { return latestOf(k, c || 'BGD') || [null, null]; } catch (e) { return [null, null]; } };
const Lp = k => { try { return ((RAW.prof || {}).BGD || {})[k] || [null, null]; } catch (e) { return [null, null]; } };
const L2 = v => (v == null || !isFinite(v) ? '–' : nf(v, 2));
const GLOSS = [
  // ---------------- Output and growth
  { id: 'gdp', t: 'Gross domestic product (GDP)', c: 'Output and growth', d: 'The market value of all final goods and services produced within an economy in a period, whoever owns the firms that produce them.',
    f: 'GDP = C + I + G + (X − M) &nbsp;(spending) = Σ value added (production) = Σ incomes (income)',
    m: 'Statistics offices compile GDP from business surveys, administrative and tax records under the System of National Accounts, and reconcile the three approaches. The World Bank converts it to US dollars at official exchange rates.',
    x: () => { const g = Lw('gdp_usd'); return g[1] == null ? '' : 'Bangladesh’s GDP was $' + L2(g[1]) + ' billion in ' + g[0] + ' (current US$).'; },
    th: 'Every taka spent on a final product is income for someone who added value along the supply chain, so production, spending and income measure the same total (the circular flow).',
    p: 'Value added counts each stage once. Wheat sold for 1, flour for 3 and bread for 5 add value of 1 + 2 + 2 = 5, exactly the value of the final bread; adding all sales (1 + 3 + 5 = 9) would double-count.',
    pro: ['One comprehensive, internationally comparable measure of economic size.', 'The three approaches cross-check each other.'],
    con: ['Leaves out unpaid household work and the depletion of natural resources.', 'Informal activity is hard to measure; US-dollar GDP also moves with exchange rates.'],
    n: 'Gross national income (GNI) adds net primary income from abroad. Workers’ remittances are mostly secondary income, so they raise disposable income rather than GDP.', u: ['Countries', '#countries'], s: ['SNA08', 'WDI'] },
  { id: 'growth', t: 'Real GDP growth', c: 'Output and growth', d: 'The percentage change in GDP after removing price changes, that is, in volume terms.',
    f: 'g<sub>t</sub> = (Y<sub>t</sub> ÷ Y<sub>t−1</sub> − 1) × 100, with Y at constant (chain-linked) prices',
    m: 'Volumes are valued at the previous year’s prices and chain-linked. The World Bank reports annual growth; BBS also publishes quarterly year-on-year growth.',
    x: () => { const g = Lw('gdp_growth'), q = Lr('gdp_q'); return (g[1] == null ? '' : 'Bangladesh grew ' + L2(g[1]) + '% in ' + g[0] + ' (World Bank). ') + (q.v == null ? '' : 'Quarterly growth was ' + L2(q.v) + '% year on year in ' + fmtPeriod(q.period) + ' (BBS).'); },
    th: 'In the Solow model, long-run growth in output per person comes from technological progress; more capital and labour raise output but with diminishing returns.',
    p: 'Rule of 70: at a growth rate g, output doubles when (1 + g)<sup>T</sup> = 2, so T = ln 2 ÷ ln(1 + g) ≈ 0.693 ÷ g. With g in per cent, T ≈ 70 ÷ g years (7% growth doubles output in about 10 years).',
    pro: ['Removes inflation, so it shows real changes in production.', 'The standard gauge of the business cycle.'],
    con: ['Revised often; a new base year (Bangladesh moved to 2015–16) changes levels and growth rates.', 'Says nothing about who benefits.'],
    n: 'Bangladesh’s fiscal year runs July to June; the World Bank assigns fiscal-year figures to calendar years by its own rule.', u: ['Real sector', '#bangladesh~real'], s: ['SNA08', 'WDI', 'SOLOW'] },
  { id: 'gdppc', t: 'GDP per person (per capita)', c: 'Output and growth', d: 'GDP divided by the mid-year population: a rough measure of average income.',
    f: 'GDP per person = GDP ÷ population',
    m: 'Shown in current US dollars (market exchange rates) and in PPP international dollars.',
    x: () => { const a = Lw('gdp_pc'), b = Lw('gdp_pc_ppp'); return a[1] == null ? '' : 'Bangladesh: $' + L2(a[1]) + ' at market exchange rates and $' + L2(b[1]) + ' at PPP (' + b[0] + ').'; },
    th: 'Living standards depend on output per person, which rises over time only through higher productivity.',
    pro: ['Simple and comparable across economies.', 'Closely linked to health, education and other outcomes.'],
    con: ['An average that hides inequality.', 'The market-rate version swings with exchange rates.'],
    n: 'Use the PPP version to compare living standards and the market-rate version to compare purchasing power in world markets.', u: ['Compare', '#compare'], s: ['WDI'] },
  { id: 'ppp', t: 'Purchasing power parity (PPP)', c: 'Output and growth', d: 'A conversion rate that equalises the purchasing power of currencies, so one PPP dollar buys the same basket of goods everywhere.',
    f: 'PPP<sub>c</sub> = P<sub>c</sub> ÷ P<sub>US</sub> &nbsp;(basket price in local currency ÷ its US price); &nbsp;GDP<sub>PPP</sub> = GDP<sub>local</sub> ÷ PPP<sub>c</sub>',
    m: 'The International Comparison Program prices hundreds of comparable products in every country; the latest benchmark year is 2021.',
    x: () => { const a = Lw('gdp_pc'), b = Lw('gdp_pc_ppp'); return a[1] && b[1] ? 'Bangladesh’s GDP per person is $' + L2(a[1]) + ' at market rates but $' + L2(b[1]) + ' at PPP, so its price level is about ' + L2(a[1] / b[1] * 100) + '% of the US level.' : ''; },
    th: 'Absolute PPP (Cassel, 1918) says exchange rates move to equalise price levels. It holds poorly in the short run; poorer countries have lower price levels because their non-traded services are cheaper (the Balassa–Samuelson effect).',
    pro: ['Corrects for differences in price levels when comparing living standards.', 'Based on actual price surveys.'],
    con: ['Products are hard to match across very different economies.', 'Benchmarks come every few years and are extrapolated in between.'],
    n: 'PPP rates are for comparing volumes, not for converting money in a bank.', u: ['Explore', '#explore'], s: ['ICP', 'CASSEL', 'BALASSA'] },
  { id: 'invest', t: 'Investment (gross capital formation)', c: 'Output and growth', d: 'Spending on fixed assets such as buildings, machinery and infrastructure, plus changes in inventories, as a share of GDP.',
    f: 'Investment ratio = gross capital formation ÷ GDP × 100',
    m: 'Taken from the national accounts (expenditure side).',
    x: () => { const r = Lr('inv_gdp'); return r.v == null ? '' : 'Bangladesh invested ' + L2(r.v) + '% of GDP in ' + r.period + ' (BBS).'; },
    th: 'Capital accumulation raises output per worker (Solow, 1956), though with diminishing returns.',
    pro: ['Signals future productive capacity.', 'Moves strongly over the business cycle.'],
    con: ['Says nothing about how productive the investment is.', 'Mixes public and private spending.'],
    n: 'A high ratio with slow growth suggests inefficient investment.', u: ['Real sector', '#bangladesh~real'], s: ['SNA08', 'SOLOW'] },
  { id: 'savings', t: 'Gross national savings', c: 'Output and growth', d: 'National disposable income not spent on final consumption, as a share of GDP.',
    f: 'S = GNDI − C − G; &nbsp;and S − I = CA (current-account balance)',
    m: 'From the national accounts and balance of payments.',
    x: () => { const s = Lr('sav_gdp'), i = Lr('inv_gdp'); return s.v == null ? '' : 'Bangladesh saved ' + L2(s.v) + '% of GDP and invested ' + L2(i.v) + '% in ' + s.period + '.'; },
    th: 'A country that saves more than it invests lends the difference to the rest of the world.',
    p: 'Y = C + I + G + (X − M) and GNDI = Y + net income and transfers from abroad. Then S = GNDI − C − G = I + (X − M + net income + net transfers) = I + CA, so S − I = CA.',
    pro: ['Links domestic behaviour to the external balance.', 'Shows how investment is financed.'],
    con: ['Measured as a residual, so errors accumulate.', 'Includes remittance income, which can be volatile.'],
    n: 'The identity holds by accounting, not by behaviour: it shows what must add up, not what causes what.', u: ['Real sector', '#bangladesh~real'], s: ['SNA08', 'BPM6'] },
  { id: 'iip', t: 'Industrial production index', c: 'Output and growth', d: 'A monthly index of output volume in manufacturing, mining and electricity, relative to a base year set to 100.',
    f: 'IIP<sub>t</sub> = Σ w<sub>i</sub> (q<sub>i,t</sub> ÷ q<sub>i,0</sub>) × 100, &nbsp;weights w<sub>i</sub> = base-year value-added shares',
    m: 'BBS surveys a fixed sample of establishments each month.',
    x: () => { const r = Lr('iip'); return r.v == null ? '' : 'Industrial production grew ' + L2(r.v) + '% year on year in ' + fmtPeriod(r.period) + '.'; },
    th: 'Industry is the most cyclical part of output, so the index gives an early read on the economy.',
    pro: ['Timely and monthly.', 'Internationally standard method.'],
    con: ['Covers mostly large and medium firms.', 'Weights age between base-year updates.'], u: ['Real sector', '#bangladesh~real'], s: ['IRIIP', 'BBS'] },
  // ---------------- Prices
  { id: 'inflation', t: 'Inflation (consumer price index)', c: 'Prices', d: 'The rate at which the general level of consumer prices rises, measured by the change in the consumer price index (CPI).',
    f: 'π<sub>t</sub> = (CPI<sub>t</sub> ÷ CPI<sub>t−12</sub> − 1) × 100; &nbsp;CPI<sub>t</sub> = Σ w<sub>i</sub> (p<sub>i,t</sub> ÷ p<sub>i,0</sub>) × 100 (Laspeyres)',
    m: 'Prices of a fixed basket are collected every month; the weights come from household expenditure surveys. Bangladesh’s current CPI has a 2021–22 base.',
    x: () => { const r = Lr('infl'); return r.v == null ? '' : 'Bangladesh’s headline inflation was ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + ', outside the 2–6% benchmark band.'; },
    th: 'The quantity theory (MV = PY) implies that, in the long run, money growing faster than real output raises prices.',
    p: 'A fixed-basket (Laspeyres) index overstates the rise in the cost of living: consumers can switch to goods that became relatively cheaper, so the cheapest way to keep the same living standard costs no more than the old basket at new prices (Konüs, 1939).',
    pro: ['Monthly, widely understood and the basis of most inflation targets.', 'Covers the goods households actually buy.'],
    con: ['Substitution and quality-change bias.', 'Base-year changes break the series if not linked.'],
    n: 'The CPI differs from the GDP deflator, which covers all domestic output and excludes imports.', u: ['Prices and inflation', '#bangladesh~prices'], s: ['CPI20', 'FISHER11', 'KONUS'] },
  { id: 'p2p', t: 'Point-to-point and 12-month average inflation', c: 'Prices', d: 'Point-to-point inflation compares this month’s CPI with the same month a year earlier; the 12-month average compares the average CPI of the last 12 months with the 12 months before.',
    f: 'π<sup>avg</sup><sub>t</sub> = (Σ<sub>k=0..11</sub> CPI<sub>t−k</sub> ÷ Σ<sub>k=12..23</sub> CPI<sub>t−k</sub> − 1) × 100',
    m: 'BBS and Bangladesh Bank publish both every month.',
    x: () => { const a = Lr('infl'), b = Lr('infl_avg'); return a.v == null ? '' : 'In ' + fmtPeriod(a.period) + ': ' + L2(a.v) + '% point-to-point and ' + L2(b.v) + '% as a 12-month average.'; },
    th: 'Averaging smooths monthly noise but reacts slowly, so it lags turning points by several months.',
    pro: ['Point-to-point is timely.', 'The average is stable and suits annual targets.'],
    con: ['Point-to-point is noisy and affected by base effects.', 'The average hides recent changes.'],
    n: 'When point-to-point inflation is below the 12-month average, inflation has started to ease.', u: ['Prices and inflation', '#bangladesh~prices'], s: ['CPI20', 'BB'] },
  { id: 'food', t: 'Food and non-food inflation', c: 'Prices', d: 'Inflation of the food and non-food parts of the CPI basket.',
    f: 'π ≈ w<sub>food</sub> π<sub>food</sub> + (1 − w<sub>food</sub>) π<sub>non-food</sub>',
    m: 'BBS publishes the two sub-indices with their own weights.',
    x: () => { const a = Lr('food'), b = Lr('nonfood'); return a.v == null ? '' : 'In ' + fmtPeriod(a.period) + ', food inflation was ' + L2(a.v) + '% and non-food ' + L2(b.v) + '%.'; },
    th: 'Food prices respond to harvests, world commodity prices and the exchange rate; non-food prices reflect demand, wages and administered prices.',
    pro: ['Shows where price pressure comes from.', 'Food matters most for poorer households.'],
    con: ['Weights reflect an average household.', 'Food prices are volatile.'],
    n: 'Food has a large weight in Bangladesh’s CPI, so food shocks move headline inflation strongly.', u: ['Prices and inflation', '#bangladesh~prices'], s: ['CPI20', 'BBS'] },
  { id: 'linking', t: 'CPI base years and linking', c: 'Prices', d: 'Statistics offices update the basket and base year periodically; old and new series must be linked to make a long history without artificial jumps.',
    f: 'I<sup>link</sup><sub>t</sub> = I<sup>old</sup><sub>t</sub> (t ≤ s); &nbsp;I<sup>new</sup><sub>t</sub> × I<sup>old</sup><sub>s</sub> ÷ I<sup>new</sup><sub>s</sub> (t &gt; s)',
    m: 'This site links Bangladesh’s 1995–96, 2005–06 and 2021–22 bases, switching in the month where the two bases differ least (0.03 points, February 2013).',
    th: 'Linking keeps growth rates within each base and rescales levels at the joining point.',
    pro: ['Gives one consistent long series.', 'Avoids the artificial fall of over 3 points in Table VII’s own series in July 2012.'],
    con: ['The joining month is a judgement.', 'Basket changes still alter the meaning of the index over time.'], u: ['Methods', '#methods'], s: ['CPI20', 'BB'] },
  { id: 'real', t: 'Nominal and real values', c: 'Prices', d: 'Nominal values are in current prices; real values remove inflation using a price index.',
    f: 'Real<sub>t</sub> = Nominal<sub>t</sub> ÷ P<sub>t</sub> × P<sub>base</sub>; &nbsp;real growth ≈ nominal growth − inflation',
    p: '(1 + n) = (1 + r)(1 + π), so r = (1 + n) ÷ (1 + π) − 1. Expanding, n = r + π + rπ; dropping the small term rπ gives r ≈ n − π.',
    th: 'Only real changes measure gains in what people can buy.',
    pro: ['Makes values comparable over time.'], con: ['Depends on the price index chosen.'], u: ['Learn', '#learn'], s: ['SNA08'] },
  { id: 'fisher', t: 'Real interest rate (Fisher equation)', c: 'Prices', d: 'The interest rate minus inflation: what a lender earns in purchasing power.',
    f: '(1 + i) = (1 + r)(1 + π<sup>e</sup>) &nbsp;⇒&nbsp; r ≈ i − π<sup>e</sup>',
    m: 'This site uses the lending rate minus current point-to-point inflation (an after-the-fact measure).',
    x: () => { const r = Lr('real_lend'); return r.v == null ? '' : 'Bangladesh’s real lending rate was ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + '.'; },
    th: 'Fisher (1930): over time, nominal interest rates adjust to expected inflation.',
    p: 'Same algebra as for real values: with r the real rate and π expected inflation, (1 + i) = (1 + r)(1 + π) gives r = i − π − rπ ≈ i − π.',
    pro: ['Shows whether credit is cheap or dear in real terms.'], con: ['Expected inflation is unobserved; current inflation is a proxy.'],
    n: 'Negative real rates mean borrowers repay less than they borrowed in real terms, a sign of financial repression (McKinnon, 1973).', u: ['Interest rates', '#bangladesh~rates'], s: ['FISHER30', 'MCK'] },
  // ---------------- People and work
  { id: 'pop', t: 'Population and population growth', c: 'People and work', d: 'All residents at mid-year, regardless of legal status or citizenship; growth is the annual change.',
    f: 'Growth = ln(P<sub>t</sub> ÷ P<sub>t−1</sub>) × 100',
    m: 'UN population estimates, built from censuses, surveys and vital registration.',
    x: () => { const p = Lw('population'), g = Lw('pop_growth'); return p[1] == null ? '' : 'Bangladesh had ' + L2(p[1]) + ' million people in ' + p[0] + ', growing ' + L2(g[1]) + '% a year.'; },
    th: 'Population growth adds workers but also dependants; its effect on income per person depends on the age structure.',
    pro: ['Basic denominator for per-person measures.'], con: ['Between censuses, figures are projections.'], u: ['Countries', '#country-BGD'], s: ['WPP24', 'WDI'] },
  { id: 'unemp', t: 'Unemployment rate (ILO definition)', c: 'People and work', d: 'People of working age without work, available for work and actively looking for it, as a share of the labour force.',
    f: 'u = U ÷ (E + U) × 100',
    m: 'Labour force surveys; the ILO’s modelled estimates harmonise definitions across countries.',
    x: () => { const u = Lw('unemployment'); return u[1] == null ? '' : 'Bangladesh’s unemployment rate was ' + L2(u[1]) + '% in ' + u[0] + '.'; },
    th: 'Okun (1962): when output grows below its potential, unemployment rises.',
    pro: ['Internationally standard definition.', 'Widely tracked over the business cycle.'],
    con: ['Leaves out discouraged workers.', 'In economies with large informal sectors it stays low while underemployment is high.'], u: ['Countries', '#country-BGD'], s: ['ILO13', 'OKUN'] },
  { id: 'youth', t: 'Youth unemployment', c: 'People and work', d: 'The unemployment rate for people aged 15–24, shown separately for women and men.',
    f: 'u<sub>youth</sub> = U<sub>15–24</sub> ÷ LF<sub>15–24</sub> × 100',
    x: () => { const f = Lw('youth_unemp_f'), m = Lw('youth_unemp_m'); return f[1] == null ? '' : 'Bangladesh (' + f[0] + '): young women ' + L2(f[1]) + '%, young men ' + L2(m[1]) + '%.'; },
    th: 'Young people move between jobs and study, so their rate is typically two to three times the overall rate.',
    pro: ['Highlights barriers to entering work.'], con: ['Students outside the labour force are excluded, so rates can mislead.'], u: ['Countries', '#country-BGD'], s: ['ILO13'] },
  { id: 'lfp', t: 'Labour force participation rate', c: 'People and work', d: 'The share of the working-age population (15 and over) that is employed or looking for work.',
    f: 'LFPR = (E + U) ÷ population<sub>15+</sub> × 100',
    x: () => { const f = Lw('lfp_f'), m = Lw('lfp_m'); return f[1] == null ? '' : 'Bangladesh (' + f[0] + '): women ' + L2(f[1]) + '%, men ' + L2(m[1]) + '%.'; },
    th: 'Participation reflects education, care responsibilities, social norms and pensions.',
    pro: ['Shows how much of the potential workforce is active.'], con: ['Unpaid work is not counted as participation.'], u: ['Countries', '#country-BGD'], s: ['ILO13'] },
  { id: 'demo', t: 'Life expectancy, fertility and child mortality', c: 'People and work', d: 'Life expectancy at birth is the years a newborn would live if today’s death rates stayed the same; total fertility is births per woman over a lifetime at today’s rates; under-5 mortality is deaths before age 5 per 1,000 live births.',
    f: 'TFR = 5 × Σ<sub>a</sub> f<sub>a</sub> &nbsp;(five-year age groups 15–49); &nbsp;e<sub>0</sub> = T<sub>0</sub> ÷ l<sub>0</sub> (life table)',
    m: 'Life tables and birth histories from censuses, surveys and registration, compiled by the UN.',
    x: () => { const l = Lp('life'), f = Lp('fert'), u = Lp('u5mort'); return l[1] == null ? '' : 'Bangladesh: life expectancy ' + L2(l[1]) + ' years, fertility ' + L2(f[1]) + ' births per woman, under-5 mortality ' + L2(u[1]) + ' per 1,000 (latest years).'; },
    th: 'The demographic transition: death rates fall first, then birth rates, creating a temporary bulge of working-age people.',
    pro: ['Summarise health and population dynamics in single numbers.'], con: ['Period measures, not the experience of any real cohort.'],
    n: 'Replacement-level fertility is about 2.1 births per woman.', u: ['Countries', '#country-BGD'], s: ['WPP24', 'IGME'] },
  { id: 'urban', t: 'Urban population, density, literacy and electricity', c: 'People and work', d: 'The urban share uses each country’s own definition of urban areas; density is people per km² of land; adult literacy is the share of people 15+ who can read and write a short simple statement; electricity access is the share of people with a connection.',
    f: 'Density = population ÷ land area',
    x: () => { const a = Lp('urban'), b = Lp('density'), c = Lp('literacy'), d = Lp('elec'); return a[1] == null ? '' : 'Bangladesh: ' + L2(a[1]) + '% urban, ' + L2(b[1]) + ' people per km², adult literacy ' + L2(c[1]) + '%, electricity access ' + L2(d[1]) + '%.'; },
    th: 'Urbanisation and literacy rise with income; dense economies can supply infrastructure more cheaply per person.',
    pro: ['Simple structural indicators.'], con: ['National urban definitions differ, so comparisons are approximate.'], u: ['Countries', '#country-BGD'], s: ['WUP18', 'UIS', 'SDG7'] },
  // ---------------- Poverty and inequality
  { id: 'poverty', t: 'Poverty headcount (international line)', c: 'Poverty and inequality', d: 'The share of people living below the World Bank’s international poverty line for extreme poverty.',
    f: 'P<sub>α</sub> = (1 ÷ n) Σ<sub>y<sub>i</sub> &lt; z</sub> ((z − y<sub>i</sub>) ÷ z)<sup>α</sup>; &nbsp;headcount: α = 0',
    m: 'Household surveys of consumption or income. The line was $2.15 a day in 2017 prices and was raised to $3.00 a day in 2021 prices in June 2025.',
    x: () => { const p = Lw('poverty'); return p[1] == null ? '' : 'Bangladesh: ' + L2(p[1]) + '% of people below the line in ' + p[0] + '.'; },
    th: 'The Foster–Greer–Thorbecke family: α = 1 measures the depth of poverty and α = 2 its severity.',
    pro: ['Comparable across countries.'], con: ['Surveys are infrequent.', 'Measures extreme poverty only.'], u: ['Countries', '#country-BGD'], s: ['PIP', 'FGT'] },
  { id: 'povnat', t: 'National poverty rate', c: 'Poverty and inequality', d: 'The share of people below the national poverty line, set by each country (in Bangladesh, by BBS using the cost of basic needs).',
    f: 'H = number below the national line ÷ population × 100',
    x: () => { const p = Lw('poverty_nat'); return p[1] == null ? '' : 'Bangladesh’s national poverty rate was ' + L2(p[1]) + '% in ' + p[0] + '.'; },
    pro: ['Reflects local living costs and norms.'], con: ['Not comparable across countries.'], u: ['Countries', '#country-BGD'], s: ['BBS', 'WDI'] },
  { id: 'gini', t: 'Gini index', c: 'Poverty and inequality', d: 'A measure of inequality from 0 (everyone has the same) to 100 (one person has everything).',
    f: 'G = 1 − 2∫<sub>0</sub><sup>1</sup> L(p) dp; &nbsp;for data: G = Σ<sub>i</sub>Σ<sub>j</sub> |y<sub>i</sub> − y<sub>j</sub>| ÷ (2n²μ)',
    x: () => { const g = Lw('gini'); return g[1] == null ? '' : 'Bangladesh’s Gini index was ' + L2(g[1]) + ' in ' + g[0] + '.'; },
    th: 'Based on the Lorenz curve L(p): the share of income held by the poorest p of people.',
    p: 'Under perfect equality L(p) = p and the area under it is 1/2. The Gini is the area between the equality line and the Lorenz curve as a share of 1/2: (1/2 − ∫L) ÷ (1/2) = 1 − 2∫L.',
    pro: ['One number, easy to compare.'], con: ['Different distributions can share the same Gini.', 'Usually based on consumption, which understates income inequality.'], u: ['Countries', '#country-BGD'], s: ['GINI', 'PIP'] },
  { id: 'shares', t: 'Income shares (poorest and richest 20%)', c: 'Poverty and inequality', d: 'The share of total income or consumption held by the poorest and the richest fifth of people.',
    f: 'Share<sub>q</sub> = Σ<sub>i ∈ q</sub> y<sub>i</sub> ÷ Σ<sub>i</sub> y<sub>i</sub> × 100',
    x: () => { const b = Lw('bottom20'), t = Lw('top20'); return b[1] == null ? '' : 'Bangladesh (' + b[0] + '): poorest 20% ' + L2(b[1]) + '%, richest 20% ' + L2(t[1]) + '%.'; },
    pro: ['Easy to interpret.'], con: ['Ignores the middle of the distribution.'], u: ['Countries', '#country-BGD'], s: ['PIP'] },
  // ---------------- Money and banking
  { id: 'm2', t: 'Broad money (M2)', c: 'Money and banking', d: 'Currency held by the public plus demand and time deposits at banks.',
    f: 'M2 = currency outside banks + demand deposits + time deposits; &nbsp;growth = (M2<sub>t</sub> ÷ M2<sub>t−12</sub> − 1) × 100',
    m: 'Compiled from the monetary survey of the central bank and commercial banks.',
    x: () => { const r = Lr('m2'); return r.v == null ? '' : 'Bangladesh’s broad money grew ' + L2(r.v) + '% year on year in ' + fmtPeriod(r.period) + '.'; },
    th: 'Quantity theory: MV = PY, so %ΔM + %ΔV = %ΔP + %ΔY. If velocity is stable, money growth above real growth raises prices.',
    pro: ['A broad gauge of liquidity.'], con: ['Velocity is not stable, so the link to inflation is loose in the short run.'],
    n: 'In this site’s SVAR, money growth predicted inflation before 2020 but not since.', u: ['Money and banking', '#bangladesh~money'], s: ['MFSM16', 'BB'] },
  { id: 'rm', t: 'Reserve money and the money multiplier', c: 'Money and banking', d: 'Reserve (base) money is currency issued plus banks’ reserves at the central bank; the multiplier is broad money divided by reserve money.',
    f: 'm = M2 ÷ RM = (1 + c) ÷ (c + r), &nbsp;c = currency ÷ deposits, r = reserves ÷ deposits',
    p: 'M = C + D and RM = C + R. Dividing both by deposits D: M ÷ RM = (C/D + 1) ÷ (C/D + R/D) = (1 + c) ÷ (c + r).',
    x: () => { const r = Lr('rm'); return r.v == null ? '' : 'Reserve money grew ' + L2(r.v) + '% year on year in ' + fmtPeriod(r.period) + '.'; },
    th: 'The central bank controls reserve money more directly than broad money; the multiplier depends on the public’s and banks’ choices.',
    pro: ['Links central-bank operations to the money supply.'], con: ['The multiplier is unstable when banks hold excess reserves.'], u: ['Money and banking', '#bangladesh~money'], s: ['MISHKIN', 'MFSM16'] },
  { id: 'credit', t: 'Private sector credit growth', c: 'Money and banking', d: 'The annual growth of bank lending to firms and households.',
    f: 'Growth = (credit<sub>t</sub> ÷ credit<sub>t−12</sub> − 1) × 100',
    x: () => { const r = Lr('pcredit'); return r.v == null ? '' : 'Private credit grew ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + '.'; },
    th: 'Credit growth above about 20% a year often marks a boom that ends in a bust (Dell’Ariccia and others, 2012); negative growth signals a credit crunch.',
    pro: ['Timely signal of financial conditions.'], con: ['Mixes demand for and supply of credit.'], u: ['Money and banking', '#bangladesh~money'], s: ['DELL', 'BB'] },
  { id: 'npl', t: 'Non-performing loans (NPL) ratio', c: 'Money and banking', d: 'Loans 90 days or more overdue, or otherwise unlikely to be repaid, as a share of all gross loans.',
    f: 'NPL ratio = non-performing loans ÷ gross loans × 100',
    x: () => { const r = Lr('npl'); return r.v == null ? '' : 'Bangladesh’s NPL ratio was ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + ', far above the 8% high-risk benchmark.'; },
    th: 'Bad loans tie up bank capital and income, which reduces new lending.',
    pro: ['Core measure of asset quality.'], con: ['Classification rules differ across countries and change over time.'],
    n: 'The European Banking Authority treats ratios above 8% as high risk.', u: ['Money and banking', '#bangladesh~money'], s: ['FSI19', 'EBA'] },
  { id: 'crar', t: 'Capital to risk-weighted assets (CRAR)', c: 'Money and banking', d: 'Banks’ regulatory capital as a share of their assets weighted by risk.',
    f: 'CRAR = (Tier 1 + Tier 2 capital) ÷ risk-weighted assets × 100',
    m: 'Under Basel III the global minimum is 8% plus a 2.5% conservation buffer (10.5%); Bangladesh Bank requires 10% plus 2.5% (12.5%).',
    x: () => { const r = Lr('crar'); return r.v == null ? '' : 'Bangladesh’s banks had a CRAR of ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + ', against the 12.5% requirement.'; },
    th: 'Capital absorbs losses; riskier assets need more of it.',
    pro: ['International standard of bank solvency.'], con: ['Risk weights can understate true risk.'], u: ['Money and banking', '#bangladesh~money'], s: ['BASEL', 'FSI19', 'BB'] },
  { id: 'cdr', t: 'Credit–deposit ratio', c: 'Money and banking', d: 'Loans and advances as a share of deposits.',
    f: 'CDR = loans ÷ deposits × 100',
    x: () => { const r = Lr('cdr'); return r.v == null ? '' : 'Bangladesh’s banks lent ' + L2(r.v) + '% of their deposits in ' + fmtPeriod(r.period) + '.'; },
    th: 'A high ratio means banks rely on other funding and have less liquidity.',
    pro: ['Simple liquidity check.'], con: ['Ignores the maturity of loans and deposits.'],
    n: 'Bangladesh Bank sets ceilings on this ratio for banks.', u: ['Money and banking', '#bangladesh~money'], s: ['BB'] },
  // ---------------- Interest rates
  { id: 'call', t: 'Call money rate', c: 'Interest rates', d: 'The interest rate on overnight lending between banks.',
    f: 'Weighted average = Σ (rate<sub>j</sub> × volume<sub>j</sub>) ÷ Σ volume<sub>j</sub>',
    x: () => { const r = Lr('call'); return r.v == null ? '' : 'The call money rate averaged ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + '.'; },
    th: 'It reflects day-to-day liquidity and is steered by the central bank’s policy rates.',
    pro: ['Daily signal of money-market conditions.'], con: ['Volatile around holidays and reporting dates.'],
    n: 'In this site’s SVAR it is the strongest predictor of inflation.', u: ['Interest rates', '#bangladesh~rates'], s: ['BB'] },
  { id: 'rates', t: 'Lending and deposit rates, and the spread', c: 'Interest rates', d: 'Weighted average rates that banks charge on loans and pay on deposits; the spread is the difference.',
    f: 'Spread = lending rate − deposit rate',
    x: () => { const l = Lr('lend'), d = Lr('dep'), s = Lr('spread'); return l.v == null ? '' : 'In ' + fmtPeriod(l.period) + ': lending ' + L2(l.v) + '%, deposits ' + L2(d.v) + '%, spread ' + L2(s.v) + ' points.'; },
    th: 'The spread covers banks’ costs, risk and profit; a wide spread can signal inefficiency or bad loans.',
    pro: ['Shows the cost of credit and the return to savers.'], con: ['Averages hide large differences between banks.'], u: ['Interest rates', '#bangladesh~rates'], s: ['BB'] },
  { id: 'policy', t: 'Policy rate and bank rate', c: 'Interest rates', d: 'The central bank’s key interest rates, which it uses to steer short-term market rates; the bank rate is the rate at which Bangladesh Bank lends to banks.',
    x: () => { const r = Lr('bankrate'); return r.v == null ? '' : 'The bank rate was ' + L2(r.v) + '% in ' + fmtPeriod(r.period) + '.'; },
    th: 'Raising the policy rate makes borrowing dearer, cools demand and, with a lag, lowers inflation.',
    pro: ['The main tool of monetary policy.'], con: ['Works with long and variable lags.'], u: ['Interest rates', '#bangladesh~rates'], s: ['BB', 'MISHKIN'] },
  { id: 'ust', t: 'US 10-year Treasury yield', c: 'Interest rates', d: 'The return on 10-year US government bonds, a benchmark for long-term borrowing costs worldwide.',
    x: () => { try { const m = RAW.mk.us10y; const v = String(m.m[1]).split(','); return 'Latest monthly value: ' + L2(+v[v.length - 1]) + '%.'; } catch (e) { return ''; } },
    th: 'Long yields reflect expected short rates plus a term premium.',
    pro: ['Global reference rate.'], con: ['Moved by US conditions, not local ones.'], u: ['Markets', '#markets'], s: ['FED'] },
  // ---------------- External sector
  { id: 'xr', t: 'Exchange rate (Taka per US$) and depreciation', c: 'External sector', d: 'The price of one US dollar in Taka; a higher number means a weaker Taka. Depreciation is the percentage rise over a year.',
    f: 'Depreciation = (e<sub>t</sub> ÷ e<sub>t−12</sub> − 1) × 100, &nbsp;e in Taka per US$',
    x: () => { const a = Lr('xr'), b = Lr('xr_dep'); return a.v == null ? '' : 'In ' + fmtPeriod(a.period) + ', one US dollar cost ' + L2(a.v) + ' Taka, ' + L2(b.v) + '% more than a year earlier.'; },
    th: 'Under a flexible regime the rate balances supply and demand for foreign currency; under a managed regime the central bank intervenes with reserves.',
    pro: ['Key price for trade, remittances and inflation.'], con: ['Official and informal rates can differ.'],
    n: 'A depreciation of 25% or more in a year is a common definition of a currency crash (Frankel and Rose, 1996).', u: ['External sector', '#bangladesh~ext'], s: ['BB', 'FR96'] },
  { id: 'currchange', t: 'Currency change (World Bank data)', c: 'External sector', d: 'This site’s change in a currency’s value against the US dollar, from the official annual exchange rate; positive means the currency strengthened.',
    f: 'Change = (e<sub>t−1</sub> ÷ e<sub>t</sub> − 1) × 100, &nbsp;e in local currency per US$',
    th: 'Using the ratio this way gives the change in the currency’s own value rather than in the dollar’s.',
    pro: ['Comparable across countries.'], con: ['Annual averages hide moves within the year.'], u: ['Rankings', '#rankings'], s: ['WDI'] },
  { id: 'rer', t: 'Real exchange rate and pass-through', c: 'External sector', d: 'The real exchange rate adjusts the nominal rate for prices at home and abroad; pass-through is how much exchange-rate changes feed into domestic prices.',
    f: 'RER = e × P* ÷ P; &nbsp;pass-through β in π<sub>t</sub> = α + β Δe<sub>t</sub> + …',
    x: () => { try { const o = BD.robust.orders[0]; return 'In this site’s SVAR, a Taka depreciation shock raises inflation by up to ' + L2(o.xr_peak) + ' points, peaking after ' + o.xr_at + ' months.'; } catch (e) { return ''; } },
    th: 'Pass-through is usually incomplete and larger where imports are a big share of consumption (Goldberg and Knetter, 1997).',
    pro: ['Explains how currency moves affect inflation.'], con: ['Estimates depend on the model and period.'], u: ['Forecast lab: SVAR', '#lab~var'], s: ['GK97', 'CASSEL'] },
  { id: 'bop', t: 'Balance of payments', c: 'External sector', d: 'The record of all transactions between residents and non-residents: the current account (goods, services, primary and secondary income), the capital account and the financial account. The overall balance is financed by reserves.',
    f: 'Current account + capital account − financial account + net errors and omissions = 0 &nbsp;(BPM6 signs)',
    m: 'Compiled by Bangladesh Bank under BPM6.',
    x: () => { const a = Lr('ca'), b = Lr('bop'); return a.v == null ? '' : 'In ' + a.period + ', the current account was US$ ' + L2(a.v) + ' million and the overall balance US$ ' + L2(b.v) + ' million.'; },
    th: 'Double-entry bookkeeping: every transaction is recorded twice with opposite signs.',
    p: 'Each entry has an equal and opposite counterpart: an export (credit) matches the payment received (a financial asset acquired). Summing all entries therefore gives zero; errors and omissions close any measurement gap.',
    pro: ['Complete picture of external flows.'], con: ['Errors and omissions can be large.'], u: ['External sector', '#bangladesh~ext'], s: ['BPM6', 'BB'] },
  { id: 'ca', t: 'Current-account balance', c: 'External sector', d: 'Exports minus imports of goods and services plus net primary and secondary income; equal to national savings minus investment.',
    f: 'CA = (X − M) + net primary income + net secondary income = S − I',
    x: () => { const c = Lw('current_account'); return c[1] == null ? '' : 'Bangladesh’s current account was ' + L2(c[1]) + '% of GDP in ' + c[0] + '.'; },
    th: 'Persistent large deficits must be financed by borrowing or investment from abroad; deficits above about 5% of GDP often precede adjustment (Freund, 2005).',
    pro: ['Summarises external sustainability.'], con: ['A deficit can reflect healthy investment as well as overspending.'], u: ['Countries', '#country-BGD'], s: ['BPM6', 'FREUND'] },
  { id: 'remit', t: 'Remittances', c: 'External sector', d: 'Personal transfers and compensation of employees received from people working abroad.',
    f: 'Personal remittances = personal transfers + compensation of employees (BPM6)',
    x: () => { const r = Lr('remit'), g = Lr('remit_g'), w = Lw('remittances'); return r.v == null ? '' : 'Bangladesh received US$ ' + L2(r.v) + ' million in ' + fmtPeriod(r.period) + ' (' + L2(g.v) + '% on a year earlier); remittances were ' + L2(w[1]) + '% of GDP in ' + w[0] + '.'; },
    th: 'Remittances support consumption, smooth shocks and supply foreign currency.',
    pro: ['Stable source of foreign exchange.'], con: ['Informal channels (hundi) are not captured.'],
    n: 'Official inflows jump when the gap between official and informal exchange rates narrows.', u: ['External sector', '#bangladesh~ext'], s: ['BPM6', 'BB', 'WDI'] },
  { id: 'fdi', t: 'Foreign direct investment (FDI)', c: 'External sector', d: 'Investment that gives a lasting interest in a firm abroad, defined as owning 10% or more of the voting power.',
    f: 'Net inflows = new FDI liabilities − repayments (BPM6 directional principle)',
    x: () => { const f = Lr('fdi'); return f.v == null ? '' : 'Net FDI was US$ ' + L2(f.v) + ' million in ' + f.period + '.'; },
    th: 'FDI brings capital, technology and access to markets, and is less prone to sudden stops than portfolio flows.',
    pro: ['Long-term, stable financing.'], con: ['Profits flow back out as primary income.'], u: ['External sector', '#bangladesh~ext'], s: ['BPM6', 'OECDFDI'] },
  { id: 'trade', t: 'Exports and imports', c: 'External sector', d: 'Sales of goods and services to, and purchases from, the rest of the world.',
    f: 'Openness = (X + M) ÷ GDP × 100',
    x: () => { const e = Lr('exp'), w = Lw('exports'); return e.v == null ? '' : 'Bangladesh exported US$ ' + L2(e.v) + ' million in ' + fmtPeriod(e.period) + '; exports were ' + L2(w[1]) + '% of GDP in ' + w[0] + '.'; },
    th: 'Trade allows specialisation by comparative advantage.',
    pro: ['Shows integration with the world economy.'], con: ['Monthly shipment and payment data use different concepts.'],
    n: 'This site uses import payments to July 2024 and import shipments afterwards; the two measures differ.', u: ['External sector', '#bangladesh~ext'], s: ['BPM6', 'BB', 'WDI'] },
  { id: 'reserves', t: 'Foreign exchange reserves and import cover', c: 'External sector', d: 'External assets readily available to the central bank; import cover is how many months of imports they could pay for.',
    f: 'Import cover (months) = reserves ÷ (imports over the last 12 months ÷ 12)',
    m: 'Bangladesh Bank publishes gross reserves and the lower BPM6 measure, which excludes assets that are not readily available.',
    x: () => { const r = Lr('res'), c = Lr('cover'); return r.v == null ? '' : 'Gross reserves were US$ ' + L2(r.v) + ' million in ' + fmtPeriod(r.period) + ', covering ' + L2(c.v) + ' months of imports.'; },
    th: 'The IMF’s rule of thumb is at least 3 months of imports; its broader adequacy metric also counts short-term debt and broad money.',
    pro: ['Simple measure of external resilience.'], con: ['Ignores capital-flow risks.'], u: ['External sector', '#bangladesh~ext'], s: ['BPM6', 'IMF11'] },
  { id: 'extdebt', t: 'External debt and debt service', c: 'External sector', d: 'Debt owed to non-residents, as a share of gross national income; debt service is principal and interest paid, as a share of exports.',
    f: 'Debt ratio = external debt ÷ GNI × 100; &nbsp;debt service ratio = (principal + interest) ÷ exports × 100',
    x: () => { const d = Lw('ext_debt'), s = Lw('debt_service'); return d[1] == null ? '' : 'Bangladesh: external debt ' + L2(d[1]) + '% of GNI and debt service ' + L2(s[1]) + '% of exports (' + d[0] + ').'; },
    th: 'Debt is sustainable if it can be serviced without large adjustments; the export ratio measures the ability to pay in foreign currency.',
    pro: ['Standard measures used by the World Bank and IMF.'], con: ['Ignore the currency and maturity of debt.'], u: ['Countries', '#country-BGD'], s: ['IDS'] },
  // ---------------- Public finance
  { id: 'govfin', t: 'Government revenue, tax and expense', c: 'Public finance', d: 'Revenue is taxes, social contributions, grants and other income; tax revenue is compulsory payments to government; expense is spending on operations such as wages, goods and interest.',
    f: 'Tax-to-GDP = tax revenue ÷ GDP × 100',
    m: 'GFSM 2014 standard; Bangladesh’s monthly tax figures come from the National Board of Revenue (NBR).',
    x: () => { const t = Lw('tax'); return t[1] == null ? '' : 'Bangladesh’s tax revenue was ' + L2(t[1]) + '% of GDP in ' + t[0] + ', one of the lowest ratios in the world.'; },
    th: 'Low revenue limits public investment in health, education and infrastructure.',
    pro: ['Core measures of fiscal capacity.'], con: ['Coverage (central versus general government) varies.'], u: ['Fiscal', '#bangladesh~fiscal'], s: ['GFSM14', 'WDI'] },
  { id: 'budget', t: 'Budget balance (cash surplus or deficit)', c: 'Public finance', d: 'Revenue minus expense and net investment in non-financial assets.',
    f: 'Balance = revenue − expense − net acquisition of non-financial assets',
    x: () => { const b = Lw('budget'); return b[1] == null ? '' : 'Bangladesh’s balance was ' + L2(b[1]) + '% of GDP in ' + b[0] + '.'; },
    th: 'Deficits must be financed by borrowing, which adds to debt.',
    pro: ['Simple summary of fiscal stance.'], con: ['Cash figures can be shifted by timing.'],
    n: 'The European Union’s reference value is a deficit of no more than 3% of GDP.', u: ['Countries', '#country-BGD'], s: ['GFSM14', 'EU'] },
  { id: 'debt', t: 'Government debt', c: 'Public finance', d: 'Gross debt liabilities of the central government, as a share of GDP.',
    f: 'Δd = d<sub>t−1</sub>(r − g) ÷ (1 + g) − pb<sub>t</sub> &nbsp;(r interest rate, g growth, pb primary balance)',
    p: 'With debt D, d = D ÷ Y: D<sub>t</sub> = (1 + r)D<sub>t−1</sub> − PB<sub>t</sub>. Dividing by Y<sub>t</sub> = (1 + g)Y<sub>t−1</sub> gives d<sub>t</sub> = d<sub>t−1</sub>(1 + r) ÷ (1 + g) − pb<sub>t</sub>, so Δd = d<sub>t−1</sub>(r − g) ÷ (1 + g) − pb<sub>t</sub>.',
    th: 'Debt falls when growth exceeds the interest rate or the government runs a primary surplus.',
    pro: ['Shows long-term fiscal risk.'], con: ['Excludes guarantees and state enterprises.'],
    n: 'The EU reference value is 60% of GDP; safe levels are lower for emerging economies.', u: ['Countries', '#country-BGD'], s: ['GFSM14', 'EU'] },
  { id: 'nsc', t: 'National savings certificates (Bangladesh)', c: 'Public finance', d: 'Government savings instruments sold to households; net sales are sales minus repayments.',
    f: 'Net sales = sales − encashment (principal repaid)',
    x: () => { const r = Lr('nsav_net'); return r.v == null ? '' : 'Net sales were Tk ' + L2(r.v) + ' crore in ' + fmtPeriod(r.period) + '.'; },
    th: 'When net sales fall, the government must borrow more from banks.',
    pro: ['Non-bank financing of the budget.'], con: ['High rates make them a costly source of funds.'], u: ['Fiscal', '#bangladesh~fiscal'], s: ['BB'] },
  { id: 'govcredit', t: 'Net bank credit to the government', c: 'Public finance', d: 'Banking-system lending to the government minus government deposits.',
    f: 'Growth = (NCG<sub>t</sub> ÷ NCG<sub>t−12</sub> − 1) × 100',
    x: () => { const r = Lr('govcredit'); return r.v == null ? '' : 'It grew ' + L2(r.v) + '% year on year in ' + fmtPeriod(r.period) + '.'; },
    th: 'Heavy bank borrowing by the government can crowd out private credit.',
    pro: ['Timely measure of deficit financing.'], con: ['Moves with the timing of payments.'], u: ['Fiscal', '#bangladesh~fiscal'], s: ['MFSM16', 'BB'] },
  // ---------------- Markets
  { id: 'oil', t: 'Crude oil prices (Brent and WTI)', c: 'Markets', d: 'Benchmark prices for crude oil: Brent from the North Sea and West Texas Intermediate (WTI) from the United States, in US dollars per barrel.',
    th: 'Oil prices move with world demand, supply decisions and geopolitics, and feed into transport and electricity costs.',
    pro: ['Daily, global reference prices.'], con: ['Very volatile.'], u: ['Markets', '#markets'], s: ['EIA'] },
  { id: 'gas', t: 'Natural gas (Henry Hub)', c: 'Markets', d: 'The US benchmark price for natural gas, in US dollars per million British thermal units.',
    pro: ['Key input cost for electricity and fertiliser.'], con: ['Regional: prices in Asia and Europe differ.'], u: ['Markets', '#markets'], s: ['EIA'] },
  { id: 'gold', t: 'Gold price', c: 'Markets', d: 'The monthly average price of gold in US dollars per troy ounce.',
    th: 'Gold is held as a store of value; it often rises when real interest rates fall or uncertainty increases.',
    pro: ['Long history.'], con: ['No income, so its value depends on demand alone.'], u: ['Markets', '#markets'], s: ['PINK'] },
  { id: 'mcap', t: 'Market capitalisation', c: 'Markets', d: 'The total market value of listed companies: share price times shares outstanding.',
    f: 'Market cap = Σ<sub>j</sub> price<sub>j</sub> × shares<sub>j</sub>',
    x: () => { const r = Lr('mcap'); return r.v == null ? '' : 'Bangladesh: Tk ' + L2(r.v) + ' crore in ' + fmtPeriod(r.period) + '.'; },
    pro: ['Size of the equity market.'], con: ['Moves with prices more than with new listings.'], u: ['Capital market', '#bangladesh~cap'], s: ['BB'] },
  // ---------------- Statistics and models
  { id: 'desc', t: 'Mean, median, standard deviation and quartiles', c: 'Statistics and models', d: 'The mean is the average; the median is the middle value; the standard deviation measures spread; the quartiles cut the data into quarters.',
    f: 'x̄ = (1/n)Σx<sub>i</sub>; &nbsp;s = √(Σ(x<sub>i</sub> − x̄)² ÷ (n − 1)); &nbsp;Q1, Q3 = 25th and 75th percentiles',
    x: () => { try { const d = BD.desc[0]; return 'Bangladesh inflation since 2010: mean ' + L2(d.mean) + '%, median ' + L2(d.median) + '%, standard deviation ' + L2(d.sd) + ' points.'; } catch (e) { return ''; } },
    p: 'Why n − 1: E[Σ(x<sub>i</sub> − x̄)²] = (n − 1)σ², because using the sample mean uses up one degree of freedom; dividing by n − 1 makes the variance estimate unbiased (Bessel’s correction).',
    pro: ['Summarise a distribution in a few numbers.'], con: ['The mean is sensitive to outliers; the median is not.'], u: ['Forecast lab: data', '#lab~data'], s: ['CB02', 'HF96'] },
  { id: 'ci', t: 'Confidence interval', c: 'Statistics and models', d: 'A range built so that, in repeated samples, it contains the true value a chosen share of the time, such as 95%.',
    f: 'x̄ ± t<sub>α/2, n−1</sub> × s ÷ √n',
    th: 'Neyman (1937): the probability statement is about the method, not about one particular interval.',
    pro: ['Shows the precision of an estimate.'], con: ['Often misread as the probability that the true value lies inside.'],
    n: 'The bands on the forecast charts are prediction intervals for future values, which are wider.', u: ['Forecast lab: data', '#lab~data'], s: ['NEYMAN', 'CB02'] },
  { id: 'pvalue', t: 'p-value and significance stars', c: 'Statistics and models', d: 'The probability, if the null hypothesis were true, of a result at least as extreme as the one observed. Stars: *** p &lt; 0.01, ** p &lt; 0.05, * p &lt; 0.1.',
    th: 'Small p-values are evidence against the null hypothesis.',
    pro: ['Standard, comparable measure of evidence.'], con: ['Not the probability that the null is true; statistical significance is not the same as importance.'],
    n: 'The American Statistical Association warns against relying on a single threshold.', u: ['Forecast lab', '#lab'], s: ['WL16'] },
  { id: 'corr', t: 'Correlation (Pearson and Spearman)', c: 'Statistics and models', d: 'Measures how closely two variables move together, from −1 to +1. Spearman’s version uses ranks, so it is robust to outliers.',
    f: 'r = Σ(x − x̄)(y − ȳ) ÷ √(Σ(x − x̄)² Σ(y − ȳ)²); &nbsp;ρ = 1 − 6Σd<sub>i</sub>² ÷ (n(n² − 1)) (no ties)',
    th: 'Correlation shows association, not causation.',
    pro: ['Simple summary of a relationship.'], con: ['Pearson captures only straight-line relationships.'], u: ['Forecast lab: world', '#lab~world'], s: ['PEARSON', 'SPEARMAN'] },
  { id: 'ols', t: 'Regression (OLS), R² and robust standard errors', c: 'Statistics and models', d: 'Ordinary least squares fits the line that minimises squared errors; R² is the share of variation explained; robust (HC1) standard errors stay valid when error variance differs across observations.',
    f: 'β̂ = (X′X)<sup>−1</sup>X′y; &nbsp;R² = 1 − SSR ÷ SST; &nbsp;V̂<sub>HC1</sub> = n ÷ (n − k) (X′X)<sup>−1</sup>(Σ û<sub>i</sub>² x<sub>i</sub>x<sub>i</sub>′)(X′X)<sup>−1</sup>',
    p: 'OLS minimises S(β) = (y − Xβ)′(y − Xβ). Setting the derivative to zero gives the normal equations X′(y − Xβ) = 0, so β̂ = (X′X)<sup>−1</sup>X′y.',
    x: () => { try { const r = BD.world.conv.m1; return 'The convergence regression has R² = ' + L2(r.r2) + ' with ' + r.n + ' economies.'; } catch (e) { return ''; } },
    pro: ['Transparent and widely used.'], con: ['Sensitive to outliers and omitted variables.'], u: ['Forecast lab: world', '#lab~world'], s: ['WOOLD', 'WHITE', 'MW85'] },
  { id: 'unitroot', t: 'Stationarity and unit-root tests (ADF, KPSS)', c: 'Statistics and models', d: 'A stationary series has a constant mean and variance; a unit-root series wanders, so shocks to it never fade.',
    f: 'ADF: Δy<sub>t</sub> = α + γy<sub>t−1</sub> + Σφ<sub>j</sub>Δy<sub>t−j</sub> + ε<sub>t</sub>, &nbsp;H<sub>0</sub>: γ = 0 (unit root); &nbsp;KPSS: H<sub>0</sub>: stationary',
    x: () => { try { return 'Bangladesh inflation: ' + BD.unitroot[0].verdict + '.'; } catch (e) { return ''; } },
    th: 'Regressing one unit-root series on another can show a strong but meaningless relationship (spurious regression).',
    pro: ['ADF and KPSS have opposite null hypotheses, so agreement gives a clear verdict.'], con: ['Low power in short samples.'], u: ['Forecast lab: data', '#lab~data'], s: ['DF79', 'SD84', 'KPSS', 'GN74'] },
  { id: 'arima', t: 'ARIMA and seasonal ARIMA', c: 'Statistics and models', d: 'Models that forecast a series from its own past values (AR), past errors (MA) and differences (I); the seasonal version adds 12-month patterns.',
    f: 'φ(L)(1 − L)<sup>d</sup> y<sub>t</sub> = c + θ(L) ε<sub>t</sub>; &nbsp;seasonal: × Φ(L<sup>12</sup>)(1 − L<sup>12</sup>)<sup>D</sup> … Θ(L<sup>12</sup>)',
    m: 'Orders chosen by the Akaike criterion from a grid; re-estimated at every backtest origin.',
    x: () => { try { return 'The model chosen for Bangladesh inflation is ' + BD.arima.infl.spec + '.'; } catch (e) { return ''; } },
    th: 'Box–Jenkins method: identify the model, estimate it, then check the residuals.',
    pro: ['Strong short-term forecasts for a single series.'], con: ['Ignores other variables and structural change.'], u: ['Forecast lab: ARIMA', '#lab~arima'], s: ['BOX', 'HYND'] },
  { id: 'ic', t: 'Information criteria (AIC, BIC, HQIC)', c: 'Statistics and models', d: 'Scores that trade off fit against complexity; lower is better.',
    f: 'AIC = −2 ln L + 2k; &nbsp;BIC = −2 ln L + k ln n; &nbsp;HQIC = −2 ln L + 2k ln ln n',
    th: 'BIC penalises extra parameters more, so it picks smaller models; AIC tends to forecast better.',
    pro: ['Objective model selection.'], con: ['Different criteria can disagree.'], u: ['Forecast lab: SVAR', '#lab~var'], s: ['AIC', 'SCHWARZ', 'HQ'] },
  { id: 'ljung', t: 'Ljung–Box test', c: 'Statistics and models', d: 'Tests whether a model’s residuals still contain autocorrelation.',
    f: 'Q = n(n + 2) Σ<sub>k=1..h</sub> ρ̂<sub>k</sub>² ÷ (n − k) &nbsp;~ χ² with h minus the number of estimated parameters',
    th: 'A good model leaves white-noise residuals; a small p-value means the model misses some pattern.',
    pro: ['Simple diagnostic.'], con: ['Results depend on the number of lags h.'], u: ['Forecast lab: ARIMA', '#lab~arima'], s: ['LB'] },
  { id: 'accuracy', t: 'Forecast accuracy: RMSE, MAE, Theil’s U and skill', c: 'Statistics and models', d: 'RMSE and MAE measure typical forecast errors; Theil’s U and skill compare a model with a naive “no change” forecast.',
    f: 'RMSE = √(Σe² ÷ n); &nbsp;MAE = Σ|e| ÷ n; &nbsp;U = RMSE<sub>model</sub> ÷ RMSE<sub>naive</sub>; &nbsp;skill = 1 − U',
    x: () => { try { const b = BD.arima.infl.backtest[0]; return 'Inflation, 1 month ahead: RMSE ' + L2(b.rmse) + ' points against ' + L2(b.rmse_rw) + ' for the naive forecast.'; } catch (e) { return ''; } },
    pro: ['Easy to interpret in the units of the data.'], con: ['RMSE weights large errors heavily.'], u: ['Forecast lab: projections', '#lab~overview'], s: ['HK06'] },
  { id: 'backtest', t: 'Rolling-origin backtest', c: 'Statistics and models', d: 'Re-estimate the model at each past date, forecast ahead, and compare with what actually happened, using only data available at the time.',
    th: 'Out-of-sample tests guard against models that fit the past but forecast badly.',
    pro: ['Honest measure of real forecasting skill.'], con: ['Needs a long history; results depend on the period chosen.'], u: ['Forecast lab: projections', '#lab~overview'], s: ['TASH'] },
  { id: 'dm', t: 'Diebold–Mariano test', c: 'Statistics and models', d: 'Tests whether two forecasts are equally accurate.',
    f: 'DM = d̄ ÷ √V̂(d̄), &nbsp;d<sub>t</sub> = e<sub>1t</sub>² − e<sub>2t</sub>²; &nbsp;Harvey–Leybourne–Newbold factor √((n + 1 − 2h + h(h − 1)/n) ÷ n)',
    th: 'Allows for autocorrelated forecast errors at longer horizons.',
    pro: ['Standard test of forecast comparison.'], con: ['Low power in small samples.'], u: ['Forecast lab: ARIMA', '#lab~arima'], s: ['DM95', 'HLN'] },
  { id: 'ensemble', t: 'Forecast combination (ensemble)', c: 'Statistics and models', d: 'A weighted average of forecasts from different models.',
    f: 'f<sup>c</sup> = w f<sub>1</sub> + (1 − w) f<sub>2</sub>, &nbsp;w = (1/MSE<sub>1</sub>) ÷ (1/MSE<sub>1</sub> + 1/MSE<sub>2</sub>)',
    p: 'For unbiased forecasts with uncorrelated errors, the combined error variance w²σ₁² + (1 − w)²σ₂² is smallest at w = σ₂² ÷ (σ₁² + σ₂²), which equals the inverse-MSE weight above; the minimum σ₁²σ₂² ÷ (σ₁² + σ₂²) is below both σ₁² and σ₂².',
    x: () => { try { const e = BD.ensemble.path[BD.ensemble.path.length - 1]; return 'The ensemble projects ' + L2(e.mean) + '% inflation in 12 months (80% range ' + L2(e.lo80) + '–' + L2(e.hi80) + '%).'; } catch (e) { return ''; } },
    pro: ['Usually more accurate than any single model.'], con: ['Weights estimated from short samples are noisy.'], u: ['Forecast lab: projections', '#lab~overview'], s: ['BG69'] },
  { id: 'fan', t: 'Fan charts and prediction intervals', c: 'Statistics and models', d: 'Shaded bands showing ranges with a chosen probability (for example 80% or 95%) of containing future values.',
    th: 'Uncertainty widens with the forecast horizon.',
    pro: ['Communicates uncertainty honestly.'], con: ['Bands depend on the assumed error distribution.'], u: ['Forecast lab: projections', '#lab~overview'], s: ['BFW'] },
  { id: 'var', t: 'Vector autoregression (VAR) and structural VAR', c: 'Statistics and models', d: 'A system in which each variable depends on past values of all variables; the structural version identifies separate shocks, here by recursive (Cholesky) ordering.',
    f: 'y<sub>t</sub> = c + A<sub>1</sub>y<sub>t−1</sub> + … + A<sub>p</sub>y<sub>t−p</sub> + u<sub>t</sub>; &nbsp;Σ<sub>u</sub> = PP′, &nbsp;ε<sub>t</sub> = P<sup>−1</sup>u<sub>t</sub>',
    x: () => { try { return 'This site’s SVAR uses ' + BD.var.vars.join(', ') + ', with ' + BD.var.p + ' lags (' + BD.var.sample.join(' to ') + ').'; } catch (e) { return ''; } },
    th: 'Sims (1980) proposed VARs as an alternative to large structural models with doubtful restrictions.',
    pro: ['Captures feedback between variables.'], con: ['Results depend on the ordering; many parameters.'], u: ['Forecast lab: SVAR', '#lab~var'], s: ['SIMS', 'LUT', 'HAM'] },
  { id: 'granger', t: 'Granger causality', c: 'Statistics and models', d: 'x “Granger-causes” y if past values of x help predict y beyond y’s own past.',
    f: 'F-test of H<sub>0</sub>: all coefficients on lags of x in the equation for y are zero',
    x: () => { try { const g = BD.var.granger.find(z => z.effect === 0 && z.cause === 2); return 'The call money rate Granger-causes inflation in Bangladesh (p = ' + fp(g.p) + ').'; } catch (e) { return ''; } },
    th: 'It is about predictability, not true cause and effect.',
    pro: ['Simple, testable notion of influence.'], con: ['Can be fooled by omitted variables and trends.'], u: ['Forecast lab: SVAR', '#lab~var'], s: ['GRANGER'] },
  { id: 'irf', t: 'Impulse responses and variance decomposition', c: 'Statistics and models', d: 'An impulse response traces the effect of a one-time shock over time; the variance decomposition splits forecast uncertainty between shocks.',
    f: 'y<sub>t</sub> = Σ<sub>i</sub> Θ<sub>i</sub> ε<sub>t−i</sub>; &nbsp;FEVD<sub>jk</sub>(h) = Σ<sub>i&lt;h</sub> θ<sub>jk,i</sub>² ÷ Σ<sub>i&lt;h</sub> Σ<sub>k</sub> θ<sub>jk,i</sub>²',
    pro: ['Shows dynamics and the relative importance of shocks.'], con: ['Inherits the identifying assumptions of the SVAR.'], u: ['Forecast lab: SVAR', '#lab~var'], s: ['LUT'] },
  { id: 'placebo', t: 'Placebo and permutation tests', c: 'Statistics and models', d: 'Repeat a test with the timing of the data scrambled; if the real result is not unusual against these placebo results, it is not convincing.',
    f: 'Placebo p-value = share of placebo statistics ≥ the actual statistic',
    x: () => { try { return 'For Taka depreciation and inflation, the placebo p-value is ' + fp(BD.placebo.p_placebo) + '.'; } catch (e) { return ''; } },
    th: 'Randomisation inference (Fisher, 1935) builds the null distribution from the data themselves.',
    pro: ['Few distributional assumptions.'], con: ['Computationally heavy.'], u: ['Forecast lab: robustness', '#lab~robust'], s: ['FISHER35'] },
  { id: 'kw', t: 'Kruskal–Wallis test', c: 'Statistics and models', d: 'A rank-based test of whether several groups come from the same distribution.',
    f: 'H = 12 ÷ (N(N + 1)) Σ<sub>j</sub> R<sub>j</sub>² ÷ n<sub>j</sub> − 3(N + 1)',
    pro: ['Does not assume normal data.'], con: ['Says groups differ, not which ones.'], u: ['Forecast lab: world', '#lab~world'], s: ['KW'] },
  { id: 'conv', t: 'β- and σ-convergence', c: 'Statistics and models', d: 'β-convergence: poorer economies grow faster than richer ones. σ-convergence: the spread of incomes across economies narrows.',
    f: 'g<sub>i</sub> = a + β ln y<sub>i,0</sub> + ε<sub>i</sub>; &nbsp;half-life ≈ ln 2 ÷ (−β ÷ 100); &nbsp;σ<sub>t</sub> = SD(ln y<sub>i,t</sub>)',
    x: () => { try { const c = BD.world.conv; return 'Across economies since 2000, β = ' + L2(c.m1.rows[1].coef) + ', so income gaps halve about every ' + nf(c.half_life, 0) + ' years.'; } catch (e) { return ''; } },
    th: 'The Solow model predicts conditional convergence: economies converge to their own steady states.',
    pro: ['Simple test of catch-up growth.'], con: ['Sensitive to the sample of countries.'], u: ['Forecast lab: world', '#lab~world'], s: ['BSM', 'MRW'] },
  { id: 'kde', t: 'Kernel density (ridgeline “mountain map”)', c: 'Statistics and models', d: 'A smoothed histogram that shows the shape of a distribution.',
    f: 'f̂(x) = (1 ÷ nh) Σ<sub>i</sub> K((x − x<sub>i</sub>) ÷ h); &nbsp;Scott’s bandwidth h ≈ 1.06 σ n<sup>−1/5</sup>',
    pro: ['Shows shape, spread and multiple peaks.'], con: ['Results depend on the bandwidth.'], u: ['Forecast lab: data', '#lab~data'], s: ['SILV', 'SCOTT'] },
  { id: 'dsge', t: 'DSGE model (New Keynesian)', c: 'Statistics and models', d: 'A small model of the whole economy built from households’, firms’ and the central bank’s decisions: an IS curve, a Phillips curve and a Taylor rule.',
    f: 'x<sub>t</sub> = E<sub>t</sub>x<sub>t+1</sub> − (1/σ)(i<sub>t</sub> − E<sub>t</sub>π<sub>t+1</sub>) + d<sub>t</sub>; &nbsp;π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + κx<sub>t</sub> + u<sub>t</sub>; &nbsp;i<sub>t</sub> = φ<sub>π</sub>π<sub>t</sub> + φ<sub>y</sub>x<sub>t</sub> + v<sub>t</sub>',
    m: 'Calibrated to textbook values (not estimated for Bangladesh) and solved by undetermined coefficients.',
    th: 'Prices adjust slowly because only some firms reset prices each period (Calvo, 1983).',
    pro: ['Structural: shows why effects happen.'], con: ['Results depend on assumed parameters.'], u: ['Forecast lab: DSGE', '#lab~dsge'], s: ['GALI', 'SW07', 'CALVO'] },
  { id: 'taylor', t: 'Taylor rule and the Taylor principle', c: 'Statistics and models', d: 'A rule of thumb for setting the policy rate from inflation and the output gap; the principle says the rate should rise more than one for one with inflation.',
    f: 'i = r* + π + 0.5(π − π*) + 0.5x &nbsp;(Taylor, 1993); &nbsp;principle: φ<sub>π</sub> &gt; 1; &nbsp;determinacy: κ(φ<sub>π</sub> − 1) + (1 − β)φ<sub>y</sub> &gt; 0',
    th: 'If the rate rose less than inflation, real rates would fall and fuel more inflation.',
    pro: ['Simple benchmark for policy.'], con: ['Needs estimates of unobserved r* and the output gap.'], u: ['Forecast lab: DSGE', '#lab~dsge'], s: ['TAYLOR', 'WOOD'] },
  { id: 'phillips', t: 'Phillips curve', c: 'Statistics and models', d: 'The relationship between inflation and slack in the economy; its modern form links inflation to expected inflation and the output gap.',
    f: 'π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + κx<sub>t</sub> &nbsp;(New Keynesian Phillips curve)',
    th: 'Phillips (1958) found that wage inflation was higher when unemployment was low.',
    pro: ['Core of inflation theory.'], con: ['The relationship is unstable over time.'], u: ['Forecast lab: DSGE', '#lab~dsge'], s: ['PHIL', 'CALVO', 'GALI'] },
  { id: 'log', t: 'Log scale', c: 'Statistics and models', d: 'An axis on which equal distances mean equal percentage changes.',
    p: 'A series growing at a constant rate g is y<sub>t</sub> = y<sub>0</sub>(1 + g)<sup>t</sup>, so ln y<sub>t</sub> = ln y<sub>0</sub> + t ln(1 + g): a straight line in t.',
    pro: ['Shows growth rates clearly over long periods.'], con: ['Cannot show zero or negative values.'], u: ['Countries', '#countries'], s: ['CB02'] },
  { id: 'percentile', t: 'Percentile and position in history', c: 'Statistics and models', d: 'The share of past observations below the latest value; the “Range” column shows where today sits between the historical minimum and maximum.',
    f: 'Percentile = (number of observations below x) ÷ (n − 1) × 100',
    pro: ['Puts the latest value in context.'], con: ['Depends on the length of history.'], u: ['Bangladesh', '#bangladesh'], s: ['HF96'] },
  { id: 'bench', t: 'Benchmark ranges (warnings)', c: 'Statistics and models', d: 'International rules of thumb that define a comfortable range; a value outside it blinks on this site.',
    m: 'Examples: inflation 2–6% (India’s official target band), import cover at least 3 months (IMF), bank capital at least 12.5% (Bangladesh Bank’s Basel III rule), bad loans at most 8% (EBA).',
    pro: ['Gives a quick, consistent warning signal.'], con: ['Benchmarks are guides, not laws; the right range differs between countries.'], u: ['At a glance', '#bangladesh~glance'], s: ['RBI', 'IMF11', 'BASEL', 'EBA'] }
];
function learnCard(g) {
  let ex = '';
  try { ex = typeof g.x === 'function' ? g.x() : (g.x || ''); } catch (e) { ex = ''; }
  const row = (k, v) => v ? '<div class="lr"><dt>' + k + '</dt><dd>' + v + '</dd></div>' : '';
  const list = a => a && a.length ? '<ul>' + a.map(z => '<li>' + esc(z) + '</li>').join('') + '</ul>' : '';
  return '<details class="lcard" id="term-' + g.id + '" data-cat="' + esc(g.c) + '"><summary><span class="lt-t">' + esc(g.t) + '</span><span class="lt-c">' + esc(g.c) + '</span></summary><dl>' +
    row('Definition', esc(g.d)) + row('Formula', g.f ? '<span class="fx">' + g.f + '</span>' : '') + row('Method', g.m ? esc(g.m) : '') + row('Example', ex ? esc(ex) : '') +
    row('Theory', g.th ? esc(g.th) : '') + row('Proof', g.p ? g.p : '') + row('Strengths', list(g.pro)) + row('Limitations', list(g.con)) + row('Exceptions and notes', g.n ? esc(g.n) : '') +
    row('On this site', g.u ? '<a href="' + g.u[1] + '">' + esc(g.u[0]) + ' →</a>' : '') + row('Sources', '<ol class="lsrc">' + (g.s || []).map(k => '<li>' + esc(LSRC[k] || k) + '</li>').join('') + '</ol>') + '</dl></details>';
}
function initLearnX() {
  const host = $('#learn-groups');
  if (!host) return;
  const cats = [...new Set(GLOSS.map(g => g.c))];
  host.innerHTML = '<div class="block-head"><h2>Key terms</h2><p class="note">' + GLOSS.length + ' terms, each with its definition, formula, method, a live example from this site’s data, the theory behind it (with a proof where one exists), strengths, limitations, exceptions and authoritative sources.</p></div>' +
    '<div class="controls lctl"><label class="field grow"><span>Search the terms</span><input type="search" id="learn-q" placeholder="e.g. inflation, reserves, ARIMA" autocomplete="off"></label></div>' +
    '<div class="lchips" id="learn-cats"><button type="button" class="chip" data-cat="" aria-pressed="true">All</button>' + cats.map(c => '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>').join('') + '</div>' +
    '<p class="note" id="learn-count"></p><div id="learn-list"></div>';
  const st = { q: '', cat: '' };
  const draw = () => {
    const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = GLOSS.filter(g => (!st.cat || g.c === st.cat) && (!terms.length || terms.every(t => (g.t + ' ' + g.d + ' ' + g.c + ' ' + (g.th || '')).toLowerCase().includes(t))));
    $('#learn-count').textContent = hit.length + ' of ' + GLOSS.length + ' terms';
    $('#learn-list').innerHTML = cats.filter(c => hit.some(g => g.c === c)).map(c => '<section class="lgroup"><h3>' + esc(c) + '</h3>' + hit.filter(g => g.c === c).map(learnCard).join('') + '</section>').join('') || '<p class="empty">No terms match. Try another word.</p>';
  };
  $('#learn-q').addEventListener('input', e => { st.q = e.target.value; draw(); });
  $('#learn-cats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; st.cat = b.getAttribute('data-cat'); $$('#learn-cats .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  draw();
  if (LEARN_OPEN) openTerm(LEARN_OPEN);
}
let LEARN_OPEN = null;
function openTerm(id) { const d = document.getElementById('term-' + id); if (d) { d.open = true; d.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' }); } LEARN_OPEN = null; }

/* ---------- FAQ: generated from the site's own data, so answers stay current ---------- */
const FAQ_MAP = { gdp_growth: 'growth', gdp_usd: 'gdp', gdp_pc: 'gdppc', gdp_pc_ppp: 'ppp', investment: 'invest', savings: 'savings', inflation: 'inflation', lending_rate: 'rates', real_rate: 'fisher', money_growth: 'm2', fx: 'xr', fx_change: 'currchange',
  unemployment: 'unemp', youth_unemp_f: 'youth', youth_unemp_m: 'youth', lfp_f: 'lfp', lfp_m: 'lfp', population: 'pop', pop_growth: 'pop', poverty: 'poverty', poverty_nat: 'povnat', gini: 'gini', bottom20: 'shares', top20: 'shares',
  revenue: 'govfin', tax: 'govfin', spending: 'govfin', budget: 'budget', gov_debt: 'debt', current_account: 'ca', exports: 'trade', imports: 'trade', fdi: 'fdi', remittances: 'remit', reserves: 'reserves', ext_debt: 'extdebt', debt_service: 'extdebt', private_credit: 'credit' };
const lnk = (id, t) => ' <a href="#learn~' + id + '">' + esc(t || 'More in Learn') + ' →</a>';
function faqBuild() {
  const Q = [];
  const add = (cat, q, a, src) => Q.push({ id: 'q' + Q.length, cat, q, a: a + (src ? '<span class="fsrc">Source: ' + esc(src) + '</span>' : '') });
  const ownerOn = !!document.querySelector('[data-owner-gate]:not([hidden])');
  // ---- about the site
  add('About the site', 'What is Macroeconomic Monitor and Forecasting?', 'A free website that brings together official statistics for more than 200 economies, a detailed monitor of Bangladesh, and statistical forecasts, explained in plain language with a source under every chart and table.');
  add('About the site', 'Who runs the site?', ownerOn ? 'The site’s owner is named on the About page.' : 'It is an independent website. Ownership details appear on the About page when the owner chooses to publish them.');
  add('About the site', 'Is the site free to use?', 'Yes. There are no fees and no adverts.');
  add('About the site', 'How often is the data updated?', 'World Bank and market data are refreshed automatically every day at 05:30 UTC. Bangladesh data are updated when a new edition of Bangladesh Bank’s Monthly Economic Trends is added, and the models are then re-estimated. The live dashboard on the front page checks for newly published data at the interval you choose.');
  add('About the site', 'Are the projections official forecasts?', 'No. They are statistical projections made by this site’s models from official data. They are not forecasts by Bangladesh Bank, BBS, the World Bank or any other agency.' + lnk('ensemble'));
  add('About the site', 'Why do some values blink?', 'A value blinks when it is outside its international benchmark range, too high or too low; for example inflation outside 2–6% or bad loans above 8% of all loans. The full list of benchmarks and their sources is on the Bangladesh “At a glance” page. You can switch blinking off at the bottom of any page.' + lnk('bench'));
  add('About the site', 'What do the colours in the tables mean?', 'Values sit in coloured pills. Green marks a favourable change and red an unfavourable one; shades of blue show where a value sits among the others in its column; a blinking red pill is outside its benchmark range.');
  add('About the site', 'How do the Month, Quarter, Year and 10 years, 25 years, All buttons work?', 'Each time chart has its own buttons. Month, Quarter and Year change the frequency: rates and flows are averaged and stocks such as reserves use the last value of each period. 10 years, 25 years and All change the time span. A control at the top of each Bangladesh page changes every chart on the page at once, and options that are not available for a series are greyed out.');
  add('About the site', 'What do the labels on the charts show?', 'Bars show their values. Lines show a value at each quarter, or each year where there are no quarters; where lines cross or overlap only one label is shown. Every line ends with its latest value and its date, for example “8.34 · Sep 2026”.');
  add('About the site', 'Why are the source lines so short?', 'Each source line names only the agency that publishes the data, such as Bangladesh Bank, BBS or World Bank. Projections add “model estimates”. Full references, with editions and series codes, are on the Methods page and in the Forecast lab’s References.');
  add('About the site', 'Can I download the data or charts?', 'Downloads are reserved for the site owner. Visitors can see every figure, table and source on the site.');
  add('About the site', 'Why can’t I copy text or print pages?', 'Copying, selecting and printing are switched off to protect the site’s work. Every page also carries a faint watermark with the site’s name.');
  add('About the site', 'Why do I need to sign in?', 'When sign-in is switched on, the front page and the Privacy page are open to everyone, and other pages need a free sign-in with Google. Your first sign-in creates your account.');
  add('About the site', 'What does the site record about me?', 'If you sign in, the site records your name, email address, the date you joined and the pages you open, so the owner can see how the site is used. It is never sold or shared, and you can delete your account and record from the account menu. Details are on the Privacy page.');
  add('About the site', 'How do I contact the site?', 'Use the form on the Contact page. You will get an automatic confirmation by email; replies usually take up to 3 days.');
  add('About the site', 'How do I cite the site?', 'The Methods page has a ready-made citation, including the version date. Please also cite the original publishers of the data, which are named under every chart and table.');
  add('About the site', 'Does the site work on a phone?', 'Yes. Every page adapts to small screens; tables scroll sideways with the first column fixed.');
  // ---- pages
  [['Overview', 'overview', 'the live dashboard, a map of Bangladesh, summary panels, Bangladesh beside its peers, world analysis, and automatically written results and conclusions'],
   ['Bangladesh', 'bangladesh', 'Bangladesh’s economy by sector, grouped as in Bangladesh Bank’s Weekly Selected Economic Indicators, with key-indicator tables, charts and model readings, plus a catalogue of 6,910 series'],
   ['Forecast lab', 'lab', 'projections, summary statistics, unit-root tests, ARIMA models, a structural VAR, robustness and placebo checks, a DSGE model, world analysis and references'],
   ['Countries', 'countries', 'a profile of any of 217 economies: key figures, a map with geography and people, and charts with their own time controls'],
   ['Compare', 'compare', 'up to eight economies on one indicator, with ready-made groups such as SAARC or the G7'],
   ['Explore', 'explore', 'how two indicators relate across economies, animated over time'],
   ['World map', 'map', 'any indicator mapped across the world for any year'],
   ['Rankings', 'rankings', 'economies ranked on any indicator, by region and year'],
   ['Markets', 'markets', 'oil, gas, gold, US interest rates and inflation, and 22 exchange rates'],
   ['Learn', 'learn', 'every key term explained with its definition, formula, method, example, theory, strengths, limitations and sources'],
   ['Methods', 'methods', 'how the data are collected, checked and transformed, and how to cite the site'],
   ['FAQ', 'faq', 'answers to common questions, built from the site’s own data'],
   ['Contact', 'contact', 'the contact form'],
   ['Privacy', 'privacy', 'what the site records and how to delete it']].forEach(([n, h, d]) => add('Pages', 'What can I do on the ' + n + ' page?', 'You will find ' + d + '. <a href="#' + h + '">Open ' + esc(n) + ' →</a>'));
  // ---- world indicators: meaning, source, coverage, benchmark
  Object.keys(IND).forEach(k => {
    const I = IND[k];
    if (!I || !I.label) return;
    const L = FAQ_MAP[k];
    add('World indicators', 'What does “' + I.label + '” measure?', esc(I.desc || '') + ' ' + esc(I.why || '') + ' It is measured as: ' + esc(I.unit || '') + '.' + (L ? lnk(L) : ''), shortSrc(I.src));
    const cv = typeof COV !== 'undefined' && COV[k];
    if (cv) add('World indicators', 'Which years and economies does “' + I.label + '” cover?', 'Data run from ' + cv.first + ' to ' + cv.last + '. The most complete recent year is ' + cv.best + ', with figures for ' + cv.n + ' economies.', shortSrc(I.src));
    const sd = stdOf(k);
    if (sd) add('World indicators', 'What is a normal range for “' + I.label + '”?', 'This site uses the benchmark ' + esc(sd.txt) + ' (' + esc(sd.src) + '). Values outside it blink.' + lnk('bench'));
  });
  // ---- Bangladesh series: live answers
  Object.keys(BD.series).forEach(k => {
    const s = BD.series[k], r = s.reading;
    if (!r || r.v == null) return;
    const sd = stdOf(k);
    add('Bangladesh data', 'What is Bangladesh’s latest ' + s.label.toLowerCase() + (s.sub ? ' (' + s.sub + ')' : '') + '?', 'It was <b>' + nf(r.v, 2) + '</b> ' + esc(s.unit) + ' in ' + esc(fmtPeriod(r.period)) + (r.ya != null ? ', compared with ' + nf(r.ya, 2) + ' a year earlier' : '') + '.' + (sd ? (stdOut(sd, r.v) ? ' That is outside the benchmark (' + esc(sd.txt) + ').' : ' That is within the benchmark (' + esc(sd.txt) + ').') : '') + ' <a href="#bangladesh~' + s.chunk + '">See the chart →</a>', srcKeys([k]).replace(/\.$/, ''));
  });
  // ---- Bangladesh beside its peers: combinations of economies and indicators
  const EM = EMAPB();
  const PE = ['gdp_growth', 'inflation', 'unemployment', 'current_account', 'gdp_pc_ppp', 'exports'];
  const bd = {};
  PE.forEach(k => { bd[k] = latestOf(k, 'BGD'); });
  PEER_GROUPS.forEach(([g, codes]) => codes.filter(c => c !== 'BGD' && EM[c]).forEach(c => PE.forEach(k => {
    const a = bd[k], b = latestOf(k, c), I = IND[k];
    if (!a || !b || !I) return;
    const d = a[1] - b[1];
    add('Bangladesh and its peers', 'How does Bangladesh compare with ' + EM[c][1] + ' on ' + I.label.toLowerCase() + '?', 'Bangladesh: <b>' + nf(a[1], 2) + '</b> (' + a[0] + '); ' + esc(EM[c][1]) + ': <b>' + nf(b[1], 2) + '</b> (' + b[0] + '). Bangladesh is ' + nf(Math.abs(d), 2) + (/%/.test(I.unit) ? ' points ' : ' ') + (d >= 0 ? 'higher' : 'lower') + '. Unit: ' + esc(I.unit) + '. <a href="#compare~' + k + '~BGD.' + c + '">Compare over time →</a>', 'World Bank');
  })));
  // ---- forecasts and findings: live answers
  try {
    const e = BD.ensemble.path, f = e[e.length - 1], now = BD.arima.infl.hist.v.slice(-1)[0];
    add('Forecasts and findings', 'What is the inflation outlook for Bangladesh?', 'The models project <b>' + nf(f.mean, 2) + '%</b> for ' + esc(fmtPeriod(mLabAdd(BD.ensemble.start, e.length - 1))) + ', from ' + nf(now, 2) + '% now, with an 80% range of ' + nf(f.lo80, 2) + '–' + nf(f.hi80, 2) + '%. <a href="#lab~overview">See the projection →</a>', 'Bangladesh Bank, BBS; model estimates');
    const b1 = BD.ensemble.backtest[0];
    add('Forecasts and findings', 'How accurate are the inflation forecasts?', 'In a rolling backtest, one-month-ahead errors averaged ' + nf(b1.rmse_ens, 2) + ' points (RMSE), against ' + nf(b1.rmse_rw, 2) + ' for a naive “no change” forecast. Monthly inflation is hard to beat because it moves slowly.' + lnk('accuracy'), 'Model estimates');
    const gp = i => (BD.var.granger.find(x => x.effect === 0 && x.cause === i) || {}).p;
    add('Forecasts and findings', 'What drives inflation in Bangladesh?', 'In the structural VAR, the call money rate helps predict inflation (p = ' + fp(gp(2)) + '), Taka depreciation adds ' + (gp(3) < 0.05 ? 'significant' : 'weak') + ' information (p = ' + fp(gp(3)) + '), and money growth adds ' + (gp(1) < 0.05 ? 'significant' : 'little') + ' (p = ' + fp(gp(1)) + ').' + lnk('granger'), 'Model estimates');
    const npl = SER('npl').reading, crar = SER('crar').reading;
    add('Forecasts and findings', 'How healthy are Bangladesh’s banks?', 'Bad loans were ' + nf(npl.v, 2) + '% of all loans in ' + esc(fmtPeriod(npl.period)) + ' (benchmark: at most 8%), and the capital ratio was ' + nf(crar.v, 2) + '% (requirement: 12.5%). Both point to serious stress.' + lnk('npl'), 'Bangladesh Bank');
    const cov = SER('cover').reading;
    add('Forecasts and findings', 'Are Bangladesh’s foreign exchange reserves adequate?', 'Reserves covered ' + nf(cov.v, 2) + ' months of imports in ' + esc(fmtPeriod(cov.period)) + ', ' + (stdOut(STD.cover, cov.v) ? 'below' : 'above') + ' the IMF’s 3-month rule of thumb.' + lnk('reserves'), 'Bangladesh Bank');
  } catch (err) { /* model results optional */ }
  // ---- models and methods (short answers that point to Learn)
  GLOSS.filter(g => g.c === 'Statistics and models').forEach(g => add('Models and methods', 'What is ' + (/^[A-Z]/.test(g.t) && !/^(DSGE|ARIMA)/.test(g.t) ? g.t.charAt(0).toLowerCase() + g.t.slice(1) : g.t) + '?', esc(g.d) + lnk(g.id, 'Formula, theory and sources')));
  // ---- data sources
  [['World Bank', 'World Development Indicators for 217 economies, country profiles and gold prices.', 'Free to reuse with credit under CC BY 4.0.'],
   ['Bangladesh Bank', 'Money, banking, interest rates, the external sector, fiscal financing and the capital market, from Monthly Economic Trends and the National Summary Data Page.', 'Public statistics; please credit Bangladesh Bank.'],
   ['BBS', 'Consumer prices, national accounts and industrial production for Bangladesh.', 'Public statistics; please credit BBS.'],
   ['IMF', 'Statistical standards (BPM6, the CPI Manual and others) and the direction-of-trade tables in the Bangladesh catalogue.', 'Follow the IMF’s copyright terms when reusing.'],
   ['ADB', 'Listed as a reference for Asian data; not yet used for the charts.', 'Follow ADB’s terms of use.'],
   ['EIA', 'Daily and monthly oil and natural gas prices.', 'US government data, generally free to reuse with credit.'],
   ['Federal Reserve', 'The US 10-year Treasury yield and exchange rates.', 'Free to reuse with credit.'],
   ['BLS', 'US consumer prices.', 'US government data, generally free to reuse with credit.'],
   ['Natural Earth', 'Country outlines, capitals, cities, rivers and Bangladesh’s divisions.', 'Public domain.']].forEach(([n, what, lic]) => {
    add('Data sources', 'What does the site use from ' + n + '?', esc(what));
    add('Data sources', 'Can I reuse ' + n + ' data from this site?', esc(lic) + ' Always cite the original publisher as well as this site.');
  });
  add('Data sources', 'Where can I find every country’s central bank and statistics office?', 'The Forecast lab’s References link the Bank for International Settlements’ directory of central banks and the UN Statistics Division’s directory of national statistics offices.');
  return Q;
}
function initFAQ() {
  const host = $('#faq-body');
  if (!host || !BD) return;
  const Q = faqBuild();
  const cats = [...new Set(Q.map(q => q.cat))];
  const st = { q: '', cat: '', show: 60 };
  $('#faq-ctl').innerHTML = '<div class="controls"><label class="field grow"><span>Search ' + Q.length + ' questions</span><input type="search" id="faq-q" placeholder="e.g. inflation, reserves, India, sign in" autocomplete="off"></label></div>' +
    '<div class="lchips" id="faq-cats"><button type="button" class="chip" data-cat="" aria-pressed="true">All (' + Q.length + ')</button>' + cats.map(c => '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) + ' (' + Q.filter(q => q.cat === c).length + ')</button>').join('') + '</div>';
  const draw = () => {
    const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = Q.filter(q => (!st.cat || q.cat === st.cat) && (!terms.length || terms.every(t => (q.q + ' ' + q.a).toLowerCase().includes(t))));
    host.innerHTML = '<p class="note">' + hit.length + ' question' + (hit.length === 1 ? '' : 's') + '</p>' + hit.slice(0, st.show).map(q => '<details class="fq" id="faq-' + q.id + '"><summary>' + esc(q.q) + '</summary><div class="fa">' + q.a + '</div></details>').join('') +
      (hit.length > st.show ? '<button type="button" class="btn" id="faq-more">Show all ' + hit.length + '</button>' : '') + (hit.length ? '' : '<p class="empty">No questions match. Try another word.</p>');
    const more = $('#faq-more');
    if (more) more.addEventListener('click', () => { st.show = 100000; draw(); });
  };
  $('#faq-q').addEventListener('input', e => { st.q = e.target.value; st.show = 60; draw(); });
  $('#faq-cats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; st.cat = b.getAttribute('data-cat'); st.show = 60; $$('#faq-cats .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  draw();
}

/* ---------- Blinking warnings: on by default, with an off switch ---------- */
function initBlink() {
  let on = !RM;
  try { const st = JSON.parse(localStorage.getItem('mm.blink')); if (typeof st === 'boolean') on = st && !RM; } catch (e) { /* default */ }
  const set = v => { on = v; document.documentElement.classList.toggle('no-blink', !v); const b = $('#blink-tg'); if (b) b.textContent = v ? 'Blinking warnings: on' : 'Blinking warnings: off'; };
  set(on);
  const b = $('#blink-tg');
  if (b) b.addEventListener('click', () => { set(!on); try { localStorage.setItem('mm.blink', JSON.stringify(on)); } catch (e) { /* private mode */ } liveSpot(); });
}

/* ---------- Front page: live dashboard ---------- */
const LIVE = { int: 60, paused: false, i: 0, next: 0, tiles: [], timer: null, checked: null, offline: false, newData: false, st: { freq: 'M', span: 'all' } };
const MKSRC = { brent: 'EIA.', wti: 'EIA.', gas: 'EIA.', gold: 'World Bank.', us10y: 'Federal Reserve.', uscpi: 'BLS.' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtPeriod(p, f) {
  p = String(p);
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return +p.slice(8) + ' ' + MON[+p.slice(5, 7) - 1] + ' ' + p.slice(0, 4);
  if (/^\d{4}-\d{2}$/.test(p)) return MON[+p.slice(5, 7) - 1] + ' ' + p.slice(0, 4);
  if (/^\d{4}-Q\d$/.test(p)) return p.slice(5) + ' ' + p.slice(0, 4);
  return p;
}
function csvSeries(arr) { if (!Array.isArray(arr) || arr.length < 2) return []; const st = String(arr[0]); return String(arr[1]).split(',').map((v, i) => [mLabAdd(st, i), v === '' ? null : +v]).filter(x => x[1] != null && isFinite(x[1])); }
function wdiSeries(key, code) { const s = RAW.s && RAW.s[key] && RAW.s[key][code]; if (!s) return []; return String(s[1]).split(',').map((v, i) => [String(+s[0] + i), v === '' ? null : +v]).filter(x => x[1] != null && isFinite(x[1])); }
function sparkVals(v) {
  v = v.filter(x => x != null && isFinite(x));
  if (v.length < 3) return '';
  const mn = Math.min(...v), mx = Math.max(...v), w = 120, h = 22;
  const xy = v.map((x, i) => [(i * (w - 6) / (v.length - 1) + 3), mx === mn ? h / 2 : (h - 3) - (x - mn) / (mx - mn) * (h - 6)]);
  const l = xy[xy.length - 1];
  return '<svg class="spk" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + xy.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/><circle cx="' + l[0].toFixed(1) + '" cy="' + l[1].toFixed(1) + '" r="2.4" fill="var(--signal)"/></svg>';
}
function liveTiles() {
  const T = [];
  const bd = (key, label, unit, scale, dec) => {
    const s = SER(key);
    if (!s || !s.series) return;
    const p = s.series;
    const pts = p.v.map((v, i) => [bdLab(p.f, p.k0 + i), v == null ? null : v / (scale || 1)]).filter(x => x[1] != null);
    if (pts.length > 1) T.push({ grp: 'Bangladesh', label, unit, pts, dir: DIR[key] || 0, dec, src: srcKeys([key], s.how !== 'raw'), href: '#bangladesh~' + s.chunk, freq: p.f, std: stdOf(key) });
  };
  bd('infl', 'Inflation', '% y/y', 1, 2); bd('food', 'Food inflation', '% y/y', 1, 2); bd('xr', 'Taka per US$', 'Tk', 1, 2); bd('res', 'FX reserves', 'US$ bn', 1000, 1);
  bd('remit_g', 'Remittances', '% y/y', 1, 1); bd('exp_g', 'Exports', '% y/y', 1, 1); bd('call', 'Call money rate', '%', 1, 2); bd('pcredit', 'Private credit', '% y/y', 1, 2);
  const w = (key, code, label, dir) => { const pts = wdiSeries(key, code); if (pts.length > 1) T.push({ grp: 'World', label, unit: '%', pts, dir, dec: 1, src: 'World Bank.', href: '#country-' + code, freq: 'A', std: stdOf(key) }); };
  w('gdp_growth', 'WLD', 'World growth', 1); w('inflation', 'WLD', 'World inflation', -1); w('gdp_growth', 'SAS', 'South Asia growth', 1); w('gdp_growth', 'EAS', 'East Asia & Pacific growth', 1);
  const mk = (key, label, unit, dec) => {
    const m = RAW.mk && RAW.mk[key];
    if (!m) return;
    const daily = Array.isArray(m.d) && m.d.length > 20;
    const pts = daily ? m.d.map(x => [String(x[0]), +x[1]]).filter(x => isFinite(x[1])) : csvSeries(m.m);
    if (pts.length > 1) T.push({ grp: 'Markets', label, unit, pts, dir: 0, dec, src: MKSRC[key], href: '#markets', freq: daily ? 'D' : 'M' });
  };
  mk('brent', 'Brent crude', 'US$/bbl', 2); mk('wti', 'WTI crude', 'US$/bbl', 2); mk('gas', 'Natural gas', 'US$/MMBtu', 2); mk('gold', 'Gold', 'US$/oz', 0); mk('us10y', 'US 10-year yield', '%', 2); mk('uscpi', 'US inflation', '% y/y', 1);
  return T;
}
function shortPer(p) {
  p = String(p);
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return +p.slice(8) + ' ' + MON[+p.slice(5, 7) - 1] + ' ’' + p.slice(2, 4);
  if (/^\d{4}-\d{2}$/.test(p)) return MON[+p.slice(5, 7) - 1] + ' ’' + p.slice(2, 4);
  if (/^\d{4}-Q\d$/.test(p)) return p.slice(5) + ' ’' + p.slice(2, 4);
  return p;
}
function tileHTML(t, i) {
  const n = t.pts.length, last = t.pts[n - 1], prev = t.pts[n - 2];
  const v = last[1], d = prev ? v - prev[1] : null;
  const lvl = !/%/.test(t.unit);
  const c = d == null ? null : lvl ? (prev[1] ? (v / prev[1] - 1) * 100 : null) : d;
  const cls = d == null || !t.dir ? 'nt' : d * t.dir > 0 ? 'gd' : d * t.dir < 0 ? 'bd' : 'nt';
  const lagN = { M: 12, Q: 4, A: 1, FY: 1 }[t.freq];
  let ya = lagN && n > lagN ? t.pts[n - 1 - lagN][1] : null;
  if (t.freq === 'D') { const cut = new Date(new Date(last[0]).getTime() - 365 * 864e5).toISOString().slice(0, 10); const q = t.pts.filter(x => x[0] <= cut).pop(); ya = q ? q[1] : null; }
  const bd312 = band312(t.pts.map(x => x[1]));
  const so = t.std ? stdOut(t.std, v) : !!(bd312 && bd312.out);
  const ct = c == null ? '–' : (c > 0 ? '▲ +' : c < 0 ? '▼ ' : '') + nf(c, 2) + (lvl ? '%' : ' pp');
  const since = { D: 'on the day', M: 'on the month', Q: 'on the quarter', A: 'on the year', FY: 'on the year' }[t.freq] || '';
  return '<tr class="lt' + (i === LIVE.i ? ' on' : '') + (so ? ' lt-warn' : '') + '" data-lt="' + i + '" tabindex="0" title="' + esc(so ? (t.std ? stdMsg(t.std, v) + ': ' + t.std.src : bandMsg(bd312)) : t.label + ', ' + fmtPeriod(last[0])) + '">' +
    '<th scope="row">' + esc(t.label) + '</th><td class="sv"><span class="cell' + (so ? ' warn' : '') + '">' + nf(v, 2) + '</span><small>' + esc(t.unit) + '</small></td>' +
    '<td class="sc ' + cls + '" title="Change ' + since + '">' + ct + '</td><td class="sp">' + esc(shortPer(last[0])) + '</td></tr>';
}
function liveRender() {
  const host = $('#live-grid');
  if (!host) return;
  const meta = { Bangladesh: ['Bangladesh Bank, BBS', 'g-bd'], World: ['World Bank', 'g-wd'], Markets: ['EIA, Fed, BLS, World Bank', 'g-mk'] };
  host.innerHTML = '<div class="sumgrid">' + ['Bangladesh', 'World', 'Markets'].map(g => '<section class="sumcard ' + meta[g][1] + '" aria-label="' + g + '"><header><b>' + g + '</b><span>' + esc(meta[g][0]) + '</span></header>' +
    '<table class="sumtab"><thead><tr><th scope="col">Indicator</th><th scope="col" class="r">Latest</th><th scope="col" class="r">Change</th><th scope="col" class="r">Date</th></tr></thead><tbody>' +
    LIVE.tiles.map((t, i) => t.grp === g ? tileHTML(t, i) : '').join('') + '</tbody></table></section>').join('') + '</div>' +
    '<p class="sum-note">Tap a row to show it in the chart above. A blinking red value is outside its international benchmark range.</p>';
}
function liveSpot() {
  const host = $('#live-spot');
  const t = LIVE.tiles[LIVE.i];
  if (!host || !t) return;
  disposeIn(host);
  host.innerHTML = '';
  const pts = t.freq === 'D' ? t.pts.slice(-260) : t.freq === 'A' ? t.pts.filter(x => +x[0] >= 1990) : t.pts.slice(-72);
  const span = t.freq === 'D' ? 'daily, last 12 months' : t.freq === 'A' ? 'annual, since 1990' : 'monthly, last 6 years';
  const f = figure(host, { state: LIVE.st, num: false, badge: 'Spotlight ' + (LIVE.i + 1) + ' of ' + LIVE.tiles.length, wide: true, title: t.label + (t.grp === 'Bangladesh' ? ', Bangladesh' : ''), sub: t.unit + '; ' + span, h: 250, source: t.src,
    render: TH => tsOption(TH, pts.map(x => x[0]), [S(t.label, pts.map(x => x[1]), { color: TH.pal[0], area: 0.12, end: true, dec: t.dec, w: 2.2 })], { y1: t.unit, scale: true, events: t.freq === 'M', dec: t.dec, warn: t.std ? [{ s: 0, test: v => stdOut(t.std, v), label: '', rule: t.std }] : [] }) });
  const a = document.createElement('a');
  a.href = t.href; a.className = 'live-open'; a.textContent = 'Open the full page →';
  f.querySelector('.fig-act').append(a);
}
function liveStatus() {
  const n = $('#live-status');
  if (!n) return;
  const bdp = SER('infl') && SER('infl').reading ? fmtPeriod(SER('infl').reading.period) : '';
  const sec = LIVE.paused || !LIVE.int ? null : Math.max(0, Math.ceil((LIVE.next - Date.now()) / 1000));
  n.innerHTML = (sec == null ? '<span class="live-off">Paused</span>' : '<span class="live-on">Live</span> · next refresh in ' + sec + ' s') + (LIVE.checked ? ' · checked ' + LIVE.checked.toLocaleTimeString('en-GB') : '');
}
async function liveCheck() {
  LIVE.checked = new Date();
  if (!/^https?:$/.test(location.protocol)) { LIVE.offline = true; return; }
  try {
    const r = await fetch('live.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    LIVE.offline = false;
    if (j.built && RAW.meta && j.built !== RAW.meta.built) location.reload();
  } catch (e) { LIVE.offline = true; }
}
function liveSchedule() {
  clearTimeout(LIVE.timer);
  const prog = $('#live-prog');
  if (prog) { prog.style.transition = 'none'; prog.style.transform = 'scaleX(0)'; }
  if (LIVE.paused || !LIVE.int) { liveStatus(); return; }
  LIVE.next = Date.now() + LIVE.int * 1000 + (LIVE.int >= 30 ? Math.random() * 5000 : 0);
  if (prog && !RM) { void prog.offsetWidth; prog.style.transition = 'transform ' + LIVE.int + 's linear'; prog.style.transform = 'scaleX(1)'; }
  LIVE.timer = setTimeout(liveTick, LIVE.int * 1000);
  liveStatus();
}
async function liveTick() {
  const ov = $('#v-overview');
  if (document.hidden || !ov || !ov.classList.contains('on')) { liveSchedule(); return; }
  LIVE.i = (LIVE.i + 1) % LIVE.tiles.length;
  $$('#live-grid .lt').forEach(b => b.classList.toggle('on', +b.getAttribute('data-lt') === LIVE.i));
  liveSpot();
  await liveCheck();
  liveSchedule();
}
function liveSetInt(v) {
  LIVE.int = v; LIVE.paused = false;
  $('#live-pause').textContent = 'Pause';
  $$('#live-int [data-int]').forEach(b => b.setAttribute('aria-pressed', String(+b.getAttribute('data-int') === v)));
  try { localStorage.setItem('mm.live', JSON.stringify({ int: v })); } catch (e) { /* private mode */ }
  liveSchedule();
}
function initLive() {
  if (!$('#live-grid') || !BD) return;
  LIVE.tiles = liveTiles();
  try { const st = JSON.parse(localStorage.getItem('mm.live')); if (st && typeof st.int === 'number' && st.int >= 0 && st.int <= 3600) LIVE.int = st.int; } catch (e) { /* none saved */ }
  if (document.documentElement.classList.contains('safe')) LIVE.int = 0;
  const PRE = [[0, 'Off'], [30, '30 s'], [60, '1 min'], [120, '2 min'], [300, '5 min']];
  $('#live-int').innerHTML = PRE.map(o => '<button type="button" data-int="' + o[0] + '" aria-pressed="' + (LIVE.int === o[0]) + '">' + o[1] + '</button>').join('');
  const inp = $('#live-sec');
  if (!PRE.some(o => o[0] === LIVE.int)) inp.value = LIVE.int;
  $('#live-int').addEventListener('click', e => { const b = e.target.closest('[data-int]'); if (b) { inp.value = ''; liveSetInt(+b.getAttribute('data-int')); } });
  inp.addEventListener('change', () => { const v = Math.round(+inp.value); if (v >= 2 && v <= 3600) liveSetInt(v); else if (inp.value !== '') { inp.value = ''; toast('Choose a refresh time between 2 and 3,600 seconds.'); } });
  $('#live-pause').addEventListener('click', () => { LIVE.paused = !LIVE.paused; $('#live-pause').textContent = LIVE.paused ? 'Resume' : 'Pause'; liveSchedule(); });
  $('#live-grid').addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (!b) return; LIVE.i = +b.getAttribute('data-lt'); $$('#live-grid .lt').forEach(x => x.classList.toggle('on', x === b)); liveSpot(); liveSchedule(); });
  $('#live-grid').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const b = e.target.closest('[data-lt]'); if (b) { e.preventDefault(); b.click(); } } });
  liveRender();
  liveSpot();
  liveCheck().then(liveStatus);
  liveSchedule();
  setInterval(liveStatus, 1000);
}

/* ---------- Front page: Bangladesh and its peers ---------- */
const PEER_GROUPS = [['SAARC', ['BGD', 'IND', 'PAK', 'LKA', 'NPL', 'BTN', 'MDV', 'AFG'], '#1F8A7D'], ['Developing Asia', ['CHN', 'IDN', 'MYS', 'PHL', 'THA', 'VNM'], '#C98500'],
  ['Developed economies', ['JPN', 'SGP', 'KOR', 'USA', 'DEU', 'GBR'], '#6B2CB0'], ['Benchmarks', ['SAS', 'EAS', 'HIC', 'WLD'], '#5B6B7A']];
const PEER_COLS = [['gdp_growth', 'Growth', 'Real GDP growth, %', 1, 1], ['inflation', 'Inflation', 'Consumer price inflation, %', -1, 1], ['gdp_pc_ppp', 'GDP/person', 'GDP per person, PPP international $', 1, 0],
  ['unemployment', 'Jobless', 'Unemployment, % of labour force', -1, 1], ['current_account', 'Curr. acct', 'Current account balance, % of GDP', 1, 1], ['exports', 'Exports', 'Exports of goods and services, % of GDP', 1, 1],
  ['remittances', 'Remit.', 'Personal remittances received, % of GDP', 0, 1], ['investment', 'Investment', 'Gross capital formation, % of GDP', 1, 1]];
const flagEmoji = iso => iso && /^[A-Za-z]{2}$/.test(iso) ? String.fromCodePoint(...iso.toUpperCase().split('').map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '🌐';
function latestOf(key, code) { const s = RAW.s && RAW.s[key] && RAW.s[key][code]; if (!s) return null; const v = String(s[1]).split(','); for (let i = v.length - 1; i >= 0; i--) if (v[i] !== '') return [+s[0] + i, +v[i]]; return null; }
function initPeers() {
  const host = $('#peers-table');
  if (!host || !RAW.s) return;
  const EM = {};
  RAW.econ.forEach(e => { EM[e[0]] = e; });
  const all = PEER_GROUPS.flatMap(g => g[1]).filter(c => EM[c]);
  const ctry = PEER_GROUPS.slice(0, 3).flatMap(g => g[1]).filter(c => EM[c]);
  const V = {};
  all.forEach(c => { V[c] = PEER_COLS.map(col => latestOf(col[0], c)); });
  const modal = PEER_COLS.map((col, j) => { const n = {}; ctry.forEach(c => { const x = V[c][j]; if (x) n[x[0]] = (n[x[0]] || 0) + 1; }); const ks = Object.keys(n); return ks.length ? +ks.sort((a, b) => n[b] - n[a] || b - a)[0] : null; });
  all.forEach(c => { V[c] = V[c].map((x, j) => x && modal[j] && x[0] < modal[j] - 4 ? null : x); });
  const score = (j, v) => PEER_COLS[j][0] === 'inflation' ? -Math.abs(v - 3) : v;
  const colVals = PEER_COLS.map((col, j) => ctry.map(c => V[c][j] && score(j, V[c][j][1])).filter(v => v != null).sort((a, b) => a - b));
  const shade = (j, v) => {
    const vals = colVals[j], col = PEER_COLS[j];
    if (v == null || vals.length < 4) return '';
    v = score(j, v);
    const r = vals.filter(x => x < v).length / (vals.length - 1);
    if (!col[3]) return 'background:rgba(31,95,168,' + (0.05 + 0.25 * r).toFixed(3) + ')';
    const good = col[3] > 0 || col[0] === 'inflation' ? r : 1 - r, a = Math.abs(good - 0.5) * 2;
    return 'background:rgba(' + (good >= 0.5 ? '31,138,77' : '212,88,58') + ',' + (0.05 + 0.3 * a).toFixed(3) + ')';
  };
  const peerColor = (j, v) => {
    let c = null;
    try { c = colorOf(PEER_COLS[j][0], v); } catch (e) { c = null; }
    if (c) return c;
    const vals = colVals[j], sv = score(j, v);
    const r = vals.length > 1 ? vals.filter(x => x < sv).length / (vals.length - 1) : 0.5;
    return SEQ[Math.round(r * (SEQ.length - 1))];
  };
  const fmtv = (j, v) => nf(v, 2);
  let html = '<thead><tr><th scope="col" class="pe-c" title="Economy">Economy</th>' + PEER_COLS.map((c, j) => '<th scope="col" class="num" title="' + esc(c[2]) + '">' + esc(c[1]) + '<small class="pe-y">' + (modal[j] || '') + '</small></th>').join('') + '</tr></thead><tbody>';
  PEER_GROUPS.forEach(([g, codes, color]) => {
    html += '<tr class="pe-g" style="--g:' + color + '"><th colspan="' + (PEER_COLS.length + 1) + '" scope="rowgroup">' + esc(g) + '</th></tr>';
    codes.forEach(c => {
      const e = EM[c];
      if (!e) return;
      const bd = c === 'BGD', agg = !!e[6];
      html += '<tr class="pe-r' + (bd ? ' pe-bd' : '') + (agg ? ' pe-agg' : '') + '" tabindex="0" data-code="' + c + '" style="--g:' + color + '"><th scope="row" class="pe-c"><span class="pe-f" aria-hidden="true">' + flagEmoji(e[2]) + '</span>' + esc(e[1]) + (bd ? '<span class="pe-star" aria-hidden="true"> ★</span>' : '') + '</th>' +
        PEER_COLS.map((col, j) => { const x = V[c][j]; if (!x) return '<td class="num c"><span class="cell dash">–</span></td>'; const bg = peerColor(j, x[1]); const so = stdOut(stdOf(col[0]), x[1]); return '<td class="num c" title="' + esc(col[2] + ', ' + x[0] + (so ? '. ' + stdMsg(stdOf(col[0]), x[1]) : '')) + '"><span class="cell' + (so ? ' warn' : '') + '" style="background:' + bg + ';color:' + textOn(bg) + '">' + fmtv(j, x[1]) + (x[0] !== modal[j] ? '<sup>’' + String(x[0]).slice(2) + '</sup>' : '') + '</span></td>'; }).join('') + '</tr>';
    });
  });
  html += '<tr class="pe-rank"><th scope="row" class="pe-c">Bangladesh rank</th>' + PEER_COLS.map((col, j) => {
    const x = V.BGD && V.BGD[j];
    if (!x || !col[3]) return '<td class="num"><span class="muted">–</span></td>';
    const sx = score(j, x[1]), up = col[3] > 0 || col[0] === 'inflation';
    const vals = colVals[j], rk = vals.filter(v => up ? v > sx : v < sx).length + 1, n = vals.length, k = Math.ceil(n / 3);
    PEER_RANKS[col[0]] = [rk, n];
    return '<td class="num"><span class="pe-badge' + (rk <= k ? ' top' : rk > n - k ? ' low' : '') + '" title="' + esc(col[2]) + ': rank ' + rk + ' of ' + n + '">' + rk + '<small>/' + n + '</small></span></td>';
  }).join('') + '</tr></tbody>';
  host.innerHTML = '<div class="table-wrap pe-wrap"><table class="mx pe">' + html + '</table></div>' +
    '<p class="mx-note">Year under each heading: the most common latest year; a small ’23 after a value marks an older year. Green is better and red worse than most economies in the column: higher growth, income, current account, exports and investment, lower unemployment, and inflation closest to 3% count as better (blue: no better or worse direction). Values more than four years older than the rest of their column are left out. Ranks run from best (1) among the 20 economies. Benchmarks are World Bank regional and income-group aggregates. </p><p class="src-line"><b>Source:</b> World Bank.</p>' +
    '<p class="pe-links"><a href="#compare~gdp_growth~BGD.IND.PAK.LKA.CHN.VNM.THA.JPN">Compare growth over time →</a><a href="#map~gdp_growth~' + (modal[0] || '') + '">See the world map →</a><a href="#rank~inflation~' + (modal[1] || '') + '~asc">World rankings →</a><a href="#bangladesh">Bangladesh Monitor →</a></p>';
  const open = r => { if (r) location.hash = 'country-' + r.getAttribute('data-code'); };
  host.addEventListener('click', e => open(e.target.closest('tr[data-code]')));
  host.addEventListener('keydown', e => { if (e.key === 'Enter') open(e.target.closest('tr[data-code]')); });
}

/* ---------- No copying, dragging or printing shortcuts ---------- */
(function protect() {
  const ok = t => document.documentElement.classList.contains('owner') || (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
  let told = 0;
  document.addEventListener('copy', e => { if (ok(e.target)) return; e.preventDefault(); if (Date.now() - told > 4000) { told = Date.now(); toast('Copying is turned off on this site.'); } });
  ['cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(t => document.addEventListener(t, e => { if (!ok(e.target)) e.preventDefault(); }));
  document.addEventListener('keydown', e => { const k = (e.key || '').toLowerCase(); if ((e.ctrlKey || e.metaKey) && ['c', 'x', 's', 'p', 'u', 'a'].includes(k) && !ok(e.target)) e.preventDefault(); });
})();
setTimeout(() => { try { BDX.initSecurity(); } catch (e) { /* optional */ } try { BDX.renderAds(); } catch (e) { /* ads optional */ } try { initOwner(); } catch (e) { /* optional */ } try { initAuth(); } catch (e) { /* sign-in optional */ } try { initContact(); } catch (e) { /* optional */ } try { initFront(); } catch (e) { /* optional */ } try { initBlink(); } catch (e) { /* optional */ } try { initPeers(); } catch (e) { /* table optional */ } try { initLive(); } catch (e) { /* dashboard optional */ } try { staticSources(); } catch (e) { /* optional */ } }, 0);

/* ================= Country analysis: economy → topic → section pages ================= */
const CL_CATS = [
  { id: 'inflation', t: 'Inflation', w: ['inflation', 'real_rate', 'lending_rate', 'money_growth', 'fx_change'], bd: ['infl', 'infl_avg', 'food', 'nonfood'], cpi: true },
  { id: 'growth', t: 'Growth and output', w: ['gdp_growth', 'gdp_pc', 'gdp_pc_ppp', 'gdp_usd', 'investment', 'savings'], bd: ['gdp_q', 'gdp_fy', 'iip', 'inv_gdp', 'sav_gdp', 'cons_gdp'] },
  { id: 'exchange', t: 'Exchange rate', w: ['fx', 'fx_change'], bd: ['xr', 'xr_dep'] },
  { id: 'remittances', t: 'Remittances', w: ['remittances'], bd: ['remit', 'remit_g'] },
  { id: 'external', t: 'External sector', w: ['exports', 'imports', 'reserves', 'fdi', 'ext_debt', 'debt_service'], bd: ['exp', 'exp_g', 'imp', 'res', 'res_bpm6', 'cover'] },
  { id: 'bop', t: 'Balance of payments', w: ['current_account', 'fdi', 'exports', 'imports'], bd: ['ca', 'fa', 'goods', 'secinc', 'bop', 'fdi'] },
  { id: 'rates', t: 'Interest and policy rates', w: ['lending_rate', 'real_rate'], bd: ['call', 'bankrate', 'lend', 'dep', 'spread', 'real_lend'] },
  { id: 'money', t: 'Money and banking', w: ['money_growth', 'private_credit'], bd: ['m2', 'rm', 'pcredit', 'cdr', 'npl', 'crar'] },
  { id: 'fiscal', t: 'Public finance', w: ['revenue', 'tax', 'spending', 'budget', 'gov_debt'], bd: ['govcredit', 'tax', 'tax_g', 'nsav_net', 'nsav_out'] },
  { id: 'labour', t: 'Jobs and labour', w: ['unemployment', 'youth_unemp_f', 'youth_unemp_m', 'lfp_f', 'lfp_m'] },
  { id: 'poverty', t: 'Poverty and inequality', w: ['poverty', 'poverty_nat', 'gini', 'top20', 'bottom20'] },
  { id: 'people', t: 'Population', w: ['population', 'pop_growth'] }
];
const CL_SECS = [['charts', 'Charts and map'], ['summary', 'Summary'], ['tables', 'Tables'], ['compare', 'Comparisons'], ['analysis', 'Analysis'], ['forecast', 'Forecasting'], ['results', 'Results'], ['tests', 'Tests'],
  ['hetero', 'Heterogeneity'], ['robust', 'Robustness'], ['valid', 'Validation'], ['placebo', 'Placebo test'], ['decisions', 'Decisions'], ['discussion', 'Discussion'], ['conclusions', 'Conclusions'], ['sources', 'Sources and notes']];
const CL = { iso: 'BGD', cat: 'inflation', sec: 'charts', cmp: 'sub', sel: {}, bdsel: {}, idx: false, fk: null, hk: null };
// ---------- statistics (browser) ----------
function lgam(x) { const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgam(1 - x); x -= 1; let a = c[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }
function gamP(a, x) { if (x <= 0) return 0; if (x < a + 1) { let s = 1 / a, d = s, ap = a; for (let n = 0; n < 300; n++) { ap += 1; d *= x / ap; s += d; if (Math.abs(d) < Math.abs(s) * 1e-13) break; } return s * Math.exp(-x + a * Math.log(x) - lgam(a)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 300; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const de = d * c; h *= de; if (Math.abs(de - 1) < 1e-13) break; } return 1 - Math.exp(-x + a * Math.log(x) - lgam(a)) * h; }
const chi2p = (x, k) => Math.max(0, Math.min(1, 1 - gamP(k / 2, x / 2)));
function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
  for (let m = 1; m < 300; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const de = d * c; h *= de; if (Math.abs(de - 1) < 1e-13) break; } return h; }
function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const tp2 = (t, df) => (df > 0 && isFinite(t) ? ibeta(df / 2, 0.5, df / (df + t * t)) : null);
function ols(X, y) { const k = X[0].length, n = y.length, A = Array.from({ length: k }, () => Array(k).fill(0)), v = Array(k).fill(0);
  X.forEach((r, i) => { for (let a = 0; a < k; a++) { v[a] += r[a] * y[i]; for (let b = 0; b < k; b++) A[a][b] += r[a] * r[b]; } });
  const M = A.map((r, i) => r.concat(Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))));
  for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const pv = M[c][c]; if (Math.abs(pv) < 1e-12) return null; for (let j = 0; j < 2 * k; j++) M[c][j] /= pv; for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[c][j]; } }
  const inv = M.map(r => r.slice(k)), beta = inv.map(r => r.reduce((s, x, j) => s + x * v[j], 0));
  const res = y.map((yy, i) => yy - X[i].reduce((s, x, j) => s + x * beta[j], 0)), sse = res.reduce((s, e) => s + e * e, 0), df = n - k, s2 = df > 0 ? sse / df : NaN;
  return { beta, se: inv.map((r, i) => Math.sqrt(Math.max(0, r[i] * s2))), res, sse, df }; }
function trendOf(pts) { if (pts.length < 5) return null; const t0 = pts[0][0]; const r = ols(pts.map(p => [1, p[0] - t0]), pts.map(p => p[1])); if (!r) return null; const b = r.beta[1], se = r.se[1], t = b / se; return { b, se, t, p: tp2(t, r.df), res: r.res, a: r.beta[0], t0 }; }
function adf(y) { if (y.length < 10) return null; const d = y.slice(1).map((v, i) => v - y[i]); const X = [], Y = []; for (let i = 1; i < d.length; i++) { X.push([1, y[i], d[i - 1]]); Y.push(d[i]); } const r = ols(X, Y); if (!r) return null;
  const tau = r.beta[1] / r.se[1], T = Y.length, cv = (b0, b1, b2) => b0 + b1 / T + b2 / (T * T);
  return { tau, cv1: cv(-3.43035, -6.5393, -16.786), cv5: cv(-2.86154, -2.8903, -4.234), cv10: cv(-2.56677, -1.5384, -2.809), T }; }
function jb(x) { const n = x.length; if (n < 8) return null; const m = x.reduce((a, b) => a + b, 0) / n, c = k => x.reduce((s, v) => s + Math.pow(v - m, k), 0) / n, s2 = c(2); if (!s2) return null; const S = c(3) / Math.pow(s2, 1.5), K = c(4) / (s2 * s2); const J = n / 6 * (S * S + (K - 3) * (K - 3) / 4); return { J, p: chi2p(J, 2), S, K }; }
function lbox(x, h) { const n = x.length; if (n < h + 5) return null; const m = x.reduce((a, b) => a + b, 0) / n, den = x.reduce((s, v) => s + (v - m) * (v - m), 0); if (!den) return null; let Q = 0;
  for (let k = 1; k <= h; k++) { let num = 0; for (let t = k; t < n; t++) num += (x[t] - m) * (x[t - k] - m); const rk = num / den; Q += rk * rk / (n - k); } Q *= n * (n + 2); return { Q, p: chi2p(Q, h), h }; }
function holtFit(y, a, b) { let l = y[0], t = y.length > 1 ? y[1] - y[0] : 0, sse = 0; for (let i = 1; i < y.length; i++) { const f = l + t, e = y[i] - f; sse += e * e; const ln = a * y[i] + (1 - a) * (l + t); t = b * (ln - l) + (1 - b) * t; l = ln; } return { l, t, sse, a, b, n: y.length - 1 }; }
function holtBest(y) { let best = null; [0.2, 0.35, 0.5, 0.65, 0.8, 0.95].forEach(a => [0.05, 0.15, 0.3, 0.5].forEach(b => { const r = holtFit(y, a, b); if (!best || r.sse < best.sse) best = r; })); return best; }
function holtFc(y, H) { const m = holtBest(y), s = Math.sqrt(m.sse / Math.max(1, m.n - 2)); const out = []; for (let h = 1; h <= H; h++) { let v = 1; for (let j = 1; j < h; j++) v += Math.pow(m.a * (1 + j * m.b), 2); const sd = s * Math.sqrt(v), f = m.l + h * m.t; out.push({ h, f, lo80: f - 1.2816 * sd, hi80: f + 1.2816 * sd, lo95: f - 1.96 * sd, hi95: f + 1.96 * sd }); } return { m, s, out }; }
function fc1(y, model) { if (model === 'naive') return y[y.length - 1]; if (model === 'trend') { const tr = trendOf(y.map((v, i) => [i, v])); return tr ? tr.a + tr.b * y.length : y[y.length - 1]; } const m = holtBest(y); return m.l + m.t; }
function backtest(y, model, k) { const e = []; for (let i = Math.max(6, y.length - k); i < y.length; i++) e.push(y[i] - fc1(y.slice(0, i), model)); return e.length ? { rmse: Math.sqrt(e.reduce((s, v) => s + v * v, 0) / e.length), mae: e.reduce((s, v) => s + Math.abs(v), 0) / e.length, n: e.length } : null; }
function kwH(groups) { const all = []; groups.forEach((g, j) => g.forEach(v => all.push([v, j]))); const N = all.length; if (N < 6 || groups.length < 2) return null; all.sort((a, b) => a[0] - b[0]);
  const rk = Array(N); for (let i = 0; i < N;) { let j = i; while (j + 1 < N && all[j + 1][0] === all[i][0]) j++; for (let q = i; q <= j; q++) rk[q] = (i + j) / 2 + 1; i = j + 1; }
  const R = groups.map(() => 0); all.forEach((x, i) => { R[x[1]] += rk[i]; }); const H = 12 / (N * (N + 1)) * groups.reduce((s, g, j) => s + (g.length ? R[j] * R[j] / g.length : 0), 0) - 3 * (N + 1); const k = groups.filter(g => g.length).length; return { H, p: chi2p(H, k - 1), k, N }; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function permTrend(pts, reps) { const tr = trendOf(pts); if (!tr) return null; const rnd = mulberry(20261024), ys = pts.map(p => p[1]); let ge = 0;
  for (let r = 0; r < reps; r++) { const s = ys.slice(); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } const t2 = trendOf(pts.map((p, i) => [p[0], s[i]])); if (t2 && Math.abs(t2.b) >= Math.abs(tr.b)) ge++; }
  return { b: tr.b, p: ge / reps, reps, pt: tr.p }; }
// ---------- data helpers ----------
function wser(k, iso) { const s = RAW.s && RAW.s[k] && RAW.s[k][iso]; if (!s) return []; return String(s[1]).split(',').map((v, i) => [+s[0] + i, v === '' ? null : +v]).filter(x => x[1] != null && isFinite(x[1])); }
const indL = k => (IND[k] && IND[k].label) || k;
const indU = k => (IND[k] && IND[k].unit) || '';
const isoName = c => ((EMAPB()[c] || [])[1] || c);
function clCountries() { return RAW.econ.filter(e => !e[6]).sort((a, b) => a[1].localeCompare(b[1])); }
function lastOfS(k, iso) { const s = wser(k, iso); return s.length ? s[s.length - 1] : null; }
function incomeGroup(iso) { const g = lastOfS('gdp_pc', iso); if (!g) return null; const v = g[1]; return v <= 1135 ? 'Low income' : v <= 4495 ? 'Lower-middle income' : v <= 13935 ? 'Upper-middle income' : 'High income'; }
function peersOf(iso, mode) {
  const E = clCountries(), me = EMAPB()[iso];
  if (mode === 'sub') return E.filter(e => e[4] === (me || [])[4]).map(e => e[0]);
  if (mode === 'dev') { const g = incomeGroup(iso); return g ? E.filter(e => incomeGroup(e[0]) === g).map(e => e[0]) : [iso]; }
  const x = lastOfS('gdp_pc_ppp', iso); if (!x) return [iso];
  return E.map(e => [e[0], lastOfS('gdp_pc_ppp', e[0])]).filter(z => z[1]).map(z => [z[0], Math.abs(Math.log(z[1][1]) - Math.log(x[1]))]).sort((a, b) => a[1] - b[1]).slice(0, 11).map(z => z[0]);
}
const clCat = () => CL_CATS.find(c => c.id === CL.cat) || CL_CATS[0];
const catKeys = c => c.w.filter(k => IND[k]);
const availKeys = (c, iso) => catKeys(c).filter(k => wser(k, iso).length >= 3);
function clDefaults(c) { if (!CL.sel[c.id]) CL.sel[c.id] = new Set(availKeys(c, CL.iso).slice(0, 4)); return CL.sel[c.id]; }
// ---------- page frame ----------
function initCL() {
  const pick = $('#cl-pick');
  if (!pick || !RAW.econ) return;
  pick.innerHTML = '<label class="field grow"><span>Economy</span><select id="cl-iso">' + clCountries().map(e => '<option value="' + e[0] + '"' + (e[0] === CL.iso ? ' selected' : '') + '>' + esc(e[1]) + '</option>').join('') + '</select></label>';
  $('#cl-iso').addEventListener('change', e => { CL.iso = e.target.value; CL.sel = {}; CL.bdsel = {}; renderCL(); });
  $('#cl-cats').addEventListener('click', e => { const b = e.target.closest('[data-clc]'); if (b) { CL.cat = b.getAttribute('data-clc'); CL.fk = CL.hk = null; renderCL(); } });
  $('#cl-secs').addEventListener('click', e => { const b = e.target.closest('[data-cls]'); if (b) { CL.sec = b.getAttribute('data-cls'); renderCL(); } });
  renderCL();
}
function renderCL() {
  const body = $('#cl-body');
  if (!body) return;
  disposeIn(body); body.innerHTML = '';
  FIGN = 0; TABN = 0; labState.prefix = 'C';
  const iso = CL.iso, c = clCat();
  if ($('#cl-iso')) $('#cl-iso').value = iso;
  $('#cl-cats').innerHTML = CL_CATS.map(k => '<button type="button" role="tab" data-clc="' + k.id + '" aria-selected="' + (k.id === c.id) + '">' + esc(k.t) + '</button>').join('');
  $('#cl-secs').innerHTML = CL_SECS.map(([id, t], i) => '<button type="button" data-cls="' + id + '" aria-current="' + (id === CL.sec ? 'page' : 'false') + '"><span>' + (i + 1) + '</span>' + esc(t) + '</button>').join('');
  try { history.replaceState(null, '', '#cl~' + iso + '~' + c.id + '~' + CL.sec); } catch (e) { /* framed */ }
  const head = document.createElement('div');
  head.className = 'cl-head';
  head.innerHTML = '<h2>' + esc(isoName(iso)) + ': ' + esc(c.t) + '</h2><p class="note">' + esc((CL_SECS.find(s => s[0] === CL.sec) || [])[1] || '') + ' · page ' + (CL_SECS.findIndex(s => s[0] === CL.sec) + 1) + ' of ' + CL_SECS.length + '</p>';
  body.append(head);
  const keys = availKeys(c, iso);
  TSRC = 'World Bank.';
  const fn = { charts: clCharts, summary: clSummary, tables: clTables, compare: clCompare, analysis: clAnalysis, forecast: clForecast, results: clResults, tests: clTests, hetero: clHetero, robust: clRobust, valid: clValid, placebo: clPlacebo, decisions: clDecisions, discussion: clDiscussion, conclusions: clConclusions, sources: clSources }[CL.sec] || clCharts;
  if (!keys.length && !(iso === 'BGD' && c.bd)) { body.insertAdjacentHTML('beforeend', '<p class="empty">The World Bank has no data on this topic for ' + esc(isoName(iso)) + '. Try another topic.</p>'); return; }
  fn(body, c, keys, iso);
  const i = CL_SECS.findIndex(s => s[0] === CL.sec), nav = document.createElement('div');
  nav.className = 'cl-nav';
  nav.innerHTML = (i > 0 ? '<button type="button" class="btn" data-cls="' + CL_SECS[i - 1][0] + '">← ' + esc(CL_SECS[i - 1][1]) + '</button>' : '<span></span>') + (i < CL_SECS.length - 1 ? '<button type="button" class="btn primary" data-cls="' + CL_SECS[i + 1][0] + '">' + esc(CL_SECS[i + 1][1]) + ' →</button>' : '');
  nav.addEventListener('click', e => { const b = e.target.closest('[data-cls]'); if (b) { CL.sec = b.getAttribute('data-cls'); renderCL(); window.scrollTo(0, $('#cl-secs').offsetTop - 70); } });
  body.append(nav);
}
// ---------- 1. charts and map (with series pickers) ----------
function seriesPicker(host, c, onChange) {
  const sel = clDefaults(c), d = document.createElement('div');
  d.className = 'picker';
  const box = (k, on) => '<label class="pk"><input type="checkbox" data-k="' + k + '"' + (on ? ' checked' : '') + '><span>' + esc(indL(k)) + '</span></label>';
  const others = CL_CATS.filter(x => x.id !== c.id).map(x => '<div class="pk-g"><b>' + esc(x.t) + '</b>' + catKeys(x).filter(k => wser(k, CL.iso).length >= 3).map(k => box(k, sel.has(k))).join('') + '</div>').join('');
  d.innerHTML = '<div class="pk-row">' + availKeys(c, CL.iso).map(k => box(k, sel.has(k))).join('') + '</div>' +
    '<div class="pk-act"><button type="button" class="btn sm" data-pk="all">Select all in ' + esc(c.t.toLowerCase()) + '</button><button type="button" class="btn sm" data-pk="none">Clear all</button><label class="pk"><input type="checkbox" data-pk="idx"' + (CL.idx ? ' checked' : '') + '><span>Show as index (first year = 100)</span></label></div>' +
    '<details class="pk-more"><summary>Add series from other topics</summary>' + others + '</details>';
  d.addEventListener('change', e => { const i = e.target; if (i.getAttribute('data-pk') === 'idx') { CL.idx = i.checked; onChange(); return; } const k = i.getAttribute('data-k'); if (!k) return; if (i.checked) sel.add(k); else sel.delete(k); d.querySelectorAll('input[data-k="' + k + '"]').forEach(x => { x.checked = i.checked; }); onChange(); });
  d.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b || b.tagName !== 'BUTTON') return; if (b.getAttribute('data-pk') === 'all') availKeys(c, CL.iso).forEach(k => sel.add(k)); else sel.clear(); d.querySelectorAll('input[data-k]').forEach(x => { x.checked = sel.has(x.getAttribute('data-k')); }); onChange(); });
  host.append(d);
}
function annualOption(TH, keys, iso, idx) {
  const S2 = keys.map(k => [k, wser(k, iso)]).filter(z => z[1].length);
  if (!S2.length) return { title: { text: 'Select at least one series', left: 'center', top: 'middle', textStyle: { color: TH.muted, fontSize: 13 } } };
  const y0 = Math.min(...S2.map(z => z[1][0][0])), y1 = Math.max(...S2.map(z => z[1][z[1].length - 1][0]));
  const labels = []; for (let y = y0; y <= y1; y++) labels.push(String(y));
  const units = [...new Set(S2.map(z => indU(z[0])))];
  const useIdx = idx || units.length > 2;
  const series = S2.map(([k, pts], i) => {
    const m = new Map(pts), base = pts[0][1];
    const data = labels.map(l => { const v = m.get(+l); return v == null ? null : useIdx ? (base ? v / base * 100 : null) : v; });
    return S(indL(k), data, { ax: useIdx ? 0 : (units.indexOf(indU(k)) > 0 ? 1 : 0), end: true, dec: 2, std: STDK[k] ? k : undefined });
  });
  const o = tsOption(TH, labels, series, { y1: useIdx ? 'index' : units[0], y2: !useIdx && units.length === 2 ? units[1] : undefined, dec: 2, zoom: labels.length > 30, events: false });
  return o;
}
function clCharts(body, c, keys, iso) {
  const top = document.createElement('div');
  top.className = 'geo-grid';
  body.append(top);
  const mapBox = document.createElement('div');
  mapBox.className = 'geo-map';
  mapBox.innerHTML = '<p class="note">Loading map…</p>';
  top.append(mapBox);
  loadMaps().then(M => { mapBox.innerHTML = (countrySVG(iso, M) || '<p class="note">No map outline for this economy.</p>') + '<p class="src-line"><b>Source:</b> Natural Earth.</p>'; worldLocator(mapBox, iso); }).catch(() => { mapBox.innerHTML = '<p class="note">The map opens on macroarianalytics.com.</p>'; });
  const side = document.createElement('div');
  top.append(side);
  const facts = keys.slice(0, 4).map(k => { const l = lastOfS(k, iso); return l ? '<div class="bdf"><span>' + esc(indL(k)) + '</span><b>' + nf(l[1], 2) + '</b><small>' + l[0] + '</small></div>' : ''; }).join('');
  side.innerHTML = '<div class="bdfacts cl-facts">' + facts + '</div>';
  const s = sec(body, 'International data (annual)', 'Tick or untick series to add or remove them from the chart. Series with different units use a second axis; with more than two units the chart switches to an index.');
  if (keys.length) {
    let node = null;
    seriesPicker(s, c, () => { if (node) rerender(node); });
    const g = grid(s);
    const f = figure(g, { prefix: 'C', wide: true, title: c.t + ': ' + isoName(iso), sub: 'annual data; tick series above', h: 380, source: 'World Bank.', render: TH => annualOption(TH, [...clDefaults(c)], iso, CL.idx) });
    node = f.querySelector('.chart');
  }
  if (iso === 'BGD' && c.bd) bdCatCharts(body, c);
}
function bdCatCharts(body, c) {
  const pool = c.bd.filter(k => SER(k)).map(k => ({ k, label: SER(k).label + (SER(k).sub ? ' (' + SER(k).sub + ')' : ''), pk: PK(k), unit: SER(k).unit }));
  if (c.cpi) BD.cpi_components.forEach(cc => { if (cc.series) pool.push({ k: 'cpi:' + cc.code, label: 'CPI group: ' + cc.name, pk: cc.series, unit: '% y/y' }); });
  if (!pool.length) return;
  const s = sec(body, 'Bangladesh Bank and BBS data', 'Monthly, quarterly and fiscal-year series. Tick or untick to add or remove; each frequency has its own chart with Month, Quarter and Year buttons.');
  if (!CL.bdsel[c.id]) CL.bdsel[c.id] = new Set(pool.slice(0, 4).map(p => p.k));
  const sel = CL.bdsel[c.id], nodes = [];
  const d = document.createElement('div');
  d.className = 'picker';
  d.innerHTML = '<div class="pk-row">' + pool.map(p => '<label class="pk"><input type="checkbox" data-k="' + esc(p.k) + '"' + (sel.has(p.k) ? ' checked' : '') + '><span>' + esc(p.label) + '</span></label>').join('') + '</div><div class="pk-act"><button type="button" class="btn sm" data-pk="all">Select all</button><button type="button" class="btn sm" data-pk="none">Clear all</button></div>';
  s.append(d);
  const g = grid(s);
  const draw = () => { disposeIn(g); g.innerHTML = ''; FIGN = 0;
    const byF = {};
    pool.filter(p => sel.has(p.k) && p.pk).forEach(p => { (byF[p.pk.f] = byF[p.pk.f] || []).push(p); });
    Object.entries(byF).forEach(([f, ps]) => {
      let k0 = Infinity, k1 = -Infinity; ps.forEach(p => { k0 = Math.min(k0, p.pk.k0); k1 = Math.max(k1, p.pk.k0 + p.pk.v.length - 1); });
      if (f === 'M') k0 = Math.max(k0, 2010 * 12);
      const labels = []; for (let k = k0; k <= k1; k++) labels.push(bdLab(f, k));
      const units = [...new Set(ps.map(p => p.unit))];
      figure(g, { prefix: 'C', wide: true, title: 'Bangladesh: ' + c.t.toLowerCase() + ' (' + ({ M: 'monthly', Q: 'quarterly', FY: 'fiscal year' }[f] || f) + ')', sub: units.join(' · '), h: 360,
        source: srcKeys(ps.filter(p => !p.k.startsWith('cpi:')).map(p => p.k)).replace(/\.$/, '') + (ps.some(p => p.k.startsWith('cpi:')) ? ', BBS' : '') + '.',
        render: TH => tsOption(TH, labels, ps.map(p => S(p.label, labels.map((l, i) => { const j = k0 + i - p.pk.k0; return j >= 0 && j < p.pk.v.length ? p.pk.v[j] : null; }), { ax: units.indexOf(p.unit) > 0 ? 1 : 0, end: true, dec: 2 })), { y1: units[0], y2: units.length > 1 ? units[1] : undefined, zoom: labels.length > 40, dec: 2 }) });
    });
    if (!Object.keys(byF).length) g.innerHTML = '<p class="note">Tick at least one series.</p>';
  };
  d.addEventListener('change', e => { const k = e.target.getAttribute('data-k'); if (!k) return; if (e.target.checked) sel.add(k); else sel.delete(k); draw(); });
  d.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b) return; if (b.getAttribute('data-pk') === 'all') pool.forEach(p => sel.add(p.k)); else sel.clear(); d.querySelectorAll('input[data-k]').forEach(x => { x.checked = sel.has(x.getAttribute('data-k')); }); draw(); });
  draw();
}
// ---------- 2. summary ----------
function regionMean(k, iso, year) { const sub = (EMAPB()[iso] || [])[4]; const vals = clCountries().filter(e => e[4] === sub).map(e => { const m = new Map(wser(k, e[0])); return m.get(year); }).filter(v => v != null); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; }
function worldRank(k, iso) { const me = lastOfS(k, iso); if (!me) return null; const vals = clCountries().map(e => { const m = new Map(wser(k, e[0])); return m.get(me[0]); }).filter(v => v != null); return [vals.filter(v => v > me[1]).length + 1, vals.length]; }
function clSummary(body, c, keys, iso) {
  if (keys.length) {
    let h = '<thead><tr><th scope="col">Indicator</th><th scope="col">Year</th><th scope="col" class="num">Latest</th><th scope="col" class="num">Previous</th><th scope="col" class="num">Change</th><th scope="col" class="num">5-year average</th><th scope="col" class="num">Sub-continent average</th><th scope="col" class="num">World rank</th><th scope="col">Benchmark</th></tr></thead><tbody>';
    keys.forEach(k => {
      const s = wser(k, iso), l = s[s.length - 1], p = s[s.length - 2], last5 = s.slice(-5).map(x => x[1]), rm = regionMean(k, iso, l[0]), wr = worldRank(k, iso), st = stdOf(k);
      const out = st && stdOut(st, l[1]), b312 = band312(s.map(z => z[1])), big = !st && !!(b312 && b312.out);
      h += '<tr><th scope="row"><span class="mx-l">' + esc(indL(k)) + '</span><span class="mx-u">' + esc(indU(k)) + '</span></th><td>' + l[0] + '</td><td class="num big' + (out || big ? ' warn-std' : '') + '">' + nf(l[1], 2) + '</td><td class="num">' + (p ? nf(p[1], 2) : '–') + '</td><td class="num">' + (p ? nf(l[1] - p[1], 2) : '–') + '</td><td class="num">' + nf(last5.reduce((a, b) => a + b, 0) / last5.length, 2) + '</td><td class="num">' + (rm == null ? '–' : nf(rm, 2)) + '</td><td class="num">' + (wr ? wr[0] + ' of ' + wr[1] : '–') + '</td><td>' + (st ? esc(st.txt) + (out ? ' · outside' : ' · inside') : big ? 'outside its 3- and 12-year average band' : (b312 ? 'inside its 3- and 12-year average band' : '–')) + '</td></tr>';
    });
    tableWrap(body, h + '</tbody>', tcap('Summary: ' + c.t.toLowerCase()), 'Highest value ranks 1. Blinking values are outside their international benchmark or, where none exists, outside the band between their 3-year and 12-year averages.', { src: 'World Bank.' });
  }
  if (iso === 'BGD' && c.bd) { TSRC = 'Bangladesh Bank, BBS.'; matrix(body, c.bd.filter(k => SER(k)), tcap('Bangladesh Bank and BBS: latest readings')); }
}
// ---------- 3. tables ----------
function clTables(body, c, keys, iso) {
  if (keys.length) {
    const S2 = keys.map(k => [k, new Map(wser(k, iso))]); const ys = [...new Set(S2.flatMap(z => [...z[1].keys()]))].sort((a, b) => b - a).slice(0, 25);
    let h = '<thead><tr><th scope="col">Year</th>' + keys.map(k => '<th scope="col" class="num" title="' + esc(indU(k)) + '">' + esc(indL(k)) + '</th>').join('') + '</tr></thead><tbody>';
    ys.forEach(y => { h += '<tr><th scope="row">' + y + '</th>' + S2.map(z => '<td class="num">' + (z[1].has(y) ? nf(z[1].get(y), 2) : '–') + '</td>').join('') + '</tr>'; });
    tableWrap(body, h + '</tbody>', tcap('Annual data, last 25 years'), 'Units: ' + keys.map(k => indL(k) + ' — ' + indU(k)).join('; ') + '.', { src: 'World Bank.', heat: 'col' });
  }
  if (iso === 'BGD' && c.bd) {
    const bk = c.bd.filter(k => SER(k) && PK(k));
    const fs = [...new Set(bk.map(k => PK(k).f))];
    fs.forEach(f => {
      const ks = bk.filter(k => PK(k).f === f), a = align(ks);
      const n = a.labels.length, from = Math.max(0, n - 24);
      let h = '<thead><tr><th scope="col">Period</th>' + ks.map(k => '<th scope="col" class="num" title="' + esc(SER(k).unit) + '">' + esc(SER(k).label + (SER(k).sub ? ' (' + SER(k).sub + ')' : '')) + '</th>').join('') + '</tr></thead><tbody>';
      for (let i = n - 1; i >= from; i--) h += '<tr><th scope="row">' + esc(a.labels[i]) + '</th>' + a.cols.map(col => '<td class="num">' + (col[i] == null ? '–' : nf(col[i], 2)) + '</td>').join('') + '</tr>';
      TSRC = 'Bangladesh Bank, BBS.';
      tableWrap(body, h + '</tbody>', tcap('Bangladesh: latest ' + Math.min(24, n) + ' periods (' + ({ M: 'monthly', Q: 'quarterly', FY: 'fiscal year' }[f] || f) + ')'), '', { src: srcKeys(ks), heat: 'col' });
    });
  }
}
// ---------- 4. comparisons (sub-pages) ----------
function clCompare(body, c, keys, iso) {
  const modes = [['sub', 'Same sub-continent', 'Economies in ' + ((EMAPB()[iso] || [])[4] || 'the same sub-region')], ['gdp', 'Similar GDP per person', 'The ten economies with the closest GDP per person (PPP)'], ['dev', 'Same development group', (incomeGroup(iso) || 'Income group') + ' economies (World Bank thresholds applied to GDP per person, approximate)']];
  const tabs = document.createElement('div');
  tabs.className = 'bd-tabs cl-sub';
  tabs.innerHTML = modes.map(m => '<button type="button" role="tab" data-cm="' + m[0] + '" aria-selected="' + (m[0] === CL.cmp) + '">' + esc(m[1]) + '</button>').join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-cm]'); if (b) { CL.cmp = b.getAttribute('data-cm'); renderCL(); } });
  body.append(tabs);
  if (!keys.length) { body.insertAdjacentHTML('beforeend', '<p class="note">No World Bank data on this topic for comparisons.</p>'); return; }
  const m = modes.find(x => x[0] === CL.cmp) || modes[0], peers = peersOf(iso, m[0]);
  let h = '<thead><tr><th scope="col">Economy</th>' + keys.map(k => '<th scope="col" class="num" title="' + esc(indU(k)) + '">' + esc(indL(k)) + '</th>').join('') + '</tr></thead><tbody>';
  const rows = peers.map(p => [p, keys.map(k => lastOfS(k, p))]);
  rows.sort((a, b) => ((b[1][0] || [0, -Infinity])[1]) - ((a[1][0] || [0, -Infinity])[1]));
  rows.forEach(([p, vals]) => { h += '<tr' + (p === iso ? ' class="hl"' : '') + '><th scope="row"><a href="#cl~' + p + '~' + c.id + '~' + CL.sec + '">' + esc(isoName(p)) + '</a></th>' + vals.map(v => '<td class="num">' + (v ? nf(v[1], 2) + '<sup>’' + String(v[0]).slice(2) + '</sup>' : '–') + '</td>').join('') + '</tr>'; });
  const avg = keys.map(k => { const v = rows.map(r => r[1][keys.indexOf(k)]).filter(Boolean).map(x => x[1]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
  h += '<tr class="foot"><th scope="row">Group average</th>' + avg.map(v => '<td class="num">' + (v == null ? '–' : nf(v, 2)) + '</td>').join('') + '</tr>';
  tableWrap(body, h + '</tbody>', tcap(m[1] + ': ' + c.t.toLowerCase()), m[2] + '. Sorted by the first indicator; small numbers after a value give its year. Tap an economy to open the same page for it.', { src: 'World Bank.', heat: 'col' });
  const k0 = keys[0], bars = rows.map(r => [isoName(r[0]), r[1][0] ? r[1][0][1] : null, r[0]]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]);
  const g = grid(body);
  figure(g, { prefix: 'C', wide: true, title: indL(k0) + ': ' + m[1].toLowerCase(), sub: indU(k0) + '; latest year for each economy', h: Math.max(260, 26 * bars.length + 40), source: 'World Bank.',
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 56, top: 8, bottom: 6, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, valueFormatter: v => nf(v, 2) },
      xAxis: valAxis(TH, ''), yAxis: { type: 'category', data: bars.map(b => b[0]), axisLabel: { color: TH.ink2, fontSize: 11 }, axisLine: { lineStyle: { color: TH.line } }, axisTick: { show: false } },
      series: [{ type: 'bar', data: bars.map(b => ({ value: b[1], itemStyle: { color: b[2] === iso ? TH.signal : TH.pal[0] } })), barMaxWidth: 16, label: { show: true, position: 'right', color: TH.ink2, fontSize: 10, formatter: p => nf(p.value, 2) } }] }) });
}
// ---------- 5–16. analysis to sources ----------
function seriesY(k, iso) { return wser(k, iso); }
function clAnalysis(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col">Indicator</th><th scope="col">Period</th><th scope="col" class="num">N</th><th scope="col" class="num">Mean</th><th scope="col" class="num">Median</th><th scope="col" class="num">SD</th><th scope="col" class="num">Min</th><th scope="col" class="num">Max</th><th scope="col" class="num">Trend a year</th><th scope="col" class="num">p-value</th><th scope="col" class="num">Last 5 years vs previous 5</th></tr></thead><tbody>';
  keys.forEach(k => { const s = seriesY(k, iso), v = s.map(x => x[1]).slice().sort((a, b) => a - b), n = v.length, mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, n - 1)), tr = trendOf(s);
    const l5 = s.slice(-5).map(x => x[1]), p5 = s.slice(-10, -5).map(x => x[1]), avg = a => a.reduce((x, y) => x + y, 0) / a.length, mn = s.reduce((a, b) => (b[1] < a[1] ? b : a)), mx = s.reduce((a, b) => (b[1] > a[1] ? b : a));
    h += '<tr><th scope="row">' + esc(indL(k)) + '</th><td>' + s[0][0] + '–' + s[n - 1][0] + '</td><td class="num">' + n + '</td><td class="num">' + nf(mean, 2) + '</td><td class="num">' + nf(n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2, 2) + '</td><td class="num">' + nf(sd, 2) + '</td><td class="num">' + nf(mn[1], 2) + '<sup>’' + String(mn[0]).slice(2) + '</sup></td><td class="num">' + nf(mx[1], 2) + '<sup>’' + String(mx[0]).slice(2) + '</sup></td><td class="num">' + (tr ? nf(tr.b, 2) + stars(tr.p) : '–') + '</td><td class="num">' + (tr ? fp(tr.p) : '–') + '</td><td class="num">' + (p5.length ? nf(avg(l5) - avg(p5), 2) : '–') + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Descriptive statistics and trend'), 'Trend: slope of an ordinary least-squares line on the year, in the indicator’s units per year; *** p<0.01, ** p<0.05, * p<0.1. Min and max show their year.', { src: 'World Bank; author’s calculations.' });
  if (keys.length > 1) {
    let ch = '<thead><tr><th scope="col"></th>' + keys.map(k => '<th scope="col" class="num">' + esc(indL(k)) + '</th>').join('') + '</tr></thead><tbody>';
    keys.forEach(a => { ch += '<tr><th scope="row">' + esc(indL(a)) + '</th>' + keys.map(b => { const A = new Map(seriesY(a, iso)), B = seriesY(b, iso).filter(x => A.has(x[0])); if (B.length < 6) return '<td class="num">–</td>'; const xs = B.map(x => A.get(x[0])), ys = B.map(x => x[1]), mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length; let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); syy += (ys[i] - my) * (ys[i] - my); }); const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; return '<td class="num">' + (r == null ? '–' : nf(r, 2)) + '</td>'; }).join('') + '</tr>'; });
    tableWrap(body, ch + '</tbody>', tcap('Correlations between the indicators'), 'Pearson correlation over the years both indicators are available.', { src: 'World Bank; author’s calculations.' });
  }
}
function clForecast(body, c, keys, iso) {
  if (!CL.fk || !keys.includes(CL.fk)) CL.fk = keys[0];
  ctl2(body, '<label class="field"><span>Indicator</span><select id="cl-fk">' + keys.map(k => '<option value="' + k + '"' + (k === CL.fk ? ' selected' : '') + '>' + esc(indL(k)) + '</option>').join('') + '</select></label>', () => { CL.fk = $('#cl-fk').value; renderCL(); }, '#cl-fk');
  const s = seriesY(CL.fk, iso), y = s.map(x => x[1]);
  if (y.length < 8) { body.insertAdjacentHTML('beforeend', '<p class="note">Too few years of data to forecast.</p>'); return; }
  const F = holtFc(y, 5), last = s[s.length - 1][0], labels = s.map(x => String(x[0])).concat(F.out.map(o => String(last + o.h)));
  const pad = Array(s.length - 1).fill(null), lv = y[y.length - 1];
  const g = grid(body);
  figure(g, { prefix: 'C', wide: true, title: indL(CL.fk) + ': forecast to ' + (last + 5), sub: indU(CL.fk) + '; Holt linear trend model with 80% and 95% ranges', h: 360, source: 'World Bank; model estimates.',
    render: TH => tsOption(TH, labels, [S('Actual', y.concat(F.out.map(() => null)), { color: TH.ink, w: 2.2 }), ...bandSeries('95% range', pad.concat([lv], F.out.map(o => o.lo95)), pad.concat([lv], F.out.map(o => o.hi95)), TH.pos, 0.14, 'b95'), ...bandSeries('80% range', pad.concat([lv], F.out.map(o => o.lo80)), pad.concat([lv], F.out.map(o => o.hi80)), TH.pos, 0.26, 'b80'), S('Forecast', pad.concat([lv], F.out.map(o => o.f)), { color: TH.pos, dash: true, w: 2.4, end: true, dec: 2 })], { y1: indU(CL.fk), dec: 2, events: false }) });
  let h = '<thead><tr><th scope="col">Year</th><th scope="col" class="num">Forecast</th><th scope="col" class="num">80% range</th><th scope="col" class="num">95% range</th></tr></thead><tbody>';
  F.out.forEach(o => { h += '<tr><th scope="row">' + (last + o.h) + '</th><td class="num big">' + nf(o.f, 2) + '</td><td class="num">' + nf(o.lo80, 2) + ' to ' + nf(o.hi80, 2) + '</td><td class="num">' + nf(o.lo95, 2) + ' to ' + nf(o.hi95, 2) + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Forecast table'), 'Holt’s linear exponential smoothing, with smoothing weights chosen to minimise one-step errors (α = ' + nf(F.m.a, 2) + ', β = ' + nf(F.m.b, 2) + '). Ranges widen with the horizon. Statistical projections, not official forecasts.', { src: 'World Bank; model estimates.' });
  if (iso === 'BGD' && c.id === 'inflation') { const e = BD.ensemble.path[BD.ensemble.path.length - 1]; body.insertAdjacentHTML('beforeend', '<p class="note">Monthly models for Bangladesh (ARIMA and SVAR ensemble) project <b>' + nf(e.mean, 2) + '%</b> inflation in 12 months (80% range ' + nf(e.lo80, 2) + '–' + nf(e.hi80, 2) + '%). <a href="#lab~overview">Open the Forecast lab →</a> · <a href="/inflation/">Bangladesh Inflation Monitor →</a></p>'); }
}
function ctl2(host, html, onChange, sel) { const d = document.createElement('div'); d.className = 'controls'; d.innerHTML = html; host.append(d); const el = d.querySelector(sel); if (el) el.addEventListener('change', onChange); }
function readOf(k, iso) { const s = seriesY(k, iso); if (s.length < 3) return null; const l = s[s.length - 1], p = s[s.length - 2], tr = trendOf(s.slice(-15)), F = s.length >= 8 ? holtFc(s.map(x => x[1]), 5) : null, st = stdOf(k), mean = s.reduce((a, b) => a + b[1], 0) / s.length;
  return { k, l, p, tr, F, st, mean, out: st ? stdOut(st, l[1]) : false, big: !st && !!(band312(s.map(z => z[1])) || {}).out, first: s[0][0], n: s.length }; }
function clResults(body, c, keys, iso) {
  const items = keys.map(k => readOf(k, iso)).filter(Boolean).map(r => {
    const dir = r.tr ? (r.tr.p < 0.1 ? (r.tr.b > 0 ? 'a significant upward trend' : 'a significant downward trend') : 'no significant trend') : 'too short a history for a trend';
    const f = r.F ? ' The model projects ' + nf(r.F.out[4].f, 2) + ' by ' + (r.l[0] + 5) + ' (80% range ' + nf(r.F.out[4].lo80, 2) + ' to ' + nf(r.F.out[4].hi80, 2) + ').' : '';
    return '<li><b>' + esc(indL(r.k)) + ':</b> ' + nf(r.l[1], 2) + ' in ' + r.l[0] + ' (' + esc(indU(r.k)) + '), against an average of ' + nf(r.mean, 2) + ' since ' + r.first + '. Over the last 15 years there is ' + dir + '.' + f + (r.out ? ' The latest value is outside its benchmark (' + esc(r.st.txt) + ').' : '') + (r.big ? ' It has moved outside the band between its 3-year and 12-year averages.' : '') + '</li>';
  });
  body.insertAdjacentHTML('beforeend', '<section class="bd-sec"><ul class="cl-list">' + items.join('') + '</ul><p class="src-line"><b>Source:</b> World Bank; model estimates.</p></section>');
}
function clTests(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col" rowspan="2">Indicator</th><th scope="colgroup" colspan="3" class="cg">Unit root (ADF)</th><th scope="colgroup" colspan="2" class="cg">Normality (Jarque–Bera)</th><th scope="colgroup" colspan="2" class="cg">Autocorrelation (Ljung–Box)</th></tr><tr><th scope="col" class="num">τ</th><th scope="col" class="num">5% critical</th><th scope="col">Verdict</th><th scope="col" class="num">JB</th><th scope="col" class="num">p</th><th scope="col" class="num">Q</th><th scope="col" class="num">p</th></tr></thead><tbody>';
  keys.forEach(k => { const s = seriesY(k, iso), y = s.map(x => x[1]), a = adf(y), tr = trendOf(s), j = tr ? jb(tr.res) : null, lb = tr ? lbox(tr.res, Math.min(5, Math.floor(tr.res.length / 4))) : null;
    h += '<tr><th scope="row">' + esc(indL(k)) + '</th><td class="num">' + (a ? nf(a.tau, 2) : '–') + '</td><td class="num">' + (a ? nf(a.cv5, 2) : '–') + '</td><td>' + (a ? (a.tau < a.cv5 ? 'Stationary (unit root rejected at 5%)' : 'Unit root not rejected') : 'Too few years') + '</td><td class="num">' + (j ? nf(j.J, 2) : '–') + '</td><td class="num">' + (j ? fp(j.p) : '–') + '</td><td class="num">' + (lb ? nf(lb.Q, 2) : '–') + '</td><td class="num">' + (lb ? fp(lb.p) : '–') + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Statistical tests'), 'ADF: Δy on a constant, lagged level and one lagged difference; critical values from MacKinnon (2010) for the sample size. Jarque–Bera and Ljung–Box are applied to the residuals from the trend line.', { src: 'World Bank; author’s calculations.' });
}
function clHetero(body, c, keys, iso) {
  if (!CL.hk || !keys.includes(CL.hk)) CL.hk = keys[0];
  ctl2(body, '<label class="field"><span>Indicator</span><select id="cl-hk">' + keys.map(k => '<option value="' + k + '"' + (k === CL.hk ? ' selected' : '') + '>' + esc(indL(k)) + '</option>').join('') + '</select></label>', () => { CL.hk = $('#cl-hk').value; renderCL(); }, '#cl-hk');
  const k = CL.hk, me = lastOfS(k, iso);
  if (!me) return;
  const yr = me[0], E = clCountries(), REG = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
  const vals = E.map(e => [e, new Map(wser(k, e[0])).get(yr)]).filter(x => x[1] != null);
  const groups = REG.map(rg => vals.filter(x => x[0][3] === rg).map(x => x[1]));
  const kw = kwH(groups), all = vals.map(x => x[1]).sort((a, b) => a - b), sub = vals.filter(x => x[0][4] === (EMAPB()[iso] || [])[4]).map(x => x[1]).sort((a, b) => a - b);
  const pct = arr => Math.round(arr.filter(v => v < me[1]).length / Math.max(1, arr.length - 1) * 100);
  const box = a => { const q = p => a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))]; return [a[0], q(0.25), q(0.5), q(0.75), a[a.length - 1]]; };
  const rows = REG.map((rg, i) => [rg, groups[i].slice().sort((a, b) => a - b)]).filter(r => r[1].length >= 3);
  const g = grid(body);
  figure(g, { prefix: 'C', wide: true, title: indL(k) + ' across regions, ' + yr, sub: indU(k) + '; one value per economy; dashed line = ' + isoName(iso), h: 320, source: 'World Bank.',
    render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 18, top: 16, bottom: 6, containLabel: true }, tooltip: { trigger: 'item', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink } },
      xAxis: { type: 'category', data: rows.map(r => r[0] + ' (' + r[1].length + ')'), axisLabel: { color: TH.ink2, fontSize: 11 }, axisLine: { lineStyle: { color: TH.line } } }, yAxis: valAxis(TH, '', { scale: true }),
      series: [{ type: 'boxplot', data: rows.map(r => box(r[1])), itemStyle: { color: TH.dark ? 'rgba(111,168,232,.22)' : 'rgba(31,95,168,.14)', borderColor: TH.pal[0], borderWidth: 1.6 }, markLine: { symbol: 'none', silent: true, lineStyle: { color: TH.signal, type: 'dashed', width: 2 }, label: { color: TH.ink, formatter: isoName(iso) + ' ' + nf(me[1], 2) }, data: [{ yAxis: me[1] }] } }] }) });
  let h = '<thead><tr><th scope="col">Measure</th><th scope="col" class="num">Value</th><th scope="col">Reading</th></tr></thead><tbody>' +
    '<tr><th scope="row">Kruskal–Wallis H (regions differ?)</th><td class="num">' + (kw ? nf(kw.H, 2) + stars(kw.p) : '–') + '</td><td>' + (kw ? 'p = ' + fp(kw.p) + (kw.p < 0.05 ? ': regions differ significantly' : ': no significant difference between regions') : '–') + '</td></tr>' +
    '<tr><th scope="row">Percentile in the world</th><td class="num">' + pct(all) + '</td><td>' + esc(isoName(iso)) + ' is higher than ' + pct(all) + '% of ' + all.length + ' economies</td></tr>' +
    '<tr><th scope="row">Percentile in its sub-continent</th><td class="num">' + (sub.length > 1 ? pct(sub) : '–') + '</td><td>Among ' + sub.length + ' economies in ' + esc((EMAPB()[iso] || [])[4] || '') + '</td></tr></tbody>';
  tableWrap(body, h, tcap('Heterogeneity tests'), 'Kruskal and Wallis (1952): a rank-based test of whether regions share the same distribution.', { src: 'World Bank; author’s calculations.' });
}
function clRobust(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col">Indicator</th><th scope="col" class="num">Trend, last 10 years</th><th scope="col" class="num">Trend, last 20 years</th><th scope="col" class="num">Trend, all years</th><th scope="col" class="num">Next year: Holt</th><th scope="col" class="num">Linear trend</th><th scope="col" class="num">Naive</th><th scope="col">Reading</th></tr></thead><tbody>';
  keys.forEach(k => { const s = seriesY(k, iso), y = s.map(x => x[1]); if (s.length < 8) return; const t = [10, 20, 999].map(w => trendOf(s.slice(-w))), f = ['holt', 'trend', 'naive'].map(m => fc1(y, m));
    const signs = t.filter(Boolean).map(x => Math.sign(x.b)), same = signs.every(v => v === signs[0]), spread = Math.max(...f) - Math.min(...f), rel = Math.abs(spread / (Math.abs(y[y.length - 1]) || 1));
    h += '<tr><th scope="row">' + esc(indL(k)) + '</th>' + t.map(x => '<td class="num">' + (x ? nf(x.b, 2) + stars(x.p) : '–') + '</td>').join('') + f.map(v => '<td class="num">' + nf(v, 2) + '</td>').join('') + '<td>' + (same ? 'Trend direction is robust' : 'Trend direction depends on the period') + (rel < 0.1 ? '; forecasts agree' : '; forecasts differ by model') + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Robustness: periods and models'), 'Each column changes one assumption. A finding is robust when it holds across them.', { src: 'World Bank; model estimates.' });
}
function clValid(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col">Indicator</th><th scope="col" class="num">Years tested</th><th scope="col" class="num">RMSE, Holt</th><th scope="col" class="num">RMSE, trend</th><th scope="col" class="num">RMSE, naive</th><th scope="col" class="num">Theil’s U (Holt)</th><th scope="col">Best model</th></tr></thead><tbody>';
  keys.forEach(k => { const y = seriesY(k, iso).map(x => x[1]); if (y.length < 12) return; const b = ['holt', 'trend', 'naive'].map(m => backtest(y, m, 8)); if (!b[0]) return; const best = ['Holt', 'Linear trend', 'Naive'][b.map(x => x.rmse).indexOf(Math.min(...b.map(x => x.rmse)))];
    h += '<tr><th scope="row">' + esc(indL(k)) + '</th><td class="num">' + b[0].n + '</td>' + b.map(x => '<td class="num">' + nf(x.rmse, 2) + '</td>').join('') + '<td class="num' + (b[0].rmse / b[2].rmse < 1 ? ' up-good' : ' up-bad') + '">' + nf(b[0].rmse / b[2].rmse, 2) + '</td><td>' + best + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Validation: rolling one-year-ahead backtest'), 'Each model is re-estimated every year on data up to that year and judged on the next year it had not seen. Theil’s U below 1 means Holt beats the naive “no change” forecast.', { src: 'World Bank; model estimates.' });
}
function clPlacebo(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col">Indicator</th><th scope="col" class="num">Trend a year</th><th scope="col" class="num">Usual p-value</th><th scope="col" class="num">Placebo p-value</th><th scope="col">Reading</th></tr></thead><tbody>';
  keys.forEach(k => { const s = seriesY(k, iso); if (s.length < 8) return; const r = permTrend(s, 400); if (!r) return;
    h += '<tr><th scope="row">' + esc(indL(k)) + '</th><td class="num">' + nf(r.b, 2) + '</td><td class="num">' + fp(r.pt) + '</td><td class="num">' + fp(r.p) + '</td><td>' + (r.p < 0.05 ? 'The trend is real: shuffled years rarely produce one this strong' : 'Shuffled years often produce a trend this strong, so it may be chance') + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Placebo test: shuffled years'), 'The values are shuffled across years 400 times; the placebo p-value is the share of shuffles with a trend at least as steep as the real one (Fisher, 1935).', { src: 'World Bank; author’s calculations.' });
}
function clDecisions(body, c, keys, iso) {
  const items = keys.map(k => readOf(k, iso)).filter(Boolean).map(r => {
    const rising = r.F ? r.F.out[4].f > r.l[1] : r.tr && r.tr.b > 0;
    const sig = r.out ? 'Act' : r.big ? 'Watch' : 'Stable', cls = r.out ? 'bad' : r.big ? 'mid' : 'ok';
    const why = r.out ? 'outside its benchmark (' + r.st.txt + '; ' + r.st.src + ')' : r.big ? 'moved outside its 3- and 12-year average band' : r.st ? 'inside its benchmark (' + r.st.txt + ')' : 'no large change and no benchmark breach';
    return '<tr><th scope="row">' + esc(indL(r.k)) + '</th><td><span class="sig ' + cls + '">' + sig + '</span></td><td>' + esc(why) + '</td><td>' + (r.F ? (rising ? 'Expected to rise' : 'Expected to fall') + ' over five years' : '–') + '</td></tr>';
  });
  tableWrap(body, '<thead><tr><th scope="col">Indicator</th><th scope="col">Signal</th><th scope="col">Why</th><th scope="col">Outlook</th></tr></thead><tbody>' + items.join('') + '</tbody>', tcap('Decision signals'), 'Signals summarise the evidence for attention: Act = outside an international benchmark; Watch = outside the band between the 3-year and 12-year averages; Stable = neither. They are for information, not policy or investment advice.', { src: 'World Bank; benchmarks as listed; model estimates.' });
}
function clDiscussion(body, c, keys, iso) {
  const items = [];
  keys.forEach(k => { const s = seriesY(k, iso); if (!s.length) return; const gaps = s[s.length - 1][0] - s[0][0] + 1 - s.length, stale = new Date().getFullYear() - s[s.length - 1][0];
    let jump = null; for (let i = 1; i < s.length; i++) { const d = Math.abs(s[i][1] - s[i - 1][1]); if (!jump || d > jump[1]) jump = [s[i][0], d]; }
    items.push('<li><b>' + esc(indL(k)) + ':</b> ' + s.length + ' years (' + s[0][0] + '–' + s[s.length - 1][0] + ')' + (gaps > 0 ? ', with ' + gaps + ' missing years' : '') + (stale >= 2 ? '; the latest figure is ' + stale + ' years old' : '') + (jump ? '; the largest one-year move was ' + nf(jump[1], 2) + ' in ' + jump[0] + ', which may reflect a shock or a statistical break' : '') + '.</li>'); });
  items.push('<li>Figures are revised by national agencies and the World Bank, so recent years can change.</li>', '<li>Comparisons across economies depend on common definitions; check the notes in Learn for each indicator.</li>', '<li>Forecasts here are mechanical extrapolations of past patterns and cannot anticipate policy changes or new shocks.</li>');
  body.insertAdjacentHTML('beforeend', '<section class="bd-sec"><ul class="cl-list">' + items.join('') + '</ul><p class="src-line"><b>Source:</b> World Bank.</p></section>');
}
function clConclusions(body, c, keys, iso) {
  const R = keys.map(k => readOf(k, iso)).filter(Boolean), out = R.filter(r => r.out), big = R.filter(r => r.big), up = R.filter(r => r.F && r.F.out[4].f > r.l[1]);
  const parts = ['For ' + isoName(iso) + ', ' + R.length + ' indicators of ' + c.t.toLowerCase() + ' were analysed.'];
  parts.push(out.length ? out.map(r => indL(r.k)).join(', ') + (out.length > 1 ? ' are' : ' is') + ' outside the international benchmark and deserve' + (out.length > 1 ? '' : 's') + ' attention.' : 'No indicator is outside its international benchmark.');
  if (big.length) parts.push(big.map(r => indL(r.k)).join(', ') + ' moved outside the band between their 3-year and 12-year averages.');
  if (R.some(r => r.F)) parts.push(up.length + ' of ' + R.filter(r => r.F).length + ' forecasts point upward over the next five years.');
  parts.push('Treat the projections as indicative: validation shows how far they beat a naive forecast for each series.');
  body.insertAdjacentHTML('beforeend', '<div class="concl"><b>Conclusion.</b> ' + esc(parts.join(' ')) + '</div><p class="src-line"><b>Source:</b> World Bank; model estimates.</p>');
}
function clSources(body, c, keys, iso) {
  let h = '<thead><tr><th scope="col">Indicator</th><th scope="col">What it measures</th><th scope="col">Source</th><th scope="col">Learn more</th></tr></thead><tbody>';
  keys.forEach(k => { h += '<tr><th scope="row">' + esc(indL(k)) + '</th><td>' + esc((IND[k].desc || '') + ' ' + (IND[k].why || '')) + '</td><td>' + esc(shortSrc(IND[k].src)) + '</td><td>' + (FAQ_MAP[k] ? '<a href="#learn~' + FAQ_MAP[k] + '">Definition, formula and sources →</a>' : '–') + '</td></tr>'; });
  tableWrap(body, h + '</tbody>', tcap('Sources and notes'), 'Maps: Natural Earth. Bangladesh monthly data: Bangladesh Bank and BBS. Methods: see Learn and the Forecast lab’s References.', { src: 'World Bank.' });
}
function routeCL(h) {
  const m = /^cl(?:~([A-Z]{3}))?(?:~([a-z]+))?(?:~([a-z]+))?$/.exec(h);
  if (!m) return false;
  if (m[1] && EMAPB()[m[1]]) CL.iso = m[1];
  if (m[2] && CL_CATS.some(c => c.id === m[2])) CL.cat = m[2];
  if (m[3] && CL_SECS.some(s => s[0] === m[3])) CL.sec = m[3];
  const was = inited.cl;
  go('cl');
  if (was) renderCL();
  return true;
}

/* ================= Security monitor: warn, block and alert the owner ================= */
function initSecurity() {
  const ownerOn = () => document.documentElement.classList.contains('owner');
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; };
  const MSG = { copy: 'Copying is not allowed.', print: 'Printing is not allowed.', save: 'Saving the page is not allowed.', source: 'Viewing the page code is not allowed.', inspect: 'Developer tools are not allowed.', menu: 'The right-click menu is turned off.', drag: 'Dragging content out is not allowed.' };
  let lastWarn = 0, lastType = '', dtOpen = false;
  function warnBar(msg) {
    let b = document.getElementById('sec-warn');
    if (!b) { b = document.createElement('div'); b.id = 'sec-warn'; b.setAttribute('role', 'alert'); document.body.append(b); }
    b.textContent = msg; b.hidden = false; clearTimeout(warnBar.t); warnBar.t = setTimeout(() => { b.hidden = true; }, 6000);
  }
  function blockScreen() {
    let until = Number(store('mm.block') || 0);
    if (!isFinite(until) || until > Date.now() + 3600e3) { store('mm.block', null); until = 0; }
    if (until <= Date.now() || ownerOn()) { const o = document.getElementById('sec-block'); if (o) o.remove(); return false; }
    let o = document.getElementById('sec-block');
    if (!o) { o = document.createElement('div'); o.id = 'sec-block'; o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); document.body.append(o); }
    const left = Math.ceil((until - Date.now()) / 60000);
    o.innerHTML = '<div class="sec-card"><b>Access paused</b><p>This page detected repeated attempts to copy, save, print or inspect protected content. Access is paused for ' + left + ' more minute' + (left === 1 ? '' : 's') + ', and the site owner has been notified.</p><p class="note">If this was a mistake, wait for the pause to end and browse normally.</p></div>';
    clearTimeout(blockScreen.t); blockScreen.t = setTimeout(blockScreen, 30000);
    return true;
  }
  function alertOwner(type, n, force) {
    const url = window.MM_ALERT;
    if (!url || ownerOn()) return;
    let last = Number(store('mm.alerted') || 0);
    if (!isFinite(last)) last = 0;
    if (!force && Date.now() - last < 3600e3) return;
    store('mm.alerted', String(Date.now()));
    const body = JSON.stringify({ type: type, count: n, page: location.hash || '#overview', time: new Date().toISOString(), ua: navigator.userAgent, lang: navigator.language, screen: screen.width + 'x' + screen.height, user: (AUTH.user && AUTH.user.email) || '' });
    try { fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(() => {}); } catch (e) { /* offline */ }
  }
  function hit(type, soft) {
    if (ownerOn()) return;
    const now = Date.now();
    let a = []; try { a = JSON.parse(store('mm.sec') || '[]'); } catch (e) { a = []; }
    if (!Array.isArray(a)) a = [];
    a = a.filter(t => typeof t === 'number' && now - t < 600e3);
    if (!soft) { a.push(now); store('mm.sec', JSON.stringify(a)); }
    if (a.length >= 5) { store('mm.block', String(now + 600e3)); store('mm.sec', '[]'); alertOwner('access blocked after repeated attempts (' + type + ')', a.length, true); blockScreen(); return; }
    if (now - lastWarn > 4000 || type !== lastType) { lastWarn = now; lastType = type; warnBar('This content is protected. ' + MSG[type] + (soft ? '' : ' Repeated attempts block access for 10 minutes and notify the site owner.')); }
    alertOwner(type, a.length, false);
  }
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const inForm = t => t && t.closest && t.closest('input, textarea, select');
  document.addEventListener('copy', e => { if (!inForm(e.target)) hit('copy'); }, true);
  document.addEventListener('cut', e => { if (!inForm(e.target)) hit('copy'); }, true);
  document.addEventListener('contextmenu', e => { if (!inForm(e.target)) hit('menu', coarse); }, true);
  document.addEventListener('dragstart', e => { if (e.target && e.target.closest && e.target.closest('img, svg, .chart, table')) hit('drag'); }, true);
  document.addEventListener('keydown', e => {
    if (ownerOn()) return;
    const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
    const t = k === 'f12' ? 'inspect' : c && e.shiftKey && (k === 'i' || k === 'j' || k === 'c') ? 'inspect' : c && k === 'u' ? 'source' : c && k === 's' ? 'save' : c && k === 'p' ? 'print' : '';
    if (t) { e.preventDefault(); e.stopPropagation(); hit(t); }
  }, true);
  window.addEventListener('beforeprint', () => hit('print'));
  if (!coarse) setInterval(() => {
    if (ownerOn() || document.hidden) return;
    const open = window.outerWidth - window.innerWidth > 320 || window.outerHeight - window.innerHeight > 360;
    if (open && !dtOpen) hit('inspect', true);
    dtOpen = open;
  }, 3000);
  blockScreen();
}


/* ================= Earning: plans, ads for free visitors, subscribers ================= */
const EARN = window.MM_EARN || {};
function initPlans() {
  const host = $('#pl-cards');
  if (!host) return;
  const plans = (EARN.plans || []).filter(p => String(p.price || '').toLowerCase() !== 'free');
  const ph = t => '<span class="ph">' + esc(t) + '</span>';
  const price = p => { const u = String(p.usd || '').replace('US$', '').trim(), b = String(p.bdt || '').replace('৳', '').trim(), o = String(p.price || '').trim(); if (!u && !b && !o) return ph('Offer price coming soon'); return (u ? '<b>US$ ' + esc(u) + '</b>' : o ? '<b>' + esc(o) + '</b>' : ph('US$ price coming soon')) + ' <span class="pl-or">or</span> ' + (b ? '<b>৳ ' + esc(b) + '</b>' : ph('Taka price coming soon')); };
  host.innerHTML = plans.map((p, i) => '<article class="plan' + (i === 1 ? ' best' : '') + '"><h3>' + esc(p.name) + '</h3><p class="pl-price">' + price(p) + '</p><p class="pl-per">' + esc(p.period || '') + ', paid in advance; no automatic renewal</p><ul>' + (p.features || []).map(f => '<li>' + esc(f) + '</li>').join('') + '</ul><a class="btn' + (i === 1 ? ' primary' : '') + '" href="/join/">How to pay and join</a></article>').join('') +
    '<p class="note">Every page is available by subscription only. Pay by bKash or Nagad now; card payment through SSLCOMMERZ is coming soon. <a href="/terms/">Terms and conditions</a> · <a href="/refund/">Refund and cancellation</a> · <a href="/privacy/">Privacy</a> · <a href="/contact/">Contact</a></p>';
  const more = [];
  if (EARN.newsletter_form) more.push('<a class="btn" href="' + esc(EARN.newsletter_form) + '" target="_blank" rel="noopener">Get the free monthly update by email</a>');
  if (EARN.donate_link) more.push('<a class="btn" href="' + esc(EARN.donate_link) + '" target="_blank" rel="noopener">Support this site with a one-off gift</a>');
  $('#pl-more').innerHTML = more.length ? '<div class="controls">' + more.join('') + '</div>' : '';
  $('#pl-adv').innerHTML = EARN.advertise_form ? '<a class="btn primary" href="' + esc(EARN.advertise_form) + '" target="_blank" rel="noopener">Ask about advertising</a>' : '<button type="button" class="btn primary" data-go="contact">Ask about advertising</button>';
}
let adsLoaded = false;
function renderAds() {
  const off = document.documentElement.classList.contains('owner') || document.documentElement.classList.contains('subscriber');
  document.querySelectorAll('.ad-slot').forEach(slot => {
    if (off) { slot.hidden = true; return; }
    slot.hidden = false;
    if (slot.getAttribute('data-done')) return;
    const kind = slot.getAttribute('data-ad'), unit = kind === 'side' ? EARN.ad_slot_side : EARN.ad_slot_bottom;
    if (/^ca-pub-\d+$/.test(EARN.adsense_client || '') && unit) {
      slot.innerHTML = '<span class="ad-tag">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(EARN.adsense_client) + '" data-ad-slot="' + esc(unit) + '" data-ad-format="' + (kind === 'side' ? 'vertical' : 'auto') + '" data-full-width-responsive="true"></ins>';
      if (!adsLoaded) { adsLoaded = true; const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(EARN.adsense_client); document.head.append(s); }
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked */ }
    } else {
      slot.innerHTML = '<span class="ad-tag">Advertisement</span><div class="ad-house"><b>Your brand here</b><span>Reach readers who follow Bangladesh and the world economy.</span><button type="button" class="btn sm" data-go="plans">Advertise with us</button></div>';
    }
    slot.setAttribute('data-done', '1');
  });
}
function checkSub(u) {
  const root = document.documentElement;
  if (!u || !window.firebase || !firebase.firestore) { root.classList.remove('subscriber'); renderAds(); return; }
  firebase.firestore().collection('subscribers').doc(u.uid).get().then(d => {
    const x = d.exists ? d.data() : null, today = new Date().toISOString().slice(0, 10);
    root.classList.toggle('subscriber', !!(x && x.active && (!x.until || String(x.until) >= today)));
    renderAds();
  }).catch(() => { root.classList.remove('subscriber'); renderAds(); });
}

/* ================= DSGE guide, estimates, shocks and derivation ================= */
const DSGE_GUIDE = `
<h3>What a DSGE model is</h3>
<p>A <b>dynamic stochastic general equilibrium</b> (DSGE) model describes the whole economy as the result of decisions by households, firms and the central bank, each pursuing its own goals and forming expectations about the future. <b>Dynamic</b>: today’s choices depend on expected future conditions. <b>Stochastic</b>: the economy is hit by random shocks. <b>General equilibrium</b>: the markets for goods, labour and money clear together, so every variable responds to every other.</p>
<h3>Background</h3>
<p>Real business cycle models (Kydland and Prescott, 1982) first built the cycle from optimising households and firms. The Lucas critique (Lucas, 1976) had argued that policy analysis needs relationships that stay stable when policy changes, which pushed economists towards models built on preferences and technology. The New Keynesian synthesis added sticky prices (Calvo, 1983) and interest-rate rules (Taylor, 1993); Clarida, Galí and Gertler (1999) set out the three-equation version used here. Medium-scale models (Christiano, Eichenbaum and Evans, 2005; Smets and Wouters, 2007) added wage stickiness, habits and investment costs and were estimated with Bayesian methods. After 2008, models added financial frictions (Bernanke, Gertler and Gilchrist, 1999; Gertler and Karadi, 2011), and more recently heterogeneous households (Kaplan, Moll and Violante, 2018).</p>
<h3>How it works, step by step</h3>
<ol class="cl-list"><li>Write each agent’s problem: households choose spending and work, firms set prices that adjust only occasionally, and the central bank follows a rule.</li><li>Derive the optimality conditions (the Euler equation for spending and the pricing equation for firms).</li><li>Find the steady state, where nothing changes over time.</li><li>Approximate the model around the steady state (log-linearisation), turning it into a few linear equations.</li><li>Solve for a unique stable path under rational expectations (Blanchard and Kahn, 1980); this needs the determinacy condition shown in the calibration table.</li><li>Choose the parameters: calibrate them from studies and averages, or estimate them from data (often by Bayesian methods with the Kalman filter).</li><li>Use the solved model: impulse responses, variance and historical decompositions, forecasts and policy scenarios.</li></ol>
<h3>Compatibility: what the model needs</h3>
<p>Quarterly macroeconomic series (output, inflation, the policy rate and, for larger models, wages, investment and the exchange rate), made stationary by removing trends; a reasonably stable policy regime; and, for a small open economy such as Bangladesh, open-economy blocks for the exchange rate, imports and remittances. The model complements statistical tools: ARIMA and SVAR models forecast well over short horizons, while the DSGE explains why variables move. The two are combined in DSGE-VAR models (Del Negro and Schorfheide, 2004) and in forecast pooling.</p>
<div class="grid2"><div><h3>Merits</h3><ul class="cl-list"><li>Built on behaviour, so it is less exposed to the Lucas critique when policy changes.</li><li>Tells a complete, internally consistent story: every forecast has an explanation.</li><li>Separates structural shocks (demand, supply, policy) that statistical models mix together.</li><li>Allows counterfactuals: what if the policy rate had been higher?</li><li>Makes expectations explicit and can measure welfare.</li></ul></div><div><h3>Drawbacks</h3><ul class="cl-list"><li>Strong assumptions: rational expectations and a representative household.</li><li>Linear approximations miss crises, the zero lower bound and other non-linear events.</li><li>Small DSGE models often forecast worse than simple statistical models at short horizons.</li><li>Results depend on calibration or priors.</li><li>Omits the informal sector, administered prices and supply bottlenecks unless they are added.</li><li>Structural breaks such as pandemics weaken its fit.</li></ul></div></div>
<div class="grid2"><div><h3>Where it works well</h3><ul class="cl-list"><li>Analysing monetary policy under an interest-rate or inflation-targeting framework.</li><li>Tracing how demand, supply and policy shocks spread through output, inflation and interest rates.</li><li>Scenario planning and medium-term projections with a story.</li><li>Teaching and policy communication.</li></ul></div><div><h3>Where it works poorly</h3><ul class="cl-list"><li>Financial crises, bank runs and debt defaults, unless financial frictions are modelled.</li><li>Large breaks such as lockdowns, or hyperinflation.</li><li>Fixed exchange rates or capital controls without open-economy blocks.</li><li>Economies with large informal sectors or administered prices, without extensions.</li><li>Very short or unreliable data, and short-horizon point forecasts.</li></ul></div></div>
<h3>Practical examples</h3>
<ul class="cl-list"><li><b>Policy-rate rise:</b> Bangladesh Bank raises the policy rate by 0.25 percentage point: the output gap and inflation fall gradually (the Monetary policy chart).</li><li><b>Import-price surge:</b> a Taka depreciation or an oil-price spike raises costs: inflation rises while output falls, creating a trade-off for policy (Imported inflation chart).</li><li><b>Election-year spending:</b> higher public spending lifts demand: output and inflation rise and rates follow (Government spending chart).</li><li><b>Remittance boom:</b> higher household income works like a demand shock, raising consumption and imports.</li><li><b>Banking stress:</b> wider lending spreads act like a risk-premium shock, lowering output and inflation.</li><li><b>Credible target change:</b> announcing a different inflation target moves inflation and rates together (Inflation target chart).</li></ul>`;
const DSGE_APPS = [
  ['Monetary policy (interest-rate surprise)', 'Policy rule', 'Gap ↓, inflation ↓, rate ↑', 'Three-equation model', 'Computed'],
  ['Demand (preference, confidence)', 'IS curve', 'Gap ↑, inflation ↑, rate ↑', 'Three-equation model', 'Computed'],
  ['Cost-push (mark-up, wages)', 'Phillips curve', 'Gap ↓, inflation ↑, rate ↑', 'Three-equation model', 'Computed'],
  ['Productivity (technology)', 'Natural rate and potential output', 'Output ↑, gap ↓, inflation ↓', 'Three-equation model', 'Computed'],
  ['Inflation-target change', 'Policy rule', 'Inflation ↑, gap ↑', 'Three-equation model', 'Computed'],
  ['Government spending', 'IS curve (persistent)', 'Gap ↑, inflation ↑, rate ↑', 'Three-equation model; fiscal DSGE for multipliers and debt', 'Computed'],
  ['Risk premium (financial conditions)', 'IS curve via the natural rate', 'Gap ↓, inflation ↓, rate ↓', 'Three-equation model; financial-friction DSGE for credit', 'Computed'],
  ['Imported inflation (exchange rate, oil)', 'Phillips curve (persistent)', 'Inflation ↑, gap ↓, rate ↑', 'Small open-economy DSGE (Galí and Monacelli, 2005)', 'Computed (closed-economy approximation)'],
  ['Foreign demand, export shocks', 'IS curve via net exports', 'Gap ↑, inflation ↑', 'Small open-economy DSGE', 'Model extension'],
  ['Terms of trade', 'Prices and income', 'Depends on import share', 'Small open-economy DSGE', 'Model extension'],
  ['Remittance inflows', 'Household income and demand', 'Gap ↑, imports ↑', 'Open-economy DSGE with remittances', 'Model extension'],
  ['Credit supply, bank capital', 'Lending spreads', 'Investment ↓, gap ↓', 'Financial-friction DSGE (Gertler and Karadi, 2011)', 'Model extension'],
  ['Tax changes', 'Labour supply and demand', 'Depends on the tax', 'Fiscal DSGE', 'Model extension'],
  ['Wage mark-up, labour supply', 'Wage Phillips curve', 'Inflation ↑, employment ↓', 'Medium-scale DSGE (Smets and Wouters, 2007)', 'Model extension'],
  ['Investment-specific technology', 'Capital accumulation', 'Investment ↑, output ↑', 'Medium-scale DSGE', 'Model extension'],
  ['Housing demand', 'Collateral and property prices', 'Consumption ↑, credit ↑', 'Housing DSGE (Iacoviello, 2005)', 'Model extension'],
  ['News about future productivity', 'Expectations', 'Spending ↑ today', 'Any DSGE with news shocks', 'Model extension'],
  ['Inequality and transfers', 'Household heterogeneity', 'Distribution of spending', 'Heterogeneous-agent DSGE (HANK)', 'Model extension'],
  ['Any combination', 'Sum of single responses (linear model)', 'Add the charts', 'Any linearised DSGE', '3 combinations computed'],
];
const DSGE_DERIV = `
<ol class="deriv">
<li><b>Households.</b> Maximise E<sub>0</sub> Σ<sub>t</sub> β<sup>t</sup> [ C<sub>t</sub><sup>1−σ</sup>/(1−σ) − N<sub>t</sub><sup>1+φ</sup>/(1+φ) ] subject to P<sub>t</sub>C<sub>t</sub> + Q<sub>t</sub>B<sub>t</sub> ≤ B<sub>t−1</sub> + W<sub>t</sub>N<sub>t</sub> + D<sub>t</sub>: utility from consumption C, disutility from work N, bonds B at price Q<sub>t</sub> = 1/(1 + i<sub>t</sub>).</li>
<li><b>Optimality conditions.</b> Labour supply W<sub>t</sub>/P<sub>t</sub> = C<sub>t</sub><sup>σ</sup>N<sub>t</sub><sup>φ</sup>; Euler equation 1 = β(1 + i<sub>t</sub>) E<sub>t</sub>[(C<sub>t+1</sub>/C<sub>t</sub>)<sup>−σ</sup> P<sub>t</sub>/P<sub>t+1</sub>].</li>
<li><b>Log-linearise the Euler equation</b> (lower-case letters are logs; ρ = −ln β): c<sub>t</sub> = E<sub>t</sub>c<sub>t+1</sub> − (1/σ)(i<sub>t</sub> − E<sub>t</sub>π<sub>t+1</sub> − ρ).</li>
<li><b>Goods market clears</b> (y<sub>t</sub> = c<sub>t</sub>), and subtracting the same equation under flexible prices gives the <b>IS curve</b> in the output gap x<sub>t</sub> = y<sub>t</sub> − y<sup>n</sup><sub>t</sub>: x<sub>t</sub> = E<sub>t</sub>x<sub>t+1</sub> − (1/σ)(i<sub>t</sub> − E<sub>t</sub>π<sub>t+1</sub> − r<sup>n</sup><sub>t</sub>), with natural rate r<sup>n</sup><sub>t</sub> = ρ + σE<sub>t</sub>Δy<sup>n</sup><sub>t+1</sub>. A demand shock d<sub>t</sub> is added to the right-hand side.</li>
<li><b>Firms.</b> Each firm produces Y<sub>t</sub>(j) = A<sub>t</sub>N<sub>t</sub>(j)<sup>1−α</sup> and faces demand with elasticity ε. Under Calvo pricing, each period a share 1 − θ of firms may reset prices.</li>
<li><b>Optimal reset price</b>: p*<sub>t</sub> = μ + (1 − βθ) Σ<sub>k</sub> (βθ)<sup>k</sup> E<sub>t</sub>[mc<sub>t+k|t</sub> + p<sub>t+k</sub>], with mark-up μ = ln(ε/(ε − 1)): firms set prices on expected future costs, discounted by the chance the price is still in force.</li>
<li><b>Price index</b>: π<sub>t</sub> = (1 − θ)(p*<sub>t</sub> − p<sub>t−1</sub>).</li>
<li><b>Combine steps 6 and 7</b>: π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + λ m̂c<sub>t</sub>, with λ = [(1 − θ)(1 − βθ)/θ] · Θ and Θ = (1 − α)/(1 − α + αε).</li>
<li><b>Marginal cost and the output gap</b>: m̂c<sub>t</sub> = (σ + (φ + α)/(1 − α)) x<sub>t</sub>, giving the <b>New Keynesian Phillips curve</b> π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + κx<sub>t</sub> + u<sub>t</sub>, with κ = λ(σ + (φ + α)/(1 − α)) and cost-push shock u<sub>t</sub>.</li>
<li><b>Monetary policy</b>: i<sub>t</sub> = ρ + φ<sub>π</sub>π<sub>t</sub> + φ<sub>y</sub>x<sub>t</sub> + v<sub>t</sub> (Taylor rule with policy shock v<sub>t</sub>).</li>
<li><b>Shocks</b> follow AR(1) processes: z<sub>t</sub> = ρ<sub>z</sub>z<sub>t−1</sub> + ε<sub>t</sub>, where ρ<sub>z</sub> is persistence.</li>
<li><b>Determinacy</b>: a unique stable solution exists when κ(φ<sub>π</sub> − 1) + (1 − β)φ<sub>y</sub> &gt; 0 (Bullard and Mitra, 2002): policy must raise the real rate when inflation rises.</li>
<li><b>Solution</b> by undetermined coefficients: guess x<sub>t</sub> = ψ<sub>x</sub>z<sub>t</sub> and π<sub>t</sub> = ψ<sub>π</sub>z<sub>t</sub>, substitute, and solve the two linear equations [σ(1 − ρ) + φ<sub>y</sub>]ψ<sub>x</sub> + (φ<sub>π</sub> − ρ)ψ<sub>π</sub> = −v + r + σd and −κψ<sub>x</sub> + (1 − βρ)ψ<sub>π</sub> = u. For a policy shock: ψ<sub>x</sub> = −(1 − βρ)Λ and ψ<sub>π</sub> = −κΛ, with Λ = 1/[(1 − βρ)(σ(1 − ρ) + φ<sub>y</sub>) + κ(φ<sub>π</sub> − ρ)]. With this calibration κ = 0.1717 and, for ρ = 0.5, Λ = 2.052: a 25 basis-point shock lowers the output gap by 0.26% and annualised inflation by 0.35 percentage point on impact, as in the chart. A productivity shock moves potential output by ψ<sub>ya</sub> = (1 + φ)/(σ(1 − α) + φ + α) = 1 and the natural rate by −σψ<sub>ya</sub>(1 − ρ<sub>a</sub>)a<sub>t</sub>.</li>
</ol>`;
function dsgeExtras(body, D) {
  bayesBlock(body, D);
  if (D.est && D.est.length) {
    const s = sec(body, 'Estimated equations for Bangladesh', 'The calibration above comes from a textbook. Here the three equations are estimated on Bangladesh data, giving each coefficient a standard error, p-value and 95% and 99% confidence intervals.');
    D.est.forEach(eq => {
      let h = '<thead><tr><th scope="col">Coefficient</th><th scope="col" class="num">Estimate</th><th scope="col" class="num">Std. error</th><th scope="col" class="num">t</th><th scope="col" class="num">p-value</th><th scope="col">Significance</th><th scope="col" class="num">95% interval</th><th scope="col" class="num">99% interval</th></tr></thead><tbody>';
      eq.rows.forEach(r => {
        const sig = r.p < 0.01 ? 'Significant at 1%' : r.p < 0.05 ? 'Significant at 5%' : r.p < 0.1 ? 'Significant at 10%' : 'Not significant';
        h += '<tr' + (r.derived ? ' class="foot"' : '') + '><th scope="row">' + esc(r.name) + '</th><td class="num big">' + nf(r.coef, 3) + stars(r.p) + '</td><td class="num">' + nf(r.se, 3) + '</td><td class="num">' + nf(r.t, 2) + '</td><td class="num">' + fp(r.p) + '</td><td>' + sig + '</td><td class="num">' + nf(r.ci95[0], 3) + ' to ' + nf(r.ci95[1], 3) + '</td><td class="num">' + nf(r.ci99[0], 3) + ' to ' + nf(r.ci99[1], 3) + '</td></tr>';
      });
      tableWrap(s, h + '</tbody>', tcap(eq.eq), 'N = ' + eq.n + ' quarters (' + esc(eq.sample) + '); R² = ' + nf(eq.r2, 3) + '. *** p < 0.01, ** p < 0.05, * p < 0.10. Rows shaded at the foot are long-run responses derived from the short-run coefficients (delta method).', { src: 'BBS and Bangladesh Bank; author’s estimates.' });
    });
    const find = (e, t) => (D.est[e].rows.find(r => r.name.indexOf(t) >= 0) || null);
    const fpi = find(0, 'Long-run response to inflation'), fy = find(0, 'Long-run response to the output gap'), sm = find(0, 'smoothing'), kap = find(1, 'κ'), per = find(1, 'persistence'), rr = find(2, 'real interest');
    const ci = r => nf(r.ci95[0], 2) + ' to ' + nf(r.ci95[1], 2), pv = r => (r.p < 0.001 ? 'p < 0.001' : 'p = ' + nf(r.p, 3));
    const items = [];
    if (fpi) items.push('<b>Policy reacts to inflation.</b> The long-run response of the call-money rate to inflation is ' + nf(fpi.coef, 2) + ' (' + pv(fpi) + '; 95% interval ' + ci(fpi) + '). ' + (fpi.ci95[0] > 1 ? 'Even the lower bound exceeds 1, so policy satisfies the Taylor principle: real rates rise when inflation rises.' : fpi.coef > 1 ? 'The estimate exceeds 1, consistent with the Taylor principle, but the 95% interval reaches down to ' + nf(fpi.ci95[0], 2) + ', so this holds only with some uncertainty.' : 'The estimate is below 1, so real rates have not risen with inflation.') + ' The calibration assumes 1.5.');
    if (fy) items.push('<b>Little reaction to the output gap.</b> The long-run response is ' + nf(fy.coef, 2) + ' (' + pv(fy) + '), ' + (fy.p < 0.1 ? 'statistically significant.' : 'not statistically different from zero.'));
    if (sm) items.push('<b>Gradual policy.</b> The smoothing coefficient is ' + nf(sm.coef, 2) + ': about ' + Math.round((1 - sm.coef) * 100) + '% of the gap between the actual and desired rate closes each quarter.');
    if (per && kap) items.push('<b>A flat Phillips curve.</b> Inflation is highly persistent (' + nf(per.coef, 2) + ') and the output-gap slope is ' + nf(kap.coef, 3) + ' (' + pv(kap) + '). ' + (kap.p < 0.1 ? 'Domestic slack moves inflation.' : 'Domestic slack has had little measurable effect, so inflation in Bangladesh has been driven more by costs, food and import prices and by expectations than by the output gap.'));
    if (rr) items.push('<b>Interest rates and demand.</b> A higher real interest rate is associated with a ' + (rr.coef < 0 ? 'lower' : 'higher') + ' output gap (' + nf(rr.coef, 2) + ', ' + pv(rr) + '; 95% interval ' + ci(rr) + '). ' + (rr.p < 0.05 ? 'The effect is significant at 5%.' : 'The sign is as theory predicts, but the effect is not significant at 5%, because the interval includes zero.'));
    items.push('<b>Caveats.</b> ' + esc((D.est_meta || {}).data || '') + '. The sample is short, the output gap is a proxy, and least squares with a lagged dependent variable can be biased; treat the numbers as indicative. ' + esc((D.est_meta || {}).method || '') + '.');
    s.insertAdjacentHTML('beforeend', '<h3>Interpretation</h3><ul class="cl-list">' + items.map(x => '<li>' + x + '</li>').join('') + '</ul>');
  }
  const g2 = sec(body, 'Guide to DSGE models', 'Definition, background, how the model works, what it needs, merits and drawbacks, where it works and where not, with practical examples.');
  g2.insertAdjacentHTML('beforeend', '<div class="dsge-guide">' + DSGE_GUIDE + '</div>');
  const a = sec(body, 'Every shock, combination and application', 'The charts above compute eleven scenarios with the three-equation model. Other shocks need extended models; this table lists them, where they enter and what they do.');
  let t = '<thead><tr><th scope="col">Shock or application</th><th scope="col">Where it enters</th><th scope="col">Typical effect</th><th scope="col">Model needed</th><th scope="col">On this site</th></tr></thead><tbody>';
  DSGE_APPS.forEach(r => { t += '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td></tr>'; });
  tableWrap(a, t + '</tbody>', tcap('Shocks, combinations and model families'), 'Because the solved model is linear, the response to any combination of shocks is the sum of the single-shock responses.', { src: 'Galí (2015); studies cited.' });
  const d = sec(body, 'Equations and derivation, step by step', 'How the three equations follow from household and firm behaviour (Galí, 2015, chapter 3).');
  d.insertAdjacentHTML('beforeend', '<div class="formula deriv-box">' + DSGE_DERIV + '</div>');
}
function longInfl(host) {
  const s = wser('inflation', 'BGD'), P = PK('infl'), e = BD.ensemble.path, st = BD.ensemble.start;
  if (!s.length || !P || !e || !st) return;
  const kS = (+st.slice(0, 4)) * 12 + (+st.slice(5, 7)) - 1, months = {};
  for (let k = P.k0; k < kS; k++) { const v = P.v[k - P.k0]; if (v != null) (months[Math.floor(k / 12)] = months[Math.floor(k / 12)] || []).push(v); }
  e.forEach((x, i) => { const k = kS + i; (months[Math.floor(k / 12)] = months[Math.floor(k / 12)] || []).push(x.mean); });
  const lastWB = s[s.length - 1][0], proj = Object.keys(months).map(Number).filter(y => y > lastWB && months[y].length === 12);
  const y1 = Math.max(lastWB, ...proj), labels = [];
  for (let y = s[0][0]; y <= y1; y++) labels.push(String(y));
  const m = new Map(s), avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const act = labels.map(l => (m.has(+l) ? m.get(+l) : null));
  const pr = labels.map(l => (+l === lastWB ? m.get(lastWB) : proj.includes(+l) ? avg(months[+l]) : null));
  figure(host, { prefix: labState.prefix, wide: true, title: 'Inflation since ' + s[0][0] + ', with the projection', sub: '% a year; World Bank annual series from its first year, with the monthly ensemble projection averaged by year', h: 340,
    notes: 'The World Bank series for Bangladesh starts in ' + s[0][0] + '; there is no official consumer-price inflation figure for earlier years. Projected years average actual months and the monthly ensemble forecast.',
    source: 'World Bank; BBS via Bangladesh Bank; model estimates.',
    render: TH => tsOption(TH, labels, [S('Inflation (World Bank)', act, { w: 2.4, std: 'inflation', end: true, dec: 2 }), S('Projection (annual average)', pr, { dash: true, w: 2.4, color: TH.signal || '#C9A24B', end: true, dec: 2 })], { y1: '% a year', dec: 2, events: false }) });
}
function worldLocator(host, iso) {
  try {
    const G = RAW.geo && RAW.geo.dots, e = EMAPB()[iso];
    if (!G || !G.d || !G.iso || !host || host.querySelector('.geo-world')) return;
    const k0 = G.iso.indexOf(iso), name = e ? e[1] : iso, s = G.s, VW = +RAW.geo.w || 1000, VH = +RAW.geo.h || 436;
    const box = document.createElement('div');
    box.className = 'geo-world';
    box.innerHTML = '<p class="geo-world-t">Where ' + esc(name) + ' is in the world</p><canvas role="img" aria-label="World map with ' + esc(name) + ' highlighted"></canvas><p class="src-line"><b>Source:</b> Natural Earth.</p>';
    host.append(box);
    const cv = box.querySelector('canvas'), W = Math.max(240, (box.clientWidth || 360) - 20), sc = W / VW, H = VH * sc, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = Math.round(H) + 'px';
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8a96a3';
    let sx = 0, sy = 0, n = 0;
    c.fillStyle = muted; c.globalAlpha = 0.35;
    for (let q = 0; q < G.d.length; q += 3) { if (G.d[q + 2] === k0) continue; c.beginPath(); c.arc((s / 2 + G.d[q] * s) * sc, (s / 2 + G.d[q + 1] * s) * sc, s * 0.37 * sc, 0, 6.2832); c.fill(); }
    c.fillStyle = '#E5484D'; c.globalAlpha = 1;
    for (let q = 0; q < G.d.length; q += 3) { if (G.d[q + 2] !== k0) continue; const x = (s / 2 + G.d[q] * s) * sc, y = (s / 2 + G.d[q + 1] * s) * sc; c.beginPath(); c.arc(x, y, s * 0.5 * sc, 0, 6.2832); c.fill(); sx += x; sy += y; n++; }
    if (n) { c.strokeStyle = '#E5484D'; c.lineWidth = 2; c.beginPath(); c.arc(sx / n, sy / n, Math.max(10, Math.sqrt(n) * s * sc * 1.2), 0, 6.2832); c.stroke(); }
    else box.insertAdjacentHTML('beforeend', '<p class="note">' + esc(name) + ' is too small to show at this map’s scale.</p>');
  } catch (err) { /* the locator map is optional */ }
}
function band312(vals) {
  const v = (vals || []).filter(x => x != null && isFinite(x));
  if (v.length < 13) return null;
  const last = v[v.length - 1], prev = v.slice(0, -1), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const a3 = mean(prev.slice(-3)), a12 = mean(prev.slice(-12)), lo = Math.min(a3, a12), hi = Math.max(a3, a12), tol = 1e-9 + 0.002 * Math.abs(hi);
  return { out: last > hi + tol || last < lo - tol, a3: a3, a12: a12, last: last };
}
const bandMsg = (b, unit) => 'Outside the band between its 3-period average (' + nf(b.a3, 2) + ') and 12-period average (' + nf(b.a12, 2) + ')' + (unit ? ' ' + unit : '') + '; values blink when they leave this band and no official benchmark applies';

/* ================= Inflation explorer (Bangladesh, at a glance) ================= */
const ymK = s => (+String(s).slice(0, 4)) * 12 + (+String(s).slice(5, 7)) - 1;
const EXPL = { sel: null, proj: true };
function inflExplorer(host, below) {
  const P0 = PK('infl'); if (!P0 || !BD.ensemble) { infFan(host, true); return; }
  const pool = [];
  [['infl', 'Headline inflation, point-to-point'], ['infl_avg', 'Headline inflation, 12-month average'], ['food', 'Food inflation'], ['nonfood', 'Non-food inflation']].forEach(([k, l]) => { if (PK(k)) pool.push({ k, label: l, pk: PK(k), grp: 'Inflation measures' }); });
  (BD.cpi_components || []).forEach((c, i) => { const s = c.series; if (s && s.v && s.v.length) pool.push({ k: 'cpi' + i, label: 'CPI: ' + c.name, pk: { f: 'M', k0: s.k0 != null ? s.k0 : ymK(s.s), v: s.v }, grp: 'CPI groups (published from ' + (s.s || '') + ', new 2021–22 base)' }); });
  [['call', 'Call money rate'], ['lend', 'Lending rate'], ['m2', 'Broad money (M2) growth'], ['pcredit', 'Private-sector credit growth'], ['xr_dep', 'Taka depreciation'], ['remit_g', 'Remittance growth'], ['exp_g', 'Export growth'], ['iip', 'Industrial production growth']].forEach(([k, l]) => { const p = PK(k); if (p && p.f === 'M') pool.push({ k, label: l, pk: p, grp: 'Related real and financial variables' }); });
  if (!EXPL.sel) EXPL.sel = new Set(['infl', 'infl_avg', 'food', 'nonfood']);
  const kS = ymK(BD.ensemble.start), e = BD.ensemble.path;
  let node = null;
  const draw = () => { if (node) rerender(node); };
  const fig = figure(host, { prefix: labState.prefix, wide: true, title: 'Inflation in Bangladesh: every measure, with projections', sub: '% year on year (rates in %); tick series below; dashed lines are 12-month projections', h: 400,
    notes: 'Headline projection: ensemble of ARIMA and SVAR (Forecast lab). Other projections: Holt’s linear exponential smoothing fitted to the last five years of each series. CPI groups: base 2005–06 from July 2013 to March 2023, base 2021–22 from April 2024; no year-on-year rate exists across the change of base, so group lines break for a year. Transport, communication, recreation and education link to combined old-base groups (approximate).',
    source: 'BBS and Bangladesh Bank; model estimates.',
    render: TH => {
      const chosen = pool.filter(p => EXPL.sel.has(p.k));
      if (!chosen.length) return { title: { text: 'Tick at least one series below', left: 'center', top: 'middle', textStyle: { color: TH.muted, fontSize: 13 } } };
      let k0 = Math.min(...chosen.map(p => p.pk.k0)); const k1 = kS + e.length - 1;
      const labels = []; for (let k = k0; k <= k1; k++) labels.push(bdLab('M', k));
      const series = [];
      chosen.forEach((p, j) => {
        const col = TH.pal[j % TH.pal.length], vals = labels.map((_, i) => { const kk = k0 + i, idx = kk - p.pk.k0; return kk < kS && idx >= 0 && idx < p.pk.v.length ? p.pk.v[idx] : null; });
        series.push(S(p.label, vals, { color: col, w: 2.2, end: true, dec: 2 }));
        if (!EXPL.proj) return;
        let lastI = -1; vals.forEach((v, i) => { if (v != null) lastI = i; }); if (lastI < 0) return;
        let fc;
        if (p.k === 'infl') fc = e.map(x => x.mean);
        else { const hist = p.pk.v.filter(v => v != null).slice(-60); if (hist.length < 12) return; const F = holtFc(hist, 12); fc = F.out.map(o => o.f); }
        const pv = labels.map(() => null); pv[lastI] = vals[lastI];
        fc.forEach((v, h) => { const i = lastI + 1 + h; if (i < pv.length) pv[i] = v; });
        series.push(S(p.label + ' (projection)', pv, { color: col, dash: true, w: 2, dec: 2 }));
      });
      return tsOption(TH, labels, series, { y1: '%', dec: 2, zoom: labels.length > 60, events: false });
    } });
  node = fig.querySelector('.chart');
  const box = document.createElement('div'); box.className = 'picker';
  const groups = {}; pool.forEach(p => { (groups[p.grp] = groups[p.grp] || []).push(p); });
  box.innerHTML = Object.entries(groups).map(([g, ps]) => '<div class="pk-g"><b>' + esc(g) + '</b><div class="pk-row">' + ps.map(p => '<label class="pk"><input type="checkbox" data-k="' + p.k + '"' + (EXPL.sel.has(p.k) ? ' checked' : '') + '><span>' + esc(p.label) + '</span></label>').join('') + '</div></div>').join('') +
    '<div class="pk-act"><button type="button" class="btn sm" data-pk="infl">All inflation measures</button><button type="button" class="btn sm" data-pk="all">Everything</button><button type="button" class="btn sm" data-pk="none">Clear</button><label class="pk"><input type="checkbox" data-pk="proj"' + (EXPL.proj ? ' checked' : '') + '><span>Show projections</span></label></div>';
  (below || host).append(box);
  explGranger(below || host);
  box.addEventListener('change', ev => { const t = ev.target; if (t.getAttribute('data-pk') === 'proj') { EXPL.proj = t.checked; draw(); return; } const k = t.getAttribute('data-k'); if (!k) return; if (t.checked) EXPL.sel.add(k); else EXPL.sel.delete(k); draw(); });
  box.addEventListener('click', ev => { const b = ev.target.closest('button[data-pk]'); if (!b) return; const m = b.getAttribute('data-pk'); EXPL.sel = new Set(m === 'none' ? [] : pool.filter(p => m === 'all' || p.grp !== 'Related real and financial variables').map(p => p.k)); box.querySelectorAll('input[data-k]').forEach(x => { x.checked = EXPL.sel.has(x.getAttribute('data-k')); }); draw(); });
  const H = P0, rows = [];
  pool.filter(p => p.grp === 'Related real and financial variables').forEach(p => {
    let best = null;
    for (let L = 0; L <= 12; L++) {
      const xs = [], ys = [];
      for (let k = Math.max(H.k0, p.pk.k0 + L); k < H.k0 + H.v.length; k++) { const hv = H.v[k - H.k0], xv = p.pk.v[k - L - p.pk.k0]; if (hv != null && xv != null && isFinite(hv) && isFinite(xv)) { xs.push(xv); ys.push(hv); } }
      if (xs.length < 24) continue;
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let sxy = 0, sxx = 0, syy = 0;
      xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
      const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
      if (!best || Math.abs(r) > Math.abs(best.r)) best = { L, r, n: xs.length };
    }
    if (!best) return;
    const t = best.r * Math.sqrt((best.n - 2) / Math.max(1e-9, 1 - best.r * best.r)), pval = tp2(t, best.n - 2);
    const hist = p.pk.v.filter(v => v != null), last = hist[hist.length - 1], F = hist.length >= 12 ? holtFc(hist.slice(-60), 12) : null;
    rows.push('<tr><th scope="row">' + esc(p.label) + '</th><td class="num">' + best.L + '</td><td class="num">' + nf(best.r, 2) + stars(pval) + '</td><td class="num">' + fp(pval) + '</td><td>' + (pval < 0.05 ? (best.r > 0 ? 'Moves with inflation' : 'Moves against inflation') : 'No clear link') + '</td><td class="num">' + nf(last, 2) + '</td><td class="num">' + (F ? nf(F.out[11].f, 2) : '–') + '</td></tr>');
  });
  if (rows.length) tableWrap(below || host, '<thead><tr><th scope="col">Variable</th><th scope="col" class="num">Leads inflation by (months)</th><th scope="col" class="num">Correlation</th><th scope="col" class="num">p-value</th><th scope="col">Reading</th><th scope="col" class="num">Latest</th><th scope="col" class="num">Projection in 12 months</th></tr></thead><tbody>' + rows.join('') + '</tbody>', tcap('How related variables move with inflation'), 'For each variable, the lead of 0–12 months with the strongest correlation with headline inflation. Correlation is not causation; the SVAR in the Forecast lab tests causal links. Projections: Holt’s linear exponential smoothing.', { src: 'BBS and Bangladesh Bank; author’s calculations.' });
}
/* ================= World growth in two boxes ================= */
function worldGrowth2() {
  const fig = document.getElementById('pulse');
  if (!fig || document.getElementById('wg2')) return;
  const W = wser('gdp_growth', 'WLD'); if (!W.length) return;
  const wrap = document.createElement('div'); wrap.id = 'wg2'; fig.parentNode.insertBefore(wrap, fig); fig.style.display = 'none';
  const g = grid(wrap);
  const labels = W.map(x => String(x[0])), vals = W.map(x => x[1]), neg = W.filter(x => x[1] < 0).map(x => String(x[0]));
  figure(g, { prefix: 'W', title: 'World GDP growth since ' + W[0][0], sub: '% a year; red bands mark years when world output fell', h: 360, source: 'World Bank.',
    render: TH => { const o = tsOption(TH, labels, [S('World real GDP growth', vals, { w: 2.4, end: true, dec: 2 })], { y1: '% a year', dec: 2, events: false, zoom: labels.length > 40 }); o.series[0].markArea = { silent: true, itemStyle: { color: 'rgba(229,72,77,.14)' }, data: neg.map(y => [{ xAxis: y }, { xAxis: y }]) }; o.series[0].markLine = { symbol: 'none', silent: true, lineStyle: { color: TH.muted, type: 'dashed' }, data: [{ yAxis: 0 }] }; return o; } });
  const C = [['USA', 'United States'], ['CHN', 'China'], ['EMU', 'Euro area'], ['JPN', 'Japan'], ['IND', 'India']];
  const gm = k => new Map(wser('gdp_growth', k)), ym = k => new Map(wser('gdp_usd', k));
  const GW = gm('WLD'), YW = ym('WLD'), Gs = C.map(c => gm(c[0])), Ys = C.map(c => ym(c[0]));
  const yrs = W.map(x => x[0]).filter(y => YW.has(y - 1) && Ys.every(m => m.has(y - 1))).slice(-25);
  const contrib = C.map((c, j) => yrs.map(y => { const gv = Gs[j].get(y), sh = Ys[j].get(y - 1) / YW.get(y - 1); return gv == null ? null : +(gv * sh).toFixed(3); }));
  const rest = yrs.map((y, i) => { const tot = GW.get(y); if (tot == null) return null; return +(tot - contrib.reduce((a, s) => a + (s[i] || 0), 0)).toFixed(3); });
  figure(g, { prefix: 'W', title: 'What drove world growth', sub: 'percentage-point contributions: growth × share of world GDP a year earlier (market exchange rates); last ' + yrs.length + ' years', h: 360, source: 'World Bank; author’s calculations.',
    notes: 'Shares use GDP at market exchange rates, as in the World Bank’s world total; the IMF weights by purchasing power, which gives emerging economies larger shares.',
    render: TH => { const L = yrs.map(String); const o = tsOption(TH, L, [S('World growth (total)', yrs.map(y => GW.get(y)), { w: 2.6, color: TH.ink, end: true, dec: 2 })], { y1: 'pp', dec: 2, events: false });
      const bars = C.map((c, j) => ({ name: c[1], type: 'bar', stack: 'c', data: contrib[j], itemStyle: { color: TH.pal[j % TH.pal.length] }, barMaxWidth: 22, emphasis: { focus: 'series' } }));
      bars.push({ name: 'Rest of the world', type: 'bar', stack: 'c', data: rest, itemStyle: { color: TH.muted }, barMaxWidth: 22, emphasis: { focus: 'series' } });
      o.series = bars.concat(o.series); if (o.legend) { delete o.legend.data; o.legend.type = 'scroll'; } return o; } });
}
/* ================= Bayesian DSGE: equations, priors, posteriors and diagnostics ================= */
const MX = { i: s => '<mi>' + s + '</mi>', n: s => '<mn>' + s + '</mn>', o: s => '<mo>' + s + '</mo>', sub: (b, s) => '<msub>' + b + s + '</msub>', sup: (b, s) => '<msup>' + b + s + '</msup>', ss: (b, s, p) => '<msubsup>' + b + s + p + '</msubsup>', fr: (a, b) => '<mfrac>' + a + b + '</mfrac>', r: (...a) => '<mrow>' + a.join('') + '</mrow>', bar: b => '<mover>' + b + '<mo>‾</mo></mover>' };
const EQN = (body, tag) => '<div class="eqn"><math display="block">' + body + '</math>' + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</div>';
function dsgeEquations() {
  const { i, n, o, sub, sup, ss, fr, r, bar } = MX, t = i('t'), t1 = r(i('t'), o('+'), n('1')), tm1 = r(i('t'), o('−'), n('1')), Et = sub(i('E'), t);
  const X = sub(i('x'), t), P = sub(i('π'), t), I = sub(i('i'), t);
  return [
    EQN(r(X, o('='), Et, sub(i('x'), t1), o('−'), fr(n('1'), i('σ')), o('('), I, o('−'), Et, sub(i('π'), t1), o(')'), o('+'), sub(i('d'), t)), '(1) IS curve: demand'),
    EQN(r(P, o('='), i('β'), Et, sub(i('π'), t1), o('+'), i('κ'), X, o('+'), sub(i('u'), t)), '(2) New Keynesian Phillips curve'),
    EQN(r(I, o('='), sub(i('φ'), i('π')), P, o('+'), sub(i('φ'), i('y')), X, o('+'), sub(i('v'), t)), '(3) Monetary-policy (Taylor) rule'),
    EQN(r(sub(i('s'), t), o('='), sub(i('ρ'), i('s')), sub(i('s'), tm1), o('+'), sub(i('σ'), i('s')), ss(i('ε'), t, i('s')), o(','), o('&#8195;'), i('s'), o('∈'), o('{'), i('d'), o(','), i('u'), o(','), i('v'), o('}')), '(4) Shocks: first-order autoregressive'),
    EQN(r(ss(i('x'), t, r(i('o'), i('b'), i('s'))), o('='), X, o(';'), o('&#8195;'), ss(i('π'), t, r(i('o'), i('b'), i('s'))), o('='), bar(i('π')), o('+'), n('4'), P, o(';'), o('&#8195;'), ss(i('i'), t, r(i('o'), i('b'), i('s'))), o('='), bar(i('i')), o('+'), n('4'), I), '(5) Observation equations (annualised data)'),
    EQN(r(i('κ'), o('='), fr(r(o('('), n('1'), o('−'), i('θ'), o(')'), o('('), n('1'), o('−'), i('β'), i('θ'), o(')')), i('θ')), o('·'), fr(r(n('1'), o('−'), i('α')), r(n('1'), o('−'), i('α'), o('+'), i('α'), i('ε'))), o('·'), o('('), i('σ'), o('+'), fr(r(i('φ'), o('+'), i('α')), r(n('1'), o('−'), i('α'))), o(')')), '(6) Slope of the Phillips curve'),
    EQN(r(i('κ'), o('('), sub(i('φ'), i('π')), o('−'), n('1'), o(')'), o('+'), o('('), n('1'), o('−'), i('β'), o(')'), sub(i('φ'), i('y')), o('&gt;'), n('0')), '(7) Determinacy (Taylor principle)'),
    EQN(r(i('p'), o('('), i('θ'), o('|'), i('Y'), o(')'), o('∝'), i('L'), o('('), i('Y'), o('|'), i('θ'), o(')'), o('·'), i('p'), o('('), i('θ'), o(')')), '(8) Bayes’ rule: posterior ∝ likelihood × prior'),
    EQN(r(sub(i('z'), t), o('='), sup(r(i('Z'), o('('), i('θ'), o(')')), r(o('−'), n('1'))), o('('), sub(i('y'), t), o('−'), bar(i('y')), o(')'), o(';'), o('&#8195;'), i('ln'), i('L'), o('='), i('T'), i('ln'), o('|'), i('det'), sup(i('Z'), r(o('−'), n('1'))), o('|'), o('+'), r(sub(o('∑'), t)), i('ln'), i('N'), o('('), sub(i('z'), t), o('|'), i('R'), sub(i('z'), tm1), o(','), i('Σ'), o(')')), '(9) Exact likelihood: shocks recovered from the data'),
    EQN(r(i('α'), o('='), i('min'), o('{'), n('1'), o(','), fr(r(i('p'), o('('), sup(i('θ'), o('*')), o('|'), i('Y'), o(')')), r(i('p'), o('('), sup(i('θ'), r(o('('), i('s'), o('−'), n('1'), o(')'))), o('|'), i('Y'), o(')'))), o('}'), o(','), o('&#8195;'), sup(i('θ'), o('*')), o('='), sup(i('θ'), r(o('('), i('s'), o('−'), n('1'), o(')'))), o('+'), i('c'), i('L'), i('η')), '(10) Metropolis–Hastings acceptance')
  ].join('');
}
let BAYES_K = 2;
function bayesBlock(body, D) {
  const B = D.bayes; if (!B) return;
  const s = sec(body, 'Bayesian estimation for Bangladesh', 'All ten parameters estimated on ' + B.meta.T + ' quarters (' + B.meta.sample + ') by Markov chain Monte Carlo: ' + B.meta.chains + ' chains of ' + B.meta.draws.toLocaleString('en') + ' draws, the first ' + B.meta.burn.toLocaleString('en') + ' discarded as burn-in.');
  s.insertAdjacentHTML('beforeend', '<h3>Model, observation and estimation equations</h3><div class="formula math-box">' + dsgeEquations() + '</div><p class="note">Variables: x = output gap, π = inflation, i = policy (call-money) rate, all as quarterly deviations from steady state; d, u, v = demand, cost-push and policy shocks; ε = independent standard-normal innovations; E<sub>t</sub> = expectation at time t. The data are annualised, hence the factor 4 in the observation equations; π̄ and ī are sample means (' + nf(B.meta.means.inflation, 2) + '% and ' + nf(B.meta.means.call_rate, 2) + '%).</p>');
  let h = '<thead><tr><th scope="col">Parameter</th><th scope="col">Prior</th><th scope="col" class="num">Posterior mean</th><th scope="col" class="num">Median</th><th scope="col" class="num">SD</th><th scope="col" class="num">90% interval</th><th scope="col" class="num">95% interval</th><th scope="col" class="num">99% interval</th><th scope="col" class="num">R-hat</th><th scope="col" class="num">ESS</th><th scope="col" class="num">Geweke p</th></tr></thead><tbody>';
  B.params.forEach(p => { const q = p.post, ci = a => nf(a[0], 3) + ' to ' + nf(a[1], 3); h += '<tr><th scope="row">' + esc(p.sym) + ' <span class="mx-u">' + esc(p.name) + '</span></th><td>' + esc(p.prior.dist) + '(' + p.prior.mean + ', ' + p.prior.sd + ')</td><td class="num big">' + nf(q.mean, 3) + '</td><td class="num">' + nf(q.median, 3) + '</td><td class="num">' + nf(q.sd, 3) + '</td><td class="num">' + ci(q.ci90) + '</td><td class="num">' + ci(q.ci95) + '</td><td class="num">' + ci(q.ci99) + '</td><td class="num' + (p.rhat < 1.05 ? '' : ' warn-std') + '">' + nf(p.rhat, 3) + '</td><td class="num">' + p.ess + '</td><td class="num' + (p.geweke_p < 0.05 ? ' warn-std' : '') + '">' + nf(p.geweke_p, 3) + '</td></tr>'; });
  tableWrap(s, h + '</tbody>', tcap('Prior and posterior distributions'), 'Credible intervals are posterior percentiles. Convergence: R-hat below 1.05 and an effective sample size (ESS) in the hundreds indicate reliable estimates; a Geweke p-value below 0.05 (highlighted) flags drift within a chain. Acceptance rates: ' + B.meta.acceptance.map(a => nf(a * 100, 1) + '%').join(' and ') + '. Laplace approximation to the log marginal likelihood: ' + nf(B.meta.laplace_log_ml, 2) + '.', { src: 'BBS and Bangladesh Bank; author’s estimates.' });
  let pr = '<thead><tr><th scope="col">Statement</th><th scope="col" class="num">Posterior probability</th><th scope="col">Reading</th></tr></thead><tbody>';
  Object.entries(B.probs).forEach(([k, v]) => { pr += '<tr><th scope="row">' + esc(k) + '</th><td class="num big">' + nf(v * 100, 1) + '%</td><td>' + (v >= 0.95 ? 'Strong evidence for' : v >= 0.75 ? 'Moderate evidence for' : v <= 0.05 ? 'Strong evidence against' : v <= 0.25 ? 'Moderate evidence against' : 'Inconclusive') + '</td></tr>'; });
  tableWrap(s, pr + '</tbody>', tcap('What the posterior says'), 'Bayesian counterparts of hypothesis tests: the share of posterior draws for which each statement holds.', { src: 'Author’s estimates.' });
  ctl2(s, '<label class="field"><span>Parameter for the plots</span><select id="by-k">' + B.params.map((p, i) => '<option value="' + i + '"' + (i === BAYES_K ? ' selected' : '') + '>' + esc(p.sym + ' — ' + p.name) + '</option>').join('') + '</select></label>', () => { BAYES_K = +$('#by-k').value; plots(); }, '#by-k');
  const g = grid(s);
  function plots() {
    disposeIn(g); g.innerHTML = ''; const p = B.params[BAYES_K];
    figure(g, { prefix: 'L', title: 'Prior and posterior: ' + p.sym, sub: p.name + '; density', h: 280, source: 'Author’s estimates.', notes: 'Dashed: prior. Shaded: posterior (kernel density of the MCMC draws). A posterior narrower than, or shifted from, the prior shows the data are informative.',
      render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.ink2 } }, tooltip: { trigger: 'axis', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, valueFormatter: v => nf(v, 3) },
        xAxis: { type: 'value', scale: true, axisLabel: { color: TH.ink2 }, axisLine: { lineStyle: { color: TH.line } }, splitLine: { show: false } }, yAxis: valAxis(TH, ''),
        series: [{ name: 'Prior', type: 'line', showSymbol: false, data: p.grid.map((x, j) => [x, p.prior_pdf[j]]), lineStyle: { type: 'dashed', width: 2, color: TH.muted } },
          { name: 'Posterior', type: 'line', showSymbol: false, smooth: true, data: p.grid.map((x, j) => [x, p.post_pdf[j]]), lineStyle: { width: 2.6, color: TH.pal[0] }, areaStyle: { color: TH.pal[0], opacity: 0.22 },
            markLine: { symbol: 'none', silent: true, lineStyle: { color: TH.signal || '#C9A24B', type: 'solid', width: 1.6 }, label: { formatter: 'mean ' + nf(p.post.mean, 3), color: TH.ink }, data: [{ xAxis: p.post.mean }] } }] }) });
    figure(g, { prefix: 'L', title: 'MCMC trace: ' + p.sym, sub: 'two chains after burn-in (thinned); they should overlap and look like noise', h: 280, source: 'Author’s estimates.',
      render: TH => ({ aria: { enabled: true }, animation: false, textStyle: { fontFamily: FONT }, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.ink2 } }, tooltip: { trigger: 'axis', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, valueFormatter: v => nf(v, 3) },
        xAxis: { type: 'value', name: 'draw', axisLabel: { color: TH.ink2 }, axisLine: { lineStyle: { color: TH.line } }, splitLine: { show: false } }, yAxis: valAxis(TH, '', { scale: true }),
        series: p.trace.map((c, j) => ({ name: 'Chain ' + (j + 1), type: 'line', showSymbol: false, data: c.map((v, k) => [k, v]), lineStyle: { width: 1.1, color: TH.pal[j] }, emphasis: { disabled: true } })) }) });
    figure(g, { prefix: 'L', title: 'Autocorrelation of the draws: ' + p.sym, sub: 'chain 1, lags 1 to 30; fast decay means efficient sampling', h: 280, source: 'Author’s estimates.',
      render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink }, valueFormatter: v => nf(v, 3) },
        xAxis: { type: 'category', data: p.acf.map((_, k) => String(k + 1)), axisLabel: { color: TH.ink2 }, axisLine: { lineStyle: { color: TH.line } } }, yAxis: valAxis(TH, ''),
        series: [{ name: 'Autocorrelation', type: 'bar', data: p.acf, itemStyle: { color: TH.pal[2] }, barMaxWidth: 14 }] }) });
    figure(g, { prefix: 'L', title: 'Posterior means and 95% intervals', sub: 'all parameters, scaled by their prior mean (1 = prior mean)', h: 280, source: 'Author’s estimates.',
      render: TH => ({ aria: { enabled: true }, animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', backgroundColor: TH.paper, borderColor: TH.line, textStyle: { color: TH.ink } },
        xAxis: { type: 'category', data: B.params.map(q => q.sym), axisLabel: { color: TH.ink2 }, axisLine: { lineStyle: { color: TH.line } } }, yAxis: valAxis(TH, 'posterior ÷ prior mean'),
        series: [{ name: '95% interval', type: 'boxplot', data: B.params.map(q => { const m = q.prior.mean; return [q.post.ci95[0] / m, q.post.ci95[0] / m, q.post.mean / m, q.post.ci95[1] / m, q.post.ci95[1] / m]; }), itemStyle: { color: 'rgba(31,95,168,.18)', borderColor: TH.pal[0] }, boxWidth: [6, 14] },
          { name: 'Prior mean', type: 'line', data: B.params.map(() => 1), symbol: 'none', lineStyle: { type: 'dashed', color: TH.muted } }] }) });
  }
  plots();
  const q = k => B.params.find(p => p.sym === k), fpi = q('φπ'), kap = q('κ'), ru = q('ρu'), rd = q('ρd');
  const it = [];
  if (fpi) it.push('<b>Policy fights inflation.</b> φπ has a posterior mean of ' + nf(fpi.post.mean, 2) + ' (95% interval ' + nf(fpi.post.ci95[0], 2) + ' to ' + nf(fpi.post.ci95[1], 2) + '); the probability that it exceeds 1 is ' + nf(B.probs['P(φπ > 1): Taylor principle'] * 100, 1) + '%, so the Taylor principle holds.');
  if (kap) it.push('<b>Inflation responds weakly to slack.</b> κ is ' + nf(kap.post.mean, 3) + ', below its prior mean of ' + kap.prior.mean + ': the data pull the Phillips curve flatter.' + (kap.geweke_p < 0.05 ? ' Its Geweke test flags some drift, so treat κ with extra caution.' : ''));
  if (ru && rd) it.push('<b>Cost shocks linger.</b> Cost-push persistence is ' + nf(ru.post.mean, 2) + ' against ' + nf(rd.post.mean, 2) + ' for demand shocks (probability ' + nf(B.probs['P(ρu > ρd): cost shocks more persistent than demand shocks'] * 100, 1) + '% that cost shocks last longer): supply-side inflation in Bangladesh fades slowly.');
  it.push('<b>Caveats.</b> 38 quarters is a short sample; the output gap is a proxy from GDP growth; the model is closed-economy and omits the exchange rate. ' + esc(B.meta.method) + '.');
  s.insertAdjacentHTML('beforeend', '<h3>Interpretation</h3><ul class="cl-list">' + it.map(x => '<li>' + x + '</li>').join('') + '</ul>');
}

/* ======================= v3.8 additions ======================= */
/* (a) "+ Add a series" on every time chart. Hooked at the single drawing point (app.js -> BDX.extraPlan). */
var XPAL = ['#E4572E', '#17A398', '#9B5DE5', '#C9A227', '#E8578B', '#4C6EF5'];
var XFN = { M: 'monthly', Q: 'quarterly', FY: 'fiscal-year', Y: 'calendar-year' };
function xFmt(l) { l = String(l); return /^\d{4}-\d{2}$/.test(l) ? 'M' : /^\d{4}-Q[1-4]$/.test(l) ? 'Q' : /^FY\d{4}$/.test(l) ? 'FY' : /^\d{4}$/.test(l) ? 'Y' : null; }
function xIso(dom) {
  if (dom.closest('#c-sections') && typeof curCountry !== 'undefined' && curCountry) return curCountry;
  const v = dom.closest('.view'), id = v ? v.id : '';
  if (id === 'v-bangladesh' || id === 'v-lab') return 'BGD';
  return RAW.s.gdp_growth && RAW.s.gdp_growth.WLD ? 'WLD' : 'BGD';
}
function xName(key, iso) {
  const p = key.indexOf(':'), src = key.slice(0, p), k = key.slice(p + 1);
  if (src === 'bd') { const m = SER(k); return m ? m.label + (m.sub ? ' (' + m.sub + ')' : '') : k; }
  const e = EMAPB()[iso]; return indL(k) + (e ? ', ' + e[1] : '');
}
function xGroups(fmt) {
  const out = [];
  const bd = Object.keys((BD && BD.series) || {}).filter(k => { const p = PK(k); return p && Array.isArray(p.v) && p.v.length > 3 && xFmt(bdLab(p.f, p.k0)) === fmt; });
  if (bd.length) out.push(['Bangladesh, ' + XFN[fmt] + ' series', bd.map(k => ['bd:' + k, xName('bd:' + k)])]);
  if (fmt === 'Y') {
    const seen = new Set();
    CL_CATS.forEach(c => { const ks = catKeys(c).filter(k => RAW.s[k] && !seen.has(k)); ks.forEach(k => seen.add(k)); if (ks.length) out.push(['World Bank: ' + c.t, ks.map(k => ['wb:' + k, indL(k)])]); });
  }
  return out;
}
function xVals(key, cats, iso) {
  const p = key.indexOf(':'), src = key.slice(0, p), k = key.slice(p + 1), m = new Map();
  if (src === 'bd') { const s = PK(k); if (s) s.v.forEach((v, j) => { if (v != null) m.set(bdLab(s.f, s.k0 + j), v); }); }
  else wser(k, iso).forEach(q => { if (q && q[1] != null) m.set(String(q[0]), q[1]); });
  return cats.map(c => (m.has(c) ? m.get(c) : null));
}
function holtArr(y, H) { const r = holtFc(y, H); return Array.isArray(r) ? r : r && Array.isArray(r.out) ? r.out : []; }
function xKeys(dom) { return (dom.getAttribute('data-extra') || '').split('|').filter(Boolean); }
function extraPlan(opt, inst) {
  try {
    if (!opt || !Array.isArray(opt.series) || !inst || !inst.getDom) return opt;
    const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
    if (!xa || xa.type === 'value' || xa.type === 'time' || !Array.isArray(xa.data) || xa.data.length < 4) return opt;
    if (!opt.series.some(s => s && (s.type === 'line' || s.type === 'bar'))) return opt;
    const cats = xa.data.map(c => String(c && typeof c === 'object' ? c.value : c)), fmt = xFmt(cats[cats.length - 1]);
    const dom = inst.getDom();
    if (!fmt || !dom || dom.closest('#v-cl') || dom.closest('.no-xpick') || (dom.clientHeight || 0) < 150) return opt;
    inst.__xb = opt; inst.__xf = fmt;
    xBar(dom, inst);
    const keys = xKeys(dom); if (!keys.length) return opt;
    const iso = xIso(dom), ya0 = Array.isArray(opt.yAxis) ? opt.yAxis : [opt.yAxis || {}], ax = ya0.length, base = ya0[0] || {};
    const o = Object.assign({}, opt, {
      series: opt.series.map(s => Object.assign({}, s)),
      yAxis: ya0.concat([Object.assign({}, base, { position: 'right', name: 'added', offset: ax > 1 ? 58 : 0, min: null, max: null, scale: true, inverse: false, splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: XPAL[0] } }, nameTextStyle: Object.assign({}, base.nameTextStyle || {}, { align: 'right' }) })])
    });
    if (ax > 1 && o.grid && !Array.isArray(o.grid)) o.grid = Object.assign({}, o.grid, { right: (+o.grid.right || 10) + 58 });
    keys.forEach((key, j) => { const c = XPAL[j % XPAL.length]; o.series.push({ name: xName(key, iso) + ' (added)', type: 'line', yAxisIndex: ax, data: xVals(key, cats, iso), showSymbol: false, connectNulls: true, lineStyle: { width: 2, type: 'dashed', color: c }, itemStyle: { color: c }, z: 5 }); });
    if (o.legend && !Array.isArray(o.legend) && Array.isArray(o.legend.data)) o.legend = Object.assign({}, o.legend, { data: o.legend.data.concat(o.series.slice(-keys.length).map(s => s.name)) });
    return o;
  } catch (e) { console.warn('v38 xplan', e && e.stack ? e.stack.slice(0, 300) : e); return opt; }
}
function xBar(dom, inst) {
  let bar = dom.previousElementSibling;
  if (bar && bar.classList && bar.classList.contains('xpick')) { bar.__i = inst; if (bar.__f === inst.__xf) return; bar.remove(); dom.removeAttribute('data-extra'); }
  const groups = xGroups(inst.__xf); if (!groups.length || !dom.parentNode) return;
  bar = document.createElement('div'); bar.className = 'xpick'; bar.__i = inst; bar.__f = inst.__xf;
  bar.innerHTML = '<label class="xpick-l"><span>+ Add a series</span><select aria-label="Add a series to this chart"><option value="">choose…</option>' +
    groups.map(([g, list]) => '<optgroup label="' + esc(g) + '">' + list.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join('') + '</optgroup>').join('') +
    '</select></label><span class="xchips"></span>';
  dom.parentNode.insertBefore(bar, dom);
  const chips = () => { const iso = xIso(dom); bar.querySelector('.xchips').innerHTML = xKeys(dom).map(key => '<button type="button" class="xchip" data-key="' + esc(key) + '" title="Remove this series">× ' + esc(xName(key, iso)) + '</button>').join(''); };
  const redraw = () => { chips(); const I = bar.__i; if (I && I.__xb && !(I.isDisposed && I.isDisposed())) { try { I.setOption(labelPlan(declutterAll(extraPlan(I.__xb, I)), I), true); } catch (e) { /* keep the chart as it was */ } } };
  bar.querySelector('select').addEventListener('change', e => { const v = e.target.value; e.target.value = ''; if (!v) return; const ks = xKeys(dom); if (!ks.includes(v)) { if (ks.length >= 4) ks.shift(); ks.push(v); } dom.setAttribute('data-extra', ks.join('|')); redraw(); });
  bar.addEventListener('click', e => { const b = e.target.closest('.xchip'); if (!b) return; dom.setAttribute('data-extra', xKeys(dom).filter(k => k !== b.getAttribute('data-key')).join('|')); redraw(); });
  chips();
}

/* (b) No blank spaces: a grid left with an odd number of half-width charts gets one more. */
function fillReg(g, o, f) {
  if (o.filler) { g.__filler = f; return; }
  (g.__figs = g.__figs || []).push(o);
  if (g.__filler) { try { disposeIn(g.__filler); } catch (e) { /* none */ } g.__filler.remove(); g.__filler = null; }
  clearTimeout(g.__ft); g.__ft = setTimeout(() => fillGrid(g), 0);
}
function xSeriesOf(o, TH) {
  let op; try { op = o.render(TH); } catch (e) { return []; }
  if (!op || !Array.isArray(op.series)) return [];
  const xa = Array.isArray(op.xAxis) ? op.xAxis[0] : op.xAxis; if (!xa || !Array.isArray(xa.data)) return [];
  const cats = xa.data.map(c => String(c && typeof c === 'object' ? c.value : c));
  const ya = Array.isArray(op.yAxis) ? op.yAxis : [op.yAxis || {}];
  return op.series.filter(s => s && (s.type === 'line' || s.type === 'bar') && !s.stack && Array.isArray(s.data) && !/range|band|projection|forecast|warning|bound|interval|average|benchmark|target|lower|upper|added/i.test(s.name || ''))
    .slice(0, 3).map(s => ({ name: String(s.name || ''), unit: String((ya[s.yAxisIndex || 0] || {}).name || ''), cats, vals: s.data.map(d => { const v = Array.isArray(d) ? d[1] : d && typeof d === 'object' ? d.value : d; return v == null || v === '' || !isFinite(+v) ? null : +v; }) }))
    .filter(s => s.vals.filter(v => v != null).length >= 3);
}
function fillGrid(g) {
  if (!g || g.__filler || !g.isConnected) return;
  const all = g.__figs || [], half = all.filter(o => !o.wide);
  if (half.length % 2 === 0) return;
  const TH = theme(), pre = half[0].prefix, src = (half.find(o => o.source) || {}).source || '';
  try {
    if (half.length === 1) {
      const sr = xSeriesOf(half[0], TH)[0];
      if (!sr) { g.lastElementChild && g.lastElementChild.classList.add('wide'); return; }
      figure(g, { filler: true, prefix: pre, ts: false, title: 'Distribution: ' + sr.name, sub: 'How often each range of values occurred in the chart beside this one; red = the range holding the latest value', h: half[0].h || 300, source: src, render: TH2 => fillHist(TH2, sr) });
    } else {
      const ss = half.flatMap(o => xSeriesOf(o, TH)), same = new Set(ss.map(s => s.unit)).size <= 1;
      if (ss.length < 2) { g.lastElementChild && g.lastElementChild.classList.add('wide'); return; }
      figure(g, { filler: true, prefix: pre, title: 'All the series above in one chart', sub: same ? 'Same units, plotted together for comparison' : 'Each series standardised, (value − its average) ÷ its standard deviation, so different units share one axis', h: Math.max(...half.map(o => o.h || 300)), source: src, render: TH2 => fillComb(TH2, half) });
    }
  } catch (e) { console.warn('v38 fill', e && e.stack ? e.stack.slice(0, 300) : e); }
}
function fillHist(TH, sr) {
  const xs = sr.vals.filter(v => v != null);
  if (xs.length < 5) return { title: { text: 'Not enough data', left: 'center', top: 'middle', textStyle: { color: TH.muted, fontSize: 12 } } };
  const mn = Math.min(...xs), mx = Math.max(...xs), nb = Math.max(6, Math.min(20, Math.round(Math.sqrt(xs.length)))), w = (mx - mn) / nb || 1;
  const cnt = Array(nb).fill(0); xs.forEach(v => { cnt[Math.min(nb - 1, Math.floor((v - mn) / w))]++; });
  const lb = Math.min(nb - 1, Math.floor((xs[xs.length - 1] - mn) / w)), d = Math.abs(w) >= 10 ? 0 : Math.abs(w) >= 1 ? 1 : 2;
  return {
    animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', confine: true },
    xAxis: { type: 'category', data: cnt.map((_, i) => nf(mn + i * w, d) + ' to ' + nf(mn + (i + 1) * w, d)), axisLabel: { color: TH.muted, fontSize: 10, rotate: 40 }, axisLine: { lineStyle: { color: TH.muted } } },
    yAxis: valAxis(TH, 'number of periods'),
    series: [{ name: sr.name, type: 'bar', barCategoryGap: '8%', data: cnt.map((c, i) => ({ value: c, itemStyle: { color: i === lb ? '#E5484D' : '#3B82C4' } })), label: { show: true, position: 'top', fontSize: 9, color: TH.muted } }]
  };
}
function fillComb(TH, half) {
  const all = half.flatMap(o => xSeriesOf(o, TH)), n = {};
  all.forEach(s => { const f = xFmt(s.cats[s.cats.length - 1]) || 'x'; n[f] = (n[f] || 0) + 1; });
  const main = Object.keys(n).sort((a, b) => n[b] - n[a])[0], use = all.filter(s => (xFmt(s.cats[s.cats.length - 1]) || 'x') === main).slice(0, 8);
  const labels = [...new Set(use.flatMap(s => s.cats))].sort(), same = new Set(use.map(s => s.unit)).size <= 1;
  const out = use.map((s, j) => {
    const m = new Map(); s.cats.forEach((c, i) => { if (s.vals[i] != null) m.set(c, s.vals[i]); });
    let v = labels.map(l => (m.has(l) ? m.get(l) : null));
    if (!same) { const xs = v.filter(x => x != null), mu = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) * (b - mu), 0) / Math.max(1, xs.length - 1)) || 1; v = v.map(x => (x == null ? null : (x - mu) / sd)); }
    return S(s.name, v, { w: 2, color: XPAL[j % XPAL.length] });
  });
  return tsOption(TH, labels, out, { y1: same ? (use[0] && use[0].unit) || '' : 'standardised (z-score)', dec: 2, zoom: labels.length > 60 });
}

/* (c) Outlook at the end of every Bangladesh sector tab. */
var SOUT = {
  prices: { m: 'Inflation is also modelled in the Forecast lab with ARIMA, a VAR and a small DSGE model; this outlook is the simple benchmark they are judged against.', l: 'Government-set fuel, electricity and gas prices change in steps the model cannot foresee.', f: 'Watch food prices around the Aman and Boro harvests, how much exchange-rate depreciation passes through to import prices, and the path of Bangladesh Bank’s policy rate. LDC graduation, scheduled for November 2026, may change trade preferences and import costs over time.' },
  real: { m: 'Annual and quarterly output series have few observations, so their ranges are wide.', l: 'GDP figures are revised, sometimes by large amounts, and quarterly estimates are still young.', f: 'Track the recovery of private investment, ready-made garment export orders and remittance-financed consumption; each new quarterly GDP release will narrow the range.' },
  money: { m: 'Money and credit are projected in growth rates, which are closer to stable than the levels.', l: 'Bank restructuring, mergers and reclassification of loans can move these series abruptly.', f: 'Private-sector credit growth and non-performing loans are the key signals; recapitalisation and asset-quality reviews will shape lending capacity.' },
  rates: { m: 'Interest rates move in steps set by policy, so the projection mostly shows where momentum is heading.', l: 'A single policy decision can make any extrapolation wrong overnight; read the range, not the line.', f: 'Watch the policy-rate path, the spread between lending and deposit rates, and real interest rates (nominal minus inflation): positive real rates are needed for tightening to bite.' },
  ext: { m: 'External flows are projected one by one; their sum, the balance of payments, is not modelled here.', l: 'Exchange-rate regime changes, import controls and one-off official financing break past patterns.', f: 'Remittances, export earnings and the managed exchange rate drive reserves; import demand and programme financing reviews are the swing factors.' },
  fiscal: { m: 'Fiscal series are short and seasonal, so only the broad direction is meaningful.', l: 'Budget revisions and the timing of large payments make month-to-month figures noisy.', f: 'Revenue mobilisation (Bangladesh’s tax-to-GDP ratio is among the lowest in the world), rising interest costs and the mix of bank and savings-certificate borrowing are the main watch points.' },
  cap: { m: 'Market capitalisation is projected as a trend; prices themselves are close to unpredictable.', l: 'Floor prices, regulatory changes and listing decisions move the market in ways models cannot anticipate.', f: 'Governance reforms, turnover and new large listings would deepen the market; capitalisation relative to GDP is the yardstick to watch.' }
};
function sectorOutlook(body, c) {
  try {
    const keys = (c.keys || []).filter(k => PK(k) && PK(k).v.filter(v => v != null).length >= 8);
    if (!keys.length) return;
    const T = SOUT[c.id] || {}, H = f => (f === 'M' ? 12 : f === 'Q' ? 4 : 1);
    const s = sec(body, 'Outlook: ' + c.name.toLowerCase(), 'Where each series stands now, where a simple model projects it over the next year, and how much to trust that projection.', 'outlook-' + c.id);
    const rows = keys.map(k => {
      const p = PK(k), m = SER(k), v = p.v; let li = v.length - 1; while (li >= 0 && v[li] == null) li--;
      const lag = H(p.f), y = v.slice(0, li + 1).filter(x => x != null), last = v[li], prev = li - lag >= 0 ? v[li - lag] : null;
      const fc0 = y.length >= 8 ? holtArr(y.slice(-120), H(p.f)) : [], fc = fc0.length ? fc0 : null, end = fc ? fc[fc.length - 1] : null, b = band312(y);
      return { k, m, p, li, last, lab: bdLab(p.f, p.k0 + li), chg: prev != null ? last - prev : null, b, fc, end, h: H(p.f) };
    });
    const dir = r => !r.end ? '–' : r.end.f > r.last + Math.max(0.05, Math.abs(r.last) * 0.02) ? '↑ rising' : r.end.f < r.last - Math.max(0.05, Math.abs(r.last) * 0.02) ? '↓ falling' : '→ about flat';
    const pos = r => !r.b ? '–' : r.b.out ? (r.last > Math.max(r.b.a3, r.b.a12) ? 'above' : 'below') + ' both averages' : 'within the band';
    const per = r => (r.p.f === 'M' ? '12 months' : r.p.f === 'Q' ? '4 quarters' : '1 year');
    tableWrap(s, '<table><thead><tr><th>Indicator</th><th>Latest</th><th>Period</th><th>Change on a year earlier</th><th>3- and 12-period averages</th><th>Position</th><th>Projection in one year</th><th>80% range</th><th>Direction</th></tr></thead><tbody>' +
      rows.map(r => '<tr><th scope="row">' + esc(r.m.label + (r.m.sub ? ' (' + r.m.sub + ')' : '')) + ' <small>' + esc(r.m.unit || '') + '</small></th><td class="num">' + nf(r.last) + '</td><td>' + esc(r.lab) + '</td><td class="num">' + (r.chg == null ? '–' : (r.chg > 0 ? '+' : '') + nf(r.chg)) + '</td><td class="num">' + (r.b ? nf(r.b.a3) + ' / ' + nf(r.b.a12) : '–') + '</td><td>' + pos(r) + '</td><td class="num">' + (r.end ? nf(r.end.f) : '–') + '</td><td class="num">' + (r.end ? nf(r.end.lo80) + ' to ' + nf(r.end.hi80) : '–') + '</td><td>' + dir(r) + '</td></tr>').join('') + '</tbody></table>',
      tcap('Outlook: ' + c.name.toLowerCase()), 'Projection: Holt’s linear exponential smoothing on up to the last 120 observations, ' + 'one year ahead (12 months, 4 quarters or 1 year). The 80% range would contain the outcome 8 times in 10 if past forecast errors repeat. Position compares the latest value with the averages of the last 3 and last 12 observations.');
    const out = rows.filter(r => r.b && r.b.out), up = rows.filter(r => dir(r).startsWith('↑')), dn = rows.filter(r => dir(r).startsWith('↓'));
    const big = rows.filter(r => r.chg != null).sort((a, b) => Math.abs(b.chg / (Math.abs(b.last) || 1)) - Math.abs(a.chg / (Math.abs(a.last) || 1)))[0];
    const nm = r => r.m.label + (r.m.sub ? ' (' + r.m.sub + ')' : '');
    const box = document.createElement('div'); box.className = 'card ol-sum';
    box.innerHTML = '<h3>Summary</h3><ul class="ol-list">' +
      '<li>' + (out.length ? out.length + ' of ' + rows.length + ' series are outside the band of their recent averages: ' + esc(out.map(r => nm(r) + ' (' + pos(r).split(' ')[0] + ')').join('; ')) + '.' : 'All ' + rows.length + ' series are within the band of their recent averages: no unusual readings.') + '</li>' +
      (up.length ? '<li>Projected to rise over the next year: ' + esc(up.map(nm).join('; ')) + '.</li>' : '') +
      (dn.length ? '<li>Projected to fall over the next year: ' + esc(dn.map(nm).join('; ')) + '.</li>' : '') +
      (big ? '<li>Largest relative move over the past year: ' + esc(nm(big)) + ', ' + (big.chg > 0 ? 'up ' : 'down ') + nf(Math.abs(big.chg)) + ' ' + esc(big.m.unit || '') + ' to ' + nf(big.last) + ' (' + esc(big.lab) + ').</li>' : '') +
      '<li>Projections extend past patterns only; read them with the ranges in the table and the limitations below.</li></ul>';
    s.append(box);
    const r0 = rows[0];
    if (r0.fc) {
      const p = r0.p, n0 = Math.max(0, r0.li - (p.f === 'M' ? 119 : p.f === 'Q' ? 39 : 24)), labs = [], hist = [], fcs = [], lo = [], hi = [];
      for (let i = n0; i <= r0.li; i++) { labs.push(bdLab(p.f, p.k0 + i)); hist.push(p.v[i]); fcs.push(i === r0.li ? p.v[i] : null); lo.push(i === r0.li ? p.v[i] : null); hi.push(i === r0.li ? p.v[i] : null); }
      r0.fc.forEach(q => { labs.push(bdLab(p.f, p.k0 + r0.li + q.h)); hist.push(null); fcs.push(q.f); lo.push(q.lo80); hi.push(q.hi80); });
      figure(s, { wide: true, title: nm(r0) + ': history and one-year projection', sub: 'Holt projection (dashed) with its 80% range (dotted)', h: 300, source: 'Bangladesh Bank, BBS; model estimates.', render: TH => tsOption(TH, labs, [S('History', hist, { w: 2 }), S('Projection', fcs, { w: 2, dash: true }), S('80% range, lower', lo, { w: 1, dash: true }), S('80% range, upper', hi, { w: 1, dash: true })], { y1: r0.m.unit || '', dec: 2 }) });
    }
    outlookMore(s, rows, c);
    const cl = CL_CATS.find(t => (t.bd || []).some(k => (c.keys || []).includes(k)));
    const tx = document.createElement('div'); tx.className = 'ol-grid';
    tx.innerHTML =
      '<div><h3>Methods</h3><p>Each series is projected with Holt’s linear exponential smoothing, which tracks a level and a trend and updates both as data arrive; its two smoothing weights are chosen to minimise one-step-ahead errors. The 80% range comes from the spread of past one-step errors and widens with the horizon. ' + esc(T.m || '') + '</p></div>' +
      '<div><h3>Merits</h3><p>Transparent and quick, hard to over-fit, and it reacts to turning points in the trend. It gives an honest range rather than a single number, and the same method is used for every series, so readings are comparable across the sector.</p></div>' +
      '<div><h3>Limitations</h3><p>It extrapolates the past and knows nothing about policy decisions, harvests or world prices; the ranges assume past errors are a guide to future ones, which fails in crises. Data revisions and base-year changes can shift the picture. ' + esc(T.l || '') + '</p></div>' +
      '<div><h3>Future perspectives</h3><p>' + esc(T.f || '') + '</p>' + (cl ? '<p><a href="#cl~BGD~' + cl.id + '">Full 16-page analysis of ' + esc(cl.t.toLowerCase()) + ' for Bangladesh →</a></p>' : '') + '</div>';
    s.append(tx);
  } catch (e) { console.warn('v38 outlook', e && e.stack ? e.stack.slice(0, 300) : e); }
}

/* (d) Every model and test, documented (Forecast lab, References tab). */
function mdDocs() {
  const { i, n, o, sub, sup, ss, fr, r } = MX;
  const hat = a => '<mover accent="true">' + a + '<mo>^</mo></mover>', sq = a => '<msqrt>' + a + '</msqrt>';
  const sum = (lo, hi) => hi ? '<munderover><mo>∑</mo>' + lo + hi + '</munderover>' : '<munder><mo>∑</mo>' + lo + '</munder>', p_ = a => r(o('('), a, o(')'));
  const t = i('t'), y = i('y'), yt = sub(y, t), et = sub(i('ε'), t), tm = k => r(t, o('−'), k), L = i('L'), D = o('Δ');
  const m = a => '<math>' + a + '</math>';
  return [
    { name: 'ARIMA and seasonal ARIMA', what: 'A model that forecasts a series from its own past values (autoregressive part) and past forecast errors (moving-average part), after differencing it to remove trends.', bg: 'Developed by George Box and Gwilym Jenkins in 1970; still the standard short-run benchmark in central banks and statistical offices.',
      eqs: [EQN(r(i('φ'), p_(L), sup(p_(r(n('1'), o('−'), L)), i('d')), yt, o('='), i('c'), o('+'), i('θ'), p_(L), et), '(1) ARIMA(p, d, q)'), EQN(r(i('φ'), p_(L), o('='), n('1'), o('−'), sub(i('φ'), n('1')), L, o('−'), o('…'), o('−'), sub(i('φ'), i('p')), sup(L, i('p')), o(','), o('&#8195;'), i('θ'), p_(L), o('='), n('1'), o('+'), sub(i('θ'), n('1')), L, o('+'), o('…'), o('+'), sub(i('θ'), i('q')), sup(L, i('q'))), '(2) Lag polynomials'), EQN(r(i('AIC'), o('='), o('−'), n('2'), i('ln'), hat(i('ℒ')), o('+'), n('2'), i('k')), '(3) Order selection')],
      vars: [[m(yt), 'the series at time t, for example monthly inflation'], [m(L), 'lag operator: L·yₜ = yₜ₋₁'], [m(i('d')), 'number of times the series is differenced'], [m(sub(i('φ'), i('j'))), 'autoregressive coefficients'], [m(sub(i('θ'), i('j'))), 'moving-average coefficients'], [m(et), 'unpredictable shock (white noise)'], [m(r(hat(i('ℒ')), o(','), i('k'))), 'maximised likelihood and number of estimated parameters']],
      ex: 'Illustrative numbers. An ARIMA(1,1,0) for inflation estimates Δπₜ = 0.05 + 0.30·Δπₜ₋₁ + εₜ. If inflation rose by 0.4 points last month to 8.3%, the forecast change is 0.05 + 0.30 × 0.4 = 0.17, so next month’s forecast is 8.3 + 0.17 = 8.47%.',
      site: 'Forecast lab, ARIMA tab; Bangladesh projections.', pm: 'Strengths: flexible, well understood and hard to beat over short horizons. Limits: uses one series only, so it cannot explain why things change; long-horizon forecasts settle at the mean or trend.',
      refs: [['Akaike, H. (1974). A new look at the statistical model identification. IEEE Transactions on Automatic Control, 19(6), 716–723.', 'https://doi.org/10.1109/TAC.1974.1100705'], ['Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). Time series analysis: Forecasting and control (5th ed.). Wiley.', ''], ['Hyndman, R. J., & Khandakar, Y. (2008). Automatic time series forecasting: The forecast package for R. Journal of Statistical Software, 27(3), 1–22.', 'https://doi.org/10.18637/jss.v027.i03']] },
    { name: 'Unit-root and stationarity tests (ADF and KPSS)', what: 'Tests of whether a series wanders without returning to a fixed mean (a unit root) or is stationary. ADF assumes a unit root and looks for evidence against it; KPSS assumes stationarity and looks for evidence against that.', bg: 'Dickey and Fuller (1979) proposed the test; Said and Dickey (1984) added lags (the “augmented” version); Kwiatkowski, Phillips, Schmidt and Shin (1992) proposed the reverse test.',
      eqs: [EQN(r(D, yt, o('='), i('α'), o('+'), i('γ'), sub(y, tm(n('1'))), o('+'), sum(r(i('j'), o('='), n('1')), i('p')), sub(i('δ'), i('j')), D, sub(y, tm(i('j'))), o('+'), et, o(','), o('&#8195;'), sub(i('H'), n('0')), o(':'), i('γ'), o('='), n('0')), '(1) Augmented Dickey–Fuller'), EQN(r(i('η'), o('='), fr(n('1'), sup(i('T'), n('2'))), sum(r(t, o('='), n('1')), i('T')), fr(ss(i('S'), t, n('2')), sup(hat(i('σ')), n('2'))), o(','), o('&#8195;'), sub(i('S'), t), o('='), sum(r(i('s'), o('='), n('1')), t), sub(hat(i('e')), i('s'))), '(2) KPSS statistic')],
      vars: [[m(D), 'first difference: Δyₜ = yₜ − yₜ₋₁'], [m(i('γ')), 'zero under a unit root; negative if the series reverts to its mean'], [m(i('p')), 'number of lagged differences that remove autocorrelation'], [m(sub(i('S'), t)), 'running sum of residuals from a regression on a constant'], [m(sup(hat(i('σ')), n('2'))), 'long-run variance of those residuals'], [m(i('T')), 'number of observations']],
      ex: 'Illustrative numbers. On monthly changes in inflation, ADF gives τ = −3.9 against a 5% critical value of −2.86: reject the unit root. KPSS gives η = 0.21 below its 5% critical value of 0.463: do not reject stationarity. Both tests agree that the changes are stationary.',
      site: 'Forecast lab, Data tab; Country analysis, Tests page.', pm: 'Strengths: decide whether to model levels or differences. Limits: low power in short samples, and structural breaks can look like unit roots; that is why both tests are reported together.',
      refs: [['Dickey, D. A., & Fuller, W. A. (1979). Distribution of the estimators for autoregressive time series with a unit root. Journal of the American Statistical Association, 74(366), 427–431.', 'https://doi.org/10.1080/01621459.1979.10482531'], ['Kwiatkowski, D., Phillips, P. C. B., Schmidt, P., & Shin, Y. (1992). Testing the null hypothesis of stationarity against the alternative of a unit root. Journal of Econometrics, 54(1–3), 159–178.', 'https://doi.org/10.1016/0304-4076(92)90104-Y'], ['Said, S. E., & Dickey, D. A. (1984). Testing for unit roots in autoregressive-moving average models of unknown order. Biometrika, 71(3), 599–607.', 'https://doi.org/10.1093/biomet/71.3.599']] },
    { name: 'Vector autoregression (VAR) and Granger causality', what: 'A system in which each variable is explained by past values of itself and of every other variable. Granger causality asks whether past values of one variable improve forecasts of another.', bg: 'Christopher Sims (1980) introduced VARs as an alternative to large structural models; Clive Granger (1969) defined predictive causality. Both later received the Nobel Prize.',
      eqs: [EQN(r(sub(i('𝐲'), t), o('='), i('𝐜'), o('+'), sub(i('𝐀'), n('1')), sub(i('𝐲'), tm(n('1'))), o('+'), o('…'), o('+'), sub(i('𝐀'), i('p')), sub(i('𝐲'), tm(i('p'))), o('+'), sub(i('𝐮'), t)), '(1) VAR(p)'), EQN(r(i('F'), o('='), fr(r(p_(r(sub(i('RSS'), i('r')), o('−'), sub(i('RSS'), i('u')))), o('/'), i('q')), r(sub(i('RSS'), i('u')), o('/'), p_(r(i('T'), o('−'), i('k'))))), o('∼'), i('F'), p_(r(i('q'), o(','), i('T'), o('−'), i('k')))), '(2) Granger causality test')],
      vars: [[m(sub(i('𝐲'), t)), 'vector of variables, for example inflation and the call-money rate'], [m(sub(i('𝐀'), i('j'))), 'matrices of coefficients on lag j'], [m(sub(i('𝐮'), t)), 'vector of forecast errors'], [m(r(sub(i('RSS'), i('r')), o(','), sub(i('RSS'), i('u')))), 'residual sums of squares without and with the lags being tested'], [m(r(i('q'), o(','), i('k'))), 'number of restrictions and of parameters in the unrestricted equation']],
      ex: 'Illustrative numbers. In a VAR(2) of inflation and the call-money rate, dropping the two call-rate lags from the inflation equation gives F = 3.4 with p = 0.035: past call rates help predict inflation. On this site the call rate Granger-causes inflation while broad money does not.',
      site: 'Forecast lab, VAR tab; Country analysis, Analysis page.', pm: 'Strengths: captures feedback between variables with few assumptions. Limits: many parameters, so only a few variables fit; “Granger causality” is about prediction, not proof of cause.',
      refs: [['Granger, C. W. J. (1969). Investigating causal relations by econometric models and cross-spectral methods. Econometrica, 37(3), 424–438.', 'https://doi.org/10.2307/1912791'], ['Lütkepohl, H. (2005). New introduction to multiple time series analysis. Springer.', 'https://doi.org/10.1007/978-3-540-27752-1'], ['Sims, C. A. (1980). Macroeconomics and reality. Econometrica, 48(1), 1–48.', 'https://doi.org/10.2307/1912017']] },
    { name: 'Impulse responses and variance decomposition (structural VAR)', what: 'Traces how all variables respond over time to a one-off shock in one of them, and splits each variable’s forecast uncertainty into the shares due to each shock.', bg: 'Shocks are identified by ordering the variables (a Cholesky decomposition): variables placed first are assumed not to react within the same period to those placed later.',
      eqs: [EQN(r(sub(i('𝐮'), t), o('='), i('𝐁'), sub(i('𝛆'), t), o(','), o('&#8195;'), i('𝐁'), sup(i('𝐁'), o('′')), o('='), sub(i('𝚺'), i('u'))), '(1) Identification'), EQN(r(sub(i('𝚯'), i('h')), o('='), sub(i('𝚽'), i('h')), i('𝐁'), o(','), o('&#8195;'), sub(i('𝚽'), i('h')), o('='), sum(r(i('j'), o('='), n('1')), r(i('min'), p_(r(i('h'), o(','), i('p'))))), sub(i('𝐀'), i('j')), sub(i('𝚽'), r(i('h'), o('−'), i('j')))), '(2) Impulse responses'), EQN(r(sub(i('ω'), r(i('j'), i('k'))), p_(i('H')), o('='), fr(r(sum(r(i('h'), o('='), n('0')), r(i('H'), o('−'), n('1'))), ss(i('θ'), r(i('j'), i('k'), o(','), i('h')), n('2'))), r(sum(r(i('h'), o('='), n('0')), r(i('H'), o('−'), n('1'))), sum(i('m'), ''), ss(i('θ'), r(i('j'), i('m'), o(','), i('h')), n('2'))))), '(3) Variance decomposition')],
      vars: [[m(i('𝐁')), 'lower-triangular matrix linking forecast errors to independent shocks'], [m(sub(i('𝚯'), i('h'))), 'responses h periods after the shock'], [m(sub(i('θ'), r(i('j'), i('k'), o(','), i('h')))), 'response of variable j to shock k after h periods'], [m(sub(i('ω'), r(i('j'), i('k')))), 'share of variable j’s H-step forecast-error variance due to shock k']],
      ex: 'Illustrative numbers. A one-standard-deviation rise in the call rate lowers inflation by 0.15 points after six months and the effect fades within two years; rate shocks explain 12% of the uncertainty in inflation 12 months ahead.',
      site: 'Forecast lab, VAR tab.', pm: 'Strengths: tells a story of transmission over time. Limits: results depend on the ordering, and the confidence bands are wide in short samples.',
      refs: [['Kilian, L., & Lütkepohl, H. (2017). Structural vector autoregressive analysis. Cambridge University Press.', 'https://doi.org/10.1017/9781108164818'], ['Sims, C. A. (1980). Macroeconomics and reality. Econometrica, 48(1), 1–48.', 'https://doi.org/10.2307/1912017']] },
    { name: 'Least squares, Newey–West standard errors and the delta method', what: 'Ordinary least squares fits a straight-line relationship; Newey–West standard errors stay valid when errors are correlated over time or vary in size; the delta method gives standard errors for quantities derived from estimates.', bg: 'Least squares dates to Legendre and Gauss (around 1805); Newey and West published their estimator in 1987.',
      eqs: [EQN(r(hat(i('𝛃')), o('='), sup(p_(r(sup(i('𝐗'), o('′')), i('𝐗'))), r(o('−'), n('1'))), sup(i('𝐗'), o('′')), i('𝐲')), '(1) Least squares'), EQN(r(sub(hat(i('𝐕')), i('NW')), o('='), sup(p_(r(sup(i('𝐗'), o('′')), i('𝐗'))), r(o('−'), n('1'))), hat(i('𝐒')), sup(p_(r(sup(i('𝐗'), o('′')), i('𝐗'))), r(o('−'), n('1'))), o(','), o('&#8195;'), sub(i('w'), i('l')), o('='), n('1'), o('−'), fr(i('l'), r(i('L'), o('+'), n('1')))), '(2) Newey–West'), EQN(r(i('Var'), o('['), i('g'), p_(hat(i('𝛃'))), o(']'), o('≈'), sup(r(o('∇'), i('g')), o('′')), sub(hat(i('𝐕')), i('NW')), o('∇'), i('g')), '(3) Delta method')],
      vars: [[m(i('𝐗')), 'matrix of explanatory variables, one row per period'], [m(hat(i('𝐒'))), 'weighted sum of products of residuals and regressors over L lags'], [m(sub(i('w'), i('l'))), 'Bartlett weight that falls with the lag l'], [m(i('g')), 'any smooth function of the coefficients, such as a long-run effect']],
      ex: 'Illustrative numbers. A long-run effect θ = β ÷ (1 − ρ) with β = 0.20 and ρ = 0.84 equals 1.25. The delta method combines the uncertainty of β and ρ (including their covariance) to give its standard error.',
      site: 'Forecast lab (Phillips curve, Taylor rule); Country analysis, Robustness page.', pm: 'Strengths: simple and transparent; Newey–West protects the test results. Limits: shows association, not causation; the lag length L is a judgement call.',
      refs: [['Newey, W. K., & West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. Econometrica, 55(3), 703–708.', 'https://doi.org/10.2307/1913610'], ['Oehlert, G. W. (1992). A note on the delta method. The American Statistician, 46(1), 27–29.', 'https://doi.org/10.1080/00031305.1992.10475842'], ['Wooldridge, J. M. (2020). Introductory econometrics: A modern approach (7th ed.). Cengage.', '']] },
    { name: 'Taylor rule with interest-rate smoothing', what: 'A description of how a central bank sets its interest rate: higher when inflation is above target or output is above potential, adjusting gradually from last period’s rate.', bg: 'John Taylor (1993) showed that a simple rule tracked US policy well; Clarida, Galí and Gertler (2000) added smoothing and expectations.',
      eqs: [EQN(r(sub(i('i'), t), o('='), i('ρ'), sub(i('i'), tm(n('1'))), o('+'), p_(r(n('1'), o('−'), i('ρ'))), o('['), sup(i('r'), o('∗')), o('+'), sub(i('π'), t), o('+'), sub(i('φ'), i('π')), p_(r(sub(i('π'), t), o('−'), sup(i('π'), o('∗')))), o('+'), sub(i('φ'), i('y')), sub(i('x'), t), o(']'), o('+'), et), '(1) Smoothed Taylor rule')],
      vars: [[m(sub(i('i'), t)), 'policy or call-money rate'], [m(i('ρ')), 'smoothing: the share of last period’s rate kept'], [m(r(sup(i('r'), o('∗')), o(','), sup(i('π'), o('∗')))), 'neutral real rate and inflation target'], [m(r(sub(i('φ'), i('π')), o(','), sub(i('φ'), i('y')))), 'responses to the inflation gap and the output gap'], [m(sub(i('x'), t)), 'output gap']],
      ex: 'On this site the smoothing estimate is ρ = 0.84 (the R package gives 0.839): the rate closes about 16% of the gap to the rule’s target each period.',
      site: 'Forecast lab; DSGE tab (equation 3).', pm: 'Strengths: a clear benchmark for judging policy. Limits: the neutral rate and the output gap are not observed, and actual decisions also weigh the exchange rate and financial stability.',
      refs: [['Clarida, R., Galí, J., & Gertler, M. (2000). Monetary policy rules and macroeconomic stability: Evidence and some theory. The Quarterly Journal of Economics, 115(1), 147–180.', 'https://doi.org/10.1162/003355300554692'], ['Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.', 'https://doi.org/10.1016/0167-2231(93)90009-L']] },
    { name: 'Hodrick–Prescott filter', what: 'Splits a series into a smooth trend and the cycle around it (the gap). The smoothing weight λ sets how stiff the trend is.', bg: 'Circulated by Hodrick and Prescott in 1980 and published in 1997; Ravn and Uhlig (2002) showed how to adjust λ for monthly and annual data.',
      eqs: [EQN(r(mdUnder('min', sub(i('τ'), t)), sum(t, ''), sup(p_(r(yt, o('−'), sub(i('τ'), t))), n('2')), o('+'), i('λ'), sum(t, ''), o('['), p_(r(sub(i('τ'), r(t, o('+'), n('1'))), o('−'), sub(i('τ'), t))), o('−'), p_(r(sub(i('τ'), t), o('−'), sub(i('τ'), tm(n('1'))))), sup(o(']'), n('2'))), '(1) HP trend')],
      vars: [[m(sub(i('τ'), t)), 'trend'], [m(r(yt, o('−'), sub(i('τ'), t))), 'cycle or gap'], [m(i('λ')), 'smoothing weight: 1,600 for quarterly, 129,600 for monthly and 6.25 for annual data (Ravn–Uhlig)']],
      ex: 'Illustrative numbers. If GDP is 2% above its HP trend, the economy is running hot and inflation pressure is likely to build; a gap of −2% suggests slack.',
      site: 'Forecast lab (output gap); Country analysis.', pm: 'Strengths: simple and widely used. Limits: the trend bends towards the latest data, so end-of-sample gaps are revised as new data arrive; Hamilton (2018) proposes a regression alternative.',
      refs: [['Hamilton, J. D. (2018). Why you should never use the Hodrick–Prescott filter. The Review of Economics and Statistics, 100(5), 831–843.', 'https://doi.org/10.1162/rest_a_00706'], ['Hodrick, R. J., & Prescott, E. C. (1997). Postwar U.S. business cycles: An empirical investigation. Journal of Money, Credit and Banking, 29(1), 1–16.', 'https://doi.org/10.2307/2953682'], ['Ravn, M. O., & Uhlig, H. (2002). On adjusting the Hodrick–Prescott filter for the frequency of observations. The Review of Economics and Statistics, 84(2), 371–376.', 'https://doi.org/10.1162/003465302317411604']] },
    { name: 'Holt’s linear exponential smoothing', what: 'A forecasting method that keeps a running level and a running trend, each updated as a weighted average of the newest information and the previous estimate.', bg: 'Charles Holt developed it in 1957 (published in 2004); it is one of the most widely used methods in business and government forecasting.',
      eqs: [EQN(r(sub(i('ℓ'), t), o('='), i('α'), yt, o('+'), p_(r(n('1'), o('−'), i('α'))), p_(r(sub(i('ℓ'), tm(n('1'))), o('+'), sub(i('b'), tm(n('1')))))), '(1) Level'), EQN(r(sub(i('b'), t), o('='), i('β'), p_(r(sub(i('ℓ'), t), o('−'), sub(i('ℓ'), tm(n('1'))))), o('+'), p_(r(n('1'), o('−'), i('β'))), sub(i('b'), tm(n('1')))), '(2) Trend'), EQN(r(sub(hat(i('y')), r(t, o('+'), i('h'), o('|'), t)), o('='), sub(i('ℓ'), t), o('+'), i('h'), sub(i('b'), t), o(','), o('&#8195;'), i('80%'), o(':'), sub(hat(i('y')), r(t, o('+'), i('h'))), o('±'), n('1.2816'), sub(hat(i('σ')), i('h'))), '(3) Forecast and 80% range')],
      vars: [[m(r(sub(i('ℓ'), t), o(','), sub(i('b'), t))), 'level and trend at time t'], [m(r(i('α'), o(','), i('β'))), 'smoothing weights between 0 and 1, chosen to minimise one-step errors'], [m(i('h')), 'forecast horizon'], [m(sub(hat(i('σ')), i('h'))), 'standard deviation of h-step errors']],
      ex: 'Illustrative numbers. With level 8.0, trend −0.10 a month, the 12-month forecast is 8.0 − 12 × 0.10 = 6.8; with σ̂₁₂ = 1.1 the 80% range is 6.8 ± 1.41, from 5.39 to 8.21.',
      site: 'Outlook sections of every Bangladesh tab; Country analysis, Forecasting page; World analysis projections.', pm: 'Strengths: fast, robust and transparent. Limits: extrapolates the latest trend, which can overshoot at turning points.',
      refs: [['Gardner, E. S., Jr. (1985). Exponential smoothing: The state of the art. Journal of Forecasting, 4(1), 1–28.', 'https://doi.org/10.1002/for.3980040103'], ['Holt, C. C. (2004). Forecasting seasonals and trends by exponentially weighted moving averages. International Journal of Forecasting, 20(1), 5–10.', 'https://doi.org/10.1016/j.ijforecast.2003.09.015'], ['Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and practice (3rd ed.). OTexts.', 'https://otexts.com/fpp3/']] },
    { name: 'Forecast combination and the Diebold–Mariano test', what: 'Averages forecasts from several models, giving more weight to those with smaller past errors; the Diebold–Mariano test checks whether one model’s forecasts are significantly more accurate than another’s.', bg: 'Bates and Granger (1969) showed that combinations usually beat the best single model; Diebold and Mariano (1995) gave the accuracy test.',
      eqs: [EQN(r(sub(hat(i('y')), i('c')), o('='), sum(i('m'), ''), sub(i('w'), i('m')), sub(hat(i('y')), i('m')), o(','), o('&#8195;'), sub(i('w'), i('m')), o('∝'), fr(n('1'), sub(i('MSE'), i('m')))), '(1) Inverse-error weights'), EQN(r(i('DM'), o('='), fr(mdBar(i('d')), sq(r(n('2'), i('π'), sub(hat(i('f')), i('d')), p_(n('0')), o('/'), i('T')))), o(','), o('&#8195;'), sub(i('d'), t), o('='), ss(i('e'), r(n('1'), t), n('2')), o('−'), ss(i('e'), r(n('2'), t), n('2'))), '(2) Diebold–Mariano')],
      vars: [[m(sub(hat(i('y')), i('m'))), 'forecast from model m'], [m(sub(i('MSE'), i('m'))), 'mean squared error of model m in back-tests'], [m(sub(i('d'), t)), 'difference in squared errors of two models'], [m(sub(hat(i('f')), i('d'))), 'long-run variance (spectral density at zero) of the differences']],
      ex: 'Illustrative numbers. ARIMA has back-test MSE 0.40 and a VAR 0.60: weights are 0.6 and 0.4. If they forecast 7.0% and 7.5%, the combination is 0.6 × 7.0 + 0.4 × 7.5 = 7.2%.',
      site: 'Forecast lab (ensemble); Country analysis, Validation page; World analysis projections (equal-weight ensemble).', pm: 'Strengths: combinations are robust to any one model failing. Limits: weights estimated from few errors are noisy; equal weights often do as well.',
      refs: [['Bates, J. M., & Granger, C. W. J. (1969). The combination of forecasts. Operational Research Quarterly, 20(4), 451–468.', 'https://doi.org/10.1057/jors.1969.103'], ['Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. Journal of Business & Economic Statistics, 13(3), 253–263.', 'https://doi.org/10.1080/07350015.1995.10524599'], ['Timmermann, A. (2006). Forecast combinations. In G. Elliott, C. W. J. Granger, & A. Timmermann (Eds.), Handbook of economic forecasting (Vol. 1, pp. 135–196). Elsevier.', 'https://doi.org/10.1016/S1574-0706(05)01004-9']] },
    { name: 'New Keynesian DSGE model', what: 'A small model of the whole economy built from the decisions of households, firms and the central bank: demand (IS curve), price setting (Phillips curve) and the policy rule.', bg: 'The three-equation model was popularised by Clarida, Galí and Gertler (1999) and Galí’s textbook; Smets and Wouters (2007) showed that larger versions fit data well.',
      eqs: [].concat(dsgeEquations()),
      vars: [[m(sub(i('x'), t)), 'output gap'], [m(sub(i('π'), t)), 'inflation'], [m(sub(i('i'), t)), 'nominal interest rate'], [m(sub(i('E'), t)), 'expectation formed at time t'], [m(r(i('σ'), o(','), i('β'), o(','), i('κ'))), 'inverse sensitivity of demand to the real rate, discount factor and Phillips-curve slope'], [m(r(sub(i('d'), t), o(','), sub(i('u'), t), o(','), sub(i('v'), t))), 'demand, cost-push and policy shocks']],
      ex: 'On this site the Bayesian estimate of the inflation response φπ is 1.98 (90% interval 1.60 to 2.48): above 1, so the rule satisfies the Taylor principle and inflation expectations stay anchored in the model.',
      site: 'Forecast lab, DSGE tab (shock scenarios, derivation and estimates).', pm: 'Strengths: tells a coherent story that respects how people respond to policy. Limits: heavily simplified; results depend on the assumed structure.',
      refs: [['Clarida, R., Galí, J., & Gertler, M. (1999). The science of monetary policy: A New Keynesian perspective. Journal of Economic Literature, 37(4), 1661–1707.', 'https://doi.org/10.1257/jel.37.4.1661'], ['Galí, J. (2015). Monetary policy, inflation, and the business cycle (2nd ed.). Princeton University Press.', ''], ['Smets, F., & Wouters, R. (2007). Shocks and frictions in US business cycles: A Bayesian DSGE approach. American Economic Review, 97(3), 586–606.', 'https://doi.org/10.1257/aer.97.3.586']] },
    { name: 'Bayesian estimation by Metropolis–Hastings', what: 'Combines prior beliefs about parameters with the information in the data to give a full probability distribution for each parameter, by drawing thousands of candidate values and keeping them in proportion to how well they fit.', bg: 'The algorithm comes from physics (Metropolis and colleagues, 1953; Hastings, 1970); An and Schorfheide (2007) set out its use for DSGE models.',
      eqs: [EQN(r(i('p'), p_(r(i('θ'), o('|'), i('Y'))), o('∝'), i('p'), p_(r(i('Y'), o('|'), i('θ'))), i('p'), p_(i('θ'))), '(1) Posterior'), EQN(r(i('α'), o('='), i('min'), o('{'), n('1'), o(','), fr(r(i('p'), p_(r(sup(i('θ'), o('∗')), o('|'), i('Y')))), r(i('p'), p_(r(sup(i('θ'), p_(r(i('j'), o('−'), n('1')))), o('|'), i('Y'))))), o('}')), '(2) Acceptance probability'), EQN(r(hat(i('R')), o('='), sq(fr(r(fr(r(i('n'), o('−'), n('1')), i('n')), i('W'), o('+'), fr(i('B'), i('n'))), i('W')))), '(3) Gelman–Rubin convergence')],
      vars: [[m(i('θ')), 'parameters'], [m(i('Y')), 'data'], [m(sup(i('θ'), o('∗'))), 'candidate draw'], [m(r(i('W'), o(','), i('B'))), 'variation within and between chains'], [m(i('n')), 'draws per chain']],
      ex: 'On this site: two chains of 30,000 draws each for 10 parameters; every R̂ is at most 1.003 (values below 1.1 indicate convergence), and the probability that φπ exceeds 1 is 100%.',
      site: 'Forecast lab, DSGE tab (Bayesian estimates).', pm: 'Strengths: full uncertainty for every parameter and a principled way to use prior knowledge. Limits: results depend on the priors and need convergence checks.',
      refs: [['An, S., & Schorfheide, F. (2007). Bayesian analysis of DSGE models. Econometric Reviews, 26(2–4), 113–172.', 'https://doi.org/10.1080/07474930701220071'], ['Gelman, A., & Rubin, D. B. (1992). Inference from iterative simulation using multiple sequences. Statistical Science, 7(4), 457–472.', 'https://doi.org/10.1214/ss/1177011136'], ['Hastings, W. K. (1970). Monte Carlo sampling methods using Markov chains and their applications. Biometrika, 57(1), 97–109.', 'https://doi.org/10.1093/biomet/57.1.97'], ['Metropolis, N., Rosenbluth, A. W., Rosenbluth, M. N., Teller, A. H., & Teller, E. (1953). Equation of state calculations by fast computing machines. The Journal of Chemical Physics, 21(6), 1087–1092.', 'https://doi.org/10.1063/1.1699114']] },
    { name: 'β- and σ-convergence', what: 'β-convergence asks whether poorer economies grow faster than richer ones; σ-convergence asks whether the spread of incomes across economies is shrinking.', bg: 'Barro and Sala-i-Martin (1992) made the regression standard in growth economics.',
      eqs: [EQN(r(sub(i('g'), i('i')), o('='), i('α'), o('+'), i('β'), i('ln'), sub(i('y'), r(i('i'), o(','), n('0'))), o('+'), sub(i('ε'), i('i'))), '(1) β-convergence'), EQN(r(i('λ'), o('='), o('−'), fr(r(i('ln'), p_(r(n('1'), o('+'), i('β'), i('T')))), i('T')), o(','), o('&#8195;'), sub(i('t'), r(n('1'), o('/'), n('2'))), o('='), fr(r(i('ln'), n('2')), i('λ'))), '(2) Speed and half-life'), EQN(r(sub(i('σ'), t), o('='), i('SD'), p_(r(i('ln'), sub(i('y'), r(i('i'), o(','), t))))), '(3) σ-convergence')],
      vars: [[m(sub(i('g'), i('i'))), 'average annual growth of income per person in economy i'], [m(sub(i('y'), r(i('i'), o(','), n('0')))), 'income per person at the start'], [m(i('β')), 'negative means convergence'], [m(r(i('T'), o(','), i('λ'))), 'length of the period in years and speed of convergence per year']],
      ex: 'Illustrative numbers. β = −0.010 over T = 24 years gives λ = −ln(1 − 0.24) ÷ 24 = 1.14% a year, so half the income gap closes in about ln 2 ÷ 0.0114 ≈ 61 years.',
      site: 'Forecast lab, World analysis tab (explorer and fixed analyses).', pm: 'Strengths: simple summary of catching up. Limits: β-convergence can coexist with widening spreads (Galton’s fallacy), which is why σ is shown too.',
      refs: [['Barro, R. J., & Sala-i-Martin, X. (1992). Convergence. Journal of Political Economy, 100(2), 223–251.', 'https://doi.org/10.1086/261816'], ['Sala-i-Martin, X. X. (1996). The classical approach to convergence analysis. The Economic Journal, 106(437), 1019–1036.', 'https://doi.org/10.2307/2235375']] },
    { name: 'Kruskal–Wallis test', what: 'Tests whether several groups (such as continents) come from the same distribution, using only the ranks of the values, so outliers matter little.', bg: 'Proposed by William Kruskal and W. Allen Wallis in 1952 as a rank-based version of one-way analysis of variance.',
      eqs: [EQN(r(i('H'), o('='), fr(n('12'), r(i('N'), p_(r(i('N'), o('+'), n('1'))))), sum(r(i('j'), o('='), n('1')), i('k')), fr(ss(i('R'), i('j'), n('2')), sub(i('n'), i('j'))), o('−'), n('3'), p_(r(i('N'), o('+'), n('1'))), o('∼'), ss(i('χ'), r(i('k'), o('−'), n('1')), n('2'))), '(1) Kruskal–Wallis H')],
      vars: [[m(i('N')), 'total number of economies'], [m(i('k')), 'number of groups'], [m(sub(i('R'), i('j'))), 'sum of the ranks in group j'], [m(sub(i('n'), i('j'))), 'size of group j']],
      ex: 'Illustrative numbers. Inflation across five continents gives H = 21.3 with 4 degrees of freedom, p < 0.001: typical inflation differs between continents.',
      site: 'Forecast lab, World analysis tab; Country analysis, Heterogeneity page.', pm: 'Strengths: no normality assumption. Limits: says that groups differ, not which ones.',
      refs: [['Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association, 47(260), 583–621.', 'https://doi.org/10.1080/01621459.1952.10483441']] },
    { name: 'Ljung–Box and Jarque–Bera tests', what: 'Checks on model residuals. Ljung–Box tests whether they are still correlated over time (a sign the model missed something); Jarque–Bera tests whether they are normally distributed.', bg: 'Ljung and Box (1978) refined the Box–Pierce test; Jarque and Bera (1980) combined skewness and kurtosis into one statistic.',
      eqs: [EQN(r(i('Q'), o('='), i('T'), p_(r(i('T'), o('+'), n('2'))), sum(r(i('k'), o('='), n('1')), i('h')), fr(ss(hat(i('ρ')), i('k'), n('2')), r(i('T'), o('−'), i('k'))), o('∼'), ss(i('χ'), i('h'), n('2'))), '(1) Ljung–Box'), EQN(r(i('JB'), o('='), fr(i('T'), n('6')), p_(r(sup(i('S'), n('2')), o('+'), fr(sup(p_(r(i('K'), o('−'), n('3'))), n('2')), n('4')))), o('∼'), ss(i('χ'), n('2'), n('2'))), '(2) Jarque–Bera')],
      vars: [[m(sub(hat(i('ρ')), i('k'))), 'autocorrelation of residuals at lag k'], [m(i('h')), 'number of lags tested'], [m(r(i('S'), o(','), i('K'))), 'skewness and kurtosis of residuals (3 for a normal distribution)']],
      ex: 'Illustrative numbers. Q(12) = 9.8 with p = 0.63: no remaining autocorrelation, so the model has captured the dynamics. JB = 25 with p < 0.001: residuals have fat tails, so ranges should be read with care.',
      site: 'Forecast lab, ARIMA tab; Country analysis, Tests page; World analysis distribution table.', pm: 'Strengths: quick diagnostics. Limits: with many observations tiny departures become “significant”.',
      refs: [['Jarque, C. M., & Bera, A. K. (1980). Efficient tests for normality, homoscedasticity and serial independence of regression residuals. Economics Letters, 6(3), 255–259.', 'https://doi.org/10.1016/0165-1765(80)90024-5'], ['Ljung, G. M., & Box, G. E. P. (1978). On a measure of lack of fit in time series models. Biometrika, 65(2), 297–303.', 'https://doi.org/10.1093/biomet/65.2.297']] },
    { name: 'Correlation (Pearson and Spearman)', what: 'Measures how closely two variables move together, from −1 (perfectly opposite) to +1 (perfectly together). Spearman uses ranks, so it captures any steadily rising or falling relationship and resists outliers.', bg: 'Karl Pearson formalised the coefficient in 1896; Charles Spearman introduced the rank version in 1904.',
      eqs: [EQN(r(i('r'), o('='), fr(r(sum(i('i'), ''), p_(r(sub(i('x'), i('i')), o('−'), mdBar(i('x')))), p_(r(sub(i('y'), i('i')), o('−'), mdBar(i('y'))))), sq(r(sum(i('i'), ''), sup(p_(r(sub(i('x'), i('i')), o('−'), mdBar(i('x')))), n('2')), sum(i('i'), ''), sup(p_(r(sub(i('y'), i('i')), o('−'), mdBar(i('y')))), n('2'))))), o(','), o('&#8195;'), i('t'), o('='), fr(r(i('r'), sq(r(i('n'), o('−'), n('2')))), sq(r(n('1'), o('−'), sup(i('r'), n('2')))))), '(1) Pearson r and its t-test')],
      vars: [[m(r(sub(i('x'), i('i')), o(','), sub(i('y'), i('i')))), 'values of the two variables for economy or period i'], [m(r(mdBar(i('x')), o(','), mdBar(i('y')))), 'their averages'], [m(i('n')), 'number of pairs; t has n − 2 degrees of freedom']],
      ex: 'Illustrative numbers. Across 40 economies, r = 0.45 between inflation and money growth gives t = 0.45 × √38 ÷ √(1 − 0.2025) = 3.11, p ≈ 0.004.',
      site: 'Inflation explorer (lead correlations); World analysis, Correlations tab.', pm: 'Strengths: simple and comparable. Limits: correlation is not causation, and Pearson only captures straight-line relationships.',
      refs: [['Pearson, K. (1896). Mathematical contributions to the theory of evolution. III. Regression, heredity, and panmixia. Philosophical Transactions of the Royal Society of London, Series A, 187, 253–318.', 'https://doi.org/10.1098/rsta.1896.0007'], ['Spearman, C. (1904). The proof and measurement of association between two things. The American Journal of Psychology, 15(1), 72–101.', 'https://doi.org/10.2307/1412159']] },
    { name: 'Placebo and permutation tests', what: 'Checks whether a result could arise by chance: the data are shuffled (or a fake treatment date is used) many times, and the real result is compared with the spread of shuffled results.', bg: 'The idea goes back to Ronald Fisher’s randomisation tests in the 1930s; computers made it routine.',
      eqs: [EQN(r(i('p'), o('='), fr(r(n('1'), o('+'), sum(r(i('b'), o('='), n('1')), i('B')), n('𝟏'), o('{'), o('|'), ss(i('T'), i('b'), o('∗')), o('|'), o('≥'), o('|'), i('T'), o('|'), o('}')), r(i('B'), o('+'), n('1')))), '(1) Permutation p-value')],
      vars: [[m(i('T')), 'statistic on the real data'], [m(ss(i('T'), i('b'), o('∗'))), 'statistic on shuffled data set b'], [m(i('B')), 'number of shuffles']],
      ex: 'Illustrative numbers. With B = 999 shuffles, if 14 shuffled statistics are at least as large as the real one, p = (1 + 14) ÷ 1,000 = 0.015.',
      site: 'Country analysis, Placebo page.', pm: 'Strengths: few assumptions. Limits: shuffling must respect the structure of the data, for example blocks of time.',
      refs: [['Fisher, R. A. (1935). The design of experiments. Oliver and Boyd.', ''], ['Good, P. I. (2005). Permutation, parametric, and bootstrap tests of hypotheses (3rd ed.). Springer.', 'https://doi.org/10.1007/b138696']] },
    { name: 'Benchmark projections: AR(1), linear trend and no-change', what: 'Three simple yardsticks used in the World analysis projections: AR(1) pulls the series back towards its average, the linear trend extends a straight line, and no-change repeats the last value.', bg: 'Simple benchmarks are hard to beat for annual macroeconomic data; any complex model should be judged against them.',
      eqs: [EQN(r(yt, o('='), i('a'), o('+'), i('b'), sub(y, tm(n('1'))), o('+'), sub(i('e'), t), o(','), o('&#8195;'), sub(hat(i('y')), r(i('T'), o('+'), i('h'))), o('='), i('a'), fr(r(n('1'), o('−'), sup(i('b'), i('h'))), r(n('1'), o('−'), i('b'))), o('+'), sup(i('b'), i('h')), sub(i('y'), i('T'))), '(1) AR(1)'), EQN(r(sub(hat(i('y')), r(i('T'), o('+'), i('h'))), o('='), i('α'), o('+'), i('β'), p_(r(i('T'), o('+'), i('h'))), o(','), o('&#8195;'), sub(hat(i('y')), r(i('T'), o('+'), i('h'))), o('='), sub(i('y'), i('T'))), '(2) Linear trend and no-change')],
      vars: [[m(r(i('a'), o(','), i('b'))), 'AR(1) intercept and persistence; |b| < 1 means the series returns to a / (1 − b)'], [m(r(i('α'), o(','), i('β'))), 'trend intercept and slope'], [m(i('h')), 'years ahead']],
      ex: 'Illustrative numbers. With a = 1.2, b = 0.8 and the latest value 9.0, the AR(1) forecasts 1.2 + 0.8 × 9.0 = 8.4 next year, heading towards 1.2 ÷ 0.2 = 6.0 in the long run.',
      site: 'Forecast lab, World analysis explorer, Projections tab.', pm: 'Strengths: transparent and robust. Limits: ignore all other information.',
      refs: [['Hamilton, J. D. (1994). Time series analysis. Princeton University Press.', '']] }
  ];
}
function mdUnder(a, b) { return '<munder><mi>' + a + '</mi>' + b + '</munder>'; }
function mdBar(a) { return '<mover accent="true">' + a + '<mo>¯</mo></mover>'; }
function modelDocs(body) {
  try {
    const D = mdDocs();
    const s = sec(body, 'Models explained', 'Every model and test used on this site: what it is, where it comes from, its equations, what each symbol means, a worked example, where it is used here, and where to read more (APA 7th edition; DOI links open the publisher’s page).', 'models');
    const toc = document.createElement('div'); toc.className = 'md-toc';
    toc.innerHTML = D.map((d, j) => '<button type="button" data-md="' + j + '">' + (j + 1) + '. ' + esc(d.name) + '</button>').join('');
    s.append(toc);
    toc.addEventListener('click', e => { const b = e.target.closest('[data-md]'); if (!b) return; const t = s.querySelector('#md-' + b.getAttribute('data-md')); if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); });
    D.forEach((d, j) => {
      const a = document.createElement('article'); a.className = 'md-card'; a.id = 'md-' + j;
      a.innerHTML = '<h3>' + (j + 1) + '. ' + esc(d.name) + '</h3>' +
        '<p><b>What it is.</b> ' + esc(d.what) + '</p><p><b>Background.</b> ' + esc(d.bg) + '</p>' +
        '<div class="md-eq">' + d.eqs.join('') + '</div>' +
        '<p><b>Symbols.</b></p><dl class="md-vars">' + d.vars.map(([sym, txt]) => '<dt>' + sym + '</dt><dd>' + esc(txt) + '</dd>').join('') + '</dl>' +
        '<p><b>Worked example.</b> ' + esc(d.ex) + '</p><p><b>Used on this site.</b> ' + esc(d.site) + '</p><p><b>Strengths and limits.</b> ' + esc(d.pm) + '</p>' +
        '<p><b>References.</b></p><ol class="md-refs">' + d.refs.map(([txt, url]) => '<li>' + esc(txt) + (url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>' : '') + '</li>').join('') + '</ol>';
      s.append(a);
    });
  } catch (e) { console.warn('v38 docs', e && e.stack ? e.stack.slice(0, 300) : e); }
}

/* (e) World analysis explorer: groups, combinations, maps, distributions, tables, tests, correlations, projections. */
var WXG = {
  'G7': 'USA JPN DEU GBR FRA ITA CAN',
  'G20 (19 member countries)': 'ARG AUS BRA CAN CHN FRA DEU IND IDN ITA JPN KOR MEX RUS SAU ZAF TUR GBR USA',
  'BRICS': 'BRA RUS IND CHN ZAF EGY ETH IRN ARE IDN',
  'OECD': 'AUS AUT BEL CAN CHL COL CRI CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU LUX MEX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE TUR GBR USA',
  'European Union': 'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE',
  'SAARC': 'AFG BGD BTN IND MDV NPL PAK LKA',
  'ASEAN': 'BRN KHM IDN LAO MYS MMR PHL SGP THA VNM TLS',
  'OPEC': 'DZA COG GNQ GAB IRN IRQ KWT LBY NGA SAU ARE VEN',
  'OIC': 'AFG ALB DZA AZE BHR BGD BEN BRN BFA CMR TCD COM CIV DJI EGY GAB GMB GIN GNB GUY IDN IRN IRQ JOR KAZ KWT KGZ LBN LBY MYS MDV MLI MRT MAR MOZ NER NGA OMN PAK PSE QAT SAU SEN SLE SOM SDN SUR SYR TJK TGO TUN TUR TKM UGA ARE UZB YEM',
  'Arab League': 'DZA BHR COM DJI EGY IRQ JOR KWT LBN LBY MRT MAR OMN PSE QAT SAU SOM SDN SYR TUN ARE YEM',
  'UN least developed countries': 'AFG AGO BGD BEN BFA BDI KHM CAF TCD COM COD DJI ERI ETH GMB GIN GNB HTI KIR LAO LSO LBR MDG MWI MLI MRT MOZ MMR NPL NER RWA SEN SLE SLB SOM SSD SDN TLS TGO TUV UGA TZA YEM ZMB'
};
var WX = { g: ['SAARC'], mode: 'union', ind: 'gdp_growth', vars: ['gdp_growth', 'inflation', 'gdp_pc', 'unemployment', 'current_account', 'gov_debt'], tab: 'map', econ: 'BGD', models: ['ar1', 'holt', 'trend', 'naive'], corr: 'pearson', box: null };
var WX_TABS = [['map', 'Map'], ['dist', 'Distribution'], ['table', 'Table'], ['conv', 'Convergence and tests'], ['corr', 'Correlations'], ['proj', 'Projections'], ['guide', 'Guidance']];
var WX_MOD = { ar1: 'AR(1)', holt: 'Holt smoothing', trend: 'Linear trend', naive: 'No change' };
function wxSets() {
  if (wxSets.c) return wxSets.c;
  const S0 = {}, cats = { 'Groups and blocs': [], 'Income (approximate)': [], 'Continents': [], 'Sub-continents': [] }, have = new Set(clCountries().map(e => e[0]));
  const add = (cat, nm, iso) => { if (!S0[nm]) { S0[nm] = new Set(); cats[cat].push(nm); } if (iso && have.has(iso)) S0[nm].add(iso); };
  Object.entries(WXG).forEach(([g, s]) => { add('Groups and blocs', g); s.split(' ').forEach(iso => add('Groups and blocs', g, iso)); });
  clCountries().forEach(e => {
    if (e[3]) add('Continents', e[3], e[0]); if (e[4]) add('Sub-continents', e[4], e[0]);
    const ig = incomeGroup(e[0]); if (!ig) return;
    add('Income (approximate)', ig, e[0]);
    if (ig !== 'High income') add('Income (approximate)', 'Developing (low and middle income)', e[0]);
    if (/middle/.test(ig)) add('Income (approximate)', 'Middle income (lower and upper)', e[0]);
  });
  cats['Continents'].sort(); cats['Sub-continents'].sort();
  cats['Income (approximate)'] = ['Low income', 'Lower-middle income', 'Upper-middle income', 'High income', 'Middle income (lower and upper)', 'Developing (low and middle income)'].filter(nm => S0[nm]);
  return (wxSets.c = { S: S0, cats });
}
function wxMembers() {
  const S0 = wxSets().S, gs = WX.g.filter(g => S0[g]), E = EMAPB();
  if (!gs.length) return [];
  let set;
  if (WX.mode === 'intersection') { set = new Set(S0[gs[0]]); gs.slice(1).forEach(g => { set = new Set([...set].filter(x => S0[g].has(x))); }); }
  else { set = new Set(); gs.forEach(g => S0[g].forEach(x => set.add(x))); }
  return [...set].filter(x => E[x]).sort((a, b) => E[a][1].localeCompare(E[b][1]));
}
function wxAvg(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function wxSd(a) { if (a.length < 2) return 0; const m = wxAvg(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); }
function wxQ(sorted, p) { if (!sorted.length) return null; const h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); }
function wxLatest(k, mem, maxAge) {
  const out = []; mem.forEach(iso => { const l = lastOfS(k, iso); if (l && l[1] != null && isFinite(+l[1])) out.push({ iso, y: +l[0], v: +l[1] }); });
  const ym = out.reduce((m, r) => Math.max(m, r.y), 0); return out.filter(r => r.y >= ym - (maxAge == null ? 5 : maxAge));
}
function wxFew(body) { body.insertAdjacentHTML('beforeend', '<p class="note">Fewer than three of the selected economies have recent data for this variable. Add more groups or choose another variable.</p>'); }
function worldExplorer(body) {
  try {
    const s = sec(body, 'World analysis explorer', 'Choose groups of economies, combine them, pick a variable, and see maps, distributions, rankings, convergence tests, correlations and projections. New here? Start with the Guidance tab.', 'wx');
    const { S: S0, cats } = wxSets(), box = document.createElement('div'); box.className = 'wx'; WX.box = box;
    const inds = Object.keys(RAW.s).filter(k => IND[k]);
    if (!inds.includes(WX.ind)) WX.ind = inds[0];
    const seen = new Set(), optg = CL_CATS.map(c => { const ks = catKeys(c).filter(k => RAW.s[k] && !seen.has(k)); ks.forEach(k => seen.add(k)); return ks.length ? '<optgroup label="' + esc(c.t) + '">' + ks.map(k => '<option value="' + k + '">' + esc(indL(k)) + '</option>').join('') + '</optgroup>' : ''; }).join('');
    const rest = inds.filter(k => !seen.has(k));
    box.innerHTML = '<div class="wx-groups">' + Object.entries(cats).map(([c, names], ci) => '<details' + (ci === 0 ? ' open' : '') + '><summary>' + esc(c) + '</summary><div>' + names.map(nm => '<label class="wx-chk"><input type="checkbox" value="' + esc(nm) + '"' + (WX.g.includes(nm) ? ' checked' : '') + '> ' + esc(nm) + ' <small>(' + S0[nm].size + ')</small></label>').join('') + '</div></details>').join('') + '</div>' +
      '<div class="controls wx-ctl"><label>Combine <select data-w="mode"><option value="union">Union: in any chosen group</option><option value="intersection">Intersection: in every chosen group</option></select></label>' +
      '<label>Variable <select data-w="ind">' + optg + (rest.length ? '<optgroup label="Other">' + rest.map(k => '<option value="' + k + '">' + esc(indL(k)) + '</option>').join('') + '</optgroup>' : '') + '</select></label>' +
      '<button type="button" class="btn sm" data-w="clear">Clear groups</button></div>' +
      '<p class="note wx-sum"></p><div class="wx-tabs" role="tablist" aria-label="Explorer views">' + WX_TABS.map(([id, t]) => '<button type="button" role="tab" data-wt="' + id + '" aria-selected="' + (WX.tab === id) + '">' + esc(t) + '</button>').join('') + '</div><div class="wx-body"></div>';
    s.append(box);
    box.querySelector('[data-w="mode"]').value = WX.mode; box.querySelector('[data-w="ind"]').value = WX.ind;
    box.querySelector('.wx-groups').addEventListener('change', () => { WX.g = [...box.querySelectorAll('.wx-groups input:checked')].map(x => x.value); wxRender(box); });
    box.querySelector('.wx-ctl').addEventListener('change', e => { const w = e.target.getAttribute('data-w'); if (w === 'mode' || w === 'ind') { WX[w] = e.target.value; wxRender(box); } });
    box.querySelector('[data-w="clear"]').addEventListener('click', () => { box.querySelectorAll('.wx-groups input').forEach(x => { x.checked = false; }); WX.g = []; wxRender(box); });
    box.querySelector('.wx-tabs').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if (!b) return; WX.tab = b.getAttribute('data-wt'); wxRender(box); });
    wxRender(box);
  } catch (e) { console.warn('v38 wx', e && e.stack ? e.stack.slice(0, 300) : e); }
}
function wxRender(box) {
  const body = box.querySelector('.wx-body'); try { disposeIn(body); } catch (e) { /* none */ } body.innerHTML = '';
  const mem = wxMembers(), E = EMAPB(), k = WX.ind, op = WX.mode === 'union' ? ' ∪ ' : ' ∩ ';
  box.querySelector('.wx-sum').innerHTML = mem.length ? '<b>' + mem.length + ' economies</b> (' + esc(WX.g.join(op)) + '): ' + esc(mem.slice(0, 14).map(x => E[x][1]).join(', ')) + (mem.length > 14 ? ' and ' + (mem.length - 14) + ' more' : '') + '.' : 'No economies selected. Tick at least one group' + (WX.mode === 'intersection' && WX.g.length > 1 ? ', or switch to Union: no economy belongs to every chosen group' : '') + '.';
  box.querySelectorAll('[data-wt]').forEach(b => b.setAttribute('aria-selected', b.getAttribute('data-wt') === WX.tab ? 'true' : 'false'));
  if (WX.tab === 'guide') { wxGuide(body); return; }
  if (!mem.length) return;
  try { ({ map: wxMap, dist: wxDist, table: wxTable, conv: wxConv, corr: wxCorr, proj: wxProj })[WX.tab](body, mem, k); }
  catch (e) { console.warn('v38 wxtab', e && e.stack ? e.stack.slice(0, 300) : e); body.insertAdjacentHTML('beforeend', '<p class="note">This view could not be drawn for the current choice.</p>'); }
}
function wxMap(body, mem, k) {
  const G = RAW.geo && RAW.geo.dots; if (!G || !G.d) { body.innerHTML = '<p class="note">Map data are not available.</p>'; return; }
  const L = wxLatest(k, mem); if (L.length < 3) { wxFew(body); return; }
  const V = new Map(L.map(q => [q.iso, q.v])), xs = L.map(q => q.v).sort((a, b) => a - b), cuts = [0.2, 0.4, 0.6, 0.8].map(p => wxQ(xs, p));
  const PAL = ['#2166AC', '#67A9CF', '#E9C46A', '#EF8A62', '#B2182B'], bin = v => cuts.filter(c => v > c).length, E = EMAPB();
  const w = document.createElement('div'); w.className = 'wx-map';
  w.innerHTML = '<p class="wx-cap"><b>' + esc(indL(k)) + '</b> (' + esc(indU(k)) + '), latest year for each economy. Selected economies are coloured by fifths of their values; others are grey.</p><canvas role="img" aria-label="World map of ' + esc(indL(k)) + ' for the selected economies"></canvas><div class="wx-leg"></div><p class="src-line"><b>Source:</b> World Bank, World Development Indicators; map outlines: Natural Earth.</p>';
  body.append(w);
  const cv = w.querySelector('canvas'), VW = +RAW.geo.w || 1000, VH = +RAW.geo.h || 436, W = Math.max(280, w.clientWidth || 900), sc = W / VW, H = VH * sc, dpr = Math.min(2, window.devicePixelRatio || 1), s = G.s;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = Math.round(H) + 'px';
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8a96a3', ms = new Set(mem);
  for (let q = 0; q < G.d.length; q += 3) {
    const iso = G.iso[G.d[q + 2]], x = (s / 2 + G.d[q] * s) * sc, y = (s / 2 + G.d[q + 1] * s) * sc;
    let col = muted, a = 0.22, rr = s * 0.4 * sc;
    if (ms.has(iso)) { if (V.has(iso)) { col = PAL[bin(V.get(iso))]; a = 1; rr = s * 0.52 * sc; } else a = 0.7; }
    c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, rr, 0, 6.2832); c.fill();
  }
  c.globalAlpha = 1;
  const edges = [xs[0], ...cuts, xs[xs.length - 1]];
  w.querySelector('.wx-leg').innerHTML = PAL.map((p, j) => '<span><i style="background:' + p + '"></i>' + nf(edges[j]) + ' to ' + nf(edges[j + 1]) + '</span>').join('') + '<span><i style="background:' + muted + ';opacity:.7"></i>selected, no data</span><span><i style="background:' + muted + ';opacity:.22"></i>not selected</span>';
  const hi = L.slice().sort((a, b) => b.v - a.v);
  w.insertAdjacentHTML('beforeend', '<p class="note">Highest: ' + esc(E[hi[0].iso][1]) + ' (' + nf(hi[0].v) + ', ' + hi[0].y + '). Lowest: ' + esc(E[hi[hi.length - 1].iso][1]) + ' (' + nf(hi[hi.length - 1].v) + ', ' + hi[hi.length - 1].y + '). Median: ' + nf(wxQ(xs, 0.5)) + '. Small economies may be too small to see at this scale; the Table tab lists them all.</p>');
}
function wxDist(body, mem, k) {
  const L = wxLatest(k, mem); if (L.length < 3) { wxFew(body); return; }
  const E = EMAPB(), xs = L.map(q => q.v), nn = xs.length, mu = wxAvg(xs), sd = wxSd(xs), srt = xs.slice().sort((a, b) => a - b);
  const sk = sd ? xs.reduce((a, v) => a + Math.pow((v - mu) / sd, 3), 0) / nn : null, ku = sd ? xs.reduce((a, v) => a + Math.pow((v - mu) / sd, 4), 0) / nn - 3 : null;
  const jb = sk != null ? nn / 6 * (sk * sk + ku * ku / 4) : null, jp = jb != null ? chi2p(jb, 2) : null, src = 'World Bank, World Development Indicators.';
  const g = grid(body), pre = labState.prefix || 'L';
  figure(g, { prefix: pre, ts: false, title: 'Distribution of ' + indL(k), sub: 'Number of selected economies in each range of values; red = the range holding the last economy listed', h: 300, source: src, render: TH => fillHist(TH, { name: indL(k), vals: xs }) });
  const by = {}; L.forEach(q => { const c = E[q.iso][3] || 'Other'; (by[c] = by[c] || []).push(q.v); });
  const cs = Object.keys(by).sort();
  figure(g, { prefix: pre, ts: false, title: indL(k) + ' by continent', sub: 'Box plots: line = median, box = middle half of economies, whiskers = lowest to highest', h: 300, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', confine: true },
    xAxis: { type: 'category', data: cs.map(c => c + ' (' + by[c].length + ')'), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, indU(k)),
    series: [{ name: indL(k), type: 'boxplot', data: cs.map(c => { const a = by[c].slice().sort((x, y) => x - y); return [a[0], wxQ(a, 0.25), wxQ(a, 0.5), wxQ(a, 0.75), a[a.length - 1]]; }), itemStyle: { color: 'rgba(59,130,196,.18)', borderColor: '#3B82C4' } }] }) });
  const lo = L.reduce((a, b) => (b.v < a.v ? b : a)), hi = L.reduce((a, b) => (b.v > a.v ? b : a));
  const row = (a, b) => '<tr><th scope="row">' + a + '</th><td class="num">' + b + '</td></tr>';
  tableWrap(body, '<table><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>' + row('Economies with data', nn) + row('Mean', nf(mu)) + row('Median', nf(wxQ(srt, 0.5))) + row('Standard deviation', nf(sd)) + row('Lowest', nf(lo.v) + ' (' + esc(E[lo.iso][1]) + ')') + row('Highest', nf(hi.v) + ' (' + esc(E[hi.iso][1]) + ')') + row('Middle half (25th to 75th percentile)', nf(wxQ(srt, 0.25)) + ' to ' + nf(wxQ(srt, 0.75))) + row('Skewness', nf(sk)) + row('Excess kurtosis', nf(ku)) + row('Jarque–Bera normality test', nf(jb) + ' (p = ' + fp(jp) + ')') + '</tbody></table>',
    tcap('Summary statistics: ' + indL(k)), 'Latest value for each economy, within five years of the most recent year. Skewness above 0 means a long right tail; a Jarque–Bera p below 0.05 means the values are not normally distributed.');
}
function wxTable(body, mem, k) {
  const L = wxLatest(k, mem, 99).sort((a, b) => b.v - a.v); if (!L.length) { wxFew(body); return; }
  const E = EMAPB(), xs = L.map(q => q.v), mu = wxAvg(xs), sd = wxSd(xs) || 1, miss = mem.filter(x => !L.some(q => q.iso === x));
  const rows = L.map((q, j) => { const m = new Map(wser(k, q.iso)), b5 = m.get(q.y - 5), ch = b5 != null ? q.v - b5 : null, z = (q.v - mu) / sd;
    return '<tr><td class="num">' + (j + 1) + '</td><th scope="row">' + esc(E[q.iso][1]) + '</th><td>' + esc(E[q.iso][4] || '') + '</td><td class="num">' + nf(q.v) + '</td><td class="num">' + q.y + '</td><td class="num">' + nf(z) + (Math.abs(z) > 2 ? ' ⚑' : '') + '</td><td class="num">' + (ch == null ? '–' : (ch > 0 ? '+' : '') + nf(ch)) + '</td></tr>'; }).join('');
  tableWrap(body, '<table><thead><tr><th>Rank</th><th>Economy</th><th>Sub-continent</th><th>' + esc(indL(k)) + ' (' + esc(indU(k)) + ')</th><th>Year</th><th>z-score</th><th>Change over 5 years</th></tr></thead><tbody>' + rows + '</tbody></table>',
    tcap('Ranking of the selected economies: ' + indL(k)), 'z-score = (value − group average) ÷ group standard deviation; ⚑ marks |z| above 2, an unusual value for this group.' + (miss.length ? ' No data for: ' + miss.map(x => E[x][1]).join(', ') + '.' : ''));
}
function wxConv(body, mem, k) {
  const E = EMAPB(), ky = RAW.s.gdp_pc_ppp ? 'gdp_pc_ppp' : 'gdp_pc', y0 = 2000, pre = labState.prefix || 'L', src = 'World Bank, World Development Indicators; model estimates.';
  let yT = 0; mem.forEach(x => { const l = lastOfS(ky, x); if (l) yT = Math.max(yT, +l[0]); });
  const pts = []; mem.forEach(x => { const m = new Map(wser(ky, x)), a = m.get(y0), Y = m.has(yT) ? yT : yT - 1, b = m.get(Y); if (a > 0 && b > 0 && Y - y0 > 5) pts.push({ iso: x, x: Math.log(a), g: (Math.log(b) - Math.log(a)) / (Y - y0) * 100, T: Y - y0 }); });
  const g = grid(body);
  if (pts.length >= 5) {
    const r = ols(pts.map(p => [1, p.x]), pts.map(p => p.g)), b = r.beta[1], se = r.se[1], tt = b / se, pv = tp2(tt, r.df), T = Math.round(wxAvg(pts.map(p => p.T)));
    const lam = 1 + b / 100 * T > 0 ? -Math.log(1 + b / 100 * T) / T : null, hl = lam > 0 ? Math.log(2) / lam : null;
    const gm = wxAvg(pts.map(p => p.g)), sst = pts.reduce((a, p) => a + (p.g - gm) * (p.g - gm), 0), r2 = sst ? 1 - r.sse / sst : null;
    const xmin = Math.min(...pts.map(p => p.x)), xmax = Math.max(...pts.map(p => p.x));
    figure(g, { prefix: pre, ts: false, title: 'β-convergence: do poorer economies grow faster?', sub: 'Average annual growth of ' + indL(ky).toLowerCase() + ' since ' + y0 + ' against its ' + y0 + ' level (log scale)', h: 320, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 14, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', confine: true, formatter: q => q.data && q.data.n ? esc(q.data.n) + '<br>growth ' + nf(q.data.value[1]) + '% a year' : '' },
      xAxis: Object.assign(valAxis(TH, 'ln(' + indL(ky) + ', ' + y0 + ')'), { scale: true }), yAxis: valAxis(TH, '% a year'),
      series: [{ name: 'Economies', type: 'scatter', symbolSize: 8, itemStyle: { color: '#3B82C4', opacity: 0.8 }, data: pts.map(p => ({ value: [p.x, p.g], n: E[p.iso][1] })) }, { name: 'Fitted line', type: 'line', showSymbol: false, data: [[xmin, r.beta[0] + b * xmin], [xmax, r.beta[0] + b * xmax]], lineStyle: { color: '#E5484D', width: 2 } }] }) });
    const sig = [], years = [];
    for (let yy = 1990; yy <= yT; yy++) { const v = []; mem.forEach(x => { const m = wxCache(ky, x).get(yy); if (m > 0) v.push(Math.log(m)); }); if (v.length >= 5) { years.push(String(yy)); sig.push(wxSd(v)); } }
    figure(g, { prefix: pre, title: 'σ-convergence: is the spread of incomes shrinking?', sub: 'Standard deviation of log ' + indL(ky).toLowerCase() + ' across the selected economies', h: 320, source: src, render: TH => tsOption(TH, years, [S('Spread (SD of logs)', sig, { w: 2 })], { y1: 'SD of logs', dec: 3 }) });
    const sTrend = sig.length > 4 ? ols(sig.map((_, j) => [1, j]), sig) : null;
    tableWrap(body, '<table><thead><tr><th>Estimate</th><th>Value</th></tr></thead><tbody>' +
      '<tr><th scope="row">β (slope on log initial income)</th><td class="num">' + nf(b, 3) + stars(pv) + '</td></tr><tr><th scope="row">Standard error; t; p</th><td class="num">' + nf(se, 3) + '; ' + nf(tt) + '; ' + fp(pv) + '</td></tr>' +
      '<tr><th scope="row">R²; economies; years</th><td class="num">' + nf(r2) + '; ' + pts.length + '; ' + T + '</td></tr>' +
      '<tr><th scope="row">Speed of convergence; half-life</th><td class="num">' + (lam != null && lam > 0 ? nf(lam * 100) + '% a year; ' + nf(hl, 0) + ' years' : 'no convergence (β ≥ 0)') + '</td></tr>' +
      '<tr><th scope="row">σ trend (change in spread a year)</th><td class="num">' + (sTrend ? nf(sTrend.beta[1], 4) + ' (' + (sTrend.beta[1] < 0 ? 'narrowing' : 'widening') + ')' : '–') + '</td></tr></tbody></table>',
      tcap('Convergence estimates for the selected economies'), 'β below 0 with p below 0.05 indicates catching up; σ falling over time indicates incomes are getting closer. Stars: *** p < 0.01, ** p < 0.05, * p < 0.1.');
  } else wxFew(body);
  const L = wxLatest(k, mem), by = {}; L.forEach(q => { const c = E[q.iso][3] || 'Other'; (by[c] = by[c] || []).push(q.v); });
  const gs = Object.values(by).filter(a => a.length >= 2), kw = gs.length >= 2 ? kwH(gs) : null;
  if (kw) { const Hh = kw.H != null ? kw.H : kw.h, pp = kw.p != null ? kw.p : chi2p(Hh, gs.length - 1);
    tableWrap(body, '<table><thead><tr><th>Test</th><th>Statistic</th><th>Degrees of freedom</th><th>p-value</th><th>Reading</th></tr></thead><tbody><tr><th scope="row">Kruskal–Wallis: ' + esc(indL(k)) + ' across continents</th><td class="num">' + nf(Hh) + '</td><td class="num">' + (gs.length - 1) + '</td><td class="num">' + fp(pp) + '</td><td>' + (pp < 0.05 ? 'Continents differ' : 'No clear difference') + '</td></tr></tbody></table>', tcap('Do continents differ within the selection?'), 'Uses continents with at least two selected economies and the latest value for each economy.'); }
}
function wxCache(k, iso) { const c = wxCache.m || (wxCache.m = {}), id = k + '|' + iso; return c[id] || (c[id] = new Map(wser(k, iso))); }
function wxCorr(body, mem, k) {
  const avail = Object.keys(RAW.s).filter(x => IND[x]);
  let vars = WX.vars.filter(v => avail.includes(v)); if (!vars.includes(k)) vars.unshift(k); vars = vars.slice(0, 10);
  const pick = document.createElement('details'); pick.className = 'wx-vars';
  pick.innerHTML = '<summary>Add or remove variables (' + vars.length + ' of up to 10)</summary><div>' + avail.map(v => '<label class="wx-chk"><input type="checkbox" value="' + v + '"' + (vars.includes(v) ? ' checked' : '') + '> ' + esc(indL(v)) + '</label>').join('') + '</div>';
  const meth = document.createElement('div'); meth.className = 'controls'; meth.innerHTML = '<label>Method <select><option value="pearson">Pearson (values)</option><option value="spearman">Spearman (ranks)</option></select></label>';
  body.append(pick, meth); meth.querySelector('select').value = WX.corr;
  pick.addEventListener('change', () => { WX.vars = [...pick.querySelectorAll('input:checked')].map(x => x.value).slice(0, 10); wxRender(WX.box); WX.box.querySelector('.wx-vars').open = true; });
  meth.addEventListener('change', e => { WX.corr = e.target.value; wxRender(WX.box); });
  const V = vars.map(v => new Map(wxLatest(v, mem, 8).map(q => [q.iso, q.v])));
  const rank = a => { const o = a.map((v, j) => [v, j]).sort((x, y) => x[0] - y[0]), r = Array(a.length); for (let j = 0; j < o.length;) { let e = j; while (e + 1 < o.length && o[e + 1][0] === o[j][0]) e++; for (let q = j; q <= e; q++) r[o[q][1]] = (j + e) / 2 + 1; j = e + 1; } return r; };
  const cor = (a, b) => { const ma = wxAvg(a), mb = wxAvg(b); let sab = 0, sa = 0, sb = 0; a.forEach((v, j) => { sab += (v - ma) * (b[j] - mb); sa += (v - ma) * (v - ma); sb += (b[j] - mb) * (b[j] - mb); }); return sa && sb ? sab / Math.sqrt(sa * sb) : null; };
  let h = '<table class="wx-cm"><thead><tr><th></th>' + vars.map((v, j) => '<th title="' + esc(indL(v)) + '">' + (j + 1) + '</th>').join('') + '</tr></thead><tbody>';
  vars.forEach((va, i) => {
    h += '<tr><th scope="row">' + (i + 1) + '. ' + esc(indL(va)) + '</th>';
    vars.forEach((vb, j) => {
      if (i === j) { h += '<td class="num">1</td>'; return; }
      const xs = [], ys = []; mem.forEach(x => { if (V[i].has(x) && V[j].has(x)) { xs.push(V[i].get(x)); ys.push(V[j].get(x)); } });
      if (xs.length < 5) { h += '<td class="num" title="fewer than 5 economies">–</td>'; return; }
      const rr = WX.corr === 'spearman' ? cor(rank(xs), rank(ys)) : cor(xs, ys);
      if (rr == null) { h += '<td class="num">–</td>'; return; }
      const tt = rr * Math.sqrt((xs.length - 2) / Math.max(1e-12, 1 - rr * rr)), pv = tp2(tt, xs.length - 2), al = 0.12 + 0.55 * Math.abs(rr);
      h += '<td class="num" style="background:' + (rr > 0 ? 'rgba(178,24,43,' : 'rgba(33,102,172,') + al.toFixed(2) + ')" title="n = ' + xs.length + ', p = ' + fp(pv) + '">' + nf(rr) + stars(pv) + '<small> n=' + xs.length + '</small></td>';
    });
    h += '</tr>';
  });
  tableWrap(body, h + '</tbody></table>', tcap('Correlation matrix (' + (WX.corr === 'spearman' ? 'Spearman' : 'Pearson') + ') across the selected economies'), 'Latest value for each economy within eight years of the most recent year; pairs need at least five economies. Red = move together, blue = move in opposite directions. Stars: *** p < 0.01, ** p < 0.05, * p < 0.1. Correlation is not causation.');
}
function wxAr1(y, H) {
  if (y.length < 8) return null;
  const r = ols(y.slice(0, -1).map(v => [1, v]), y.slice(1)), a = r.beta[0], b = r.beta[1], out = []; let v = y[y.length - 1];
  for (let h = 0; h < H; h++) { v = a + b * v; out.push(v); }
  return out;
}
function wxFc(y, mdl, H) {
  if (mdl === 'ar1') return wxAr1(y, H);
  if (mdl === 'holt') { const q = holtArr(y, H); return q.length ? q.map(z => z.f) : null; }
  if (mdl === 'trend') { const tr = trendOf(y.map((v, j) => [j, v])); return tr ? Array.from({ length: H }, (_, h) => tr.a + tr.b * (y.length + h)) : null; }
  return Array(H).fill(y[y.length - 1]);
}
function wxBack(y, mdl, k) { const e = []; for (let j = Math.max(8, y.length - k); j < y.length; j++) { const f = mdl === 'ens' ? (() => { const fs = WX.models.map(m2 => (wxFc(y.slice(0, j), m2, 1) || [null])[0]).filter(v => v != null && isFinite(v)); return fs.length ? wxAvg(fs) : null; })() : (wxFc(y.slice(0, j), mdl, 1) || [null])[0]; if (f != null && isFinite(f)) e.push(y[j] - f); }
  return e.length ? { rmse: Math.sqrt(e.reduce((a, v) => a + v * v, 0) / e.length), mae: e.reduce((a, v) => a + Math.abs(v), 0) / e.length, n: e.length } : null; }
function wxProj(body, mem, k) {
  const E = EMAPB(); if (!mem.includes(WX.econ)) WX.econ = mem.includes('BGD') ? 'BGD' : mem[0];
  const ctl = document.createElement('div'); ctl.className = 'controls';
  ctl.innerHTML = '<label>Economy <select data-p="econ">' + mem.map(x => '<option value="' + x + '">' + esc(E[x][1]) + '</option>').join('') + '</select></label>' + Object.entries(WX_MOD).map(([id, t]) => '<label class="wx-chk"><input type="checkbox" data-p="m" value="' + id + '"' + (WX.models.includes(id) ? ' checked' : '') + '> ' + t + '</label>').join('');
  body.append(ctl); ctl.querySelector('[data-p="econ"]').value = WX.econ;
  ctl.addEventListener('change', e => { if (e.target.getAttribute('data-p') === 'econ') WX.econ = e.target.value; else WX.models = [...ctl.querySelectorAll('[data-p="m"]:checked')].map(x => x.value); wxRender(WX.box); });
  const ser = wser(k, WX.econ).filter(q => q[1] != null && isFinite(+q[1])), H = 5;
  if (ser.length < 10) { body.insertAdjacentHTML('beforeend', '<p class="note">' + esc(E[WX.econ][1]) + ' has fewer than ten years of data for ' + esc(indL(k)) + '. Choose another economy or variable.</p>'); return; }
  if (!WX.models.length) { body.insertAdjacentHTML('beforeend', '<p class="note">Tick at least one model.</p>'); return; }
  const y = ser.slice(-35).map(q => +q[1]), yrs = ser.slice(-35).map(q => +q[0]), y1 = yrs[yrs.length - 1];
  const F = {}; WX.models.forEach(m2 => { const f = wxFc(y, m2, H); if (f) F[m2] = f; });
  const ms = Object.keys(F); if (ms.length > 1) F.ens = Array.from({ length: H }, (_, h) => wxAvg(ms.map(m2 => F[m2][h])));
  const show = Math.min(y.length, 25), labs = yrs.slice(-show).map(String).concat(Array.from({ length: H }, (_, h) => String(y1 + h + 1)));
  const lastV = y[y.length - 1], pad = Array(show - 1).fill(null);
  const series = [S('History', y.slice(-show).concat(Array(H).fill(null)), { w: 2 })].concat(Object.keys(F).map((m2, j) => S(m2 === 'ens' ? 'Ensemble (average)' : WX_MOD[m2], pad.concat([lastV]).concat(F[m2]), { w: m2 === 'ens' ? 3 : 1.6, dash: m2 !== 'ens', color: XPAL[j % XPAL.length] })));
  const g = grid(body);
  figure(g, { wide: true, prefix: labState.prefix || 'L', title: indL(k) + ', ' + E[WX.econ][1] + ': projections to ' + (y1 + H), sub: 'History and five-year projections from each chosen model' + (ms.length > 1 ? ', plus their equal-weight average' : ''), h: 330, source: 'World Bank, World Development Indicators; model estimates.', render: TH => tsOption(TH, labs, series, { y1: indU(k), dec: 2 }) });
  const rows = Object.keys(F).map(m2 => { const bt = wxBack(y, m2, 8); return '<tr><th scope="row">' + (m2 === 'ens' ? 'Ensemble (average)' : WX_MOD[m2]) + '</th><td class="num">' + nf(F[m2][0]) + '</td><td class="num">' + nf(F[m2][2]) + '</td><td class="num">' + nf(F[m2][4]) + '</td><td class="num">' + (bt ? nf(bt.rmse) : '–') + '</td><td class="num">' + (bt ? nf(bt.mae) : '–') + '</td></tr>'; }).join('');
  tableWrap(body, '<table><thead><tr><th>Model</th><th>' + (y1 + 1) + '</th><th>' + (y1 + 3) + '</th><th>' + (y1 + 5) + '</th><th>Back-test RMSE</th><th>Back-test MAE</th></tr></thead><tbody>' + rows + '</tbody></table>',
    tcap('Projections and accuracy: ' + indL(k) + ', ' + E[WX.econ][1]), 'Back-tests: one-year-ahead forecasts for each of the last eight years, made only with data available at the time; lower RMSE and MAE mean more accurate. Equations and references: Forecast lab, References tab, “Models explained”.');
}
function wxGuide(body) {
  body.insertAdjacentHTML('beforeend', '<div class="wx-guide">' +
    '<h3>How to use the explorer</h3><ol>' +
    '<li><b>Choose groups.</b> Tick one or more groups: blocs (G7, G20, BRICS, SAARC, ASEAN, EU, OECD, OPEC, OIC, Arab League, UN least developed countries), income groups, continents or sub-continents. The number in brackets is how many economies each contains.</li>' +
    '<li><b>Combine them.</b> Union keeps economies in any chosen group (for example SAARC ∪ ASEAN = South and South-East Asia). Intersection keeps only economies in every chosen group (for example OIC ∩ G20 = the large Muslim-majority economies).</li>' +
    '<li><b>Pick a variable.</b> The Map, Distribution, Table, Convergence and Projections tabs use it; the Correlations tab lets you add or remove up to ten variables.</li>' +
    '<li><b>Read the tabs.</b> Map: where values are high or low. Distribution: how values spread, with a box plot by continent and a normality test. Table: ranking, z-scores and five-year changes. Convergence and tests: whether poorer economies catch up (β), whether the spread is narrowing (σ), and whether continents differ (Kruskal–Wallis). Correlations: which variables move together. Projections: five-year outlooks from four simple models and their average, with back-tested accuracy.</li></ol>' +
    '<h3>Cautions</h3><ul><li>Latest values come from different years for different economies; the year is shown in the Table tab.</li><li>Income groups are approximate: they use GDP per person in current US dollars with the World Bank’s thresholds, not the official GNI-based classification.</li><li>Group lists follow membership as of 2025 (Timor-Leste joined ASEAN in 2025; Indonesia joined BRICS in 2025); check the official lists before citing.</li><li>Correlation is not causation, and simple projections ignore policy changes and shocks.</li></ul></div>');
}

/* (f) Country pages: a section left with an odd number of charts gets one combining its indicators. */
function countryFill(grid, code, specs) {
  try {
    if (!grid || !specs || !specs.length) return;
    if (specs.length === 1) { if (grid.firstElementChild) grid.firstElementChild.classList.add('wide1'); return; }
    if (specs.length % 2 === 0) return;
    const keys = [...new Set(specs.flatMap(sp => sp.k || []))].filter(k => RAW.s[k] && RAW.s[k][code] && IND[k]).slice(0, 8);
    if (keys.length < 2) { if (grid.lastElementChild) grid.lastElementChild.classList.add('wide1'); return; }
    const same = new Set(keys.map(k => indU(k))).size === 1;
    const card = document.createElement('article'); card.className = 'chart-card chart-fill';
    card.innerHTML = '<h3>All the indicators above in one chart</h3><div class="unit">' + esc(same ? indU(keys[0]) : 'standardised: (value − its average) ÷ its standard deviation') + '</div>';
    const box = document.createElement('div'); box.className = 'chart'; card.append(box);
    card.insertAdjacentHTML('beforeend', '<p class="note">' + esc(same ? 'Same units, plotted together for comparison. Follows the time-range buttons above.' : 'Different units, so each series is standardised to share one axis: 0 is its usual level, ±1 one standard deviation. Follows the time-range buttons above.') + '</p>');
    grid.append(card);
    chartOn(box, TH => {
      const ser = keys.map(k => new Map(wser(k, code)));
      let y0 = 9999, y1 = 0; ser.forEach(m => m.forEach((v, y) => { if (v != null) { y0 = Math.min(y0, +y); y1 = Math.max(y1, +y); } }));
      const n = String(cRange) === 'all' ? 999 : Number(cRange) || 25, start = Math.max(y0, y1 - n + 1), labels = [];
      for (let y = start; y <= y1; y++) labels.push(String(y));
      const out = keys.map((k, j) => {
        let v = labels.map(l => (ser[j].has(+l) ? ser[j].get(+l) : null));
        if (!same) { const xs = v.filter(x => x != null); if (xs.length > 1) { const mu = wxAvg(xs), sd = wxSd(xs) || 1; v = v.map(x => (x == null ? null : (x - mu) / sd)); } }
        return S(indL(k), v, { w: 2, color: XPAL[j % XPAL.length] });
      });
      return tsOption(TH, labels, out, { y1: same ? indU(keys[0]) : 'z-score', dec: 2 });
    });
  } catch (e) { console.warn('v38 cfill', e && e.stack ? e.stack.slice(0, 300) : e); }
}

/* ======================= v3.9 additions ======================= */
/* Census 2022 (BBS, preliminary report, enumerated population) by division; the final report adjusts the national total to 169,828,911. */
var BD_DIVPOP = { Dhaka: 44215107, Chattogram: 33202326, Rajshahi: 20353119, Khulna: 17416645, Rangpur: 17610956, Mymensingh: 12225498, Sylhet: 11034863, Barishal: 9100102 };
function bdDemog() {
  const tot = Object.values(BD_DIVPOP).reduce((a, b) => a + b, 0), pw = lastOfS('population', 'BGD'), pg = lastOfS('pop_growth', 'BGD');
  const top = Object.entries(BD_DIVPOP).sort((a, b) => b[1] - a[1])[0];
  const f = (lab, v, u) => '<div class="bdf"><span>' + lab + '</span><b>' + v + '</b>' + (u ? '<small>' + u + '</small>' : '') + '</div>';
  const pwv = pw ? (pw[1] > 1e5 ? pw[1] / 1e6 : pw[1]) : null;
  return '<div class="bdfacts bdfacts3">' + f('Population, census 2022', nf(tot / 1e6, 1) + ' m', 'enumerated; 169.8 m adjusted') + (pwv ? f('Population, World Bank', nf(pwv, 1) + ' m', String(pw[0])) : '') + (pg ? f('Population growth', nf(pg[1], 2) + '%', String(pg[0])) : '') +
    f('Density', nf(tot / 147570, 0) + ' per km²', 'census 2022, 147,570 km²') + f('Largest division', esc(top[0]), nf(top[1] / tot * 100, 1) + '% of people') + '</div>' +
    '<p class="src-line"><b>Sources:</b> BBS, Population and Housing Census 2022 (preliminary report, enumerated population; the final report adjusts the national total to 169.8 million); World Bank, World Development Indicators. Division areas and densities are measured from the map outlines, which total about 137,000 km² against the official 147,570 km², so the densities shown per division are slightly high.</p>';
}
/* Granger causality between headline inflation and related monthly variables. */
function grangerF(y, x, p) {
  const n = y.length; if (n < 3 * p + 24) return null;
  const Xu = [], Xr = [], Y = [];
  for (let t = p; t < n; t++) { const r0 = [1]; for (let j = 1; j <= p; j++) r0.push(y[t - j]); const r1 = r0.slice(); for (let j = 1; j <= p; j++) r1.push(x[t - j]); Xr.push(r0); Xu.push(r1); Y.push(y[t]); }
  const u = ols(Xu, Y), r = ols(Xr, Y), df = Y.length - (2 * p + 1); if (!u || !r || df < 12 || !(u.sse > 0)) return null;
  const F = ((r.sse - u.sse) / p) / (u.sse / df); return { F, p: chi2p(p * F, p), n: Y.length };
}
function pairM(ka, kb, maxN) {
  const A = PK(ka), B = PK(kb); if (!A || !B || A.f !== 'M' || B.f !== 'M') return null;
  const k0 = Math.max(A.k0, B.k0), k1 = Math.min(A.k0 + A.v.length, B.k0 + B.v.length) - 1, ys = [], xs = [];
  for (let k = k1; k >= k0; k--) { const a = A.v[k - A.k0], b = B.v[k - B.k0]; if (a == null || b == null) { if (ys.length) break; continue; } ys.unshift(a); xs.unshift(b); if (ys.length >= (maxN || 144)) break; }
  return ys.length >= 36 ? { y: ys, x: xs } : null;
}
var GR_KEYS = ['call', 'lend', 'real_lend', 'm2', 'rm', 'pcredit', 'xr', 'xr_dep', 'remit_g', 'exp_g', 'imp_g', 'res', 'food', 'nonfood'];
function explGranger(host) {
  try {
    const rows = GR_KEYS.filter(k => SER(k) && PK(k) && PK(k).f === 'M').map(k => { const d = pairM('infl', k); if (!d) return null; const a3 = grangerF(d.y, d.x, 3), a6 = grangerF(d.y, d.x, 6), b3 = grangerF(d.x, d.y, 3); return a3 ? { k, n: d.y.length, a3, a6, b3 } : null; }).filter(Boolean);
    if (!rows.length) return;
    const nm = k => SER(k).label + (SER(k).sub ? ' (' + SER(k).sub + ')' : ''), ev = p => (p < 0.01 ? 'Strong evidence' : p < 0.05 ? 'Evidence' : p < 0.1 ? 'Weak evidence' : 'No evidence');
    tableWrap(host, '<table><thead><tr><th>Variable</th><th class="num">Months</th><th class="num">F, 3 lags</th><th class="num">p</th><th class="num">F, 6 lags</th><th class="num">p</th><th>Does it help predict inflation?</th><th class="num">Reverse: inflation → variable, p (3 lags)</th></tr></thead><tbody>' +
      rows.map(r => '<tr><th scope="row">' + esc(nm(r.k)) + '</th><td class="num">' + r.n + '</td><td class="num">' + nf(r.a3.F, 2) + stars(r.a3.p) + '</td><td class="num">' + fp(r.a3.p) + '</td><td class="num">' + (r.a6 ? nf(r.a6.F, 2) + stars(r.a6.p) : '–') + '</td><td class="num">' + (r.a6 ? fp(r.a6.p) : '–') + '</td><td>' + ev(Math.min(r.a3.p, r.a6 ? r.a6.p : 1)) + '</td><td class="num">' + (r.b3 ? fp(r.b3.p) : '–') + '</td></tr>').join('') + '</tbody></table>',
      tcap('Granger causality: which related variables help predict headline inflation?'), 'Each test compares a regression of inflation on its own last 3 (or 6) months with one that also includes the variable’s last 3 (or 6) months; a small p means the variable adds predictive information. Uses the longest recent run of months in which both series exist, up to 12 years; p-values use the large-sample χ² approximation. Predictive, not proof of cause. Equations: Forecast lab, References tab, “Models explained”.');
  } catch (e) { console.warn('v39 granger', e && e.stack ? e.stack.slice(0, 300) : e); }
}
/* Fill empty space inside cards with figures that belong there. */
function sfBottom(c) {
  const r = c.getBoundingClientRect(); if (!r.height) return 0; let b = r.top;
  c.querySelectorAll('*').forEach(x => { if (x.children.length && x.tagName !== 'svg') return; if (x.tagName !== 'svg' && x.closest('svg')) return; const q = x.getBoundingClientRect(); if (q.height) b = Math.max(b, q.bottom); });
  return r.bottom - (parseFloat(getComputedStyle(c).paddingBottom) || 0) - b;
}
function sfRows(keys) {
  return keys.filter(k => SER(k) && PK(k)).map(k => {
    const p = PK(k), v = p.v; let i = v.length - 1; while (i >= 0 && v[i] == null) i--; if (i < 0) return null;
    const lag = p.f === 'M' ? 12 : p.f === 'Q' ? 4 : 1, y = v.slice(0, i + 1).filter(x => x != null), b = band312(y), m = SER(k);
    return { lab: m.label + (m.sub ? ' (' + m.sub + ')' : ''), unit: m.unit || '', v: v[i], per: bdLab(p.f, p.k0 + i), ch: i - lag >= 0 && v[i - lag] != null ? v[i] - v[i - lag] : null, pos: !b ? '–' : b.out ? (v[i] > Math.max(b.a3, b.a12) ? 'above recent averages' : 'below recent averages') : 'within recent averages' };
  }).filter(Boolean);
}
function sfLive(host, free) {
  const all = sfRows(['infl', 'food', 'nonfood', 'call', 'lend', 'real_lend', 'm2', 'pcredit', 'res', 'xr', 'remit_g', 'exp_g', 'imp_g', 'npl']);
  const n = Math.min(all.length, Math.floor((free - 96) / 29)); if (n < 3) return;
  const d = document.createElement('div'); d.className = 'sf-box sf-live';
  d.innerHTML = '<p class="sf-h">Bangladesh at a glance: latest readings</p><div class="tbl-scroll"><table class="sf-t"><thead><tr><th>Indicator</th><th class="num">Latest</th><th>Period</th><th class="num">Change on a year earlier</th><th>Signal</th></tr></thead><tbody>' +
    all.slice(0, n).map(r => '<tr><th scope="row">' + esc(r.lab) + ' <small>' + esc(r.unit) + '</small></th><td class="num">' + nf(r.v) + '</td><td>' + esc(r.per) + '</td><td class="num">' + (r.ch == null ? '–' : (r.ch > 0 ? '+' : '') + nf(r.ch)) + '</td><td>' + esc(r.pos) + '</td></tr>').join('') +
    '</tbody></table></div><p class="src-line"><b>Source:</b> Bangladesh Bank, Monthly Economic Trends; BBS. Signal compares the latest value with the averages of the last 3 and 12 observations.</p>';
  host.append(d); if (sfBottom(host) < 0) d.remove();
}
function sfFig(c, free) {
  const node = c.querySelector('.chart'), inst = node && window.echarts ? echarts.getInstanceByDom(node) : null; if (!inst) return;
  const o = inst.getOption(), xa = (o.xAxis || [])[0] || {}, ya = (o.yAxis || [])[0] || {};
  const ser = (o.series || []).filter(s => s && (s.type === 'line' || s.type === 'bar') && !/projection|range|band|added|lower|upper/i.test(s.name || ''));
  if (!ser.length) return;
  const val = d => { const v = Array.isArray(d) ? d[1] : d && typeof d === 'object' ? d.value : d; return v == null || v === '' || !isFinite(+v) ? null : +v; };
  let rows = [], head = 'Key figures from the chart above';
  if (xa.type === 'category' && Array.isArray(xa.data)) {
    rows = ser.slice(0, 8).map(s => { const vs = (s.data || []).map(val), idx = vs.map((v, i) => (v == null ? -1 : i)).filter(i => i >= 0); if (!idx.length) return null; const li = idx[idx.length - 1], xs = idx.map(i => vs[i]), lab = xa.data[li];
      return '<tr><th scope="row">' + esc(s.name || '') + '</th><td class="num">' + nf(vs[li]) + '</td><td>' + esc(String(lab && lab.value != null ? lab.value : lab)) + '</td><td class="num">' + nf(Math.min(...xs)) + '</td><td class="num">' + nf(Math.max(...xs)) + '</td><td class="num">' + nf(xs.reduce((a, b) => a + b, 0) / xs.length) + '</td></tr>'; }).filter(Boolean);
    if (!rows.length) return;
    rows.unshift('<tr><th>Series</th><th class="num">Latest</th><th>Period</th><th class="num">Lowest</th><th class="num">Highest</th><th class="num">Average</th></tr>');
  } else if (ya.type === 'category' && Array.isArray(ya.data)) {
    const vs = (ser[0].data || []).map(val), items = ya.data.map((c2, i) => [String(c2 && c2.value != null ? c2.value : c2), vs[i]]).filter(q => q[1] != null).sort((a, b) => b[1] - a[1]);
    if (items.length < 3) return; const med = items[Math.floor(items.length / 2)][1]; head = 'Ranking of the bars above';
    rows = ['<tr><th>Item</th><th class="num">Value</th><th class="num">Against the middle value</th></tr>'].concat(items.map(q => '<tr><th scope="row">' + esc(q[0]) + '</th><td class="num">' + nf(q[1]) + '</td><td class="num">' + (q[1] - med > 0 ? '+' : '') + nf(q[1] - med) + '</td></tr>'));
  } else return;
  const n = Math.min(rows.length, Math.floor((free - 70) / 27)); if (n < 2) return;
  const d = document.createElement('div'); d.className = 'sf-box';
  d.innerHTML = '<p class="sf-h">' + head + '</p><div class="tbl-scroll"><table class="sf-t"><tbody>' + rows.slice(0, n).join('') + '</tbody></table></div><p class="src-line"><b>Source:</b> as for the chart above.</p>';
  c.append(d); if (sfBottom(c) < 0) d.remove();
}
function sfSpark(host, free) {
  const pri = ['infl', 'food', 'call', 'lend', 'm2', 'pcredit', 'res', 'xr', 'remit_g', 'exp_g', 'imp_g', 'nonfood', 'real_lend', 'npl', 'rm', 'mcap'], ks = [...new Set(pri.concat(Object.keys((BD && BD.series) || {})))].filter(k => SER(k) && PK(k) && PK(k).v.filter(x => x != null).length >= 6), W = host.getBoundingClientRect().width || 600, per = Math.max(2, Math.min(4, Math.floor(W / 210))), rows = Math.floor((free - 60) / 112);
  if (rows < 1) return; const use = ks.slice(0, rows * per); if (use.length < per) return;
  const pal = ['#2B6CB0', '#C05621', '#2F855A', '#6B46C1', '#B83280', '#2C7A7B'];
  const cell = (k, j) => { const p = PK(k), m = SER(k), n = p.f === 'M' ? 36 : p.f === 'Q' ? 12 : 10, v = []; for (let i = p.v.length - 1; i >= 0 && v.length < n; i--) if (p.v[i] != null) v.unshift([i, p.v[i]]); if (v.length < 3) return '';
    const lo = Math.min(...v.map(q => q[1])), hi = Math.max(...v.map(q => q[1])), sp = hi - lo || 1, X = i => 4 + (i / (v.length - 1)) * 192, Y = x => 54 - ((x - lo) / sp) * 46, c = pal[j % pal.length], L = v[v.length - 1];
    return '<div class="spk"><b>' + esc(m.label + (m.sub ? ' (' + m.sub + ')' : '')) + '</b><svg viewBox="0 0 200 60" role="img" aria-label="' + esc(m.label) + ', last ' + v.length + ' observations"><polyline fill="none" stroke="' + c + '" stroke-width="2" points="' + v.map((q, i) => X(i).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join(' ') + '"/><circle cx="' + X(v.length - 1).toFixed(1) + '" cy="' + Y(L[1]).toFixed(1) + '" r="3" fill="' + c + '"/></svg><small>' + nf(L[1]) + ' ' + esc(m.unit || '') + ' · ' + esc(bdLab(p.f, p.k0 + L[0])) + ' · range ' + nf(lo) + ' to ' + nf(hi) + '</small></div>'; };
  const d = document.createElement('div'); d.className = 'sf-box sf-spark';
  d.innerHTML = '<p class="sf-h">Trends over the last three years</p><div class="spk-grid" style="grid-template-columns:repeat(' + per + ',minmax(0,1fr))">' + use.map(cell).join('') + '</div><p class="src-line"><b>Source:</b> Bangladesh Bank, Monthly Economic Trends; BBS. Last 36 months, 12 quarters or 10 years; dot = latest value.</p>';
  host.append(d); if (sfBottom(host) < 0) { d.remove(); return; }
  let R = rows; const grid0 = d.querySelector('.spk-grid'), rowH = grid0.getBoundingClientRect().height / Math.ceil(use.length / per) || 90;
  for (let it = 0; it < 6; it++) { const fr = sfBottom(host); if (fr < rowH + 20 || ks.length <= R * per) break; R++; grid0.innerHTML = ks.slice(0, R * per).map(cell).join(''); if (sfBottom(host) < 12) { R--; grid0.innerHTML = ks.slice(0, R * per).map(cell).join(''); break; } }
}
function spaceFill(reset) {
  const V = document.querySelector('.view.on'); if (!V) return;
  if (reset) V.querySelectorAll('.sf-box').forEach(x => x.remove());
  const ls0 = V.querySelector('#live-spot'), ls = ls0 ? ([...ls0.children].filter(x => x.offsetParent && x.getBoundingClientRect().height > 200).sort((x, y) => y.getBoundingClientRect().height - x.getBoundingClientRect().height)[0] || ls0) : null;
  if (ls && !ls0.querySelector('.sf-live')) { const fr = sfBottom(ls); if (fr > 190) sfLive(ls, fr); }
  if (ls && ls0.querySelector('.sf-live') && !ls0.querySelector('.sf-spark')) { const fr2 = sfBottom(ls); if (fr2 > 170) sfSpark(ls, fr2); }
  V.querySelectorAll('figure.fig, .chart-card').forEach(c => { if (c.querySelector('.sf-box') || c.closest('#live-spot')) return; const fr = sfBottom(c); if (fr > 130) sfFig(c, fr); });
}
(function sfInit() {
  let t = null; const go = (reset, ms) => { clearTimeout(t); t = setTimeout(() => { try { spaceFill(reset); } catch (e) { console.warn('v39 fill', e); } }, ms); };
  window.addEventListener('hashchange', () => go(false, 2600)); window.addEventListener('load', () => go(false, 3200)); window.addEventListener('resize', () => go(true, 900));
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.view button, .view [role=tab]')) go(false, 1500); }, true);
  const watch = () => { const ls = document.getElementById('live-spot'); if (ls) new MutationObserver(m => { if (m.some(r => [].some.call(r.addedNodes, x => x.nodeType === 1 && !x.classList.contains('sf-box')))) go(false, 700); }).observe(ls, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  setTimeout(() => go(false, 0), 4000);
})();
/* Deeper sector outlooks: distribution, model accuracy, equations, estimates, links with inflation, scenarios and risks. */
var SRISK = {
  prices: ['A weaker Taka raises import prices with a lag of a few months.', 'Floods or a poor harvest push up rice and vegetable prices.', 'Government changes to fuel, electricity and gas prices.'],
  real: ['Weak private investment and energy shortages limit growth.', 'Slower demand for garments in Europe and the United States.', 'Political uncertainty delays projects and investment.'],
  money: ['Rising non-performing loans limit banks’ ability to lend.', 'Tight liquidity in weaker banks.', 'Government borrowing crowding out private credit.'],
  rates: ['Further policy tightening if inflation stays high.', 'Loosening before inflation is under control.', 'Stress in weaker banks lifting deposit rates.'],
  ext: ['Lower remittances if Gulf economies slow.', 'Export competition and the loss of LDC trade preferences after graduation.', 'Import demand rebounding faster than exports.'],
  fiscal: ['Revenue shortfalls against budget targets.', 'Rising interest payments on domestic debt.', 'Subsidy costs if world energy prices rise.'],
  cap: ['Low investor confidence and governance concerns.', 'Regulatory changes such as price floors.', 'Few new large listings.']
};
function outlookMore(s, rows, c) {
  try {
    const ms = [['holt', 'Holt'], ['ar1', 'AR(1)'], ['trend', 'Linear trend'], ['naive', 'No change']], nm = r => r.m.label + (r.m.sub ? ' (' + r.m.sub + ')' : '');
    const acc = rows.map(r => { const y = r.p.v.slice(0, r.li + 1).filter(v => v != null).slice(-120), k = r.p.f === 'M' ? 12 : r.p.f === 'Q' ? 6 : 5, o = {}; ms.forEach(([id]) => { o[id] = wxBack(y, id, k); }); return { r, y, o, hb: y.length >= 8 ? holtBest(y) : null }; });
    const r0 = rows[0], g = grid(s), y0 = acc[0].y, per = r0.p.f === 'M' ? 120 : r0.p.f === 'Q' ? 40 : 25, shown = acc.slice(0, 5);
    figure(g, { ts: false, title: 'Distribution: ' + nm(r0), sub: 'How often each range of values occurred over the last ' + Math.min(per, y0.length) + ' observations; red = the range holding the latest value', h: 300, source: 'Bangladesh Bank, BBS.', render: TH => fillHist(TH, { name: nm(r0), vals: y0.slice(-per) }) });
    figure(g, { ts: false, title: 'How accurate is each model?', sub: 'Root mean squared error of one-step-ahead forecasts made with past data only; lower is better', h: 300, source: 'Model estimates.', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true },
      xAxis: { type: 'category', data: shown.map(a => nm(a.r).slice(0, 26)), axisLabel: { color: TH.muted, fontSize: 10, interval: 0, rotate: shown.length > 3 ? 20 : 0 } }, yAxis: valAxis(TH, 'RMSE'),
      series: ms.map(([id, t], j) => ({ name: t, type: 'bar', data: shown.map(a => (a.o[id] ? +a.o[id].rmse.toFixed(3) : null)), itemStyle: { color: XPAL[j] }, label: { show: true, position: 'top', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } })) }) });
    const md = mdDocs().find(d => /^Holt/.test(d.name)), eqb = document.createElement('div'); eqb.className = 'ol-eq';
    eqb.innerHTML = '<h3>The projection model</h3><p>Holt’s linear exponential smoothing keeps a level and a trend and updates both as new data arrive. These equations generate the projections and their 80% range; the symbols are explained in the Forecast lab, References tab, “Models explained”.</p>' + (md ? md.eqs.join('') : '');
    s.append(eqb);
    tableWrap(s, '<table><thead><tr><th>Series</th><th class="num">α (level weight)</th><th class="num">β (trend weight)</th><th class="num">Level now</th><th class="num">Trend per period</th>' + ms.map(([, t]) => '<th class="num">RMSE: ' + t + '</th>').join('') + '<th>Most accurate</th></tr></thead><tbody>' +
      acc.map(a => { const best = ms.filter(([id]) => a.o[id]).sort((p, q) => a.o[p[0]].rmse - a.o[q[0]].rmse)[0]; return '<tr><th scope="row">' + esc(nm(a.r)) + '</th><td class="num">' + (a.hb ? nf(a.hb.a, 2) : '–') + '</td><td class="num">' + (a.hb ? nf(a.hb.b, 2) : '–') + '</td><td class="num">' + (a.hb ? nf(a.hb.l) : '–') + '</td><td class="num">' + (a.hb ? nf(a.hb.t, 3) : '–') + '</td>' + ms.map(([id]) => '<td class="num">' + (a.o[id] ? nf(a.o[id].rmse) : '–') + '</td>').join('') + '<td>' + (best ? best[1] : '–') + '</td></tr>'; }).join('') + '</tbody></table>',
      tcap('Model estimates and forecast accuracy: ' + c.name.toLowerCase()), 'α and β are chosen to minimise one-step errors; a high α means recent data dominate. RMSE: back-tests over the last 12 months, 6 quarters or 5 years, each forecast made only with data available at the time.');
    if (c.id !== 'prices') {
      const ar = rows.filter(r => r.p.f === 'M' && r.k !== 'infl').map(r => { const d = pairM('infl', r.k); if (!d) return null; let best = null;
        for (let L = 0; L <= 12; L++) { const xs = d.x.slice(0, d.x.length - L), ys = d.y.slice(L); if (xs.length < 24) break; const mx = wxAvg(xs), my = wxAvg(ys); let sxy = 0, sxx = 0, syy = 0; xs.forEach((v, i) => { sxy += (v - mx) * (ys[i] - my); sxx += (v - mx) * (v - mx); syy += (ys[i] - my) * (ys[i] - my); }); const rr = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0; if (!best || Math.abs(rr) > Math.abs(best.r)) best = { L, r: rr }; }
        return best ? { r, n: d.y.length, best, gq: grangerF(d.y, d.x, 3) } : null; }).filter(Boolean);
      if (ar.length) tableWrap(s, '<table><thead><tr><th>Series</th><th class="num">Months</th><th class="num">Strongest correlation with inflation</th><th class="num">At a lead of</th><th class="num">Granger p (3 lags)</th><th>Reading</th></tr></thead><tbody>' + ar.map(a => '<tr><th scope="row">' + esc(nm(a.r)) + '</th><td class="num">' + a.n + '</td><td class="num">' + nf(a.best.r, 2) + '</td><td class="num">' + a.best.L + ' months</td><td class="num">' + (a.gq ? fp(a.gq.p) + stars(a.gq.p) : '–') + '</td><td>' + (a.gq && a.gq.p < 0.05 ? 'Helps predict inflation' : 'No clear predictive link') + '</td></tr>').join('') + '</tbody></table>',
        tcap('Links with headline inflation: ' + c.name.toLowerCase()), 'Correlation of the series with inflation that many months later (lead 0 = same month). A Granger p below 0.05 means the series’ past improves forecasts of inflation. Association, not proof of cause.');
    }
    const rk = document.createElement('div'); rk.className = 'card ol-risk';
    rk.innerHTML = '<h3>Scenarios and risks</h3><ul class="ol-list"><li>Upside scenario: the upper end of each 80% range in the outlook table; downside scenario: the lower end. Outcomes outside the range are expected about 2 times in 10.</li>' + (SRISK[c.id] || []).map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
    s.append(rk);
  } catch (e) { console.warn('v39 outlook', e && e.stack ? e.stack.slice(0, 300) : e); }
}

/* ======================= v3.11: Model library ======================= */
var ML_GROUPS = [
  ['Structural and policy simulation', [['dsge', 'DSGE (New Keynesian)'], ['cge', 'CGE (1-2-3 model)'], ['keynes', 'Structural macroeconometric (Keynesian)'], ['mtm', 'Monetary transmission mechanism']]],
  ['Time series and data-driven', [['var', 'VAR and SVAR'], ['vecm', 'VECM'], ['dfm', 'Dynamic factor model and FAVAR'], ['sarimax', 'ARIMA and SARIMAX']]],
  ['Theoretical foundations', [['islm', 'IS-LM-BP (Mundell–Fleming)'], ['adas', 'AD-AS'], ['solow', 'Solow–Swan growth'], ['rck', 'Ramsey–Cass–Koopmans']]]
];
var ML_STATE = { m: 'keynes' };
var ML_CMP = [
  ['DSGE', 'Structural', 'Policy simulation and shock analysis', 'Micro-founded; resists the Lucas critique', 'Complex; results depend on assumed structure', 'dsge'],
  ['CGE', 'Structural', 'Trade, tax and price policy', 'Detailed sector and price effects', 'Static; calibrated rather than estimated', 'cge'],
  ['Keynesian macroeconometric', 'Structural', 'Multipliers and policy scenarios', 'Transparent equations estimated on data', 'Equations can break when policy changes', 'keynes'],
  ['Monetary transmission (VAR evidence)', 'Applied', 'How policy-rate changes reach credit, the Taka and inflation', 'Tests every link on Bangladesh data', 'Identification by ordering; administered rates', 'mtm'],
  ['VAR / SVAR', 'Time series', 'Forecasting and shock transmission', 'Few assumptions; captures feedback', 'Many parameters; identification by ordering', 'var'],
  ['VECM', 'Time series', 'Long-run equilibrium plus short-run dynamics', 'Uses information in levels', 'Needs cointegration; sensitive to lag choice', 'vecm'],
  ['DFM / FAVAR', 'Time series', 'Nowcasting and large data sets', 'Summarises many series in a few factors', 'Factors are hard to interpret', 'dfm'],
  ['ARIMA / SARIMAX', 'Time series', 'Single-series forecasting with drivers', 'Strong short-run benchmark', 'Little economic structure', 'sarimax'],
  ['IS-LM-BP', 'Theory', 'Policy under fixed and floating exchange rates', 'Clear open-economy intuition', 'Static; prices fixed', 'islm'],
  ['AD-AS', 'Theory', 'Output and inflation after shocks', 'Links demand, supply and policy', 'Simplified expectations', 'adas'],
  ['Solow–Swan', 'Theory', 'Long-run growth and convergence', 'Simple; matches broad facts', 'Saving rate and technology are given', 'solow'],
  ['Ramsey–Cass–Koopmans', 'Theory', 'Optimal saving and growth', 'Saving chosen by households', 'Representative agent; perfect foresight', 'rck']
];
function mlHat(a) { return '<mover accent="true">' + a + '<mo>^</mo></mover>'; }
function mlSum(lo, hi) { return hi ? '<munderover><mo>∑</mo>' + lo + hi + '</munderover>' : '<munder><mo>∑</mo>' + lo + '</munder>'; }
function mlBoxes(host, m, ad, li, fu) {
  const d = document.createElement('div'); d.className = 'ol-grid';
  d.innerHTML = [['Merits', m], ['Assumptions', ad], ['Limitations', li], ['Future development', fu]].map(([h, t]) => '<div><h3>' + h + '</h3><p>' + esc(t) + '</p></div>').join('');
  host.append(d);
}
function mlRefs(host, refs) {
  const d = document.createElement('div');
  d.innerHTML = '<h3>References</h3><ol class="md-refs">' + refs.map(([t, u]) => '<li>' + esc(t) + (u ? ' <a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>' : '') + '</li>').join('') + '</ol>';
  host.append(d);
}
function mlSyms(host, rows) {
  const d = document.createElement('div');
  d.innerHTML = '<h3>Symbols</h3><dl class="md-vars">' + rows.map(([s, t]) => '<dt><math>' + s + '</math></dt><dd>' + esc(t) + '</dd>').join('') + '</dl>';
  host.append(d);
}
function mlText(host, h, html) { const d = document.createElement('div'); d.className = 'ml-txt'; d.innerHTML = (h ? '<h3>' + esc(h) + '</h3>' : '') + html; host.append(d); }
function mlCoef(host, rows, cap, note) {
  tableWrap(host, '<table><thead><tr><th>Term</th><th class="num">Estimate</th><th class="num">Std. error</th><th class="num">p-value</th></tr></thead><tbody>' +
    rows.map(x => '<tr><th scope="row">' + esc(x.term) + '</th><td class="num">' + nf(x.coef, 4) + stars(x.p) + '</td><td class="num">' + (x.se == null ? '–' : nf(x.se, 4)) + '</td><td class="num">' + fp(x.p) + '</td></tr>').join('') + '</tbody></table>', tcap(cap), note);
}
function labModels(body) {
  const s = sec(body, 'Model library', 'Twelve families of macroeconomic models, each applied to Bangladesh with the same depth as the DSGE tab: what the model is, its equations, the data and method, results, scenarios, how to read them, merits, limitations and references.', 'models');
  tableWrap(s, '<table><thead><tr><th>Model</th><th>Family</th><th>Core objective</th><th>Strengths</th><th>Major limitation</th><th>On this site</th></tr></thead><tbody>' +
    ML_CMP.map(r => { const ready = true; return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td><td>' + (ready ? '<button type="button" class="ml-go" data-m="' + r[5] + '">Open</button>' : 'Next update') + '</td></tr>'; }).join('') + '</tbody></table>',
    tcap('Comparative overview of core model families'), 'Structural models start from economic theory; time-series models start from the data; theoretical models explain mechanisms. Central banks use several together: theory to frame, data to discipline, simulation to explore policy.');
  const nav = document.createElement('div'); nav.className = 'ml-nav';
  nav.innerHTML = ML_GROUPS.map(([g, items]) => '<div class="ml-grp"><span>' + esc(g) + '</span>' + items.map(([id, t]) => '<button type="button" data-m="' + id + '" aria-pressed="' + (ML_STATE.m === id) + '">' + esc(t) + '</button>').join('') + '</div>').join('');
  s.append(nav);
  const host = document.createElement('div'); host.className = 'ml-body'; s.append(host);
  const go = id => { ML_STATE.m = id; nav.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-m') === id ? 'true' : 'false')); try { disposeIn(host); } catch (e) { /* none */ } host.innerHTML = ''; mlRender(host, id); };
  nav.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) go(b.getAttribute('data-m')); });
  s.addEventListener('click', e => { const b = e.target.closest('.ml-go'); if (b) { go(b.getAttribute('data-m')); nav.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); } });
  go(ML_STATE.m);
}
function mlRender(host, id) {
  const M = (BD && BD.models2) || {};
  try {
    if (id === 'dsge' || id === 'var') { mlLink(host, id); fc5Five(host, id); return; }
    if (id === 'sarimax') { mlSarimax(host, M.sarimax); mlChecks(host, 'sarimax', M); fc5Five(host, 'sarimax'); return; }
    if (id === 'mtm') { if (M.mtm) mlMtm(host, M.mtm); else host.innerHTML = '<p class="note">The transmission results are not in the current data build.</p>'; return; }
    if ({ islm: 1, adas: 1, solow: 1, rck: 1 }[id]) { if (!M.theory) { host.innerHTML = '<p class="note">The calibration for this model is not in the current data build.</p>'; return; } ({ islm: mlIslm, adas: mlAdas, solow: mlSolow, rck: mlRck })[id](host, M.theory); return; }
    if ({ cge: 1, keynes: 1, vecm: 1, dfm: 1 }[id]) {
      if (!M[id]) { host.innerHTML = '<p class="note">This model\u2019s results are not in the current data build. They are produced by scripts/models_build.py during the site build.</p>'; return; }
      ({ cge: mlCge, keynes: mlKeynes, vecm: mlVecm, dfm: mlDfm })[id](host, M[id]); mlChecks(host, id, M); fc5Five(host, id); return;
    }
  } catch (e) { console.warn('v311 model', id, e && e.stack ? e.stack.slice(0, 300) : e); host.innerHTML = '<p class="note">This model could not be drawn.</p>'; }
}
function mlLink(host, id) {
  const tx = id === 'dsge'
    ? ['New Keynesian DSGE model', 'A small micro-founded model of demand, price setting and the policy rule, estimated for Bangladesh by Bayesian methods, with shock scenarios, derivation, prior and posterior plots and MCMC diagnostics.', 'dsge']
    : ['VAR and structural VAR', 'A vector autoregression of inflation, money, the call rate and the exchange rate, with Granger causality, impulse responses identified by a Cholesky ordering, and variance decompositions.', 'var'];
  const d = document.createElement('div'); d.className = 'card';
  d.innerHTML = '<h3>' + esc(tx[0]) + '</h3><p>' + esc(tx[1]) + '</p><p><a class="btn" href="#lab~' + tx[2] + '">Open the ' + (id === 'dsge' ? 'DSGE' : 'SVAR') + ' tab</a></p>';
  host.append(d);
}
/* ---------- Keynesian structural model ---------- */
function mlKeynes(host, K) {
  const { i, n, o, sub, fr, r } = MX, t = i('t'), tm = sub(i('C'), r(t, o('−'), n('1')));
  const s = sec(host, 'Structural macroeconometric model (Keynesian)', 'A small system of behavioural equations and the national-accounts identity, estimated on ' + K.n + ' fiscal years (' + K.sample.join('–') + ').', 'ml-keynes');
  mlText(s, 'What it is', '<p>The traditional Keynesian macroeconometric model, used by central banks and finance ministries since Klein and Goldberger (1955), describes how spending components respond to income and interest rates and adds them up in the national-accounts identity. Solving the system gives <b>multipliers</b>: how much GDP changes when government spending, exports or interest rates change.</p><p><b>Why it matters for Bangladesh:</b> budget decisions, export shocks and interest-rate changes all work through these channels; the model puts numbers on them using Bangladesh\u2019s own history.</p>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('C'), t), o('='), sub(i('a'), n('0')), o('+'), sub(i('a'), n('1')), sub(i('Y'), t), o('+'), sub(i('a'), n('2')), tm, o('+'), sub(i('ε'), r(n('1'), t))), '(1) Consumption, estimated by two-stage least squares'),
    EQN(r(sub(i('I'), t), o('='), sub(i('b'), n('0')), o('+'), sub(i('b'), n('1')), o('Δ'), sub(i('Y'), r(t, o('−'), n('1'))), o('+'), sub(i('b'), n('2')), sub(i('r'), t), o('+'), sub(i('b'), n('3')), sub(i('I'), r(t, o('−'), n('1'))), o('+'), sub(i('ε'), r(n('2'), t))), '(2) Investment: accelerator and interest rate'),
    EQN(r(sub(i('M'), t), o('='), sub(i('m'), n('0')), o('+'), sub(i('m'), n('1')), sub(i('Y'), t), o('+'), sub(i('m'), n('2')), sub(i('M'), r(t, o('−'), n('1'))), o('+'), sub(i('ε'), r(n('3'), t))), '(3) Imports'),
    EQN(r(sub(i('Y'), t), o('='), sub(i('C'), t), o('+'), sub(i('I'), t), o('+'), sub(i('X'), t), o('−'), sub(i('M'), t), o('+'), sub(i('G'), t), o('+'), sub(i('D'), t)), '(4) National-accounts identity'),
    EQN(r(fr(r(o('∂'), sub(i('Y'), t)), r(o('∂'), sub(i('G'), t))), o('='), fr(n('1'), r(n('1'), o('−'), sub(i('a'), n('1')), o('+'), sub(i('m'), n('1'))))), '(5) Impact multiplier')].join(''));
  mlSyms(s, [[i('Y'), 'real GDP (index, first fiscal year = 100)'], [i('C'), 'total consumption, private and public'], [i('I'), 'investment'], [i('X') + o(',') + i('M'), 'exports and imports'], [i('G'), 'additional government spending (the policy shock)'], [i('D'), 'statistical discrepancy, treated as given'], [i('r'), 'real interest rate'], [sub(i('a'), n('1')), 'short-run marginal propensity to consume'], [sub(i('m'), n('1')), 'marginal propensity to import'], [sub(i('b'), n('1')), 'accelerator: investment response to last year\u2019s growth']]);
  mlText(s, 'Data and method', '<p>Real GDP growth and the consumption and investment shares come from the Bangladesh national accounts (fiscal years); export and import shares and the real interest rate from the World Bank (calendar year before each fiscal year ends). Components are converted to real terms with the GDP index. Consumption is estimated by two-stage least squares, using exports and last year\u2019s values as instruments, because income is itself determined by consumption. Investment and imports use least squares with Newey–West standard errors.</p>');
  mlCoef(s, K.cons.rows, 'Equation 1: consumption (2SLS)', 'Short-run MPC ' + nf(K.mpc, 3) + '; long-run MPC ' + nf(K.mpc / (1 - (K.cons.rows[2] || {}).coef), 3) + '. Stars: *** p < 0.01, ** p < 0.05, * p < 0.1.');
  mlCoef(s, K.inv.rows, 'Equation 2: investment', 'R² ' + nf(K.inv.r2, 3) + '; Newey–West standard errors.');
  mlCoef(s, K.imp.rows, 'Equation 3: imports', 'R² ' + nf(K.imp.r2, 3) + '; Newey–West standard errors.');
  const g = grid(s), src = 'Bangladesh national accounts; World Bank; model estimates.';
  figure(g, { title: 'GDP growth: actual and model solutions', sub: 'Static solution uses actual past values; dynamic solution feeds the model its own past values', h: 300, source: src, render: TH => tsOption(TH, K.fit.labels, [S('Actual', K.fit.actual, { w: 2 }), S('Static solution', K.fit.static, { w: 1.6, dash: true }), S('Dynamic solution', K.fit.dynamic, { w: 1.6, dash: true })], { y1: '% growth', dec: 2 }) });
  figure(g, { ts: false, title: 'Fiscal multiplier: GDP gain per Taka of extra spending', sub: 'Spending of 1% of GDP, kept up every year (sustained) or for one year only', h: 300, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: K.mult.labels.map((x, j) => 'Year ' + (j + 1)), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, 'multiplier'), series: [{ name: 'Sustained', type: 'bar', data: K.mult.sustained, itemStyle: { color: XPAL[0] }, label: { show: true, position: 'top', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } }, { name: 'One year only', type: 'bar', data: K.mult.one_off, itemStyle: { color: XPAL[1] }, label: { show: true, position: 'top', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } }] }) });
  figure(g, { ts: false, title: 'Scenario: exports 10% lower', sub: 'GDP compared with the baseline, %', h: 300, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: K.export_shock.labels.map((x, j) => 'Year ' + (j + 1)), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, '% of baseline GDP'), series: [{ name: 'GDP', type: 'bar', data: K.export_shock.gdp_pct, itemStyle: { color: '#E5484D' }, label: { show: true, position: 'bottom', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } }] }) });
  const cs = PK('cons_gdp'), is_ = PK('inv_gdp');
  if (cs && is_) {
    const labs = [], c1 = [], i1 = [], x1 = [], m1 = [], ex = new Map(wser('exports', 'BGD')), im = new Map(wser('imports', 'BGD'));
    for (let j = 0; j < cs.v.length; j++) { const k = cs.k0 + j; labs.push('FY' + k); c1.push(cs.v[j]); i1.push(is_.v[k - is_.k0] != null ? is_.v[k - is_.k0] : null); x1.push(ex.has(k - 1) ? ex.get(k - 1) : null); m1.push(im.has(k - 1) ? im.get(k - 1) : null); }
    figure(g, { title: 'Spending shares of GDP', sub: 'Consumption, investment, exports and imports, % of GDP', h: 300, source: 'Bangladesh national accounts; World Bank.', render: TH => tsOption(TH, labs, [S('Consumption', c1, { w: 2 }), S('Investment', i1, { w: 2 }), S('Exports', x1, { w: 2 }), S('Imports', m1, { w: 2 })], { y1: '% of GDP', dec: 1 }) });
  }
  tableWrap(s, '<table><thead><tr><th>Measure</th><th class="num">Value</th></tr></thead><tbody><tr><th scope="row">Impact multiplier</th><td class="num">' + nf(K.mult.impact, 2) + '</td></tr><tr><th scope="row">Sustained multiplier after 5 years</th><td class="num">' + nf(K.mult.sustained[4], 2) + '</td></tr><tr><th scope="row">Long-run demand multiplier</th><td class="num">' + nf(K.mult.long_run, 2) + '</td></tr><tr><th scope="row">One-off multiplier after 4 years</th><td class="num">' + nf(K.mult.one_off[3], 2) + '</td></tr><tr><th scope="row">Growth forecast error (RMSE): model, static / dynamic</th><td class="num">' + nf(K.fit.rmse_static, 2) + ' / ' + nf(K.fit.rmse_dynamic, 2) + '</td></tr><tr><th scope="row">Growth forecast error (RMSE): no-change benchmark</th><td class="num">' + nf(K.fit.rmse_naive, 2) + '</td></tr></tbody></table>', tcap('Multipliers and forecast accuracy'), 'RMSE in percentage points of growth.');
  mlText(s, 'Reading the results', '<ul class="ol-list"><li>An extra Taka of government spending raises GDP by about <b>' + nf(K.mult.impact, 2) + ' Taka</b> in the first year. Kept up for five years, the gain grows to about ' + nf(K.mult.sustained[4], 2) + ' because higher income lifts consumption and investment.</li><li>A one-year spending boost fades: after four years only ' + nf(K.mult.one_off[3], 2) + ' of it remains in GDP.</li><li>A 10% fall in exports lowers GDP by ' + nf(-K.export_shock.gdp_pct[0], 2) + '% in the first year and ' + nf(-K.export_shock.gdp_pct[K.export_shock.gdp_pct.length - 1], 2) + '% after ' + K.export_shock.gdp_pct.length + ' years.</li><li>The model explains growth less well than a simple no-change forecast (RMSE ' + nf(K.fit.rmse_static, 2) + ' against ' + nf(K.fit.rmse_naive, 2) + ' points): use it for the direction and size of policy effects, not for forecasting growth.</li><li>The long-run multiplier of ' + nf(K.mult.long_run, 2) + ' is a demand-side upper bound: prices, interest rates, taxes and capacity limits, missing here, would make it smaller.</li></ul>');
  mlBoxes(s, 'Transparent: every channel is an equation that can be checked against data. Gives multipliers and scenarios that policymakers can discuss directly.', 'Prices and wages adjust slowly; output is driven by demand; behavioural equations stay stable over the sample; government consumption is included in total consumption.', 'Annual data give only about 30 observations. No price or exchange-rate feedback. The Lucas critique: estimated behaviour can change when policy rules change. Growth forecasts are weak.', 'Add a price block (Phillips curve), a tax and transfer block, quarterly estimation, and a monetary block linking the call rate to investment.');
  mlRefs(s, [['Fair, R. C. (1984). Specification, estimation, and analysis of macroeconometric models. Harvard University Press.', ''], ['Klein, L. R., & Goldberger, A. S. (1955). An econometric model of the United States, 1929\u20131952. North-Holland.', ''], ['Lucas, R. E., Jr. (1976). Econometric policy evaluation: A critique. Carnegie-Rochester Conference Series on Public Policy, 1, 19\u201346.', 'https://doi.org/10.1016/S0167-2231(76)80003-6'], ['Newey, W. K., & West, K. D. (1987). A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix. Econometrica, 55(3), 703\u2013708.', 'https://doi.org/10.2307/1913610']]);
}
/* ---------- VECM ---------- */
function mlVecm(host, V) {
  const { i, n, o, sub, sup, ss, fr, r } = MX, t = i('t');
  const s = sec(host, 'Vector error correction model (VECM): imports, exports and remittances', 'Monthly data, ' + V.sample.join(' to ') + ' (' + V.n + ' months), in logarithms.', 'ml-vecm');
  mlText(s, 'What it is', '<p>When variables wander over time but are tied together in the long run, they are <b>cointegrated</b>. A VECM models both: the long-run relation (the error-correction term) and how each variable moves back towards it, alongside ordinary short-run dynamics (Engle & Granger, 1987; Johansen, 1991).</p><p><b>Why it matters for Bangladesh:</b> imports are paid for by exports and remittances. If the three are cointegrated, the external accounts are sustainable in the long run, and the model shows which flow does the adjusting when they drift apart.</p>');
  mlText(s, 'Equations', [
    EQN(r(o('Δ'), sub(i('𝐲'), t), o('='), i('𝛂'), sup(i('𝛃'), o('′')), sub(i('𝐲'), r(t, o('−'), n('1'))), o('+'), mlSum(r(i('j'), o('='), n('1')), r(i('p'), o('−'), n('1'))), sub(i('𝚪'), i('j')), o('Δ'), sub(i('𝐲'), r(t, o('−'), i('j'))), o('+'), i('𝛍'), o('+'), sub(i('𝛆'), t)), '(1) VECM'),
    EQN(r(sup(i('𝛃'), o('′')), sub(i('𝐲'), r(t, o('−'), n('1'))), o('='), i('ln'), sub(i('M'), r(t, o('−'), n('1'))), o('−'), sub(i('β'), i('X')), i('ln'), sub(i('X'), r(t, o('−'), n('1'))), o('−'), sub(i('β'), i('R')), i('ln'), sub(i('R'), r(t, o('−'), n('1'))), o('−'), i('c')), '(2) Error-correction term'),
    EQN(r(sub(i('λ'), i('trace')), o('('), i('r'), o(')'), o('='), o('−'), i('T'), mlSum(r(i('i'), o('='), i('r'), o('+'), n('1')), i('k')), i('ln'), o('('), n('1'), o('−'), sub(mlHat(i('λ')), i('i')), o(')')), '(3) Johansen trace test')].join(''));
  mlSyms(s, [[sub(i('𝐲'), t), 'vector of ln imports, ln exports and ln remittances'], [i('𝛃'), 'cointegrating vector: the long-run relation'], [i('𝛂'), 'speed of adjustment of each variable back to the relation'], [sub(i('𝚪'), i('j')), 'short-run effects of past changes'], [sub(mlHat(i('λ')), i('i')), 'estimated eigenvalues; large ones mean strong long-run links'], [i('p'), 'lag length, chosen by the BIC']]);
  tableWrap(s, '<table><thead><tr><th>Variable</th><th class="num">ADF p, level</th><th class="num">ADF p, first difference</th></tr></thead><tbody>' + V.unitroot.map(u => '<tr><th scope="row">' + esc(u.var) + '</th><td class="num">' + fp(u.level_p) + '</td><td class="num">' + fp(u.diff_p) + '</td></tr>').join('') + '</tbody></table>', tcap('Unit-root tests'), 'A high p in levels and a low p in differences means the series wanders (is I(1)), the precondition for cointegration.');
  tableWrap(s, '<table><thead><tr><th>Null hypothesis</th><th class="num">Trace statistic</th><th class="num">5% critical value</th><th class="num">Max-eigenvalue</th><th class="num">5% critical value</th><th>Decision</th></tr></thead><tbody>' + V.trace.map(x => '<tr><th scope="row">' + esc(x.h0) + '</th><td class="num">' + nf(x.trace, 2) + '</td><td class="num">' + nf(x.cv95, 2) + '</td><td class="num">' + nf(x.maxeig, 2) + '</td><td class="num">' + nf(x.cvm95, 2) + '</td><td>' + (x.trace > x.cv95 ? 'Reject' : 'Do not reject') + '</td></tr>').join('') + '</tbody></table>',
    tcap('Johansen cointegration test'), 'Lags: ' + V.p + ' (BIC; the AIC would choose ' + V.p_aic + '). Cointegrating relations found: <b>' + V.rank + '</b>. Engle–Granger test: t = ' + nf(V.eg.t, 2) + ', p = ' + fp(V.eg.p) + '.');
  tableWrap(s, '<table><thead><tr><th>Equation</th><th class="num">Speed of adjustment α</th><th class="num">Std. error</th><th class="num">p-value</th></tr></thead><tbody>' + V.alpha.map(a => '<tr><th scope="row">' + esc(a.eq) + '</th><td class="num">' + nf(a.coef, 4) + stars(a.p) + '</td><td class="num">' + nf(a.se, 4) + '</td><td class="num">' + fp(a.p) + '</td></tr>').join('') + '</tbody></table>',
    tcap('Long-run relation and adjustment'), 'Long run: ln imports = ' + nf(V.beta.elast_exports, 3) + ' \u00d7 ln exports + ' + nf(V.beta.elast_remit, 3) + ' \u00d7 ln remittances + constant.');
  const g = grid(s), src = 'Bangladesh Bank; model estimates.';
  figure(g, { title: 'Imports, exports and remittances (logarithms)', sub: 'Monthly, natural logs of US$ million', h: 300, source: src, render: TH => tsOption(TH, V.levels.labels, [S('ln imports', V.levels.imports, { w: 2 }), S('ln exports', V.levels.exports, { w: 2 }), S('ln remittances', V.levels.remit, { w: 2 })], { y1: 'log', dec: 2 }) });
  figure(g, { title: 'Deviation from the long-run relation', sub: 'Error-correction term, centred on zero; above zero = imports high relative to exports and remittances', h: 300, source: src, render: TH => tsOption(TH, V.ect.labels, [S('Error-correction term', V.ect.values, { w: 2 })], { y1: 'log points', dec: 3 }) });
  figure(g, { ts: false, title: 'Impulse responses', sub: 'Response of the first variable to a one-standard-deviation shock in the second, % (orthogonalised)', h: 300, source: src, render: TH => tsOption(TH, V.irf.h.map(String), [S('Imports to an export shock', V.irf.imp_to_exp, { w: 2 }), S('Imports to a remittance shock', V.irf.imp_to_rem, { w: 2 }), S('Exports to an import shock', V.irf.exp_to_imp, { w: 2, dash: true })], { y1: '%', dec: 2 }) });
  figure(g, { title: 'Forecasts for the next 12 months', sub: 'Imports with an 80% range, plus exports and remittances, US$ million', h: 300, source: src, render: TH => tsOption(TH, V.fc.labels, [S('Imports', V.fc.imports, { w: 2 }), S('Imports, 80% lower', V.fc.imp_lo, { w: 1, dash: true }), S('Imports, 80% upper', V.fc.imp_hi, { w: 1, dash: true }), S('Exports', V.fc.exports, { w: 2 }), S('Remittances', V.fc.remit, { w: 2 })], { y1: 'US$ million', dec: 0 }) });
  const sig = V.alpha.filter(a => a.p < 0.05).map(a => a.eq.replace('Δln ', ''));
  mlText(s, 'Reading the results', '<ul class="ol-list"><li>' + (V.rank > 0 ? 'The three flows share <b>' + V.rank + ' long-run relation</b>: they cannot drift apart for ever.' : 'No long-run relation is found at the 5% level, so long-run results are indicative only.') + '</li><li>In the long run imports move almost one for one with exports (elasticity ' + nf(V.beta.elast_exports, 2) + ') and only a little with remittances (' + nf(V.beta.elast_remit, 2) + ').</li><li>' + (sig.length ? 'When the relation is disturbed, the adjustment comes through <b>' + esc(sig.join(' and ')) + '</b>.' : 'No variable adjusts significantly.') + ' Imports themselves do not adjust significantly (p = ' + fp(V.alpha[0].p) + '): they are the anchor.</li><li>The lag length matters: with the AIC\u2019s ' + V.p_aic + ' lags the trace test loses power, a known weakness of cointegration tests.</li></ul>');
  mlBoxes(s, 'Uses the information in levels that differencing throws away; separates long-run equilibrium from short-run noise; shows which variable does the adjusting.', 'The series are I(1); the long-run relation is stable over the sample; errors are well behaved; a constant lies in the relation.', 'Results depend on the lag length and the deterministic terms; tests have low power in short or broken samples; structural breaks (such as COVID-19) can mimic or hide cointegration.', 'Add the exchange rate and the trade-weighted foreign income; test for breaks (Gregory–Hansen); allow the relation to change after the 2022 balance-of-payments pressures.');
  mlRefs(s, [['Engle, R. F., & Granger, C. W. J. (1987). Co-integration and error correction: Representation, estimation, and testing. Econometrica, 55(2), 251\u2013276.', 'https://doi.org/10.2307/1913236'], ['Husted, S. (1992). The emerging U.S. current account deficit in the 1980s: A cointegration analysis. The Review of Economics and Statistics, 74(1), 159\u2013166.', 'https://doi.org/10.2307/2109554'], ['Johansen, S. (1991). Estimation and hypothesis testing of cointegration vectors in Gaussian vector autoregressive models. Econometrica, 59(6), 1551\u20131580.', 'https://doi.org/10.2307/2938278']]);
}
/* ---------- Dynamic factor model, nowcast, FAVAR ---------- */
function mlDfm(host, F) {
  const { i, n, o, sub, sup, r } = MX, t = i('t');
  const s = sec(host, 'Dynamic factor model, GDP nowcast and FAVAR', F.vars.length + ' monthly indicators, ' + F.sample.join(' to ') + ' (' + F.n + ' months).', 'ml-dfm');
  mlText(s, 'What it is', '<p>A <b>dynamic factor model</b> compresses many indicators into a few common factors that drive them all (Stock & Watson, 2002). Factors from monthly data can then <b>nowcast</b> quarterly GDP before it is published (Giannone, Reichlin & Small, 2008). A <b>FAVAR</b> adds the factors to a VAR with the policy rate, so a monetary shock can be traced through the whole data set (Bernanke, Boivin & Eliasz, 2005).</p><p><b>Why it matters for Bangladesh:</b> quarterly GDP arrives with a long delay, while prices, money, credit, trade and remittances are monthly. The factors turn that monthly flow into an early reading of growth.</p>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('x'), r(i('i'), t)), o('='), sup(sub(i('λ'), i('i')), o('′')), sub(i('𝐅'), t), o('+'), sub(i('e'), r(i('i'), t))), '(1) Factor model: each indicator = loadings \u00d7 factors + its own noise'),
    EQN(r(sub(i('g'), i('q')), o('='), sub(i('β'), n('0')), o('+'), mlSum(r(i('j'), o('='), n('1')), n('3')), sub(i('β'), i('j')), sub(i('F̄'), r(i('j'), o(','), i('q'))), o('+'), i('ρ'), sub(i('g'), r(i('q'), o('−'), n('1'))), o('+'), sub(i('u'), i('q'))), '(2) Bridge equation for quarterly GDP growth'),
    EQN(r(o('['), sub(i('𝐅'), t), o(','), sub(i('i'), t), o(']'), sup(o(''), o('′')), o('='), mlSum(r(i('l'), o('='), n('1')), i('p')), sub(i('𝐀'), i('l')), o('['), sub(i('𝐅'), r(t, o('−'), i('l'))), o(','), sub(i('i'), r(t, o('−'), i('l'))), o(']'), sup(o(''), o('′')), o('+'), sub(i('𝐯'), t)), '(3) FAVAR with the call money rate')].join(''));
  mlSyms(s, [[sub(i('x'), r(i('i'), t)), 'indicator i in month t, standardised'], [sub(i('𝐅'), t), 'common factors (principal components)'], [sub(i('λ'), i('i')), 'loadings: how strongly indicator i follows each factor'], [sub(i('F̄'), r(i('j'), o(','), i('q'))), 'quarter average of factor j'], [sub(i('g'), i('q')), 'GDP growth, % year on year'], [sub(i('i'), t), 'call money rate, ordered last (it can react to the factors within the month)']]);
  tableWrap(s, '<table><thead><tr><th>Indicator</th><th class="num">Factor 1</th><th class="num">Factor 2</th><th class="num">Factor 3</th></tr></thead><tbody>' + F.vars.map((v, j) => '<tr><th scope="row">' + esc(v) + '</th>' + F.loadings[j].map(x => '<td class="num"' + (Math.abs(x) >= 0.3 ? ' style="font-weight:700"' : '') + '>' + nf(x, 2) + '</td>').join('') + '</tr>').join('') + '</tbody></table>',
    tcap('Factor loadings'), 'Variance explained: factor 1 ' + nf(F.share[0] * 100, 1) + '%, factor 2 ' + nf(F.share[1] * 100, 1) + '%, factor 3 ' + nf(F.share[2] * 100, 1) + '% (together ' + nf(F.cum3 * 100, 1) + '%). Bold: |loading| of 0.3 or more.');
  mlCoef(s, F.bridge.rows, 'Bridge equation: quarterly GDP growth', 'R² ' + nf(F.bridge.r2, 3) + ', ' + F.bridge.n + ' quarters, residual standard error ' + nf(F.bridge.se, 2) + ' points.');
  const g = grid(s), src = 'Bangladesh Bank; BBS; model estimates.';
  figure(g, { title: 'The three common factors', sub: 'Standardised units; factor 1 is oriented to rise with inflation', h: 300, source: src, render: TH => tsOption(TH, F.factors.labels, [S('Factor 1', F.factors.f1, { w: 2 }), S('Factor 2', F.factors.f2, { w: 2 }), S('Factor 3', F.factors.f3, { w: 1.6, dash: true })], { y1: 'standard units', dec: 2 }) });
  figure(g, { ts: false, title: 'How much each factor explains', sub: 'Share of the panel\u2019s total variation explained by each principal component', h: 300, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: F.share.map((x, j) => 'Factor ' + (j + 1)), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, '% of variation'), series: [{ name: 'Share', type: 'bar', data: F.share.map(x => +(x * 100).toFixed(1)), itemStyle: { color: '#3B82C4' }, label: { show: true, position: 'top', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 1) + '%' } }] }) });
  const nq = F.nowcast || [], labs = F.bridge.labels.concat(nq.map(x => x.q)), pad = nq.map(() => null);
  figure(g, { title: 'GDP growth: actual, fitted and nowcast', sub: 'Quarterly, % year on year; the nowcast covers quarters not yet published, with an 80% range', h: 300, source: src, render: TH => tsOption(TH, labs, [S('Actual', F.bridge.actual.concat(pad), { w: 2 }), S('Fitted', F.bridge.fitted.concat(pad), { w: 1.6, dash: true }), S('Nowcast', F.bridge.actual.map(() => null).slice(0, -1).concat([F.bridge.actual[F.bridge.actual.length - 1]]).concat(nq.map(x => x.nowcast)), { w: 2.4 }), S('Nowcast, 80% lower', F.bridge.actual.map(() => null).concat(nq.map(x => x.lo)), { w: 1, dash: true }), S('Nowcast, 80% upper', F.bridge.actual.map(() => null).concat(nq.map(x => x.hi)), { w: 1, dash: true })], { y1: '% y/y', dec: 2 }) });
  const rl_ = F.favar.resp_labels;
  figure(g, { ts: false, title: 'FAVAR: effects of a call-rate shock', sub: 'Response to a one-standard-deviation rise in the call money rate, percentage points, months after the shock', h: 300, source: src, render: TH => tsOption(TH, F.favar.h.map(String), [S('Call money rate', F.favar.call, { w: 2.4 })].concat(Object.keys(F.favar.resp).map(k => S(rl_[k], F.favar.resp[k], { w: 1.6 }))), { y1: 'pp', dec: 3 }) });
  const now = nq[0];
  mlText(s, 'Reading the results', '<ul class="ol-list"><li>Three factors capture ' + nf(F.cum3 * 100, 0) + '% of the movement in ' + F.vars.length + ' indicators; the first leans on prices, the second on money and credit.</li><li>' + (now ? 'The nowcast for <b>' + esc(now.q) + '</b> is <b>' + nf(now.nowcast, 1) + '%</b> growth (80% range ' + nf(now.lo, 1) + ' to ' + nf(now.hi, 1) + '), against ' + nf(F.last_gdp.value, 1) + '% in ' + esc(F.last_gdp.q) + ', the latest published quarter.' : 'All quarters with monthly data already have published GDP.') + '</li><li>The bridge equation explains ' + nf(F.bridge.r2 * 100, 0) + '% of quarterly growth; the range is wide because Bangladesh\u2019s quarterly GDP series is short.</li><li>In the FAVAR, a call-rate rise is followed by slightly <b>higher</b> inflation in the first year: the \u201cprice puzzle\u201d common in VARs, usually a sign that the central bank raises rates when it expects inflation. Read these responses as associations, not clean policy effects.</li></ul>');
  mlBoxes(s, 'Uses dozens of indicators at once without too many parameters; gives an early estimate of GDP; traces policy shocks through the whole data set.', 'A few common factors drive most co-movement; loadings are stable; idiosyncratic noise is weakly correlated across series; factors are estimated by principal components on a balanced panel.', 'Factors have no fixed economic meaning; the quarterly GDP sample is short (about ' + F.bridge.n + ' quarters); revisions to GDP are not modelled; the FAVAR identification is a simple ordering.', 'Use a mixed-frequency model (MIDAS or a Kalman-filter factor model), add survey and electricity data, and evaluate the nowcast in real time as each GDP release arrives.');
  mlRefs(s, [['Bernanke, B. S., Boivin, J., & Eliasz, P. (2005). Measuring the effects of monetary policy: A factor-augmented vector autoregressive (FAVAR) approach. The Quarterly Journal of Economics, 120(1), 387\u2013422.', 'https://doi.org/10.1162/0033553053327452'], ['Giannone, D., Reichlin, L., & Small, D. (2008). Nowcasting: The real-time informational content of macroeconomic data. Journal of Monetary Economics, 55(4), 665\u2013676.', 'https://doi.org/10.1016/j.jmoneco.2008.05.010'], ['Stock, J. H., & Watson, M. W. (2002). Forecasting using principal components from a large number of predictors. Journal of the American Statistical Association, 97(460), 1167\u20131179.', 'https://doi.org/10.1198/016214502388618960']]);
}
/* ---------- ARIMA and SARIMAX ---------- */
function mlSarimax(host, X) {
  const { i, n, o, sub, sup, r } = MX, t = i('t');
  const s = sec(host, 'ARIMA and SARIMAX: inflation with drivers', X ? 'Monthly headline inflation, ' + X.sample.join(' to ') + ' (' + X.n + ' months).' : 'Monthly headline inflation.', 'ml-sarimax');
  const d = document.createElement('div'); d.className = 'card'; d.innerHTML = '<p>The full ARIMA analysis of ten Bangladesh series (order selection, diagnostics, back-tests and forecasts) is in the <a href="#lab~arima">ARIMA / SARIMA tab</a>. This page adds <b>SARIMAX</b>: the same model with outside drivers.</p>'; s.append(d);
  if (!X) return;
  mlText(s, 'What it is', '<p>SARIMAX is a regression with seasonal ARIMA errors: inflation is explained by drivers (here the Taka\u2019s depreciation three months earlier and the call money rate six months earlier), while an ARIMA process captures the remaining momentum and seasonality (Box, Jenkins, Reinsel & Ljung, 2015).</p><p><b>Why it matters for Bangladesh:</b> it tests whether the exchange rate and monetary policy add forecasting power beyond inflation\u2019s own momentum, and lets you ask \u201cwhat if the Taka falls further?\u201d</p>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('π'), t), o('='), i('c'), o('+'), sub(i('β'), n('1')), sub(i('d'), r(t, o('−'), n('3'))), o('+'), sub(i('β'), n('2')), sub(i('i'), r(t, o('−'), n('6'))), o('+'), sub(i('u'), t)), '(1) Regression on the drivers'),
    EQN(r(o('('), n('1'), o('−'), sub(i('φ'), n('1')), i('L'), o(')'), o('('), n('1'), o('−'), sub(i('Φ'), n('1')), sup(i('L'), n('12')), o(')'), sub(i('u'), t), o('='), o('('), n('1'), o('+'), sub(i('θ'), n('1')), i('L'), o(')'), sub(i('ε'), t)), '(2) Seasonal ARMA errors (terms not chosen drop out)')].join(''));
  mlSyms(s, [[sub(i('π'), t), 'headline inflation, % year on year'], [sub(i('d'), r(t, o('−'), n('3'))), 'Taka depreciation three months earlier, % year on year'], [sub(i('i'), r(t, o('−'), n('6'))), 'call money rate six months earlier, %'], [i('L'), 'lag operator'], [sub(i('φ'), n('1')) + o(',') + sub(i('Φ'), n('1')) + o(',') + sub(i('θ'), n('1')), 'AR, seasonal AR and MA coefficients']]);
  mlCoef(s, X.rows, 'SARIMAX estimates', 'Order (' + X.order.join(',') + ')' + (X.sorder[3] ? ' \u00d7 (' + X.sorder.join(',') + ')' : '') + ', chosen by AIC. Ljung–Box p (12 lags) ' + fp(X.lb_p) + '; Jarque–Bera p ' + fp(X.jb_p) + '.');
  tableWrap(s, '<table><thead><tr><th>Model</th><th class="num">AIC</th><th class="num">BIC</th><th class="num">Back-test RMSE</th></tr></thead><tbody><tr><th scope="row">SARIMAX (with drivers)</th><td class="num">' + nf(X.aic, 1) + '</td><td class="num">' + nf(X.bic, 1) + '</td><td class="num">' + nf(X.rmse, 3) + '</td></tr><tr><th scope="row">ARIMA (same order, no drivers)</th><td class="num">' + nf(X.aic_base, 1) + '</td><td class="num">' + nf(X.bic_base, 1) + '</td><td class="num">' + nf(X.rmse_base, 3) + '</td></tr></tbody></table>',
    tcap('With and without drivers'), 'Back-test: one-month-ahead forecasts for the last ' + X.nbt + ' months, each re-estimated with data available at the time. Diebold–Mariano statistic ' + nf(X.dm, 2) + ' (p = ' + fp(X.dm_p) + '): a p above 0.05 means no significant difference in accuracy.');
  const g = grid(s), src = 'Bangladesh Bank; BBS; model estimates.';
  const labs = X.hist.labels.concat(X.fc.labels), pad = X.fc.labels.map(() => null), hpad = X.hist.labels.map(() => null).slice(0, -1), last = X.hist.actual[X.hist.actual.length - 1];
  figure(g, { wide: true, title: 'Inflation: history, fit and 12-month forecast', sub: 'Baseline with 80% range, and two scenarios', h: 330, source: src, render: TH => tsOption(TH, labs, [S('Actual', X.hist.actual.concat(pad), { w: 2 }), S('Fitted', X.hist.fitted.concat(pad), { w: 1.4, dash: true }), S('Forecast', hpad.concat([last]).concat(X.fc.base), { w: 2.4 }), S('80% lower', hpad.concat([last]).concat(X.fc.lo), { w: 1, dash: true }), S('80% upper', hpad.concat([last]).concat(X.fc.hi), { w: 1, dash: true }), S('Taka 5 points weaker', hpad.concat([last]).concat(X.fc.dep5), { w: 1.6, dash: true }), S('Call rate 1 point higher', hpad.concat([last]).concat(X.fc.call1), { w: 1.6, dash: true })], { y1: '% y/y', dec: 2 }) });
  const dd = X.fc.dep5.map((v, j) => +(v - X.fc.base[j]).toFixed(3)), dc = X.fc.call1.map((v, j) => +(v - X.fc.base[j]).toFixed(3));
  const p = Math.min(...X.rows.filter(x => /earlier/.test(x.term) && !/Inflation/.test(x.term)).map(x => x.p));
  mlText(s, 'Reading the results', '<ul class="ol-list"><li>Inflation is highly persistent: last month\u2019s rate carries most of the information.</li><li>' + (p < 0.05 ? 'At least one driver is significant (p = ' + fp(p) + ').' : 'Once that momentum is included, the Taka\u2019s depreciation and the call rate are <b>not</b> significant (smallest p = ' + fp(p) + '), and they do not improve forecasts (RMSE ' + nf(X.rmse, 3) + ' against ' + nf(X.rmse_base, 3) + ').') + '</li><li>Scenario effects after 12 months: Taka 5 points weaker ' + (dd[11] >= 0 ? '+' : '') + nf(dd[11], 2) + ' points; call rate 1 point higher ' + (dc[11] >= 0 ? '+' : '') + nf(dc[11], 2) + ' points. Small, consistent with the weak coefficients.</li><li>The baseline forecast for ' + esc(X.fc.labels[11]) + ' is ' + nf(X.fc.base[11], 2) + '% (80% range ' + nf(X.fc.lo[11], 2) + ' to ' + nf(X.fc.hi[11], 2) + ').</li></ul>');
  mlBoxes(s, 'A strong, transparent forecasting benchmark; tests whether drivers add information; scenario forecasts are easy to explain.', 'Drivers are known (or assumed) over the forecast; relations are linear and stable; the lags of three and six months capture the timing.', 'Drivers are treated as given, so feedback from inflation to policy is ignored; fixed lags may miss changing transmission; monthly y/y data overlap, which inflates persistence.', 'Use month-on-month inflation, distributed lags, food and fuel prices, and test lags in a mixed-frequency setting.');
  mlRefs(s, [['Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). Time series analysis: Forecasting and control (5th ed.). Wiley.', ''], ['Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. Journal of Business & Economic Statistics, 13(3), 253\u2013263.', 'https://doi.org/10.1080/07350015.1995.10524599'], ['Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and practice (3rd ed.). OTexts.', 'https://otexts.com/fpp3/']]);
}
/* ---------- CGE (1-2-3 model) ---------- */
function mlCge(host, G) {
  const { i, n, o, sub, sup, ss, fr, r } = MX;
  const s = sec(host, 'Computable general equilibrium (CGE): the 1-2-3 model', 'Calibrated to Bangladesh\u2019s ' + G.year + ' trade shares: exports ' + nf(G.E0, 1) + '% and imports ' + nf(G.M0, 1) + '% of GDP.', 'ml-cge');
  mlText(s, 'What it is', '<p>A CGE model solves for prices that clear all markets at once after a policy or price change. The <b>1-2-3 model</b> (one country, two activities, three goods) is the standard small version for developing economies: firms choose how much output to export and how much to sell at home; buyers choose between imported and home-made goods; the real exchange rate adjusts so that the trade gap matches the foreign financing available (Devarajan et al., 1997).</p><p><b>Why it matters for Bangladesh:</b> tariffs, world prices, remittance flows and the loss of trade preferences after LDC graduation all work through these choices and the real exchange rate.</p>');
  mlText(s, 'Equations', [
    EQN(r(i('X'), o('='), sub(i('A'), i('T')), o('['), i('γ'), sup(i('E'), sub(i('ρ'), i('T'))), o('+'), o('('), n('1'), o('−'), i('γ'), o(')'), sup(i('D'), sub(i('ρ'), i('T'))), sup(o(']'), fr(n('1'), sub(i('ρ'), i('T'))))), '(1) Output split between exports and home sales (CET)'),
    EQN(r(fr(i('E'), i('D')), o('='), sup(o('['), ''), fr(sub(i('P'), i('E')), sub(i('P'), i('D'))), fr(r(n('1'), o('−'), i('γ')), i('γ')), sup(o(']'), i('Ω'))), '(2) Export supply'),
    EQN(r(i('Q'), o('='), sub(i('A'), i('Q')), o('['), i('δ'), sup(i('M'), r(o('−'), i('ρ'))), o('+'), o('('), n('1'), o('−'), i('δ'), o(')'), sup(i('D'), r(o('−'), i('ρ'))), sup(o(']'), r(o('−'), fr(n('1'), i('ρ'))))), '(3) Composite of imports and home goods (Armington)'),
    EQN(r(fr(i('M'), i('D')), o('='), sup(o('['), ''), fr(sub(i('P'), i('D')), sub(i('P'), i('M'))), fr(i('δ'), r(n('1'), o('−'), i('δ'))), sup(o(']'), i('σ'))), '(4) Import demand'),
    EQN(r(sub(i('P'), i('E')), o('='), i('R'), ss(i('p'), i('e'), i('w')), o(','), o('&#8195;'), sub(i('P'), i('M')), o('='), i('R'), o('('), n('1'), o('+'), sub(i('t'), i('m')), o(')'), ss(i('p'), i('m'), i('w'))), '(5) Prices'),
    EQN(r(ss(i('p'), i('m'), i('w')), i('M'), o('−'), ss(i('p'), i('e'), i('w')), i('E'), o('='), i('B')), '(6) External balance')].join(''));
  mlSyms(s, [[i('X'), 'total output, fixed at full employment (100)'], [i('E') + o(',') + i('D') + o(',') + i('M'), 'exports, home sales, imports'], [i('Q'), 'composite good: absorption, a proxy for real consumption and welfare'], [i('R'), 'real exchange rate (price of foreign exchange relative to home goods)'], [i('Ω'), 'export transformation elasticity (' + G.om + ')'], [i('σ'), 'Armington substitution elasticity (' + G.sg + ')'], [sub(i('t'), i('m')), 'average tariff (' + nf(G.tm * 100, 0) + '%)'], [i('B'), 'trade gap financed by remittances and capital (' + nf(G.B0, 1) + '% of GDP)']]);
  tableWrap(s, '<table><thead><tr><th>Item</th><th class="num">Value</th><th>Source</th></tr></thead><tbody><tr><th scope="row">Exports, % of GDP</th><td class="num">' + nf(G.E0, 2) + '</td><td>World Bank, ' + G.year + '</td></tr><tr><th scope="row">Imports, % of GDP</th><td class="num">' + nf(G.M0, 2) + '</td><td>World Bank, ' + G.year + '</td></tr><tr><th scope="row">Remittances, % of GDP</th><td class="num">' + nf(G.remit_gdp, 2) + '</td><td>World Bank (context)</td></tr><tr><th scope="row">Average tariff</th><td class="num">' + nf(G.tm * 100, 0) + '%</td><td>Assumption (adjustable in future versions)</td></tr><tr><th scope="row">Elasticities Ω, σ</th><td class="num">' + G.om + ', ' + G.sg + '</td><td>Typical values for developing economies</td></tr><tr><th scope="row">Calibrated share parameters γ, δ</th><td class="num">' + nf(G.gam, 3) + ', ' + nf(G.dl, 3) + '</td><td>Solved so the base year is reproduced exactly</td></tr></tbody></table>', tcap('Calibration'), 'Calibration sets parameters so that the model reproduces the base year exactly; scenarios then show the change from that base.');
  tableWrap(s, '<table><thead><tr><th>Scenario</th><th class="num">Real exchange rate</th><th class="num">Exports</th><th class="num">Imports</th><th class="num">Home sales</th><th class="num">Absorption</th><th class="num">Tariff revenue</th></tr></thead><tbody>' + G.rows.map(x => '<tr><th scope="row">' + esc(x.name) + '</th>' + ['R', 'E', 'M', 'D', 'Q', 'rev'].map(k => '<td class="num">' + (x[k] > 0 ? '+' : '') + nf(x[k], 2) + '</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('Scenario results: % change from the base year'), 'A rise in the real exchange rate is a real depreciation of the Taka. Absorption is the best single welfare proxy in this model.');
  const g = grid(s), src = 'World Bank; model calculations.';
  figure(g, { ts: false, title: 'Scenario results', sub: '% change from the base year', h: 320, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: G.rows.map(x => x.name.split(':')[0].replace('Remittances and foreign savings', 'Remittances').slice(0, 24)), axisLabel: { color: TH.muted, fontSize: 9, interval: 0, rotate: 20 } }, yAxis: valAxis(TH, '% change'), series: [['R', 'Real exchange rate'], ['E', 'Exports'], ['M', 'Imports'], ['Q', 'Absorption']].map(([k, nm], j) => ({ name: nm, type: 'bar', data: G.rows.map(x => x[k]), itemStyle: { color: XPAL[j] } })) }) });
  figure(g, { ts: false, title: 'Sensitivity: export response to a 10% export-price fall', sub: '% change in exports by export elasticity Ω (horizontal) and Armington elasticity σ (lines)', h: 320, source: src, render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: G.sens.map(x => 'Ω = ' + x.om), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, '% change in exports'), series: G.sg_grid.map((sg, j) => ({ name: 'σ = ' + sg, type: 'line', data: G.sens.map(x => x.vals[j]), lineStyle: { width: 2, color: XPAL[j] }, itemStyle: { color: XPAL[j] }, label: { show: true, position: 'top', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } })) }) });
  const ldc = G.rows.find(x => /LDC/.test(x.name)) || {}, rem = G.rows.find(x => /Remittances/.test(x.name)) || {}, tar = G.rows.find(x => /Tariff/.test(x.name)) || {};
  mlText(s, 'Reading the results', '<ul class="ol-list"><li><b>LDC graduation</b> (export prices 5% lower): the Taka depreciates by ' + nf(ldc.R, 1) + '% in real terms, imports fall ' + nf(-ldc.M, 1) + '%, and absorption falls ' + nf(-ldc.Q, 2) + '%.</li><li><b>Remittances</b> 2% of GDP lower: a ' + nf(rem.R, 1) + '% real depreciation pushes exports up ' + nf(rem.E, 1) + '% and imports down ' + nf(-rem.M, 1) + '%; absorption falls ' + nf(-rem.Q, 2) + '%, the largest welfare loss among these scenarios after an import-price shock.</li><li><b>Halving tariffs</b> raises both exports (+' + nf(tar.E, 1) + '%) and imports (+' + nf(tar.M, 1) + '%) with a small welfare gain, but tariff revenue falls ' + nf(-tar.rev, 1) + '%: a fiscal cost to plan for.</li><li>Results scale with the elasticities: the sensitivity chart shows how much they depend on Ω and σ, which are not estimated here.</li></ul>');
  mlBoxes(s, 'Captures economy-wide price effects that partial models miss; shows winners, losers and the exchange-rate channel; standard tool for trade and tax policy.', 'Full employment and fixed total output; competitive markets; one representative sector; elasticities taken from the literature; comparative statics (no time path).', 'Very aggregated (one sector, one household); results depend on assumed elasticities; no money, no unemployment, no dynamics.', 'Build a multi-sector model from a Bangladesh social accounting matrix, with garments, agriculture and services, households by income group, and a dynamic version for LDC graduation.');
  mlRefs(s, [['Armington, P. S. (1969). A theory of demand for products distinguished by place of production. Staff Papers (International Monetary Fund), 16(1), 159\u2013178.', 'https://doi.org/10.2307/3866403'], ['Dervis, K., de Melo, J., & Robinson, S. (1982). General equilibrium models for development policy. Cambridge University Press.', ''], ['Devarajan, S., Go, D. S., Lewis, J. D., Robinson, S., & Sinko, P. (1997). Simple general equilibrium modeling. In J. F. Francois & K. A. Reinert (Eds.), Applied methods for trade policy analysis: A handbook. Cambridge University Press.', ''], ['Lofgren, H., Harris, R. L., & Robinson, S. (2002). A standard computable general equilibrium (CGE) model in GAMS. International Food Policy Research Institute.', '']]);
}

/* ======================= v3.14: Forecast comparison ======================= */
var FC5S = { v: 'infl', f: 'FY', h: 5, ms: null, band: 'ens', hist: 10 };
var FC5_COL = { rw: '#9CA3AF', ar: '#2F6FED', arima: '#E5484D', ets: '#12A594', theta: '#F5A524', mean: '#8E4EC6', var: '#0091FF', vecm: '#AD7F58', sarimax: '#D6409F', ens: '#111827' };
var FC5_ORDER = ['ens', 'ar', 'arima', 'ets', 'theta', 'rw', 'mean', 'var', 'vecm', 'sarimax'];
function fc5Per(k, src, out) {
  if (out === src) return k;
  if (src === 'M') return out === 'Q' ? Math.floor(k / 3) : out === 'FY' ? Math.floor(k / 12) + (k % 12 >= 6 ? 1 : 0) : Math.floor(k / 12);
  if (src === 'Q') return out === 'FY' ? Math.floor(k / 4) + (k % 4 >= 2 ? 1 : 0) : Math.floor(k / 4);
  return k;
}
function fc5Need(src, out) { return src === out ? 1 : src === 'M' ? (out === 'Q' ? 3 : 12) : 4; }
function fc5Lab(id, out) { return out === 'M' ? Math.floor(id / 12) + '-' + String(id % 12 + 1).padStart(2, '0') : out === 'Q' ? Math.floor(id / 4) + '-Q' + (id % 4 + 1) : out === 'FY' ? 'FY' + id : String(id); }
function fc5Agg(pairs, src, out, rule) {
  const m = new Map(), need = fc5Need(src, out);
  pairs.forEach(([k, v, isF]) => { if (v == null) return; const id = fc5Per(k, src, out), e = m.get(id) || { s: 0, n: 0, last: null, f: 0 }; e.s += v; e.n++; e.last = v; if (isF) e.f++; m.set(id, e); });
  const r = []; m.forEach((e, id) => { if (e.n === need) r.push([id, rule === 'sum' ? e.s : rule === 'last' ? e.last : e.s / e.n, e.f]); });
  return r.sort((a, b) => a[0] - b[0]);
}
function fc5Hist(key, V) {
  const p = PK(key); if (!p) return [];
  const out = []; for (let j = 0; j < p.v.length; j++) if (p.v[j] != null && p.k0 + j <= V.k_last) out.push([p.k0 + j, p.v[j], false]);
  return out;
}
function fc5Path(V, mid, field) {
  const m = V.models[mid]; if (!m) return [];
  return m[field].map((v, j) => [V.k_last + 1 + j, v, true]);
}
function labFc5(body) {
  const F = (BD && BD.models2 && BD.models2.fc5) || null;
  const s = sec(body, 'Forecast comparison: every model, five years ahead', 'Monthly, quarterly, fiscal-year and calendar-year forecasts from up to ten models, compared on one chart, with back-test accuracy, failure tests, robustness, heterogeneity, simulation and step-by-step derivations.', 'fc5');
  if (!F) { s.insertAdjacentHTML('beforeend', '<p class="note">Forecast results are not in this data build.</p>'); return; }
  const keys = Object.keys(F.vars);
  if (!F.vars[FC5S.v]) FC5S.v = keys[0];
  const ctl = document.createElement('div'); ctl.className = 'fc5-ctl'; s.append(ctl);
  const out = document.createElement('div'); s.append(out);
  const draw = () => {
    const V = F.vars[FC5S.v], src = V.freq, freqs = src === 'M' ? [['M', 'Monthly'], ['Q', 'Quarterly'], ['FY', 'Fiscal year'], ['CY', 'Calendar year']] : src === 'Q' ? [['Q', 'Quarterly'], ['FY', 'Fiscal year'], ['CY', 'Calendar year']] : [['FY', 'Fiscal year']];
    if (!freqs.some(x => x[0] === FC5S.f)) FC5S.f = freqs[freqs.length > 2 ? 2 : 0][0];
    const avail = FC5_ORDER.filter(m => V.models[m]);
    if (!FC5S.ms || !FC5S.ms.some(m => V.models[m])) FC5S.ms = avail.filter(m => ['ens', 'ar', 'arima', 'ets', 'theta', 'var', 'vecm'].includes(m));
    FC5S.ms = FC5S.ms.filter(m => V.models[m]); if (!V.models[FC5S.band]) FC5S.band = 'ens';
    ctl.innerHTML = '<label>Variable <select data-k="v">' + keys.map(k => '<option value="' + k + '"' + (k === FC5S.v ? ' selected' : '') + '>' + esc(F.vars[k].label) + (F.vars[k].freq !== 'M' ? ' (' + (F.vars[k].freq === 'Q' ? 'quarterly' : 'fiscal year') + ')' : '') + '</option>').join('') + '</select></label>' +
      '<label>Frequency <select data-k="f">' + freqs.map(([a, b]) => '<option value="' + a + '"' + (a === FC5S.f ? ' selected' : '') + '>' + b + '</option>').join('') + '</select></label>' +
      '<label>Horizon <select data-k="h">' + [1, 2, 3, 4, 5].map(h => '<option value="' + h + '"' + (h === FC5S.h ? ' selected' : '') + '>' + h + ' year' + (h > 1 ? 's' : '') + '</option>').join('') + '</select></label>' +
      '<label>History <select data-k="hist">' + [3, 5, 10, 15].map(h => '<option value="' + h + '"' + (h === FC5S.hist ? ' selected' : '') + '>' + h + ' years</option>').join('') + '</select></label>' +
      '<label>Range for <select data-k="band"><option value="">none</option>' + avail.map(m => '<option value="' + m + '"' + (m === FC5S.band ? ' selected' : '') + '>' + esc(F.names[m]) + '</option>').join('') + '</select></label>' +
      '<div class="fc5-ms" role="group" aria-label="Models">' + avail.map(m => '<label class="fc5-chip" style="--c:' + FC5_COL[m] + '"><input type="checkbox" data-m="' + m + '"' + (FC5S.ms.includes(m) ? ' checked' : '') + '> ' + esc(F.names[m]) + '</label>').join('') + '</div>';
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    fc5Render(out, F, V);
  };
  ctl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.m) { const on = new Set(FC5S.ms); t.checked ? on.add(t.dataset.m) : on.delete(t.dataset.m); FC5S.ms = FC5_ORDER.filter(m => on.has(m)); }
    else if (t.dataset.k) { const k = t.dataset.k; FC5S[k] = (k === 'h' || k === 'hist') ? +t.value : t.value; if (k === 'v') FC5S.ms = null; }
    draw();
  });
  draw();
  fc5Methods(s);
}
function fc5Render(out, F, V) {
  const src = V.freq, of = FC5S.f, rule = V.agg, dec = /US\$|Tk crore/.test(V.unit) && !/%/.test(V.unit) ? 0 : 2;
  const per = { M: 12, Q: 4, FY: 1, CY: 1 }[of], nF = per * FC5S.h, nH = per * FC5S.hist;
  const hist = fc5Hist(FC5S.v, V), hAgg = fc5Agg(hist, src, of, rule).slice(-nH);
  const ser_ = {}, labsF = new Set();
  FC5S.ms.forEach(m => {
    const a = fc5Agg(hist.concat(fc5Path(V, m, 'mean')), src, of, rule).filter(x => x[2] > 0).slice(0, nF);
    ser_[m] = a; a.forEach(x => labsF.add(x[0]));
  });
  let band = null;
  if (FC5S.band && V.models[FC5S.band]) {
    band = {};
    ['lo80', 'hi80', 'lo95', 'hi95'].forEach(fl => { band[fl] = new Map(fc5Agg(hist.concat(fc5Path(V, FC5S.band, fl)), src, of, rule).filter(x => x[2] > 0).slice(0, nF).map(x => [x[0], x[1]])); });
    band.lo80.forEach((v, id) => labsF.add(id));
  }
  const hIds = hAgg.map(x => x[0]), lastH = hIds[hIds.length - 1], fIds = Array.from(labsF).filter(id => lastH == null || id > lastH).sort((a, b) => a - b);
  const allIds = hIds.concat(fIds), labels = allIds.map(id => fc5Lab(id, of)), hMap = new Map(hAgg.map(x => [x[0], x[1]]));
  const mk = (map, conn) => allIds.map(id => map.has(id) ? map.get(id) : (conn && id === lastH ? hMap.get(id) : null));
  const series = [S('Actual: ' + V.label, allIds.map(id => hMap.has(id) ? hMap.get(id) : null), { w: 2.4, color: '#111827' })];
  FC5S.ms.forEach(m => { const mp = new Map(ser_[m].map(x => [x[0], x[1]])); series.push(S(F.names[m], mk(mp, true), { w: m === 'ens' ? 2.6 : 1.7, dash: m !== 'ens', color: FC5_COL[m] })); });
  if (band) [['lo95', '95% lower'], ['lo80', '80% lower'], ['hi80', '80% upper'], ['hi95', '95% upper']].forEach(([fl, nm]) => series.push(S(F.names[FC5S.band] + ', ' + nm, mk(band[fl], true), { w: fl.includes('95') ? 0.9 : 1.2, dash: true, color: FC5_COL[FC5S.band] })));
  const ofName = { M: 'monthly', Q: 'quarterly', FY: 'fiscal-year', CY: 'calendar-year' }[of], aggTxt = of === src ? '' : (rule === 'sum' ? ' (sum of ' + (src === 'M' ? 'months' : 'quarters') + ')' : rule === 'last' ? ' (end of period)' : ' (average of ' + (src === 'M' ? 'months' : 'quarters') + ')');
  const g = grid(out);
  figure(g, { wide: true, title: V.label + ': ' + ofName + ' forecasts, ' + FC5S.h + ' year' + (FC5S.h > 1 ? 's' : '') + ' ahead', sub: V.unit + aggTxt + '. Forecast periods that still contain actual ' + (src === 'M' ? 'months' : 'quarters') + ' combine actual and forecast values.', h: 380, source: 'Bangladesh Bank; BBS; model estimates (data to ' + fc5Lab(V.k_last, src) + ').', render: TH => tsOption(TH, labels, series, { y1: V.unit, dec: dec }) });
  // forecast table
  const rows = fIds.map(id => [fc5Lab(id, of)].concat(FC5S.ms.map(m => { const x = ser_[m].find(z => z[0] === id); return x ? x[1] : null; })));
  tableWrap(out, '<table><thead><tr><th>Period</th>' + FC5S.ms.map(m => '<th class="num">' + esc(F.names[m]) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1).map(v => '<td class="num">' + (v == null ? '–' : nf(v, dec)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('Forecast values, ' + ofName), V.unit + aggTxt + '. The first forecast period may include actual data.');
  // accuracy and optimal model
  const bt = V.bt, ms = Object.keys(bt.rmse), hs = bt.h, uh = src === 'M' ? 'months' : src === 'Q' ? 'quarters' : 'years', U = h => h + ' ' + (h === 1 ? uh.slice(0, -1) : uh);
  const best = hs.map((h, i) => ms.filter(m => bt.rmse[m][i] != null).sort((a, b) => bt.rmse[a][i] - bt.rmse[b][i])[0]);
  const rank = {}; ms.forEach(m => { const rr = hs.map((h, i) => { const ord = ms.filter(x => bt.rmse[x][i] != null).sort((a, b) => bt.rmse[a][i] - bt.rmse[b][i]); return ord.indexOf(m) + 1; }).filter(x => x > 0); rank[m] = rr.length ? rr.reduce((a, b) => a + b, 0) / rr.length : null; });
  const mid = Math.floor(hs.length / 2);
  tableWrap(out, '<table><thead><tr><th>Model</th>' + hs.map(h => '<th class="num">RMSE, ' + U(h) + '</th>').join('') + '<th class="num">Average rank</th><th class="num">80% range covers</th><th class="num">DM p vs random walk</th><th class="num">Failed fits</th><th class="num">Ensemble weight</th></tr></thead><tbody>' +
    ms.map(m => '<tr><th scope="row">' + esc(F.names[m]) + '</th>' + hs.map((h, i) => '<td class="num"' + (best[i] === m ? ' style="font-weight:700"' : '') + '>' + (bt.rmse[m][i] == null ? '–' : nf(bt.rmse[m][i], dec === 0 ? 0 : 3)) + '</td>').join('') + '<td class="num">' + (rank[m] == null ? '–' : nf(rank[m], 1)) + '</td><td class="num">' + (bt.cov80[m][mid] == null ? '–' : nf(bt.cov80[m][mid] * 100, 0) + '%') + '</td><td class="num">' + (m === 'rw' ? '–' : (bt.dm[m] && bt.dm[m][mid] && bt.dm[m][mid][1] != null ? fp(bt.dm[m][mid][1]) : '–')) + '</td><td class="num">' + (bt.fail[m] || 0) + ' / ' + bt.origins + '</td><td class="num">' + (V.weights[m] != null ? nf(V.weights[m] * 100, 0) + '%' : '–') + '</td></tr>').join('') + '</tbody></table>',
    tcap('Back-test accuracy: forecasts made at ' + bt.origins + ' past dates using only data available then'), 'Bold: most accurate model at each horizon. Coverage and the Diebold–Mariano test are shown at ' + hs[mid] + ' ' + uh + '; an 80% range should cover about 80% of outcomes. Failed fits: estimation did not converge or the forecast left the historical range by more than twice its width; these are excluded from the scores. Ensemble weights are proportional to 1/MSE at ' + hs[mid] + ' ' + uh + '.');
  const order = ms.filter(m => rank[m] != null).sort((a, b) => rank[a] - rank[b]);
  const shortB = best[0], midB = best[mid], longB = best[best.length - 1], bands95 = V.models.ens ? [V.models.ens.lo95[V.H - 1], V.models.ens.hi95[V.H - 1]] : null;
  out.insertAdjacentHTML('beforeend', '<div class="card"><h3>Optimal accuracy and suitability</h3><ul class="ol-list"><li>Most accurate at ' + U(hs[0]) + ': <b>' + esc(F.names[shortB]) + '</b>; at ' + U(hs[mid]) + ': <b>' + esc(F.names[midB]) + '</b>; at ' + U(hs[hs.length - 1]) + ': <b>' + esc(F.names[longB]) + '</b>. Best average rank across horizons: <b>' + esc(F.names[order[0]]) + '</b>.</li>' +
    '<li>Back-tests reach ' + hs[hs.length - 1] + ' ' + uh + ' at most: the history is too short to validate five-year forecasts directly, so beyond that horizon the forecasts rest on each model’s structure. Models that converge to a long-run mean (AR, historical mean, ensemble) and models that hold the last level (random walk, ARIMA with a unit root) bracket the plausible range.</li>' +
    (bands95 ? '<li>The ensemble’s 95% range at the five-year horizon is ' + nf(bands95[0], dec) + ' to ' + nf(bands95[1], dec) + ' ' + esc(V.unit) + ': treat point forecasts that far ahead as central scenarios, not predictions.</li>' : '') +
    (Object.entries(bt.fail).filter(([m, n]) => n > 2).length ? '<li>Unreliable estimation: ' + Object.entries(bt.fail).filter(([m, n]) => n > 2).map(([m, n]) => esc(F.names[m]) + ' failed at ' + n + ' of ' + bt.origins + ' dates').join('; ') + '. Prefer models without failures for this variable.</li>' : '<li>No model failed more than twice in the back-test.</li>') +
    '<li>Suitability: use <b>' + esc(F.names[shortB]) + '</b> for the next ' + hs[0] + '–' + hs[Math.min(1, hs.length - 1)] + ' ' + uh + ', <b>' + esc(F.names[midB]) + '</b> around ' + hs[mid] + ' ' + uh + ', and the <b>ensemble</b> for multi-year planning, because combining forecasts reduces the risk of relying on one wrong model (Bates & Granger, 1969).</li></ul></div>');
  // failure tests
  const D_ = V.diag, ok = (p, good) => p == null ? '–' : (p > 0.05 ? (good || 'pass') : 'fails at 5%');
  const drows = [['Ljung–Box: no autocorrelation left in ARIMA residuals', D_.ljungbox_p, ok(D_.ljungbox_p)], ['ARCH-LM: no volatility clustering', D_.arch_p, ok(D_.arch_p)], ['Jarque–Bera: normal residuals', D_.jb_p, D_.jb_p == null ? '–' : (D_.jb_p > 0.05 ? 'pass' : 'non-normal: rely on simulated ranges')], ['OLS-CUSUM: stable parameters', D_.cusum && D_.cusum[1], ok(D_.cusum && D_.cusum[1], 'stable')]];
  Object.entries(D_.chow || {}).forEach(([lab, v]) => drows.push(['Chow break test: ' + lab, v[1], v[1] == null ? 'too few observations' : (v[1] > 0.05 ? 'no break' : 'break detected')]));
  const nconv = Object.entries(D_.converged || {}).filter(([m, c]) => !c).map(([m]) => F.names[m]);
  tableWrap(out, '<table><thead><tr><th>Model failure test</th><th class="num">p-value</th><th>Verdict</th></tr></thead><tbody>' + drows.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + fp(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '<tr><th scope="row">Full-sample estimation converged</th><td class="num">–</td><td>' + (nconv.length ? 'not for ' + esc(nconv.join(', ')) : 'all models') + '</td></tr></tbody></table>', tcap('Model failure tests'), 'ARIMA order ' + JSON.stringify(V.spec.arima[0]) + (V.spec.arima[1][3] ? ' × ' + JSON.stringify(V.spec.arima[1]) : '') + '; the CUSUM and Chow tests use an AR(' + D_.ar_p + ') regression on the ' + esc(D_.transform.replace(' for the AR test regression', '')) + '.');
  // robustness
  const R_ = V.robust || {};
  let rb = '';
  if (R_.subsample) rb += R_.subsample.h.map((h, i) => '<tr><th scope="row">ARIMA, ' + h + ' ' + uh + ' ahead</th><td class="num">' + nf(R_.subsample.full[i], dec) + '</td><td class="num">' + nf(R_.subsample.pre2020[i], dec) + '</td><td class="num">' + nf(R_.subsample.pre2020[i] - R_.subsample.full[i], dec) + '</td></tr>').join('');
  if (rb) tableWrap(out, '<table><thead><tr><th>Forecast</th><th class="num">Parameters from full sample</th><th class="num">Parameters from data to 2019</th><th class="num">Difference</th></tr></thead><tbody>' + rb + '</tbody></table>', tcap('Robustness: parameter stability'), (R_.orders ? 'Neighbouring ARIMA orders (' + R_.orders.n + ' specifications) give ' + nf(R_.orders.h12_min, dec) + ' to ' + nf(R_.orders.h12_max, dec) + ' one year ahead and ' + nf(R_.orders.end_min, dec) + ' to ' + nf(R_.orders.end_max, dec) + ' at the final horizon.' : ''));
  // heterogeneity
  const Hh = V.het || {};
  if (Hh.rows && Hh.rows.length) tableWrap(out, '<table><thead><tr><th>Sub-period</th><th class="num">Observations</th><th class="num">Mean</th><th class="num">Std. dev.</th><th class="num">Persistence (lag-1 correlation)</th></tr></thead><tbody>' + Hh.rows.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 2) + '</td><td class="num">' + nf(r[3], 2) + '</td><td class="num">' + nf(r[4], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Heterogeneity across sub-periods'), 'Measured on the ' + esc(Hh.measure) + '. Levene test of equal variances p = ' + fp(Hh.levene_p) + '; Kruskal–Wallis test of equal distributions p = ' + fp(Hh.kruskal_p) + '. ' + (Hh.kruskal_p != null && Hh.kruskal_p < 0.05 ? 'The series behaves differently across periods: a single model fitted to the whole sample averages over regimes.' : 'No significant difference across periods.'));
  // simulation
  const sim = V.sim || {}, sl = sim.fy || [];
  const g2 = grid(out);
  figure(g2, { ts: false, title: 'Back-test error by forecast horizon', sub: 'Root mean squared error of each model, ' + V.unit + '; lower is better', h: 300, source: 'Model back-tests (rolling origin).', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, type: 'scroll', textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: hs.map(U), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, 'RMSE'), series: ms.map(m => ({ name: F.names[m], type: 'line', data: bt.rmse[m], symbolSize: 6, lineStyle: { width: m === 'rw' ? 1.4 : 2, type: m === 'rw' ? 'dashed' : 'solid', color: FC5_COL[m] }, itemStyle: { color: FC5_COL[m] } })) }) });
  if (sl.length) {
    figure(g2, { title: 'Simulation: fiscal-year fan from 1,000 ARIMA paths', sub: V.unit + aggTxt.replace('months', 'months') + '; 5th–95th percentiles', h: 300, source: 'Model simulation (Monte Carlo).', render: TH => tsOption(TH, sl.map(r => r[0]), [S('5th percentile', sl.map(r => r[1]), { w: 1, dash: true, color: '#9CA3AF' }), S('25th percentile', sl.map(r => r[2]), { w: 1.4, dash: true, color: '#6B7280' }), S('Median', sl.map(r => r[3]), { w: 2.4, color: '#E5484D' }), S('75th percentile', sl.map(r => r[4]), { w: 1.4, dash: true, color: '#6B7280' }), S('95th percentile', sl.map(r => r[5]), { w: 1, dash: true, color: '#9CA3AF' })], { y1: V.unit, dec: dec }) });
    tableWrap(out, '<table><thead><tr><th>Fiscal year</th><th class="num">5th</th><th class="num">25th</th><th class="num">Median</th><th class="num">75th</th><th class="num">95th</th><th class="num">Actual months included</th></tr></thead><tbody>' + sl.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1, 6).map(v => '<td class="num">' + nf(v, dec) + '</td>').join('') + '<td class="num">' + r[6] + '</td></tr>').join('') + '</tbody></table>', tcap('Simulated distribution by fiscal year'), 'Shocks drawn from the estimated ARIMA error distribution; parameter uncertainty is not included, so true uncertainty is larger.');
  }
}
function fc5Methods(host) {
  const { i, n, o, sub, sup, fr, r } = MX, t = i('t'), T = i('T'), h = i('h');
  const d = document.createElement('div'); d.className = 'fc5-methods';
  d.innerHTML = '<h3>How every forecast is derived, step by step</h3>' +
    '<p><b>1. Random walk with drift (benchmark).</b> Each month’s change is the average past change plus noise, so the forecast extends the last value along the average change, and uncertainty grows with the square root of the horizon.</p>' +
    EQN(r(sub(mlHat(i('y')), r(T, o('+'), h, o('|'), T)), o('='), sub(i('y'), T), o('+'), h, mlHat(i('μ')), o(','), o('&#8195;'), i('Var'), o('('), sub(i('e'), h), o(')'), o('='), h, sup(i('σ'), n('2'))), '(1)') +
    '<p><b>2. Autoregression AR(p).</b> Step 1: regress the series on its own p lags (p chosen by the BIC). Step 2: forecast recursively, replacing unknown future values by their forecasts. Step 3: write the model in moving-average form with weights ψ to get the error variance. A stationary AR converges to its long-run mean c/(1 − Σφ).</p>' +
    EQN(r(sub(mlHat(i('y')), r(T, o('+'), h)), o('='), i('c'), o('+'), mlSum(r(i('i'), o('='), n('1')), i('p')), sub(i('φ'), i('i')), sub(mlHat(i('y')), r(T, o('+'), h, o('−'), i('i'))), o(','), o('&#8195;'), i('Var'), o('('), sub(i('e'), h), o(')'), o('='), sup(i('σ'), n('2')), mlSum(r(i('j'), o('='), n('0')), r(h, o('−'), n('1'))), sup(sub(i('ψ'), i('j')), n('2'))), '(2)') +
    '<p><b>3. ARIMA.</b> The site’s specification for each series φ(L)(1 − L)<sup>d</sup>y<sub>t</sub> = θ(L)ε<sub>t</sub> is estimated by maximum likelihood with the Kalman filter, which also produces exact forecast variances. With d = 1 and no drift the forecast settles at a constant and its variance grows without limit.</p>' +
    EQN(r(i('φ'), o('('), i('L'), o(')'), sup(o('(1 − L)'), i('d')), sub(i('y'), t), o('='), i('θ'), o('('), i('L'), o(')'), sub(i('ε'), t)), '(3)') +
    '<p><b>4. Exponential smoothing with a damped trend, ETS(A,Ad,N).</b> A level and a slope are updated each period by the forecast error; the damping factor φ &lt; 1 makes the trend fade, so long-run forecasts flatten.</p>' +
    EQN(r(sub(i('ℓ'), t), o('='), sub(i('ℓ'), r(t, o('−'), n('1'))), o('+'), i('φ'), sub(i('b'), r(t, o('−'), n('1'))), o('+'), i('α'), sub(i('ε'), t), o(','), o('&#8195;'), sub(i('b'), t), o('='), i('φ'), sub(i('b'), r(t, o('−'), n('1'))), o('+'), i('β'), sub(i('ε'), t), o(','), o('&#8195;'), sub(mlHat(i('y')), r(T, o('+'), h)), o('='), sub(i('ℓ'), T), o('+'), o('('), i('φ'), o('+'), o('…'), o('+'), sup(i('φ'), h), o(')'), sub(i('b'), T)), '(4)') +
    '<p><b>5. Theta method.</b> Combines a fitted linear trend with simple exponential smoothing ℓ<sub>t</sub> = αy<sub>t</sub> + (1 − α)ℓ<sub>t−1</sub>; Hyndman and Billah (2003) show the standard version equals smoothing with a drift of half the trend slope. Seasonal series are deseasonalised first.</p>' +
    '<p><b>6. VAR.</b> Inflation, money growth, the call rate and Taka depreciation are forecast jointly from 12 lags of all four; the forecast-error covariance accumulates the moving-average matrices Φ<sub>i</sub>.</p>' +
    EQN(r(sub(i('𝐲'), t), o('='), i('𝐜'), o('+'), mlSum(r(i('i'), o('='), n('1')), i('p')), sub(i('𝐀'), i('i')), sub(i('𝐲'), r(t, o('−'), i('i'))), o('+'), sub(i('𝐮'), t), o(','), o('&#8195;'), sub(i('𝚺'), r(i('y'), o('('), h, o(')'))), o('='), mlSum(r(i('i'), o('='), n('0')), r(h, o('−'), n('1'))), sub(i('𝚽'), i('i')), sub(i('𝚺'), i('u')), sup(sub(i('𝚽'), i('i')), o('′'))), '(5)') +
    '<p><b>7. VECM.</b> Imports, exports and remittances (logs) are forecast with their long-run relation and adjustment speeds from the Model library; forecasts respect the cointegrating relation.</p>' +
    '<p><b>8. SARIMAX.</b> Inflation regressed on Taka depreciation (three months earlier) and the call rate (six months earlier) with ARMA errors; drivers already observed are used, later ones are held at their last values.</p>' +
    '<p><b>9. Ensemble.</b> A weighted average of the models with weights proportional to the inverse of each model’s back-test mean squared error; its variance adds the disagreement between models to their average variance.</p>' +
    EQN(r(sub(mlHat(i('y')), i('ens')), o('='), mlSum(i('m'), null), sub(i('w'), i('m')), sub(mlHat(i('y')), i('m')), o(','), o('&#8195;'), sub(i('w'), i('m')), o('∝'), fr(n('1'), sub(i('MSE'), i('m'))), o(','), o('&#8195;'), sup(sub(i('σ'), i('ens')), n('2')), o('='), mlSum(i('m'), null), sub(i('w'), i('m')), o('['), sup(sub(i('σ'), i('m')), n('2')), o('+'), o('('), sub(mlHat(i('y')), i('m')), o('−'), sub(mlHat(i('y')), i('ens')), sup(o(')'), n('2')), o(']')), '(6)') +
    '<p><b>10. From months to quarters and years.</b> Rates and prices are averaged over the period, flows (exports, imports, remittances) are summed, and stocks (reserves) take the period-end value; periods that are partly observed combine actual and forecast months. Ranges for aggregated periods add up the monthly bounds and are approximate; the simulation section gives exact fiscal-year distributions for the ARIMA model.</p>' +
    '<p><b>11. Validation and failure tests.</b> Rolling-origin back-tests (Tashman, 2000) re-estimate every model at each past date and score its forecasts by RMSE, MAE, bias, the coverage of its 80% range (Christoffersen, 1998) and the Diebold–Mariano test against the random walk with a HAC variance (Diebold & Mariano, 1995; Harvey, Leybourne & Newbold, 1997). Failure tests: Ljung–Box (1978), ARCH-LM (Engle, 1982), Jarque–Bera (1980), the OLS-CUSUM stability test (Ploberger & Krämer, 1992) and Chow (1960) break tests. Heterogeneity: Levene and Kruskal–Wallis (1952) tests across sub-periods. Simulation: 1,000 Monte Carlo paths from the estimated ARIMA model.</p>' +
    '<h3>References</h3><ol class="md-refs">' + [['Assimakopoulos, V., & Nikolopoulos, K. (2000). The theta model: A decomposition approach to forecasting. International Journal of Forecasting, 16(4), 521–530.', 'https://doi.org/10.1016/S0169-2070(00)00066-2'], ['Bates, J. M., & Granger, C. W. J. (1969). The combination of forecasts. Operational Research Quarterly, 20(4), 451–468.', 'https://doi.org/10.2307/3008764'], ['Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). Time series analysis: Forecasting and control (5th ed.). Wiley.', ''], ['Chow, G. C. (1960). Tests of equality between sets of coefficients in two linear regressions. Econometrica, 28(3), 591–605.', 'https://doi.org/10.2307/1910133'], ['Christoffersen, P. F. (1998). Evaluating interval forecasts. International Economic Review, 39(4), 841–862.', 'https://doi.org/10.2307/2527341'], ['Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. Journal of Business & Economic Statistics, 13(3), 253–263.', 'https://doi.org/10.1080/07350015.1995.10524599'], ['Engle, R. F. (1982). Autoregressive conditional heteroscedasticity with estimates of the variance of United Kingdom inflation. Econometrica, 50(4), 987–1007.', 'https://doi.org/10.2307/1912773'], ['Harvey, D., Leybourne, S., & Newbold, P. (1997). Testing the equality of prediction mean squared errors. International Journal of Forecasting, 13(2), 281–291.', 'https://doi.org/10.1016/S0169-2070(96)00719-4'], ['Hyndman, R. J., & Billah, B. (2003). Unmasking the Theta method. International Journal of Forecasting, 19(2), 287–290.', 'https://doi.org/10.1016/S0169-2070(01)00143-1'], ['Hyndman, R. J., Koehler, A. B., Ord, J. K., & Snyder, R. D. (2008). Forecasting with exponential smoothing: The state space approach. Springer.', 'https://doi.org/10.1007/978-3-540-71918-2'], ['Jarque, C. M., & Bera, A. K. (1980). Efficient tests for normality, homoscedasticity and serial independence of regression residuals. Economics Letters, 6(3), 255–259.', 'https://doi.org/10.1016/0165-1765(80)90024-5'], ['Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association, 47(260), 583–621.', 'https://doi.org/10.1080/01621459.1952.10483441'], ['Ljung, G. M., & Box, G. E. P. (1978). On a measure of lack of fit in time series models. Biometrika, 65(2), 297–303.', 'https://doi.org/10.1093/biomet/65.2.297'], ['Lütkepohl, H. (2005). New introduction to multiple time series analysis. Springer.', 'https://doi.org/10.1007/978-3-540-27752-1'], ['Makridakis, S., Spiliotis, E., & Assimakopoulos, V. (2020). The M4 Competition: 100,000 time series and 61 forecasting methods. International Journal of Forecasting, 36(1), 54–74.', 'https://doi.org/10.1016/j.ijforecast.2019.04.014'], ['Ploberger, W., & Krämer, W. (1992). The CUSUM test with OLS residuals. Econometrica, 60(2), 271–285.', 'https://doi.org/10.2307/2951597'], ['Tashman, L. J. (2000). Out-of-sample tests of forecasting accuracy: An analysis and review. International Journal of Forecasting, 16(4), 437–450.', 'https://doi.org/10.1016/S0169-2070(00)00065-0']].map(([tx, u]) => '<li>' + esc(tx) + (u ? ' <a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>' : '') + '</li>').join('') + '</ol><p class="note">References written from memory; check them through their DOI links.</p>';
  host.append(d);
}

/* ======================= v3.15: Reality check ======================= */
var RCS = { v: 'infl', o: 2024 * 12 + 11, s: 2010 * 12, h: 0, ms: ['ens', 'ar', 'holt', 'theta', 'rw', 'arima'], band: 'ar' };
var RC_LOG = { xr: 1, res: 1, remit: 1, exp: 1, imp: 1 }, RC_SEAS = { remit: 1, exp: 1, imp: 1 };
var RC_VARS = ['infl', 'food', 'nonfood', 'xr', 'res', 'remit', 'exp', 'imp', 'm2', 'pcredit', 'call'];
var RC_NAMES = { rw: 'No change (random walk)', rwd: 'Random walk with drift', mean: 'Training-period mean', ar: 'Autoregression (AR, BIC)', holt: 'Damped-trend exponential smoothing', theta: 'Theta method', snaive: 'Seasonal naive', arima: 'ARIMA (site specification)', ens: 'Ensemble (average of the others)' };
var RC_COL = { rw: '#9CA3AF', rwd: '#6B7280', mean: '#8E4EC6', ar: '#2F6FED', holt: '#12A594', theta: '#F5A524', snaive: '#AD7F58', arima: '#E5484D', ens: '#111827' };
function rcRng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rcSolve(A, b) {
  const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-12) return null; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]);
}
function rcAR(x, p, start) {
  const rows = [], ys = []; for (let t = start; t < x.length; t++) { const r = [1]; for (let i = 1; i <= p; i++) r.push(x[t - i]); rows.push(r); ys.push(x[t]); }
  const k = p + 1, XtX = Array.from({ length: k }, () => new Array(k).fill(0)), Xty = new Array(k).fill(0);
  rows.forEach((r, j) => { for (let a = 0; a < k; a++) { Xty[a] += r[a] * ys[j]; for (let b = 0; b < k; b++) XtX[a][b] += r[a] * r[b]; } });
  const be = rcSolve(XtX, Xty); if (!be) return null;
  const res = rows.map((r, j) => ys[j] - r.reduce((s, v, a) => s + v * be[a], 0)), n = res.length, s2 = res.reduce((s, e) => s + e * e, 0) / n;
  return { be, res, s2, bic: n * Math.log(s2) + k * Math.log(n), p };
}
function rcQuant(arr, q) { const a = arr.slice().sort((x, y) => x - y), i = (a.length - 1) * q, lo = Math.floor(i); return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo); }
function rcBands(paths, H) {
  const out = { lo80: [], hi80: [], lo95: [], hi95: [] };
  for (let h = 0; h < H; h++) { const c = paths.map(p => p[h]); out.lo80.push(rcQuant(c, 0.1)); out.hi80.push(rcQuant(c, 0.9)); out.lo95.push(rcQuant(c, 0.025)); out.hi95.push(rcQuant(c, 0.975)); }
  return out;
}
/* each model works on a working series w and returns forecasts of w; rebuild() maps w back to the original units */
function rcModels(y, key, H, which) {
  const lg = !!RC_LOG[key], seas = !!RC_SEAS[key], z = lg ? y.map(Math.log) : y.slice(), n = z.length, rng = rcRng(7), B = 300;
  let w, rebuild;
  if (seas) { w = []; for (let t = 12; t < n; t++) w.push(z[t] - z[t - 12]); rebuild = wf => { const zz = z.slice(); wf.forEach((v, h) => zz.push(v + zz[n + h - 12])); return zz.slice(n).map(Math.exp); }; }
  else if (lg) { w = []; for (let t = 1; t < n; t++) w.push(z[t] - z[t - 1]); rebuild = wf => { let c = z[n - 1]; return wf.map(v => Math.exp(c += v)); }; }
  else { w = z.slice(); rebuild = wf => wf.slice(); }
  const out = {}, m = w.length, simB = (step) => { const paths = []; for (let b = 0; b < B; b++) paths.push(rebuild(step())); return rcBands(paths, H); };
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  if (which.includes('ar') && m > 40) {
    let best = null; const pm = Math.min(12, Math.floor(m / 6));
    for (let p = 1; p <= pm; p++) { const f = rcAR(w, p, pm); if (f && (!best || f.bic < best.bic)) best = f; }
    if (best) {
      const run = shock => { const ww = w.slice(), f = []; for (let h = 0; h < H; h++) { let v = best.be[0]; for (let i = 1; i <= best.p; i++) v += best.be[i] * ww[ww.length - i]; if (shock) v += pick(best.res); ww.push(v); f.push(v); } return f; };
      out.ar = Object.assign({ mean: rebuild(run(false)), note: 'AR(' + best.p + ')' }, simB(() => run(true)));
    }
  }
  if (which.includes('holt') && m > 30) {
    let best = null;
    for (const a of [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) for (const b of [0.01, 0.05, 0.1, 0.2]) for (const ph of [0.8, 0.9, 0.98]) {
      let l = w[0], bb = w[1] - w[0], sse = 0; const e = [];
      for (let t = 1; t < m; t++) { const f = l + ph * bb, er = w[t] - f; e.push(er); sse += er * er; const l2 = f + a * er; bb = ph * bb + b * er; l = l2; }
      if (!best || sse < best.sse) best = { a, b, ph, l, bb, sse, e };
    }
    const run = shock => { let l = best.l, bb = best.bb; const f = []; for (let h = 0; h < H; h++) { const fc = l + best.ph * bb, er = shock ? pick(best.e) : 0, v = fc + er; f.push(v); l = fc + best.a * er; bb = best.ph * bb + best.b * er; } return f; };
    out.holt = Object.assign({ mean: rebuild(run(false)), note: 'α ' + best.a + ', β ' + best.b + ', φ ' + best.ph }, simB(() => run(true)));
  }
  if (which.includes('theta') && m > 30) {
    const tb = w.map((v, i) => i), tm = (m - 1) / 2, wm = w.reduce((s, v) => s + v, 0) / m;
    const slope = tb.reduce((s, t, i) => s + (t - tm) * (w[i] - wm), 0) / tb.reduce((s, t) => s + (t - tm) ** 2, 0);
    let best = null;
    for (const a of [0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) { let l = w[0], sse = 0; const e = []; for (let t = 1; t < m; t++) { const er = w[t] - l; e.push(er); sse += er * er; l += a * er; } if (!best || sse < best.sse) best = { a, l, sse, e }; }
    const run = shock => { let l = best.l; const f = []; for (let h = 0; h < H; h++) { const er = shock ? pick(best.e) : 0, v = l + slope / 2 * (h + 1) + er; f.push(v); l += best.a * er; } return f; };
    out.theta = Object.assign({ mean: rebuild(run(false)), note: 'α ' + best.a + ', drift ' + nf(slope / 2, 4) }, simB(() => run(true)));
  }
  if (which.includes('rw') || which.includes('rwd')) {
    const d = []; for (let t = 1; t < n; t++) d.push(z[t] - z[t - 1]); const mu = d.reduce((s, v) => s + v, 0) / d.length, sd = Math.sqrt(d.reduce((s, v) => s + (v - mu) ** 2, 0) / (d.length - 1));
    const back = v => lg ? Math.exp(v) : v, mk = dr => { const o = { mean: [], lo80: [], hi80: [], lo95: [], hi95: [] }; for (let h = 1; h <= H; h++) { const c = z[n - 1] + dr * h, s = sd * Math.sqrt(h); o.mean.push(back(c)); o.lo80.push(back(c - 1.2816 * s)); o.hi80.push(back(c + 1.2816 * s)); o.lo95.push(back(c - 1.96 * s)); o.hi95.push(back(c + 1.96 * s)); } return o; };
    if (which.includes('rw')) out.rw = mk(0); if (which.includes('rwd')) out.rwd = mk(mu);
  }
  if (which.includes('mean') && !lg) { const mu = y.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(y.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1)); out.mean = { mean: new Array(H).fill(mu), lo80: new Array(H).fill(mu - 1.2816 * sd), hi80: new Array(H).fill(mu + 1.2816 * sd), lo95: new Array(H).fill(mu - 1.96 * sd), hi95: new Array(H).fill(mu + 1.96 * sd) }; }
  if (which.includes('snaive') && seas && n > 24) { const o = { mean: [] }; for (let h = 1; h <= H; h++) o.mean.push(y[n - 12 * Math.ceil(h / 12) + ((h - 1) % 12)]); out.snaive = o; }
  return out;
}
function rcData(key) {
  const p = PK(key); if (!p) return null;
  const ks = [], v = []; for (let j = 0; j < p.v.length; j++) if (p.v[j] != null) { ks.push(p.k0 + j); v.push(p.v[j]); }
  return { ks, v, map: new Map(ks.map((k, i) => [k, v[i]])) };
}
function rcRun(key, o, s, H, which) {
  const D_ = rcData(key); if (!D_) return null;
  const tr = []; for (let k = s; k <= o; k++) { if (!D_.map.has(k)) { const a = D_.ks.filter(q => q < k).pop(), b = D_.ks.find(q => q > k); if (a == null || b == null || b - a > 4) return { err: 'The training window has a gap in the data at ' + fc5Lab(k, 'M') + '.' }; tr.push(D_.map.get(a) + (D_.map.get(b) - D_.map.get(a)) * (k - a) / (b - a)); } else tr.push(D_.map.get(k)); }
  if (tr.length < 48) return { err: 'Choose a training window of at least four years.' };
  const last = D_.ks[D_.ks.length - 1], Hev = H ? Math.min(H, last - o) : last - o; if (Hev < 1) return { err: 'No actual data after this origin yet.' };
  const Hf = Math.max(Hev, 12);
  const mods = rcModels(tr, key, Hf, which);
  const A = (BD.models2 && BD.models2.rc_arima || {})[key];
  if (which.includes('arima') && A && s <= A.start && o >= A.k0 && o - A.k0 < A.fc.length && A.fc[o - A.k0]) {
    const i = o - A.k0; mods.arima = { mean: A.fc[i].slice(0, Hf), lo80: A.lo80[i].slice(0, Hf), hi80: A.hi80[i].slice(0, Hf), note: 'estimated on data from ' + fc5Lab(A.start, 'M') };
  }
  const base = Object.keys(mods);
  if (which.includes('ens') && base.length > 1) { const L = mods[base[0]].mean.length; mods.ens = { mean: Array.from({ length: L }, (_, h) => base.reduce((s_, m) => s_ + mods[m].mean[h], 0) / base.length) }; }
  const act = Array.from({ length: Hev }, (_, h) => D_.map.has(o + 1 + h) ? D_.map.get(o + 1 + h) : null), y0 = tr[tr.length - 1];
  const stats_ = {}, rwm = mods.rw ? mods.rw.mean : null;
  Object.entries(mods).forEach(([m, f]) => {
    const e = [], pe = [], ae = [], sm = [], dir = []; let c80 = 0, c95 = 0, nb = 0, nb95 = 0, mx = null;
    act.forEach((a, h) => {
      if (a == null || f.mean[h] == null) return; const er = a - f.mean[h]; e.push(er); ae.push(Math.abs(er));
      if (Math.abs(a) > 1e-9) pe.push(er / Math.abs(a) * 100); sm.push(2 * Math.abs(er) / (Math.abs(a) + Math.abs(f.mean[h]) || 1) * 100);
      dir.push(Math.sign(f.mean[h] - y0) === Math.sign(a - y0)); if (!mx || Math.abs(er) > Math.abs(mx[1])) mx = [o + 1 + h, er];
      if (f.lo80 && f.lo80[h] != null) { nb++; if (a >= f.lo80[h] && a <= f.hi80[h]) c80++; } if (f.lo95 && f.lo95[h] != null) { nb95++; if (a >= f.lo95[h] && a <= f.hi95[h]) c95++; }
    });
    if (!e.length) return;
    const avg = a => a.reduce((s_, v) => s_ + v, 0) / a.length, rmse = Math.sqrt(avg(e.map(v => v * v)));
    let u2 = null; if (rwm) { const er = act.map((a, h) => a == null ? null : a - rwm[h]).filter(v => v != null); const r0 = Math.sqrt(avg(er.map(v => v * v))); u2 = r0 > 0 ? rmse / r0 : null; }
    const lastH = act.length - 1 - [...act].reverse().findIndex(a => a != null);
    stats_[m] = { n: e.length, me: avg(e), mpe: pe.length ? avg(pe) : null, mae: avg(ae), mape: pe.length ? avg(pe.map(Math.abs)) : null, smape: avg(sm), rmse, u2, mx, dir: avg(dir.map(Number)) * 100, c80: nb ? c80 / nb * 100 : null, c95: nb95 ? c95 / nb95 * 100 : null, endDev: act[lastH] - f.mean[lastH], endPct: Math.abs(act[lastH]) > 1e-9 ? (act[lastH] - f.mean[lastH]) / Math.abs(act[lastH]) * 100 : null, endK: o + 1 + lastH };
  });
  return { D: D_, tr, o, s, Hev, act, mods, stats: stats_, y0 };
}
function labRc(body) {
  const s = sec(body, 'Reality check: how forecasts compared with what actually happened', 'Pick a forecast origin and a training window; every model is estimated on that window only, and its forecasts are compared month by month with the data published afterwards.', 'rc');
  const ctl = document.createElement('div'); ctl.className = 'fc5-ctl'; s.append(ctl);
  const out = document.createElement('div'); s.append(out);
  const draw = () => {
    const D_ = rcData(RCS.v); if (!D_) return;
    const last = D_.ks[D_.ks.length - 1], first = D_.ks[0];
    if (RCS.o >= last) RCS.o = last - 1; if (RCS.o < first + 60) RCS.o = first + 60;
    if (RCS.s < first) RCS.s = first; if (RCS.s > RCS.o - 48) RCS.s = Math.max(first, RCS.o - 48);
    const origins = []; for (let k = Math.max(first + 60, 2015 * 12); k < last; k++) origins.push(k);
    const starts = []; for (let yy = Math.floor(first / 12); yy * 12 <= RCS.o - 48; yy++) starts.push(Math.max(yy * 12, first));
    const avail = ['ens', 'ar', 'holt', 'theta', 'rw', 'rwd', 'arima'].concat(RC_LOG[RCS.v] ? [] : ['mean']).concat(RC_SEAS[RCS.v] ? ['snaive'] : []);
    ctl.innerHTML = '<label>Variable <select data-k="v">' + RC_VARS.map(k => '<option value="' + k + '"' + (k === RCS.v ? ' selected' : '') + '>' + esc((BD.series[k] || {}).label || k) + '</option>').join('') + '</select></label>' +
      '<label>Forecast origin (last month used) <select data-k="o">' + origins.map(k => '<option value="' + k + '"' + (k === RCS.o ? ' selected' : '') + '>' + fc5Lab(k, 'M') + '</option>').join('') + '</select></label>' +
      '<label>Training data from <select data-k="s">' + [...new Set(starts)].map(k => '<option value="' + k + '"' + (k === RCS.s ? ' selected' : '') + '>' + fc5Lab(k, 'M') + '</option>').join('') + '</select></label>' +
      '<label>Months compared <select data-k="h">' + [[0, 'All published so far'], [6, '6'], [12, '12'], [18, '18'], [24, '24']].map(([a, b]) => '<option value="' + a + '"' + (a === RCS.h ? ' selected' : '') + '>' + b + '</option>').join('') + '</select></label>' +
      '<label>Range for <select data-k="band"><option value="">none</option>' + avail.filter(m => m !== 'ens' && m !== 'snaive').map(m => '<option value="' + m + '"' + (m === RCS.band ? ' selected' : '') + '>' + esc(RC_NAMES[m]) + '</option>').join('') + '</select></label>' +
      '<div class="fc5-ms">' + avail.map(m => '<label class="fc5-chip" style="--c:' + RC_COL[m] + '"><input type="checkbox" data-m="' + m + '"' + (RCS.ms.includes(m) ? ' checked' : '') + '> ' + esc(RC_NAMES[m]) + '</label>').join('') + '</div>';
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    const which = RCS.ms.filter(m => avail.includes(m)).concat(RCS.band && !RCS.ms.includes(RCS.band) ? [RCS.band] : []).concat(['rw']);
    const R = rcRun(RCS.v, RCS.o, RCS.s, RCS.h, which);
    if (!R || R.err) { out.innerHTML = '<p class="note">' + esc(R ? R.err : 'No data.') + '</p>'; return; }
    rcRender(out, R);
  };
  ctl.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.m) { const on = new Set(RCS.ms); t.checked ? on.add(t.dataset.m) : on.delete(t.dataset.m); RCS.ms = [...on]; }
    else if (t.dataset.k) { const k = t.dataset.k; RCS[k] = (k === 'v' || k === 'band') ? t.value : +t.value; }
    draw();
  });
  draw();
  rcMethods(s);
}
function rcRender(out, R) {
  const key = RCS.v, se = BD.series[key] || {}, unit = se.unit || '', dec = /US\$|Tk crore/.test(unit) ? 0 : 2, shown = RCS.ms.filter(m => R.mods[m]);
  const pre = R.D.ks.filter(k => k > RCS.o - 24 && k <= RCS.o), evk = Array.from({ length: R.Hev }, (_, h) => RCS.o + 1 + h), all = pre.concat(evk), labels = all.map(k => fc5Lab(k, 'M'));
  const actual = all.map(k => R.D.map.has(k) ? R.D.map.get(k) : null), at = k => k - RCS.o - 1;
  const series = [S('Actual: ' + (se.label || key), actual, { w: 2.6, color: '#111827' })];
  shown.forEach(m => series.push(S(RC_NAMES[m], all.map(k => k === RCS.o ? R.D.map.get(k) : (k > RCS.o ? R.mods[m].mean[at(k)] : null)), { w: m === 'ens' ? 2.4 : 1.7, dash: m !== 'ens', color: RC_COL[m] })));
  const B_ = RCS.band && R.mods[RCS.band];
  if (B_ && B_.lo80) [['lo80', '80% lower', 1.2], ['hi80', '80% upper', 1.2]].concat(B_.lo95 ? [['lo95', '95% lower', 0.8], ['hi95', '95% upper', 0.8]] : []).forEach(([fl, nm, wd]) => series.push(S(RC_NAMES[RCS.band] + ', ' + nm, all.map(k => k > RCS.o ? B_[fl][at(k)] : (k === RCS.o ? R.D.map.get(k) : null)), { w: wd, dash: true, color: RC_COL[RCS.band] })));
  const g = grid(out);
  figure(g, { wide: true, title: (se.label || key) + ': forecasts made in ' + fc5Lab(RCS.o, 'M') + ' against the data published since', sub: unit + '. Models estimated on ' + fc5Lab(RCS.s, 'M') + ' to ' + fc5Lab(RCS.o, 'M') + ' only; nothing after the origin is used.', h: 380, source: 'Bangladesh Bank; BBS; model estimates.', render: TH => tsOption(TH, labels, series, { y1: unit, dec }) });
  const st = R.stats, ms = Object.keys(st).filter(m => shown.includes(m) || m === 'rw'), best = ms.slice().sort((a, b) => st[a].rmse - st[b].rmse)[0];
  const f2 = (v, d) => v == null || !isFinite(v) ? '–' : nf(v, d), sg = v => v == null || !isFinite(v) ? '–' : (v > 0 ? '+' : '') + nf(v, dec === 0 ? 0 : 2);
  tableWrap(out, '<table><thead><tr><th>Model</th><th class="num">Months</th><th class="num">Mean error (bias)</th><th class="num">Mean % error</th><th class="num">MAE</th><th class="num">MAPE, %</th><th class="num">sMAPE, %</th><th class="num">RMSE</th><th class="num">Theil U (vs no change)</th><th class="num">Direction right</th><th class="num">Inside 80% range</th><th class="num">Inside 95% range</th><th class="num">Largest miss</th><th class="num">Last month: deviation (%)</th></tr></thead><tbody>' +
    ms.map(m => { const x = st[m]; return '<tr><th scope="row">' + esc(RC_NAMES[m]) + (R.mods[m].note ? '<br><small class="note">' + esc(R.mods[m].note) + '</small>' : '') + '</th><td class="num">' + x.n + '</td><td class="num">' + sg(x.me) + '</td><td class="num">' + (x.mpe == null ? '–' : (x.mpe > 0 ? '+' : '') + nf(x.mpe, 1) + '%') + '</td><td class="num">' + f2(x.mae, dec === 0 ? 0 : 2) + '</td><td class="num">' + f2(x.mape, 1) + '</td><td class="num">' + f2(x.smape, 1) + '</td><td class="num"' + (m === best ? ' style="font-weight:700"' : '') + '>' + f2(x.rmse, dec === 0 ? 0 : 3) + '</td><td class="num">' + f2(x.u2, 2) + '</td><td class="num">' + nf(x.dir, 0) + '%</td><td class="num">' + (x.c80 == null ? '–' : nf(x.c80, 0) + '%') + '</td><td class="num">' + (x.c95 == null ? '–' : nf(x.c95, 0) + '%') + '</td><td class="num">' + sg(x.mx[1]) + ' (' + fc5Lab(x.mx[0], 'M') + ')</td><td class="num">' + sg(x.endDev) + (x.endPct == null ? '' : ' (' + (x.endPct > 0 ? '+' : '') + nf(x.endPct, 1) + '%)') + '</td></tr>'; }).join('') + '</tbody></table>',
    tcap('Deviation summary: actual minus forecast'), 'Positive errors mean the actual value was above the forecast (the model under-predicted). Bold: lowest RMSE. Theil U below 1 means better than assuming no change. Direction right: share of months in which the model got the direction of change from the origin value right. MAPE is unreliable when actual values are near zero; sMAPE is bounded.');
  // monthly deviations
  tableWrap(out, '<table><thead><tr><th>Month</th><th class="num">Actual</th>' + shown.map(m => '<th class="num">' + esc(RC_NAMES[m]) + '</th><th class="num">Deviation (%)</th>').join('') + '</tr></thead><tbody>' +
    evk.map((k, h) => { const a = R.act[h]; return '<tr><th scope="row">' + fc5Lab(k, 'M') + '</th><td class="num">' + (a == null ? '–' : nf(a, dec)) + '</td>' + shown.map(m => { const f = R.mods[m].mean[h], d = a == null ? null : a - f; return '<td class="num">' + nf(f, dec) + '</td><td class="num">' + (d == null ? '–' : sg(d) + (Math.abs(a) > 1e-9 ? ' (' + (d > 0 ? '+' : '') + nf(d / Math.abs(a) * 100, 1) + '%)' : '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>',
    tcap('Month by month: forecast, actual and deviation'), unit + '. Deviation = actual − forecast; percentage of the actual value in brackets.');
  // annual summary: calendar and fiscal years
  const rule = { res: 'last', remit: 'sum', exp: 'sum', imp: 'sum' }[key] || 'mean', ann = [];
  ['CY', 'FY'].forEach(fr => {
    const hist = R.D.ks.filter(k => k <= RCS.o).map(k => [k, R.D.map.get(k), false]), act_ = R.D.ks.map(k => [k, R.D.map.get(k), k > RCS.o]);
    const aAgg = new Map(fc5Agg(act_, 'M', fr, rule).filter(x => x[2] > 0).map(x => [x[0], x[1]]));
    shown.forEach(m => {
      const fp_ = hist.concat(R.mods[m].mean.map((v, h) => [RCS.o + 1 + h, v, true]));
      fc5Agg(fp_, 'M', fr, rule).filter(x => x[2] > 0 && aAgg.has(x[0])).forEach(x => ann.push([fr, x[0], m, x[1], aAgg.get(x[0]), x[2]]));
    });
  });
  if (ann.length) {
    const ids = [...new Set(ann.map(r => r[0] + ':' + r[1]))];
    tableWrap(out, '<table><thead><tr><th>Period</th><th class="num">Actual</th>' + shown.map(m => '<th class="num">' + esc(RC_NAMES[m]) + '</th>').join('') + '</tr></thead><tbody>' +
      ids.map(id => { const [fr, pid] = id.split(':'), rr = ann.filter(r => r[0] === fr && String(r[1]) === pid), a = rr[0][4]; return '<tr><th scope="row">' + (fr === 'FY' ? 'FY' + pid : 'Calendar ' + pid) + '<br><small class="note">' + rr[0][5] + ' forecast months</small></th><td class="num">' + nf(a, dec) + '</td>' + shown.map(m => { const x = rr.find(r => r[2] === m); if (!x) return '<td class="num">–</td>'; const d = a - x[3]; return '<td class="num">' + nf(x[3], dec) + '<br><small>' + sg(d) + (Math.abs(a) > 1e-9 ? ' (' + (d > 0 ? '+' : '') + nf(d / Math.abs(a) * 100, 1) + '%)' : '') + '</small></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>',
      tcap('Annual summary: forecast against actual for each completed year'), (rule === 'sum' ? 'Annual totals' : rule === 'last' ? 'End-of-year values' : 'Annual averages') + ' (' + unit + '). Years partly before the origin combine actual months with forecasts. Under each forecast: deviation (actual − forecast) and its percentage of the actual value.');
  }
  // robustness: other training windows and other origins
  const rob = [], wins = [2010, 2015, 2018, 2020].map(y_ => y_ * 12).filter(k => k <= RCS.o - 48 && k >= R.D.ks[0]);
  const runs = wins.map(k => ['Training from ' + fc5Lab(k, 'M') + ', origin ' + fc5Lab(RCS.o, 'M'), RCS.o, k]).concat([-6, -3, 3].map(d => ['Training from ' + fc5Lab(RCS.s, 'M') + ', origin ' + fc5Lab(RCS.o + d, 'M'), RCS.o + d, RCS.s]));
  runs.forEach(([lab, o_, s_]) => { if (o_ >= R.D.ks[R.D.ks.length - 1] || s_ > o_ - 48) return; const Rr = rcRun(RCS.v, o_, s_, RCS.h || 12, shown.filter(m => m !== 'arima').concat(['rw'])); if (Rr && !Rr.err) rob.push([lab, Rr.stats]); });
  if (rob.length) {
    const rm = shown.filter(m => m !== 'arima');
    tableWrap(out, '<table><thead><tr><th>Setting</th>' + rm.map(m => '<th class="num">' + esc(RC_NAMES[m]) + '</th>').join('') + '<th>Best</th></tr></thead><tbody>' + rob.map(([lab, st_]) => { const b_ = rm.filter(m => st_[m]).sort((a, b) => st_[a].rmse - st_[b].rmse)[0]; return '<tr><th scope="row">' + esc(lab) + '</th>' + rm.map(m => '<td class="num"' + (m === b_ ? ' style="font-weight:700"' : '') + '>' + (st_[m] ? nf(st_[m].rmse, dec === 0 ? 0 : 3) + '<br><small>' + (st_[m].mape == null ? '' : 'MAPE ' + nf(st_[m].mape, 1) + '%') + '</small>' : '–') + '</td>').join('') + '<td>' + esc(RC_NAMES[b_] || '–') + '</td></tr>'; }).join('') + '</tbody></table>',
      tcap('Robustness: the same check with other training windows and origins'), 'RMSE (and MAPE) over ' + (RCS.h || 12) + ' months after each origin. A model whose rank changes from row to row is fragile; one that stays near the top is robust.');
    var robBest = {}; rob.forEach(([, st_]) => { const b_ = rm.filter(m => st_[m]).sort((a, b) => st_[a].rmse - st_[b].rmse)[0]; if (b_) robBest[b_] = (robBest[b_] || 0) + 1; });
  }
  // plain-language summary
  const x = st[best], e = st.ens, rw = st.rw;
  const lines = ['Over ' + x.n + ' months after ' + fc5Lab(RCS.o, 'M') + ', the most accurate model was <b>' + esc(RC_NAMES[best]) + '</b> (RMSE ' + nf(x.rmse, dec === 0 ? 0 : 3) + ' ' + esc(unit) + (x.mape != null ? ', average absolute miss ' + nf(x.mape, 1) + '% of the actual value' : '') + ').',
    'It ' + (x.me > 0 ? '<b>under-predicted</b>' : x.me < 0 ? '<b>over-predicted</b>' : 'had no average bias') + (x.me !== 0 ? ' on average by ' + nf(Math.abs(x.me), 2) + ' ' + esc(unit) + (x.mpe != null ? ' (' + nf(Math.abs(x.mpe), 2) + '% of the actual values)' : '') : '') + '; its largest miss was ' + sg(x.mx[1]) + ' in ' + fc5Lab(x.mx[0], 'M') + '.',
    rw && best !== 'rw' ? 'Against simply assuming no change, it ' + (x.u2 != null && x.u2 < 1 ? 'reduced the error by ' + nf((1 - x.u2) * 100, 0) + '% (Theil U ' + nf(x.u2, 2) + ').' : 'did not do better (Theil U ' + nf(x.u2, 2) + ').') : 'Assuming no change was the best forecast in this period: the series barely moved, or moved in ways no model anticipated.',
    e ? 'The ensemble average missed by ' + nf(e.rmse, dec === 0 ? 0 : 3) + ' (RMSE) and was ' + (e.rmse <= x.rmse * 1.1 ? 'close to the best model, a reminder that combining models is a safe default.' : 'worse than the best model in this period.') : '',
    (R.mods[RCS.band] && st[RCS.band] && st[RCS.band].c80 != null) ? 'The ' + esc(RC_NAMES[RCS.band]) + ' 80% range contained ' + nf(st[RCS.band].c80, 0) + '% of outcomes' + (st[RCS.band].c80 < 60 ? ': too narrow, so uncertainty was understated.' : st[RCS.band].c80 > 95 ? ': wider than needed.' : ': well calibrated.') : '',
    typeof robBest !== 'undefined' && Object.keys(robBest).length ? 'Robustness: across ' + rob.length + ' alternative windows and origins, the most frequent winner was <b>' + esc(RC_NAMES[Object.entries(robBest).sort((a, b) => b[1] - a[1])[0][0]]) + '</b>' + (Object.keys(robBest).length > 2 ? '; winners changed with the setting, so no single model dominates.' : '.') : ''].filter(Boolean);
  out.insertAdjacentHTML('beforeend', '<div class="card"><h3>Summary: reality against the forecasts</h3><ul class="ol-list">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul></div>');
}
function rcMethods(host) {
  const d = document.createElement('div'); d.className = 'fc5-methods';
  d.innerHTML = '<h3>How the reality check works</h3><p>For the chosen origin, every model is estimated only on the training window (the origin month is its last observation), forecasts are made for the following months, and they are compared with the values published since. Error e<sub>t</sub> = actual − forecast; percentage error p<sub>t</sub> = 100·e<sub>t</sub>/|actual|.</p>' +
    '<p>Mean error (bias) = average of e<sub>t</sub>; MAE = average of |e<sub>t</sub>|; RMSE = √(average of e<sub>t</sub>²); MAPE = average of |p<sub>t</sub>|; sMAPE = average of 200·|e<sub>t</sub>|/(|actual| + |forecast|); Theil’s U = RMSE of the model ÷ RMSE of the no-change forecast; direction accuracy = share of months where the forecast and the outcome moved the same way from the origin value; coverage = share of outcomes inside the model’s 80% or 95% range.</p>' +
    '<p>Models: AR (order by BIC, on levels for rates, monthly log changes for the exchange rate and reserves, and year-on-year log changes for exports, imports and remittances, which removes seasonality); damped-trend exponential smoothing and the Theta method on the same working series, with parameters chosen by minimising in-sample one-step errors; random walks; the training-period mean; seasonal naive; ARIMA with the site’s specification (estimated in the build on the full history from its start, so it appears only when the training window starts there). Ranges come from 300 bootstrap paths that resample each model’s own past errors (no normality assumed), except the random walks and ARIMA (analytical).</p>' +
    '<p class="note">Data are the latest published vintage: later revisions are already included, so this is a pseudo-out-of-sample test; with real-time data, errors would usually be somewhat larger.</p>';
  host.append(d);
}

/* ======================= v3.15: Nowcasting ======================= */
var NCS = { v: 'm2' };
var NC_COL = { 'Naive (last published value)': '#9CA3AF', 'Naive (last published quarter)': '#9CA3AF', 'Own-lag autoregression': '#2F6FED', 'Best single-indicator bridge': '#F5A524', 'Pooled: all indicator combinations': '#111827', 'Selected: top-5 combinations': '#E5484D', 'Factor-augmented bridge (2 principal components)': '#12A594', 'Mixed-frequency dynamic factor model': '#8E4EC6', 'Ridge regression (all indicators)': '#0091FF', 'Lasso (all indicators)': '#AD7F58', 'U-MIDAS (best indicator, three monthly values)': '#D6409F' };
var NC_LEVEL = { 'Naive (last published value)': 1, 'Naive (last published quarter)': 1, 'Own-lag autoregression': 2, 'Best single-indicator bridge': 3, 'Pooled: all indicator combinations': 4, 'Selected: top-5 combinations': 4, 'Factor-augmented bridge (2 principal components)': 5, 'Mixed-frequency dynamic factor model': 6, 'U-MIDAS (best indicator, three monthly values)': 6, 'Ridge regression (all indicators)': 7, 'Lasso (all indicators)': 7 };
function ncScores(host, sc, unit, n, from, dec) {
  const names = Object.keys(sc).sort((a, b) => sc[a][0] - sc[b][0]), ar = sc['Own-lag autoregression'], best = names[0];
  tableWrap(host, '<table><thead><tr><th>Method</th><th class="num">Level</th><th class="num">RMSE</th><th class="num">MAE</th><th class="num">Bias</th><th class="num">Gain over own-lag model</th><th class="num">Tests</th></tr></thead><tbody>' +
    names.map(m => '<tr><th scope="row">' + esc(m) + '</th><td class="num">' + (NC_LEVEL[m] || '–') + '</td><td class="num"' + (m === best ? ' style="font-weight:700"' : '') + '>' + nf(sc[m][0], dec) + '</td><td class="num">' + nf(sc[m][1], dec) + '</td><td class="num">' + nf(sc[m][2], dec) + '</td><td class="num">' + (ar && m !== 'Own-lag autoregression' ? (ar[0] > sc[m][0] ? '+' : '') + nf((1 - sc[m][0] / ar[0]) * 100, 0) + '%' : '–') + '</td><td class="num">' + sc[m][3] + '</td></tr>').join('') + '</tbody></table>',
    tcap('Pseudo-real-time validation'), unit + '. Scored on ' + n + ' periods from ' + esc(from) + ' (combinations were ranked on the preceding period, so “top-5” is a genuine out-of-sample choice); the factor model is re-estimated at 12 past dates. Gain = reduction in RMSE relative to the own-lag model.');
  return best;
}
function labNowcast(body) {
  const N = (BD && BD.models2 && BD.models2.nowcast) || null;
  const s = sec(body, 'Nowcasting: estimating the present before it is published', 'Seven levels of methods, from the last published value to a mixed-frequency dynamic factor model, applied to every indicator and to quarterly GDP, with every combination of faster-published indicators tested.', 'nowcast');
  if (!N) { s.insertAdjacentHTML('beforeend', '<p class="note">Nowcasting results are not in this data build.</p>'); return; }
  s.insertAdjacentHTML('beforeend', '<p>Bangladesh’s statistics arrive on different dates: inflation is the first monthly release, money and credit come about two months later, tax revenue and industrial production later still, and GDP a quarter or more after the quarter ends. This uneven edge of the data (the “ragged edge”) is what nowcasting exploits: indicators already published for a month carry information about indicators that are not yet out.</p>');
  // publication calendar
  const rg = N.ragged, g0 = grid(s);
  figure(g0, { ts: false, title: 'Publication calendar: months behind the latest release', sub: 'Latest data: ' + N.kmax + '. Each bar shows how many months an indicator lags the fastest release', h: Math.max(300, rg.length * 18), source: 'Bangladesh Bank; BBS; site data.', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 30, top: 10, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true }, xAxis: { type: 'value', name: 'months behind', axisLabel: { color: TH.muted, fontSize: 10 }, minInterval: 1 }, yAxis: { type: 'category', inverse: true, data: rg.map(r => r[1] + ' (' + r[2] + ')'), axisLabel: { color: TH.muted, fontSize: 10 } }, series: [{ type: 'bar', data: rg.map(r => ({ value: r[3], itemStyle: { color: ['#12A594', '#2F6FED', '#F5A524', '#E5484D'][Math.min(r[3], 3)] } })), barMaxWidth: 12, label: { show: true, position: 'right', fontSize: 9, color: TH.muted } }] }) });
  const dl = (N.dfm && N.dfm.loadings) || [];
  if (dl.length) figure(g0, { ts: false, title: 'Dynamic factor model: how strongly each indicator loads on the common factor', sub: 'Loadings on the single monthly factor (standardised data); GDP enters through its quarterly aggregation', h: Math.max(300, dl.length * 18), source: 'Model estimates (Kalman filter, EM algorithm).', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 30, top: 10, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true }, xAxis: { type: 'value', axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: { type: 'category', inverse: true, data: dl.map(r => (rg.find(x => x[0] === r[0]) || [0, r[0]])[1]), axisLabel: { color: TH.muted, fontSize: 10 } }, series: [{ type: 'bar', data: dl.map(r => ({ value: r[1], itemStyle: { color: r[1] >= 0 ? '#2F6FED' : '#E5484D' } })), barMaxWidth: 12, label: { show: true, position: 'right', fontSize: 9, color: TH.muted, formatter: q => nf(q.value, 2) } }] }) });
  // the ladder
  tableWrap(s, '<table><thead><tr><th class="num">Level</th><th>Method</th><th>What it uses</th><th>Strength</th><th>Weakness</th></tr></thead><tbody>' + [
    [1, 'Naive', 'The last published value', 'Unbeatable for very persistent series', 'Ignores all new information'],
    [2, 'Own-lag autoregression', 'The indicator’s own recent values', 'Captures momentum and mean reversion', 'Ignores other indicators'],
    [3, 'Bridge equation', 'One faster-published indicator plus the own lag', 'Simple, interpretable link (Baffigi et al., 2004)', 'Relies on one indicator'],
    [4, 'Combinations', 'Every subset of 1–3 faster indicators, pooled or with the top five selected', 'Robust; avoids betting on one indicator (Kuzin et al., 2013)', 'Many models; selection can overfit'],
    [5, 'Factor-augmented bridge', 'Principal components of all faster indicators', 'Summarises many indicators (Stock & Watson, 2002)', 'Factors are statistical, not economic'],
    [6, 'Mixed-frequency dynamic factor model and MIDAS', 'All monthly indicators and quarterly GDP in one state-space model; MIDAS uses each month separately', 'Handles the ragged edge and mixed frequencies exactly (Bańbura & Modugno, 2014; Foroni et al., 2015)', 'Heavier to estimate; one factor may be too few'],
    [7, 'Machine learning', 'Ridge and lasso on all indicators, penalty chosen on earlier data', 'Handles many correlated predictors (Babii et al., 2022)', 'Linear; tuning needs care']].map(r => '<tr><td class="num">' + r[0] + '</td><th scope="row">' + esc(r[1]) + '</th><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td></tr>').join('') + '</tbody></table>', tcap('From simplest to most advanced'), 'Every method is validated in pseudo-real time: at each past month, data are cut to reproduce today’s publication pattern, models are estimated only on what would have been available, and the nowcast is compared with the value later published.');
  // target selector
  const tk = Object.keys(N.targets).concat(['gdp']);
  const ctl = document.createElement('div'); ctl.className = 'fc5-ctl'; s.append(ctl);
  const out = document.createElement('div'); s.append(out);
  const draw = () => {
    ctl.innerHTML = '<label>Indicator to nowcast <select data-k="v">' + tk.map(k => '<option value="' + k + '"' + (k === NCS.v ? ' selected' : '') + '>' + esc(k === 'gdp' ? 'Real GDP growth (quarterly)' : N.targets[k].label) + '</option>').join('') + '</select></label>';
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    if (NCS.v === 'gdp') ncGdp(out, N); else ncTarget(out, N, NCS.v);
  };
  ctl.addEventListener('change', e => { if (e.target.dataset.k) { NCS.v = e.target.value; draw(); } });
  draw();
  ncLit(s);
}
function ncTarget(out, N, y) {
  const T = N.targets[y], dec = 3;
  if (!T.by_j.length) { out.innerHTML = '<p class="note">' + esc(T.label) + ' has too short a history (it starts in 2023) for the nowcasting ladder; it is used only as information in the factor model.</p>'; return; }
  if (!T.gap) out.insertAdjacentHTML('beforeend', '<div class="card"><p><b>' + esc(T.label) + ' is among the first indicators published</b> (latest: ' + esc(T.end) + '). No other indicator is available earlier for the same month, so nowcasting it reduces to forecasting one month ahead; the table compares the naive and own-lag methods for that task.</p></div>');
  T.by_j.forEach(b => {
    if (T.gap) out.insertAdjacentHTML('beforeend', '<h3>Nowcast for ' + esc(b.month) + ' (' + b.j + ' month' + (b.j > 1 ? 's' : '') + ' after the latest release, ' + esc(T.end) + ')</h3><p class="note">Indicators already published for ' + esc(b.month) + ': ' + (b.usable.length ? esc(b.usable.map(u => u[1]).join(', ')) : 'none') + '. Combinations tested: ' + b.n_combos + '.</p>');
    const best = ncScores(out, b.scores, T.unit, b.n_test, b.test_from || '', dec);
    const now = b.now || {}, nk = Object.keys(now);
    if (nk.length) {
      const p = PK(y === 'imp_g' || y === 'res_g' ? null : y), hist = [];
      if (p) { for (let j = Math.max(0, p.v.length - 24); j < p.v.length; j++) if (p.v[j] != null) hist.push([p.k0 + j, p.v[j]]); }
      tableWrap(out, '<table><thead><tr><th>Method</th><th class="num">Nowcast for ' + esc(b.month) + '</th><th class="num">Validation RMSE</th></tr></thead><tbody>' + nk.sort((a, c) => ((b.scores[a] || [9e9])[0]) - ((b.scores[c] || [9e9])[0])).map(m => '<tr><th scope="row">' + esc(m) + (m === best ? ' <small>(most accurate in validation)</small>' : '') + '</th><td class="num"' + (m === best ? ' style="font-weight:700"' : '') + '>' + nf(now[m], 2) + '</td><td class="num">' + (b.scores[m] ? nf(b.scores[m][0], dec) : '–') + '</td></tr>').join('') + '</tbody></table>', tcap('Current nowcasts'), T.unit + '. Nowcasts sorted from the most to the least accurate method in validation.');
      if (hist.length) {
        const g = grid(out), labs = hist.map(h => fc5Lab(h[0], 'M')).concat([b.month]);
        figure(g, { wide: true, title: T.label + ': latest data and nowcasts for ' + b.month, sub: T.unit + '; the last point shows each method’s nowcast', h: 320, source: 'Bangladesh Bank; BBS; model estimates.', render: TH => tsOption(TH, labs, [S('Published', hist.map(h => h[1]).concat([null]), { w: 2.4, color: '#111827' })].concat(nk.map(m => S(m, hist.map((h, i) => i === hist.length - 1 ? h[1] : null).concat([now[m]]), { w: m === best ? 2.4 : 1.4, dash: m !== best, color: NC_COL[m] || '#6B7280' }))), { y1: T.unit, dec: 2 }) });
      }
    }
    if (b.top && b.top.length) tableWrap(out, '<table><thead><tr><th class="num">Rank</th><th>Indicators in the bridge equation</th><th class="num">RMSE, ranking period</th><th class="num">RMSE, test period</th></tr></thead><tbody>' + b.top.map((r, i) => '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(r[0].join(' + ')) + '</td><td class="num">' + nf(r[1], dec) + '</td><td class="num">' + nf(r[2], dec) + '</td></tr>').join('') + '</tbody></table>', tcap('Best indicator combinations'), 'Each bridge equation adds the own lag. Ranked on the earlier half of the validation window; the test-period RMSE shows whether the ranking held up. When it does not, pooling all combinations is safer than selecting a few (Kuzin, Marcellino & Schumacher, 2013).');
  });
}
function ncGdp(out, N) {
  const G = N.gdp; if (!G) { out.innerHTML = '<p class="note">GDP nowcasts are not in this build.</p>'; return; }
  out.insertAdjacentHTML('beforeend', '<p>The latest published quarter is <b>' + esc(G.last[0]) + '</b> (real GDP growth ' + nf(G.last[1], 2) + '% year on year). Monthly indicators are averaged over each quarter; months not yet published are filled with the latest value (standard bridge practice), and the factor model fills them with Kalman-filter estimates.</p>');
  const best = ncScores(out, G.scores, '% y/y', G.n_test, G.test_from, 2);
  const qs = Object.keys(G.now), meths = [...new Set(qs.flatMap(q => Object.keys(G.now[q].now)))];
  tableWrap(out, '<table><thead><tr><th>Method</th>' + qs.map(q => '<th class="num">' + esc(q) + '</th>').join('') + '</tr></thead><tbody>' + meths.map(m => '<tr><th scope="row">' + esc(m) + (m === best ? ' <small>(most accurate)</small>' : '') + '</th>' + qs.map(q => '<td class="num"' + (m === best ? ' style="font-weight:700"' : '') + '>' + (G.now[q].now[m] == null ? '–' : nf(G.now[q].now[m], 2)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('GDP nowcasts by method'), '% year on year. ' + qs.map(q => esc(q) + ': months of data available for the main indicators — ' + Object.entries(G.now[q].months).map(([k, v]) => esc(k) + ' ' + v + '/3').join(', ')).join('. ') + '.');
  const p = PK('gdp_q');
  if (p) {
    const hist = []; for (let j = Math.max(0, p.v.length - 16); j < p.v.length; j++) if (p.v[j] != null) hist.push([p.k0 + j, p.v[j]]);
    const labs = hist.map(h => fc5Lab(h[0], 'Q')).concat(qs), g = grid(out);
    figure(g, { wide: true, title: 'Quarterly GDP growth: published and nowcast', sub: '% year on year; nowcasts for the quarters not yet published', h: 320, source: 'BBS; model estimates.', render: TH => tsOption(TH, labs, [S('Published', hist.map(h => h[1]).concat(qs.map(() => null)), { w: 2.4, color: '#111827' })].concat(meths.map(m => S(m, hist.map((h, i) => i === hist.length - 1 ? h[1] : null).concat(qs.map(q => G.now[q].now[m] == null ? null : G.now[q].now[m])), { w: m === best ? 2.4 : 1.4, dash: m !== best, color: NC_COL[m] || '#6B7280' }))), { y1: '% y/y', dec: 2 }) });
  }
  tableWrap(out, '<table><thead><tr><th class="num">Rank</th><th>Indicators</th><th class="num">RMSE, ranking</th><th class="num">RMSE, test</th></tr></thead><tbody>' + G.top.map((r, i) => '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(r[0].join(' + ')) + '</td><td class="num">' + nf(r[1], 2) + '</td><td class="num">' + nf(r[2], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Best indicator combinations for GDP'), G.n_combos + ' bridge equations with one or two of the eight best single indicators. The GDP series starts in 2015, so validation uses only ' + G.n_test + ' quarters: treat differences between methods as indicative.');
}
function ncLit(host) {
  const d = document.createElement('div'); d.className = 'fc5-methods';
  const refs = [
    ['Foundations', 'Nowcasting means predicting the present, the very recent past and the very near future. Giannone, Reichlin and Small showed at the Federal Reserve that a factor model updated with each data release tracks GDP as well as professional forecasters, and that each release’s “news” can be measured.', ['Giannone, D., Reichlin, L., & Small, D. (2008). Nowcasting: The real-time informational content of macroeconomic data. Journal of Monetary Economics, 55(4), 665–676.', 'Bańbura, M., Giannone, D., Modugno, M., & Reichlin, L. (2013). Now-casting and the real-time data flow. In G. Elliott & A. Timmermann (Eds.), Handbook of Economic Forecasting (Vol. 2A, pp. 195–237). Elsevier.', 'Bok, B., Caratelli, D., Giannone, D., Sbordone, A. M., & Tambalotti, A. (2018). Macroeconomic nowcasting and forecasting with big data. Annual Review of Economics, 10, 615–643.']],
    ['Bridge equations', 'Monthly indicators are aggregated to the quarter and “bridged” to GDP; missing months are forecast first. Simple, transparent and still used by central banks as a benchmark.', ['Baffigi, A., Golinelli, R., & Parigi, G. (2004). Bridge models to forecast the euro area GDP. International Journal of Forecasting, 20(3), 447–460.', 'Diron, M. (2008). Short-term forecasts of euro area real GDP growth: An assessment of real-time performance based on vintage data. Journal of Forecasting, 27(5), 371–390.']],
    ['Mixed-data sampling (MIDAS)', 'Regress a low-frequency variable directly on high-frequency lags, with a parsimonious lag polynomial or, when the frequency gap is small (months to quarters), unrestricted lags (U-MIDAS).', ['Ghysels, E., Sinko, A., & Valkanov, R. (2007). MIDAS regressions: Further results and new directions. Econometric Reviews, 26(1), 53–90.', 'Clements, M. P., & Galvão, A. B. (2008). Macroeconomic forecasting with mixed-frequency data: Forecasting output growth in the United States. Journal of Business & Economic Statistics, 26(4), 546–554.', 'Foroni, C., Marcellino, M., & Schumacher, C. (2015). Unrestricted mixed data sampling (MIDAS): MIDAS regressions with unrestricted lag polynomials. Journal of the Royal Statistical Society: Series A, 178(1), 57–82.', 'Andreou, E., Ghysels, E., & Kourtellos, A. (2013). Should macroeconomic forecasters use daily financial data and how? Journal of Business & Economic Statistics, 31(2), 240–251.']],
    ['Dynamic factor models and the ragged edge', 'A few common factors drive many indicators; the Kalman filter fills missing observations at the end of the sample, and quarterly variables enter through a monthly aggregation constraint. Estimation by principal components, two-step methods or the EM algorithm (used here).', ['Stock, J. H., & Watson, M. W. (2002). Forecasting using principal components from a large number of predictors. Journal of the American Statistical Association, 97(460), 1167–1179.', 'Mariano, R. S., & Murasawa, Y. (2003). A new coincident index of business cycles based on monthly and quarterly series. Journal of Applied Econometrics, 18(4), 427–443.', 'Doz, C., Giannone, D., & Reichlin, L. (2011). A two-step estimator for large approximate dynamic factor models based on Kalman filtering. Journal of Econometrics, 164(1), 188–205.', 'Bańbura, M., & Modugno, M. (2014). Maximum likelihood estimation of factor models on datasets with arbitrary pattern of missing data. Journal of Applied Econometrics, 29(1), 133–160.', 'Camacho, M., & Perez-Quiros, G. (2010). Introducing the euro-sting: Short-term indicator of euro area growth. Journal of Applied Econometrics, 25(4), 663–694.', 'Marcellino, M., & Schumacher, C. (2010). Factor MIDAS for nowcasting and forecasting with ragged-edge data: A model comparison for German GDP. Oxford Bulletin of Economics and Statistics, 72(4), 518–550.']],
    ['Mixed-frequency VARs', 'A VAR in which the quarterly variable is a latent monthly series; compared with MIDAS, it models feedback between all variables.', ['Kuzin, V., Marcellino, M., & Schumacher, C. (2011). MIDAS vs. mixed-frequency VAR: Nowcasting GDP in the euro area. International Journal of Forecasting, 27(2), 529–542.', 'Schorfheide, F., & Song, D. (2015). Real-time forecasting with a mixed-frequency VAR. Journal of Business & Economic Statistics, 33(3), 366–380.']],
    ['Pooling, selection and combination', 'With many candidate indicators, averaging many small models is usually as good as or better than selecting one, because selection overfits; this site tests both.', ['Bates, J. M., & Granger, C. W. J. (1969). The combination of forecasts. Operational Research Quarterly, 20(4), 451–468.', 'Stock, J. H., & Watson, M. W. (2004). Combination forecasts of output growth in a seven-country data set. Journal of Forecasting, 23(6), 405–430.', 'Timmermann, A. (2006). Forecast combinations. In G. Elliott, C. W. J. Granger, & A. Timmermann (Eds.), Handbook of Economic Forecasting (Vol. 1, pp. 135–196). Elsevier.', 'Kuzin, V., Marcellino, M., & Schumacher, C. (2013). Pooling versus model selection for nowcasting GDP with many predictors: Empirical evidence for six industrialized countries. Journal of Applied Econometrics, 28(3), 392–411.']],
    ['Machine learning', 'Penalised regressions, trees and neural networks can extract signal from very many predictors; in real-time tests they help modestly, mostly through shrinkage.', ['Richardson, A., van Florenstein Mulder, T., & Vehbi, T. (2021). Nowcasting GDP using machine-learning algorithms: A real-time assessment. International Journal of Forecasting, 37(2), 941–948.', 'Babii, A., Ghysels, E., & Striaukas, J. (2022). Machine learning time series regressions with an application to nowcasting. Journal of Business & Economic Statistics, 40(3), 1094–1106.']],
    ['Nowcasting inflation', 'Weekly or daily prices (fuel, food) and survey data improve current-month inflation estimates; where such data are absent, as in this data set, inflation is itself the earliest release.', ['Modugno, M. (2013). Now-casting inflation using high frequency data. International Journal of Forecasting, 29(4), 664–675.', 'Knotek, E. S., & Zaman, S. (2017). Nowcasting U.S. headline and core inflation. Journal of Money, Credit and Banking, 49(5), 931–968.', 'Breitung, J., & Roling, C. (2015). Forecasting inflation rates using daily data: A nonparametric MIDAS approach. Journal of Forecasting, 34(7), 588–603.']],
    ['Emerging and developing economies', 'Shorter, noisier and more revised series; factor models still help, but gains are smaller and validation samples short, as here.', ['Dahlhaus, T., Guénette, J.-D., & Vasishtha, G. (2017). Nowcasting BRIC+M in real time. International Journal of Forecasting, 33(4), 775–788.', 'Modugno, M., Soybilgen, B., & Yazgan, E. (2016). Nowcasting Turkish GDP and news decomposition. International Journal of Forecasting, 32(4), 1369–1384.', 'Luciani, M., Pundit, M., Ramayandi, A., & Veronese, G. (2018). Nowcasting Indonesia. Empirical Economics, 55(2), 597–619.']],
    ['Real-time data', 'Published data are revised; tests on today’s data (pseudo-real time, as here) flatter accuracy compared with genuine real-time vintages.', ['Croushore, D. (2011). Frontiers of real-time data analysis. Journal of Economic Literature, 49(1), 72–100.']]];
  d.innerHTML = '<h3>Literature review</h3><p>A structured review of the research this tab implements, drawn from peer-reviewed journals ranked Q1 or Q2 in economics and econometrics (check current rankings), and from the standard handbooks.</p>' +
    refs.map(([h, txt, rs]) => '<h4>' + esc(h) + '</h4><p>' + esc(txt) + '</p><ol class="md-refs">' + rs.map(r => '<li>' + esc(r) + '</li>').join('') + '</ol>').join('') +
    '<h4>What this site adds, and its limits</h4><p>Applied to Bangladesh, the ladder shows where nowcasting pays: the factor model and indicator combinations beat the own-lag benchmark for reserves, deposit and lending rates, export growth, tax revenue and money, while very persistent series (private credit, the call rate) are best left at their last value. Limits: validation uses today’s data rather than real-time vintages (Croushore, 2011); test samples are short (18 months, and 6 quarters for GDP); there are no weekly price or survey data, which the literature finds most useful for inflation; and the factor model uses a single factor.</p><p class="note">References written from memory: check volumes and pages through the journals’ sites.</p>';
  host.append(d);
}

/* ======================= v3.16: five-year blocks, model checks, monetary transmission ======================= */
function fc5Five(host, where) {
  const F = (BD && BD.models2 && BD.models2.fc5) || null; if (!F) return;
  if (where === 'dsge') {
    host.insertAdjacentHTML('beforeend', '<div class="card"><h3>Five-year horizon</h3><p>The DSGE model is a structural model: it produces scenario paths (how inflation, output and the policy rate respond to demand, cost-push and policy shocks), not unconditional forecasts. Twenty-quarter (five-year) scenario paths using its estimated parameters are in the Model library’s <a href="#lab~models" data-mlgo="adas">AD-AS simulator</a>; five-year statistical forecasts of inflation and the policy rate from ten models are in the <a href="#lab~fc5">Forecast comparison</a> tab.</p></div>');
    host.querySelector('[data-mlgo]').addEventListener('click', e => { ML_STATE.m = 'adas'; const b = document.querySelector('.ml-nav [data-m="adas"]'); if (b) { e.preventDefault(); b.click(); b.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); } });
    return;
  }
  const sets = { arima: [['infl', 'food', 'nonfood', 'xr', 'res', 'remit', 'exp', 'm2', 'pcredit', 'call'], ['arima']], overview: [['infl', 'xr', 'res', 'remit', 'exp', 'imp', 'm2', 'pcredit', 'call', 'gdp_q', 'gdp_fy'], ['ens']], var: [['infl', 'm2', 'call'], ['var', 'ens']], vecm: [['imp', 'exp', 'remit'], ['vecm', 'ens']], sarimax: [['infl'], ['sarimax', 'ens']], dfm: [['gdp_q', 'gdp_fy'], ['ens', 'ar', 'mean']] }[where];
  if (!sets) return;
  const rows = []; let ids = new Set();
  sets[0].forEach(k => { const V = F.vars[k]; if (!V) return; const hist = fc5Hist(k, V); sets[1].forEach(m => { if (!V.models[m]) return; const a = fc5Agg(hist.concat(fc5Path(V, m, 'mean')), V.freq, 'FY', V.agg).filter(x => x[2] > 0).slice(0, 6); a.forEach(x => ids.add(x[0])); rows.push([V.label + (V.freq === 'Q' ? ' (quarterly)' : ''), F.names[m], V.unit, new Map(a.map(x => [x[0], x[1]])), /US\$/.test(V.unit) ? 0 : 2]); }); });
  if (!rows.length) return;
  ids = [...ids].sort((a, b) => a - b).slice(0, 6);
  const d = document.createElement('div'); d.className = 'fc5-five'; host.append(d);
  tableWrap(d, '<table><thead><tr><th>Indicator</th><th>Model</th>' + ids.map(i => '<th class="num">FY' + i + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr><th scope="row">' + esc(r[0]) + '<br><small class="note">' + esc(r[2]) + '</small></th><td>' + esc(r[1]) + '</td>' + ids.map(i => '<td class="num">' + (r[3].has(i) ? nf(r[3].get(i), r[4]) : '–') + '</td>').join('') + '</tr>').join('') + '</tbody></table>',
    tcap('Five-year horizon by fiscal year'), 'Fiscal-year averages (sums for flows; end of year for reserves); the first year combines published and forecast months. Monthly and quarterly paths, 80% and 95% ranges, back-test accuracy and failure tests for these and nine other models are in the <a href="#lab~fc5">Forecast comparison</a> tab.');
}
function mlChecks(host, id, M) {
  const C = (M.checks || {})[id]; if (!C) return;
  const s = document.createElement('div'); s.className = 'ml-checks'; host.append(s);
  s.insertAdjacentHTML('beforeend', '<h3>Model checks: robustness, heterogeneity, simulation, validation and failure tests</h3>');
  const pv = p => p == null ? '–' : fp(p), verdict = (p, good, bad) => p == null ? '–' : (p > 0.05 ? good : bad);
  const pts = [];
  if (id === 'keynes') {
    tableWrap(s, '<table><thead><tr><th>Equation</th><th class="num">Ljung–Box p</th><th class="num">Jarque–Bera p</th><th class="num">Breusch–Pagan p</th><th class="num">Chow test at ' + esc(C.break) + ': F (p)</th></tr></thead><tbody>' + Object.entries(C.tests).map(([k, v]) => '<tr><th scope="row">' + esc(k) + '</th><td class="num">' + pv(v.lb_p) + '</td><td class="num">' + pv(v.jb_p) + '</td><td class="num">' + pv(v.bp_p) + '</td><td class="num">' + (v.chow[0] == null ? '–' : nf(v.chow[0], 2) + ' (' + fp(v.chow[1]) + ')') + '</td></tr>').join('') + '</tbody></table>', tcap('Failure tests'), 'p below 0.05 flags a problem: autocorrelated (Ljung–Box), non-normal (Jarque–Bera) or heteroskedastic (Breusch–Pagan) residuals, or a structural break (Chow).');
    tableWrap(s, '<table><thead><tr><th>Period</th><th class="num">Years</th><th class="num">Short-run MPC</th><th class="num">Persistence</th><th class="num">Long-run MPC</th></tr></thead><tbody>' + C.sub.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 2) + '</td><td class="num">' + nf(r[3], 2) + '</td><td class="num">' + nf(r[4], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Heterogeneity: the consumption function by period'), 'Least squares on each sub-period.');
    tableWrap(s, '<table><thead><tr><th>Multiplier</th><th class="num">5th percentile</th><th class="num">Median</th><th class="num">95th percentile</th></tr></thead><tbody><tr><th scope="row">Impact (year 1)</th>' + C.sim.impact.map(v => '<td class="num">' + nf(v, 2) + '</td>').join('') + '</tr><tr><th scope="row">Sustained, year 5</th>' + C.sim.year5.map(v => '<td class="num">' + nf(v, 2) + '</td>').join('') + '</tr></tbody></table>', tcap('Simulation: multiplier uncertainty'), C.sim.n + ' replications of a pairs bootstrap: years are resampled with replacement and all three equations re-estimated each time.');
    const fails = Object.entries(C.tests).filter(([k, v]) => (v.lb_p != null && v.lb_p < 0.05) || (v.jb_p != null && v.jb_p < 0.05) || (v.bp_p != null && v.bp_p < 0.05)).map(([k]) => k);
    pts.push(fails.length ? 'Residual problems in: ' + fails.join(', ') + '; standard errors use corrections (2SLS, Newey–West) but small-sample inference stays fragile.' : 'Residual tests pass for all three equations.');
    pts.push('No significant break at ' + C.break + ' in ' + Object.values(C.tests).filter(v => v.chow[1] != null && v.chow[1] > 0.05).length + ' of 3 equations; the long-run MPC nevertheless rose from ' + nf(C.sub[0][4], 2) + ' to ' + nf(C.sub[1][4], 2) + '.');
    pts.push('The impact multiplier is tightly estimated (90% range ' + nf(C.sim.impact[0], 2) + '–' + nf(C.sim.impact[2], 2) + '); the five-year multiplier is not (' + nf(C.sim.year5[0], 2) + '–' + nf(C.sim.year5[2], 2) + '), because it compounds the uncertain long-run MPC.');
  }
  if (id === 'vecm') {
    tableWrap(s, '<table><thead><tr><th class="num">Lags in levels</th><th class="num">Cointegrating relations (5%)</th><th class="num">Elasticity of imports to exports</th><th class="num">to remittances</th></tr></thead><tbody>' + C.lags.map(r => '<tr><td class="num">' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 2) + '</td><td class="num">' + nf(r[3], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Robustness: lag length'), 'Elasticities from a VECM with one relation, whatever the test says.');
    tableWrap(s, '<table><thead><tr><th>Deterministic terms</th><th class="num">Relations found</th><th class="num">Trace, r = 0</th><th class="num">5% critical value</th></tr></thead><tbody>' + C.det.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 2) + '</td><td class="num">' + nf(r[3], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Robustness: deterministic terms'), 'Sub-sample to ' + esc(C.sub.to) + ': ' + C.sub.rank + ' relation(s), elasticity to exports ' + nf(C.sub.el_exp, 2) + ', to remittances ' + nf(C.sub.el_rem, 2) + '. Residual tests (12 lags): Portmanteau p = ' + fp(C.white_p) + ', normality p = ' + fp(C.normal_p) + '.');
    pts.push('The single long-run relation is found with 2–4 lags but not with 6 or 12, and the count changes with the deterministic terms: cointegration here is sensitive to specification, as is common in short samples.');
    pts.push('The export elasticity stays near one (' + C.lags.map(r => nf(r[2], 2)).join(', ') + ' across lag lengths): the most robust finding.');
    pts.push('Failure tests: ' + (C.white_p < 0.05 ? 'residual autocorrelation remains' : 'no residual autocorrelation') + ' and ' + (C.normal_p < 0.05 ? 'residuals are not normal' : 'residuals look normal') + ', so confidence bands from the model are approximate.');
  }
  if (id === 'sarimax') {
    tableWrap(s, '<table><thead><tr><th class="num">Depreciation lag (months)</th><th class="num">Call-rate lag</th><th class="num">Depreciation coef. (p)</th><th class="num">Call-rate coef. (p)</th><th class="num">AIC</th></tr></thead><tbody>' + C.grid.map(r => '<tr><td class="num">' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 4) + ' (' + fp(r[3]) + ')</td><td class="num">' + nf(r[4], 4) + ' (' + fp(r[5]) + ')</td><td class="num">' + nf(r[6], 1) + '</td></tr>').join('') + '</tbody></table>', tcap('Robustness: driver lags'), 'Each row re-estimates the model. AIC values are comparable only between rows with the same sample length.');
    tableWrap(s, '<table><thead><tr><th>Sample</th><th class="num">Months</th><th class="num">Depreciation coef. (p)</th><th class="num">Call-rate coef. (p)</th></tr></thead><tbody>' + C.sub.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + r[1] + '</td><td class="num">' + nf(r[2], 4) + ' (' + fp(r[3]) + ')</td><td class="num">' + nf(r[4], 4) + ' (' + fp(r[5]) + ')</td></tr>').join('') + '</tbody></table>', tcap('Heterogeneity: before and after 2020'), 'ARCH-LM test on the full-sample residuals: p = ' + fp(C.arch_p) + (C.arch_p > 0.05 ? ' (no volatility clustering).' : ' (volatility clustering).'));
    const sig = C.grid.filter(r => r[3] < 0.05);
    pts.push(sig.length ? 'Depreciation becomes significant with a ' + [...new Set(sig.map(r => r[0]))].join(' or ') + '-month lag (' + sig.length + ' of ' + C.grid.length + ' specifications): the exchange-rate channel is real but its timing matters.' : 'No specification makes depreciation significant.');
    pts.push('The drivers’ effects differ before and after 2020, consistent with the regime changes of 2022–2024.');
  }
  if (id === 'dfm') {
    tableWrap(s, '<table><thead><tr><th class="num">Factors</th><th class="num">In-sample R²</th><th class="num">Out-of-sample RMSE</th><th class="num">AR(1) benchmark RMSE</th></tr></thead><tbody>' + C.factors.map(r => '<tr><td class="num">' + r[0] + '</td><td class="num">' + nf(r[1], 2) + '</td><td class="num">' + nf(r[2], 2) + '</td><td class="num">' + nf(r[3], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Robustness and validation: number of factors (GDP bridge equation)'), 'Out-of-sample: the last 12 quarters, each forecast re-estimated on earlier data. Residual tests for the bridge equation: Ljung–Box p = ' + fp(C.bridge_tests.lb_p) + ', Jarque–Bera p = ' + fp(C.bridge_tests.jb_p) + '.');
    const fv = BD.models2.dfm && BD.models2.dfm.favar && BD.models2.dfm.favar.resp && BD.models2.dfm.favar.resp.infl;
    if (fv && C.infl_band) { const g = grid(s); figure(g, { ts: false, title: 'Simulation: inflation response to a call-rate shock with a 90% band', sub: 'FAVAR, percentage points; band from 300 Monte Carlo draws of the VAR coefficients', h: 280, source: 'Model estimates.', render: TH => tsOption(TH, fv.map((_, j) => String(j)), [S('Response', fv, { w: 2.4, color: '#E5484D' }), S('90% lower', C.infl_band.lo, { w: 1, dash: true, color: '#E5484D' }), S('90% upper', C.infl_band.hi, { w: 1, dash: true, color: '#E5484D' })], { y1: 'pp', dec: 3 }) }); figure(g, { ts: false, title: 'Heterogeneity: stability of the factors', sub: 'Tucker congruence of loadings estimated on ' + C.halves[0] + '–' + C.halves[1] + ' and ' + C.halves[2] + '–' + C.halves[3] + '; 0.95 or more means the same factor', h: 280, source: 'Model estimates.', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 24, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: ['Factor 1', 'Factor 2'], axisLabel: { color: TH.muted } }, yAxis: Object.assign(valAxis(TH, 'congruence'), { max: 1 }), series: [{ type: 'bar', data: C.tucker, itemStyle: { color: '#12A594' }, barMaxWidth: 40, label: { show: true, position: 'top', formatter: q => nf(q.value, 2), color: TH.muted } }] }) }); }
    const best = C.factors.slice().sort((a, b) => a[2] - b[2])[0];
    pts.push('More factors raise in-sample fit (R² ' + nf(C.factors[0][1], 2) + ' to ' + nf(C.factors[C.factors.length - 1][1], 2) + ') but not out-of-sample accuracy: the best is ' + best[0] + ' factor(s) with RMSE ' + nf(best[2], 2) + ' against ' + nf(best[3], 2) + ' for AR(1). Short quarterly GDP history limits what factors can add.');
    pts.push('Loadings shift between the two halves of the sample (congruence ' + C.tucker.map(v => nf(v, 2)).join(' and ') + '), so the factors’ meaning is not stable: heterogeneity over time.');
  }
  if (id === 'cge') {
    tableWrap(s, '<table><thead><tr><th>Scenario</th><th class="num">Real exchange rate</th><th class="num">Exports</th><th class="num">Imports</th><th class="num">Absorption</th></tr></thead><tbody>' + C.mc.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1).map(q => '<td class="num">' + nf(q[1], 2) + '<br><small>' + nf(q[0], 2) + ' to ' + nf(q[2], 2) + '</small></td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('Simulation: Monte Carlo over elasticities and the tariff'), C.n + ' draws: Ω uniform on ' + C.ranges.omega.join('–') + ', σ on ' + C.ranges.sigma.join('–') + ', tariff on ' + C.ranges.tariff.map(v => nf(v * 100, 0) + '%').join('–') + '. Median, with the 5th–95th percentile range below. Calibration check: the base year is reproduced to within ' + C.calib_err + ' (exact).');
    pts.push('Signs are robust across all plausible elasticities for most scenarios; magnitudes are not: the ranges show how much the answer depends on Ω and σ, which are not estimated for Bangladesh.');
    pts.push('Validation: calibration reproduces the base year exactly by construction; the model is not tested against history, which is the main limitation of calibrated CGE models.');
  }
  if (pts.length) s.insertAdjacentHTML('beforeend', '<div class="card"><h3>What the checks show</h3><ul class="ol-list">' + pts.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div>');
}
function mlMtm(host, T) {
  const { i, n, o, sub, sup, fr, r } = MX, t = i('t');
  const s = sec(host, 'The monetary transmission mechanism in Bangladesh', 'How a change in the call money rate travels to lending rates, credit, the exchange rate and inflation: a five-variable VAR, ' + T.sample.join(' to ') + ' (' + T.n + ' months), with tests of every link.', 'ml-mtm');
  mlText(s, 'What it is', '<p>Monetary policy works through channels (Mishkin, 1995): the <b>interest-rate channel</b> (policy and money-market rates pass into lending rates, which change spending), the <b>credit channel</b> (the supply of bank loans; Bernanke & Gertler, 1995), the <b>exchange-rate channel</b> (rates move the Taka, which moves import prices), and expectations. In low-income economies these channels are often weak because financial markets are shallow and rates are administered (Mishra, Montiel & Spilimbergo, 2012). Bangladesh Bank steers the call money rate; lending rates were capped at 9% from 2020 to 2023, and the exchange rate has been heavily managed, both of which can block transmission.</p>');
  const L = (a, b) => T.granger.find(g => g[0] === a && g[1] === b) || [a, b, null, null];
  const box = (txt, cls) => '<div class="mtm-box ' + (cls || '') + '">' + txt + '</div>';
  const arrow = g => { const p = g[3]; return '<div class="mtm-arrow' + (p != null && p < 0.05 ? ' on' : p != null && p < 0.1 ? ' weak' : '') + '"><span>→</span><small>Granger p ' + (p == null ? '–' : fp(p)) + '</small></div>'; };
  s.insertAdjacentHTML('beforeend', '<div class="mtm-chain"><div class="mtm-row">' + box('Call money rate', 'start') + arrow(L('Call money rate', 'Lending rate')) + box('Lending rate<br><small>pass-through: ' + nf(T.lend_pt.impact, 2) + ' on impact, ' + nf(T.lend_pt.long_run, 2) + ' long run</small>') + arrow(L('Lending rate', 'Private credit growth')) + box('Private credit') + arrow(L('Private credit growth', 'Inflation')) + box('Inflation', 'end') + '</div><div class="mtm-row">' + box('Call money rate', 'start') + arrow(L('Call money rate', 'Taka depreciation')) + box('Taka exchange rate') + arrow(L('Taka depreciation', 'Inflation')) + box('Inflation<br><small>pass-through: ' + nf(T.xr_pt.sum12, 3) + ' within 12 months, ' + nf(T.xr_pt.long_run, 2) + ' long run</small>', 'end') + '</div><p class="note">Green arrows: significant at 5%; amber: at 10%; grey: not significant. Feedback: inflation → call money rate, p = ' + fp(L('Inflation', 'Call money rate')[3]) + ' (policy reacts to inflation).</p></div>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('𝐲'), t), o('='), i('𝐜'), o('+'), mlSum(r(i('j'), o('='), n('1')), i('p')), sub(i('𝐀'), i('j')), sub(i('𝐲'), r(t, o('−'), i('j'))), o('+'), i('𝐁'), sub(i('𝛆'), t)), '(1) Recursive VAR: 𝐲 = (call, lending rate, credit growth, depreciation, inflation)′; 𝐁 lower triangular (Cholesky)'),
    EQN(r(sub(i('lend'), t), o('='), i('a'), o('+'), sub(i('β'), n('0')), sub(i('call'), t), o('+'), sub(i('β'), n('1')), sub(i('call'), r(t, o('−'), n('1'))), o('+'), i('ρ'), sub(i('lend'), r(t, o('−'), n('1'))), o(','), o('&#8195;'), i('LR'), o('='), fr(r(sub(i('β'), n('0')), o('+'), sub(i('β'), n('1'))), r(n('1'), o('−'), i('ρ')))), '(2) Lending-rate pass-through'),
    EQN(r(sub(i('π'), t), o('='), i('a'), o('+'), mlSum(r(i('j'), o('='), n('0')), n('12')), sub(i('γ'), i('j')), sub(i('d'), r(t, o('−'), i('j'))), o('+'), i('ρ'), sub(i('π'), r(t, o('−'), n('1'))), o(','), o('&#8195;'), i('LR'), o('='), fr(r(mlSum(i('j'), null), sub(i('γ'), i('j'))), r(n('1'), o('−'), i('ρ')))), '(3) Exchange-rate pass-through to inflation')].join(''));
  const g = grid(s), H = T.irf.call.mean.map((_, j) => String(j)), lab = { lend: 'Lending rate', pcredit: 'Private credit growth', xr_dep: 'Taka depreciation', infl: 'Inflation' };
  ['lend', 'pcredit', 'xr_dep', 'infl'].forEach(k => figure(g, { ts: false, title: lab[k] + ': response to a 1-point rise in the call money rate', sub: 'Percentage points, months after the shock; 90% Monte Carlo band', h: 260, source: 'Model estimates (VAR, Cholesky ordering).', render: TH => tsOption(TH, H, [S('Response', T.irf[k].mean, { w: 2.4, color: '#2F6FED' }), S('90% lower', T.irf[k].lo, { w: 1, dash: true, color: '#2F6FED' }), S('90% upper', T.irf[k].hi, { w: 1, dash: true, color: '#2F6FED' })], { y1: 'pp', dec: 3 }) }));
  tableWrap(s, '<table><thead><tr><th>Cause</th><th>Effect</th><th class="num">F statistic</th><th class="num">p-value</th><th>Verdict</th></tr></thead><tbody>' + T.granger.map(gr => '<tr><th scope="row">' + esc(gr[0]) + '</th><td>' + esc(gr[1]) + '</td><td class="num">' + nf(gr[2], 2) + '</td><td class="num">' + fp(gr[3]) + '</td><td>' + (gr[3] < 0.05 ? 'link present' : gr[3] < 0.1 ? 'weak evidence' : 'no evidence') + '</td></tr>').join('') + '</tbody></table>', tcap('Granger causality along each link'), 'VAR(' + T.p + '), lag chosen by the BIC; the VAR is ' + (T.stable ? 'stable' : 'not stable') + '.');
  tableWrap(s, '<table><thead><tr><th>Source of shocks</th>' + T.fevd_h.map(h => '<th class="num">' + h + ' months</th>').join('') + '</tr></thead><tbody>' + Object.entries(T.fevd).map(([k, v]) => '<tr><th scope="row">' + esc(k) + '</th>' + v.map(x => '<td class="num">' + nf(x, 1) + '%</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('What drives inflation: forecast-error variance decomposition'), 'Share of inflation’s forecast-error variance due to each variable’s shocks.');
  mlText(s, 'Reading the results', '<ul class="ol-list"><li>The <b>interest-rate channel is weak and slow</b>: lending rates move only ' + nf(T.lend_pt.impact, 2) + ' points on impact for each point on the call rate (p = ' + fp(T.lend_pt.impact_p) + '); with persistence of ' + nf(T.lend_pt.persistence, 2) + ', the long-run pass-through of ' + nf(T.lend_pt.long_run, 2) + ' takes years. The call rate does not Granger-cause the lending rate (p = ' + fp(L('Call money rate', 'Lending rate')[3]) + '), consistent with the 2020–2023 lending-rate cap.</li><li>The <b>credit channel</b> works from lending rates to credit (p = ' + fp(L('Lending rate', 'Private credit growth')[3]) + '), but only weakly from credit to inflation (p = ' + fp(L('Private credit growth', 'Inflation')[3]) + ').</li><li>The <b>exchange-rate channel</b> shows significant pass-through (' + nf(T.xr_pt.sum12, 3) + ' within a year, p = ' + fp(T.xr_pt.p) + '; ' + nf(T.xr_pt.long_run, 2) + ' in the long run), but the call rate does not move the Taka (p = ' + fp(L('Call money rate', 'Taka depreciation')[3]) + '): the exchange rate was managed rather than market-driven.</li><li>Causality runs mainly the other way: inflation predicts the call rate (p = ' + fp(L('Inflation', 'Call money rate')[3]) + '), and over two years policy-rate shocks explain under ' + nf(Math.max(1, Math.ceil(T.fevd['Call money rate'][2])), 0) + '% of inflation’s variance.</li><li>Caution: a short sample, identification by ordering, and administered rates mean these estimates describe the historical regime; the 2024 move to market-based lending rates may strengthen transmission.</li></ul>');
  mlBoxes(s, 'Tests each link of the chain on Bangladesh’s own data instead of assuming it works; separates interest-rate, credit and exchange-rate channels.', 'A recursive ordering (the call rate reacts to nothing within the month); linear, stable relations over 2012–2026; monthly data capture the timing.', 'Results depend on the ordering; regime changes (rate cap, crawling peg) break stability; no expectations or asset-price channel; short sample.', 'Use the repo (policy) rate history and narrative policy shocks, sign restrictions, and a time-varying VAR to capture the 2023–2024 regime changes.');
  mlRefs(s, [['Bernanke, B. S., & Gertler, M. (1995). Inside the black box: The credit channel of monetary policy transmission. Journal of Economic Perspectives, 9(4), 27–48.', 'https://doi.org/10.1257/jep.9.4.27'], ['Christiano, L. J., Eichenbaum, M., & Evans, C. L. (1999). Monetary policy shocks: What have we learned and to what end? In J. B. Taylor & M. Woodford (Eds.), Handbook of Macroeconomics (Vol. 1A, pp. 65–148). Elsevier.', ''], ['Mishkin, F. S. (1995). Symposium on the monetary transmission mechanism. Journal of Economic Perspectives, 9(4), 3–10.', 'https://doi.org/10.1257/jep.9.4.3'], ['Mishra, P., Montiel, P. J., & Spilimbergo, A. (2012). Monetary transmission in low-income countries: Effectiveness and policy implications. IMF Economic Review, 60(2), 270–302.', ''], ['Taylor, J. B. (1995). The monetary transmission mechanism: An empirical framework. Journal of Economic Perspectives, 9(4), 11–26.', 'https://doi.org/10.1257/jep.9.4.11']]);
}

/* ======================= v3.16: theoretical models ======================= */
function mlCtl(host, specs, onChange) {
  const d = document.createElement('div'); d.className = 'fc5-ctl ml-sl';
  d.innerHTML = specs.map(sp => sp.options ? '<label>' + esc(sp.label) + ' <select data-k="' + sp.k + '">' + sp.options.map(([v, l]) => '<option value="' + v + '"' + (String(v) === String(sp.v) ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>'
    : '<label>' + esc(sp.label) + ': <b data-out="' + sp.k + '">' + sp.fmt(sp.v) + '</b><input type="range" data-k="' + sp.k + '" min="' + sp.min + '" max="' + sp.max + '" step="' + sp.step + '" value="' + sp.v + '"></label>').join('');
  host.append(d);
  const st = Object.fromEntries(specs.map(sp => [sp.k, sp.v]));
  const upd = e => { const k = e.target.dataset.k; if (!k) return; const sp = specs.find(x => x.k === k); st[k] = sp.options ? (isNaN(+e.target.value) ? e.target.value : +e.target.value) : +e.target.value; const o = d.querySelector('[data-out="' + k + '"]'); if (o) o.textContent = sp.fmt(st[k]); clearTimeout(d._t); d._t = setTimeout(() => onChange(st), 90); };
  d.addEventListener('input', upd); d.addEventListener('change', upd);
  return st;
}
const mlPct = (v, d) => nf(v * 100, d == null ? 2 : d) + '%';
function mlKpis(host, items) { host.insertAdjacentHTML('beforeend', '<div class="ml-kpis">' + items.map(([l, v]) => '<div><span>' + esc(l) + '</span><b>' + v + '</b></div>').join('') + '</div>'); }
function mlXY(TH, series, xname, yname) {
  return { animation: false, textStyle: { fontFamily: FONT }, grid: { left: 8, right: 14, top: 34, bottom: 26, containLabel: true }, legend: { top: 0, type: 'scroll', textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'item', confine: true, valueFormatter: v => Array.isArray(v) ? v.map(x => nf(x, 2)).join(', ') : nf(v, 2) },
    xAxis: { type: 'value', name: xname, nameLocation: 'middle', nameGap: 22, scale: true, axisLabel: { color: TH.muted, fontSize: 10 }, splitLine: { lineStyle: { color: TH.grid } } }, yAxis: { type: 'value', name: yname, scale: true, axisLabel: { color: TH.muted, fontSize: 10 }, splitLine: { lineStyle: { color: TH.grid } } }, series };
}
/* ---------- Solow–Swan ---------- */
function solowPath(p, k0, Y) {
  const o = { k: [k0], gY: [], gy: [] }; let k = k0;
  for (let t = 0; t < Y; t++) { const k1 = ((1 - p.d) * k + p.s * Math.pow(k, p.a)) / ((1 + p.n) * (1 + p.g)); o.gY.push(((1 + p.g) * (1 + p.n) * Math.pow(k1 / k, p.a) - 1) * 100); o.gy.push(((1 + p.g) * Math.pow(k1 / k, p.a) - 1) * 100); k = k1; o.k.push(k); }
  o.kstar = Math.pow(p.s / ((1 + p.n) * (1 + p.g) - 1 + p.d), 1 / (1 - p.a)); return o;
}
function mlSolow(host, T) {
  const { i, n, o, sub, sup, fr, r } = MX, t = i('t');
  const s = sec(host, 'Solow–Swan growth model', 'Calibrated to Bangladesh: investment ' + mlPct(T.s, 1) + ' of GDP, population growth ' + mlPct(T.n) + ', labour-augmenting technology growth ' + mlPct(T.g) + ' (growth accounting, FY2010 onwards).', 'ml-solow');
  mlText(s, 'What it is', '<p>The Solow–Swan model (Solow, 1956; Swan, 1956) explains long-run growth with three forces: capital accumulation from saving, labour-force growth, and technological progress. Because capital has diminishing returns, saving cannot raise growth for ever: an economy converges to a steady state in which output per worker grows at the rate of technology alone.</p><p><b>Why it matters for Bangladesh:</b> it decomposes 30 years of growth into capital, labour and productivity, shows how far the economy is from its steady state, and tells planners what a higher investment rate can and cannot achieve.</p>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('Y'), t), o('='), sup(sub(i('K'), t), i('α')), sup(o('('), ''), sub(i('A'), t), sub(i('L'), t), sup(o(')'), r(n('1'), o('−'), i('α')))), '(1) Production'),
    EQN(r(sub(i('k'), r(t, o('+'), n('1'))), o('='), fr(r(o('('), n('1'), o('−'), i('δ'), o(')'), sub(i('k'), t), o('+'), i('s'), sup(sub(i('k'), t), i('α'))), r(o('('), n('1'), o('+'), i('n'), o(')'), o('('), n('1'), o('+'), i('g'), o(')')))), '(2) Capital per effective worker, k = K/(AL)'),
    EQN(r(sup(i('k'), o('*')), o('='), sup(o('('), ''), fr(i('s'), r(i('n'), o('+'), i('g'), o('+'), i('δ'))), sup(o(')'), fr(n('1'), r(n('1'), o('−'), i('α'))))), '(3) Steady state (continuous-time form)'),
    EQN(r(i('λ'), o('='), o('('), n('1'), o('−'), i('α'), o(')'), o('('), i('n'), o('+'), i('g'), o('+'), i('δ'), o(')'), o(','), o('&#8195;'), sub(i('t'), fr(n('1'), n('2'))), o('='), fr(r(i('ln'), n('2')), i('λ'))), '(4) Speed of convergence and half-life'),
    EQN(r(sub(i('g'), i('Y')), o('='), i('α'), sub(i('g'), i('K')), o('+'), o('('), n('1'), o('−'), i('α'), o(')'), sub(i('g'), i('L')), o('+'), sub(i('g'), i('TFP'))), '(5) Growth accounting')].join(''));
  mlText(s, 'Derivation, step by step', '<ol class="ol-list"><li>Divide (1) by AL: output per effective worker y = k<sup>α</sup>.</li><li>Capital accumulates by saving and wears out at rate δ: K<sub>t+1</sub> = (1 − δ)K<sub>t</sub> + sY<sub>t</sub>.</li><li>Divide by A<sub>t+1</sub>L<sub>t+1</sub> = (1 + g)(1 + n)A<sub>t</sub>L<sub>t</sub> to get (2).</li><li>In the steady state k<sub>t+1</sub> = k<sub>t</sub>; solving (2) gives k* (approximately (3)).</li><li>Linearising around k* shows the gap closes at rate λ, giving the half-life ln 2/λ.</li><li>Taking logs of (1) and differentiating gives the growth-accounting identity (5); TFP growth is the residual, (1 − α)g.</li></ol>');
  tableWrap(s, '<table><thead><tr><th>Parameter</th><th class="num">Value</th><th>Source</th></tr></thead><tbody>' + [['Capital share α', nf(T.alpha, 2), 'Assumption, consistent with labour shares of 0.6–0.7 after Gollin (2002)'], ['Depreciation δ', mlPct(T.delta, 0), 'Assumption, standard'], ['Investment rate s', mlPct(T.s, 1), 'BBS national accounts, average of the last five fiscal years'], ['Population growth n', mlPct(T.n), 'World Bank, average of the last five years (labour proxied by population)'], ['TFP growth', mlPct(T.tfp), 'Growth accounting below, FY2010 onwards'], ['Technology growth g = TFP/(1 − α)', mlPct(T.g), 'Derived'], ['Capital–output ratio, ' + T.last, nf(T.ky, 2), 'Perpetual inventory from investment shares'], ['Capital per effective worker relative to steady state', mlPct(T.ratio, 1), 'Derived']].map(r => '<tr><th scope="row">' + esc(r[0]) + '</th><td class="num">' + r[1] + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table>', tcap('Calibration'), 'Capital is built by the perpetual-inventory method from the investment share and real GDP since FY1994.');
  const g0 = grid(s), A = T.acc;
  figure(g0, { ts: false, title: 'Growth accounting by period', sub: 'Contributions to real GDP growth, percentage points', h: 300, source: 'BBS; World Bank; model calculations.', render: TH => ({ animation: !RM, textStyle: { fontFamily: FONT }, grid: { left: 6, right: 10, top: 34, bottom: 8, containLabel: true }, legend: { top: 0, textStyle: { color: TH.muted, fontSize: 10 } }, tooltip: { trigger: 'axis', confine: true }, xAxis: { type: 'category', data: A.map(r => r[0]), axisLabel: { color: TH.muted, fontSize: 10 } }, yAxis: valAxis(TH, 'pp'), series: [['Capital', 2, '#2F6FED'], ['Labour', 3, '#F5A524'], ['TFP', 4, '#12A594']].map(([nm, j, c]) => ({ name: nm, type: 'bar', stack: 'g', data: A.map(r => r[j]), itemStyle: { color: c }, label: { show: true, fontSize: 9, color: '#fff', formatter: q => nf(q.value, 1) } })) }) });
  const AY = T.acc_years;
  figure(g0, { title: 'Total factor productivity growth, year by year', sub: '% per year; the residual of growth accounting', h: 300, source: 'BBS; World Bank; model calculations.', render: TH => tsOption(TH, AY.map(r => r[0]), [S('TFP growth', AY.map(r => r[4]), { w: 2, color: '#12A594' }), S('GDP growth', AY.map(r => r[1]), { w: 1.4, dash: true, color: '#111827' })], { y1: '%', dec: 2 }) });
  tableWrap(s, '<table><thead><tr><th>Period</th><th class="num">GDP growth</th><th class="num">Capital</th><th class="num">Labour</th><th class="num">TFP</th></tr></thead><tbody>' + A.map(r => '<tr><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1).map(v => '<td class="num">' + nf(v, 2) + '</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('Growth accounting'), 'Percentage points per year; α = ' + nf(T.alpha, 2) + '.');
  s.insertAdjacentHTML('beforeend', '<h3>Simulator</h3><p class="note">Move the sliders to change the scenario; the baseline stays at the calibration. Both start at the same position relative to their own steady state.</p>');
  const base = { s: T.s, n: T.n, g: T.g, d: T.delta, a: T.alpha }, out = document.createElement('div');
  const draw = st => {
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    const p = { s: st.s / 100, n: st.n / 100, g: st.g / 100, d: st.d / 100, a: st.a }, Bp = solowPath(base, 1, 0), Sp = solowPath(p, 1, 0);
    const b = solowPath(base, T.ratio * Bp.kstar, 30), sc = solowPath(p, T.ratio * Sp.kstar, 30), lam = (1 - p.a) * (p.n + p.g + p.d), fy0 = +T.last.slice(2);
    mlKpis(out, [['Steady-state GDP growth', nf(((1 + p.n) * (1 + p.g) - 1) * 100, 2) + '%'], ['Average growth, next 5 years', nf(sc.gY.slice(0, 5).reduce((a, v) => a + v, 0) / 5, 2) + '%'], ['Half-life of convergence', nf(Math.log(2) / lam, 1) + ' years'], ['Golden-rule saving rate', mlPct(p.a, 0)], ['Output per worker, steady state vs baseline', nf(Math.pow(sc.kstar / Bp.kstar, p.a) * 100 - 100, 1) + '%']]);
    const g = grid(out);
    figure(g, { title: 'GDP growth path: scenario against baseline', sub: '% per year, next 30 years', h: 300, source: 'Model simulation.', render: TH => tsOption(TH, b.gY.map((_, j) => 'FY' + (fy0 + j + 1)), [S('Baseline', b.gY, { w: 2, color: '#111827' }), S('Scenario', sc.gY, { w: 2.4, dash: true, color: '#E5484D' })], { y1: '%', dec: 2 }) });
    figure(g, { title: 'Output per effective worker relative to the baseline steady state', sub: 'Index, baseline steady state = 100', h: 300, source: 'Model simulation.', render: TH => tsOption(TH, b.k.map((_, j) => 'FY' + (fy0 + j)), [S('Baseline', b.k.map(k => Math.pow(k / Bp.kstar, base.a) * 100), { w: 2, color: '#111827' }), S('Scenario', sc.k.map(k => Math.pow(k / Bp.kstar, p.a) * 100), { w: 2.4, dash: true, color: '#E5484D' })], { y1: 'index', dec: 1 }) });
    tableWrap(out, '<table><thead><tr><th>Fiscal year</th><th class="num">GDP growth, baseline</th><th class="num">GDP growth, scenario</th><th class="num">Per worker, scenario</th></tr></thead><tbody>' + [0, 1, 2, 3, 4].map(j => '<tr><th scope="row">FY' + (fy0 + j + 1) + '</th><td class="num">' + nf(b.gY[j], 2) + '%</td><td class="num">' + nf(sc.gY[j], 2) + '%</td><td class="num">' + nf(sc.gy[j], 2) + '%</td></tr>').join('') + '</tbody></table>', tcap('Five-year projection'), 'Model-implied long-run growth path; it abstracts from cycles and shocks.');
  };
  mlCtl(s, [{ k: 's', label: 'Investment rate', min: 15, max: 45, step: 0.5, v: +(T.s * 100).toFixed(1), fmt: v => v + '%' }, { k: 'n', label: 'Population growth', min: 0, max: 3, step: 0.05, v: +(T.n * 100).toFixed(2), fmt: v => v + '%' }, { k: 'g', label: 'Technology growth', min: 0, max: 6, step: 0.1, v: +(T.g * 100).toFixed(1), fmt: v => v + '%' }, { k: 'd', label: 'Depreciation', min: 2, max: 10, step: 0.5, v: T.delta * 100, fmt: v => v + '%' }, { k: 'a', label: 'Capital share α', min: 0.2, max: 0.6, step: 0.01, v: T.alpha, fmt: v => nf(v, 2) }], draw);
  s.append(out); draw({ s: T.s * 100, n: T.n * 100, g: T.g * 100, d: T.delta * 100, a: T.alpha });
  const sens = []; [0.3, 0.4, 0.5].forEach(a => [0.04, 0.05, 0.06].forEach(d => { const p = Object.assign({}, base, { a, d }), k1 = solowPath(p, 1, 0).kstar, pp = solowPath(p, T.ratio * k1, 5); sens.push([a, d, Math.log(2) / ((1 - a) * (p.n + p.g + d)), pp.gY.reduce((x, v) => x + v, 0) / 5]); }));
  tableWrap(s, '<table><thead><tr><th class="num">α</th><th class="num">δ</th><th class="num">Half-life, years</th><th class="num">Average GDP growth, next 5 years</th></tr></thead><tbody>' + sens.map(r => '<tr><td class="num">' + nf(r[0], 2) + '</td><td class="num">' + mlPct(r[1], 0) + '</td><td class="num">' + nf(r[2], 1) + '</td><td class="num">' + nf(r[3], 2) + '%</td></tr>').join('') + '</tbody></table>', tcap('Checks: sensitivity to the assumed parameters'), 'Validation: the calibrated model implies ' + nf(sens[4][3], 2) + '% average growth over the next five years against ' + nf(T.gdp_growth5, 2) + '% actually recorded over the last five; the gap reflects the 2020 and 2024–2025 shocks, which a long-run model does not contain.');
  mlBoxes(s, 'Simple, transparent and quantitative; growth accounting attributes past growth; shows that sustained growth needs productivity, not only investment.', 'Exogenous saving and technology; closed economy; one good; competitive markets; labour grows with population; perpetual-inventory capital with δ = 5%.', 'TFP is a residual that absorbs measurement error; informality and the quality of capital are ignored; results depend on α and δ (see checks).', 'Add human capital (Mankiw, Romer & Weil, 1992), sectoral reallocation from agriculture, and an open-economy version with remittance-financed investment.');
  mlRefs(s, [['Gollin, D. (2002). Getting income shares right. Journal of Political Economy, 110(2), 458–474.', 'https://doi.org/10.1086/338747'], ['Mankiw, N. G., Romer, D., & Weil, D. N. (1992). A contribution to the empirics of economic growth. The Quarterly Journal of Economics, 107(2), 407–437.', 'https://doi.org/10.2307/2118477'], ['Solow, R. M. (1956). A contribution to the theory of economic growth. The Quarterly Journal of Economics, 70(1), 65–94.', 'https://doi.org/10.2307/1884513'], ['Swan, T. W. (1956). Economic growth and capital accumulation. Economic Record, 32(2), 334–361.', 'https://doi.org/10.1111/j.1475-4932.1956.tb00434.x']]);
}
/* ---------- Ramsey–Cass–Koopmans ---------- */
function rckSolve(p) { const ks = Math.pow(p.a / (p.rho + p.d + p.theta * p.g), 1 / (1 - p.a)), cs = Math.pow(ks, p.a) - (p.n + p.g + p.d) * ks; return { ks, cs, ys: Math.pow(ks, p.a), ss: 1 - cs / Math.pow(ks, p.a), rs: p.rho + p.theta * p.g }; }
function rckPath(p, k0, years) {
  const Sx = rckSolve(p), dt = 0.05, f = k => Math.pow(k, p.a), fpr = k => p.a * Math.pow(k, p.a - 1);
  const dk = (k, c) => f(k) - c - (p.n + p.g + p.d) * k, dc = (k, c) => c * (fpr(k) - p.d - p.rho - p.theta * p.g) / p.theta;
  const run = (c0, rec) => { let k = k0, c = c0; const path = rec ? [[0, k, c]] : null;
    for (let st = 1; st <= 200 / dt; st++) { const k1 = dk(k, c), c1 = dc(k, c), km = k + 0.5 * dt * k1, cm = c + 0.5 * dt * c1; k += dt * dk(km, cm); c += dt * dc(km, cm);
      if (rec && st % 5 === 0) path.push([st * dt, k, c]);
      if (k <= 0.02 * Sx.ks || !isFinite(k)) return { fate: 'high', path }; if (c <= 0 || (k > 1.6 * Sx.ks && c < Sx.cs)) return { fate: 'low', path };
      if (rec && st * dt >= years) return { fate: 'ok', path }; }
    return { fate: 'ok', path }; };
  let lo = 1e-9, hi = f(k0);
  for (let it = 0; it < 70; it++) { const mid = (lo + hi) / 2; if (run(mid, false).fate === 'high') hi = mid; else lo = mid; }
  return { S: Sx, path: run((lo + hi) / 2, true).path, c0: (lo + hi) / 2 };
}
function mlRck(host, T) {
  const { i, n, o, sub, sup, fr, r } = MX, t = i('t');
  const s = sec(host, 'Ramsey–Cass–Koopmans optimal growth model', 'Saving chosen by forward-looking households, with technology, population and capital calibrated to Bangladesh as in the Solow model.', 'ml-rck');
  mlText(s, 'What it is', '<p>The Ramsey–Cass–Koopmans model (Ramsey, 1928; Cass, 1965; Koopmans, 1965) replaces Solow’s fixed saving rate with households that choose consumption to maximise lifetime welfare. Saving then responds to the return on capital, and the economy travels to its steady state along a unique “saddle path”.</p><p><b>Why it matters for Bangladesh:</b> it asks whether the current investment rate is optimal, and it links the long-run real interest rate to growth and patience, a benchmark against which Bangladesh’s low real rates can be judged.</p>');
  mlText(s, 'Equations', [
    EQN(r(i('max'), o('&#8202;'), sup(sub(o('∫'), n('0')), o('∞')), sup(i('e'), r(o('−'), o('('), i('ρ'), o('−'), i('n'), o(')'), t)), fr(sup(sub(i('c'), t), r(n('1'), o('−'), i('θ'))), r(n('1'), o('−'), i('θ'))), i('dt')), '(1) Household welfare'),
    EQN(r(sub(mlHat(i('k')), t), o('='), i('f'), o('('), sub(i('k'), t), o(')'), o('−'), sub(i('c'), t), o('−'), o('('), i('n'), o('+'), i('g'), o('+'), i('δ'), o(')'), sub(i('k'), t)), '(2) Capital accumulation (k̂ = dk/dt), f(k) = k^α'),
    EQN(r(fr(sub(mlHat(i('c')), t), sub(i('c'), t)), o('='), fr(r(i('f'), o('′'), o('('), sub(i('k'), t), o(')'), o('−'), i('δ'), o('−'), i('ρ'), o('−'), i('θ'), i('g')), i('θ'))), '(3) Euler equation'),
    EQN(r(i('f'), o('′'), o('('), sup(i('k'), o('*')), o(')'), o('='), i('ρ'), o('+'), i('δ'), o('+'), i('θ'), i('g'), o(','), o('&#8195;'), sup(i('r'), o('*')), o('='), i('ρ'), o('+'), i('θ'), i('g')), '(4) Steady state and the long-run real interest rate')].join(''));
  mlText(s, 'Derivation, step by step', '<ol class="ol-list"><li>Write the current-value Hamiltonian H = u(c) + μ[f(k) − c − (n + g + δ)k].</li><li>Optimality in c: u′(c) = μ.</li><li>Co-state equation: μ̇ = (ρ − n)μ − μ[f′(k) − (n + g + δ)].</li><li>Differentiate u′(c) = c<sup>−θ</sup> and combine to get the Euler equation (3).</li><li>Steady state: ċ = 0 gives f′(k*) = ρ + δ + θg; k̇ = 0 gives c* = f(k*) − (n + g + δ)k*.</li><li>The transversality condition rules out every path except the saddle path; it is found numerically by shooting: choose initial consumption c(0) so that the path converges to (k*, c*).</li></ol>');
  const p0 = { rho: 0.02, theta: 2, a: T.alpha, d: T.delta, n: T.n, g: T.g }, out = document.createElement('div');
  const draw = st => {
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    const p = Object.assign({}, p0, { rho: st.rho / 100, theta: st.theta }), R = rckPath(p, T.k_now, 60), S_ = R.S, P = R.path, y = k => Math.pow(k, p.a), fy0 = +T.last.slice(2);
    const s0 = 1 - R.c0 / y(T.k_now);
    mlKpis(out, [['Optimal saving rate now', mlPct(s0, 1)], ['Optimal steady-state saving', mlPct(S_.ss, 1)], ['Actual investment rate', mlPct(T.s, 1)], ['Model real interest rate r*', mlPct(S_.rs, 1)], ['Actual real interest rate', mlPct(T.real_rate, 1)]]);
    const g = grid(out), years = P.map(q => q[0]), sv = P.map(q => (1 - q[2] / y(q[1])) * 100);
    figure(g, { ts: false, title: 'Optimal saving rate along the saddle path', sub: 'Gross saving, % of output, years from ' + T.last, h: 300, source: 'Model simulation.', render: TH => tsOption(TH, years.map(v => nf(v, 0)), [S('Optimal saving rate', sv, { w: 2.4, color: '#2F6FED' }), S('Actual investment rate', years.map(() => T.s * 100), { w: 1.4, dash: true, color: '#111827' })], { y1: '%', dec: 1 }) });
    const kmax = Math.pow(1 / (p.n + p.g + p.d), 1 / (1 - p.a)), kx = Array.from({ length: 80 }, (_, j) => 0.05 * S_.ks + j * (Math.min(kmax, 2.4 * S_.ks) - 0.05 * S_.ks) / 79);
    figure(g, { ts: false, title: 'Phase diagram', sub: 'Capital (k) and consumption (c) per effective worker; the economy moves along the saddle path to the steady state', h: 300, source: 'Model simulation.', render: TH => mlXY(TH, [{ name: 'k̇ = 0', type: 'line', showSymbol: false, data: kx.map(k => [k, y(k) - (p.n + p.g + p.d) * k]), lineStyle: { color: '#F5A524', width: 2 } }, { name: 'ċ = 0', type: 'line', showSymbol: false, data: [[S_.ks, 0], [S_.ks, 1.6 * S_.cs]], lineStyle: { color: '#12A594', width: 2 } }, { name: 'Saddle path from today', type: 'line', showSymbol: false, data: P.map(q => [q[1], q[2]]), lineStyle: { color: '#2F6FED', width: 2.4 } }, { name: 'Steady state', type: 'scatter', data: [[S_.ks, S_.cs]], symbolSize: 10, itemStyle: { color: '#E5484D' } }, { name: 'Today', type: 'scatter', data: [[T.k_now, R.c0]], symbolSize: 10, itemStyle: { color: '#111827' } }], 'k', 'c') });
    const at = yr => P.reduce((a, q) => Math.abs(q[0] - yr) < Math.abs(a[0] - yr) ? q : a, P[0]);
    tableWrap(out, '<table><thead><tr><th>Fiscal year</th><th class="num">Capital, % of steady state</th><th class="num">Optimal saving rate</th><th class="num">Consumption growth per effective worker</th></tr></thead><tbody>' + [1, 2, 3, 4, 5].map(j => { const a = at(j), b = at(j - 1); return '<tr><th scope="row">FY' + (fy0 + j) + '</th><td class="num">' + nf(a[1] / S_.ks * 100, 1) + '%</td><td class="num">' + nf((1 - a[2] / y(a[1])) * 100, 1) + '%</td><td class="num">' + nf((a[2] / b[2] - 1) * 100, 2) + '%</td></tr>'; }).join('') + '</tbody></table>', tcap('Five-year projection along the saddle path'), 'Total consumption growth adds n + g ≈ ' + nf((p.n + p.g) * 100, 2) + '% per year.');
  };
  mlCtl(s, [{ k: 'rho', label: 'Time preference ρ', min: 0.5, max: 8, step: 0.1, v: 2, fmt: v => v + '%' }, { k: 'theta', label: 'Inverse intertemporal elasticity θ', min: 0.5, max: 5, step: 0.1, v: 2, fmt: v => nf(v, 1) }], draw);
  s.append(out); draw({ rho: 2, theta: 2 });
  const sens = []; [0.01, 0.02, 0.04].forEach(rho => [1, 2, 4].forEach(theta => { const x = rckSolve(Object.assign({}, p0, { rho, theta })); sens.push([rho, theta, x.ss, x.rs]); }));
  tableWrap(s, '<table><thead><tr><th class="num">ρ</th><th class="num">θ</th><th class="num">Steady-state saving</th><th class="num">r*</th></tr></thead><tbody>' + sens.map(r => '<tr><td class="num">' + mlPct(r[0], 0) + '</td><td class="num">' + nf(r[1], 0) + '</td><td class="num">' + mlPct(r[2], 1) + '</td><td class="num">' + mlPct(r[3], 1) + '</td></tr>').join('') + '</tbody></table>', tcap('Checks: sensitivity to preferences'), 'Validation and failure test: for any plausible ρ and θ, the model’s long-run real rate r* = ρ + θg is far above Bangladesh’s average real interest rate (' + mlPct(T.real_rate, 1) + ', 2015–2025). With growth this fast, a competitive capital market would pay much more; the gap is consistent with administered rates and financial repression (McKinnon, 1973; Shaw, 1973), which the model assumes away.');
  mlBoxes(s, 'Saving is optimal, not assumed; links interest rates, growth and patience; the standard core of modern macroeconomics, including DSGE models.', 'One infinitely lived representative household; perfect foresight; competitive markets; closed economy; the same technology as the Solow calibration.', 'No borrowing constraints, inequality or uncertainty; ρ and θ are not estimated here; the shooting solution assumes the economy jumps onto the saddle path.', 'Calibrate ρ and θ from Bangladesh household data, add an open capital account and remittances, and compare optimal and actual consumption paths.');
  mlRefs(s, [['Cass, D. (1965). Optimum growth in an aggregative model of capital accumulation. The Review of Economic Studies, 32(3), 233–240.', 'https://doi.org/10.2307/2295827'], ['Koopmans, T. C. (1965). On the concept of optimal economic growth. In The econometric approach to development planning (pp. 225–287). North-Holland.', ''], ['McKinnon, R. I. (1973). Money and capital in economic development. Brookings Institution.', ''], ['Ramsey, F. P. (1928). A mathematical theory of saving. The Economic Journal, 38(152), 543–559.', 'https://doi.org/10.2307/2224098'], ['Romer, D. (2019). Advanced macroeconomics (5th ed.). McGraw-Hill.', ''], ['Shaw, E. S. (1973). Financial deepening in economic development. Oxford University Press.', '']]);
}
/* ---------- Dynamic AD-AS ---------- */
function adasSim(p, sh, Hq) {
  let x = 0, pi = 0, d = 0, u = 0, v = 0; const X = [], P = [], I = [];
  for (let t = 0; t < Hq; t++) {
    d = p.rd * d + (t === 0 ? sh.d : 0); u = p.ru * u + (t === 0 ? sh.u : 0); v = p.rv * v + (t === 0 ? sh.v : 0);
    const den = 1 + p.phix / p.sigma + (p.phip - 1) * p.kappa / p.sigma, num = p.rhox * x - ((p.phip - 1) / p.sigma) * (pi + u) - v / p.sigma + d;
    x = num / den; pi = pi + p.kappa * x + u; X.push(x); P.push(pi); I.push(p.phip * pi + p.phix * x + v);
  }
  return { X, P, I };
}
function mlAdas(host, T) {
  const { i, n, o, sub, sup, fr, r } = MX, t = i('t'), Dp = T.dsge_post || {};
  const s = sec(host, 'Aggregate demand and aggregate supply (dynamic AD-AS)', 'A quarterly AD-AS model using the site’s estimated DSGE parameters (posterior means), simulated 20 quarters (five years) ahead.', 'ml-adas');
  mlText(s, 'What it is', '<p>The AD-AS model explains output and inflation together. Aggregate demand (AD) combines spending (the IS curve) with the central bank’s policy rule: higher inflation brings higher real interest rates and lower demand. Aggregate supply (AS) is a Phillips curve: a positive output gap pushes inflation up. Demand, cost-push and policy shocks move the curves; the economy adjusts over time.</p><p><b>Why it matters for Bangladesh:</b> it shows why the 2022–2024 cost-push shocks (food, fuel and the Taka) raised inflation for so long, and how strongly Bangladesh Bank must respond to anchor it.</p>');
  mlText(s, 'Equations', [
    EQN(r(sub(i('x'), t), o('='), sub(i('ρ'), i('x')), sub(i('x'), r(t, o('−'), n('1'))), o('−'), fr(n('1'), i('σ')), o('('), sub(i('i'), t), o('−'), sub(i('π'), t), o(')'), o('+'), sub(i('d'), t)), '(1) IS curve: x = output gap, π and i in deviations from target and neutral rate'),
    EQN(r(sub(i('π'), t), o('='), sub(i('π'), r(t, o('−'), n('1'))), o('+'), i('κ'), sub(i('x'), t), o('+'), sub(i('u'), t)), '(2) AS (accelerationist Phillips curve)'),
    EQN(r(sub(i('i'), t), o('='), sub(i('φ'), i('π')), sub(i('π'), t), o('+'), sub(i('φ'), i('x')), sub(i('x'), t), o('+'), sub(i('v'), t)), '(3) Policy rule (Taylor rule)'),
    EQN(r(sub(i('x'), t), o('='), fr(r(sub(i('ρ'), i('x')), sub(i('x'), r(t, o('−'), n('1'))), o('−'), fr(r(sub(i('φ'), i('π')), o('−'), n('1')), i('σ')), sub(i('π'), t), o('−'), fr(sub(i('v'), t), i('σ')), o('+'), sub(i('d'), t)), r(n('1'), o('+'), fr(sub(i('φ'), i('x')), i('σ'))))), '(4) AD curve: (3) substituted into (1)')].join(''));
  mlText(s, 'Derivation, step by step', '<ol class="ol-list"><li>Substitute the policy rule (3) into the IS curve (1): the real rate gap is (φ<sub>π</sub> − 1)π + φ<sub>x</sub>x + v, which gives the AD curve (4), downward sloping in (x, π) when φ<sub>π</sub> &gt; 1.</li><li>Combine AD (4) with AS (2) and solve the two linear equations for x<sub>t</sub> and π<sub>t</sub> each quarter, given last quarter’s values and the shocks.</li><li>Shocks follow AR(1) processes d<sub>t</sub> = ρ<sub>d</sub>d<sub>t−1</sub> + ε<sub>t</sub> (likewise u, v), with persistence from the DSGE estimation.</li><li>Stability requires φ<sub>π</sub> &gt; 1 (the Taylor principle): otherwise a rise in inflation lowers the real rate, raises demand and feeds further inflation.</li></ol>');
  const P0 = { sigma: Dp['σ'] || 1, kappa: Dp['κ'] || 0.1, phip: Dp['φπ'] || 1.5, phix: Dp['φy'] || 0.1, rhox: 0.5, rd: Dp['ρd'] || 0.8, ru: Dp['ρu'] || 0.8, rv: Dp['ρv'] || 0.5 };
  tableWrap(s, '<table><thead><tr><th>Parameter</th><th class="num">Value</th><th>Source</th></tr></thead><tbody>' + [['σ (inverse intertemporal elasticity)', P0.sigma], ['κ (Phillips-curve slope)', P0.kappa], ['φπ (response to inflation)', P0.phip], ['φx (response to the output gap)', P0.phix], ['ρd, ρu, ρv (shock persistence)', [P0.rd, P0.ru, P0.rv].map(v => nf(v, 2)).join(', ')], ['ρx (output persistence)', P0.rhox], ['Shock sizes (one standard deviation)', ['σd ' + nf(Dp['σd'] || 0.2, 2), 'σu ' + nf(Dp['σu'] || 0.3, 2), 'σv ' + nf(Dp['σv'] || 0.3, 2)].join(', ')]].map((r_, j) => '<tr><th scope="row">' + esc(r_[0]) + '</th><td class="num">' + (typeof r_[1] === 'number' ? nf(r_[1], 3) : r_[1]) + '</td><td>' + (j === 5 ? 'Assumption' : 'Site DSGE, Bayesian posterior mean') + '</td></tr>').join('') + '</tbody></table>', tcap('Calibration'), 'The DSGE is forward-looking; this AD-AS version is backward-looking, which makes the dynamics transparent and lets the two be compared (checks below).');
  const out = document.createElement('div'), sd = { d: Dp['σd'] || 0.2, u: Dp['σu'] || 0.3, v: Dp['σv'] || 0.3 };
  const draw = st => {
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    const p = Object.assign({}, P0, { phip: st.phip, kappa: st.kappa, rhox: st.rhox }), sh = { d: 0, u: 0, v: 0 }; sh[st.shock] = sd[st.shock] * st.size;
    const R = adasSim(p, sh, 20), q = R.X.map((_, j) => 'Q' + (j + 1));
    const explode = p.phip <= 1;
    mlKpis(out, [['Peak inflation response', nf(R.P.reduce((a, v) => Math.abs(v) > Math.abs(a) ? v : a, 0), 3) + ' pp'], ['Peak output-gap response', nf(R.X.reduce((a, v) => Math.abs(v) > Math.abs(a) ? v : a, 0), 3) + ' pp'], ['Inflation after 5 years', nf(R.P[19], 3) + ' pp'], ['Taylor principle', p.phip > 1 ? 'satisfied' : 'violated']]);
    if (explode) out.insertAdjacentHTML('beforeend', '<p class="note"><b>Failure: the Taylor principle is violated (φπ ≤ 1).</b> Real interest rates fall as inflation rises, so inflation does not return to target: after five years it is still ' + nf(R.P[19], 2) + ' points above it.</p>');
    const g = grid(out);
    figure(g, { ts: false, title: 'Responses over five years', sub: 'Deviations from steady state, percentage points; ' + ({ d: 'demand', u: 'cost-push', v: 'monetary policy' })[st.shock] + ' shock of ' + nf(st.size, 1) + ' standard deviation(s)', h: 300, source: 'Model simulation (site DSGE parameters).', render: TH => tsOption(TH, q, [S('Inflation', R.P, { w: 2.4, color: '#E5484D' }), S('Output gap', R.X, { w: 2.4, color: '#2F6FED' }), S('Policy rate', R.I, { w: 1.8, dash: true, color: '#111827' })], { y1: 'pp', dec: 3 }) });
    const pis = Array.from({ length: 41 }, (_, j) => -2 + j * 0.1), a = 1 + p.phix / p.sigma, ad = (dd, vv) => pis.map(pi => [(-((p.phip - 1) / p.sigma) * pi - vv / p.sigma + dd) / a, pi]), as = uu => pis.map(pi => [(pi - uu) / p.kappa, pi]).filter(z => Math.abs(z[0]) <= 3);
    figure(g, { ts: false, title: 'AD and AS in the first quarter', sub: 'Before (solid) and after (dashed) the shock; output gap (x) and inflation (π) in deviations', h: 300, source: 'Model calculations.', render: TH => mlXY(TH, [{ name: 'AD before', type: 'line', showSymbol: false, data: ad(0, 0), lineStyle: { color: '#2F6FED', width: 2 } }, { name: 'AD after', type: 'line', showSymbol: false, data: ad(sh.d, sh.v), lineStyle: { color: '#2F6FED', width: 2, type: 'dashed' } }, { name: 'AS before', type: 'line', showSymbol: false, data: as(0), lineStyle: { color: '#E5484D', width: 2 } }, { name: 'AS after', type: 'line', showSymbol: false, data: as(sh.u), lineStyle: { color: '#E5484D', width: 2, type: 'dashed' } }, { name: 'New equilibrium', type: 'scatter', data: [[R.X[0], R.P[0]]], symbolSize: 10, itemStyle: { color: '#111827' } }], 'output gap x', 'inflation π') });
    tableWrap(out, '<table><thead><tr><th>Year</th><th class="num">Inflation</th><th class="num">Output gap</th><th class="num">Policy rate</th></tr></thead><tbody>' + [0, 1, 2, 3, 4].map(y_ => { const av = a_ => a_.slice(y_ * 4, y_ * 4 + 4).reduce((s_, v) => s_ + v, 0) / 4; return '<tr><th scope="row">Year ' + (y_ + 1) + '</th><td class="num">' + nf(av(R.P), 3) + '</td><td class="num">' + nf(av(R.X), 3) + '</td><td class="num">' + nf(av(R.I), 3) + '</td></tr>'; }).join('') + '</tbody></table>', tcap('Five-year path, annual averages'), 'Percentage-point deviations from the steady state.');
  };
  mlCtl(s, [{ k: 'shock', label: 'Shock', options: [['u', 'Cost-push (food, fuel, Taka)'], ['d', 'Demand'], ['v', 'Monetary policy tightening']], v: 'u', fmt: v => v }, { k: 'size', label: 'Size (standard deviations)', min: 0.5, max: 5, step: 0.5, v: 1, fmt: v => nf(v, 1) }, { k: 'phip', label: 'Policy response to inflation φπ', min: 0.6, max: 3, step: 0.05, v: +P0.phip.toFixed(2), fmt: v => nf(v, 2) }, { k: 'kappa', label: 'Phillips-curve slope κ', min: 0.02, max: 0.3, step: 0.005, v: +P0.kappa.toFixed(3), fmt: v => nf(v, 3) }, { k: 'rhox', label: 'Output persistence ρx', min: 0, max: 0.9, step: 0.05, v: 0.5, fmt: v => nf(v, 2) }], draw);
  s.append(out); draw({ shock: 'u', size: 1, phip: P0.phip, kappa: P0.kappa, rhox: 0.5 });
  const tp = [0.8, 1.0, 1.2, 1.5, 2.0, 3.0].map(ph => { const R = adasSim(Object.assign({}, P0, { phip: ph }), { d: 0, u: sd.u, v: 0 }, 20); return [ph, Math.max(...R.P.map(Math.abs)), R.P[19], R.X.reduce((a, v) => a + v, 0), ph <= 1]; });
  tableWrap(s, '<table><thead><tr><th class="num">φπ</th><th class="num">Largest inflation deviation</th><th class="num">Inflation after 5 years</th><th class="num">Cumulative output gap</th></tr></thead><tbody>' + tp.map(r_ => '<tr><td class="num">' + nf(r_[0], 2) + (r_[4] ? ' <small>(fails)</small>' : '') + '</td><td class="num">' + nf(r_[1], 3) + '</td><td class="num">' + nf(r_[2], 3) + (r_[4] ? ' <small>not returning</small>' : '') + '</td><td class="num">' + nf(r_[3], 2) + '</td></tr>').join('') + '</tbody></table>', tcap('Checks: the Taylor-principle failure test, after a one-standard-deviation cost-push shock'), 'A stronger response anchors inflation faster at the cost of a larger cumulative output loss: the policy trade-off. With φπ at or below 1 the model fails: inflation does not return to target.');
  const dI = BD.dsge && BD.dsge.irf && BD.dsge.irf['Monetary policy'];
  if (dI && dI.pi) {
    const R = adasSim(P0, { d: 0, u: 0, v: sd.v }, Math.min(20, dI.pi.length)), g = grid(s), q = R.P.map((_, j) => 'Q' + (j + 1));
    figure(g, { ts: false, title: 'Validation: AD-AS against the estimated DSGE', sub: 'Inflation response to a monetary-policy tightening, percentage points', h: 280, source: 'Site DSGE; model simulation.', render: TH => tsOption(TH, q, [S('Backward-looking AD-AS', R.P, { w: 2.2, color: '#2F6FED' }), S('Forward-looking DSGE', dI.pi.slice(0, q.length), { w: 2.2, dash: true, color: '#E5484D' })], { y1: 'pp', dec: 3 }) });
    figure(g, { ts: false, title: 'Validation: output-gap responses', sub: 'Same policy shock', h: 280, source: 'Site DSGE; model simulation.', render: TH => tsOption(TH, q, [S('Backward-looking AD-AS', R.X, { w: 2.2, color: '#2F6FED' }), S('Forward-looking DSGE', (dI.x || []).slice(0, q.length), { w: 2.2, dash: true, color: '#E5484D' })], { y1: 'pp', dec: 3 }) });
    s.insertAdjacentHTML('beforeend', '<p class="note">Both models agree on the direction: tightening lowers output and inflation. The DSGE’s inflation response is immediate because firms look ahead; in the backward-looking AD-AS, inflation adjusts gradually through the output gap. The truth for Bangladesh probably lies between (a hybrid Phillips curve).</p>');
  }
  mlBoxes(s, 'Shows demand, supply and policy together; transparent dynamics; uses the parameters estimated for Bangladesh; demonstrates the Taylor principle.', 'Linear model; adaptive expectations in the Phillips curve; a simple policy rule; shocks follow AR(1) processes.', 'Backward-looking expectations ignore credibility effects; no exchange-rate channel; ρx is assumed; one aggregate price.', 'A hybrid Phillips curve with forward- and backward-looking terms, an open-economy version with the exchange rate, and estimation on Bangladesh quarterly data.');
  mlRefs(s, [['Clarida, R., Galí, J., & Gertler, M. (1999). The science of monetary policy: A New Keynesian perspective. Journal of Economic Literature, 37(4), 1661–1707.', 'https://doi.org/10.1257/jel.37.4.1661'], ['Galí, J. (2015). Monetary policy, inflation, and the business cycle (2nd ed.). Princeton University Press.', ''], ['Romer, D. (2019). Advanced macroeconomics (5th ed.). McGraw-Hill.', ''], ['Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.', 'https://doi.org/10.1016/0167-2231(93)90009-L']]);
}
/* ---------- IS-LM-BP (Mundell–Fleming) ---------- */
function islmBase(p) { const A1 = 1 - p.c * (1 - p.t) + p.m, X0 = p.m * 100, G0 = 15, I0 = A1 * 100 + p.b * p.r0 - X0 - G0, M0 = p.k * 100 - p.h * p.r0; return { A1, X0, G0, I0, M0 }; }
function islmSolve(p, B, x) {
  const G = B.G0 + x.dG, M = B.M0 * (1 + x.dM / 100), rs = p.r0 + x.drs, psi = x.psi;
  if (x.regime === 'float') {
    const sol = rcSolve([[B.A1, p.b, -p.eta], [p.k, -p.h, 0], [-p.m, psi, p.eta]], [B.I0 + G + B.X0, M, psi * rs - B.X0]);
    return sol ? { Y: sol[0], r: sol[1], e: sol[2], M, G, rs } : null;
  }
  const sol = rcSolve([[B.A1, p.b], [-p.m, psi]], [B.I0 + G + B.X0, psi * rs - B.X0]);
  if (!sol) return null;
  return { Y: sol[0], r: sol[1], e: 0, M: p.k * sol[0] - p.h * sol[1], G, rs };
}
function mlIslm(host, T) {
  const { i, n, o, sub, sup, fr, r } = MX;
  const K = T.keynes || {}, P0 = { c: K.mpc_lr || 0.8, t: (T.tax_gdp || 8) / 100, m: K.mpm_lr || 0.2, b: Math.abs(K.inv_r || 0.1), k: 0.4, h: 2, eta: 0.15, r0: 10 };
  const s = sec(host, 'IS-LM-BP (Mundell–Fleming) open-economy model', 'Goods market, money market and balance of payments together, under floating or fixed exchange rates, with spending propensities from the site’s Keynesian model.', 'ml-islm');
  mlText(s, 'What it is', '<p>The Mundell–Fleming model (Fleming, 1962; Mundell, 1963) extends IS-LM to an open economy. The IS curve shows goods-market equilibrium, the LM curve money-market equilibrium, and the BP curve balance-of-payments equilibrium. Its famous result: with mobile capital, monetary policy is powerful under floating rates and powerless under a fixed rate, while fiscal policy is the reverse.</p><p><b>Why it matters for Bangladesh:</b> Bangladesh moved from a managed peg to a crawling peg and towards more flexibility, with a largely closed capital account. The model shows how those choices change the power of fiscal and monetary policy.</p>');
  mlText(s, 'Equations', [
    EQN(r(i('Y'), o('='), i('c'), o('('), n('1'), o('−'), i('t'), o(')'), i('Y'), o('+'), sub(i('I'), n('0')), o('−'), i('b'), i('r'), o('+'), i('G'), o('+'), sub(i('X'), n('0')), o('+'), i('η'), i('e'), o('−'), i('m'), i('Y')), '(1) IS: goods market (e = log exchange rate, up = depreciation)'),
    EQN(r(fr(i('M'), i('P')), o('='), i('k'), i('Y'), o('−'), i('h'), i('r')), '(2) LM: money market'),
    EQN(r(sub(i('X'), n('0')), o('+'), i('η'), i('e'), o('−'), i('m'), i('Y'), o('+'), i('ψ'), o('('), i('r'), o('−'), sup(i('r'), o('*')), o(')'), o('='), n('0')), '(3) BP: net exports plus net capital inflows (ψ = capital mobility)')].join(''));
  mlText(s, 'Derivation, step by step', '<ol class="ol-list"><li>Collect Y terms in (1): (1 − c(1 − t) + m)Y + br − ηe = I<sub>0</sub> + G + X<sub>0</sub>; the coefficient on Y is the inverse of the open-economy multiplier.</li><li><b>Floating rate:</b> M is set by the central bank and e adjusts; (1)–(3) are three linear equations in Y, r and e.</li><li><b>Fixed rate:</b> e is held constant and the central bank buys or sells reserves, so M adjusts; (1) and (3) give Y and r, then (2) gives the money supply.</li><li>With perfect capital mobility (ψ → ∞), BP forces r = r*: under floating, LM alone fixes Y, so fiscal policy only moves the exchange rate; under a fixed rate, money adjusts and fiscal policy has its full multiplier.</li></ol>');
  tableWrap(s, '<table><thead><tr><th>Parameter</th><th class="num">Value</th><th>Source</th></tr></thead><tbody>' + [['c (marginal propensity to consume)', P0.c, 'Site Keynesian model, long-run'], ['t (tax rate)', P0.t, 'World Bank, tax revenue % of GDP'], ['m (marginal propensity to import)', P0.m, 'Site Keynesian model, long-run'], ['b (investment response to r, GDP points per pp)', P0.b, 'Site Keynesian model'], ['k (money–income ratio)', P0.k, 'Assumption: broad money about 40% of GDP'], ['h (money-demand response to r)', P0.h, 'Assumption'], ['η (net-export response to a 1% depreciation)', P0.eta, 'Assumption']].map(r_ => '<tr><th scope="row">' + esc(r_[0]) + '</th><td class="num">' + nf(r_[1], 3) + '</td><td>' + esc(r_[2]) + '</td></tr>').join('') + '</tbody></table>', tcap('Calibration'), 'Baseline normalised to GDP = 100, an interest rate of 10% equal to the world rate, and balanced payments.');
  const B = islmBase(P0), out = document.createElement('div'), PSI = [[0, 'None (closed capital account)'], [0.5, 'Low (Bangladesh today)'], [5, 'Moderate'], [50, 'High'], [10000, 'Perfect']];
  const draw = st => {
    try { disposeIn(out); } catch (e) { /* none */ }
    out.innerHTML = '';
    const b0 = islmSolve(P0, B, { dG: 0, dM: 0, drs: 0, psi: st.psi, regime: st.regime }), x1 = islmSolve(P0, B, { dG: st.dG, dM: st.dM, drs: st.drs, psi: st.psi, regime: st.regime });
    if (!b0 || !x1) { out.innerHTML = '<p class="note">No equilibrium for these settings.</p>'; return; }
    mlKpis(out, [['GDP change', nf(x1.Y - b0.Y, 2) + '% of GDP'], ['Interest rate change', nf(x1.r - b0.r, 2) + ' pp'], ['Exchange-rate change', st.regime === 'float' ? nf(x1.e - b0.e, 2) + '% (+ = depreciation)' : 'held fixed'], ['Money supply change', nf((x1.M / b0.M - 1) * 100, 2) + '%']]);
    const Ys = Array.from({ length: 41 }, (_, j) => 90 + j * 0.5), cur = (z, G) => ({ IS: Ys.map(Y => [Y, (B.I0 + G + B.X0 + P0.eta * z.e - B.A1 * Y) / P0.b]), LM: Ys.map(Y => [Y, (P0.k * Y - z.M) / P0.h]), BP: st.psi < 1e-6 ? [[(B.X0 + P0.eta * z.e) / P0.m, 0], [(B.X0 + P0.eta * z.e) / P0.m, 20]] : Ys.map(Y => [Y, z.rs + (P0.m * Y - B.X0 - P0.eta * z.e) / st.psi]) });
    const c0 = cur(b0, B.G0), c1 = cur(x1, B.G0 + st.dG), clip = a => a.filter(q => q[1] > -5 && q[1] < 25), g = grid(out);
    figure(g, { ts: false, title: 'IS, LM and BP before (solid) and after (dashed)', sub: 'GDP (index, baseline 100) and the interest rate (%)', h: 340, source: 'Model calculations.', render: TH => mlXY(TH, [['IS', '#2F6FED'], ['LM', '#E5484D'], ['BP', '#12A594']].flatMap(([nm, col]) => [{ name: nm, type: 'line', showSymbol: false, data: clip(c0[nm]), lineStyle: { color: col, width: 2 } }, { name: nm + ' after', type: 'line', showSymbol: false, data: clip(c1[nm]), lineStyle: { color: col, width: 2, type: 'dashed' } }]).concat([{ name: 'Equilibrium after', type: 'scatter', data: [[x1.Y, x1.r]], symbolSize: 10, itemStyle: { color: '#111827' } }]), 'GDP (index)', 'interest rate, %') });
    const cs = [], expts = [['Fiscal expansion: G + 1% of GDP', { dG: 1, dM: 0, drs: 0 }], ['Monetary expansion: M + 1%', { dG: 0, dM: 1, drs: 0 }], ['World interest rate + 1 pp', { dG: 0, dM: 0, drs: 1 }]];
    expts.forEach(([lab, ex]) => { const row = [lab]; [['float', 0.5], ['float', 10000], ['fixed', 0.5], ['fixed', 10000]].forEach(([rg, ps]) => { const a = islmSolve(P0, B, { dG: 0, dM: 0, drs: 0, psi: ps, regime: rg }), z = islmSolve(P0, B, Object.assign({ psi: ps, regime: rg }, ex)); row.push(a && z ? z.Y - a.Y : null); }); cs.push(row); });
    tableWrap(out, '<table><thead><tr><th>Policy</th><th class="num">Floating, low mobility</th><th class="num">Floating, perfect mobility</th><th class="num">Fixed, low mobility</th><th class="num">Fixed, perfect mobility</th></tr></thead><tbody>' + cs.map(r_ => '<tr><th scope="row">' + esc(r_[0]) + '</th>' + r_.slice(1).map(v => '<td class="num">' + (v == null ? '–' : nf(v, 3)) + '</td>').join('') + '</tr>').join('') + '</tbody></table>', tcap('Checks: effect on GDP (% of baseline) across regimes and capital mobility'), 'Validation against theory: with perfect mobility, fiscal policy has almost no effect under floating rates and monetary policy has none under a fixed rate, the Mundell–Fleming propositions. The calibration reproduces them.');
  };
  mlCtl(s, [{ k: 'regime', label: 'Exchange-rate regime', options: [['float', 'Floating'], ['fixed', 'Fixed (peg)']], v: 'float', fmt: v => v }, { k: 'psi', label: 'Capital mobility', options: PSI.map(([v, l]) => [v, l]), v: 0.5, fmt: v => v }, { k: 'dG', label: 'Government spending change, % of GDP', min: -5, max: 5, step: 0.5, v: 1, fmt: v => (v > 0 ? '+' : '') + v }, { k: 'dM', label: 'Money supply change, %', min: -10, max: 10, step: 1, v: 0, fmt: v => (v > 0 ? '+' : '') + v }, { k: 'drs', label: 'World interest rate change, pp', min: -3, max: 3, step: 0.25, v: 0, fmt: v => (v > 0 ? '+' : '') + v }], draw);
  s.append(out); draw({ regime: 'float', psi: 0.5, dG: 1, dM: 0, drs: 0 });
  mlBoxes(s, 'The standard framework for policy in open economies; makes the trade-off between exchange-rate stability and monetary independence explicit (the “trilemma”).', 'Fixed prices (short run); static expectations about the exchange rate; perfect substitutability of bonds when mobility is perfect; linear relations.', 'No price adjustment, no expectations, no remittances or reserves dynamics; k, h and η are assumed; Bangladesh’s regime is in between fixed and floating.', 'Add a crawling-peg regime, imperfect capital mobility estimated from the financial account, and a price block (Dornbusch overshooting).');
  mlRefs(s, [['Fleming, J. M. (1962). Domestic financial policies under fixed and under floating exchange rates. IMF Staff Papers, 9(3), 369–380.', 'https://doi.org/10.2307/3866091'], ['Mundell, R. A. (1963). Capital mobility and stabilization policy under fixed and flexible exchange rates. The Canadian Journal of Economics and Political Science, 29(4), 475–485.', 'https://doi.org/10.2307/139336'], ['Obstfeld, M., Shambaugh, J. C., & Taylor, A. M. (2005). The trilemma in history: Tradeoffs among exchange rates, monetary policies, and capital mobility. The Review of Economics and Statistics, 87(3), 423–438.', '']]);
}

/* ======================= v3.17: DSGE checks (identification, robustness, validation, suitability) ======================= */
function dsgeChecks(body) {
  const Dg = BD && BD.dsge; if (!Dg || !Dg.bayes || !Dg.bayes.params) return;
  const s = sec(body, 'DSGE model checks: identification, robustness, failure tests, validation and suitability', 'Computed from the stored Bayesian estimation and the site’s VAR, so they update whenever the model is re-estimated.', 'dsge-checks');
  const P = Dg.bayes.params.filter(x => x.prior && x.post);
  const verdict = r => r < 0.5 ? 'well identified: the data dominate' : r < 0.9 ? 'partly identified' : 'weakly identified: the prior dominates';
  tableWrap(s, '<table><thead><tr><th>Parameter</th><th class="num">Prior mean (sd)</th><th class="num">Posterior mean (sd)</th><th class="num">Posterior sd ÷ prior sd</th><th class="num">Shift, in prior sds</th><th class="num">R-hat</th><th class="num">ESS</th><th>Verdict</th></tr></thead><tbody>' +
    P.map(x => { const ratio = x.post.sd / x.prior.sd, shift = (x.post.mean - x.prior.mean) / x.prior.sd; return '<tr><th scope="row">' + esc(x.sym + ' ' + x.name) + '</th><td class="num">' + nf(x.prior.mean, 3) + ' (' + nf(x.prior.sd, 3) + ')</td><td class="num">' + nf(x.post.mean, 3) + ' (' + nf(x.post.sd, 3) + ')</td><td class="num">' + nf(ratio, 2) + '</td><td class="num">' + (shift > 0 ? '+' : '') + nf(shift, 2) + '</td><td class="num">' + (x.rhat == null ? '–' : nf(x.rhat, 3)) + '</td><td class="num">' + (x.ess == null ? '–' : nf(x.ess, 0)) + '</td><td>' + verdict(ratio) + '</td></tr>'; }).join('') + '</tbody></table>',
    tcap('Identification and prior sensitivity'), 'A posterior much narrower than the prior (ratio well below 1) means the data are informative; a ratio near 1 means the result mostly repeats the prior, so it is sensitive to the prior choice. Shift: how far the data moved the parameter from the prior mean.');
  const rh = P.map(x => x.rhat).filter(v => v != null), es = P.map(x => x.ess).filter(v => v != null), gw = P.filter(x => x.geweke_p != null && x.geweke_p < 0.05).length;
  const weak = P.filter(x => x.post.sd / x.prior.sd >= 0.9).map(x => x.sym), strong = P.filter(x => x.post.sd / x.prior.sd < 0.5).map(x => x.sym);
  const phi = P.find(x => x.sym === 'φπ'), taylorOk = phi && phi.post.ci95 && phi.post.ci95[0] > 1;
  const pm = k => (P.find(x => x.sym === k) || {}).post, betaC = ((Dg.params || []).find(x => x && x.sym === 'β') || {}).v || 0.99, detPost = pm('κ') && pm('φπ') && pm('φy') ? pm('κ').mean * (pm('φπ').mean - 1) + (1 - betaC) * pm('φy').mean : null;
  const Cal = {}; (Dg.params || []).forEach(x => { if (x && x.sym) Cal[x.sym] = x.v; });
  const common = P.filter(x => Cal[x.sym] != null);
  if (common.length) tableWrap(s, '<table><thead><tr><th>Parameter</th><th class="num">Textbook calibration (Galí, 2015)</th><th class="num">Bangladesh posterior</th><th class="num">Difference</th></tr></thead><tbody>' + common.map(x => '<tr><th scope="row">' + esc(x.sym + ' ' + x.name) + '</th><td class="num">' + nf(Cal[x.sym], 3) + '</td><td class="num">' + nf(x.post.mean, 3) + '</td><td class="num">' + ((x.post.mean - Cal[x.sym]) > 0 ? '+' : '') + nf(x.post.mean - Cal[x.sym], 3) + '</td></tr>').join('') + '</tbody></table>', tcap('Heterogeneity: Bangladesh against the textbook benchmark'), 'The sample has only ' + ((Dg.bayes.meta || {}).T || 'about 40') + ' quarters (' + esc((Dg.bayes.meta || {}).sample || '') + '), too few to re-estimate the model on sub-samples reliably; heterogeneity is therefore shown against the benchmark economy rather than over time. Sub-sample heterogeneity for the data-driven models is in the Robustness and Forecast comparison tabs.');
  const V = BD.var && BD.var.irf, dp = Dg.irf && Dg.irf['Monetary policy'] && Dg.irf['Monetary policy'].pi;
  let val = '';
  if (V && V.mean && dp) {
    const ki = (BD.var.keys || []).indexOf('infl'), kc = (BD.var.keys || []).indexOf('call');
    if (ki >= 0 && kc >= 0) {
      const q = a => Array.from({ length: 8 }, (_, h) => (a[3 * h] + a[3 * h + 1] + a[3 * h + 2]) / 3), vm = q(V.mean[ki][kc]), vl = q(V.lo[ki][kc]), vh = q(V.hi[ki][kc]), dq = dp.slice(0, 8);
      const nm = a => { const m = Math.max(...a.map(Math.abs)) || 1; return a.map(v => v / m); }, g = grid(s), lab = Array.from({ length: 8 }, (_, h) => 'Q' + (h + 1));
      figure(g, { ts: false, title: 'Validation: inflation after a monetary tightening, DSGE against the VAR', sub: 'Each response scaled by its own largest value, quarters after the shock', h: 290, source: 'Site DSGE (Bayesian) and VAR (Cholesky ordering).', render: TH => tsOption(TH, lab, [S('DSGE (theory-based)', nm(dq), { w: 2.4, color: '#E5484D' }), S('VAR (data-based)', nm(vm), { w: 2.4, color: '#2F6FED' })], { y1: 'scaled', dec: 2 }) });
      figure(g, { ts: false, title: 'VAR response with its 90% band', sub: 'Inflation response to a one-standard-deviation call-rate shock, percentage points, quarterly averages', h: 290, source: 'Site VAR.', render: TH => tsOption(TH, lab, [S('Response', vm, { w: 2.4, color: '#2F6FED' }), S('90% lower', vl, { w: 1, dash: true, color: '#2F6FED' }), S('90% upper', vh, { w: 1, dash: true, color: '#2F6FED' })], { y1: 'pp', dec: 3 }) });
      const ds = dq.slice(0, 4).reduce((a, v) => a + v, 0), vs = vm.slice(0, 4).reduce((a, v) => a + v, 0), zero = vl.slice(0, 4).some((v, h) => v <= 0 && vh[h] >= 0);
      val = 'Validation: in the first year the DSGE predicts inflation ' + (ds < 0 ? 'falling' : 'rising') + ' after a tightening; the data-based VAR finds it ' + (vs < 0 ? 'falling' : 'rising') + (zero ? ', with a 90% band that includes zero' : '') + '. ' + (Math.sign(ds) === Math.sign(vs) && !zero ? 'The two agree.' : 'They do not agree clearly, so the DSGE’s policy effect reflects its theoretical structure more than evidence in the data, consistent with the weak transmission found in the Model library.');
    }
  }
  const pts = ['Convergence: largest R-hat ' + (rh.length ? nf(Math.max(...rh), 3) : '–') + ' (below 1.1 is the usual standard), smallest effective sample size ' + (es.length ? nf(Math.min(...es), 0) : '–') + ', and ' + gw + ' of ' + P.length + ' Geweke tests reject equal means at 5%.',
    'Identification: ' + (strong.length ? strong.join(', ') + ' are well identified by the data' : 'no parameter is strongly identified') + (weak.length ? '; ' + weak.join(', ') + ' mostly reflect the prior, so results that depend on them are sensitive to the prior choice.' : '.'),
    'Failure tests: the determinacy condition κ(φπ − 1) + (1 − β)φy > 0 gives ' + nf(Dg.determinacy, 3) + ' at the textbook calibration and ' + (detPost == null ? '–' : nf(detPost, 3)) + ' at the posterior means' + (detPost != null && detPost > 0 ? ', so the estimated model has a unique stable equilibrium' : detPost != null ? ', so the estimated model is indeterminate' : '') + '; the Taylor principle ' + (phi ? (taylorOk ? 'holds with more than 95% posterior probability (95% interval for φπ: ' + nf(phi.post.ci95[0], 2) + '–' + nf(phi.post.ci95[1], 2) + ').' : 'is not established with 95% posterior probability.') : 'cannot be checked.'),
    val, 'Suitability: the DSGE is a policy-analysis model (scenarios, transmission, the inflation–output trade-off), not the site’s forecasting tool; for forecasts, the Forecast comparison tab ranks ten data-driven models by back-tested accuracy, and the AD-AS simulator gives five-year scenario paths with these estimated parameters.'].filter(Boolean);
  s.insertAdjacentHTML('beforeend', '<div class="card"><h3>What the checks show</h3><ul class="ol-list">' + pts.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div>');
}

return { extraPlan, countryFill, initCL, routeCL, initSecurity, worldGrowth2, initPlans, renderAds, initBD, initLab, routeBD, addSrcAfter, srcFor, addLabels, gateBlocks, ctlHTML, syncCtl, rerender, renderGeo, initLearnX, initFAQ };
})();
function initBD() { return BDX.initBD(); }
function initLab() { return BDX.initLab(); }
function routeBD(h) { return BDX.routeBD(h); }
function initCL() { return BDX.initCL(); }
function initPlans() { return BDX.initPlans(); }
function wmark(opt) {
  if (!opt || typeof opt !== 'object') return opt;
  try { beautify(opt); } catch (e) { /* styling optional */ }
  try { addLabels(opt); } catch (e) { /* labels optional */ }
  const T = theme();
  const mark = { id: 'mm-wm', type: 'text', left: 'center', top: 'middle', z: 0, silent: true, style: { text: 'macroarianalytics.com', fill: T.muted, opacity: 0.12, font: '700 15px ' + FONT } };
  if (opt.graphic && !Array.isArray(opt.graphic) && Array.isArray(opt.graphic.elements)) { if (!opt.graphic.elements.some(x => x && x.id === 'mm-wm')) opt.graphic.elements.push(mark); }
  else { const g = opt.graphic ? (Array.isArray(opt.graphic) ? opt.graphic : [opt.graphic]) : []; if (!g.some(x => x && x.id === 'mm-wm')) g.push(mark); opt.graphic = g; }
  return opt;
}

/* ---------- Data labels: clear, never piled up; latest value with its period ---------- */
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function lbl2(v) { return v == null || !isFinite(v) ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function perLbl(c) { c = String(c); if (/^\d{4}-\d{2}-\d{2}$/.test(c)) return +c.slice(8) + ' ' + MONS[+c.slice(5, 7) - 1] + ' ' + c.slice(0, 4); if (/^\d{4}-\d{2}$/.test(c)) return MONS[+c.slice(5, 7) - 1] + ' ' + c.slice(0, 4); if (/^\d{4}-Q\d$/.test(c)) return c.slice(5) + ' ' + c.slice(0, 4); return c; }
function vOfD(d) { if (d == null || d === '-') return null; if (typeof d === 'object') { const v = Array.isArray(d) ? d[d.length - 1] : (Array.isArray(d.value) ? d.value[d.value.length - 1] : d.value); return v == null || v === '-' || !isFinite(+v) ? null : +v; } return isFinite(+d) ? +d : null; }
function tKey(d) { const t = Array.isArray(d) ? d[0] : d && Array.isArray(d.value) ? d.value[0] : null; if (t == null) return ''; const dt = typeof t === 'number' ? new Date(t) : new Date(String(t)); return isNaN(dt) ? '' : dt.toISOString().slice(0, 10); }
function addLabels(...a) { const r = addLabels0(...a); const opt = r && r.series ? r : a[0]; if (opt && Array.isArray(opt.series)) { const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis; declutter(opt, (xa && xa.data) || []); } return r; }
function addLabels0(opt) {
  const T = theme();
  const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
  const ya = Array.isArray(opt.yAxis) ? opt.yAxis[0] : opt.yAxis;
  const cats = xa && xa.type === 'category' && Array.isArray(xa.data) ? xa.data.map(String) : null;
  const timeAxis = xa && xa.type === 'time';
  const horiz = ya && ya.type === 'category';
  const hasY2 = Array.isArray(opt.yAxis) && opt.yAxis.length > 1;
  let showAt = null;
  if (cats && cats.length) {
    const c0 = cats[0];
    if (/^(FY)?\d{4}$/.test(c0) || /^\d{4}-Q\d$/.test(c0)) showAt = () => true;
    else if (/^\d{4}-\d{2}$/.test(c0)) showAt = i => /-(03|06|09|12)$/.test(cats[i]);
    else if (/^\d{4}-\d{2}-\d{2}$/.test(c0)) showAt = i => { const m = cats[i].slice(5, 7), pm = i > 0 ? cats[i - 1].slice(5, 7) : ''; return ['01', '04', '07', '10'].includes(m) && m !== pm; };
    else if (/^\d+$/.test(c0)) showAt = cats.length > 20 ? i => +cats[i] % 3 === 0 : () => true;
  }
  const list = Array.isArray(opt.series) ? opt.series : opt.series ? [opt.series] : [];
  const ok = s => s && !s.silent && !(s.label && s.label.show === true) && !(s.lineStyle && s.lineStyle.opacity === 0) && !/ lower$/.test(s.name || '');
  list.forEach(s => { if (s && ok(s)) { delete s.endLabel; delete s.label; } });
  const base = { fontSize: 10, color: T.ink2, fontWeight: 600 };
  const lastOf = a => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return i; return -1; };
  const endLabel = (s, i, v, isBar) => {
    const d = s.data[i];
    const per = cats ? perLbl(cats[i]) : timeAxis ? perLbl(tKey(d)) : '';
    const item = d != null && typeof d === 'object' && !Array.isArray(d) ? d : { value: d };
    item.label = { show: true, rotate: 0, position: isBar ? (horiz ? 'right' : 'top') : (hasY2 ? 'top' : 'right'), distance: 7, formatter: '{v|' + lbl2(v) + '}' + (per ? '\n{p|' + per + '}' : ''),
      rich: { v: { fontSize: 11.5, fontWeight: 800, color: T.ink, lineHeight: 15 }, p: { fontSize: 9.5, color: T.muted, lineHeight: 12 } }, backgroundColor: T.paper, borderColor: T.line, borderWidth: 1, borderRadius: 4, padding: [2, 5] };
    s.data[i] = item;
  };
  const lines = list.filter(s => s.type === 'line' && ok(s) && Array.isArray(s.data));
  if (lines.length && (showAt || timeAxis)) {
    const at = timeAxis ? (s, i) => { const k = tKey(s.data[i]).slice(0, 7), pk = i > 0 ? tKey(s.data[i - 1]).slice(0, 7) : ''; return ['01', '04', '07', '10'].includes(k.slice(5)) && k !== pk; } : (s, i) => showAt(i);
    const V = lines.map(s => s.data.map(vOfD));
    const allv = V.flat().filter(v => v != null);
    const rng = allv.length ? (Math.max(...allv) - Math.min(...allv)) || 1 : 1;
    const near = rng * 0.06;
    const tangled = new Set();
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      if ((lines[a].yAxisIndex || 0) !== (lines[b].yAxisIndex || 0)) continue;
      let cross = 0, prev = 0;
      const dist = [];
      const n = Math.min(V[a].length, V[b].length);
      for (let i = 0; i < n; i++) { const x = V[a][i], y = V[b][i]; if (x == null || y == null) continue; const df = x - y; dist.push(Math.abs(df)); const sg = Math.sign(df); if (sg && prev && sg !== prev) cross++; if (sg) prev = sg; }
      dist.sort((p, q) => p - q);
      const med = dist.length ? dist[Math.floor(dist.length / 2)] : Infinity;
      if (cross >= 3 && med < rng * 0.15) { tangled.add(a); tangled.add(b); }
    }
    const keep = lines.map((s, a) => { const K = new Set(); if (!tangled.has(a)) V[a].forEach((v, i) => { if (v != null && at(s, i)) K.add(i); }); return K; });
    lines.forEach((s, a) => { [...keep[a]].forEach(i => { for (let b = 0; b < a; b++) { if ((lines[b].yAxisIndex || 0) !== (s.yAxisIndex || 0)) continue; const y = V[b][i]; if (y != null && Math.abs(y - V[a][i]) < near && keep[b].has(i)) { keep[a].delete(i); break; } } }); });
    lines.forEach((s, a) => {
      const last = lastOf(V[a]);
      const K = keep[a];
      K.delete(last);
      const vertical = K.size > 14;
      s.label = Object.assign({ show: true, position: 'top', distance: vertical ? 5 : 6, rotate: vertical ? 90 : 0, align: vertical ? 'left' : 'center', verticalAlign: vertical ? 'middle' : 'bottom',
        formatter: p => K.has(p.dataIndex) ? lbl2(vOfD(p.data != null && typeof p.data === 'object' ? p.data : p.value)) : '' }, base);
      s.labelLayout = p => p.dataIndex === last ? { moveOverlap: 'shiftY' } : { hideOverlap: true };
      s.showSymbol = true; s.showAllSymbol = true;
      const sz = typeof s.symbolSize === 'number' ? Math.min(s.symbolSize, 5) : 4;
      s.symbolSize = (v, p) => p.dataIndex === last ? 7 : K.has(p.dataIndex) ? sz : 0;
      if (last >= 0) endLabel(s, last, V[a][last], false);
    });
    if (!hasY2) { const g = Array.isArray(opt.grid) ? opt.grid[0] : opt.grid; if (g && typeof g === 'object' && !(g.right >= 74)) g.right = 74; }
  }
  list.filter(s => s.type === 'bar' && ok(s) && Array.isArray(s.data)).forEach(s => {
    const vals = s.data.map(vOfD);
    const last = lastOf(vals);
    const n = vals.filter(v => v != null).length;
    const vertical = !horiz && n > 16;
    s.label = Object.assign({ show: true, position: horiz ? 'right' : 'top', rotate: vertical ? 90 : 0, align: vertical ? 'left' : 'center', verticalAlign: vertical ? 'middle' : 'bottom', distance: 4,
      formatter: p => p.dataIndex === last ? '' : lbl2(vOfD(p.value)) }, base);
    s.labelLayout = { hideOverlap: true };
    if (last >= 0 && cats) endLabel(s, last, vals[last], true);
  });
  return opt;
}
function hexA(c, a) {
  if (typeof c !== 'string') return null;
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h.slice(0, 6), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  const m = c.match(/[\d.]+/g);
  return m && m.length >= 3 ? 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + a + ')' : null;
}
function beautify(opt) {
  const T = theme();
  const list = Array.isArray(opt.series) ? opt.series : opt.series ? [opt.series] : [];
  const pal = Array.isArray(opt.color) ? opt.color : T.pal;
  const vis = list.filter(s => s && s.type === 'line' && !s.silent && !(s.lineStyle && s.lineStyle.opacity === 0));
  list.forEach((s, k) => {
    if (!s || s.silent) return;
    if (s.type === 'line' && !(s.lineStyle && s.lineStyle.opacity === 0)) {
      s.lineStyle = Object.assign({}, s.lineStyle);
      if (!(s.lineStyle.width > 2.6)) s.lineStyle.width = s.lineStyle.type === 'dashed' ? 2.2 : 2.6;
      s.emphasis = Object.assign({ focus: 'series', lineStyle: { width: 3.6 } }, s.emphasis);
      s.blur = Object.assign({ lineStyle: { opacity: 0.18 }, itemStyle: { opacity: 0.18 }, label: { opacity: 0.15 }, areaStyle: { opacity: 0.04 } }, s.blur);
      if (vis.length === 1 && !s.stack && (!s.areaStyle || typeof s.areaStyle.color !== 'object')) {
        const c = (s.lineStyle && s.lineStyle.color) || (s.itemStyle && s.itemStyle.color) || pal[k % pal.length];
        const top = hexA(c, 0.3), bot = hexA(c, 0);
        if (top) s.areaStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: top }, { offset: 1, color: bot }] } };
      }
    } else if (s.type === 'bar') {
      s.emphasis = Object.assign({ focus: 'series' }, s.emphasis);
      s.itemStyle = Object.assign({ borderRadius: [3, 3, 0, 0] }, s.itemStyle);
    }
  });
  const ax = x => (Array.isArray(x) ? x : x ? [x] : []).forEach(a => { if (a && typeof a === 'object') a.axisLabel = Object.assign({}, a.axisLabel, { fontSize: 12 }); });
  ax(opt.xAxis); ax(opt.yAxis);
  (Array.isArray(opt.legend) ? opt.legend : opt.legend ? [opt.legend] : []).forEach(l => { if (l && typeof l === 'object') { l.textStyle = Object.assign({}, l.textStyle, { fontSize: 13 }); l.itemWidth = Math.max(l.itemWidth || 0, 16); l.itemHeight = Math.max(l.itemHeight || 0, 6); } });
  return opt;
}
function ensureSrc(node) {
  try { if (!node || node.closest('.fig, #live, .cat-one')) return; BDX.addSrcAfter(node, BDX.srcFor(node)); } catch (e) { /* optional */ }
}
function gateBlocks(view, opts) { try { return BDX.gateBlocks(view, opts); } catch (e) { return false; } }
const CARD_ST = new Set();
function cardCtl(st, box) {
  const d = document.createElement('div');
  d.className = 'fctl';
  const view = () => ({ freq: 'Y', span: st.r || cRange });
  d.innerHTML = BDX.ctlHTML('A', view());
  d.addEventListener('click', e => { const b = e.target.closest('.seg2 button'); if (!b || b.disabled || b.parentElement.getAttribute('data-k') !== 'span') return; st.r = b.getAttribute('data-v'); BDX.syncCtl(d, view()); BDX.rerender(box); });
  CARD_ST.add({ st, d, view });
  return d;
}
function resetCardRanges() { CARD_ST.forEach(x => { if (!document.body.contains(x.d)) { CARD_ST.delete(x); return; } x.st.r = null; BDX.syncCtl(x.d, x.view()); }); }
function shortSrc(t) {
  t = String(t || '');
  const out = [];
  [[/World Bank/i, 'World Bank'], [/Energy Information|\bEIA\b/i, 'EIA'], [/Federal Reserve/i, 'Federal Reserve'], [/Labor Statistics|\bBLS\b/i, 'BLS'], [/\bIMF\b|International Monetary/i, 'IMF'], [/Asian Development|\bADB\b/i, 'ADB'], [/Bangladesh Bank/i, 'Bangladesh Bank'], [/\bBBS\b|Bureau of Statistics/i, 'BBS']].forEach(([re, n]) => { if (re.test(t) && !out.includes(n)) out.push(n); });
  return out.length ? out.join(', ') : t.split(/[,(]/)[0].trim();
}
function renderGeo(code) { try { BDX.renderGeo(code); } catch (e) { /* map optional */ } }
function initLearnX() { return BDX.initLearnX(); }
function initFAQ() { return BDX.initFAQ(); }

function textOn(hex) {
  const h = String(hex || '').trim(); let r, g, b;
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(h), n = /rgba?\(([^)]+)\)/i.exec(h);
  if (m) { const x = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]; r = parseInt(x.slice(0, 2), 16); g = parseInt(x.slice(2, 4), 16); b = parseInt(x.slice(4, 6), 16); }
  else if (n) { [r, g, b] = n[1].split(',').map(v => parseFloat(v)); } else return '#0E1C2B';
  const L = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b), dark = 0.0122;
  return (1.05 / (lum + 0.05)) >= ((lum + 0.05) / (dark + 0.05)) ? '#FFFFFF' : '#0E1C2B';
}
function onPageNav(tries) {
  const v = document.getElementById('v-overview');
  if (!v || document.getElementById('onpage')) return;
  const marks = [...v.querySelectorAll('.eyebrow')].filter(e => /^\s*\d+\s*·/.test(e.textContent));
  if (marks.length < 3) { if ((tries || 0) < 8) setTimeout(() => onPageNav((tries || 0) + 1), 700); return; }
  const nav = document.createElement('nav'); nav.id = 'onpage'; nav.className = 'onpage'; nav.setAttribute('aria-label', 'On this page');
  nav.innerHTML = marks.map((e, i) => '<button type="button" data-j="' + i + '">' + e.textContent.trim().replace(/\s+/g, ' ') + '</button>').join('');
  nav.addEventListener('click', ev => { const b = ev.target.closest('[data-j]'); if (b) marks[+b.getAttribute('data-j')].scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const t = document.getElementById('ticker'); if (t) t.after(nav); else v.prepend(nav);
}
setTimeout(() => onPageNav(0), 600);

document.addEventListener('click', e => { const j = e.target.closest('[data-jump]'); if (j) setTimeout(() => { const t = document.getElementById(j.getAttribute('data-jump')); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, 350); });

function declutterAll(opt) {
  try {
    if (!opt || !Array.isArray(opt.series)) return opt;
    (Array.isArray(opt.xAxis) ? opt.xAxis : opt.xAxis ? [opt.xAxis] : []).forEach(ax => { if (ax && ax.type !== 'value' && Array.isArray(ax.data)) ax.axisLabel = Object.assign({}, ax.axisLabel || {}, { showMaxLabel: true, showMinLabel: true, hideOverlap: true }); });
    const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis, n = xa && Array.isArray(xa.data) ? xa.data.length : 0;
    const lines = opt.series.filter(s => s && s.type === 'line' && !s.stack).length, dense = n > 36 || (lines > 1 && n > 18);
    opt.series.forEach(s => {
      if (!s || s.type !== 'line') return;
      s.labelLayout = Object.assign({ hideOverlap: true }, s.labelLayout || {});
      if (!dense) return;
      if (s.label && s.label.show) s.label = Object.assign({}, s.label, { show: false });
      if (Array.isArray(s.data)) {
        let last = -1;
        s.data.forEach((d, i) => { const v = d && typeof d === 'object' && !Array.isArray(d) ? d.value : d; if (v != null && v !== '' && !(Array.isArray(v) && v[v.length - 1] == null)) last = i; });
        s.data = s.data.map((d, i) => (i !== last && d && typeof d === 'object' && !Array.isArray(d) && d.label ? Object.assign({}, d, { label: Object.assign({}, d.label, { show: false }) }) : d));
      }
    });
  } catch (e) { /* keep the chart as it is */ }
  return opt;
}

/* phones: blink by dimming just the blinking cells twice a second (no animation layers, no whole-page restyle) */
(function phoneBlink() {
  const mq = window.matchMedia ? matchMedia('(max-width: 899px), (pointer: coarse)') : null;
  if (!mq) return;
  const SEL = '.cell.warn, .live-dot, .lt-c.up-bad, .lt.lt-warn, .pe-badge.warn-b, .sumtab tr.lt-warn .sv .cell, .warn-ico, td.warn-std';
  let els = [], n = 0, dim = false;
  setInterval(() => {
    const c = document.documentElement.classList, off = !mq.matches || c.contains('no-blink') || c.contains('safe') || document.hidden;
    if (n++ % 8 === 0 || off) { els.forEach(e => { e.style.opacity = ''; }); els = off ? [] : [...document.querySelectorAll('.view.on ' + SEL.split(', ').join(', .view.on '))]; }
    if (off) return;
    dim = !dim;
    els.forEach(e => { e.style.opacity = dim ? '0.4' : ''; });
  }, 650);
})();

/* ================= Data labels: vertical, in each line's colour, as dense as the chart allows ================= */
function labelPlan(opt, inst, fromZoom) {
  try {
    if (!opt || !Array.isArray(opt.series)) return opt;
    const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
    if (!xa || xa.type === 'value' || !Array.isArray(xa.data) || xa.data.length < 2) return opt;
    const cats = xa.data.map(c => (c && typeof c === 'object' ? c.value : c));
    const idx = [];
    opt.series.forEach((s, i) => { if (s && s.type === 'line' && Array.isArray(s.data) && !s.stack && !/range|band/i.test(s.name || '') && !s.data.some(d => Array.isArray(d))) idx.push(i); });
    if (!idx.length) return opt;
    if (inst && !fromZoom) { inst.__lpRaw = { xAxis: xa, series: opt.series.map(s => (s && Array.isArray(s.data) ? Object.assign({}, s, { data: s.data.slice() }) : s)), color: opt.color }; inst.__lpWin = null; }
    const W = (inst && inst.getWidth && inst.getWidth()) || 600, n = cats.length;
    let a = 0, b = n - 1;
    if (inst && inst.__lpWin) { a = inst.__lpWin[0]; b = inst.__lpWin[1]; }
    else { const dz = (Array.isArray(opt.dataZoom) ? opt.dataZoom : opt.dataZoom ? [opt.dataZoom] : [])[0]; if (dz) { if (dz.start != null) a = Math.floor(dz.start / 100 * (n - 1)); if (dz.end != null) b = Math.ceil(dz.end / 100 * (n - 1)); } }
    const many = idx.length > 2, vis = Math.max(1, b - a + 1), slots = Math.max(6, Math.floor(W / (many ? 13 : 15))), per = Math.max(2, Math.floor(slots / (many ? idx.length : 1)));
    const c0 = String(cats[0]), kind = /^\d{4}-\d{2}$/.test(c0) ? 'M' : /^\d{4}-Q\d$/.test(c0) ? 'Q' : 'A';
    const steps = kind === 'M' ? (many ? [3, 12, 24, 60, 120] : [1, 3, 6, 12, 24, 60, 120]) : kind === 'Q' ? (many ? [4, 8, 20, 40] : [1, 2, 4, 8, 20, 40]) : [1, 2, 5, 10, 20, 50];
    const step = steps.find(k => vis / k <= per) || steps[steps.length - 1];
    const ok = i => {
      if (step === 1) return true;
      const c = String(cats[i]);
      if (kind === 'M') { const yy = +c.slice(0, 4), mm = +c.slice(5, 7); return step < 12 ? mm % step === 0 : mm === 12 && yy % (step / 12) === 0; }
      if (kind === 'Q') { const yy = +c.slice(0, 4), qq = +c.slice(-1); return step < 4 ? qq % step === 0 : qq === 4 && yy % (step / 4) === 0; }
      const y = parseInt(c.replace(/\D/g, ''), 10); return isFinite(y) ? y % step === 0 : i % step === 0;
    };
    const pal = Array.isArray(opt.color) ? opt.color : (inst && inst.__lpRaw && inst.__lpRaw.color) || [];
    idx.forEach((si, j) => {
      const s = opt.series[si], raw = inst && inst.__lpRaw && fromZoom ? inst.__lpRaw.series[si].data : s.data;
      const ls = s.lineStyle || {}, it = s.itemStyle || {};
      const col = (typeof ls.color === 'string' && ls.color) || (typeof it.color === 'string' && it.color) || (typeof s.color === 'string' && s.color) || pal[si % (pal.length || 1)] || 'inherit';
      let last = -1;
      raw.forEach((d, i) => { const v = d && typeof d === 'object' ? d.value : d; if (v != null && v !== '' && isFinite(v)) last = i; });
      const marks = new Set();
      s.data = raw.map((d, i) => {
        const obj = d && typeof d === 'object', v = obj ? d.value : d;
        if (obj && d.label && d.label.show) return d;
        if (v == null || v === '' || !isFinite(v) || i < a || i > b || i === last || !ok(i)) return d;
        marks.add(i);
        return Object.assign({}, obj ? d : {}, { value: v, label: { show: true, rotate: 90, position: 'top', align: 'left', verticalAlign: 'middle', distance: 5, color: col, fontSize: 9.5, fontWeight: 650, formatter: p => Number(p.value).toFixed(2) } });
      });
      s.labelLayout = { hideOverlap: true };
      s.lineStyle = Object.assign({}, ls, { width: Math.max(ls.width || 2, 2.2), cap: 'round', join: 'round' });
      if (!s.symbol || s.symbol === 'none') { s.symbol = 'circle'; s.showSymbol = true; s.symbolSize = (v, p) => (marks.has(p.dataIndex) ? 4.5 : 0); }
    });
    if (inst && !inst.__lpOn) {
      inst.__lpOn = true; let tm = null;
      inst.on('datazoom', () => { clearTimeout(tm); tm = setTimeout(() => {
        try {
          const o = inst.getOption(), z = (o.dataZoom || [])[0], R = inst.__lpRaw; if (!z || !R) return;
          const N = (Array.isArray(R.xAxis.data) ? R.xAxis.data.length : 0); if (!N) return;
          inst.__lpWin = [Math.floor((z.start || 0) / 100 * (N - 1)), Math.ceil((z.end == null ? 100 : z.end) / 100 * (N - 1))];
          const fresh = labelPlan({ xAxis: R.xAxis, series: R.series.map(s => (s && Array.isArray(s.data) ? Object.assign({}, s, { data: s.data.slice() }) : s)), color: R.color }, inst, true);
          inst.setOption({ series: fresh.series.map(s => (s && s.type === 'line' && Array.isArray(s.data) ? { data: s.data, symbolSize: s.symbolSize } : {})) });
        } catch (e) { /* keep labels as they are */ }
      }, 160); });
    }
  } catch (e) { /* labels are optional */ }
  return opt;
}

/* ================= Time-span extras: custom years, automatic cycling, blink switch ================= */
(function spanExtras() {
  const segOf = el => { const box = el.closest('.controls, .fig-ctl, .ctl, figure, .bd-glob') || el.parentElement; return box ? box.querySelector('.seg2[data-k="span"]') : null; };
  function pick(seg, v) { let b = seg.querySelector('button[data-v="' + v + '"]'); if (!b) { b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-v', v); b.textContent = v + 'y'; b.title = v + ' years'; seg.append(b); } b.click(); }
  document.addEventListener('change', e => {
    const inp = e.target.closest && e.target.closest('input[data-x="custom"]'); if (!inp) return;
    const n = Math.round(+inp.value || 0); if (n < 1 || n > 80) return; const seg = segOf(inp); if (seg) pick(seg, String(n));
  });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-x]'); if (!b) return;
    const kind = b.getAttribute('data-x');
    if (kind === 'blink') { const off = document.documentElement.classList.toggle('no-blink'); document.querySelectorAll('button[data-x="blink"]').forEach(x => x.setAttribute('aria-pressed', String(!off))); return; }
    if (kind !== 'auto') return;
    const seg = segOf(b); if (!seg) return;
    if (b.__t) { clearInterval(b.__t); b.__t = null; b.setAttribute('aria-pressed', 'false'); b.textContent = '▶ Auto'; return; }
    const secsIn = b.parentElement.querySelector('input[data-x="secs"]'), secs = Math.max(2, Math.min(120, +((secsIn || {}).value) || 6));
    const order = ['5', '10', '15', '20', '25', 'all'];
    b.setAttribute('aria-pressed', 'true'); b.textContent = '❚❚ Stop';
    b.__t = setInterval(() => { if (!document.body.contains(b)) { clearInterval(b.__t); return; } if (document.hidden) return; const cur = (seg.querySelector('button[aria-pressed="true"]') || {}).getAttribute ? seg.querySelector('button[aria-pressed="true"]').getAttribute('data-v') : 'all'; const nx = order[(order.indexOf(cur) + 1) % order.length]; pick(seg, nx); }, secs * 1000);
  });
})();
/* ================= Every table carries its source ================= */
(function srcGuard() {
  const MAP = { overview: 'World Bank (World Development Indicators); EIA; Federal Reserve; BLS; World Bank Pink Sheet.', countries: 'World Bank (World Development Indicators).', compare: 'World Bank (World Development Indicators).', explore: 'World Bank (World Development Indicators).', rankings: 'World Bank (World Development Indicators).', map: 'World Bank (World Development Indicators).', markets: 'EIA; Federal Reserve; BLS; World Bank Pink Sheet.', bangladesh: 'Bangladesh Bank; BBS.', lab: 'BBS; Bangladesh Bank; World Bank; model estimates.', cl: 'World Bank (World Development Indicators).' };
  const root = document.querySelector('main') || document.body; let busy = false;
  function run() {
    const v = document.querySelector('.view.on'); if (!v) return; const txt = MAP[(v.id || '').replace('v-', '')]; if (!txt) return;
    v.querySelectorAll('table').forEach(t => {
      const box = t.closest('.table-wrap, .mx-wrap, .pe-wrap') || t; if (box.getAttribute('data-src') === '1') return;
      const nx = box.nextElementSibling, par = box.parentElement;
      const has = (nx && (nx.classList.contains('src-line') || (nx.classList.contains('tnote') && nx.querySelector('.src-line')))) || box.querySelector('.src-line') || (par && [...par.children].some(c => c.classList && c.classList.contains('src-line')));
      box.setAttribute('data-src', '1'); if (has) return;
      const p = document.createElement('p'); p.className = 'src-line'; p.innerHTML = '<b>Source:</b> ' + txt; box.after(p);
    });
  }
  const mo = new MutationObserver(() => { if (busy) return; busy = true; setTimeout(() => { mo.disconnect(); try { run(); } finally { busy = false; mo.observe(root, { childList: true, subtree: true }); } }, 800); });
  mo.observe(root, { childList: true, subtree: true });
  setTimeout(run, 1800);
})();
setTimeout(() => { try { BDX.worldGrowth2(); } catch (e) { /* optional */ } }, 900);
