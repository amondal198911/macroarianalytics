import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA, S = ctx.MAS;
const C = MA.ctx('BGD', 'w-labour'); const y = C.y().v;
const tm = (k, fn) => { const t = Date.now(); const r = fn(); console.log(k, Date.now() - t, 'ms', r && r.label, r && r.aicc && r.aicc.toFixed(3), r && r.method); return r; };
for (const o of [[2, 1, 2], [0, 1, 3], [1, 1, 3]]) { tm('ML ' + o, () => S.arimaFit(y, o, [0, 0, 0], 12, { ml: true })); tm('ML nomean ' + o, () => S.arimaFit(y, o, [0, 0, 0], 12, { ml: true, mean: false })); }
