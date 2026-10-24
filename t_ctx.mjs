import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA;
const iso = process.argv[2] || 'BGD'; const only = process.argv[3];
const cats = MA.cats(iso); console.log(iso, 'categories:', cats.map(c => c.id + '(' + c.series.length + ')').join(' '));
for (const c of cats) { if (only && c.id !== only) continue;
  const t0 = Date.now(); const C = MA.ctx(iso, c.id); const y = C.y();
  const times = {}; const tm = (k, fn) => { const t = Date.now(); let r; try { r = fn(); } catch (e) { r = 'ERR ' + e.message; console.log(e.stack.split('\n').slice(0, 3).join('\n')); } times[k] = Date.now() - t; return r; };
  const ur = tm('ur', () => C.urT()); const ar = tm('arima', () => C.arima()); const bt = tm('backtest', () => C.backtest()); const vf = tm('var', () => C.varFit()); const ir = tm('irf', () => C.irf()); const fc = tm('fc', () => C.fcAll());
  const br = tm('breaks', () => C.breaks()); const ga = tm('garch', () => C.garch()); const rg = tm('reg', () => C.reg(0, 0));
  console.log(`${c.id.padEnd(12)} n=${y.v.length} f=${C.f} I(${ur && ur.order}) arima=${ar && ar.label} bt=${bt ? bt.origins : '-'} var=${vf ? 'K' + vf.fit.K + ' p' + vf.p + ' n' + vf.fit.Tn : (C.varSet().notes || []).join(';') || '-'} fc=${(fc || []).map(m => m.id).join(',')} breaks=${br ? br.bp.chosen.m : '-'} garch=${ga && ga.g ? ga.g.persistence.toFixed(2) : '-'} reg=${rg ? rg.fit.n : '-'}`);
  console.log('   ms', JSON.stringify(times), 'total', Date.now() - t0);
}
