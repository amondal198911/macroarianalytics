// Compare the in-browser DSGE solver (pages-models.js) with the Python solver used for estimation (scripts/bd_dsge.py).
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Uint8Array, Array, Object, JSON, Number, String, Date, Map, Set, isFinite, isNaN, Infinity, NaN, setTimeout, document: { documentElement: { setAttribute() {}, removeAttribute() {} }, getElementById: () => null }, getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function () {}, history: { replaceState() {} } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js', 'analysis.js', 'pages-models.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8'), ctx, { filename: f });
const MA = ctx.MA; const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'verify_ref_dsge.json'), 'utf8'));
const VN = ['Output (% deviation)', 'CPI inflation (% a year)', 'Interest rate (% a year)', 'Depreciation (% a year)']; const SH = ['Monetary policy', 'Terms of trade', 'Technology', 'World output', 'World inflation'];
let checks = 0, fails = 0;
for (const [k, R] of Object.entries(ref)) { const r = MA.lsIRF(R.params, 16); checks++; if (r.sol.ok !== R.determinate) { fails++; console.log('FAIL determinacy', k, r.sol.ok, R.determinate, r.sol.why); continue; } if (!R.determinate) continue;
  SH.forEach((s, j) => VN.forEach((v, i) => R.irf[j].forEach((row, h) => { checks++; const g = r.irf[s][v][h], w = row[i]; if (Math.abs(g - w) > 1e-7 * Math.max(1, Math.abs(w))) { fails++; if (fails < 10) console.log('FAIL', k, s, v, h, g, w); } }))); }
console.log(`${checks - fails}/${checks} DSGE checks passed`); process.exit(fails ? 1 : 0);
