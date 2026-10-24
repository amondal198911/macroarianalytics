import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA, S = ctx.MAS;
const C = MA.ctx('BGD', 'w-labour'); const y = C.y().v;
let calls = 0, tk = 0; const orig = S.armaKalman; 
// wrap nelderMead to count iterations
const nm = S.nelderMead; let nmCalls = 0, evals = 0;
const t0 = Date.now(); const r = S.arimaFit(y, [2, 1, 2], [0, 0, 0], 12, { ml: true }); console.log('total', Date.now() - t0);
// time a single kalman call
const w = y.slice(1).map((v, i) => v - y[i]); const t1 = Date.now(); for (let i = 0; i < 1000; i++) orig(w, [0.5, 0.2], [0.3, 0.1], 0.05); console.log('1000 kalman', Date.now() - t1);
const t2 = Date.now(); for (let i = 0; i < 1000; i++) orig(w, [1.2, -0.25], [-0.99, 0.0], 0.05); console.log('1000 kalman near-unit', Date.now() - t2);
