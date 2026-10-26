#!/usr/bin/env python3
"""Bangladesh Monitor + Forecast lab: curate series and estimate all models.

Reads bd_catalog.json, bd_M.json, bd_Q.json, bd_CY.json, bd_FY.json (Bangladesh Bank / NSDP data)
and build/data.json (World Bank WDI for the world analysis). Writes bd_models.json.

usage: python bd_build.py [--data DIR] [--world FILE] [--out FILE]
"""
import argparse, datetime, json, math, warnings
from pathlib import Path
import numpy as np
from scipy import stats
warnings.filterwarnings('ignore')
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.api import VAR
from statsmodels.tsa.stattools import adfuller, kpss

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
ap = argparse.ArgumentParser()
ap.add_argument('--data', default=str(ROOT))
ap.add_argument('--world', default=str(ROOT / 'build' / 'data.json'))
ap.add_argument('--out', default=str(ROOT / 'bd_models.json'))
A = ap.parse_args()
DATA = Path(A.data)
RNG = np.random.RandomState(20261022)

# ------------------------------------------------------------------ helpers
def r4(x, sig=5):
    if x is None:
        return None
    try:
        x = float(x)
    except Exception:
        return None
    if not math.isfinite(x):
        return None
    if x == 0:
        return 0.0
    return float(f'{x:.{sig}g}')

def rl(a, sig=5):
    return [r4(v, sig) for v in a]

cat = json.load(open(DATA / 'bd_catalog.json'))
META = {r[0]: r for r in cat}
SER = {f: json.load(open(DATA / f'bd_{f}.json')) for f in ['M', 'Q', 'CY', 'FY']}

def mk(y, m): return y * 12 + m - 1
def mlab(k): return f'{k // 12}-{k % 12 + 1:02d}'
def qk(y, q): return y * 4 + q - 1
def qlab(k): return f'{k // 4}-Q{k % 4 + 1}'
LAB = {'M': mlab, 'Q': qlab, 'FY': lambda k: f'FY{k}', 'CY': str}

def get(code, f):
    s = SER[f].get(code)
    if not s:
        return {}
    st, vals = s[0], s[1:]
    if f == 'M':
        k0 = mk(int(st[:4]), int(st[5:7]))
    elif f == 'Q':
        k0 = qk(int(st[:4]), int(st[-1]))
    elif f == 'FY':
        k0 = int(st[2:])
    else:
        k0 = int(st)
    return {k0 + i: float(v) for i, v in enumerate(vals) if v is not None and math.isfinite(float(v))}

def splice(*ds):
    out = {}
    for d in ds:
        out.update(d)
    return out

def yoy(d, lag):
    return {k: (v / d[k - lag] - 1) * 100 for k, v in d.items() if (k - lag) in d and d[k - lag] > 0}

def src_of(codes):
    out = []
    for c in codes:
        m = META.get(c)
        if not m:
            continue
        prov = m[6] or ''
        newest = ''
        if 'newest:' in prov:
            newest = prov.split('newest:')[1].split(';')[0].strip()
        elif 'Editions used' in prov:
            newest = prov.split(':', 1)[1].split(',')[0].strip()
        out.append({'code': c, 'pub': m[1], 'table': m[2], 'name': m[3], 'unit': m[4], 'prov': prov[:240], 'note': m[7], 'newest': newest})
    return out

def pack(d, f):
    if not d:
        return None
    ks = sorted(d)
    k0, k1 = ks[0], ks[-1]
    return {'f': f, 's': LAB[f](k0), 'k0': k0, 'v': [r4(d.get(k)) for k in range(k0, k1 + 1)]}

# ------------------------------------------------------------------ curated series (WSEI-style chunks)
C = {}
def add(key, label, unit, f, chunk, codes, d, sub='', note='', how='raw'):
    C[key] = dict(key=key, label=label, sub=sub, unit=unit, f=f, chunk=chunk, how=how, note=note, src=src_of(codes), data=d)

M = lambda c: get(c, 'M')
def extend(base, newer):
    last = max(base)
    return splice(base, {k: v for k, v in newer.items() if k > last})
def fillholes(base, donors):
    """Fill missing months only from a donor table that agrees (within 0.06 points) on the neighbouring months, i.e. is on the same base."""
    out, ks, done = dict(base), sorted(base), []
    for k in range(ks[0], ks[-1] + 1):
        if k in out:
            continue
        for d in donors:
            nb = [j for j in (k - 1, k + 1) if j in base and j in d]
            if k in d and nb and all(abs(base[j] - d[j]) < 0.06 for j in nb):
                out[k] = d[k]
                done.append(mlab(k))
                break
    return out, done
def link(old, new, newest, lo, hi):
    """Old CPI base until the overlap month where old and new bases differ least, then the new base, then the newest base."""
    ov = [k for k in old if k in new and lo <= k <= hi]
    S = min(ov, key=lambda k: abs(old[k] - new[k]))
    out = {k: v for k, v in old.items() if k <= S}
    out.update({k: v for k, v in new.items() if k > S})
    out.update({k: v for k, v in newest.items() if k > max(new)})
    return out, S, abs(old[S] - new[S])
OLD_END = mk(2013, 7)
_n1, _nf1 = fillholes(M('ET.SEI_B.002'), [M('ET.CPI.002')])
_i1, S1, d1 = link({k: v for k, v in M('ET.SEI_B.001').items() if k <= OLD_END}, _n1, M('ET.CPI_B.002'), mk(2011, 5), OLD_END)
_n3, _nf3 = fillholes(M('ET.SEI_B.004'), [M('ET.CPI.003')])
_i3, S3, d3 = link({k: v for k, v in M('ET.SEI_B.003').items() if k <= OLD_END}, _n3, M('ET.CPI_B.003'), mk(2012, 7), OLD_END)
for nm, ser_, S_, d_, nf_ in (('p2p', _i1, S1, d1, _nf1), ('avg', _i3, S3, d3, _nf3)):
    print(f'linked {nm}: old base to {mlab(S_)} (gap {d_:.3f} pp), filled {nf_}, still missing', [mlab(k) for k in range(min(ser_), max(ser_) + 1) if k not in ser_], 'range', mlab(min(ser_)), mlab(max(ser_)))
LINK_NOTE = ('Linked series: CPI base 1995–96 to ' + mlab(S1) + ', base 2005–06 from the next month to March 2023 (Table IB, second series, checked against Table VII), '
             'base 2021–22 from April 2023 (Table VIII). The first switch is made in the month where the two bases differ least (' + f'{d1:.2f}' + ' points), so no artificial jump is created.')
add('infl', 'Headline inflation', '% y/y', 'M', 'prices', ['ET.SEI_B.001', 'ET.SEI_B.002', 'ET.CPI.002', 'ET.CPI_B.002'], _i1, 'point-to-point', LINK_NOTE, 'splice')
add('infl_avg', 'Headline inflation', '%', 'M', 'prices', ['ET.SEI_B.003', 'ET.SEI_B.004', 'ET.CPI.003', 'ET.CPI_B.003'], _i3, '12-month average', LINK_NOTE.replace(mlab(S1), mlab(S3)).replace(f'{d1:.2f}', f'{d3:.2f}'), 'splice')
K12 = mk(2012, 7)
COMP_NOTE = 'From July 2012 (base 2005–06, Table VII), after that table’s change of base; base 2021–22 (Table VIII) from April 2023.'
COMP_NOTE2 = 'July 2006 to June 2012: base 1995–96 (Table VII, as published); July 2012 to March 2023: base 2005–06; from April 2023: base 2021–22 (Table VIII). Published rates are used, so no index levels are spliced.'
add('food', 'Food inflation', '% y/y', 'M', 'prices', ['ET.CPI.005', 'ET.CPI_B.005'], splice(M('ET.CPI.005'), M('ET.CPI_B.005')), 'point-to-point', COMP_NOTE2, 'splice')
add('nonfood', 'Non-food inflation', '% y/y', 'M', 'prices', ['ET.CPI.008', 'ET.CPI_B.008'], splice(M('ET.CPI.008'), M('ET.CPI_B.008')), 'point-to-point', COMP_NOTE2, 'splice')
_ov = [(k, M('ET.SEI_B.001')[k], M('ET.CPI_B.002')[k]) for k in M('ET.CPI_B.002') if k in M('ET.SEI_B.001')]
print('check Table IB vs Table VIII overlap: months', len(_ov), 'max abs diff', round(max(abs(a - b) for _, a, b in _ov), 3) if _ov else None)
_f = M('ET.CPI.005'); print('food Table VII 2012-04..09:', [_f.get(k) for k in range(mk(2012, 4), mk(2012, 10))])
# CPI components (2021-22 base): year-on-year from the group indices
OLDG = [('food', 'N.CPI.2.0005', False), ('cloth', 'N.CPI.2.0007', False), ('housing', 'N.CPI.2.0008', False), ('rent', 'N.CPI.2.0008', False), ('furnish', 'N.CPI.2.0009', False), ('health', 'N.CPI.2.0010', False), ('transport', 'N.CPI.2.0011', True), ('communication', 'N.CPI.2.0011', True), ('recreation', 'N.CPI.2.0012', True), ('education', 'N.CPI.2.0012', True), ('miscellaneous', 'N.CPI.2.0013', False), ('misc', 'N.CPI.2.0013', False)]
def old_group(nm):
    n = nm.lower()
    for w, code, apx in OLDG:
        if w in n:
            try: d = yoy(M(code), 12)
            except Exception: d = {}
            return (d, code, apx) if d else (None, None, False)
    return None, None, False
comp = []
for c in ['ET.CPI_B.004'] + [f'ET.CPI_B.0{i}' for i in range(11, 21)]:
    d = yoy(M(c), 12)
    if d:
        nm = META[c][3].split('|')[-1].strip() if c != 'ET.CPI_B.004' else 'Food'
        k = max(d)
        od, oc, apx = old_group(nm)
        full = dict(d)
        if od:
            k1 = min(d)
            for kk, vv in od.items():
                if kk < k1 and kk < mk(2023, 4): full[kk] = vv
        comp.append({'name': nm, 'code': c, 'period': mlab(k), 'v': r4(d[k]), 'prev': r4(d.get(k - 1)), 'series': pack(full, 'M'), 'old': oc, 'approx': apx})
        print('CPI group', nm[:34].ljust(34), 'from', mlab(min(full)), '(old base' + (' ' + oc + (', approximate' if apx else '') if oc else ': none') + ')')
gdp_fy = splice(get('ET.NA_KEY.029', 'FY'), get('ET.NA_KEY.030', 'FY'))
add('gdp_fy', 'Real GDP growth', '%', 'FY', 'real', ['ET.NA_KEY.029', 'ET.NA_KEY.030'], gdp_fy, 'fiscal year', 'Base 2005–06 to FY2016, base 2015–16 from FY2017.', 'splice')
add('gdp_q', 'Real GDP growth', '% y/y', 'Q', 'real', ['ET.QGDP.034'], get('ET.QGDP.034', 'Q'), 'quarterly, constant prices')
add('inv_gdp', 'Investment', '% of GDP', 'FY', 'real', ['ET.NA_KEY.021', 'ET.NA_KEY.022'], splice(get('ET.NA_KEY.021', 'FY'), get('ET.NA_KEY.022', 'FY')), '', '', 'splice')
add('sav_gdp', 'National savings', '% of GDP', 'FY', 'real', ['ET.NA_KEY.017', 'ET.NA_KEY.018'], splice(get('ET.NA_KEY.017', 'FY'), get('ET.NA_KEY.018', 'FY')), '', '', 'splice')
add('cons_gdp', 'Consumption', '% of GDP', 'FY', 'real', ['ET.NA_KEY.011', 'ET.NA_KEY.012'], splice(get('ET.NA_KEY.011', 'FY'), get('ET.NA_KEY.012', 'FY')), '', '', 'splice')
add('iip', 'Industrial production', '% y/y', 'M', 'real', ['ET.SEI_B.008'], yoy(M('ET.SEI_B.008'), 12), 'manufacturing, mining and electricity', '', 'yoy')
add('m2', 'Broad money (M2)', '% y/y', 'M', 'money', ['ET.SEI_A.015'], yoy(M('ET.SEI_A.015'), 12), '', '', 'yoy')
add('rm', 'Reserve money', '% y/y', 'M', 'money', ['ET.RM_SRC.009'], yoy(M('ET.RM_SRC.009'), 12), '', '', 'yoy')
add('pcredit', 'Private sector credit', '% y/y', 'M', 'money', ['ET.MS_M2.010'], yoy(M('ET.MS_M2.010'), 12), '', '', 'yoy')
add('cdr', 'Credit–deposit ratio', '%', 'M', 'money', ['ET.SEI_A.061'], M('ET.SEI_A.061'), 'deposit money banks')
add('npl', 'Non-performing loans', '% of gross loans', 'Q', 'money', ['N.FSD.1.0022'], get('N.FSD.1.0022', 'Q'), 'deposit takers')
add('crar', 'Capital to risk-weighted assets', '%', 'Q', 'money', ['N.FSD.1.0007'], get('N.FSD.1.0007', 'Q'), 'deposit takers')
add('call', 'Call money rate', '%', 'M', 'rates', ['ET.CALLMONEY.003'], M('ET.CALLMONEY.003'), 'weighted average')
add('dep', 'Deposit rate', '%', 'M', 'rates', ['ET.SEI_A.066'], M('ET.SEI_A.066'), 'scheduled banks, weighted average')
add('lend', 'Lending rate', '%', 'M', 'rates', ['ET.SEI_A.067'], M('ET.SEI_A.067'), 'scheduled banks, weighted average')
add('spread', 'Lending–deposit spread', 'pp', 'M', 'rates', ['ET.SEI_A.068'], M('ET.SEI_A.068'))
add('bankrate', 'Bank rate', '%', 'M', 'rates', ['ET.SEI_A.065'], M('ET.SEI_A.065'))
rl_ = {k: C['lend']['data'][k] - C['infl']['data'][k] for k in C['lend']['data'] if k in C['infl']['data']}
add('real_lend', 'Real lending rate', '%', 'M', 'rates', ['ET.SEI_A.067', 'ET.CPI.002', 'ET.CPI_B.002'], rl_, 'lending rate minus headline inflation', 'Calculated: lending rate minus point-to-point inflation.', 'derived')
xr = M('ET.SEI_B.013')
add('xr', 'Exchange rate', 'Tk per US$', 'M', 'ext', ['ET.SEI_B.013'], xr, 'period average')
add('xr_dep', 'Taka depreciation', '% y/y', 'M', 'ext', ['ET.SEI_B.013'], yoy(xr, 12), 'against the US dollar', 'Calculated: change in Taka per US$ on a year earlier; positive = weaker Taka.', 'yoy')
res = M('ET.SEI_B.011')
add('res', 'Gross foreign exchange reserves', 'US$ mn', 'M', 'ext', ['ET.SEI_B.011'], res)
add('res_bpm6', 'Reserves, BPM6 definition', 'US$ mn', 'M', 'ext', ['ET.SEI_B.012'], M('ET.SEI_B.012'))
remit = M('ET.MIGR.002')
add('remit', 'Remittances', 'US$ mn', 'M', 'ext', ['ET.MIGR.002'], remit)
add('remit_g', 'Remittance growth', '% y/y', 'M', 'ext', ['ET.MIGR.002'], yoy(remit, 12), '', '', 'yoy')
exp_ = M('ET.SEI_B.009')
add('exp', 'Exports', 'US$ mn', 'M', 'ext', ['ET.SEI_B.009'], exp_, 'shipments')
add('exp_g', 'Export growth', '% y/y', 'M', 'ext', ['ET.SEI_B.009'], yoy(exp_, 12), '', '', 'yoy')
imp = splice(M('ET.SEI_B.015'), {k: v for k, v in M('ET.SEI_B.010').items() if k > mk(2024, 7)})
add('imp', 'Imports', 'US$ mn', 'M', 'ext', ['ET.SEI_B.015', 'ET.SEI_B.010'], imp, '', 'Import payments to July 2024, import shipments afterwards: the two measures differ.', 'splice')
cover = {}
for k, v in res.items():
    win = [imp.get(j) for j in range(k - 11, k + 1)]
    if all(w is not None for w in win):
        cover[k] = v / (sum(win) / 12)
add('cover', 'Import cover of reserves', 'months', 'M', 'ext', ['ET.SEI_B.011', 'ET.SEI_B.015', 'ET.SEI_B.010'], cover, 'reserves ÷ average monthly imports (12 months)', 'Calculated. A common rule of thumb is at least 3 months.', 'derived')
for key, code, lab in [('ca', 'BGD_BOP_BCA_FY_USD', 'Current account balance'), ('fa', 'BGD_BOP_BF_FY_USD', 'Financial account'),
                       ('goods', 'BGD_BOP_BG_FY_USD', 'Trade balance (goods)'), ('secinc', 'BGD_BOP_BIS_FY_USD', 'Secondary income (mainly remittances)'),
                       ('bop', 'BGD_BOP_BOP_FY_USD', 'Overall balance'), ('fdi', 'BGD_BOP_BFFDI_FY_USD', 'Foreign direct investment (net)')]:
    full = 'N.BOPALT.' + code
    add(key, lab, 'US$ mn', 'FY', 'ext', [full], get(full, 'FY'), 'balance of payments, fiscal year')
add('govcredit', 'Net bank credit to government', '% y/y', 'M', 'fiscal', ['ET.MS_M2.006'], yoy(M('ET.MS_M2.006'), 12), 'banking-system financing of the budget', '', 'yoy')
add('nsav_net', 'Net sales of national savings certificates', 'Tk crore', 'M', 'fiscal', ['ET.NSAV.017'], M('ET.NSAV.017'))
add('nsav_out', 'Outstanding national savings certificates', 'Tk crore', 'M', 'fiscal', ['ET.NSAV.018'], M('ET.NSAV.018'))
tax_tot = [r[0] for r in cat if r[0].startswith('ET.TAX.') and 'total' in r[3].lower() and 'M' in r[5]]
if tax_tot:
    t = M(tax_tot[0])
    add('tax', 'NBR tax revenue', 'Tk crore', 'M', 'fiscal', [tax_tot[0]], t, 'monthly collection')
    add('tax_g', 'NBR tax revenue growth', '% y/y', 'M', 'fiscal', [tax_tot[0]], yoy(t, 12), '', '', 'yoy')
mcap = M('ET.MCAP.016')
add('mcap', 'Market capitalisation', 'Tk crore', 'M', 'cap', ['ET.MCAP.016'], mcap, 'listed companies')
add('mcap_g', 'Market capitalisation growth', '% y/y', 'M', 'cap', ['ET.MCAP.016'], yoy(mcap, 12), '', '', 'yoy')
sectors = []
for i in range(1, 16):
    c = f'ET.MCAP.{i:03d}'
    d = M(c)
    if d:
        k = max(d)
        sectors.append({'name': META[c][3].split('|')[-1].strip().replace('Pharmaceu-ticals', 'Pharmaceuticals'), 'v': r4(d[k]), 'period': mlab(k), 'code': c})
# SAARC peers (quarterly): reserves and exchange rates from Economic Trends Table XXVII
peers = []
for r in cat:
    if r[0].startswith('ET.SAARC.') and r[0] in SER['Q'] and r[3].split('|')[0].strip() in ('Foreign Exchange Reserve', 'Exchange Rate (CY/$)'):
        d = get(r[0], 'Q')
        if d:
            k = max(d)
            peers.append({'ind': r[3].split('|')[0].strip(), 'country': r[3].split('|')[-1].strip(), 'period': qlab(k), 'v': r4(d[k]), 'code': r[0], 'series': pack(d, 'Q')})

CH = {'prices': 'Prices and inflation', 'real': 'Real sector', 'money': 'Money and banking', 'rates': 'Interest rates',
      'ext': 'External sector', 'fiscal': 'Fiscal', 'cap': 'Capital market'}

def reading(key):
    s = C[key]
    d, f = s['data'], s['f']
    if not d:
        return None
    k = max(d)
    lag = {'M': 12, 'Q': 4, 'FY': 1, 'CY': 1}[f]
    prev = d.get(k - 1)
    ya = d.get(k - lag)
    win = [d[j] for j in range(k - lag + 1, k + 1) if j in d]
    hist = [d[j] for j in sorted(d)]
    pct = stats.percentileofscore(hist, d[k]) if len(hist) > 10 else None
    return {'key': key, 'period': LAB[f](k), 'v': r4(d[k]), 'prev': r4(prev), 'ya': r4(ya), 'avg': r4(sum(win) / len(win)) if win else None,
            'min': r4(min(hist)), 'max': r4(max(hist)), 'pct': r4(pct, 3), 'n': len(hist)}

# ------------------------------------------------------------------ statistics
def describe(x):
    x = np.asarray([v for v in x if v is not None and math.isfinite(v)], float)
    n = len(x)
    if n < 8:
        return None
    q1, med, q3 = np.percentile(x, [25, 50, 75])
    sd = x.std(ddof=1)
    jb = stats.jarque_bera(x)
    ar1 = np.corrcoef(x[1:], x[:-1])[0, 1] if n > 3 else None
    tq = {lvl: float(stats.t.ppf(0.5 + lvl / 200, n - 1)) for lvl in (68, 80, 90, 95, 99)}
    return {'n': n, 'mean': r4(x.mean()), 'median': r4(med), 'sd': r4(sd), 'min': r4(x.min()), 'q1': r4(q1), 'q3': r4(q3), 'max': r4(x.max()),
            'skew': r4(stats.skew(x)), 'kurt': r4(stats.kurtosis(x)), 'jb': r4(jb.statistic), 'jb_p': r4(jb.pvalue), 'ar1': r4(ar1), 'se': r4(sd / math.sqrt(n)),
            't': {str(k): r4(v) for k, v in tq.items()}}

def unitroot(x):
    x = np.asarray(x, float)
    out = {}
    for lab, y in (('level', x), ('diff', np.diff(x))):
        try:
            a = adfuller(y, regression='c', autolag='AIC')
            k = kpss(y, regression='c', nlags='auto')
            out[lab] = {'adf': r4(a[0]), 'adf_p': r4(a[1]), 'adf_lags': int(a[2]), 'adf_cv5': r4(a[4]['5%']), 'kpss': r4(k[0]), 'kpss_p': r4(k[1]), 'kpss_lags': int(k[2])}
        except Exception:
            out[lab] = None
    lv = out.get('level') or {}
    if lv:
        a_st, k_st = lv['adf_p'] < 0.05, lv['kpss_p'] > 0.05
        out['verdict'] = 'Stationary, I(0)' if a_st and k_st else 'Unit root, I(1)' if (not a_st and not k_st) else 'Mixed evidence'
    return out

# ------------------------------------------------------------------ ARIMA / SARIMA
def window(key, start=None):
    s = C[key]
    d = s['data']
    ks = sorted(d)
    k0 = start if start and start > ks[0] else ks[0]
    k1 = ks[-1]
    ks = [k for k in range(k0, k1 + 1)]
    while ks and ks[0] not in d:
        ks.pop(0)
    f = filled(d)
    return ks, np.asarray([f[k] for k in ks], float)

def filled(d, maxgap=3):
    """Linear interpolation of isolated gaps (up to 3 periods) for model inputs only."""
    out = dict(d)
    ks = sorted(d)
    for a, b in zip(ks, ks[1:]):
        if 1 < b - a <= maxgap + 1:
            for j in range(a + 1, b):
                out[j] = d[a] + (d[b] - d[a]) * (j - a) / (b - a)
    return out

def fit(y, order, sorder, trend):
    m = SARIMAX(y, order=order, seasonal_order=sorder, trend=trend)
    return m.fit(disp=False, maxiter=200)

def select(y, seasonal):
    best = None
    grid = []
    P = range(0, 2) if seasonal else range(0, 3)
    for d in (0, 1):
        for trend in (['c'] if d == 0 else ['n', 't']):
            for p in P:
                for q in P:
                    for so in ([(0, 1, 1, 12), (1, 1, 0, 12)] if seasonal else [(0, 0, 0, 0)]):
                        grid.append(((p, d, q), so, trend))
    tried = []
    for order, so, trend in grid:
        try:
            r = fit(y, order, so, trend)
            if not np.isfinite(r.aic):
                continue
            tried.append((r.aic, r.bic, order, so, trend))
            if best is None or r.aic < best[0]:
                best = (r.aic, order, so, trend, r)
        except Exception:
            pass
    tried.sort(key=lambda t: t[0])
    return best, tried[:5]

def dm_test(e1, e2, h):
    d = np.asarray(e1) ** 2 - np.asarray(e2) ** 2
    n = len(d)
    if n < 8:
        return None, None
    db = d.mean()
    g = [np.sum((d[k:] - db) * (d[:n - k] - db)) / n for k in range(h)]
    var = (g[0] + 2 * sum(g[1:])) / n
    if var <= 0:
        return None, None
    dm = db / math.sqrt(var) * math.sqrt((n + 1 - 2 * h + h * (h - 1) / n) / n)
    return r4(dm, 4), r4(2 * (1 - stats.t.cdf(abs(dm), n - 1)), 4)

H = [1, 3, 6, 12]
def arima_suite(key, log=False, seasonal=False, start=None, n_bt=24):
    ks, y0 = window(key, start)
    y = np.log(y0) if log else y0
    best, top = select(y, seasonal)
    if best is None:
        return None
    aic, order, so, trend, r = best
    tab = []
    names = r.model.param_names
    for nm, b, se, pv in zip(names, r.params, r.bse, r.pvalues):
        tab.append({'term': nm, 'coef': r4(b, 4), 'se': r4(se, 3), 'z': r4(b / se if se else None, 3), 'p': r4(pv, 3)})
    lb = sm.stats.acorr_ljungbox(r.resid[max(order[1], so[1] * 12):], lags=[6, 12, 24])
    lbt = [{'lag': int(l), 'q': r4(qv, 4), 'p': r4(pv, 3)} for l, qv, pv in zip([6, 12, 24], lb['lb_stat'], lb['lb_pvalue'])]
    fc = r.get_forecast(12)
    mean = np.asarray(fc.predicted_mean)
    bands = {}
    for lvl in (68, 80, 95):
        ci = np.asarray(fc.conf_int(alpha=1 - lvl / 100))
        bands[str(lvl)] = [rl(np.exp(ci[:, 0]) if log else ci[:, 0], 5), rl(np.exp(ci[:, 1]) if log else ci[:, 1], 5)]
    mean_o = np.exp(mean) if log else mean
    # rolling-origin backtest, fixed order, re-estimated at each origin
    errs = {h: {'m': [], 'rw': [], 'sn': []} for h in H}
    T = len(y)
    for o in range(T - n_bt - 12, T - 1):
        try:
            rr = fit(y[:o + 1], order, so, trend)
            f = np.asarray(rr.get_forecast(12).predicted_mean)
        except Exception:
            continue
        for h in H:
            if o + h < T:
                act = y0[o + h]
                pm = math.exp(f[h - 1]) if log else f[h - 1]
                errs[h]['m'].append(act - pm)
                errs[h]['rw'].append(act - y0[o])
                if seasonal and o + h - 12 >= 0:
                    errs[h]['sn'].append(act - y0[o + h - 12 * math.ceil(h / 12)])
    bt = []
    for h in H:
        e, w = np.asarray(errs[h]['m']), np.asarray(errs[h]['rw'])
        if len(e) < 6:
            continue
        rm, rw = math.sqrt(np.mean(e ** 2)), math.sqrt(np.mean(w ** 2))
        dmv, dmp = dm_test(e, w, h)
        act = np.asarray([0])
        row = {'h': h, 'n': len(e), 'rmse': r4(rm, 4), 'mae': r4(np.mean(np.abs(e)), 4), 'rmse_rw': r4(rw, 4), 'theil_u': r4(rm / rw if rw else None, 3),
               'skill': r4(1 - rm / rw if rw else None, 3), 'dm': dmv, 'dm_p': dmp}
        if errs[h]['sn']:
            sn = np.asarray(errs[h]['sn'])
            row['rmse_sn'] = r4(math.sqrt(np.mean(sn ** 2)), 4)
        bt.append(row)
    lastk = ks[-1]
    hist_k0 = max(ks[0], lastk - 95)
    return {'key': key, 'label': C[key]['label'], 'unit': C[key]['unit'], 'log': log, 'seasonal': seasonal,
            'spec': f"ARIMA{order}" + (f"×{so[:3]}₁₂" if seasonal else '') + {'c': ' with constant', 't': ' with drift', 'n': ''}[trend],
            'order': list(order), 'sorder': list(so), 'trend': trend, 'aic': r4(aic, 6), 'bic': r4(r.bic, 6), 'nobs': int(r.nobs),
            'sample': [mlab(ks[0]), mlab(lastk)], 'coefs': tab, 'ljungbox': lbt,
            'alts': [{'spec': f"ARIMA{t[2]}" + (f"×{t[3][:3]}₁₂" if seasonal else '') + {'c': ' c', 't': ' drift', 'n': ''}[t[4]], 'aic': r4(t[0], 6), 'bic': r4(t[1], 6)} for t in top],
            'fc_start': mlab(lastk + 1), 'fc': rl(mean_o, 5), 'bands': bands, 'backtest': bt,
            'hist': {'s': mlab(hist_k0), 'v': rl([y0[ks.index(k)] for k in range(hist_k0, lastk + 1)], 5)},
            'fitted': rl((np.exp(np.asarray(r.fittedvalues)) if log else np.asarray(r.fittedvalues))[-(lastk - hist_k0 + 1):], 5)}

print('ARIMA models…')
AR = {}
for key, lg, sea in [('infl', False, False), ('food', False, False), ('nonfood', False, False), ('xr', True, False), ('res', True, False),
                     ('remit', True, True), ('exp', True, True), ('m2', False, False), ('pcredit', False, False), ('call', False, False)]:
    try:
        AR[key] = arima_suite(key, lg, sea, start=mk(2012, 7) if key in ('food', 'nonfood') else mk(2010, 1))
        print(' ', key, AR[key]['spec'] if AR[key] else None)
    except Exception as e:
        print('  failed', key, e)

# ------------------------------------------------------------------ VAR / SVAR
print('VAR…')
VKEYS = ['infl', 'm2', 'call', 'xr_dep']
VLAB = ['Inflation', 'M2 growth', 'Call money rate', 'Taka depreciation']
FD = {k: filled(C[k]['data']) for k in VKEYS}
common = sorted(set.intersection(*[set(FD[k]) for k in VKEYS]))
common = [k for k in common if k >= mk(2010, 1)]
# contiguous block ending at the last common month
blk = [common[-1]]
for k in reversed(common[:-1]):
    if k == blk[-1] - 1:
        blk.append(k)
    else:
        break
blk = blk[::-1]
Y = np.array([[FD[k][t] for k in VKEYS] for t in blk])
N_FILLED = sum(1 for k in VKEYS for t in blk if t not in C[k]['data'])
sel = VAR(Y).select_order(12)
lagtab = [{'p': p, **{ic: r4(sel.ics[ic][p], 6) for ic in ('aic', 'bic', 'hqic', 'fpe')}} for p in range(len(sel.ics['aic']))]
chosen = {ic: int(v) for ic, v in sel.selected_orders.items()}
# lag rule: the shortest information-criterion choice whose residuals pass the Portmanteau test (5%); else AIC
LAG_RULE = 'AIC'
p = max(1, chosen['aic'])
for cand, ic in sorted({(max(1, chosen[ic]), ic) for ic in ('bic', 'hqic', 'aic')}):
    if VAR(Y).fit(cand).test_whiteness(nlags=24).pvalue > 0.05:
        p, LAG_RULE = cand, ic.upper()
        break
vr = VAR(Y).fit(p)
comp_m = np.zeros((4 * p, 4 * p))
comp_m[:4, :] = np.hstack(list(vr.coefs))
if p > 1:
    comp_m[4:, :-4] = np.eye(4 * (p - 1))
mods = np.sort(np.abs(np.linalg.eigvals(comp_m)))[::-1]
wt = vr.test_whiteness(nlags=24)
nt = vr.test_normality()
gr = []
for i in range(4):
    for j in range(4):
        if i != j:
            t = vr.test_causality(j, [i], kind='f')
            gr.append({'cause': i, 'effect': j, 'f': r4(t.test_statistic, 4), 'p': r4(t.pvalue, 4), 'df': [int(t.df[0]), int(t.df[1])]})
irf = vr.irf(24)
lo, hi = irf.errband_mc(orth=True, repl=500, signif=0.10, rng=np.random.RandomState(7))
oi = irf.orth_irfs
IRF = {'h': 24, 'mean': [[rl(oi[:, r, s], 4) for s in range(4)] for r in range(4)],
       'lo': [[rl(lo[:, r, s], 4) for s in range(4)] for r in range(4)], 'hi': [[rl(hi[:, r, s], 4) for s in range(4)] for r in range(4)]}
fe = vr.fevd(25).decomp  # (var, horizon, shock)
FEVD = [[rl(fe[v, :, s] * 100, 4) for s in range(4)] for v in range(4)]
fc_mean, fc_lo95, fc_hi95 = vr.forecast_interval(Y[-p:], steps=12, alpha=0.05)
_, fc_lo80, fc_hi80 = vr.forecast_interval(Y[-p:], steps=12, alpha=0.20)
# VAR backtest for inflation (fixed lag, rolling origin) and ensemble with ARIMA
vb = {h: [] for h in H}
ab = {h: [] for h in H}
rw = {h: [] for h in H}
yi = Y[:, 0]
T = len(Y)
a_order, a_so, a_tr = AR['infl']['order'], AR['infl']['sorder'], AR['infl']['trend']
for o in range(T - 24 - 12, T - 1):
    try:
        vf = VAR(Y[:o + 1]).fit(p).forecast(Y[o + 1 - p:o + 1], 12)[:, 0]
        af = np.asarray(fit(yi[:o + 1], tuple(a_order), tuple(a_so), a_tr).get_forecast(12).predicted_mean)
    except Exception:
        continue
    for h in H:
        if o + h < T:
            vb[h].append(yi[o + h] - vf[h - 1])
            ab[h].append(yi[o + h] - af[h - 1])
            rw[h].append(yi[o + h] - yi[o])
ENS = []
for h in H:
    v, a, w = np.asarray(vb[h]), np.asarray(ab[h]), np.asarray(rw[h])
    if len(v) < 6:
        continue
    mv, ma = np.mean(v ** 2), np.mean(a ** 2)
    wv = (1 / mv) / (1 / mv + 1 / ma)
    e = wv * v + (1 - wv) * a
    dmv, dmp = dm_test(e, w, h)
    ENS.append({'h': h, 'n': len(v), 'rmse_var': r4(math.sqrt(mv), 4), 'rmse_arima': r4(math.sqrt(ma), 4), 'w_var': r4(wv, 3),
                'rmse_ens': r4(math.sqrt(np.mean(e ** 2)), 4), 'rmse_rw': r4(math.sqrt(np.mean(w ** 2)), 4),
                'q10': r4(np.percentile(e, 10), 4), 'q90': r4(np.percentile(e, 90), 4), 'q025': r4(np.percentile(e, 2.5), 4), 'q975': r4(np.percentile(e, 97.5), 4),
                'dm_vs_rw': dmv, 'dm_p': dmp})
# combined inflation path (interpolate weights across horizons)
wh = {row['h']: row['w_var'] for row in ENS}
def w_at(h):
    hs = sorted(wh)
    if h <= hs[0]:
        return wh[hs[0]]
    for a_, b_ in zip(hs, hs[1:]):
        if a_ <= h <= b_:
            return wh[a_] + (wh[b_] - wh[a_]) * (h - a_) / (b_ - a_)
    return wh[hs[-1]]
ens_path = []
sd_h = {row['h']: row['rmse_ens'] for row in ENS}
def sd_at(h):
    hs = sorted(sd_h)
    if h <= hs[0]:
        return sd_h[hs[0]]
    for a_, b_ in zip(hs, hs[1:]):
        if a_ <= h <= b_:
            return sd_h[a_] + (sd_h[b_] - sd_h[a_]) * (h - a_) / (b_ - a_)
    return sd_h[hs[-1]]
for h in range(1, 13):
    w_ = w_at(h)
    m_ = w_ * fc_mean[h - 1, 0] + (1 - w_) * AR['infl']['fc'][h - 1]
    s_ = sd_at(h)
    ens_path.append({'h': h, 'mean': r4(m_, 4), 'sd': r4(s_, 4), 'lo80': r4(m_ - 1.2816 * s_, 4), 'hi80': r4(m_ + 1.2816 * s_, 4), 'lo95': r4(m_ - 1.96 * s_, 4), 'hi95': r4(m_ + 1.96 * s_, 4),
                     'p_gt8': r4(1 - stats.norm.cdf(8, m_, s_), 3), 'p_lt6': r4(stats.norm.cdf(6, m_, s_), 3), 'p_gt10': r4(1 - stats.norm.cdf(10, m_, s_), 3)})

# ------------------------------------------------------------------ robustness, placebo, rolling
print('Robustness and placebo…')
def peak(arr):
    a = np.asarray(arr)
    i = int(np.argmax(np.abs(a)))
    return r4(a[i], 4), i
ROB_LAG = []
for pp in sorted(set([1, 2, 4, 6, p, 12])):
    try:
        rr = VAR(Y).fit(pp)
        ii = rr.irf(24).orth_irfs
        g_ = rr.test_causality(0, [3], kind='f').pvalue
        g2 = rr.test_causality(0, [1], kind='f').pvalue
        pk, at = peak(ii[:, 0, 3])
        pk2, at2 = peak(ii[:, 0, 2])
        ROB_LAG.append({'p': pp, 'aic': r4(rr.aic, 6), 'stable': bool(rr.is_stable()), 'irf_xr_peak': pk, 'irf_xr_at': at, 'irf_call_peak': pk2, 'irf_call_at': at2,
                        'g_xr_p': r4(g_, 4), 'g_m2_p': r4(g2, 4)})
    except Exception:
        pass
ORDERS = [[0, 1, 2, 3], [3, 1, 2, 0], [3, 0, 1, 2], [2, 1, 0, 3]]
ROB_ORD = []
for od in ORDERS:
    rr = VAR(Y[:, od]).fit(p)
    ii = rr.irf(24).orth_irfs
    ip = od.index(0)
    pk, at = peak(ii[:, ip, od.index(3)])
    pk2, at2 = peak(ii[:, ip, od.index(2)])
    pk3, at3 = peak(ii[:, ip, od.index(1)])
    ROB_ORD.append({'order': [VLAB[i] for i in od], 'xr_peak': pk, 'xr_at': at, 'call_peak': pk2, 'call_at': at2, 'm2_peak': pk3, 'm2_at': at3})
split = mk(2020, 1)
ROB_SUB = []
for lab_, mask in [('2010–2019', [t < split for t in blk]), ('2020–' + mlab(blk[-1])[:4], [t >= split for t in blk])]:
    Ys = Y[np.array(mask)]
    try:
        ps = int(max(1, min(VAR(Ys).select_order(6).selected_orders['aic'], 4)))
        rr = VAR(Ys).fit(ps)
        x = Ys[:, 0]
        b1 = sm.OLS(x[1:], sm.add_constant(x[:-1])).fit()
        ROB_SUB.append({'sample': lab_, 'n': len(Ys), 'p': ps, 'g_xr_p': r4(rr.test_causality(0, [3], kind='f').pvalue, 4),
                        'g_m2_p': r4(rr.test_causality(0, [1], kind='f').pvalue, 4), 'g_call_p': r4(rr.test_causality(0, [2], kind='f').pvalue, 4),
                        'ar1': r4(b1.params[1], 4), 'ar1_se': r4(b1.bse[1], 3), 'mean_infl': r4(x.mean(), 4)})
    except Exception as e:
        print('  subsample failed', lab_, e)
roll = []
x = Y[:, 0]
for i in range(60, len(x)):
    seg = x[i - 60:i]
    b = sm.OLS(seg[1:], sm.add_constant(seg[:-1])).fit()
    rc = np.corrcoef(Y[i - 36:i, 0], Y[i - 36:i, 3])[0, 1]
    roll.append([mlab(blk[i - 1]), r4(b.params[1], 4), r4(b.params[1] - 1.96 * b.bse[1], 4), r4(b.params[1] + 1.96 * b.bse[1], 4), r4(rc, 4)])
# placebo 1: circular shifts of the exchange-rate series (keeps its own dynamics, breaks timing)
biv = VAR(Y[:, [0, 3]]).fit(p)
f_act = biv.test_causality(0, [1], kind='f').test_statistic
shifts = RNG.randint(24, len(Y) - 24, size=500)
f_pl = []
for s_ in shifts:
    z = np.column_stack([Y[:, 0], np.roll(Y[:, 3], s_)])
    try:
        f_pl.append(VAR(z).fit(p).test_causality(0, [1], kind='f').test_statistic)
    except Exception:
        pass
f_pl = np.asarray(f_pl)
# placebo 2: fake random-walk drivers should be "significant" only ~5% of the time
fake = []
for _ in range(300):
    z = np.column_stack([Y[:, 0], np.cumsum(RNG.randn(len(Y)))])
    try:
        fake.append(VAR(z).fit(p).test_causality(0, [1], kind='f').pvalue)
    except Exception:
        pass
fake = np.asarray(fake)
hist_pl, edges = np.histogram(f_pl, bins=30)
PLACEBO = {'f_actual': r4(f_act, 4), 'p_actual': r4(biv.test_causality(0, [1], kind='f').pvalue, 4), 'n_shift': int(len(f_pl)),
           'p_placebo': r4(float(np.mean(f_pl >= f_act)), 4), 'f_q95': r4(np.percentile(f_pl, 95), 4),
           'hist': {'edges': rl(edges, 4), 'counts': [int(c) for c in hist_pl]},
           'fake_n': int(len(fake)), 'fake_rate05': r4(float(np.mean(fake < 0.05)), 3), 'fake_rate10': r4(float(np.mean(fake < 0.10)), 3),
           'fake_q05': r4(float(np.percentile(fake, 5)), 4)}

# ------------------------------------------------------------------ calibrated New Keynesian DSGE (Galí 2015, ch. 3)
beta, sigma, phi, alpha_, eps, theta = 0.99, 1.0, 5.0, 0.25, 9.0, 0.75
lam = (1 - theta) * (1 - beta * theta) / theta * (1 - alpha_) / (1 - alpha_ + alpha_ * eps)
kappa = lam * (sigma + (phi + alpha_) / (1 - alpha_))
phi_pi, phi_y = 1.5, 0.5 / 4
DS = {'params': [
    {'sym': 'β', 'name': 'Discount factor', 'v': beta, 'src': 'Galí (2015), ch. 3'},
    {'sym': 'σ', 'name': 'Inverse elasticity of intertemporal substitution', 'v': sigma, 'src': 'Galí (2015)'},
    {'sym': 'φ', 'name': 'Inverse Frisch elasticity of labour supply', 'v': phi, 'src': 'Galí (2015)'},
    {'sym': 'α', 'name': 'Labour share complement (1 − α = labour elasticity)', 'v': alpha_, 'src': 'Galí (2015)'},
    {'sym': 'ε', 'name': 'Elasticity of substitution between goods', 'v': eps, 'src': 'Galí (2015)'},
    {'sym': 'θ', 'name': 'Calvo price stickiness (share of firms not resetting)', 'v': theta, 'src': 'Galí (2015)'},
    {'sym': 'κ', 'name': 'Slope of the Phillips curve (derived)', 'v': r4(kappa, 4), 'src': 'Calculated'},
    {'sym': 'φπ', 'name': 'Taylor-rule response to inflation', 'v': phi_pi, 'src': 'Taylor (1993)'},
    {'sym': 'φy', 'name': 'Taylor-rule response to the output gap (quarterly)', 'v': phi_y, 'src': 'Taylor (1993)'}],
    'determinacy': r4(kappa * (phi_pi - 1) + (1 - beta) * phi_y, 4), 'irf': {}}
for shock, rho, unit in [('Monetary policy', 0.5, (0, 0, 0.25)), ('Demand', 0.5, (0.5, 0, 0)), ('Cost-push', 0.5, (0, 0.25, 0))]:
    Mx = np.array([[1 - rho, -rho / sigma, 1 / sigma], [-kappa, 1 - beta * rho, 0], [-phi_y, -phi_pi, 1]])
    a_, b_, c_ = np.linalg.solve(Mx, np.array(unit))
    hs = np.arange(0, 17)
    DS['irf'][shock] = {'rho': rho, 'x': rl(a_ * rho ** hs, 4), 'pi': rl(4 * b_ * rho ** hs, 4), 'i': rl(4 * c_ * rho ** hs, 4)}

# ------------------------------------------------------------------ ridgelines ("mountain maps")
def kde_rows(groups, lo_, hi_, n=90):
    xs = np.linspace(lo_, hi_, n)
    rows = []
    for lab_, vals in groups:
        vals = np.asarray([v for v in vals if v is not None and math.isfinite(v)])
        if len(vals) < 6 or np.std(vals) == 0:
            continue
        dens = stats.gaussian_kde(np.clip(vals, lo_, hi_))(xs)
        rows.append({'label': lab_, 'n': int(len(vals)), 'median': r4(np.median(vals), 4), 'y': rl(dens, 4)})
    return {'x': rl(xs, 4), 'rows': rows}
fy_groups = {}
for k, v in C['infl']['data'].items():
    y_, m_ = k // 12, k % 12 + 1
    fy = y_ + 1 if m_ >= 7 else y_
    fy_groups.setdefault(fy, []).append(v)
RIDGE_BD = kde_rows([(f'FY{fy % 100:02d}', fy_groups[fy]) for fy in sorted(fy_groups) if len(fy_groups[fy]) >= 9], 0, 14)

# ------------------------------------------------------------------ world analysis (World Bank WDI)
print('World analysis…')
W = json.load(open(A.world))
WS = W['s']
ECON = {e[0]: e for e in W['econ']}
def wser(key, code):
    s = WS.get(key, {}).get(code)
    if not s:
        return {}
    y0_, st = s
    return {y0_ + i: float(v) for i, v in enumerate(st.split(',')) if v != ''}
countries = [e for e in W['econ'] if not e[6]]
# heterogeneity: inflation persistence and volatility by region, Kruskal-Wallis
het = []
for e in countries:
    inf = wser('inflation', e[0])
    g = wser('gdp_growth', e[0])
    yrs = [y_ for y_ in range(2000, 2026) if y_ in inf]
    if len(yrs) < 18 or max(inf[y_] for y_ in yrs) > 100:
        continue
    xx = np.array([inf[y_] for y_ in yrs])
    b = sm.OLS(xx[1:], sm.add_constant(xx[:-1])).fit()
    gv = [g[y_] for y_ in range(2000, 2026) if y_ in g]
    het.append({'code': e[0], 'name': e[1], 'region': e[3], 'pers': float(b.params[1]), 'mean': float(xx.mean()), 'gsd': float(np.std(gv, ddof=1)) if len(gv) > 5 else None})
REG = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']
def box(vals):
    v = np.sort(np.asarray(vals))
    q1_, md, q3_ = np.percentile(v, [25, 50, 75])
    iqr = q3_ - q1_
    lo_w, hi_w = v[v >= q1_ - 1.5 * iqr].min(), v[v <= q3_ + 1.5 * iqr].max()
    return [r4(lo_w, 4), r4(q1_, 4), r4(md, 4), r4(q3_, 4), r4(hi_w, 4)]
HET = {'measures': []}
for meas, lab_ in [('pers', 'Inflation persistence (AR(1) coefficient, 2000–2025)'), ('mean', 'Average inflation, 2000–2025 (%)'), ('gsd', 'Volatility of real GDP growth (SD, pp)')]:
    groups = [[h[meas] for h in het if h['region'] == rg and h[meas] is not None] for rg in REG]
    ok = [g for g in groups if len(g) >= 3]
    kw = stats.kruskal(*ok)
    rows = []
    for rg, g in zip(REG, groups):
        if len(g) >= 3:
            rows.append({'region': rg, 'n': len(g), 'box': box(g), 'mean': r4(np.mean(g), 4)})
    bgd = next((h[meas] for h in het if h['code'] == 'BGD'), None)
    HET['measures'].append({'key': meas, 'label': lab_, 'rows': rows, 'kw_h': r4(kw.statistic, 4), 'kw_p': r4(kw.pvalue, 4), 'kw_df': len(ok) - 1, 'bgd': r4(bgd, 4)})
# convergence: beta (unconditional and conditional, HC1 robust), sigma
cv = []
for e in countries:
    g = wser('gdp_growth', e[0]); pg = wser('pop_growth', e[0]); ppp = wser('gdp_pc_ppp', e[0]); inv = wser('investment', e[0])
    yrs = [y_ for y_ in range(2000, 2025) if y_ in g and y_ in pg]
    if len(yrs) < 20 or 2000 not in ppp:
        continue
    invs = [inv[y_] for y_ in range(2000, 2025) if y_ in inv]
    cv.append({'code': e[0], 'name': e[1], 'region': e[3], 'g': float(np.mean([g[y_] - pg[y_] for y_ in yrs])), 'y0': math.log(ppp[2000]),
               'inv': float(np.mean(invs)) if len(invs) >= 15 else None, 'n': float(np.mean([pg[y_] for y_ in yrs]))})
yv = np.array([c['g'] for c in cv]); x0 = np.array([c['y0'] for c in cv])
m1 = sm.OLS(yv, sm.add_constant(x0)).fit(cov_type='HC1')
cc = [c for c in cv if c['inv'] and c['inv'] > 0 and c['n'] / 100 + 0.05 > 0]
X2 = np.column_stack([[c['y0'] for c in cc], [math.log(c['inv']) for c in cc], [math.log(c['n'] / 100 + 0.05) for c in cc]])
m2_ = sm.OLS(np.array([c['g'] for c in cc]), sm.add_constant(X2)).fit(cov_type='HC1')
def regtab(m, names):
    return [{'term': n, 'coef': r4(b, 4), 'se': r4(s, 3), 'p': r4(pv, 4)} for n, b, s, pv in zip(names, m.params, m.bse, m.pvalues)]
xs_ = np.linspace(x0.min(), x0.max(), 40)
pr = m1.get_prediction(sm.add_constant(xs_)).summary_frame(alpha=0.05)
CONV = {'pts': [[r4(c['y0'], 4), r4(c['g'], 4), c['code'], c['name'], c['region']] for c in cv],
        'm1': {'rows': regtab(m1, ['Constant', 'ln GDP per person, 2000 (PPP)']), 'n': int(m1.nobs), 'r2': r4(m1.rsquared, 3), 'f_p': r4(m1.f_pvalue, 4)},
        'm2': {'rows': regtab(m2_, ['Constant', 'ln GDP per person, 2000 (PPP)', 'ln investment share', 'ln (population growth + 0.05)']), 'n': int(m2_.nobs), 'r2': r4(m2_.rsquared, 3), 'f_p': r4(m2_.f_pvalue, 4)},
        'line': {'x': rl(xs_, 4), 'y': rl(np.asarray(pr['mean']), 4), 'lo': rl(np.asarray(pr['mean_ci_lower']), 4), 'hi': rl(np.asarray(pr['mean_ci_upper']), 4)},
        'half_life': r4(math.log(2) / (-m1.params[1] / 100) if m1.params[1] < 0 else None, 3)}
sig = []
for y_ in range(1990, 2025):
    vals = [math.log(v) for e in countries for v in [wser('gdp_pc_ppp', e[0]).get(y_)] if v]
    if len(vals) > 100:
        sig.append([y_, r4(np.std(vals, ddof=1), 4), len(vals)])
CONV['sigma'] = sig
# world ridgeline of inflation across countries
RIDGE_W = kde_rows([(str(y_), [wser('inflation', e[0]).get(y_) for e in countries]) for y_ in [2000, 2005, 2008, 2010, 2015, 2019, 2020, 2021, 2022, 2023, 2024, 2025]], -5, 25)
# cross-country Spearman correlations (2023 cross-section)
CK = [('gdp_growth', 'Growth'), ('inflation', 'Inflation'), ('unemployment', 'Unemployment'), ('current_account', 'Current account'),
      ('private_credit', 'Private credit'), ('remittances', 'Remittances'), ('exports', 'Exports'), ('gdp_pc_ppp', 'GDP per person (PPP)')]
YR = 2023
tbl = {k: {e[0]: wser(k, e[0]).get(YR) for e in countries} for k, _ in CK}
CORR = {'labels': [l for _, l in CK], 'year': YR, 'rho': [], 'p': [], 'n': []}
for k1, _ in CK:
    rr_, pp_, nn_ = [], [], []
    for k2, _ in CK:
        pairs = [(tbl[k1][c], tbl[k2][c]) for c in tbl[k1] if tbl[k1][c] is not None and tbl[k2].get(c) is not None]
        if len(pairs) > 20:
            rho, pv = stats.spearmanr([a for a, _ in pairs], [b for _, b in pairs])
            rr_.append(r4(rho, 3)); pp_.append(r4(pv, 3)); nn_.append(len(pairs))
        else:
            rr_.append(None); pp_.append(None); nn_.append(len(pairs))
    CORR['rho'].append(rr_); CORR['p'].append(pp_); CORR['n'].append(nn_)
# cross-country ARMA projections (annual), 3 years ahead
FCW = []
for code in ['WLD', 'BGD', 'IND', 'PAK', 'LKA', 'NPL', 'CHN', 'IDN', 'VNM', 'USA', 'JPN', 'DEU', 'GBR', 'BRA', 'MEX', 'TUR', 'SAU', 'EGY', 'NGA', 'ZAF']:
    if code not in ECON:
        continue
    row = {'code': code, 'name': ECON[code][1]}
    for key in ('gdp_growth', 'inflation'):
        d = wser(key, code)
        yrs = [y_ for y_ in range(1995, 2026) if y_ in d]
        if len(yrs) < 20 or yrs[-1] - yrs[0] + 1 != len(yrs):
            continue
        yy = np.array([d[y_] for y_ in yrs])
        best = None
        for p_ in range(3):
            for q_ in range(3):
                try:
                    r_ = SARIMAX(yy, order=(p_, 0, q_), trend='c').fit(disp=False, maxiter=200)
                    if best is None or r_.aic < best[0]:
                        best = (r_.aic, (p_, 0, q_), r_)
                except Exception:
                    pass
        if not best:
            continue
        f = best[2].get_forecast(3)
        ci80 = np.asarray(f.conf_int(alpha=0.2)); ci95 = np.asarray(f.conf_int(alpha=0.05))
        e1, e0 = [], []
        for o in range(len(yy) - 8, len(yy)):
            try:
                pf = SARIMAX(yy[:o], order=best[1], trend='c').fit(disp=False, maxiter=200).forecast(1)[0]
                e1.append(yy[o] - pf); e0.append(yy[o] - yy[o - 1])
            except Exception:
                pass
        row[key] = {'last': [yrs[-1], r4(yy[-1], 4)], 'spec': f'ARMA({best[1][0]},{best[1][2]})', 'fc': rl(np.asarray(f.predicted_mean), 4),
                    'lo80': rl(ci80[:, 0], 4), 'hi80': rl(ci80[:, 1], 4), 'lo95': rl(ci95[:, 0], 4), 'hi95': rl(ci95[:, 1], 4),
                    'rmse': r4(math.sqrt(np.mean(np.square(e1))), 3) if e1 else None, 'rmse_naive': r4(math.sqrt(np.mean(np.square(e0))), 3) if e0 else None}
    FCW.append(row)

# ------------------------------------------------------------------ assemble
DESC, UR = [], []
for key in ['infl', 'food', 'nonfood', 'xr_dep', 'res', 'remit_g', 'exp_g', 'm2', 'pcredit', 'call', 'lend', 'real_lend']:
    _, y_ = window(key, mk(2010, 1))
    dd = describe(y_)
    if dd:
        DESC.append({'key': key, 'label': C[key]['label'], 'unit': C[key]['unit'], 'sample': [mlab(min(C[key]['data'])), mlab(max(C[key]['data']))], **dd})
        u = unitroot(y_)
        UR.append({'key': key, 'label': C[key]['label'], **u})

series_out = {}
for k, s in C.items():
    series_out[k] = {kk: vv for kk, vv in s.items() if kk != 'data'}
    series_out[k]['series'] = pack(s['data'], s['f'])
    series_out[k]['reading'] = reading(k)
OUT = {
    'meta': {'estimated': datetime.date.today().isoformat(), 'vintage': 'Bangladesh Bank, Monthly Economic Trends, September 2026 edition, and earlier editions; NSDP (IMF e-GDDS) tables',
             'n_catalog': len(cat), 'chunks': CH},
    'series': series_out, 'cpi_components': comp, 'mcap_sectors': sectors, 'saarc': peers,
    'desc': DESC, 'unitroot': UR, 'arima': AR,
    'var': {'vars': VLAB, 'keys': VKEYS, 'sample': [mlab(blk[0]), mlab(blk[-1])], 'nobs': int(vr.nobs), 'p': p, 'lag_rule': LAG_RULE, 'filled': N_FILLED, 'chosen': chosen, 'lagtab': lagtab,
            'stable': bool(vr.is_stable()), 'moduli': rl(mods[:8], 4), 'white': {'stat': r4(wt.test_statistic, 5), 'p': r4(wt.pvalue, 4), 'df': int(wt.df)},
            'normal': {'stat': r4(nt.test_statistic, 5), 'p': r4(nt.pvalue, 4)}, 'granger': gr, 'irf': IRF, 'fevd': FEVD,
            'fc': {'start': mlab(blk[-1] + 1), 'mean': [rl(fc_mean[:, i], 4) for i in range(4)], 'lo95': [rl(fc_lo95[:, i], 4) for i in range(4)],
                   'hi95': [rl(fc_hi95[:, i], 4) for i in range(4)], 'lo80': [rl(fc_lo80[:, i], 4) for i in range(4)], 'hi80': [rl(fc_hi80[:, i], 4) for i in range(4)]},
            'aic': r4(vr.aic, 6), 'bic': r4(vr.bic, 6)},
    'ensemble': {'backtest': ENS, 'path': ens_path, 'start': AR['infl']['fc_start']},
    'robust': {'lags': ROB_LAG, 'orders': ROB_ORD, 'subsamples': ROB_SUB, 'rolling': roll},
    'placebo': PLACEBO, 'dsge': DS, 'ridge_bd': RIDGE_BD,
    'world': {'het': HET, 'conv': CONV, 'ridge': RIDGE_W, 'corr': CORR, 'fc': FCW},
}
# keep earlier Bayesian DSGE results when this run did not produce new ones
try:
    _old = json.loads((ROOT / 'bd_models.json').read_text(encoding='utf-8')) if (ROOT / 'bd_models.json').exists() else {}
    if isinstance(OUT.get('dsge'), dict) and 'bayes' not in OUT['dsge'] and 'bayes' in (_old.get('dsge') or {}): OUT['dsge']['bayes'] = _old['dsge']['bayes']
except Exception as _e:
    print('could not carry over Bayesian results:', _e)
js = json.dumps(OUT, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
Path(A.out).write_text(js, encoding='utf-8')
print('wrote', A.out, len(js), 'bytes;', len(series_out), 'series;', len(AR), 'ARIMA;', 'VAR p =', p, 'sample', OUT['var']['sample'])
