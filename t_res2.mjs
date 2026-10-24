import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA, S = ctx.MAS;
const C = MA.ctx('BGD', process.argv[2] || 'reserves'); const y = C.y().v;
const tm = (k, fn) => { const t = Date.now(); const r = fn(); console.log(k, Date.now() - t, 'ms'); return r; };
const step = process.argv[3];
if (step === 'auto') tm('autoArima', () => S.autoArima(y, { seasonal: false, ml: false }));
if (step === 'garch') { const r = y.slice(1).map((v, i) => 100 * Math.log(v / y[i])); tm('garch', () => MA.garchFit(r)); tm('gjr', () => MA.garchFit(r, { gjr: true })); }
if (step === 'ets') tm('ets', () => S.etsFit(y));
if (step === 'varset') tm('varset', () => C.varSet());
if (step === 'ndiffs') tm('ndiffs', () => S.ndiffs(y));
if (step === 'grid') { const d = S.ndiffs(y); console.log('d', d); for (let p = 0; p <= 3; p++) for (let q = 0; q <= 3; q++) { if (p + q > 4) continue; tm(`arima ${p},${d},${q}`, () => S.arimaFit(y, [p, d, q], [0, 0, 0], 12)); if (d === 1) tm(`arima ${p},${d},${q} nomean`, () => S.arimaFit(y, [p, d, q], [0, 0, 0], 12, { mean: false })); } }
