// Verify VAR, causality, IRF, FEVD, Johansen, Engle-Granger, HP filter and ARIMA against statsmodels.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Array, Object, JSON, Number, isFinite, Infinity, NaN }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js']) { const p = path.join(ROOT, 'src', 'js', f); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
const S = ctx.MAS; const { data, ref } = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'verify_ref_ts.json'), 'utf8'));
let fails = 0, checks = 0; const cmp = (l, g, w, tol = 1e-6, rel = true) => { checks++; const ok = Math.abs(g - w) <= tol * (rel ? Math.max(1, Math.abs(w)) : 1); if (!ok) { fails++; console.log('FAIL', l, 'got', g, 'want', w); } };
const sel = S.varSelect(data.Y, 6); for (const k of ['aic', 'bic', 'hqic', 'fpe']) cmp('select ' + k, sel[k], ref.sel[k], 0);
const f = S.varFit(data.Y, 2); ref.var.params.forEach((row, i) => row.forEach((v, k) => cmp(`B[${i}][${k}]`, f.B[i][k], v, 1e-8)));
cmp('aic', f.aic, ref.var.aic, 1e-9); cmp('bic', f.bic, ref.var.bic, 1e-9); cmp('hqic', f.hqic, ref.var.hqic, 1e-9); cmp('fpe', f.fpe, ref.var.fpe, 1e-8);
ref.var.sigma.forEach((r, i) => r.forEach((v, j) => cmp(`sigma${i}${j}`, f.sigma[i][j], v, 1e-9))); ref.var.roots.forEach((v, i) => cmp('modulus' + i, f.moduli[i], v, 1e-7));
const c = S.varCausality(f, [2], 0); cmp('caus F', c.F, ref.caus.F, 1e-8); cmp('caus p', c.p, ref.caus.p, 1e-9, false); cmp('caus df2', c.df2, ref.caus.df[1], 0);
const th = S.irf(f, 12, true); ref.irf.forEach((M, h) => M.forEach((r, i) => r.forEach((v, j) => cmp(`irf h${h} ${i}${j}`, th[h][i][j], v, 1e-8))));
const fe = S.fevd(th); ref.fevd.forEach((byH, v) => byH.forEach((row, h) => row.forEach((x, s) => cmp(`fevd v${v} h${h} s${s}`, fe[h][v][s], x, 1e-6))));
for (const det of [-1, 0, 1]) { const j = S.johansen(data.J, det, 2), r = ref['joh' + det];
  r.trace.forEach((v, i) => cmp(`joh${det} trace${i}`, j.rows[i].trace, v, 1e-6)); r.maxeig.forEach((v, i) => cmp(`joh${det} max${i}`, j.rows[i].maxeig, v, 1e-6));
  r.cvt.forEach((cv, i) => cmp(`joh${det} cvt95 ${i}`, j.rows[i].trace95, cv[1], 1e-9)); r.cvm.forEach((cv, i) => cmp(`joh${det} cvm95 ${i}`, j.rows[i].max95, cv[1], 1e-9)); }
const eg = S.engleGranger(data.lp, [data.m2]); cmp('eg stat', eg.stat, ref.eg.stat, 1e-6); cmp('eg p', eg.p, ref.eg.p, 1e-6, false); cmp('eg cv5', eg.cv5, ref.eg.cv[1], 1e-6);
const hp = S.hpFilter(data.infl, 14400); ref.hp.forEach((v, i) => cmp('hp' + i, hp.trend[i], v, 1e-7));
const a = S.arimaFit(data.infl, [1, 0, 1]), fa = S.arimaForecast(a, 12); ref.arma11.fc.forEach((v, i) => cmp('arma11 fc' + i, fa[i].mean, v, 0.01, false));
ref.arma11.se.forEach((v, i) => cmp('arma11 se' + i, fa[i].sd, v, 0.08, false));
const b = S.arimaFit(data.lp, [0, 1, 1]), fb = S.arimaForecast(b, 12); ref.ima11.fc.forEach((v, i) => cmp('ima11 fc' + i, fb[i].mean, v, 0.003, false));
console.log('ARMA(1,1) CSS', a.coefs.map(c => c.name + '=' + c.est.toFixed(4) + '(' + c.se.toFixed(4) + ')').join(' '), '| MLE params', ref.arma11.params.map(v => v.toFixed(4)).join(' '));
const auto = S.autoArima(data.infl, { seasonal: false }); console.log('auto:', auto.label, 'aicc', auto.aicc.toFixed(2), 'd', auto.d);
const bt = S.irfBootstrap(f, 12, 100, 0.9); console.log('bootstrap reps', bt.reps, 'irf[4][0][1] band', bt.lo[4][0][1].toFixed(4), th[4][0][1].toFixed(4), bt.hi[4][0][1].toFixed(4));
console.log(`${checks - fails}/${checks} checks passed`); process.exit(fails ? 1 : 0);
