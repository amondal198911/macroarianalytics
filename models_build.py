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

OUT['models2'] = M2
MP.write_text(json.dumps(OUT, separators=(',', ':'), ensure_ascii=False, allow_nan=False), encoding='utf-8')
print('models2 written:', [k for k in M2 if k not in ('built', 'errors')], '| errors:', M2['errors'] or 'none')
