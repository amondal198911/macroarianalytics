// World forecast matrix: automatic ARIMA projections (5 years) for every economy and key World Bank indicator, with a
// rolling-origin check against the naive forecast. Uses the same JavaScript engine as the site, so the numbers match.
// Run: node scripts/world_models.mjs  ->  build/world_fc.json
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Uint8Array, Array, Object, JSON, Number, String, Date, Map, Set, Promise, isFinite, isNaN, parseInt, parseFloat, Infinity, NaN, setTimeout, clearTimeout,
  document: { documentElement: { setAttribute() {}, removeAttribute() {} }, getElementById: () => null, addEventListener() {}, dispatchEvent() {} }, getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function () {}, history: { replaceState() {} } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8'), ctx, { filename: f });
const MA = ctx.MA, S = ctx.MAS; MA.DB.world = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'world.json'), 'utf8')); MA.indexWorld();
const KEYS = ['gdp_growth', 'inflation', 'current_account', 'fx_change', 'unemployment', 'budget', 'gov_debt', 'remittances', 'reserves_mo', 'exports', 'investment', 'pop_growth'];
const H = 5, out = {}; let done = 0, fitted = 0; const t0 = Date.now();
const r = (v, d = 3) => (v == null || !isFinite(v)) ? null : +v.toFixed(d);
for (const c of MA.countries()) {
  for (const key of KEYS) {
    const s = MA.series(c.iso, 'w:' + key); if (!s || s.v.length < 15) continue; const b = MA.modelSeries(s); if (b.v.length < 15 || b.k[b.k.length - 1] < 2019) continue;
    const y = b.v.slice(-45); done++;
    const m = S.autoArima(y, { seasonal: false, ml: false, maxp: 2, maxq: 2, maxd: 1 }); if (!m) continue; const fc = S.arimaForecast(m, H, [0.8]);
    // one-step rolling check over the last 8 years with the order fixed
    let se = 0, sn = 0, n = 0; for (let k = 8; k >= 1; k--) { const tr = y.slice(0, y.length - k); const mm = S.arimaFit(tr, m.order, m.sorder, 12, { mean: m.withMean, ml: false }); if (!mm) continue; const f = S.arimaForecast(mm, 1, [0.8])[0]; const a = y[y.length - k]; se += (a - f.mean) ** 2; sn += (a - tr[tr.length - 1]) ** 2; n++; }
    (out[c.iso] = out[c.iso] || {})[key] = [b.k[b.k.length - 1], r(y[y.length - 1]), m.label, ...fc.map(x => r(x.mean)), r(fc[H - 1].lo80), r(fc[H - 1].hi80), n ? r(Math.sqrt(se / n)) : null, n ? r(Math.sqrt(sn / n)) : null, b.v.length];
    fitted++;
  }
}
const res = { built: new Date().toISOString().slice(0, 10), H, keys: KEYS, fields: ['last_year', 'last_value', 'model', ...Array.from({ length: H }, (_, i) => 'f' + (i + 1)), 'lo80_h5', 'hi80_h5', 'rmse_arima_1step', 'rmse_naive_1step', 'n_obs'], method: 'Automatic ARIMA (conditional sum of squares, AICc, at most 45 most recent annual observations), 80% normal intervals; one-step rolling-origin RMSE over the last 8 years against the naive forecast.', data: out };
fs.writeFileSync(path.join(ROOT, 'build', 'world_fc.json'), JSON.stringify(res));
console.log(`fitted ${fitted} of ${done} series in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
