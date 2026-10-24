"""Reference GARCH(1,1) and GJR-GARCH(1,1,1) estimates from the arch package (Sheppard), for scripts/verify_garch.mjs."""
import json, pathlib, numpy as np
from arch import arch_model
ROOT = pathlib.Path(__file__).resolve().parent.parent
bd = json.loads((ROOT / 'build' / 'bd_data.json').read_text())
def ser(k):
    v = [x for x in bd['series'][k]['v'] if x is not None]
    return np.array(v, dtype=float)
cases = {}
xr = ser('xr'); cases['xr_dlog'] = list(100 * np.diff(np.log(xr)))
inf = ser('infl'); cases['infl_diff'] = list(np.diff(inf))
dse = ser('dse'); cases['dse_dlog'] = list(100 * np.diff(np.log(dse)))
out = {'data': cases, 'ref': {}}
for k, r in cases.items():
    r = np.array(r)
    for nm, o in (('garch', 0), ('gjr', 1)):
        res = arch_model(r, mean='Constant', vol='GARCH', p=1, o=o, q=1, dist='normal', rescale=False).fit(disp='off', options={'maxiter': 2000})
        out['ref'][f'{k}_{nm}'] = {'params': [float(x) for x in res.params.values], 'se': [float(x) for x in res.std_err.values], 'll': float(res.loglikelihood), 'names': list(res.params.index)}
(ROOT / 'build' / 'verify_ref_garch.json').write_text(json.dumps(out))
print({k: [round(x, 4) for x in v['params']] for k, v in out['ref'].items()})
