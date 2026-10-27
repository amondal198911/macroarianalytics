#!/usr/bin/env python3
"""Course page (/course/) for macroarianalytics.com.

Computes every worked example from the site's own data, so the outputs shown to learners are real:
  - Python and Excel/Python/SQL examples (pandas and SQLite, checked against each other)
  - an API/webhook example (HMAC signature)
  - a hybrid search index (BM25 terms + LSA vectors) over the 6,910-series data catalogue
  - data and an evaluation set for the course's rule-based agent
Writes public/course/index.html from the course.html template. Run by build_page.py, or on its own.
"""
import base64, hashlib, hmac, json, math, re, sqlite3
from pathlib import Path
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
TPL = ROOT / 'course.html'
M = json.loads((ROOT / 'bd_models.json').read_text(encoding='utf-8'))
CAT = json.loads((ROOT / 'bd_catalog.json').read_text(encoding='utf-8'))


def ser(key):
    s = (M.get('series', {}).get(key) or {}).get('series') or {}
    return {s['k0'] + i: float(v) for i, v in enumerate(s.get('v') or []) if v is not None} if s else {}


def mlab(k): return f'{k // 12}-{k % 12 + 1:02d}'
def fy(k): return f'FY{k // 12 + (1 if k % 12 >= 6 else 0)}'


OUT = {}
# ---------------------------------------------------------------- Module 1: Python
inf = ser('infl')
by = {}
for k, v in inf.items():
    by.setdefault(fy(k), []).append(v)
full = {f: round(sum(v) / len(v), 2) for f, v in by.items() if len(v) == 12}
peak = max(inf, key=inf.get)
OUT['py'] = {'fy': list(full.items())[-5:], 'peak': [mlab(peak), round(inf[peak], 2)], 'n': len(inf), 'first': mlab(min(inf)), 'last': mlab(max(inf))}

# ---------------------------------------------------------------- Module 2: Excel vs Python vs SQL (real data, checked)
cols = {'inflation': 'infl', 'food': 'food', 'xr': 'xr', 'remit': 'remit', 'call': 'call', 'iip': 'iip'}
S = {c: ser(k) for c, k in cols.items()}
last = max(S['inflation'])
ks = list(range(last - 23, last + 1))
df = pd.DataFrame({'month': [mlab(k) for k in ks], 'fy': [fy(k) for k in ks], **{c: [S[c].get(k) for k in ks] for c in ['inflation', 'food', 'xr', 'remit', 'iip']}})
con = sqlite3.connect(':memory:')
df.to_sql('macro', con, index=False)
rates = pd.DataFrame({'month': [mlab(k) for k in ks if k in S['call']], 'call': [S['call'][k] for k in ks if k in S['call']]})
rates.to_sql('rates', con, index=False)
q = lambda sql: pd.read_sql_query(sql, con)
t1p = df[df['inflation'] > 9][['month', 'inflation']]
t1s = q('SELECT month, inflation FROM macro WHERE inflation > 9')
t2p = df.sort_values('remit', ascending=False)[['month', 'remit']].head(5)
t2s = q('SELECT month, remit FROM macro ORDER BY remit DESC LIMIT 5')
t3p = df.groupby('fy').agg(avg_inflation=('inflation', 'mean'), total_remit=('remit', 'sum'), months=('month', 'count')).reset_index()
t3s = q('SELECT fy, AVG(inflation) AS avg_inflation, SUM(remit) AS total_remit, COUNT(month) AS months FROM macro GROUP BY fy')
miss = {c: int(df[c].isna().sum()) for c in ['inflation', 'food', 'xr', 'remit', 'iip']}
t5p = (df['remit'] * df['xr'] / 10).round(1)
t5s = q('SELECT ROUND(remit * xr / 10, 1) AS remit_tk_crore FROM macro')
t6p = df[['month', 'inflation']].merge(rates, on='month', how='left')
t6s = q('SELECT m.month, m.inflation, r.call FROM macro m LEFT JOIN rates r ON m.month = r.month')
checks = {'filter': t1p.reset_index(drop=True).equals(t1s), 'sort': list(t2p['month']) == list(t2s['month']),
          'group': np.allclose(t3p['avg_inflation'], t3s['avg_inflation']) and np.allclose(t3p['total_remit'], t3s['total_remit']),
          'calc': np.allclose(t5p.fillna(-1), t5s['remit_tk_crore'].fillna(-1)), 'join': len(t6p) == len(t6s) == len(df)}
assert all(checks.values()), checks
rnd = lambda x, d=2: None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), d)
OUT['tools'] = {
    'range': [df['month'].iloc[0], df['month'].iloc[-1]], 'rows': len(df), 'checks': checks,
    'sample': [[r.month, r.fy, rnd(r.inflation), rnd(r.food), rnd(r.xr), rnd(r.remit, 1), rnd(r.iip)] for r in df.tail(3).itertuples()],
    'filter': {'n': len(t1p), 'rows': [[a, rnd(b)] for a, b in t1p.head(4).values]},
    'sort': [[a, rnd(b, 1)] for a, b in t2p.values],
    'group': [[r.fy, rnd(r.avg_inflation), rnd(r.total_remit, 1), int(r.months)] for r in t3p.itertuples()],
    'missing': miss, 'calc': [[m_, rnd(r_, 1), rnd(x_), rnd(c_, 1)] for m_, r_, x_, c_ in zip(df['month'].tail(3), df['remit'].tail(3), df['xr'].tail(3), t5p.tail(3))],
    'join': {'n': len(t6p), 'matched': int(t6p['call'].notna().sum()), 'rows': [[a, rnd(b), rnd(c)] for a, b, c in t6p.tail(3).values]}}

# ---------------------------------------------------------------- Module 2 (Python II): a machine-learning forecasting experiment
# NumPy only. Target: next month's headline inflation. Rolling-origin (expanding window) evaluation, never shuffled.
fd = {k: ser(k) for k in ['infl', 'food', 'xr_dep', 'm2', 'call']}
rows = []
for k in sorted(fd['infl']):
    if (k - 1) in fd['infl'] and (k + 1) in fd['infl'] and all(k in fd[n] for n in fd):
        rows.append((k, [fd['infl'][k], fd['infl'][k - 1], fd['food'][k], fd['xr_dep'][k], fd['m2'][k], fd['call'][k]], fd['infl'][k + 1]))
FEAT = ['inflation, this month', 'inflation, last month', 'food inflation', 'Taka depreciation', 'broad money growth', 'call money rate']
NT = 36
Xa = np.array([r_[1] for r_ in rows]); ya = np.array([r_[2] for r_ in rows]); j0 = len(rows) - NT


def ridge_fit(Xt, yt, lam):
    mu_, sd_ = Xt.mean(0), Xt.std(0) + 1e-9
    Z = (Xt - mu_) / sd_
    b = np.linalg.solve(Z.T @ Z + lam * np.eye(Z.shape[1]), Z.T @ (yt - yt.mean()))
    return lambda Xn: yt.mean() + ((Xn - mu_) / sd_) @ b


def ols_fit(Xt, yt):
    A = np.c_[np.ones(len(Xt)), Xt]
    b = np.linalg.lstsq(A, yt, rcond=None)[0]
    return lambda Xn: np.c_[np.ones(len(Xn)), Xn] @ b


def choose_lam(Xt, yt):
    best = None
    for lam in [0.1, 1.0, 10.0, 100.0]:
        f = ridge_fit(Xt[:-24], yt[:-24], lam)
        e = float(np.mean((f(Xt[-24:]) - yt[-24:]) ** 2))
        if best is None or e < best[0]:
            best = (e, lam)
    return best[1]


def logit_fit(Xt, yt, lam=1.0, it=50):
    mu_, sd_ = Xt.mean(0), Xt.std(0) + 1e-9
    Z = np.c_[np.ones(len(Xt)), (Xt - mu_) / sd_]
    b = np.zeros(Z.shape[1])
    P = lam * np.eye(Z.shape[1]); P[0, 0] = 0
    for _ in range(it):                                   # Newton-Raphson with a small ridge penalty
        p_ = 1 / (1 + np.exp(-Z @ b))
        g = Z.T @ (p_ - yt) + P @ b
        H = Z.T @ (Z * (p_ * (1 - p_))[:, None]) + P
        b -= np.linalg.solve(H, g)
    return lambda Xn: 1 / (1 + np.exp(-np.c_[np.ones(len(Xn)), (Xn - mu_) / sd_] @ b))


E = {'Naive (no change)': [], 'AR: inflation only (OLS)': [], 'Linear regression, all features (OLS)': [], 'Ridge regression (penalty chosen by inner validation)': []}
cls, base, truth, lams = [], [], [], []
for j in range(j0, len(rows)):
    Xt, yt, xn, yn = Xa[:j], ya[:j], Xa[j:j + 1], ya[j]
    E['Naive (no change)'].append(yn - xn[0, 0])
    E['AR: inflation only (OLS)'].append(yn - float(ols_fit(Xt[:, :1], yt)(xn[:, :1])[0]))
    E['Linear regression, all features (OLS)'].append(yn - float(ols_fit(Xt, yt)(xn)[0]))
    lam = choose_lam(Xt, yt); lams.append(lam)
    E['Ridge regression (penalty chosen by inner validation)'].append(yn - float(ridge_fit(Xt, yt, lam)(xn)[0]))
    up = (yt > Xt[:, 0]).astype(float)
    cls.append(int(logit_fit(Xt, up)(xn)[0] > 0.5)); base.append(int(up.mean() > 0.5)); truth.append(int(yn > xn[0, 0]))
nv = np.array(E['Naive (no change)'])


def dm(e1, e2):
    d_ = np.array(e1) ** 2 - np.array(e2) ** 2
    st = float(d_.mean() / (d_.std(ddof=1) / math.sqrt(len(d_)))) if d_.std(ddof=1) > 0 else 0.0
    return st, 2 * (1 - 0.5 * (1 + math.erf(abs(st) / math.sqrt(2))))


mrows = []
for name, e in E.items():
    e = np.array(e)
    st, pv = (None, None) if name.startswith('Naive') else dm(e, nv)
    mrows.append([name, round(float(np.sqrt(np.mean(e ** 2))), 3), round(float(np.mean(np.abs(e))), 3), None if st is None else round(st, 2), None if pv is None else round(pv, 3)])
cls, base, truth = np.array(cls), np.array(base), np.array(truth)
OUT['ml'] = {'test': [mlab(rows[j0][0] + 1), mlab(rows[-1][0] + 1)], 'n_test': NT, 'n_train0': j0, 'first_train': mlab(rows[0][0]), 'features': FEAT, 'models': mrows,
             'lam_last': lams[-1], 'acc': round(float((cls == truth).mean()), 3), 'acc_base': round(float((base == truth).mean()), 3),
             'cm': [[int(((cls == 1) & (truth == 1)).sum()), int(((cls == 0) & (truth == 1)).sum())], [int(((cls == 1) & (truth == 0)).sum()), int(((cls == 0) & (truth == 0)).sum())]], 'up_share': round(float(truth.mean()), 3)}

# ---------------------------------------------------------------- Module 3: APIs and webhooks
payload = json.dumps({'event': 'data.updated', 'series': 'infl', 'month': mlab(last)}, separators=(',', ':'))
OUT['hook'] = {'payload': payload, 'secret': 'demo-secret-change-me', 'sig': hmac.new(b'demo-secret-change-me', payload.encode(), hashlib.sha256).hexdigest()}

# ---------------------------------------------------------------- Module 6: hybrid search index over the data catalogue
docs, seen, TABS, PUBS, UNITS = [], set(), {}, {}, {}
idx = lambda d, x: d.setdefault(x, len(d))
for it in CAT:
    code, pub, tab, label = it[0], it[1], it[2], it[3]
    unit, freq = (it[4] if len(it) > 4 else ''), (it[5] if len(it) > 5 else '')
    key = (label, tab)
    if key in seen:
        continue
    seen.add(key)
    docs.append([code, label, tab, pub, unit, freq])
slim = [[d[0], d[1], idx(TABS, d[2]), idx(PUBS, d[3]), idx(UNITS, d[4]), d[5]] for d in docs]
tok = lambda s: [w for w in re.findall(r'[a-z0-9]+', s.lower()) if len(w) > 1 and w not in {'the', 'of', 'and', 'in', 'for', 'to', 'by', 'on', 'at', 'as', 'or'}]
texts = [' '.join([d[1], d[1], d[2], d[3], d[4]]) for d in docs]
# TF-IDF (sublinear tf, smoothed idf, unit-length rows) and a randomized truncated SVD in NumPy only:
# the GitHub build server installs pandas (which brings NumPy) but not scikit-learn or SciPy.
DIM = 40
toks_all = [tok(t) for t in texts]
dfc = {}
for tt in toks_all:
    for w in set(tt):
        dfc[w] = dfc.get(w, 0) + 1
vocab = sorted(w for w, c in dfc.items() if c >= 2)
vi = {w: i for i, w in enumerate(vocab)}
n_docs = len(texts)
idf = np.array([math.log((1 + n_docs) / (1 + dfc[w])) + 1 for w in vocab])
X = np.zeros((n_docs, len(vocab)))
for r_, tt in enumerate(toks_all):
    cnt = {}
    for w in tt:
        if w in vi:
            cnt[w] = cnt.get(w, 0) + 1
    for w, c in cnt.items():
        X[r_, vi[w]] = (1 + math.log(c)) * idf[vi[w]]
nr = np.linalg.norm(X, axis=1, keepdims=True)
nr[nr == 0] = 1
X /= nr
rng = np.random.default_rng(7)
Y, _ = np.linalg.qr(X @ rng.standard_normal((X.shape[1], DIM + 10)))
for _i in range(5):                                  # power iterations (Halko, Martinsson & Tropp, 2011)
    Y, _ = np.linalg.qr(X @ (X.T @ Y))
_, S_, Vt = np.linalg.svd(Y.T @ X, full_matrices=False)
Vt, S_ = Vt[:DIM], S_[:DIM]
D = X @ Vt.T
var_share = float((S_ ** 2).sum() / (X ** 2).sum())
D /= np.linalg.norm(D, axis=1, keepdims=True) + 1e-12
T = Vt.T                                             # term -> concept loadings
sc_d, sc_t = 127 / np.abs(D).max(), 127 / np.abs(T).max()
b64 = lambda a: base64.b64encode(np.clip(np.round(a), -127, 127).astype(np.int8).tobytes()).decode()
OUT['rag'] = {'docs': slim, 'tabs': list(TABS), 'pubs': list(PUBS), 'units': list(UNITS), 'dim': DIM, 'dvec': b64(D * sc_d), 'vocab': vocab, 'idf': [round(float(x), 3) for x in idf], 'tvec': b64(T * sc_t),
              'var': round(var_share, 3)}

# ---------------------------------------------------------------- Module 7: agent data and evaluation set
AG = {'infl': 'Headline inflation', 'food': 'Food inflation', 'nonfood': 'Non-food inflation', 'xr': 'Exchange rate', 'remit': 'Remittances', 'exp': 'Exports', 'imp': 'Imports',
      'call': 'Call money rate', 'm2': 'Broad money growth', 'pcredit': 'Private credit growth', 'res': 'Gross reserves', 'lend': 'Lending rate'}
units = {k: (M['series'].get(k) or {}).get('unit', '') for k in AG}
pack = {}
for k in AG:
    d = ser(k)
    if d:
        k0, k1 = min(d), max(d)
        pack[k] = {'label': AG[k], 'unit': units[k], 'k0': k0, 'v': [round(d[x], 3) if x in d else None for x in range(k0, k1 + 1)]}
fc = {}
for k in ['infl', 'xr', 'remit', 'exp']:
    a = (M.get('arima') or {}).get(k) or {}
    if a.get('fc'):
        fc[k] = {'start': a.get('fc_start'), 'v': [round(x, 3) for x in a['fc']], 'order': a.get('order')}
gdp = ser('gdp_fy')
pack['gdp'] = {'label': 'Real GDP growth', 'unit': '%', 'fy': {f'FY{k}': round(v, 2) for k, v in gdp.items()}}
OUT['agent'] = {'series': pack, 'fc': fc}


def val(k, y, m): return ser(k).get(y * 12 + m - 1)


li = max(ser('infl'))
ly, lm = li // 12, li % 12 + 1
ev = []
ev.append(['What is the latest headline inflation?', round(ser('infl')[li], 2)])
ev.append(['What was inflation in June 2024?', round(val('infl', 2024, 6), 2)])
ev.append(['Food inflation in December 2023?', round(val('food', 2023, 12), 2)])
ev.append(['Average remittances in 2024', round(np.mean([val('remit', 2024, m) for m in range(1, 13)]), 2)])
ev.append(['Highest call money rate since 2020', round(max(v for k, v in ser('call').items() if k >= 2020 * 12), 2)])
ev.append(['Lowest exchange rate in 2022', round(min(val('xr', 2022, m) for m in range(1, 13)), 2)])
ev.append(['What is the latest exchange rate?', round(ser('xr')[max(ser('xr'))], 2)])
ev.append(['Total exports in 2023', round(sum(val('exp', 2023, m) for m in range(1, 13)), 2)])
ev.append(['GDP growth in FY2024', round(gdp[2024], 2)])
ev.append(['Forecast inflation for next year', round(fc['infl']['v'][-1], 2) if 'infl' in fc else None])
ev.append(['Compare exports and imports in March 2025', round(val('exp', 2025, 3) - val('imp', 2025, 3), 2)])
ev.append(['What is my neighbour\u2019s salary?', 'REFUSE'])
OUT['agent']['evals'] = ev
OUT['built'] = mlab(li)

html = TPL.read_text(encoding='utf-8')
data = json.dumps(OUT, separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/')
assert '__LEARN_DATA__' in html
out = ROOT / 'public' / 'course' / 'index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html.replace('__LEARN_DATA__', data), encoding='utf-8')
print('course page written:', out, round(out.stat().st_size / 1024), 'KB;', len(docs), 'catalogue documents; checks', checks)
