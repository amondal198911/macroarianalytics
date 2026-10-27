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

# ---------------------------------------------------------------- SQL lab tables and the capstone starter kit (v3.16)
KIT_FILES = {
'README.md': '''# Bangladesh Macro Copilot: capstone starter kit

Working code for every capstone milestone, built on data from macroarianalytics.com.

| Folder | Milestone | Course module |
|---|---|---|
| `build_db.py`, `queries.sql` | Data layer and analysis queries | 1-3 |
| `app/api.py` | API and signed webhook | 4 |
| `Dockerfile`, `docker-compose.yml` | Container | 5 |
| `rag/search.py` | Hybrid search (BM25 + LSA, rank fusion, rerank) | 7 |
| `agent/agent.py` | Tool-using agent with guardrails and a trace | 6, 8 |
| `evals/` | Evaluation set and runner (evals in CI) | 6, 8 |
| `finetune/` | Fine-tuning data preparation and a QLoRA template | 9, 10 |
| `tests/` | Tests (pytest) | 1 |

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python build_db.py                                     # data/macro.db
sqlite3 data/macro.db < queries.sql                    # or open it in any SQLite tool
python rag/search.py "wage earners remittance"
python agent/agent.py "What is the latest headline inflation?"
python evals/run_evals.py
pytest -q
uvicorn app.api:app --reload                           # http://127.0.0.1:8000/docs
docker compose up --build                              # needs Docker and a .env file (copy .env.example)
```

To let Claude choose the tools instead of the rule-based core, set `ANTHROPIC_API_KEY` and `MODEL`
(a current model name from the Anthropic documentation) and run `python agent/agent.py --llm "..."`.
Never commit keys: keep them in `.env`, which `.dockerignore` and `.gitignore` exclude.

`finetune/train_lora.py` is a template for a GPU machine (for example Google Colab); it is not run here.
Data: Bangladesh Bank and BBS series as published on macroarianalytics.com; check the site for updates.
''',
'requirements.txt': 'fastapi==0.115.0\nuvicorn==0.30.6\nnumpy==1.26.4\nhttpx==0.27.2\npytest==8.3.3\nanthropic==0.39.0\n',
'.gitignore': '.env\n.venv/\n__pycache__/\ndata/macro.db\nfinetune/*.jsonl\n',
'.dockerignore': '.git\n.venv\n__pycache__\n*.pyc\n.env\n',
'.env.example': 'WEBHOOK_SECRET=change-me\nANTHROPIC_API_KEY=\nMODEL=\n',
'Dockerfile': '''FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python build_db.py && useradd --create-home appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
''',
'docker-compose.yml': 'services:\n  api:\n    build: .\n    ports: ["8000:8000"]\n    env_file: .env\n',
'build_db.py': '''"""Build data/macro.db (SQLite) from data/macro_monthly.csv: a wide table and a long table."""
import csv
import sqlite3
from pathlib import Path

HERE = Path(__file__).resolve().parent


def fiscal_year(month):
    y, m = map(int, month.split("-"))
    return f"FY{y + 1 if m >= 7 else y}"


def build(csv_path=HERE / "data" / "macro_monthly.csv", db_path=HERE / "data" / "macro.db"):
    with open(csv_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    cols = [c for c in rows[0] if c != "month"]
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("DROP TABLE IF EXISTS macro")
    cur.execute("DROP TABLE IF EXISTS series")
    cur.execute("CREATE TABLE macro (month TEXT PRIMARY KEY, fy TEXT, " + ", ".join(f'"{c}" REAL' for c in cols) + ")")
    cur.execute("CREATE TABLE series (key TEXT, month TEXT, value REAL, PRIMARY KEY (key, month))")
    marks = ", ".join(["?"] * (len(cols) + 2))
    for r in rows:
        vals = [float(r[c]) if r[c] else None for c in cols]
        cur.execute(f"INSERT INTO macro VALUES ({marks})", [r["month"], fiscal_year(r["month"])] + vals)
        cur.executemany("INSERT INTO series VALUES (?, ?, ?)", [(c, r["month"], v) for c, v in zip(cols, vals) if v is not None])
    con.commit()
    n_macro = cur.execute("SELECT COUNT(*) FROM macro").fetchone()[0]
    n_series = cur.execute("SELECT COUNT(*) FROM series").fetchone()[0]
    con.close()
    return n_macro, n_series


if __name__ == "__main__":
    print("rows: macro %d, series %d" % build())
''',
'queries.sql': '''-- 1 Filter: months with inflation above 9%
SELECT month, infl FROM macro WHERE infl > 9 ORDER BY month DESC LIMIT 10;
-- 2 Sort: largest remittance months
SELECT month, remit FROM macro WHERE remit IS NOT NULL ORDER BY remit DESC LIMIT 5;
-- 3 Group and aggregate: complete fiscal years only
SELECT fy, ROUND(AVG(infl), 2) AS avg_inflation, ROUND(SUM(remit), 1) AS total_remit, COUNT(remit) AS months
FROM macro GROUP BY fy HAVING COUNT(remit) = 12 ORDER BY fy DESC LIMIT 5;
-- 4 Missing values: count them, never fill economic data with 0 by reflex
SELECT SUM(infl IS NULL) AS infl_missing, SUM(remit IS NULL) AS remit_missing, SUM(xr IS NULL) AS xr_missing FROM macro;
-- 5 Calculated column: remittances in Taka crore
SELECT month, remit, xr, ROUND(remit * xr / 10, 1) AS remit_tk_crore FROM macro WHERE remit IS NOT NULL ORDER BY month DESC LIMIT 3;
-- 6 Join the long table to itself: inflation with the call money rate
SELECT a.month, a.value AS inflation, b.value AS call_rate
FROM series a LEFT JOIN series b ON b.key = 'call' AND b.month = a.month
WHERE a.key = 'infl' ORDER BY a.month DESC LIMIT 5;
-- 7 Window function: rank months by remittances within each fiscal year
SELECT fy, month, remit, RANK() OVER (PARTITION BY fy ORDER BY remit DESC) AS rank_in_fy
FROM macro WHERE remit IS NOT NULL ORDER BY month DESC LIMIT 12;
''',
'app/__init__.py': '',
'app/api.py': '''"""Macro Copilot API: data endpoints and a signed, idempotent webhook (course modules 4 and 5)."""
import hashlib
import hmac
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request

DB = Path(os.environ.get("MACRO_DB", Path(__file__).resolve().parent.parent / "data" / "macro.db"))
SECRET = os.environ.get("WEBHOOK_SECRET", "").encode()
SEEN = set()  # use a database table in production
app = FastAPI(title="Bangladesh Macro Copilot API")


def query(sql, args=()):
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    try:
        return [dict(r) for r in con.execute(sql, args)]
    finally:
        con.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/series")
def series_list():
    return [r["key"] for r in query("SELECT DISTINCT key FROM series ORDER BY key")]


@app.get("/series/{key}")
def series(key: str, start: str = "0000-00", end: str = "9999-99"):
    rows = query("SELECT month, value FROM series WHERE key = ? AND month BETWEEN ? AND ? ORDER BY month", (key, start, end))
    if not rows:
        raise HTTPException(404, f"unknown series or no data: {key}")
    return {"key": key, "data": rows}


@app.get("/latest/{key}")
def latest(key: str):
    rows = query("SELECT month, value FROM series WHERE key = ? ORDER BY month DESC LIMIT 1", (key,))
    if not rows:
        raise HTTPException(404, f"unknown series: {key}")
    return {"key": key, **rows[0]}


@app.post("/hooks/data-updated")
async def data_updated(request: Request):
    if not SECRET:
        raise HTTPException(503, "WEBHOOK_SECRET is not set")
    body = await request.body()                                   # sign the raw bytes
    expected = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(request.headers.get("X-Signature-256", ""), expected):
        raise HTTPException(401, "bad signature")
    event_id = request.headers.get("X-Event-Id", "")
    if event_id in SEEN:                                          # retries are normal
        return {"status": "duplicate"}
    SEEN.add(event_id)
    return {"status": "accepted"}
''',
'rag/__init__.py': '',
'rag/search.py': '''"""Hybrid search over the data catalogue: BM25 + LSA, reciprocal rank fusion, rule-based rerank (module 7)."""
import csv
import math
import re
import sys
from pathlib import Path

import numpy as np

CAT = Path(__file__).resolve().parent.parent / "data" / "catalogue.csv"
STOP = {"the", "of", "and", "in", "for", "to", "by", "on", "at", "as", "or"}


def tok(s):
    return [w for w in re.findall(r"[a-z0-9]+", s.lower()) if len(w) > 1 and w not in STOP]


class Index:
    def __init__(self, path=CAT, dim=40):
        with open(path, encoding="utf-8") as f:
            self.docs = list(csv.DictReader(f))
        self.toks = [tok(" ".join([d["code"], d["label"], d["label"], d["table"], d["publication"], d["unit"]])) for d in self.docs]
        self.N = len(self.docs)
        self.avg = sum(map(len, self.toks)) / self.N
        self.df = {}
        for t in self.toks:
            for w in set(t):
                self.df[w] = self.df.get(w, 0) + 1
        vocab = sorted(w for w, c in self.df.items() if c >= 2)
        self.vi = {w: i for i, w in enumerate(vocab)}
        self.idf = np.array([math.log((1 + self.N) / (1 + self.df[w])) + 1 for w in vocab])
        X = np.zeros((self.N, len(vocab)))
        for r, t in enumerate(self.toks):
            for w in set(t):
                if w in self.vi:
                    X[r, self.vi[w]] = (1 + math.log(t.count(w))) * self.idf[self.vi[w]]
        X /= np.maximum(np.linalg.norm(X, axis=1, keepdims=True), 1e-12)
        rng = np.random.default_rng(7)                                # randomised SVD (Halko et al., 2011)
        Y, _ = np.linalg.qr(X @ rng.standard_normal((X.shape[1], dim + 10)))
        for _ in range(5):
            Y, _ = np.linalg.qr(X @ (X.T @ Y))
        _, _, Vt = np.linalg.svd(Y.T @ X, full_matrices=False)
        self.V = Vt[:dim].T
        D = X @ self.V
        self.D = D / np.maximum(np.linalg.norm(D, axis=1, keepdims=True), 1e-12)

    def bm25(self, qt, k1=1.2, b=0.75):
        s = np.zeros(self.N)
        for w in qt:
            n = self.df.get(w)
            if not n:
                continue
            idf = math.log(1 + (self.N - n + 0.5) / (n + 0.5))
            for i, t in enumerate(self.toks):
                f = t.count(w)
                if f:
                    s[i] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(t) / self.avg))
        return s

    def lsa(self, qt):
        q = np.zeros(len(self.vi))
        for w in set(qt):
            if w in self.vi:
                q[self.vi[w]] = (1 + math.log(qt.count(w))) * self.idf[self.vi[w]]
        if not q.any():
            return np.zeros(self.N)
        v = (q / np.linalg.norm(q)) @ self.V
        return self.D @ (v / max(np.linalg.norm(v), 1e-12))

    def search(self, query, k=5):
        qt = tok(query)
        bm, ls = self.bm25(qt), self.lsa(qt)
        rb = [i for i in np.argsort(-bm)[:50] if bm[i] > 0]
        rl = [i for i in np.argsort(-ls)[:50] if ls[i] > 0]
        fused = {}
        for lst in (rb, rl):
            for rank, i in enumerate(lst):
                fused[i] = fused.get(i, 0) + 1 / (61 + rank)         # reciprocal rank fusion, k = 60
        pool = set(rb[:15]) | set(rl[:15]) | set(sorted(fused, key=fused.get, reverse=True)[:20])
        stem = lambda w: w[:-1] if len(w) > 3 and w.endswith("s") else w
        qs, ql, out = [stem(w) for w in qt], query.lower().strip(), []
        for i in pool:
            d = self.docs[i]
            label_words = {stem(w) for w in tok(d["label"])}
            score = fused.get(i, 0) + 0.03 * sum(w in label_words for w in qs) / max(len(qs), 1)
            if d["code"].lower() == ql:
                score += 0.06
            out.append((score, d))
        return [d for _, d in sorted(out, key=lambda z: -z[0])[:k]]


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "wage earners remittance"
    for d in Index().search(q):
        print(d["code"], "|", d["label"], "|", d["table"])
''',
'agent/__init__.py': '',
'agent/agent.py': '''"""Bangladesh Macro Copilot agent: tools over data/macro.db, guardrails and a visible trace (module 8).

Rule-based core by default. With --llm, Claude chooses the tools (needs ANTHROPIC_API_KEY and MODEL)."""
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data" / "macro.db"
LABELS = {"infl": "Headline inflation, %", "food": "Food inflation, %", "nonfood": "Non-food inflation, %", "xr": "Exchange rate, Tk per US$",
          "remit": "Remittances, US$ mn", "exp": "Exports, US$ mn", "imp": "Imports, US$ mn", "call": "Call money rate, %", "m2": "Broad money growth, %",
          "pcredit": "Private credit growth, %", "res": "Gross reserves, US$ mn", "lend": "Lending rate, %"}
SYN = [("nonfood", r"non-?food"), ("food", r"food"), ("infl", r"inflation|cpi|prices?"), ("xr", r"exchange rate|taka|dollar rate"), ("remit", r"remittance"),
       ("exp", r"export"), ("imp", r"import"), ("call", r"call (money )?rate|call money"), ("m2", r"broad money|\\bm2\\b"), ("pcredit", r"private (sector )?credit"),
       ("res", r"reserve"), ("lend", r"lending rate")]
BLOCK = re.compile(r"salary|password|phone number|home address|neighbou?r|national id|\\bnid\\b|bank account|credit card|e-?mail address", re.I)
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def get_series(series, start="0000-00", end="9999-99"):
    con = sqlite3.connect(DB)
    try:
        return [[m, v] for m, v in con.execute("SELECT month, value FROM series WHERE key = ? AND month BETWEEN ? AND ? ORDER BY month", (series, start, end))]
    finally:
        con.close()


def stats(series, op="latest", start="0000-00", end="9999-99"):
    rows = get_series(series, start, end)
    if not rows:
        return {"error": "no data"}
    vals = [v for _, v in rows]
    if op == "mean":
        return {"value": sum(vals) / len(vals), "n": len(vals)}
    if op == "sum":
        return {"value": sum(vals), "n": len(vals)}
    if op in ("max", "min"):
        m, v = (max if op == "max" else min)(rows, key=lambda r: r[1])
        return {"value": v, "month": m}
    return {"value": rows[-1][1], "month": rows[-1][0]}


TOOLS = [
    {"name": "get_series", "description": "Monthly values of one Bangladesh indicator from the local database.",
     "input_schema": {"type": "object", "properties": {"series": {"type": "string", "enum": list(LABELS)}, "start": {"type": "string", "description": "YYYY-MM"},
                                                        "end": {"type": "string", "description": "YYYY-MM"}}, "required": ["series"]}},
    {"name": "stats", "description": "Mean, sum, maximum, minimum or latest value of one indicator over a period.",
     "input_schema": {"type": "object", "properties": {"series": {"type": "string", "enum": list(LABELS)}, "op": {"type": "string", "enum": ["mean", "sum", "max", "min", "latest"]},
                                                        "start": {"type": "string"}, "end": {"type": "string"}}, "required": ["series", "op"]}}]
IMPL = {"get_series": get_series, "stats": stats}


def parse(q):
    ql, found = q.lower(), []
    for k, pat in SYN:
        if re.search(pat, ql) and not (k == "infl" and "food" in ql) and k not in found:
            found.append(k)
    if "nonfood" in found and "food" in found:
        found.remove("food")
    op = ("mean" if re.search(r"average|mean", ql) else "sum" if re.search(r"total|sum", ql) else "max" if re.search(r"highest|maximum|peak", ql)
          else "min" if re.search(r"lowest|minimum", ql) else "latest")
    m = re.search(r"\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+(\\d{4})", ql)
    since, yr = re.search(r"since\\s+(\\d{4})", ql), re.search(r"\\b(19|20)\\d{2}\\b", ql)
    if m:
        start = end = f"{m.group(2)}-{MONTHS[m.group(1)]:02d}"
    elif since:
        start, end = f"{since.group(1)}-01", "9999-99"
    elif yr:
        start, end = f"{yr.group(0)}-01", f"{yr.group(0)}-12"
    else:
        start, end = "0000-00", "9999-99"
    compare = bool(re.search(r"compare|versus|\\bvs\\b|difference", ql)) and len(found) > 1
    return found, op, start, end, compare


def rule_agent(q):
    trace = ["PERCEIVE  " + q]
    if BLOCK.search(q):
        trace.append("GUARDRAIL personal data requested -> refuse")
        return {"kind": "refuse", "answer": "I only answer questions about published macroeconomic data.", "trace": trace}
    found, op, start, end, compare = parse(q)
    trace.append(f"REASON    series={found} op={op} period={start}..{end}")
    if not found:
        return {"kind": "clarify", "answer": "Which indicator? Known: " + ", ".join(LABELS.values()), "trace": trace}
    if compare:
        a, b = stats(found[0], "latest", start, end), stats(found[1], "latest", start, end)
        trace.append(f"ACT       stats x2 -> {a}, {b}")
        if "error" in a or "error" in b:
            return {"kind": "nodata", "answer": "No data for that period.", "trace": trace}
        v = a["value"] - b["value"]
        return {"kind": "ok", "value": v, "answer": f"{LABELS[found[0]]} {a['value']:.1f} vs {LABELS[found[1]]} {b['value']:.1f} in {a['month']}: difference {v:.1f}.", "trace": trace}
    res = stats(found[0], op, start, end)
    trace.append(f"ACT       stats({found[0]}, {op}) -> {res}")
    if "error" in res:
        return {"kind": "nodata", "answer": "No data for that period.", "trace": trace}
    trace.append("GOAL      achieved -> answer with source")
    where = f" in {res['month']}" if "month" in res else f" over {res['n']} months"
    return {"kind": "ok", "value": res["value"], "answer": f"{LABELS[found[0]]}: {res['value']:.2f}{where} (source: Bangladesh Bank/BBS via macroarianalytics.com).", "trace": trace}


def llm_agent(q, max_steps=6):
    import anthropic                                                  # pip install anthropic
    client, model = anthropic.Anthropic(), os.environ["MODEL"]
    system = "Answer questions about Bangladesh macroeconomic data using only the tools. Cite series and months. Refuse requests for personal data."
    messages = [{"role": "user", "content": q}]
    for _ in range(max_steps):                                        # guardrail: bounded loop
        r = client.messages.create(model=model, max_tokens=1024, system=system, tools=TOOLS, messages=messages)
        if r.stop_reason != "tool_use":
            return {"kind": "ok", "answer": "".join(b.text for b in r.content if b.type == "text"), "trace": ["LLM answered"]}
        messages.append({"role": "assistant", "content": r.content})
        results = [{"type": "tool_result", "tool_use_id": b.id, "content": json.dumps(IMPL[b.name](**b.input))} for b in r.content if b.type == "tool_use"]
        messages.append({"role": "user", "content": results})
    return {"kind": "stopped", "answer": "Stopped: step limit reached.", "trace": []}


if __name__ == "__main__":
    args = sys.argv[1:]
    use_llm = "--llm" in args
    question = " ".join(a for a in args if a != "--llm") or "What is the latest headline inflation?"
    out = llm_agent(question) if use_llm else rule_agent(question)
    print("\\n".join(out["trace"]))
    print("ANSWER   ", out["answer"])
''',
'evals/__init__.py': '',
'evals/run_evals.py': '''"""Run the agent on the evaluation set and report accuracy; exit code 1 on any failure (evals in CI)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from agent.agent import rule_agent  # noqa: E402


def main():
    cases = json.loads(Path(__file__).with_name("eval_set.json").read_text(encoding="utf-8"))
    ok = 0
    for c in cases:
        r = rule_agent(c["question"])
        passed = r["kind"] == "refuse" if c["expected"] == "REFUSE" else (r["kind"] == "ok" and abs(r["value"] - c["expected"]) < 0.011)
        ok += passed
        print(("PASS " if passed else "FAIL ") + c["question"])
    print(f"accuracy {ok}/{len(cases)}")
    return ok == len(cases)


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
''',
'finetune/prepare_data.py': '''"""Build chat-format JSONL for fine-tuning from data/macro_monthly.csv (module 9).

Templated data teaches format and style, not new facts: keep facts in retrieval or tools."""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "macro_monthly.csv"
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def main(val_share=0.1):
    with open(DATA, encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r["infl"] and r["food"]]
    by_month, pairs = {r["month"]: r for r in rows}, []
    for r in rows:
        y, m = map(int, r["month"].split("-"))
        prev = by_month.get(f"{y - 1}-{m:02d}")
        if not prev:
            continue
        a, b = float(r["infl"]), float(prev["infl"])
        direction = "up from" if a > b else "down from" if a < b else "unchanged from"
        when = f"{MON[m - 1]} {y}"
        pairs.append({"messages": [
            {"role": "system", "content": "You are an economist who writes short, accurate notes on Bangladesh's economy."},
            {"role": "user", "content": f"Write a one-sentence note on inflation in {when}."},
            {"role": "assistant", "content": f"Headline inflation was {a:.2f}% in {when}, {direction} {b:.2f}% a year earlier, with food inflation at {float(r['food']):.2f}%."}]})
    n_val = max(1, round(len(pairs) * val_share))                     # hold out the latest months
    for name, part in (("train.jsonl", pairs[:-n_val]), ("val.jsonl", pairs[-n_val:])):
        with open(HERE / name, "w", encoding="utf-8") as f:
            f.writelines(json.dumps(p, ensure_ascii=False) + "\\n" for p in part)
    print(f"train {len(pairs) - n_val}, validation {n_val}")


if __name__ == "__main__":
    main()
''',
'finetune/train_lora.py': '''"""QLoRA fine-tuning template (module 9). Needs a CUDA GPU; NOT run or tested in this kit.

pip install torch transformers peft trl bitsandbytes datasets
Set BASE_MODEL to an open model you are licensed to use, then run on a GPU machine."""
import os

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

BASE_MODEL = os.environ["BASE_MODEL"]
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, quantization_config=bnb, device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"], task_type="CAUSAL_LM")
data = load_dataset("json", data_files={"train": "finetune/train.jsonl", "validation": "finetune/val.jsonl"})
trainer = SFTTrainer(model=model, train_dataset=data["train"], eval_dataset=data["validation"], peft_config=lora, processing_class=tokenizer,
                     args=SFTConfig(output_dir="finetune/out", num_train_epochs=2, learning_rate=2e-4, per_device_train_batch_size=4))
trainer.train()
trainer.save_model("finetune/out/adapter")
''',
'tests/__init__.py': '',
'tests/test_core.py': '''import hashlib
import hmac
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import build_db  # noqa: E402


def test_db_builds():
    n_macro, n_series = build_db.build()
    assert n_macro > 100 and n_series > n_macro


def test_fiscal_year():
    assert build_db.fiscal_year("2024-07") == "FY2025" and build_db.fiscal_year("2024-06") == "FY2024"


def test_agent():
    from agent.agent import rule_agent
    assert rule_agent("What is the latest headline inflation?")["kind"] == "ok"
    assert rule_agent("What is my neighbour's salary?")["kind"] == "refuse"


def test_search_finds_remittances():
    from rag.search import Index
    assert any("emittance" in d["label"] for d in Index().search("wage earners remittance"))


def test_webhook_signature():
    os.environ["WEBHOOK_SECRET"] = "test-secret"
    import importlib
    from fastapi.testclient import TestClient
    import app.api as api
    importlib.reload(api)
    client = TestClient(api.app)
    body = b'{"event":"data.updated"}'
    sig = "sha256=" + hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert client.post("/hooks/data-updated", content=body, headers={"X-Signature-256": sig, "X-Event-Id": "1"}).json()["status"] == "accepted"
    assert client.post("/hooks/data-updated", content=body, headers={"X-Signature-256": sig, "X-Event-Id": "1"}).json()["status"] == "duplicate"
    assert client.post("/hooks/data-updated", content=body, headers={"X-Signature-256": "sha256=bad", "X-Event-Id": "2"}).status_code == 401
    assert client.get("/latest/infl").status_code == 200
''',
}

SQLK = ['infl', 'food', 'nonfood', 'xr', 'remit', 'exp', 'imp', 'call', 'm2', 'pcredit', 'res', 'lend']
SD = {k: ser(k) for k in SQLK}
OUT['sql'] = {'macro': {'cols': ['month', 'fy', 'inflation', 'food', 'xr', 'remit', 'iip'], 'rows': [[r.month, r.fy, rnd(r.inflation), rnd(r.food), rnd(r.xr), rnd(r.remit, 1), rnd(r.iip)] for r in df.itertuples()]},
              'rates': [[a, rnd(b)] for a, b in rates.values], 'series': [[k, mlab(kk), round(SD[k][kk], 3)] for k in SQLK for kk in sorted(SD[k]) if kk >= 2010 * 12]}
months_ = sorted({kk for k in SQLK for kk in SD[k] if kk >= 2010 * 12})
csv_ = ['month,' + ','.join(SQLK)] + [mlab(m) + ',' + ','.join('' if m not in SD[k] else ('%.4f' % SD[k][m]).rstrip('0').rstrip('.') for k in SQLK) for m in months_]
kit_evals = [{'question': q_, 'expected': e_} for q_, e_ in OUT['agent']['evals'] if not re.search(r'GDP|[Ff]orecast', q_)]
OUT['kit'] = {'files': dict(KIT_FILES, **{'data/macro_monthly.csv': '\n'.join(csv_) + '\n', 'evals/eval_set.json': json.dumps(kit_evals, indent=2, ensure_ascii=False) + '\n'}), 'version': '1.0'}
OUT['built'] = mlab(li)

html = TPL.read_text(encoding='utf-8')
data = json.dumps(OUT, separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/')
assert '__LEARN_DATA__' in html
out = ROOT / 'public' / 'course' / 'index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html.replace('__LEARN_DATA__', data), encoding='utf-8')
print('course page written:', out, round(out.stat().st_size / 1024), 'KB;', len(docs), 'catalogue documents; checks', checks)
