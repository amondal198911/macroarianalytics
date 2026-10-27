#!/usr/bin/env python3
"""Model library, batch 1, for macroarianalytics.com.

Estimates five models on Bangladesh data and stores the results in bd_models.json under "models2":
  keynes  structural macroeconometric (Keynesian income-expenditure) model, fiscal years
  vecm    vector error correction model of imports, exports and remittances (Johansen)
  dfm     dynamic factor model, GDP nowcast (bridge equation) and FAVAR
  sarimax inflation with exchange-rate and call-rate drivers
  cge     1-2-3 computable general equilibrium model, calibrated to trade shares
Runs after bd_build.py (which calls it) or on its own: python scripts/models_build.py
"""
import json, math, warnings, datetime
from pathlib import Path
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.api import VAR
from statsmodels.tsa.stattools import adfuller, coint
from statsmodels.tsa.vector_ar.vecm import coint_johansen, VECM
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.sandbox.regression.gmm import IV2SLS
from scipy import stats, optimize

warnings.filterwarnings('ignore')
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
MP = ROOT / 'bd_models.json'
OUT = json.loads(MP.read_text(encoding='utf-8'))
WP = ROOT / 'build' / 'data.json'
W = json.loads(WP.read_text(encoding='utf-8')) if WP.exists() else {'s': {}}


def r(x, d=4):
    try:
        x = float(x)
        return round(x, d) if math.isfinite(x) else None
    except Exception:
        return None


def rl(a, d=4):
    return [r(x, d) for x in a]


def ser(key):
    s = (OUT.get('series', {}).get(key) or {}).get('series') or {}
    if not s:
        return {}
    d = {s['k0'] + i: float(v) for i, v in enumerate(s['v']) if v is not None}
    ks = sorted(d)
    for x, y_ in zip(ks, ks[1:]):          # fill isolated gaps of up to 3 periods, as the existing models do
        if 1 < y_ - x <= 4:
            for j in range(x + 1, y_):
                d[j] = d[x] + (d[y_] - d[x]) * (j - x) / (y_ - x)
    return d


def wdi(key, iso='BGD'):
    s = (W.get('s', {}).get(key) or {}).get(iso)
    if not s:
        return {}
    y0, st = s
    return {y0 + i: float(v) for i, v in enumerate(st.split(',')) if v != ''}


def mlab(k): return f'{k // 12}-{k % 12 + 1:02d}'
def qlab(k): return f'{k // 4}-Q{k % 4 + 1}'


def tail_run(keys):
    """Longest run of consecutive periods ending at the last common period."""
    run = []
    for k in sorted(keys, reverse=True):
        if run and run[0] - k != 1:
            break
        run.insert(0, k)
    return run


def tab(m, names):
    t = getattr(m, 'tvalues', None)
    return [{'term': n, 'coef': r(b), 'se': r(s), 't': r(tv, 2), 'p': r(p)}
            for n, b, s, tv, p in zip(names, m.params, m.bse, t if t is not None else [None] * len(names), m.pvalues)]


M2 = {'built': datetime.date.today().isoformat(), 'errors': {}}

# ---------------------------------------------------------------- A. Keynesian structural model
try:
    g, cs, iv = ser('gdp_fy'), ser('cons_gdp'), ser('inv_gdp')
    ex, im, rr = wdi('exports'), wdi('imports'), wdi('real_rate')
    ks = sorted(k for k in g if k in cs and k in iv and (k - 1) in ex and (k - 1) in im)
    Y, lvl = {}, 100.0
    for k in range(ks[0], ks[-1] + 1):
        if k != ks[0]:
            lvl *= 1 + g[k] / 100
        Y[k] = lvl
    Cc = {k: cs[k] / 100 * Y[k] for k in ks}
    Ii = {k: iv[k] / 100 * Y[k] for k in ks}
    Xx = {k: ex[k - 1] / 100 * Y[k] for k in ks}
    Mm = {k: im[k - 1] / 100 * Y[k] for k in ks}
    Dd = {k: Y[k] - (Cc[k] + Ii[k] + Xx[k] - Mm[k]) for k in ks}
    rbar = float(np.mean([rr[k - 1] for k in ks if (k - 1) in rr])) if rr else 0.0
    Rr = {k: rr.get(k - 1, rbar) for k in ks}
    est = [k for k in ks if (k - 1) in Cc and (k - 2) in Y]
    A = lambda d, lag=0: np.array([d[k - lag] for k in est])
    yv, cv, iv_, mv, xv, rv = A(Y), A(Cc), A(Ii), A(Mm), A(Xx), A(Rr)
    y1, c1, i1, m1, y2 = A(Y, 1), A(Cc, 1), A(Ii, 1), A(Mm, 1), A(Y, 2)
    Z = sm.add_constant(np.column_stack([xv, c1, i1, y1, m1]))
    cons = IV2SLS(cv, sm.add_constant(np.column_stack([yv, c1])), Z).fit()
    cons_ols = sm.OLS(cv, sm.add_constant(np.column_stack([yv, c1]))).fit()
    invm = sm.OLS(iv_, sm.add_constant(np.column_stack([y1 - y2, rv, i1]))).fit(cov_type='HAC', cov_kwds={'maxlags': 2})
    impm = sm.OLS(mv, sm.add_constant(np.column_stack([yv, m1]))).fit(cov_type='HAC', cov_kwds={'maxlags': 2})
    a0, a1, a2 = cons.params
    b0, b1, b2, b3 = invm.params
    m0, mc1, mc2 = impm.params
    den = 1 - a1 + mc1

    def sim(start, years, aut=None, xmult=None, lags=None):
        """Solve the model year by year from `start`; lagged values simulated after the first year."""
        L = lags or {'Y': Y[start - 1], 'Y2': Y[start - 2], 'C': Cc[start - 1], 'I': Ii[start - 1], 'M': Mm[start - 1]}
        out = []
        for j, k in enumerate(years):
            a = (aut or {}).get(j, 0.0)
            x = Xx[k] * (xmult or {}).get(j, 1.0)
            ik = b0 + b1 * (L['Y'] - L['Y2']) + b2 * Rr[k] + b3 * L['I']
            yk = (a0 + a2 * L['C'] + a + ik + x - m0 - mc2 * L['M'] + Dd[k]) / den
            ck = a0 + a1 * yk + a2 * L['C']
            mk_ = m0 + mc1 * yk + mc2 * L['M']
            out.append(yk)
            L = {'Y': yk, 'Y2': L['Y'], 'C': ck, 'I': ik, 'M': mk_}
        return np.array(out)

    dyn = sim(est[0], est)
    stat_ = np.array([(a0 + a2 * Cc[k - 1] + b0 + b1 * (Y[k - 1] - Y[k - 2]) + b2 * Rr[k] + b3 * Ii[k - 1] + Xx[k] - m0 - mc2 * Mm[k - 1] + Dd[k]) / den for k in est])
    gr = lambda arr, prev: (arr / prev - 1) * 100
    g_act = np.array([g[k] for k in est])
    g_stat = gr(stat_, np.array([Y[k - 1] for k in est]))
    g_dyn = gr(dyn, np.r_[Y[est[0] - 1], dyn[:-1]])
    H = 10
    w0 = est[-H] if len(est) > H else est[0]
    win = [k for k in est if k >= w0]
    base = sim(w0, win)
    shock = 0.01 * Y[w0 - 1]
    sus = (sim(w0, win, aut={j: shock for j in range(len(win))}) - base) / shock
    one = (sim(w0, win, aut={0: shock}) - base) / shock
    xs = (sim(w0, win, xmult={j: 0.9 for j in range(len(win))}) / base - 1) * 100
    lr = 1 / (1 - a1 / (1 - a2) + mc1 / (1 - mc2)) if abs(1 - a2) > 1e-6 and abs(1 - mc2) > 1e-6 else None
    last = ks[-1]
    M2['keynes'] = {
        'sample': [f'FY{est[0]}', f'FY{est[-1]}'], 'n': len(est),
        'cons': {'rows': tab(cons, ['Constant', 'Income (GDP), Y', 'Consumption last year, C(t−1)']), 'r2_ols': r(cons_ols.rsquared, 3), 'ols_mpc': r(cons_ols.params[1], 4)},
        'inv': {'rows': tab(invm, ['Constant', 'Change in GDP last year, ΔY(t−1)', 'Real interest rate, r', 'Investment last year, I(t−1)']), 'r2': r(invm.rsquared, 3)},
        'imp': {'rows': tab(impm, ['Constant', 'Income (GDP), Y', 'Imports last year, M(t−1)']), 'r2': r(impm.rsquared, 3)},
        'fit': {'labels': [f'FY{k}' for k in est], 'actual': rl(g_act, 3), 'static': rl(g_stat, 3), 'dynamic': rl(g_dyn, 3),
                'rmse_naive': r(np.sqrt(np.mean((np.array([g.get(k - 1, np.nan) for k in est]) - g_act) ** 2)), 3), 'rmse_static': r(np.sqrt(np.mean((g_stat - g_act) ** 2)), 3), 'rmse_dynamic': r(np.sqrt(np.mean((g_dyn - g_act) ** 2)), 3)},
        'mult': {'impact': r(1 / den, 3), 'long_run': r(lr, 3), 'labels': [f'FY{k}' for k in win], 'sustained': rl(sus, 3), 'one_off': rl(one, 3)},
        'export_shock': {'labels': [f'FY{k}' for k in win], 'gdp_pct': rl(xs, 3)},
        'shares': {'year': f'FY{last}', 'cons': r(cs[last], 2), 'inv': r(iv[last], 2), 'exports': r(ex[last - 1], 2), 'imports': r(im[last - 1], 2)},
        'mpc': r(a1, 4), 'mpm': r(mc1, 4), 'accel': r(b1, 4), 'den': r(den, 4)}
except Exception as e:
    M2['errors']['keynes'] = str(e)[:300]

# ---------------------------------------------------------------- B. VECM: imports, exports, remittances
try:
    e_, m_, rm_ = ser('exp'), ser('imp'), ser('remit')
    ks = tail_run(set(e_) & set(m_) & set(rm_))
    Yd = np.log(np.column_stack([[m_[k] for k in ks], [e_[k] for k in ks], [rm_[k] for k in ks]]))
    names = ['ln imports', 'ln exports', 'ln remittances']
    sel = VAR(Yd).select_order(maxlags=12)
    p = int(min(max(sel.bic, 2), 12))
    kd = p - 1
    jo = coint_johansen(Yd, det_order=0, k_ar_diff=kd)
    trace = [{'h0': f'r ≤ {i}', 'trace': r(jo.lr1[i], 2), 'cv95': r(jo.cvt[i, 1], 2), 'maxeig': r(jo.lr2[i], 2), 'cvm95': r(jo.cvm[i, 1], 2), 'eig': r(jo.eig[i], 4)} for i in range(3)]
    rank = 0
    for i in range(3):
        if jo.lr1[i] > jo.cvt[i, 1]:
            rank = i + 1
        else:
            break
    res = VECM(Yd, k_ar_diff=kd, coint_rank=max(1, rank), deterministic='ci').fit()
    beta = res.beta[:, 0]
    const = float(np.ravel(res.det_coef_coint)[0]) if getattr(res, 'det_coef_coint', None) is not None and np.size(res.det_coef_coint) else 0.0
    ect = Yd @ beta + const
    alpha = res.alpha[:, 0]
    sa = np.ravel(res.stderr_alpha[:, 0]) if hasattr(res, 'stderr_alpha') else np.full(3, np.nan)
    pa = np.ravel(res.pvalues_alpha[:, 0]) if hasattr(res, 'pvalues_alpha') else np.full(3, np.nan)
    irf = res.irf(24).orth_irfs
    fc, lo, hi = res.predict(steps=12, alpha=0.2)
    egt, egp, _ = coint(Yd[:, 0], Yd[:, 1:])
    ur = [{'var': n, 'level_p': r(adfuller(Yd[:, j], autolag='AIC')[1], 4), 'diff_p': r(adfuller(np.diff(Yd[:, j]), autolag='AIC')[1], 4)} for j, n in enumerate(names)]
    kf = list(range(ks[-1] + 1, ks[-1] + 13))
    M2['vecm'] = {
        'sample': [mlab(ks[0]), mlab(ks[-1])], 'n': len(ks), 'p': p, 'p_aic': int(sel.aic), 'p_bic': int(sel.bic), 'k_ar_diff': kd, 'rank': rank, 'trace': trace, 'unitroot': ur,
        'eg': {'t': r(egt, 3), 'p': r(egp, 4)},
        'beta': {'names': names, 'coef': rl(beta, 4), 'const': r(const, 4), 'elast_exports': r(-beta[1] / beta[0], 3), 'elast_remit': r(-beta[2] / beta[0], 3)},
        'alpha': [{'eq': f'Δ{n}', 'coef': r(a, 4), 'se': r(s, 4), 'p': r(pv, 4)} for n, a, s, pv in zip(names, alpha, sa, pa)],
        'ect': {'labels': [mlab(k) for k in ks], 'values': rl(ect - ect.mean(), 4)},
        'levels': {'labels': [mlab(k) for k in ks], 'imports': rl(Yd[:, 0], 4), 'exports': rl(Yd[:, 1], 4), 'remit': rl(Yd[:, 2], 4)},
        'irf': {'h': list(range(25)), 'imp_to_exp': rl(irf[:, 0, 1] * 100, 3), 'imp_to_rem': rl(irf[:, 0, 2] * 100, 3), 'exp_to_imp': rl(irf[:, 1, 0] * 100, 3)},
        'fc': {'labels': [mlab(k) for k in kf], 'imports': rl(np.exp(fc[:, 0]), 1), 'imp_lo': rl(np.exp(lo[:, 0]), 1), 'imp_hi': rl(np.exp(hi[:, 0]), 1),
               'exports': rl(np.exp(fc[:, 1]), 1), 'remit': rl(np.exp(fc[:, 2]), 1)},
        'last': {'imports': r(m_[ks[-1]], 1), 'exports': r(e_[ks[-1]], 1), 'remit': r(rm_[ks[-1]], 1), 'month': mlab(ks[-1])}}
except Exception as e:
    M2['errors']['vecm'] = str(e)[:300]

# ---------------------------------------------------------------- C. Dynamic factor model, nowcast, FAVAR
try:
    panel = ['infl', 'food', 'nonfood', 'm2', 'rm', 'pcredit', 'cdr', 'lend', 'spread', 'real_lend', 'xr_dep', 'remit_g', 'exp_g', 'tax_g', 'mcap_g', 'govcredit']
    D = {k: ser(k) for k in panel}
    im = ser('imp')
    D['imp_g'] = {k: (im[k] / im[k - 12] - 1) * 100 for k in im if (k - 12) in im and im[k - 12]}
    cl = ser('call')
    names = panel + ['imp_g']
    ks = tail_run(set.intersection(*[set(D[n]) for n in names]) & set(cl))
    X = np.column_stack([[D[n][k] for k in ks] for n in names])
    mu, sd = X.mean(0), X.std(0, ddof=1)
    Zs = (X - mu) / sd
    w, V = np.linalg.eigh(np.corrcoef(Zs, rowvar=False))
    o_ = np.argsort(w)[::-1]
    w, V = w[o_], V[:, o_]
    nf = 3
    for j in range(nf):
        anchor = names.index('infl') if j == 0 else names.index('pcredit')
        if V[anchor, j] < 0:
            V[:, j] *= -1
    F = Zs @ V[:, :nf]
    share = w / w.sum()
    gq = ser('gdp_q')
    byq = {}
    for i, k in enumerate(ks):
        byq.setdefault(k // 3, []).append(i)
    Fq = {q: F[ix].mean(0) for q, ix in byq.items() if len(ix) == 3}
    qs = [q for q in sorted(Fq) if q in gq and (q - 1) in gq]
    Xb = np.column_stack([[Fq[q][j] for q in qs] for j in range(nf)] + [[gq[q - 1] for q in qs]])
    br = sm.OLS(np.array([gq[q] for q in qs]), sm.add_constant(Xb)).fit()
    rsd = float(np.sqrt(br.scale))
    lastq = max(gq)
    now, prev = [], gq[lastq]
    for q in sorted(Fq):
        if q <= lastq:
            continue
        yh = float(br.params @ np.r_[1, Fq[q], prev])
        now.append({'q': qlab(q), 'nowcast': r(yh, 2), 'lo': r(yh - 1.2816 * rsd, 2), 'hi': r(yh + 1.2816 * rsd, 2)})
        prev = yh
    cv_ = np.array([cl[k] for k in ks])
    vdat = np.column_stack([F[:, 0], F[:, 1], cv_])
    vsel = VAR(vdat).select_order(maxlags=6)
    vp = int(min(max(vsel.aic, 1), 6))
    vres = VAR(vdat).fit(vp)
    oi = vres.irf(24).orth_irfs[:, :, 2]
    resp = {}
    for n in ['infl', 'pcredit', 'm2', 'xr_dep', 'exp_g', 'remit_g']:
        j = names.index(n)
        resp[n] = rl(sd[j] * (V[j, 0] * oi[:, 0] + V[j, 1] * oi[:, 1]), 3)
    lab_ = {'infl': 'Headline inflation', 'food': 'Food inflation', 'nonfood': 'Non-food inflation', 'm2': 'Broad money growth', 'rm': 'Reserve money growth', 'pcredit': 'Private credit growth',
            'cdr': 'Credit–deposit ratio', 'lend': 'Lending rate', 'spread': 'Lending–deposit spread', 'real_lend': 'Real lending rate', 'xr_dep': 'Taka depreciation', 'remit_g': 'Remittance growth',
            'exp_g': 'Export growth', 'tax_g': 'Tax revenue growth', 'mcap_g': 'Market capitalisation growth', 'govcredit': 'Bank credit to government growth', 'imp_g': 'Import growth'}
    M2['dfm'] = {
        'sample': [mlab(ks[0]), mlab(ks[-1])], 'n': len(ks), 'vars': [lab_[n] for n in names], 'keys': names,
        'share': rl(share[:6], 4), 'cum3': r(share[:3].sum(), 4),
        'loadings': [[r(V[i, j], 3) for j in range(nf)] for i in range(len(names))],
        'factors': {'labels': [mlab(k) for k in ks], 'f1': rl(F[:, 0], 3), 'f2': rl(F[:, 1], 3), 'f3': rl(F[:, 2], 3)},
        'bridge': {'rows': tab(br, ['Constant', 'Factor 1 (quarter average)', 'Factor 2', 'Factor 3', 'GDP growth last quarter']), 'r2': r(br.rsquared, 3), 'n': int(br.nobs), 'se': r(rsd, 3),
                   'labels': [qlab(q) for q in qs], 'actual': rl([gq[q] for q in qs], 2), 'fitted': rl(br.fittedvalues, 2)},
        'nowcast': now, 'last_gdp': {'q': qlab(lastq), 'value': r(gq[lastq], 2)},
        'favar': {'p': vp, 'h': list(range(25)), 'call': rl(oi[:, 2], 3), 'resp': resp, 'resp_labels': {n: lab_[n] for n in resp}}}
except Exception as e:
    M2['errors']['dfm'] = str(e)[:300]

# ---------------------------------------------------------------- D. SARIMAX: inflation with drivers
try:
    pi, xd, cl = ser('infl'), ser('xr_dep'), ser('call')
    ks = tail_run({k for k in pi if (k - 3) in xd and (k - 6) in cl})
    y = np.array([pi[k] for k in ks])
    exg = np.column_stack([[xd[k - 3] for k in ks], [cl[k - 6] for k in ks]])
    cands = [((1, 0, 0), (0, 0, 0, 0)), ((1, 0, 1), (0, 0, 0, 0)), ((2, 0, 0), (0, 0, 0, 0)), ((1, 0, 0), (1, 0, 0, 12)), ((1, 0, 1), (1, 0, 0, 12))]
    best = None
    for o, so in cands:
        try:
            m = SARIMAX(y, exog=exg, order=o, seasonal_order=so, trend='c').fit(disp=False)
            if best is None or m.aic < best[0].aic:
                best = (m, o, so)
        except Exception:
            pass
    m, o, so = best
    base = SARIMAX(y, order=o, seasonal_order=so, trend='c').fit(disp=False)
    e1, e2 = [], []
    for t in range(len(y) - 24, len(y)):
        try:
            mm = SARIMAX(y[:t], exog=exg[:t], order=o, seasonal_order=so, trend='c').fit(disp=False)
            bb = SARIMAX(y[:t], order=o, seasonal_order=so, trend='c').fit(disp=False)
            e1.append(y[t] - float(mm.forecast(1, exog=exg[t:t + 1])[0]))
            e2.append(y[t] - float(bb.forecast(1)[0]))
        except Exception:
            pass
    e1, e2 = np.array(e1), np.array(e2)
    dm = None
    if len(e1) > 10:
        d_ = e1 ** 2 - e2 ** 2
        dm = float(d_.mean() / (d_.std(ddof=1) / math.sqrt(len(d_))))
    kl = ks[-1]
    kf = list(range(kl + 1, kl + 13))

    def fut(dep_add=0.0, call_add=0.0):
        rows = []
        for k in kf:
            xv_ = xd.get(k - 3, xd[max(x for x in xd if x <= kl)]) + (dep_add if (k - 3) > kl else 0)
            cv__ = cl.get(k - 6, cl[max(x for x in cl if x <= kl)]) + (call_add if (k - 6) > kl else 0)
            rows.append([xv_, cv__])
        return np.array(rows)
    fb = m.get_forecast(12, exog=fut())
    sf = fb.summary_frame(alpha=0.2)
    f_dep = m.get_forecast(12, exog=fut(dep_add=5)).predicted_mean
    f_call = m.get_forecast(12, exog=fut(call_add=1)).predicted_mean
    pn = list(m.param_names)
    nice = {'intercept': 'Constant', 'x1': 'Taka depreciation, 3 months earlier', 'x2': 'Call money rate, 6 months earlier', 'ar.L1': 'Inflation last month (AR 1)', 'ar.L2': 'Inflation 2 months earlier (AR 2)',
            'ma.L1': 'Last month\u2019s surprise (MA 1)', 'ar.S.L12': 'Inflation 12 months earlier (seasonal AR)', 'sigma2': 'Shock variance'}
    lb = acorr_ljungbox(m.resid[13:], lags=[12], return_df=True)
    jb = stats.jarque_bera(m.resid[13:])
    M2['sarimax'] = {
        'sample': [mlab(ks[0]), mlab(ks[-1])], 'n': len(ks), 'order': list(o), 'sorder': list(so),
        'rows': [{'term': nice.get(n, n), 'coef': r(b), 'se': r(s), 'p': r(pv)} for n, b, s, pv in zip(pn, m.params, m.bse, m.pvalues)],
        'aic': r(m.aic, 2), 'bic': r(m.bic, 2), 'aic_base': r(base.aic, 2), 'bic_base': r(base.bic, 2),
        'rmse': r(np.sqrt(np.mean(e1 ** 2)) if len(e1) else None, 3), 'rmse_base': r(np.sqrt(np.mean(e2 ** 2)) if len(e2) else None, 3), 'dm': r(dm, 3),
        'dm_p': r(2 * (1 - stats.norm.cdf(abs(dm))) if dm is not None else None, 4), 'nbt': int(len(e1)),
        'lb_p': r(float(lb['lb_pvalue'].iloc[0]), 4), 'jb_p': r(float(jb.pvalue), 4),
        'hist': {'labels': [mlab(k) for k in ks[-60:]], 'actual': rl(y[-60:], 2), 'fitted': rl(np.asarray(m.fittedvalues)[-60:], 2)},
        'fc': {'labels': [mlab(k) for k in kf], 'base': rl(sf['mean'], 2), 'lo': rl(sf['mean_ci_lower'], 2), 'hi': rl(sf['mean_ci_upper'], 2), 'dep5': rl(f_dep, 2), 'call1': rl(f_call, 2)}}
except Exception as e:
    M2['errors']['sarimax'] = str(e)[:300]

# ---------------------------------------------------------------- E. 1-2-3 CGE model
try:
    ex, im = wdi('exports'), wdi('imports')
    yr = max(k for k in ex if k in im)
    E0, M0, X0 = ex[yr], im[yr], 100.0
    D0 = X0 - E0
    TM = 0.10

    def calib(om, sg, tm=TM):
        rt = 1 + 1 / om
        gam = 1 / (1 + (E0 / D0) ** (1 / om))
        aT = X0 / (gam * E0 ** rt + (1 - gam) * D0 ** rt) ** (1 / rt)
        k = (1 + tm) * (M0 / D0) ** (1 / sg)
        dl = k / (1 + k)
        rho = 1 / sg - 1
        aQ = (D0 + (1 + tm) * M0) / (dl * M0 ** (-rho) + (1 - dl) * D0 ** (-rho)) ** (-1 / rho) if abs(rho) > 1e-9 else 1.0
        return dict(om=om, sg=sg, rt=rt, gam=gam, aT=aT, dl=dl, rho=rho, aQ=aQ, tm0=tm)

    def solve(P, pwe=1.0, pwm=1.0, tm=None, B=None):
        tm = P['tm0'] if tm is None else tm
        B = (M0 - E0) if B is None else B

        def parts(R):
            PE, PM = R * pwe, R * pwm * (1 + tm)
            kE = (PE * (1 - P['gam']) / P['gam']) ** P['om']
            D = X0 / (P['aT'] * (P['gam'] * kE ** P['rt'] + (1 - P['gam'])) ** (1 / P['rt']))
            E = kE * D
            M = D * ((1 / PM) * P['dl'] / (1 - P['dl'])) ** P['sg']
            return E, D, M, PE, PM
        f = lambda R: pwm * parts(R)[2] - pwe * parts(R)[0] - B
        R = optimize.brentq(f, 0.05, 20.0)
        E, D, M, PE, PM = parts(R)
        rho = P['rho']
        Q = P['aQ'] * (P['dl'] * M ** (-rho) + (1 - P['dl']) * D ** (-rho)) ** (-1 / rho) if abs(rho) > 1e-9 else D + M
        return dict(R=R, E=E, D=D, M=M, Q=Q, rev=tm * R * pwm * M)

    P = calib(1.5, 0.9)
    b0 = solve(P)
    ch = lambda s: {k: r((s[k] / b0[k] - 1) * 100, 2) for k in ['R', 'E', 'M', 'D', 'Q', 'rev']}
    Bb = M0 - E0
    scen = [('Tariff rate halved (10% to 5%)', dict(tm=TM / 2)), ('Export prices 10% lower', dict(pwe=0.9)),
            ('Remittances and foreign savings 2% of GDP lower', dict(B=Bb - 2)), ('Import prices 15% higher (oil and food)', dict(pwm=1.15)),
            ('LDC graduation: export prices 5% lower', dict(pwe=0.95))]
    rows = [dict(name=n, **ch(solve(P, **kw))) for n, kw in scen]
    sens = []
    for om in [0.5, 1.0, 1.5, 3.0]:
        row = []
        for sg in [0.5, 0.9, 2.0]:
            Pq = calib(om, sg)
            bq = solve(Pq)
            sq = solve(Pq, pwe=0.9)
            row.append(r((sq['E'] / bq['E'] - 1) * 100, 2))
        sens.append({'om': om, 'vals': row})
    M2['cge'] = {'year': yr, 'E0': r(E0, 2), 'M0': r(M0, 2), 'D0': r(D0, 2), 'B0': r(Bb, 2), 'tm': TM, 'om': 1.5, 'sg': 0.9,
                 'gam': r(P['gam'], 4), 'dl': r(P['dl'], 4), 'aT': r(P['aT'], 4), 'aQ': r(P['aQ'], 4), 'rows': rows, 'sens': sens, 'sg_grid': [0.5, 0.9, 2.0],
                 'remit_gdp': r(wdi('remittances').get(yr), 2)}
except Exception as e:
    M2['errors']['cge'] = str(e)[:300]

# ---------------------------------------------------------------- F. Five-year forecasts from every model, with validation
try:
    from statsmodels.tsa.exponential_smoothing.ets import ETSModel
    from statsmodels.tsa.forecasting.theta import ThetaModel
    from statsmodels.stats.diagnostic import het_arch, breaks_cusumolsresid
    Z80, Z95 = 1.2815516, 1.959964
    AR_ = OUT.get('arima', {})
    NAMES = {'rw': 'Random walk with drift', 'ar': 'Autoregression (AR, BIC)', 'arima': 'ARIMA (site specification)', 'ets': 'Exponential smoothing (ETS, damped trend)', 'theta': 'Theta method',
             'mean': 'Historical mean', 'var': 'VAR (inflation, money, call rate, Taka)', 'vecm': 'VECM (imports, exports, remittances)', 'sarimax': 'SARIMAX (Taka and call-rate drivers)', 'ens': 'Ensemble (accuracy-weighted)'}

    def fy_of(k, f): return k // 12 + (1 if k % 12 >= 6 else 0) if f == 'M' else (k // 4 + (1 if k % 4 >= 2 else 0) if f == 'Q' else k)

    def f_rw(z, H):
        dz = np.diff(z); h = np.arange(1, H + 1)
        return z[-1] + dz.mean() * h, dz.std(ddof=1) * np.sqrt(h), None

    def f_mean(z, H):
        return np.full(H, z.mean()), np.full(H, z.std(ddof=1)), None

    def f_sar(z, H, order, sorder=(0, 0, 0, 0), trend='n'):
        r = SARIMAX(z, order=order, seasonal_order=sorder, trend=trend).fit(disp=False)
        f = r.get_forecast(H)
        return np.asarray(f.predicted_mean), np.sqrt(np.maximum(np.asarray(f.var_pred_mean), 1e-12)), r

    def f_ets(z, H, seas):
        import pandas as _pd
        r = ETSModel(_pd.Series(np.asarray(z, float)), error='add', trend='add', damped_trend=True, seasonal='add' if seas else None, seasonal_periods=12 if seas else None).fit(disp=False, maxiter=2000)
        sf = r.get_prediction(start=len(z), end=len(z) + H - 1).summary_frame(alpha=0.2)
        return np.asarray(sf['mean']), np.maximum(np.asarray(sf['pi_upper'] - sf['mean']) / Z80, 1e-9), r

    def f_theta(z, H, seas):
        r = ThetaModel(z, period=12 if seas else 1, deseasonalize=bool(seas)).fit()
        pi = r.prediction_intervals(H, alpha=0.2)
        return np.asarray(r.forecast(H)), np.maximum(np.asarray(pi['upper'] - pi['lower']) / (2 * Z80), 1e-9), r

    def ar_order(z, d, trend):
        best = None
        for pp in range(1, 7):
            try:
                rr = SARIMAX(z, order=(pp, d, 0), trend=trend).fit(disp=False)
                if best is None or rr.bic < best[0]:
                    best = (rr.bic, pp)
            except Exception:
                pass
        return best[1]

    def back(zz, H, lg):
        m, sd = zz
        if lg:
            return np.exp(m), np.exp(m - Z80 * sd), np.exp(m + Z80 * sd), np.exp(m - Z95 * sd), np.exp(m + Z95 * sd)
        return m, m - Z80 * sd, m + Z80 * sd, m - Z95 * sd, m + Z95 * sd

    def dmtest(e1, e2, h, step):
        d_ = np.asarray(e1) ** 2 - np.asarray(e2) ** 2
        n = len(d_)
        if n < 6 or d_.std(ddof=1) == 0:
            return None, None
        L = max(0, int(math.ceil(h / step)) - 1)
        g = [np.mean((d_[l:] - d_.mean()) * (d_[:n - l] - d_.mean())) for l in range(L + 1)]
        v = g[0] + 2 * sum((1 - l / (L + 1)) * g[l] for l in range(1, L + 1))
        if v <= 0:
            return None, None
        st = float(d_.mean() / math.sqrt(v / n))
        return round(st, 2), round(2 * (1 - stats.norm.cdf(abs(st))), 4)

    def chow(z, p, kb):
        Y = z[p:]; X = np.column_stack([np.ones(len(Y))] + [z[p - j:len(z) - j] for j in range(1, p + 1)])
        if kb - p < p + 8 or len(Y) - (kb - p) < p + 8:
            return None, None
        rss = lambda a, b: float(np.sum((b - a @ np.linalg.lstsq(a, b, rcond=None)[0]) ** 2))
        r0, r1, r2 = rss(X, Y), rss(X[:kb - p], Y[:kb - p]), rss(X[kb - p:], Y[kb - p:])
        kk = X.shape[1]; n = len(Y)
        Fv = ((r0 - r1 - r2) / kk) / ((r1 + r2) / (n - 2 * kk))
        return round(Fv, 3), round(float(stats.f.sf(Fv, kk, n - 2 * kk)), 4)

    SPEC = [('infl', 'M', 'mean'), ('food', 'M', 'mean'), ('nonfood', 'M', 'mean'), ('xr', 'M', 'mean'), ('res', 'M', 'last'), ('remit', 'M', 'sum'), ('exp', 'M', 'sum'), ('imp', 'M', 'sum'),
            ('m2', 'M', 'mean'), ('pcredit', 'M', 'mean'), ('call', 'M', 'mean'), ('gdp_q', 'Q', 'mean'), ('gdp_fy', 'FY', 'mean')]
    LOGS, SEAS = {'xr', 'res', 'remit', 'exp', 'imp'}, {'remit', 'exp', 'imp'}
    FC5 = {'built': M2['built'], 'names': NAMES, 'vars': {}}
    t_all = _t0 = __import__('time').time()
    # system models fitted once on the full sample
    sysfc = {}
    try:
        vk = ['infl', 'm2', 'call', 'xr_dep']; dv = {k: ser(k) for k in vk}
        ksv = tail_run({k for k in set.intersection(*[set(dv[k]) for k in vk]) if k >= 2010 * 12})
        Yv = np.column_stack([[dv[k][q] for q in ksv] for k in vk]); vres = VAR(Yv).fit(int(OUT['var']['p']))
        mid, lo, hi = vres.forecast_interval(Yv[-vres.k_ar:], steps=60, alpha=0.2)
        for j, k in enumerate(vk[:3]):
            sysfc[(k, 'var')] = (ksv[-1], mid[:, j], np.maximum((hi[:, j] - mid[:, j]) / Z80, 1e-9))
    except Exception as e:
        M2['errors']['fc5_var'] = str(e)[:200]
    try:
        e_, m_, rm_ = ser('exp'), ser('imp'), ser('remit'); ksx = tail_run(set(e_) & set(m_) & set(rm_))
        Yx = np.log(np.column_stack([[m_[k] for k in ksx], [e_[k] for k in ksx], [rm_[k] for k in ksx]]))
        vx = VECM(Yx, k_ar_diff=M2['vecm']['k_ar_diff'], coint_rank=max(1, M2['vecm']['rank']), deterministic='ci').fit()
        fcx, lox, hix = vx.predict(steps=60, alpha=0.2)
        for j, k in enumerate(['imp', 'exp', 'remit']):
            sysfc[(k, 'vecm')] = (ksx[-1], fcx[:, j], np.maximum((hix[:, j] - fcx[:, j]) / Z80, 1e-9))
    except Exception as e:
        M2['errors']['fc5_vecm'] = str(e)[:200]
    try:
        pi_, xd_, cl_ = ser('infl'), ser('xr_dep'), ser('call')
        kss = tail_run({k for k in pi_ if (k - 3) in xd_ and (k - 6) in cl_})
        ys = np.array([pi_[k] for k in kss]); xs = np.column_stack([[xd_[k - 3] for k in kss], [cl_[k - 6] for k in kss]])
        so = M2['sarimax']
        rs = SARIMAX(ys, exog=xs, order=tuple(so['order']), seasonal_order=tuple(so['sorder']), trend='c').fit(disp=False)
        lastx = [xd_[max(x for x in xd_ if x <= kss[-1])], cl_[max(x for x in cl_ if x <= kss[-1])]]
        fut = np.array([[xd_.get(k - 3, lastx[0]), cl_.get(k - 6, lastx[1])] for k in range(kss[-1] + 1, kss[-1] + 61)])
        fs = rs.get_forecast(60, exog=fut)
        sysfc[('infl', 'sarimax')] = (kss[-1], np.asarray(fs.predicted_mean), np.sqrt(np.asarray(fs.var_pred_mean)))
    except Exception as e:
        M2['errors']['fc5_sarimax'] = str(e)[:200]

    for key, fq, agg in SPEC:
        try:
            d = ser(key)
            ks = tail_run({k for k in d if k >= (2010 * 12 if fq == 'M' else 0)})
            lg, seas = key in LOGS, key in SEAS
            y = np.array([d[k] for k in ks]); z = np.log(y) if lg else y
            H = 60 if fq == 'M' else (20 if fq == 'Q' else 5)
            spec = AR_.get(key) or (AR_.get('exp') if key == 'imp' else None)
            dif = 1 if (lg or (spec and spec['order'][1] == 1)) else 0
            pa = ar_order(z, 1 if lg else 0, 'c')
            if spec:
                ao = (tuple(spec['order']), tuple(spec['sorder']), spec['trend'])
            else:
                cand = [((p_, 0, q_), (0, 0, 0, 0), 'c') for p_ in range(0, 3) for q_ in range(0, 3)]
                best = None
                for o_ in cand:
                    try:
                        rr = SARIMAX(z, order=o_[0], trend='c').fit(disp=False)
                        if best is None or rr.aic < best[0]:
                            best = (rr.aic, o_)
                    except Exception:
                        pass
                ao = best[1]
            fit = {
                'rw': lambda zz, HH: f_rw(zz, HH),
                'ar': lambda zz, HH: f_sar(zz, HH, (pa, 1 if lg else 0, 0), trend='c'),
                'arima': lambda zz, HH: f_sar(zz, HH, ao[0], ao[1], ao[2]),
                'ets': lambda zz, HH: f_ets(zz, HH, seas),
                'theta': lambda zz, HH: f_theta(zz, HH, seas)}
            if fq != 'M' or key in ('m2', 'pcredit', 'call', 'infl', 'food', 'nonfood'):
                fit['mean'] = lambda zz, HH: f_mean(zz, HH)

            def mk_var(j):
                def fn(zz, HH):
                    km = ks[len(zz) - 1]; idx = max(i for i, q in enumerate(ksv) if q <= km); off = km - ksv[idx]
                    rv_ = VAR(Yv[:idx + 1]).fit(int(OUT['var']['p']))
                    mid, lo, hi = rv_.forecast_interval(Yv[idx + 1 - rv_.k_ar:idx + 1], steps=HH + off, alpha=0.2)
                    return mid[off:, j], np.maximum((hi[off:, j] - mid[off:, j]) / Z80, 1e-9), None
                return fn

            def mk_vecm(j):
                def fn(zz, HH):
                    km = ks[len(zz) - 1]; idx = max(i for i, q in enumerate(ksx) if q <= km); off = km - ksx[idx]
                    rx_ = VECM(Yx[:idx + 1], k_ar_diff=M2['vecm']['k_ar_diff'], coint_rank=max(1, M2['vecm']['rank']), deterministic='ci').fit()
                    fc_, lo_, hi_ = rx_.predict(steps=HH + off, alpha=0.2)
                    return fc_[off:, j], np.maximum((hi_[off:, j] - fc_[off:, j]) / Z80, 1e-9), None
                return fn

            def fn_sx(zz, HH):
                km = ks[len(zz) - 1]; idx = max(i for i, q in enumerate(kss) if q <= km); off = km - kss[idx]
                so_ = M2['sarimax']
                rs_ = SARIMAX(ys[:idx + 1], exog=xs[:idx + 1], order=tuple(so_['order']), seasonal_order=tuple(so_['sorder']), trend='c').fit(disp=False)
                lx = [xd_[max(x for x in xd_ if x <= km)], cl_[max(x for x in cl_ if x <= km)]]
                fut_ = np.array([[xd_[k - 3] if (k - 3) <= km and (k - 3) in xd_ else lx[0], cl_[k - 6] if (k - 6) <= km and (k - 6) in cl_ else lx[1]] for k in range(kss[idx] + 1, kss[idx] + 1 + HH + off)])
                f_ = rs_.get_forecast(HH + off, exog=fut_)
                return np.asarray(f_.predicted_mean)[off:], np.sqrt(np.asarray(f_.var_pred_mean))[off:], rs_
            if key in ('infl', 'm2', 'call') and 'Yv' in globals():
                fit['var'] = mk_var(['infl', 'm2', 'call', 'xr_dep'].index(key))
            if key in ('imp', 'exp', 'remit') and 'Yx' in globals():
                fit['vecm'] = mk_vecm(['imp', 'exp', 'remit'].index(key))
            if key == 'infl' and 'ys' in globals():
                fit['sarimax'] = fn_sx
            res_full, models = {}, {}
            for mid_, fn in fit.items():
                try:
                    mm_, sd_, rr = fn(z, H)
                    res_full[mid_] = rr
                    models[mid_] = (mm_, sd_)
                except Exception as e:
                    M2['errors'][f'fc5_{key}_{mid_}'] = str(e)[:120]
            # back-test
            T = len(z)
            if fq == 'M':
                hs, step, origins = [1, 3, 6, 12, 24], 4, list(range(T - 96, T - 1, 4))
            elif fq == 'Q':
                hs, step, origins = [1, 2, 4, 8], 1, list(range(max(16, T - 20), T - 1))
            else:
                hs, step, origins = [1, 2, 3, 5], 1, list(range(max(15, T - 14), T - 1))
            E = {m: {h: [] for h in hs} for m in fit}
            C = {m: {h: [] for h in hs} for m in fit}
            FAIL = {m: 0 for m in fit}
            ylo, yhi = float(y.min()), float(y.max()); yrg = (yhi - ylo) or 1.0
            for o in origins:
                for mid_, fn in fit.items():
                    try:
                        mm_, sd_, _r = fn(z[:o], max(hs))
                        pt, l8, h8, _a, _b = back((mm_, sd_), max(hs), lg)
                        mr_ = getattr(_r, 'mle_retvals', None)
                        if (isinstance(mr_, dict) and mr_.get('converged') is False) or not np.all(np.isfinite(pt)) or pt.min() < ylo - 2 * yrg or pt.max() > yhi + 2 * yrg:
                            FAIL[mid_] += 1
                            continue
                    except Exception:
                        FAIL[mid_] += 1
                        continue
                    for h in hs:
                        if o + h - 1 < T:
                            act = y[o + h - 1]
                            E[mid_][h].append(act - pt[h - 1]); C[mid_][h].append(l8[h - 1] <= act <= h8[h - 1])
            bt = {'h': hs, 'step': step, 'origins': len(origins), 'first': ks[origins[0]] if origins else None, 'rmse': {}, 'mae': {}, 'bias': {}, 'cov80': {}, 'n': {}, 'dm': {}, 'fail': {m: FAIL[m] for m in fit}}
            for mid_ in fit:
                bt['rmse'][mid_] = [r(np.sqrt(np.mean(np.square(E[mid_][h]))), 4) if E[mid_][h] else None for h in hs]
                bt['mae'][mid_] = [r(np.mean(np.abs(E[mid_][h])), 4) if E[mid_][h] else None for h in hs]
                bt['bias'][mid_] = [r(np.mean(E[mid_][h]), 4) if E[mid_][h] else None for h in hs]
                bt['cov80'][mid_] = [r(np.mean(C[mid_][h]), 3) if C[mid_][h] else None for h in hs]
                bt['n'][mid_] = [len(E[mid_][h]) for h in hs]
                if mid_ != 'rw':
                    bt['dm'][mid_] = [list(dmtest(E[mid_][h], E['rw'][h], h, step)) if len(E[mid_][h]) == len(E['rw'][h]) and E[mid_][h] else [None, None] for h in hs]
            # accuracy-weighted ensemble (inverse MSE at the middle horizon)
            hm = hs[len(hs) // 2]
            wts = {m: 1 / (bt['rmse'][m][hs.index(hm)] ** 2) for m in models if m in bt['rmse'] and bt['rmse'][m][hs.index(hm)]}
            if wts:
                Wsum = sum(wts.values()); mus = [(models[m][0], models[m][1], wts[m] / Wsum) for m in wts]
                em = sum(w * a for a, _s, w in mus)
                ev = sum(w * (s_ ** 2 + (a - em) ** 2) for a, s_, w in mus)
                models['ens'] = (em, np.sqrt(ev))
                FCW = {m: round(wts[m] / Wsum, 3) for m in wts}
            else:
                FCW = {}
            outm = {}
            for mid_, (mm_, sd_) in models.items():
                pt, l8, h8, l9, h9 = back((np.asarray(mm_)[:H], np.asarray(sd_)[:H]), H, lg)
                dd = 3 if not lg else (1 if key in ('res', 'remit', 'exp', 'imp') else 3)
                outm[mid_] = {'mean': rl(pt, dd), 'lo80': rl(l8, dd), 'hi80': rl(h8, dd), 'lo95': rl(l9, dd), 'hi95': rl(h9, dd)}
            # failure tests on the ARIMA residuals and an AR regression
            diag = {}
            ra = res_full.get('arima')
            if ra is not None:
                rs_ = np.asarray(ra.resid)[max(13, sum(ao[0]) + 1):]
                lbq = acorr_ljungbox(rs_, lags=[min(12, len(rs_) // 4)], return_df=True)
                diag['ljungbox_p'] = r(float(lbq['lb_pvalue'].iloc[0]), 4)
                diag['arch_p'] = r(float(het_arch(rs_, nlags=min(12, len(rs_) // 5))[1]), 4)
                diag['jb_p'] = r(float(stats.jarque_bera(rs_).pvalue), 4)
            zz = np.diff(z) if dif else z
            pp_ = max(1, pa)
            Yr = zz[pp_:]; Xr = np.column_stack([np.ones(len(Yr))] + [zz[pp_ - j:len(zz) - j] for j in range(1, pp_ + 1)])
            ols_r = Yr - Xr @ np.linalg.lstsq(Xr, Yr, rcond=None)[0]
            cs_ = breaks_cusumolsresid(ols_r, ddof=Xr.shape[1])
            diag['cusum'] = [r(cs_[0], 3), r(cs_[1], 4)]
            off = 1 if dif else 0
            brk = {}
            for lab_, kb in ([('COVID-19 (April 2020)', 2020 * 12 + 3), ('Balance-of-payments pressure (July 2022)', 2022 * 12 + 6)] if fq == 'M' else
                             [('COVID-19 (2020-Q2)', 2020 * 4 + 1)] if fq == 'Q' else [('COVID-19 (FY2020)', 2020)]):
                if kb in ks:
                    brk[lab_] = list(chow(zz, pp_, ks.index(kb) - off))
            diag['chow'] = brk
            diag['converged'] = {m_: (bool(getattr(rr_, 'mle_retvals', {}).get('converged', True)) if isinstance(getattr(rr_, 'mle_retvals', None), dict) else True) for m_, rr_ in res_full.items()}
            diag['ar_p'] = pa; diag['transform'] = ('first difference of log' if lg else ('first difference' if dif else 'level')) + ' for the AR test regression'
            # heterogeneity across sub-periods
            meas = (np.array([(y[i] / y[i - (12 if fq == 'M' else 4 if fq == 'Q' else 1)] - 1) * 100 for i in range(12 if fq == 'M' else 4, len(y))]) if lg else y)
            mk_ = ks[len(ks) - len(meas):]
            per = ([('2010–2014', 2010 * 12, 2014 * 12 + 11), ('2015–2019', 2015 * 12, 2019 * 12 + 11), ('2020–latest', 2020 * 12, 10 ** 9)] if fq == 'M' else
                   [('2015–2019', 0, 2019 * 4 + 3), ('2020–latest', 2020 * 4, 10 ** 9)] if fq == 'Q' else [('FY1995–2009', 0, 2009), ('FY2010–2019', 2010, 2019), ('FY2020–latest', 2020, 10 ** 9)])
            groups, het = [], []
            for lab_, a_, b_ in per:
                g_ = np.array([v for k, v in zip(mk_, meas) if a_ <= k <= b_])
                if len(g_) > 5:
                    groups.append(g_)
                    rho_ = float(np.corrcoef(g_[1:], g_[:-1])[0, 1]) if g_.std() > 0 else None
                    het.append([lab_, len(g_), r(g_.mean(), 3), r(g_.std(ddof=1), 3), r(rho_, 3)])
            hp = {}
            if len(groups) >= 2:
                hp = {'levene_p': r(float(stats.levene(*groups).pvalue), 4), 'kruskal_p': r(float(stats.kruskal(*groups).pvalue), 4)}
            # robustness: parameters estimated before 2020, and neighbouring ARIMA orders
            rob = {}
            try:
                cut = ks.index(2019 * 12 + 11) + 1 if fq == 'M' else (ks.index(2019 * 4 + 3) + 1 if fq == 'Q' else ks.index(2019) + 1)
                if ra is not None and cut > 40:
                    rsub = SARIMAX(z[:cut], order=ao[0], seasonal_order=ao[1], trend=ao[2]).fit(disp=False)
                    rf = SARIMAX(z, order=ao[0], seasonal_order=ao[1], trend=ao[2]).filter(rsub.params)
                    fsub = np.asarray(rf.get_forecast(H).predicted_mean)
                    full_ = np.asarray(models['arima'][0])
                    tr = (lambda a: np.exp(a)) if lg else (lambda a: a)
                    hh = [h for h in ([12, 36, 60] if fq == 'M' else [4, 12, 20] if fq == 'Q' else [1, 3, 5]) if h <= H]
                    rob['subsample'] = {'h': hh, 'full': [r(tr(full_[h - 1]), 3) for h in hh], 'pre2020': [r(tr(fsub[h - 1]), 3) for h in hh]}
            except Exception as e:
                rob['subsample_error'] = str(e)[:100]
            try:
                p0, d0, q0 = ao[0]; vals_ = []
                for p_ in {max(0, p0 - 1), p0, p0 + 1}:
                    for q_ in {max(0, q0 - 1), q0, q0 + 1}:
                        try:
                            mm_, _s, _r = f_sar(z, H, (p_, d0, q_), ao[1], ao[2])
                            vals_.append(((p_, d0, q_), float(np.exp(mm_[-1]) if lg else mm_[-1]), float(np.exp(mm_[min(11, H - 1)]) if lg else mm_[min(11, H - 1)])))
                        except Exception:
                            pass
                if vals_:
                    rob['orders'] = {'n': len(vals_), 'end_min': r(min(v[1] for v in vals_), 3), 'end_max': r(max(v[1] for v in vals_), 3), 'h12_min': r(min(v[2] for v in vals_), 3), 'h12_max': r(max(v[2] for v in vals_), 3)}
            except Exception as e:
                rob['orders_error'] = str(e)[:100]
            # Monte Carlo simulation from the ARIMA model, aggregated to fiscal and calendar years
            sim = {}
            try:
                if ra is not None:
                    sm_ = np.asarray(ra.simulate(nsimulations=H, repetitions=1000, anchor='end')).reshape(H, -1)
                    paths = np.exp(sm_) if lg else sm_
                    fk = list(range(ks[-1] + 1, ks[-1] + H + 1))
                    for lab, per_of in ([('fy', lambda k: fy_of(k, fq)), ('cy', lambda k: k // 12 if fq == 'M' else k // 4)] if fq != 'FY' else [('fy', lambda k: k)]):
                        rows_ = []
                        need = 12 if fq == 'M' else (4 if fq == 'Q' else 1)
                        ids = sorted({per_of(k) for k in fk})
                        for pid in ids:
                            hist_k = [k for k in ks if per_of(k) == pid]
                            fut_i = [i for i, k in enumerate(fk) if per_of(k) == pid]
                            if len(hist_k) + len(fut_i) != need:
                                continue
                            hv = np.array([d[k] for k in hist_k])
                            block = np.vstack([np.repeat(hv[:, None], paths.shape[1], 1), paths[fut_i]]) if len(hist_k) else paths[fut_i]
                            aggv = block.mean(0) if agg == 'mean' else (block.sum(0) if agg == 'sum' else block[-1])
                            q_ = np.percentile(aggv, [5, 25, 50, 75, 95])
                            rows_.append([('FY' if lab == 'fy' else '') + str(pid), *[r(x, 3) for x in q_], len(hist_k)])
                        sim[lab] = rows_
            except Exception as e:
                sim['error'] = str(e)[:120]
            FC5['vars'][key] = {'label': (OUT['series'].get(key) or {}).get('label', key), 'unit': (OUT['series'].get(key) or {}).get('unit', ''), 'freq': fq, 'agg': agg, 'log': lg,
                                'k_last': ks[-1], 'H': H, 'models': outm, 'weights': FCW, 'bt': bt, 'diag': diag, 'het': {'rows': het, **hp, 'measure': 'year-on-year growth, %' if lg else 'level'},
                                'robust': rob, 'sim': sim, 'spec': {'arima': [list(ao[0]), list(ao[1]), ao[2]], 'ar_p': pa}}
        except Exception as e:
            M2['errors'][f'fc5_{key}'] = str(e)[:200]
    FC5['seconds'] = round(__import__('time').time() - t_all, 1)
    M2['fc5'] = FC5
except Exception as e:
    M2['errors']['fc5'] = str(e)[:300]

# ---------------------------------------------------------------- G. Nowcasting: every variable, naive to mixed-frequency factor model
try:
    from itertools import combinations
    import pandas as _pd
    from statsmodels.tsa.statespace.dynamic_factor_mq import DynamicFactorMQ
    _im, _rs = ser('imp'), ser('res')
    EXTRA = {'imp_g': {k: (_im[k] / _im[k - 12] - 1) * 100 for k in _im if (k - 12) in _im and _im[k - 12]},
             'res_g': {k: (_rs[k] / _rs[k - 12] - 1) * 100 for k in _rs if (k - 12) in _rs and _rs[k - 12]}}
    TG = ['infl', 'food', 'nonfood', 'm2', 'rm', 'pcredit', 'govcredit', 'lend', 'dep', 'spread', 'call', 'xr_dep', 'remit_g', 'exp_g', 'imp_g', 'res_g', 'tax_g', 'iip', 'cdr']
    NL = {k: (OUT['series'].get(k) or {}).get('label', k) for k in TG}; NL['imp_g'] = 'Import growth'; NL['res_g'] = 'Reserves growth'
    UN = {k: (OUT['series'].get(k) or {}).get('unit', '% y/y') for k in TG}; UN['imp_g'] = UN['res_g'] = '% y/y'
    DS = {k: (EXTRA[k] if k in EXTRA else ser(k)) for k in TG}
    END = {k: max(d) for k, d in DS.items()}; KMAX = max(END.values())
    POOL = [k for k in TG if min(DS[k]) <= 2012 * 12]          # predictors need a long history
    NEV, NSPLIT = 36, 18

    def ols_fit(Xm, yv):
        A = np.c_[np.ones(len(Xm)), Xm]; b = np.linalg.lstsq(A, yv, rcond=None)[0]
        return lambda Xn: np.c_[np.ones(len(Xn)), Xn] @ b

    def ridge_fit2(Xm, yv, lam):
        mu_, sd_ = Xm.mean(0), Xm.std(0) + 1e-9; Zm = (Xm - mu_) / sd_
        b = np.linalg.solve(Zm.T @ Zm + lam * np.eye(Zm.shape[1]), Zm.T @ (yv - yv.mean()))
        return lambda Xn: yv.mean() + ((Xn - mu_) / sd_) @ b

    def lasso_fit(Xm, yv, lam, it=80):
        mu_, sd_ = Xm.mean(0), Xm.std(0) + 1e-9; Zm = (Xm - mu_) / sd_; yc = yv - yv.mean(); n_ = len(yc)
        b = np.zeros(Zm.shape[1]); zz = (Zm ** 2).sum(0) / n_
        for _ in range(it):                                            # coordinate descent
            for j_ in range(len(b)):
                rj = yc - Zm @ b + Zm[:, j_] * b[j_]
                rho_ = Zm[:, j_] @ rj / n_
                b[j_] = np.sign(rho_) * max(abs(rho_) - lam, 0) / zz[j_]
        return lambda Xn: yv.mean() + ((Xn - mu_) / sd_) @ b, int((np.abs(b) > 1e-8).sum())

    def pick_lam(fitter, Xm, yv, grid):
        best = None
        for lam in grid:
            try:
                f_ = fitter(Xm[:-12], yv[:-12], lam); f_ = f_[0] if isinstance(f_, tuple) else f_
                e_ = float(np.mean((f_(Xm[-12:]) - yv[-12:]) ** 2))
                if best is None or e_ < best[0]:
                    best = (e_, lam)
            except Exception:
                pass
        return best[1] if best else grid[0]

    NC = {'built': M2['built'], 'kmax': mlab(KMAX), 'ragged': [[k, NL[k], mlab(END[k]), KMAX - END[k]] for k in sorted(TG, key=lambda k: (-END[k], k))], 'targets': {}}
    # mixed-frequency dynamic factor model on the whole panel (re-estimated at past origins for validation)
    gq = ser('gdp_q')
    panel_keys = [k for k in POOL]
    def dfm_fit(kcut, mask_like_now=True):
        idx = _pd.period_range(start=f'{2012}-01', end=mlab(kcut), freq='M')
        cols = {}
        for k in panel_keys:
            lag = (KMAX - END[k]) if mask_like_now else 0
            cols[k] = [DS[k].get(int(p_.year) * 12 + int(p_.month) - 1) if (int(p_.year) * 12 + int(p_.month) - 1) <= kcut - lag else np.nan for p_ in idx]
        Mdf = _pd.DataFrame(cols, index=idx)
        qcut = (kcut // 3) - 1 - (1 if mask_like_now else 0)          # GDP published with about a one-quarter lag
        qidx = _pd.period_range(start='2012Q1', end=f'{qcut // 4}Q{qcut % 4 + 1}', freq='Q')
        Qdf = _pd.DataFrame({'gdp_q': [gq.get(int(p_.year) * 4 + int(p_.quarter) - 1, np.nan) for p_ in qidx]}, index=qidx)
        mod = DynamicFactorMQ(Mdf, endog_quarterly=Qdf, factors=1, factor_orders=2, idiosyncratic_ar1=True, standardize=True)
        rr = mod.fit(disp=False, maxiter=300)
        try:
            fitted = rr.get_prediction(information_set='smoothed').predicted_mean   # Kalman-smoothed values, incl. missing cells
        except Exception:
            fitted = rr.predict()
        return Mdf, Qdf, rr, fitted
    dfm_now = None
    try:
        Mdf, Qdf, rr_now, fit_now = dfm_fit(KMAX, mask_like_now=False)
        dfm_now = (Mdf, Qdf, rr_now, fit_now)
        NC['dfm'] = {'llf': r(rr_now.llf, 2), 'n_m': Mdf.shape[1], 'iters': int(rr_now.mle_retvals.get('iter', 0)) if isinstance(rr_now.mle_retvals, dict) else None,
                     'loadings': [[k, r(float(v), 3)] for k, v in zip(Mdf.columns, np.asarray(rr_now.params[[c for c in rr_now.params.index if str(c).startswith('loading.0')][:len(Mdf.columns)]]).ravel())] if any(str(c).startswith('loading.0') for c in rr_now.params.index) else []}
    except Exception as e:
        M2['errors']['nc_dfm'] = str(e)[:200]
    # validate the DFM at past origins, re-estimated each time with today's publication-lag pattern
    dfm_err, dfm_gdp_err = {}, []
    try:
        for kc in range(KMAX - 24, KMAX, 2):
            Mdf_c, Qdf_c, rr_c, fit_c = dfm_fit(kc, mask_like_now=True)
            qn = kc // 3 - 1; pq_ = _pd.Period(mlab(qn * 3 + 2), 'M')
            if qn in gq and pq_ in fit_c.index and 'gdp_q' in fit_c.columns:
                dfm_gdp_err.append(gq[qn] - float(fit_c.loc[pq_, 'gdp_q']))
            for k in TG:
                if k not in Mdf_c.columns:
                    continue
                gap = KMAX - END[k]
                for j in range(1, gap + 1):
                    km = kc - gap + j
                    if km in DS[k] and km <= kc:
                        per = _pd.Period(mlab(km), 'M')
                        if per in fit_c.index:
                            dfm_err.setdefault((k, j), []).append(DS[k][km] - float(fit_c.loc[per, k]))
    except Exception as e:
        M2['errors']['nc_dfm_eval'] = str(e)[:200]
    for y in TG:
        try:
            dy = DS[y]; gap = KMAX - END[y]; G_ = max(gap, 1)
            res_t = {'label': NL[y], 'unit': UN[y], 'end': mlab(END[y]), 'gap': gap, 'by_j': []}
            for j in range(1, G_ + 1):
                usable = [x for x in POOL if x != y and END[x] - END[y] >= j] if gap else []
                months = sorted(k for k in dy if (k - j) in dy and k >= 2012 * 12 and all(k in DS[x] for x in usable))
                if len(months) < NEV + 30:
                    res_t['short'] = True
                    continue
                ev_months = months[-NEV:]
                def rows_(mm, xs):
                    return np.array([[dy[k - j], dy.get(k - j - 1, dy[k - j])] + [DS[x][k] for x in xs] for k in mm]), np.array([dy[k] for k in mm])
                # pre-rank single predictors on the training part only (before the evaluation window)
                tr0 = [k for k in months if k < ev_months[0]]
                singles = []
                for x in usable:
                    Xt, yt = rows_(tr0, [x])
                    if len(yt) > 30:
                        f_ = ols_fit(Xt, yt); singles.append((float(np.mean((f_(Xt) - yt) ** 2)), x))
                cand = [x for _, x in sorted(singles)[:10]]
                combos = [c for k_ in (1, 2, 3) for c in combinations(cand, k_)]
                E = {}
                def add(name, e): E.setdefault(name, []).append(e)
                preds_c = {c: [] for c in combos}
                lam_r, lam_l = 10, 0.05
                if usable and len(tr0) > 40:
                    Xa0, _ = rows_(tr0, usable); y0_ = np.array([dy[k] for k in tr0])
                    lam_r = pick_lam(ridge_fit2, Xa0, y0_, [0.1, 1, 10, 100]); lam_l = pick_lam(lambda a, b, l: lasso_fit(a, b, l), Xa0, y0_, [0.01, 0.05, 0.1, 0.3])
                for t in ev_months:
                    tr = [k for k in months if k <= t - j]
                    yt_ = np.array([dy[k] for k in tr]); act = dy[t]
                    add('Naive (last published value)', act - dy[t - j])
                    Xo, _ = rows_(tr, []); f_ = ols_fit(Xo, yt_); add('Own-lag autoregression', act - float(f_(rows_([t], [])[0])[0]))
                    for c in combos:
                        Xc, _ = rows_(tr, list(c)); f_ = ols_fit(Xc, yt_); pc_ = float(f_(rows_([t], list(c))[0])[0]); preds_c[c].append(pc_)
                    if usable:
                        Xa_, _ = rows_(tr, usable); xn_ = rows_([t], usable)[0]
                        if len(usable) >= 3:
                            mu_, sd_ = Xa_[:, 2:].mean(0), Xa_[:, 2:].std(0) + 1e-9
                            Zp = (Xa_[:, 2:] - mu_) / sd_; w_, V_ = np.linalg.eigh(np.cov(Zp.T)); V_ = V_[:, ::-1][:, :2]
                            Fm = np.c_[Xa_[:, :2], Zp @ V_]; fn_ = np.c_[xn_[:, :2], ((xn_[:, 2:] - mu_) / sd_) @ V_]
                            f_ = ols_fit(Fm, yt_); add('Factor-augmented bridge (2 principal components)', act - float(f_(fn_)[0]))
                        add('Ridge regression (all indicators)', act - float(ridge_fit2(Xa_, yt_, lam_r)(xn_)[0]))
                        add('Lasso (all indicators)', act - float(lasso_fit(Xa_, yt_, lam_l)[0](xn_)[0]))
                # combinations: rank on the first half of the evaluation window, test on the second
                acts = np.array([dy[t] for t in ev_months]); first, second = slice(0, NSPLIT), slice(NSPLIT, None)
                comb_rank = []
                for c in combos:
                    pc_ = np.array(preds_c[c]); comb_rank.append((float(np.sqrt(np.mean((acts[first] - pc_[first]) ** 2))), float(np.sqrt(np.mean((acts[second] - pc_[second]) ** 2))), c))
                comb_rank.sort(key=lambda z: z[0])
                if combos:
                    allp = np.mean([preds_c[c] for c in combos], axis=0); top5 = np.mean([preds_c[c] for _, _, c in comb_rank[:5]], axis=0)
                    for t_i in range(len(ev_months)):
                        add('Pooled: all indicator combinations', acts[t_i] - allp[t_i]); add('Selected: top-5 combinations', acts[t_i] - top5[t_i])
                    best1 = min((z for z in comb_rank if len(z[2]) == 1), key=lambda z: z[0])
                    pb = np.array(preds_c[best1[2]])
                    for t_i in range(len(ev_months)):
                        add('Best single-indicator bridge', acts[t_i] - pb[t_i])
                if (y, j) in dfm_err and len(dfm_err[(y, j)]) >= 6:
                    E['Mixed-frequency dynamic factor model'] = dfm_err[(y, j)]
                # scores on the second half (test period) for every method; DFM on its own origins
                sc = {}
                for name, e in E.items():
                    e = np.asarray(e); e2 = e[NSPLIT:] if name != 'Mixed-frequency dynamic factor model' else e
                    sc[name] = [r(np.sqrt(np.mean(e2 ** 2)), 4), r(np.mean(np.abs(e2)), 4), r(np.mean(e2), 4), len(e2)]
                # current nowcasts for the missing month(s)
                now = {}
                if gap:
                    km = END[y] + j
                    allm = sorted(k for k in dy if (k - j) in dy and k >= 2012 * 12 and all(k in DS[x] for x in usable))
                    yt_ = np.array([dy[k] for k in allm])
                    xo = np.array([[dy[km - j], dy.get(km - j - 1, dy[km - j])]])
                    now['Naive (last published value)'] = dy[km - j]
                    Xo, _ = rows_(allm, []); now['Own-lag autoregression'] = float(ols_fit(Xo, yt_)(xo)[0])
                    if usable:
                        xn_ = np.c_[xo, [[DS[x][km] for x in usable]]]
                        Xa_, _ = rows_(allm, usable)
                        lam = pick_lam(ridge_fit2, Xa_, yt_, [0.1, 1, 10, 100]); now['Ridge regression (all indicators)'] = float(ridge_fit2(Xa_, yt_, lam)(xn_)[0])
                        laml = pick_lam(lambda a, b, l: lasso_fit(a, b, l), Xa_, yt_, [0.01, 0.05, 0.1, 0.3]); fl_, nsel = lasso_fit(Xa_, yt_, laml); now['Lasso (all indicators)'] = float(fl_(xn_)[0])
                        if len(usable) >= 3:
                            mu_, sd_ = Xa_[:, 2:].mean(0), Xa_[:, 2:].std(0) + 1e-9; Zp = (Xa_[:, 2:] - mu_) / sd_
                            w_, V_ = np.linalg.eigh(np.cov(Zp.T)); V_ = V_[:, ::-1][:, :2]
                            now['Factor-augmented bridge (2 principal components)'] = float(ols_fit(np.c_[Xa_[:, :2], Zp @ V_], yt_)(np.c_[xo, ((xn_[:, 2:] - mu_) / sd_) @ V_])[0])
                        cp = {}
                        for c in combos:
                            Xc, _ = rows_(allm, list(c)); cp[c] = float(ols_fit(Xc, yt_)(np.c_[xo, [[DS[x][km] for x in c]]])[0])
                        if cp:
                            now['Pooled: all indicator combinations'] = float(np.mean(list(cp.values())))
                            now['Selected: top-5 combinations'] = float(np.mean([cp[c] for _, _, c in comb_rank[:5]]))
                            now['Best single-indicator bridge'] = cp[min((z for z in comb_rank if len(z[2]) == 1), key=lambda z: z[0])[2]]
                    if dfm_now is not None and y in dfm_now[0].columns:
                        per = _pd.Period(mlab(km), 'M')
                        if per in dfm_now[3].index:
                            now['Mixed-frequency dynamic factor model'] = float(dfm_now[3].loc[per, y])
                res_t['by_j'].append({'j': j, 'month': mlab(END[y] + j) if gap else None, 'usable': [[x, NL[x]] for x in usable], 'n_combos': len(combos),
                                      'scores': sc, 'n_test': len(ev_months) - NSPLIT, 'test_from': mlab(ev_months[NSPLIT]) if len(ev_months) > NSPLIT else None,
                                      'top': [[[NL[x] for x in c], r(a_, 4), r(b_, 4)] for a_, b_, c in comb_rank[:10]],
                                      'now': {k_: r(v_, 3) for k_, v_ in now.items()}})
            NC['targets'][y] = res_t
        except Exception as e:
            M2['errors'][f'nc_{y}'] = str(e)[:200]
    # GDP: quarterly nowcasts with bridge, combinations, U-MIDAS, ridge and the DFM
    try:
        qk = sorted(gq); lastq = qk[-1]
        ind = [x for x in POOL if x in DS]
        def qavg(x, q):
            ms_ = [q * 3 + i for i in range(3)]; v_ = [DS[x].get(m_) for m_ in ms_]
            return float(np.mean(v_)) if all(a is not None for a in v_) else None
        qrows = [q for q in qk if (q - 1) in gq and q >= 2016 * 4 and all(qavg(x, q) is not None for x in ind)]
        def QX(qs, xs): return np.array([[gq[q - 1]] + [qavg(x, q) for x in xs] for q in qs]), np.array([gq[q] for q in qs])
        evq = qrows[-12:]; Eq = {}
        def addq(n_, e_): Eq.setdefault(n_, []).append(e_)
        sing = []
        for x in ind:
            Xt, yt = QX([q for q in qrows if q < evq[0]], [x]); sing.append((float(np.mean((ols_fit(Xt, yt)(Xt) - yt) ** 2)), x))
        candq = [x for _, x in sorted(sing)[:8]]; combq = [c for k_ in (1, 2) for c in combinations(candq, k_)]
        pq = {c: [] for c in combq}
        for q in evq:
            tr = [z for z in qrows if z < q]; act = gq[q]
            addq('Naive (last published quarter)', act - gq[q - 1])
            Xo, yt = QX(tr, []); addq('Own-lag autoregression', act - float(ols_fit(Xo, yt)(QX([q], [])[0])[0]))
            for c in combq:
                Xc, yt = QX(tr, list(c)); pq[c].append(float(ols_fit(Xc, yt)(QX([q], list(c))[0])[0]))
            Xa_, yt = QX(tr, ind); lam = pick_lam(ridge_fit2, Xa_, yt, [1, 10, 100, 1000]); addq('Ridge regression (all indicators)', act - float(ridge_fit2(Xa_, yt, lam)(QX([q], ind)[0])[0]))
            bx = candq[0]
            Xm_ = np.array([[gq[z - 1]] + [DS[bx][z * 3 + i] for i in range(3)] for z in tr]); xm_ = np.array([[gq[q - 1]] + [DS[bx][q * 3 + i] for i in range(3)]])
            addq('U-MIDAS (best indicator, three monthly values)', act - float(ols_fit(Xm_, yt)(xm_)[0]))
        acts = np.array([gq[q] for q in evq])
        rk = sorted(((float(np.sqrt(np.mean((acts[:6] - np.array(pq[c])[:6]) ** 2))), float(np.sqrt(np.mean((acts[6:] - np.array(pq[c])[6:]) ** 2))), c) for c in combq), key=lambda z: z[0])
        allp = np.mean([pq[c] for c in combq], axis=0); top5 = np.mean([pq[c] for _, _, c in rk[:5]], axis=0)
        for i_ in range(len(evq)):
            addq('Pooled: all indicator combinations', acts[i_] - allp[i_]); addq('Selected: top-5 combinations', acts[i_] - top5[i_])
        scq = {n_: [r(np.sqrt(np.mean(np.asarray(e_)[6:] ** 2)), 3), r(np.mean(np.abs(np.asarray(e_)[6:])), 3), r(np.mean(np.asarray(e_)[6:]), 3), len(e_) - 6] for n_, e_ in Eq.items()}
        nowq = {}
        if len(dfm_gdp_err) >= 4:
            e_ = np.asarray(dfm_gdp_err); scq['Mixed-frequency dynamic factor model'] = [r(np.sqrt(np.mean(e_ ** 2)), 3), r(np.mean(np.abs(e_)), 3), r(np.mean(e_), 3), len(e_)]
        # nowcasts for the quarters after the last published one, filling missing months of indicators with their latest value (bridge practice)
        def qavg_fill(x, q):
            ms_ = [q * 3 + i for i in range(3)]; last_v = DS[x][max(DS[x])]
            return float(np.mean([DS[x].get(m_, last_v) for m_ in ms_])), sum(m_ in DS[x] for m_ in ms_)
        for q in [lastq + 1, lastq + 2]:
            row = {}
            Xo, yt = QX(qrows, []); prev = gq.get(q - 1, None)
            if prev is None:
                prev = row_prev if 'row_prev' in dir() else gq[lastq]
            row['Naive (last published quarter)'] = gq[lastq]
            row['Own-lag autoregression'] = float(ols_fit(Xo, yt)(np.array([[prev]]))[0])
            cps = {}
            for c in combq:
                Xc, yt = QX(qrows, list(c)); cps[c] = float(ols_fit(Xc, yt)(np.array([[prev] + [qavg_fill(x, q)[0] for x in c]]))[0])
            row['Pooled: all indicator combinations'] = float(np.mean(list(cps.values()))); row['Selected: top-5 combinations'] = float(np.mean([cps[c] for _, _, c in rk[:5]]))
            Xa_, yt = QX(qrows, ind); lam = pick_lam(ridge_fit2, Xa_, yt, [1, 10, 100, 1000]); row['Ridge regression (all indicators)'] = float(ridge_fit2(Xa_, yt, lam)(np.array([[prev] + [qavg_fill(x, q)[0] for x in ind]]))[0])
            if dfm_now is not None and 'gdp_q' in dfm_now[3].columns:
                pq_ = _pd.Period(mlab(q * 3 + 2), 'M')
                if pq_ in dfm_now[3].index:
                    row['Mixed-frequency dynamic factor model'] = float(dfm_now[3].loc[pq_, 'gdp_q'])
            months_avail = {NL[x]: qavg_fill(x, q)[1] for x in candq}
            row_prev = row['Pooled: all indicator combinations']
            nowq[qlab(q)] = {'now': {k_: r(v_, 2) for k_, v_ in row.items()}, 'months': months_avail}
        NC['gdp'] = {'last': [qlab(lastq), r(gq[lastq], 2)], 'scores': scq, 'n_test': len(evq) - 6, 'test_from': qlab(evq[6]), 'top': [[[NL[x] for x in c], r(a_, 3), r(b_, 3)] for a_, b_, c in rk[:10]],
                     'now': nowq, 'n_combos': len(combq), 'indicators': [NL[x] for x in candq]}
    except Exception as e:
        M2['errors']['nc_gdp'] = str(e)[:200]
    M2['nowcast'] = NC
except Exception as e:
    M2['errors']['nowcast'] = str(e)[:300]

# ---------------------------------------------------------------- H. ARIMA forecasts from every month since January 2023 (for the reality check)
try:
    RC = {}
    for key, fq, agg in SPEC[:11]:
        d = ser(key); lg = key in LOGS
        ks = tail_run({k for k in d if k >= 2010 * 12}); y = np.array([d[k] for k in ks]); z = np.log(y) if lg else y
        sp = (FC5['vars'].get(key) or {}).get('spec', {}).get('arima')
        if not sp:
            continue
        rows_, lo_, hi_ = [], [], []
        org = [k for k in ks if 2023 * 12 <= k < ks[-1]]
        for ko in org:
            i_ = ks.index(ko) + 1
            try:
                rr = SARIMAX(z[:i_], order=tuple(sp[0]), seasonal_order=tuple(sp[1]), trend=sp[2]).fit(disp=False)
                f_ = rr.get_forecast(24); mu_ = np.asarray(f_.predicted_mean); sd_ = np.sqrt(np.asarray(f_.var_pred_mean))
                tr = np.exp if lg else (lambda a: a)
                rows_.append(rl(tr(mu_), 3)); lo_.append(rl(tr(mu_ - Z80 * sd_), 3)); hi_.append(rl(tr(mu_ + Z80 * sd_), 3))
            except Exception:
                rows_.append(None); lo_.append(None); hi_.append(None)
        RC[key] = {'k0': org[0], 'start': ks[0], 'fc': rows_, 'lo80': lo_, 'hi80': hi_}
    M2['rc_arima'] = RC
except Exception as e:
    M2['errors']['rc_arima'] = str(e)[:200]

# ---------------------------------------------------------------- I. Checks for the Model library models
try:
    from statsmodels.stats.diagnostic import het_breuschpagan
    CK = {}
    def rtests(res_, exog_=None, lags=4):
        e_ = np.asarray(res_)
        o = {'lb_p': r(float(acorr_ljungbox(e_, lags=[min(lags, len(e_) // 4)], return_df=True)['lb_pvalue'].iloc[0]), 4), 'jb_p': r(float(stats.jarque_bera(e_).pvalue), 4)}
        if exog_ is not None:
            try:
                o['bp_p'] = r(float(het_breuschpagan(e_, exog_)[1]), 4)
            except Exception:
                pass
        return o
    def chow_reg(Yv, Xv, cut):
        rss = lambda a, b: float(np.sum((b - a @ np.linalg.lstsq(a, b, rcond=None)[0]) ** 2))
        k_ = Xv.shape[1]; n_ = len(Yv)
        if cut < k_ + 3 or n_ - cut < k_ + 3:
            return [None, None]
        r0, r1, r2 = rss(Xv, Yv), rss(Xv[:cut], Yv[:cut]), rss(Xv[cut:], Yv[cut:])
        F_ = ((r0 - r1 - r2) / k_) / ((r1 + r2) / (n_ - 2 * k_))
        return [r(F_, 3), r(float(stats.f.sf(F_, k_, n_ - 2 * k_)), 4)]
    # Keynesian model
    try:
        Xc_ = sm.add_constant(np.column_stack([yv, c1])); Xi_ = sm.add_constant(np.column_stack([y1 - y2, rv, i1])); Xm__ = sm.add_constant(np.column_stack([yv, m1]))
        cut = sum(1 for k in est if k < 2010)
        kc = {'tests': {'Consumption': {**rtests(cons.resid, Xc_), 'chow': chow_reg(cv, Xc_, cut)}, 'Investment': {**rtests(invm.resid, Xi_), 'chow': chow_reg(iv_, Xi_, cut)}, 'Imports': {**rtests(impm.resid, Xm__), 'chow': chow_reg(mv, Xm__, cut)}}, 'break': 'FY2010'}
        sub = []
        for lab_, sel in [('FY1996–FY2009', [i for i, k in enumerate(est) if k < 2010]), ('FY2010–latest', [i for i, k in enumerate(est) if k >= 2010])]:
            mo = sm.OLS(cv[sel], Xc_[sel]).fit(); sub.append([lab_, len(sel), r(mo.params[1], 3), r(mo.params[2], 3), r(mo.params[1] / (1 - mo.params[2]) if abs(1 - mo.params[2]) > 1e-6 else None, 3)])
        kc['sub'] = sub
        # stochastic simulation: resample the three equations' residuals jointly by year
        ec, ei, em = np.asarray(cons.resid), np.asarray(invm.resid), np.asarray(impm.resid); rng_ = np.random.default_rng(7)
        a0_, a1_, a2_ = cons.params; b0_, b1_, b2_, b3_ = invm.params; m0_, mc1_, mc2_ = impm.params; den_ = 1 - a1_ + mc1_
        def sim_s(aut, draw):
            L = {'Y': Y[w0 - 1], 'Y2': Y[w0 - 2], 'C': Cc[w0 - 1], 'I': Ii[w0 - 1], 'M': Mm[w0 - 1]}; outp = []
            for j_, k in enumerate(win):
                u = draw[j_]; a_ = aut.get(j_, 0.0)
                ik = b0_ + b1_ * (L['Y'] - L['Y2']) + b2_ * Rr[k] + b3_ * L['I'] + ei[u]
                yk = (a0_ + a2_ * L['C'] + a_ + ec[u] + ik + Xx[k] - m0_ - mc2_ * L['M'] - em[u] + Dd[k]) / den_
                outp.append(yk); L = {'Y': yk, 'Y2': L['Y'], 'C': a0_ + a1_ * yk + a2_ * L['C'] + ec[u], 'I': ik, 'M': m0_ + mc1_ * yk + mc2_ * L['M'] + em[u]}
            return np.array(outp)
        mul1, mul5, nb_ = [], [], 0
        Xc_o = sm.add_constant(np.column_stack([yv, c1]))
        for _ in range(500):                                   # pairs bootstrap: re-estimate all three equations
            ix = rng_.integers(0, len(est), len(est))
            try:
                ca_ = sm.OLS(cv[ix], Xc_o[ix]).fit().params; ia_ = sm.OLS(iv_[ix], Xi_[ix]).fit().params; ma_ = sm.OLS(mv[ix], Xm__[ix]).fit().params
            except Exception:
                continue
            dn = 1 - ca_[1] + ma_[1]
            if dn <= 0.05:
                continue
            def simb(aut):
                L = {'Y': Y[w0 - 1], 'Y2': Y[w0 - 2], 'C': Cc[w0 - 1], 'I': Ii[w0 - 1], 'M': Mm[w0 - 1]}; o_ = []
                for j_, k in enumerate(win):
                    a_ = aut.get(j_, 0.0); ik = ia_[0] + ia_[1] * (L['Y'] - L['Y2']) + ia_[2] * Rr[k] + ia_[3] * L['I']
                    yk = (ca_[0] + ca_[2] * L['C'] + a_ + ik + Xx[k] - ma_[0] - ma_[2] * L['M'] + Dd[k]) / dn
                    o_.append(yk); L = {'Y': yk, 'Y2': L['Y'], 'C': ca_[0] + ca_[1] * yk + ca_[2] * L['C'], 'I': ik, 'M': ma_[0] + ma_[1] * yk + ma_[2] * L['M']}
                return np.array(o_)
            mm_ = (simb({j: shock for j in range(len(win))}) - simb({})) / shock
            if np.all(np.isfinite(mm_)) and abs(mm_[min(4, len(mm_) - 1)]) < 50:
                mul1.append(mm_[0]); mul5.append(mm_[min(4, len(mm_) - 1)]); nb_ += 1
        kc['sim'] = {'impact': rl(np.percentile(mul1, [5, 50, 95]), 3), 'year5': rl(np.percentile(mul5, [5, 50, 95]), 3), 'n': nb_, 'method': 'pairs bootstrap, OLS'}
        CK['keynes'] = kc
    except Exception as e:
        M2['errors']['ck_keynes'] = str(e)[:150]
    # VECM
    try:
        e_, m_, rm_ = ser('exp'), ser('imp'), ser('remit'); ksv2 = tail_run(set(e_) & set(m_) & set(rm_))
        Yd2 = np.log(np.column_stack([[m_[k] for k in ksv2], [e_[k] for k in ksv2], [rm_[k] for k in ksv2]]))
        def vec_row(Yd_, kd_, det=0):
            jo_ = coint_johansen(Yd_, det_order=det, k_ar_diff=kd_); rk_ = 0
            for i_ in range(3):
                if jo_.lr1[i_] > jo_.cvt[i_, 1]:
                    rk_ = i_ + 1
                else:
                    break
            rr_ = VECM(Yd_, k_ar_diff=kd_, coint_rank=1, deterministic='ci').fit(); b_ = rr_.beta[:, 0]
            return rk_, r(-b_[1] / b_[0], 3), r(-b_[2] / b_[0], 3), rr_
        lagrows = []
        for kd_ in [1, 2, 3, 5, 11]:
            rk_, ex_, re_, _ = vec_row(Yd2, kd_); lagrows.append([kd_ + 1, rk_, ex_, re_])
        detrows = []
        for det, lab_ in [(-1, 'No constant'), (0, 'Constant'), (1, 'Constant and trend')]:
            jo_ = coint_johansen(Yd2, det_order=det, k_ar_diff=M2['vecm']['k_ar_diff']); rk_ = 0
            for i_ in range(3):
                if jo_.lr1[i_] > jo_.cvt[i_, 1]:
                    rk_ = i_ + 1
                else:
                    break
            detrows.append([lab_, rk_, r(jo_.lr1[0], 2), r(jo_.cvt[0, 1], 2)])
        cutv = sum(1 for k in ksv2 if k <= 2019 * 12 + 11)
        rk_s, ex_s, re_s, _ = vec_row(Yd2[:cutv], M2['vecm']['k_ar_diff'])
        _, _, _, rfull = vec_row(Yd2, M2['vecm']['k_ar_diff'])
        wt = rfull.test_whiteness(nlags=12); nt = rfull.test_normality()
        CK['vecm'] = {'lags': lagrows, 'det': detrows, 'sub': {'to': mlab(ksv2[cutv - 1]), 'rank': rk_s, 'el_exp': ex_s, 'el_rem': re_s}, 'white_p': r(float(wt.pvalue), 4), 'normal_p': r(float(nt.pvalue), 4)}
    except Exception as e:
        M2['errors']['ck_vecm'] = str(e)[:150]
    # SARIMAX
    try:
        pi_, xd_, cl_ = ser('infl'), ser('xr_dep'), ser('call'); so_ = M2['sarimax']; grid_ = []
        for la in [1, 3, 6]:
            for lc in [3, 6, 9, 12]:
                kk_ = tail_run({k for k in pi_ if (k - la) in xd_ and (k - lc) in cl_})
                yy = np.array([pi_[k] for k in kk_]); xx = np.column_stack([[xd_[k - la] for k in kk_], [cl_[k - lc] for k in kk_]])
                rr_ = SARIMAX(yy, exog=xx, order=tuple(so_['order']), seasonal_order=tuple(so_['sorder']), trend='c').fit(disp=False)
                pn_ = list(rr_.param_names); grid_.append([la, lc, r(rr_.params[pn_.index('x1')], 4), r(rr_.pvalues[pn_.index('x1')], 3), r(rr_.params[pn_.index('x2')], 4), r(rr_.pvalues[pn_.index('x2')], 3), r(rr_.aic, 1)])
        kk_ = tail_run({k for k in pi_ if (k - 3) in xd_ and (k - 6) in cl_}); subr = []
        for lab_, sel in [('to December 2019', [i for i, k in enumerate(kk_) if k <= 2019 * 12 + 11]), ('January 2020 onwards', [i for i, k in enumerate(kk_) if k >= 2020 * 12])]:
            yy = np.array([pi_[kk_[i]] for i in sel]); xx = np.column_stack([[xd_[kk_[i] - 3] for i in sel], [cl_[kk_[i] - 6] for i in sel]])
            rr_ = SARIMAX(yy, exog=xx, order=tuple(so_['order']), seasonal_order=tuple(so_['sorder']), trend='c').fit(disp=False); pn_ = list(rr_.param_names)
            subr.append([lab_, len(sel), r(rr_.params[pn_.index('x1')], 4), r(rr_.pvalues[pn_.index('x1')], 3), r(rr_.params[pn_.index('x2')], 4), r(rr_.pvalues[pn_.index('x2')], 3)])
        yy = np.array([pi_[k] for k in kk_]); xx = np.column_stack([[xd_[k - 3] for k in kk_], [cl_[k - 6] for k in kk_]])
        rr_ = SARIMAX(yy, exog=xx, order=tuple(so_['order']), seasonal_order=tuple(so_['sorder']), trend='c').fit(disp=False)
        CK['sarimax'] = {'grid': grid_, 'sub': subr, 'arch_p': r(float(het_arch(np.asarray(rr_.resid)[13:], nlags=12)[1]), 4)}
    except Exception as e:
        M2['errors']['ck_sarimax'] = str(e)[:150]
    # Dynamic factor model: number of factors, loading stability, response bands
    try:
        rows_f = []
        for nf_ in [1, 2, 3, 4]:
            Fk = Zs @ V[:, :nf_]; Fq_ = {q: Fk[ix].mean(0) for q, ix in byq.items() if len(ix) == 3}
            qq = [q for q in sorted(Fq_) if q in gq and (q - 1) in gq]
            Xb_ = np.column_stack([[Fq_[q][j] for q in qq] for j in range(nf_)] + [[gq[q - 1] for q in qq]]); yb_ = np.array([gq[q] for q in qq])
            e1_, e0_ = [], []
            for t_ in range(len(qq) - 12, len(qq)):
                f1_ = sm.OLS(yb_[:t_], sm.add_constant(Xb_[:t_])).fit(); e1_.append(yb_[t_] - float(f1_.predict(np.r_[1, Xb_[t_]][None, :])[0]))
                f0_ = sm.OLS(yb_[:t_], sm.add_constant(Xb_[:t_, -1:])).fit(); e0_.append(yb_[t_] - float(f0_.predict(np.r_[1, Xb_[t_, -1]][None, :])[0]))
            full_ = sm.OLS(yb_, sm.add_constant(Xb_)).fit()
            rows_f.append([nf_, r(full_.rsquared, 3), r(np.sqrt(np.mean(np.square(e1_))), 3), r(np.sqrt(np.mean(np.square(e0_))), 3)])
        h_ = len(Zs) // 2; tuck = []
        for j in range(2):
            ws = []
            for part in (Zs[:h_], Zs[h_:]):
                w2, V2 = np.linalg.eigh(np.corrcoef(part, rowvar=False)); ws.append(V2[:, np.argsort(w2)[::-1]][:, j])
            tuck.append(r(abs(float(ws[0] @ ws[1]) / (np.linalg.norm(ws[0]) * np.linalg.norm(ws[1]))), 3))
        lo_b, hi_b = vres.irf(24).errband_mc(orth=True, repl=300, signif=0.1, seed=7)
        jn = names.index('infl')
        CK['dfm'] = {'factors': rows_f, 'tucker': tuck, 'halves': [mlab(ks[0]), mlab(ks[h_ - 1]), mlab(ks[h_]), mlab(ks[-1])],
                     'infl_band': {'lo': rl(sd[jn] * (V[jn, 0] * lo_b[:, 0, 2] + V[jn, 1] * lo_b[:, 1, 2]), 3), 'hi': rl(sd[jn] * (V[jn, 0] * hi_b[:, 0, 2] + V[jn, 1] * hi_b[:, 1, 2]), 3)},
                     'bridge_tests': rtests(br.resid)}
    except Exception as e:
        M2['errors']['ck_dfm'] = str(e)[:150]
    # CGE: Monte Carlo over elasticities and the tariff; calibration check
    try:
        rng_ = np.random.default_rng(11); draws = {n_: {k: [] for k in ['R', 'E', 'M', 'Q']} for n_, _ in scen}
        for _ in range(1000):
            om_, sg_, tm_ = rng_.uniform(0.5, 4.0), rng_.uniform(0.4, 3.0), rng_.uniform(0.05, 0.15)
            Pq = calib(om_, sg_, tm_); bq = solve(Pq)
            for n_, kw in scen:
                kw2 = dict(kw)
                if 'tm' in kw2:
                    kw2['tm'] = tm_ / 2
                sq = solve(Pq, **kw2)
                for k in ['R', 'E', 'M', 'Q']:
                    draws[n_][k].append((sq[k] / bq[k] - 1) * 100)
        mc = [[n_] + [rl(np.percentile(draws[n_][k], [5, 50, 95]), 2) for k in ['R', 'E', 'M', 'Q']] for n_, _ in scen]
        b_chk = solve(P); calib_err = max(abs(b_chk['E'] - E0), abs(b_chk['M'] - M0), abs(b_chk['D'] - D0))
        CK['cge'] = {'mc': mc, 'n': 1000, 'ranges': {'omega': [0.5, 4.0], 'sigma': [0.4, 3.0], 'tariff': [0.05, 0.15]}, 'calib_err': r(calib_err, 8)}
    except Exception as e:
        M2['errors']['ck_cge'] = str(e)[:150]
    M2['checks'] = CK
except Exception as e:
    M2['errors']['checks'] = str(e)[:200]

# ---------------------------------------------------------------- J. Monetary transmission mechanism
try:
    tv = ['call', 'lend', 'pcredit', 'xr_dep', 'infl']; tl = ['Call money rate', 'Lending rate', 'Private credit growth', 'Taka depreciation', 'Inflation']
    dd_ = {k: ser(k) for k in tv}; kst = tail_run({k for k in set.intersection(*[set(dd_[k]) for k in tv]) if k >= 2012 * 12})
    Yt = np.column_stack([[dd_[k][q] for q in kst] for k in tv])
    vsel_ = VAR(Yt).select_order(maxlags=6); pt = int(min(max(vsel_.bic, 1), 6)); vr = VAR(Yt).fit(pt)
    ir = vr.irf(24); oi = ir.orth_irfs[:, :, 0]; sc_ = 1 / oi[0, 0]
    lo_, hi_ = ir.errband_mc(orth=True, repl=500, signif=0.1, seed=7)
    resp = {tv[j]: {'mean': rl(oi[:, j] * sc_, 4), 'lo': rl(lo_[:, j, 0] * sc_, 4), 'hi': rl(hi_[:, j, 0] * sc_, 4)} for j in range(5)}
    gc = []
    for a_, b_ in [('call', 'lend'), ('lend', 'pcredit'), ('pcredit', 'infl'), ('call', 'xr_dep'), ('xr_dep', 'infl'), ('call', 'infl'), ('infl', 'call')]:
        t_ = vr.test_causality(tv.index(b_), [tv.index(a_)], kind='f'); gc.append([tl[tv.index(a_)], tl[tv.index(b_)], r(float(t_.test_statistic), 3), r(float(t_.pvalue), 4)])
    fe = vr.fevd(24).decomp[4]; fev = {tl[j]: [r(fe[h, j] * 100, 1) for h in (5, 11, 23)] for j in range(5)}
    lend_, call_ = dd_['lend'], dd_['call']; kl = [k for k in kst if (k - 1) in lend_ and (k - 1) in call_]
    ol = sm.OLS(np.array([lend_[k] for k in kl]), sm.add_constant(np.column_stack([[call_[k] for k in kl], [call_[k - 1] for k in kl], [lend_[k - 1] for k in kl]]))).fit(cov_type='HAC', cov_kwds={'maxlags': 6})
    lr_lend = (ol.params[1] + ol.params[2]) / (1 - ol.params[3])
    xd_, pi_ = dd_['xr_dep'], dd_['infl']; kx = [k for k in kst if all((k - j) in xd_ for j in range(13)) and (k - 1) in pi_]
    Xp = np.column_stack([[xd_[k - j] for k in kx] for j in range(13)] + [[pi_[k - 1] for k in kx]]); op = sm.OLS(np.array([pi_[k] for k in kx]), sm.add_constant(Xp)).fit(cov_type='HAC', cov_kwds={'maxlags': 6})
    sr_pt = float(op.params[1:14].sum()); lr_pt = sr_pt / (1 - op.params[14]); Rm = np.zeros(len(op.params)); Rm[1:14] = 1; tpt = op.t_test(Rm)
    M2['mtm'] = {'sample': [mlab(kst[0]), mlab(kst[-1])], 'n': len(kst), 'p': pt, 'order': tl, 'irf': resp, 'granger': gc, 'fevd': fev, 'fevd_h': [6, 12, 24],
                 'lend_pt': {'impact': r(ol.params[1], 3), 'impact_p': r(ol.pvalues[1], 4), 'long_run': r(lr_lend, 3), 'persistence': r(ol.params[3], 3)},
                 'xr_pt': {'sum12': r(sr_pt, 3), 'p': r(float(tpt.pvalue), 4), 'long_run': r(lr_pt, 3), 'persistence': r(op.params[14], 3)}, 'stable': bool(vr.is_stable())}
except Exception as e:
    M2['errors']['mtm'] = str(e)[:200]

# ---------------------------------------------------------------- K. Calibration for the theoretical models
try:
    gF, ivF, pg_ = ser('gdp_fy'), ser('inv_gdp'), wdi('pop_growth'); rr_w = wdi('real_rate')
    kk = sorted(k for k in gF if k in ivF and (k - 1) in pg_)
    Yx_, lv = {}, 100.0
    for i_, k in enumerate(kk):
        if i_:
            lv *= 1 + gF[k] / 100
        Yx_[k] = lv
    Ix_ = {k: ivF[k] / 100 * Yx_[k] for k in kk}; DEL, ALP = 0.05, 0.4
    gy0 = float(np.mean([gF[k] for k in kk[1:11]])) / 100; Kx = {kk[0]: Ix_[kk[0]] / (gy0 + DEL)}
    for a_, b_ in zip(kk, kk[1:]):
        Kx[b_] = (1 - DEL) * Kx[a_] + Ix_[a_]
    Lx = {kk[0]: 100.0}
    for a_, b_ in zip(kk, kk[1:]):
        Lx[b_] = Lx[a_] * (1 + pg_[b_ - 1] / 100)
    acc = []
    for k in kk[1:]:
        gy_, gk_, gl_ = (Yx_[k] / Yx_[k - 1] - 1) * 100, (Kx[k] / Kx[k - 1] - 1) * 100, (Lx[k] / Lx[k - 1] - 1) * 100
        acc.append([k, gy_, ALP * gk_, (1 - ALP) * gl_, gy_ - ALP * gk_ - (1 - ALP) * gl_])
    dec_ = []
    for lab_, a_, b_ in [('FY1996–FY2005', 1996, 2005), ('FY2006–FY2015', 2006, 2015), ('FY2016–latest', 2016, 3000)]:
        sel = [x for x in acc if a_ <= x[0] <= b_]
        if sel:
            dec_.append([lab_] + [r(np.mean([x[j] for x in sel]), 2) for j in range(1, 5)])
    s_ = float(np.mean([ivF[k] for k in kk[-5:]])) / 100; n_ = float(np.mean([pg_[k - 1] for k in kk[-5:]])) / 100
    gtfp = float(np.mean([x[4] for x in acc if x[0] >= 2010])) / 100; g_ = gtfp / (1 - ALP)
    AL = {k: (Yx_[k] / Kx[k] ** ALP) ** (1 / (1 - ALP)) for k in kk}; kef = {k: Kx[k] / AL[k] for k in kk}
    kstar = (s_ / (n_ + g_ + DEL)) ** (1 / (1 - ALP)); lam = (1 - ALP) * (n_ + g_ + DEL)
    rbar = float(np.mean([rr_w[y_] for y_ in range(2015, 2026) if y_ in rr_w])) / 100 if rr_w else 0.04
    M2['theory'] = {'alpha': ALP, 'delta': DEL, 's': r(s_, 4), 'n': r(n_, 4), 'g': r(g_, 4), 'tfp': r(gtfp, 4), 'k_now': r(kef[kk[-1]], 4), 'k_star': r(kstar, 4), 'ratio': r(kef[kk[-1]] / kstar, 3),
                    'lambda': r(lam, 4), 'half_life': r(math.log(2) / lam, 1), 'last': f'FY{kk[-1]}', 'acc': dec_, 'acc_years': [[f'FY{x[0]}'] + [r(v, 2) for v in x[1:]] for x in acc],
                    'ky': r(Kx[kk[-1]] / Yx_[kk[-1]], 2), 'real_rate': r(rbar, 4), 'gdp_growth5': r(float(np.mean([gF[k] for k in kk[-5:]])), 2),
                    'savings_wdi': r(wdi('savings').get(max(wdi('savings'))), 2) if wdi('savings') else None,
                    'dsge': {x['sym']: x['v'] for x in (OUT.get('dsge', {}).get('params') or []) if isinstance(x, dict) and 'sym' in x},
                    'dsge_post': {x['sym']: x['post']['mean'] for x in (OUT.get('dsge', {}).get('bayes', {}).get('params') or []) if isinstance(x, dict) and 'post' in x},
                    'keynes': {'mpc_lr': r(M2['keynes']['mpc'] / (1 - M2['keynes']['cons']['rows'][2]['coef']), 3) if M2.get('keynes') else None, 'mpm_lr': r(impm.params[1] / (1 - impm.params[2]), 3) if M2.get('keynes') else None, 'inv_r': r(invm.params[2], 4) if M2.get('keynes') else None},
                    'tax_gdp': r(wdi('tax').get(max(wdi('tax'))), 2) if wdi('tax') else None, 'infl5': r(float(np.mean(list(ser('infl_avg').values())[-60:])), 2) if ser('infl_avg') else None}
except Exception as e:
    M2['errors']['theory'] = str(e)[:200]

OUT['models2'] = M2
MP.write_text(json.dumps(OUT, separators=(',', ':'), ensure_ascii=False, allow_nan=False), encoding='utf-8')
print('models2 written:', [k for k in M2 if k not in ('built', 'errors')], '| errors:', M2['errors'] or 'none')
