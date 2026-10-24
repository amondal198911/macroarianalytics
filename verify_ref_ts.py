#!/usr/bin/env python3
"""Reference results for the time-series part of the engine (VAR, causality, IRF, Johansen, Engle-Granger, filters, ARIMA)."""
import json, warnings
from pathlib import Path
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.api import VAR
from statsmodels.tsa.vector_ar.vecm import coint_johansen
from statsmodels.tsa.stattools import coint
from statsmodels.tsa.filters.hp_filter import hpfilter
from statsmodels.tsa.statespace.sarimax import SARIMAX
warnings.filterwarnings('ignore')
ROOT = Path(__file__).resolve().parent.parent
M = json.load(open(ROOT / 'data' / 'bd' / 'bd_M.json'))
def ser(code, n):
    s = M[code]; v = [x for x in s[1:] if x is not None]; return np.asarray(v[-n:], float)
n = 160
infl = ser('ET.CPI.002', n); call = ser('ET.CALLMONEY.003', n); xr = ser('ET.SEI_B.013', n + 12)
xdep = (xr[12:] / xr[:-12] - 1) * 100
Y = np.column_stack([infl, call, xdep])
ref = {}
sel = VAR(Y).select_order(6)
ref['sel'] = {k: int(v) for k, v in sel.selected_orders.items()}
r = VAR(Y).fit(2)
ref['var'] = dict(params=r.params.tolist(), aic=r.aic, bic=r.bic, hqic=r.hqic, fpe=r.fpe, sigma=r.sigma_u.tolist(),
                  roots=sorted([float(abs(1 / z)) for z in r.roots], reverse=True))
c = r.test_causality(0, [2], kind='f'); ref['caus'] = dict(F=float(c.test_statistic), p=float(c.pvalue), df=[int(c.df[0]), int(c.df[1])])
irf = r.irf(12); ref['irf'] = irf.orth_irfs.tolist(); ref['fevd'] = (r.fevd(12).decomp * 100).tolist()
# Johansen on levels of CPI-like indices: use cumulated inflation proxies (log price levels) and exchange rate
lp = np.log(ser('ET.SEI_B.013', n)); m2 = np.log(ser('ET.SEI_A.015', n)); pr = np.cumsum(infl / 1200.0)
J = np.column_stack([pr, m2, lp])
for det in (-1, 0, 1):
    j = coint_johansen(J, det, 2)
    ref[f'joh{det}'] = dict(trace=j.lr1.tolist(), maxeig=j.lr2.tolist(), cvt=j.cvt.tolist(), cvm=j.cvm.tolist(), eig=j.eig.tolist())
eg = coint(lp, m2, trend='c', autolag='aic'); ref['eg'] = dict(stat=float(eg[0]), p=float(eg[1]), cv=[float(x) for x in eg[2]])
cyc, tr = hpfilter(infl, 14400); ref['hp'] = tr.tolist()
# ARIMA(1,0,1) with mean on inflation and (0,1,1) with drift on exchange rate: compare CSS forecasts to MLE (loose)
a = SARIMAX(infl, order=(1, 0, 1), trend='c').fit(disp=False); fc = a.get_forecast(12)
ref['arma11'] = dict(params=a.params.tolist(), fc=fc.predicted_mean.tolist(), se=fc.se_mean.tolist())
b = SARIMAX(lp, order=(0, 1, 1), trend='c').fit(disp=False); fb = b.get_forecast(12)
ref['ima11'] = dict(params=b.params.tolist(), fc=fb.predicted_mean.tolist(), se=fb.se_mean.tolist())
data = dict(Y=Y.tolist(), J=J.tolist(), lp=lp.tolist(), m2=m2.tolist(), infl=infl.tolist())
json.dump(dict(data=data, ref=ref), open(ROOT / 'build' / 'verify_ref_ts.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else str(o))
print('ts reference written', ref['sel'])
