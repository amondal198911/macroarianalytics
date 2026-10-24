import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA, S = ctx.MAS;
const C = MA.ctx('BGD', 'w-labour'); const y = C.y().v; console.log('n', y.length, JSON.stringify(y.map(v => +v.toFixed(2))));
const tm = (k, fn) => { const t = Date.now(); const r = fn(); console.log(k, Date.now() - t, 'ms', r && r.label, r && r.aicc); return r; };
const d = S.ndiffs(y); console.log('d', d);
for (let p = 0; p <= 3; p++) for (let q = 0; q <= 3; q++) { if (p + q > 4) continue; tm(`css ${p},${d},${q}`, () => S.arimaFit(y, [p, d, q], [0, 0, 0], 12, { ml: false })); }
for (const o of [[3, 1, 0], [2, 1, 0], [1, 1, 1], [0, 1, 2]]) tm('ML ' + o, () => S.arimaFit(y, o, [0, 0, 0], 12, { ml: true }));
