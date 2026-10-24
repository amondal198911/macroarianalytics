// Node harness: loads the site's JS engine with the built data (no browser) for timing and robustness checks.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function load(files = ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js', 'analysis.js']) {
  const ctx = { console, Math, Float64Array, Uint8Array, Array, Object, JSON, Number, String, Date, Map, Set, Promise, isFinite, isNaN, parseInt, parseFloat, Infinity, NaN, setTimeout, clearTimeout,
    document: { documentElement: { setAttribute() {}, removeAttribute() {} }, getElementById: () => null, addEventListener() {}, dispatchEvent() {} }, getComputedStyle: () => ({ getPropertyValue: () => '' }), CustomEvent: function () {}, history: { replaceState() {} } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'js', f), 'utf8'), ctx, { filename: f });
  const MA = ctx.MA; MA.DB.world = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'world.json'), 'utf8')); MA.DB.bd = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'bd_data.json'), 'utf8'));
  MA.DB.maps = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'geo', 'geo.json'), 'utf8')).maps; MA.indexWorld(); return ctx;
}
