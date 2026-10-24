// Compare heterogeneity tests with scipy and smoke-test backtests, Diebold-Mariano and placebo Granger.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url'; const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Array, Object, JSON, Number, isFinite, Infinity, NaN }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js']) vm.runInContext(fs.readFileSync(R + '/src/js/' + f, 'utf8'), ctx, { filename: f });
const S = ctx.MAS, d = JSON.parse(fs.readFileSync(R + '/build/verify_eval.json', 'utf8'));
const got = { welch: S.welch(d.a, d.b), mw: S.mannWhitney(d.a, d.b), kw: S.kruskal([d.a, d.b, d.c]), an: S.anova([d.a, d.b, d.c]), bf: S.brownForsythe([d.a, d.b, d.c]) };
let ok = 0, n = 0; for (const k in got) { const g = got[k], w = d.ref[k]; const s = k === 'mw' ? g.stat : g.stat; n += 2; const e1 = Math.abs(s - w[0]) < 1e-8 * Math.max(1, Math.abs(w[0])), e2 = Math.abs(g.p - w[1]) < 1e-8; if (e1) ok++; if (e2) ok++; if (!e1 || !e2) console.log('FAIL', k, s, w[0], g.p, w[1]); }
// backtest smoke test on inflation
const ref = JSON.parse(fs.readFileSync(R + '/build/verify_ref.json', 'utf8')).data.infl;
const t0 = Date.now(); const bt = S.backtest(ref, { h: 6, origins: 24, models: ['naive', 'ar', 'arima', 'ets'] }); console.log('backtest ms', Date.now() - t0);
bt.table.filter(r => r.h === 1 || r.h === 6).forEach(r => console.log(r.label.padEnd(36), 'h', r.h, 'n', r.n, 'rmse', r.rmse.toFixed(3), 'U', r.theilU.toFixed(3), 'cov80', r.cover80.toFixed(2)));
const e1 = bt.res.arima.err[0], e2 = bt.res.naive.err[0]; console.log('DM arima vs naive h1', JSON.stringify(S.dmTest(e1, e2, 1)));
const dd = JSON.parse(fs.readFileSync(R + '/build/verify_ref.json', 'utf8')).data; const pg = S.placeboGranger(dd.ii, dd.xg, 3, 200); console.log('placebo granger real p', pg.real.p.toFixed(4), 'perm p', pg.pPerm.toFixed(3));
console.log(`${ok}/${n} eval checks passed`); process.exit(ok === n ? 0 : 1);
