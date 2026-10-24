"""Reference impulse responses from the Python DSGE solver (scripts/bd_dsge.py), for scripts/verify_dsge.mjs."""
import json, os, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / 'scripts' / 'bd_dsge.py').read_text(); cut = src.index('# ------------------------------------------------------------------ posterior mode')
ns = {'__name__': 'verify', '__file__': str(ROOT / 'scripts' / 'bd_dsge.py'), '__doc__': ''}; exec(compile(src[:cut], 'bd_dsge_model', 'exec'), ns)
NAMES, IX, solve = ns['NAMES'], ns['IX'], ns['solve']
base = {p[0]: p[3] for p in ns['PARAMS']}
sets = {'prior_mean': dict(base), 'open_economy': dict(base, alpha=0.45, psi3=0.6, kappa=0.9), 'smoothing': dict(base, rhoR=0.9, psi1=2.2, tau=0.3), 'indeterminate': dict(base, psi1=0.5, psi2=0.02)}
out = {}
for k, p in sets.items():
    th = np.array([p[n] for n in NAMES]); sol = solve(th)
    if sol is None: out[k] = {'params': p, 'determinate': False}; continue
    P, Q = sol; sig = th[12:17]; resp = {}
    for j in range(5):
        x = Q[:, j] * sig[j]; rows = []
        for h in range(17): rows.append([float(x[IX['y']]), float(4 * x[IX['pi']]), float(4 * x[IX['R']]), float(4 * x[IX['de']])]); x = P @ x
        resp[j] = rows
    out[k] = {'params': p, 'determinate': True, 'irf': resp}
(ROOT / 'build' / 'verify_ref_dsge.json').write_text(json.dumps(out)); print({k: v['determinate'] for k, v in out.items()})
