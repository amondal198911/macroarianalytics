// Verify the in-browser statistics engine against statsmodels / scipy / arch reference values.
// Usage: python scripts/verify_ref.py && node scripts/verify_stats.mjs
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Array, Object, JSON, Number, isFinite, Infinity, NaN };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js']) {
  const p = path.join(ROOT, 'src', 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
}
const S = ctx.MAS; const { data, ref } = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'verify_ref.json'), 'utf8'));
let fails = 0, checks = 0;
function cmp(label, got, want, tol = 1e-6, rel = true) {
  checks++; const ok = Number.isFinite(got) && Number.isFinite(want) ? Math.abs(got - want) <= tol * (rel ? Math.max(1, Math.abs(want)) : 1) : got === want;
  if (!ok) { fails++; console.log('FAIL', label, 'got', got, 'want', want); }
}
for (const [name, y] of Object.entries({ infl: data.infl, xr: data.xr, ar: data.ar, rw: data.rw })) {
  const r = ref[name];
  for (const reg of ['c', 'ct']) {
    const a = S.adf(y, { reg }); cmp(`${name} adf_${reg} stat`, a.stat, r[`adf_${reg}`].stat); cmp(`${name} adf_${reg} p`, a.p, r[`adf_${reg}`].p, 1e-6);
    cmp(`${name} adf_${reg} lags`, a.lags, r[`adf_${reg}`].lags, 0); cmp(`${name} adf_${reg} cv5`, a.cv5, r[`adf_${reg}`].cv5, 1e-6);
    const k = S.kpss(y, { reg }); cmp(`${name} kpss_${reg} stat`, k.stat, r[`kpss_${reg}`].stat); cmp(`${name} kpss_${reg} p`, k.p, r[`kpss_${reg}`].p, 1e-6); cmp(`${name} kpss_${reg} lags`, k.lags, r[`kpss_${reg}`].lags, 0);
    const p = S.pp(y, { reg }); cmp(`${name} pp_${reg} stat`, p.stat, r[`pp_${reg}`].stat, 1e-6); cmp(`${name} pp_${reg} p`, p.p, r[`pp_${reg}`].p, 2e-3, false);
  }
  for (const reg of ['c', 'ct', 't']) { const z = S.za(y, { reg }); cmp(`${name} za_${reg} stat`, z.stat, r[`za_${reg}`].stat, 1e-6); cmp(`${name} za_${reg} p`, z.p, r[`za_${reg}`].p, 1e-6); cmp(`${name} za_${reg} bp`, z.breakIndex, r[`za_${reg}`].bp, 0); }
  S.acf(y, 12).forEach((v, i) => cmp(`${name} acf${i}`, v, r.acf[i], 1e-9)); S.pacf(y, 12).forEach((v, i) => cmp(`${name} pacf${i}`, v, r.pacf[i], 1e-8));
  const lb = S.ljungBox(y, 12); cmp(`${name} lb stat`, lb.stat, r.lb12.stat); cmp(`${name} lb p`, lb.p, r.lb12.p, 1e-8, false);
  const jb = S.jarqueBera(y); cmp(`${name} jb`, jb.stat, r.jb.stat); cmp(`${name} jb p`, jb.p, r.jb.p, 1e-8, false);
  const d = S.describe(y); cmp(`${name} mean`, d.mean, r.desc.mean); cmp(`${name} var`, d.sd * d.sd, r.desc.var); cmp(`${name} skew`, d.skew, r.desc.skew); cmp(`${name} kurt`, d.kurt, r.desc.kurt); cmp(`${name} q1`, d.q1, r.desc.q1);
  const X = y.slice(0, -1).map((v, i) => [1, i, v]), Y = y.slice(1); const f = S.ols(Y, X);
  f.beta.forEach((b, i) => cmp(`${name} ols b${i}`, b, r.ols.beta[i], 1e-7)); f.se.forEach((b, i) => cmp(`${name} ols se${i}`, b, r.ols.se[i], 1e-7));
  f.p.forEach((b, i) => cmp(`${name} ols p${i}`, b, r.ols.p[i], 1e-8, false)); cmp(`${name} r2`, f.r2, r.ols.r2); cmp(`${name} F`, f.F, r.ols.F, 1e-7); cmp(`${name} aic`, f.aic, r.ols.aic, 1e-9); cmp(`${name} ll`, f.ll, r.ols.ll, 1e-9);
  S.ols(Y, X, { cov: 'HC1' }).se.forEach((b, i) => cmp(`${name} hc1 se${i}`, b, r.ols_hc1.se[i], 1e-7));
  S.ols(Y, X, { cov: 'HAC', lags: 4 }).se.forEach((b, i) => cmp(`${name} hac se${i}`, b, r.ols_hac4.se[i], 1e-7));
  const bp = S.breuschPagan(f.resid, X); cmp(`${name} bp`, bp.stat, r.bp.stat, 1e-7); const w = S.whiteTest(f.resid, X); cmp(`${name} white`, w.stat, r.white.stat, 1e-6);
  const ar = S.archLM(f.resid, 4); cmp(`${name} arch`, ar.stat, r.arch4.stat, 1e-6); const bg = S.breuschGodfrey(f.resid, X, 4); cmp(`${name} bg`, bg.stat, r.bg4.stat, 1e-6);
  const rs = S.reset(Y, X, f.fitted, [2, 3]); cmp(`${name} reset`, rs.stat, r.reset.stat, 1e-5); cmp(`${name} dw`, S.durbinWatson(f.resid), r.dw, 1e-9);
}
if (S.granger) { const g = S.granger(data.ii, data.xg, 3); cmp('granger F', g.F, ref.granger.F, 1e-7); cmp('granger p', g.p, ref.granger.p, 1e-8, false); }
cmp('t sf', S.tSf(2.1, 15), ref.dist.t[0], 1e-10, false); cmp('t ppf', S.tInv(0.975, 10), ref.dist.t[1], 1e-8);
cmp('chi2 sf', S.chi2Sf(7.3, 3), ref.dist.chi2[0], 1e-10, false); cmp('chi2 ppf', S.chi2Inv(0.95, 4), ref.dist.chi2[1], 1e-8);
cmp('f sf', S.fSf(3.2, 2, 40), ref.dist.f[0], 1e-10, false); cmp('f ppf', S.fInv(0.95, 3, 60), ref.dist.f[1], 1e-8);
cmp('norm sf', S.normSf(3.5), ref.dist.norm[0], 1e-12, false); cmp('norm ppf', S.normInv(0.001), ref.dist.norm[1], 1e-9); cmp('norm cdf tail', S.normCdf(-8), ref.dist.norm[2], 1e-20, false);
console.log(`${checks - fails}/${checks} checks passed`); process.exit(fails ? 1 : 0);
