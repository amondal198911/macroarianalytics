import fs from 'fs'; import { load } from './harness.mjs';
const ctx = load(); const MA = ctx.MA;
const { data, ref } = JSON.parse(fs.readFileSync('build/verify_ref_garch.json', 'utf8'));
const r = data.xr_dlog; const R = ref.xr_dlog_garch;
// replicate contrib at given params
const n = r.length, tau = Math.min(75, n);
const ll = (x) => { const [mu, om, a, b] = x; const e = r.map(v => v - mu); let w = 0, s = 0; for (let i = 0; i < tau; i++) { const wi = Math.pow(0.94, i); w += wi; s += wi * e[i] * e[i]; } const b0 = s / w; let s2 = om + (a + b) * b0, L = 0, prev; for (let t = 0; t < n; t++) { if (t > 0) s2 = om + a * e[t - 1] ** 2 + b * prev; prev = s2; L += -0.5 * (Math.log(2 * Math.PI) + Math.log(s2) + e[t] ** 2 / s2); } return L; };
console.log('arch params', R.params, 'arch ll', R.ll, 'my ll at arch params', ll(R.params));
const m = MA.garchFit(r); console.log('my params', m.params, 'my ll', m.ll, ll(m.params));
const b0 = (() => { const e = r.map(v => v - R.params[0]); let s = 0; for (const x of e) s += x * x; return s / n; })(); console.log('sample var backcast alt', b0);
