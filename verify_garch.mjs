// Compare the site's GARCH(1,1) and GJR-GARCH estimates with the arch package.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Float64Array, Uint8Array, Array, Object, JSON, Number, String, Date, Map, Set, isFinite, isNaN, Infinity, NaN, setTimeout, document: { documentElement: { setAttribute() {}, removeAttribute() {} }, getElementById: () => null }, getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function () {}, history: { replaceState() {} } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js', 'analysis.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8'), ctx, { filename: f });
const { data, ref } = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'verify_ref_garch.json'), 'utf8')); const MA = ctx.MA;
let checks = 0, fails = 0; const cmp = (l, g, w, tol) => { checks++; const ok = Math.abs(g - w) <= tol * Math.max(1, Math.abs(w)); if (!ok) { fails++; console.log('FAIL', l, 'got', g, 'want', w); } };
for (const [k, r] of Object.entries(data)) for (const nm of ['garch', 'gjr']) { const R = ref[`${k}_${nm}`]; const m = MA.garchFit(r, { gjr: nm === 'gjr' }); if (!m) { fails++; console.log('no fit', k, nm); continue; }
  // arch orders parameters mu, omega, alpha, (gamma), beta - same as here
  cmp(`${k} ${nm} loglik`, m.ll, R.ll, 2e-4); R.params.forEach((v, i) => cmp(`${k} ${nm} ${R.names[i]}`, m.params[i], v, 0.02)); R.se.forEach((v, i) => cmp(`${k} ${nm} se ${R.names[i]}`, m.se[i], v, 0.25)); }
console.log(`${checks - fails}/${checks} GARCH checks passed`); process.exit(fails ? 1 : 0);
