#!/usr/bin/env python3
"""Reference results from statsmodels / scipy / arch for scripts/verify_stats.mjs (engine verification)."""
import json, sys, warnings
from pathlib import Path
import numpy as np
from scipy import stats as sst
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller, kpss, zivot_andrews, acf, pacf, grangercausalitytests
from statsmodels.stats.diagnostic import acorr_ljungbox, het_breuschpagan, het_white, het_arch, acorr_breusch_godfrey, linear_reset
from statsmodels.stats.stattools import jarque_bera, durbin_watson
from arch.unitroot import PhillipsPerron
warnings.filterwarnings('ignore')
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)
# test series: real Bangladesh data (headline CPI inflation, Taka per US$) and synthetic AR / random walk series
M = json.load(open(ROOT / 'data' / 'bd' / 'bd_M.json'))
def ser(code):
    s = M[code]; return [v for v in s[1:] if v is not None]
infl = ser('ET.CPI.002')[-180:]
xr = ser('ET.SEI_B.013')[-200:]
ar = [0.0]
for _ in range(199): ar.append(0.6 * ar[-1] + rng.standard_normal())
rw = list(np.cumsum(rng.standard_normal(150)) + 50)
data = dict(infl=infl, xr=xr, ar=ar, rw=rw)
ref = {}
for name, y in data.items():
    y = np.asarray(y, float); r = {}
    for reg in ['c', 'ct']:
        a = adfuller(y, regression=reg, autolag='AIC')
        r[f'adf_{reg}'] = dict(stat=a[0], p=a[1], lags=a[2], nobs=a[3], cv1=a[4]['1%'], cv5=a[4]['5%'], cv10=a[4]['10%'])
        k = kpss(y, regression=reg, nlags='auto')
        r[f'kpss_{reg}'] = dict(stat=k[0], p=k[1], lags=k[2])
        p_ = PhillipsPerron(y, trend=reg)
        r[f'pp_{reg}'] = dict(stat=p_.stat, p=p_.pvalue, lags=p_.lags)
    for reg in ['c', 'ct', 't']:
        z = zivot_andrews(y, regression=reg)
        r[f'za_{reg}'] = dict(stat=z[0], p=z[1], lags=z[3], bp=int(z[4]))
    r['acf'] = acf(y, nlags=12).tolist(); r['pacf'] = pacf(y, nlags=12, method='ldb').tolist()
    lb = acorr_ljungbox(y, lags=[12]); r['lb12'] = dict(stat=float(lb['lb_stat'].iloc[0]), p=float(lb['lb_pvalue'].iloc[0]))
    jb = jarque_bera(y); r['jb'] = dict(stat=jb[0], p=jb[1])
    d = sst.describe(y); r['desc'] = dict(mean=d.mean, var=d.variance, skew=d.skewness, kurt=d.kurtosis, q1=float(np.quantile(y, .25)), med=float(np.median(y)))
    # regression of y_t on const, trend, y_{t-1}
    X = sm.add_constant(np.column_stack([np.arange(len(y) - 1), y[:-1]])); Y = y[1:]
    f = sm.OLS(Y, X).fit()
    r['ols'] = dict(beta=f.params.tolist(), se=f.bse.tolist(), p=f.pvalues.tolist(), r2=f.rsquared, adjr2=f.rsquared_adj, F=f.fvalue, Fp=f.f_pvalue, aic=f.aic, bic=f.bic, ll=f.llf)
    fh = sm.OLS(Y, X).fit(cov_type='HC1'); r['ols_hc1'] = dict(se=fh.bse.tolist())
    fn = sm.OLS(Y, X).fit(cov_type='HAC', cov_kwds={'maxlags': 4}); r['ols_hac4'] = dict(se=fn.bse.tolist())
    bp = het_breuschpagan(f.resid, X); r['bp'] = dict(stat=bp[0], p=bp[1])
    w = het_white(f.resid, X); r['white'] = dict(stat=w[0], p=w[1])
    ar_ = het_arch(f.resid, nlags=4); r['arch4'] = dict(stat=ar_[0], p=ar_[1])
    bg = acorr_breusch_godfrey(f, nlags=4); r['bg4'] = dict(stat=bg[0], p=bg[1])
    rs = linear_reset(f, power=3, use_f=True); r['reset'] = dict(stat=float(rs.fvalue), p=float(rs.pvalue))
    r['dw'] = durbin_watson(f.resid)
    ref[name] = r
# Granger: does xr growth help predict inflation (aligned on the last 150 points)
n = 150
xg = np.diff(np.log(np.asarray(xr[-n - 1:], float))) * 100; ii = np.asarray(infl[-n:], float)
g = grangercausalitytests(np.column_stack([ii, xg]), maxlag=[3])
ref['granger'] = dict(F=float(g[3][0]['ssr_ftest'][0]), p=float(g[3][0]['ssr_ftest'][1]), df=[int(g[3][0]['ssr_ftest'][2]), int(g[3][0]['ssr_ftest'][3])])
data['xg'] = xg.tolist(); data['ii'] = ii.tolist()
# distributions
ref['dist'] = dict(t=[sst.t.sf(2.1, 15), sst.t.ppf(0.975, 10)], chi2=[sst.chi2.sf(7.3, 3), sst.chi2.ppf(0.95, 4)], f=[sst.f.sf(3.2, 2, 40), sst.f.ppf(0.95, 3, 60)],
                   norm=[sst.norm.sf(3.5), sst.norm.ppf(0.001), sst.norm.cdf(-8.0)])
json.dump(dict(data=data, ref=ref), open(ROOT / 'build' / 'verify_ref.json', 'w'), default=lambda o: o.item() if hasattr(o, 'item') else str(o))
print('reference written')
