"""Bayesian estimation of a small open-economy New Keynesian DSGE model for Bangladesh.

Model: Lubik and Schorfheide (2007), "Do central banks respond to exchange rate movements? A structural investigation",
Journal of Monetary Economics 54(4), 1069-1087. Log-linear equations (quarterly, deviations from steady state, in %):
  IS      y = E y(+1) - O (R - E pi(+1)) - rho_z z - alpha O E dq(+1) + c (E ys(+1) - ys),  O = tau + alpha(2-alpha)(1-tau), c = alpha(2-alpha)(1-tau)/tau
  PC      pi = beta E pi(+1) + alpha beta E dq(+1) - alpha dq + (kappa/O)(y - ybar),        ybar = -c ys
  Rule    R = rho_R R(-1) + (1-rho_R)(psi1 pi + psi2 y + psi3 de) + eR
  CPI     pi = de + (1-alpha) dq + pis
  Shocks  dq, ys, pis, z follow AR(1) processes (terms of trade, world output, world inflation, technology growth)
Observables (demeaned, 2015Q3 onwards): real GDP growth y/y (BBS quarterly GDP), CPI inflation y/y and Taka depreciation
y/y (quarterly averages of Bangladesh Bank monthly data), and the call money rate (% a year). Year-on-year rates are the
sum of four quarterly model rates, so lags enter the measurement equations. Solution: Binder and Pesaran (1997)
iteration for y = P y(-1) + Q e with the uniqueness check that F = (A0 - A1 P)^-1 A1 has all roots inside the unit circle.
Likelihood: Kalman filter. Posterior: random-walk Metropolis-Hastings (An and Schorfheide 2007), two chains.
Run: python3 scripts/bd_dsge.py  ->  build/bd_dsge.json
"""
import json, math, os, pathlib, time
import numpy as np
from scipy import optimize, stats, linalg

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEED = 20261024
rng = np.random.default_rng(SEED)

# ------------------------------------------------------------------ data
bd = json.loads((ROOT / 'build' / 'bd_data.json').read_text())
def monthly(key):
    s = bd['series'][key]; y, m = int(s['s'][:4]), int(s['s'][5:7]); out = {}
    for i, v in enumerate(s['v']):
        if v is not None:
            k = (y * 12 + m - 1) + i; out[k] = v
    return out
def to_q(mon, need=2):
    acc = {}
    for k, v in mon.items():
        q = (k // 12) * 4 + (k % 12) // 3; acc.setdefault(q, []).append(v)
    return {q: sum(v) / len(v) for q, v in acc.items() if len(v) >= need}
def quarterly(key):
    s = bd['series'][key]; y, qq = int(s['s'][:4]), int(s['s'][-1]); out = {}
    for i, v in enumerate(s['v']):
        if v is not None:
            out[y * 4 + qq - 1 + i] = v
    return out
gdp = quarterly('gdp_q'); infl = to_q(monthly('infl'), 3); call = to_q(monthly('call'), 2); dep = to_q(monthly('xr_dep'), 3)
common = sorted(set(gdp) & set(infl) & set(call) & set(dep))
# longest contiguous block
best, st = (0, 0), 0
for i in range(1, len(common) + 1):
    if i == len(common) or common[i] != common[i - 1] + 1:
        if i - st > best[1] - best[0]: best = (st, i)
        st = i
Q = common[best[0]:best[1]]
qlab = lambda q: f'{q // 4}Q{q % 4 + 1}'
OBS_NAMES = ['Real GDP growth (y/y, %)', 'CPI inflation (y/y, %)', 'Call money rate (% a year)', 'Taka depreciation (y/y, %)']
Yraw = np.array([[gdp[q], infl[q], call[q], dep[q]] for q in Q])
MEANS = Yraw.mean(axis=0); Y = Yraw - MEANS; T, NOBS = Y.shape
print('sample', qlab(Q[0]), 'to', qlab(Q[-1]), T, 'quarters; means', MEANS.round(3))

# ------------------------------------------------------------------ parameters and priors
# (name, description, prior family, prior mean, prior sd)
PARAMS = [
    ('psi1', 'Policy response to inflation', 'gamma', 1.5, 0.5), ('psi2', 'Policy response to output', 'gamma', 0.25, 0.13), ('psi3', 'Policy response to depreciation', 'gamma', 0.25, 0.13),
    ('rhoR', 'Interest-rate smoothing', 'beta', 0.5, 0.2), ('alpha', 'Import share (openness)', 'beta', 0.2, 0.05), ('rA', 'Steady-state real rate (% a year)', 'gamma', 2.5, 1.0),
    ('kappa', 'Slope of the Phillips curve', 'gamma', 0.5, 0.25), ('tau', 'Intertemporal substitution elasticity', 'beta', 0.5, 0.2),
    ('rhoq', 'Persistence: terms of trade', 'beta', 0.4, 0.2), ('rhoz', 'Persistence: technology growth', 'beta', 0.2, 0.1), ('rhoys', 'Persistence: world output', 'beta', 0.9, 0.05), ('rhopis', 'Persistence: world inflation', 'beta', 0.8, 0.1),
    ('sR', 'SD: monetary policy shock', 'invgamma', 0.5, 0.5), ('sq', 'SD: terms-of-trade shock', 'invgamma', 1.5, 1.0), ('sz', 'SD: technology shock', 'invgamma', 1.0, 1.0), ('sys', 'SD: world output shock', 'invgamma', 1.5, 1.0), ('spis', 'SD: world inflation shock', 'invgamma', 1.0, 1.0)]
NP = len(PARAMS); NAMES = [p[0] for p in PARAMS]
def prior_obj(fam, m, s):
    if fam == 'gamma': k = m * m / (s * s); return stats.gamma(k, scale=s * s / m)
    if fam == 'beta': c = m * (1 - m) / (s * s) - 1; return stats.beta(m * c, (1 - m) * c)
    if fam == 'invgamma': a = m * m / (s * s) + 2; return stats.invgamma(a, scale=m * (a - 1))
PRI = [prior_obj(f, m, s) for _, _, f, m, s in PARAMS]
def log_prior(th):
    lp = 0.0
    for d, x, p in zip(PRI, th, PARAMS):
        if p[2] == 'beta' and not (0 < x < 1): return -np.inf
        if p[2] != 'beta' and x <= 0: return -np.inf
        lp += d.logpdf(x)
    return lp
def to_u(th): return np.array([math.log(x / (1 - x)) if p[2] == 'beta' else math.log(x) for x, p in zip(th, PARAMS)])
def from_u(u): return np.array([1 / (1 + math.exp(-v)) if p[2] == 'beta' else math.exp(v) for v, p in zip(u, PARAMS)])

# ------------------------------------------------------------------ model
VARS = ['y', 'pi', 'R', 'de', 'dq', 'ys', 'pis', 'z', 'ybar', 'yl1', 'yl2', 'yl3', 'yl4', 'pil1', 'pil2', 'pil3', 'del1', 'del2', 'del3', 'zl1', 'zl2', 'zl3']
IX = {v: i for i, v in enumerate(VARS)}; N = len(VARS)
SHOCKS = ['Monetary policy', 'Terms of trade', 'Technology', 'World output', 'World inflation']; NS = 5
def matrices(th):
    p = dict(zip(NAMES, th)); a, tau = p['alpha'], p['tau']; O = tau + a * (2 - a) * (1 - tau); c = a * (2 - a) * (1 - tau) / tau; beta = math.exp(-p['rA'] / 400)
    A0 = np.zeros((N, N)); A1 = np.zeros((N, N)); A2 = np.zeros((N, N)); B = np.zeros((N, NS)); i = IX
    A0[0, i['y']] = 1; A0[0, i['R']] = O; A0[0, i['z']] = p['rhoz']; A0[0, i['ys']] = c; A1[0, i['y']] = 1; A1[0, i['pi']] = O; A1[0, i['dq']] = -a * O; A1[0, i['ys']] = c
    A0[1, i['pi']] = 1; A0[1, i['dq']] = a; A0[1, i['y']] = -p['kappa'] / O; A0[1, i['ybar']] = p['kappa'] / O; A1[1, i['pi']] = beta; A1[1, i['dq']] = a * beta
    A0[2, i['ybar']] = 1; A0[2, i['ys']] = c
    r = 1 - p['rhoR']; A0[3, i['R']] = 1; A0[3, i['pi']] = -r * p['psi1']; A0[3, i['y']] = -r * p['psi2']; A0[3, i['de']] = -r * p['psi3']; A2[3, i['R']] = p['rhoR']; B[3, 0] = 1
    A0[4, i['pi']] = 1; A0[4, i['de']] = -1; A0[4, i['dq']] = -(1 - a); A0[4, i['pis']] = -1
    for row, v, rho, sh in ((5, 'dq', 'rhoq', 1), (6, 'ys', 'rhoys', 3), (7, 'pis', 'rhopis', 4), (8, 'z', 'rhoz', 2)):
        A0[row, i[v]] = 1; A2[row, i[v]] = p[rho]; B[row, sh] = 1
    lags = [('yl1', 'y'), ('yl2', 'yl1'), ('yl3', 'yl2'), ('yl4', 'yl3'), ('pil1', 'pi'), ('pil2', 'pil1'), ('pil3', 'pil2'), ('del1', 'de'), ('del2', 'del1'), ('del3', 'del2'), ('zl1', 'z'), ('zl2', 'zl1'), ('zl3', 'zl2')]
    for k, (v, src) in enumerate(lags):
        A0[9 + k, i[v]] = 1; A2[9 + k, i[src]] = 1
    return A0, A1, A2, B
def solve(th, tol=1e-10, maxit=3000):
    A0, A1, A2, B = matrices(th); P = np.zeros((N, N))
    for it in range(maxit):
        M = A0 - A1 @ P
        try: Pn = np.linalg.solve(M, A2)
        except np.linalg.LinAlgError: return None
        if not np.all(np.isfinite(Pn)): return None
        d = np.max(np.abs(Pn - P)); P = Pn
        if d < tol: break
    else:
        return None
    M = A0 - A1 @ P; Qm = np.linalg.solve(M, B); F = np.linalg.solve(M, A1)
    rp = np.max(np.abs(np.linalg.eigvals(P))); rf = np.max(np.abs(np.linalg.eigvals(F)))
    if rp >= 1 - 1e-9 or rf >= 1 - 1e-9: return None   # explosive, or indeterminate (multiple stable solutions)
    return P, Qm
H = np.zeros((NOBS, N)); i = IX
H[0, [i['y'], i['z'], i['zl1'], i['zl2'], i['zl3']]] = 1; H[0, i['yl4']] = -1
H[1, [i['pi'], i['pil1'], i['pil2'], i['pil3']]] = 1
H[2, i['R']] = 4
H[3, [i['de'], i['del1'], i['del2'], i['del3']]] = 1
def kalman(th, sol=None, keep=False):
    sol = sol or solve(th)
    if sol is None: return -np.inf, None
    P, Qm = sol; sig = np.asarray(th[12:17]); RQR = (Qm * sig ** 2) @ Qm.T
    try: V = linalg.solve_discrete_lyapunov(P, RQR)
    except Exception: return -np.inf, None
    V = 0.5 * (V + V.T); x = np.zeros(N); ll = 0.0; preds = []; filt = []; Ht = H.T; c0 = NOBS * math.log(2 * math.pi)
    for t in range(T):  # covariance kept symmetric every step (checked against the exact joint-Gaussian likelihood)
        yp = H @ x; HV = H @ V; Fv = HV @ Ht; Fv = 0.5 * (Fv + Fv.T); e = Y[t] - yp
        sgn, ld = np.linalg.slogdet(Fv)
        if sgn <= 0: return -np.inf, None
        Fi = np.linalg.inv(Fv); ll -= 0.5 * (c0 + ld + e @ Fi @ e)
        K = V @ Ht @ Fi; xu = x + K @ e; Vu = V - K @ HV; Vu = 0.5 * (Vu + Vu.T)
        if keep: preds.append(yp + MEANS); filt.append((xu.copy(), Vu.copy()))
        x = P @ xu; V = P @ Vu @ P.T + RQR; V = 0.5 * (V + V.T)
    return ll, ({'preds': preds, 'filt': filt} if keep else None)
def log_post(th):
    lp = log_prior(th)
    if not np.isfinite(lp): return -np.inf
    ll, _ = kalman(th)
    return lp + ll if np.isfinite(ll) else -np.inf

# ------------------------------------------------------------------ posterior mode
th0 = np.array([p[3] for p in PARAMS]); th0[NAMES.index('psi1')] = 1.6
assert np.isfinite(log_post(th0)), 'prior mean is not determinate'
t0 = time.time()
obj = lambda u: -log_post(from_u(u)) if np.all(np.abs(u) < 30) else 1e10
best = None
STARTS = [to_u(th0)] + [to_u(np.array([d.rvs(random_state=rng) if p[2] != 'beta' else min(0.95, max(0.05, d.rvs(random_state=rng))) for d, p in zip(PRI, PARAMS)])) for _ in range(2)]
if os.environ.get('MODE_FROM_JSON') and (ROOT / 'build' / 'bd_dsge.json').exists():  # re-run from the stored mode
    _old = json.load(open(ROOT / 'build' / 'bd_dsge.json')); STARTS = [to_u(np.array([q['mode'] for q in _old['params']]))]
for start in STARTS:
    if not np.isfinite(obj(start)) or obj(start) >= 1e9: continue
    r1 = optimize.minimize(obj, start, method='Nelder-Mead', options={'maxiter': 9000, 'maxfev': 9000, 'xatol': 1e-6, 'fatol': 1e-8})
    r2 = optimize.minimize(obj, r1.x, method='BFGS', options={'gtol': 1e-6, 'maxiter': 500})
    r = r2 if r2.fun < r1.fun else r1
    if best is None or r.fun < best.fun: best = r
mode = from_u(best.x); lp_mode = -best.fun; ll_mode = kalman(mode)[0]
print('mode found in %.1fs: log posterior %.3f, log likelihood %.3f' % (time.time() - t0, lp_mode, ll_mode))
def num_hess(f, x, h=None):
    k = len(x); h = h if h is not None else 1e-4 * np.maximum(np.abs(x), 1e-2); Hm = np.zeros((k, k)); f0 = f(x)
    for a in range(k):
        for b in range(a, k):
            def v(da, db):
                z = x.copy(); z[a] += da * h[a]; z[b] += db * h[b]; return f(z)
            Hm[a, b] = Hm[b, a] = (v(1, 0) - 2 * f0 + v(-1, 0)) / h[a] ** 2 if a == b else (v(1, 1) - v(1, -1) - v(-1, 1) + v(-1, -1)) / (4 * h[a] * h[b])
    return Hm
Hn = num_hess(lambda z: -log_post(z), mode)
try:
    Sig = np.linalg.inv(Hn); np.linalg.cholesky(Sig)
except np.linalg.LinAlgError:
    w, V = np.linalg.eigh(Hn); w = np.maximum(w, 1e-2 * np.max(w)); Sig = V @ np.diag(1 / w) @ V.T
mode_sd = np.sqrt(np.diag(Sig))

# ------------------------------------------------------------------ random-walk Metropolis-Hastings, two chains
import os
NDRAW, BURN, THIN = int(os.environ.get('NDRAW', 120000)), int(os.environ.get('BURN', 20000)), int(os.environ.get('THIN', 50))
# Two-stage random-walk Metropolis-Hastings: stage 1 uses the inverse Hessian at the mode as the proposal covariance;
# stage 2 uses the covariance of the stage-1 draws (better mixing for weakly identified parameters). Scales are tuned
# by short pilot runs to an acceptance rate of 22-38%.
def pilot(scale, Sg):
    g = np.random.default_rng(1); L = np.linalg.cholesky(Sg); x = mode.copy(); lp = log_post(x); a = 0
    for it in range(1500):
        prop = x + scale * (L @ g.standard_normal(NP)); lpp = log_post(prop)
        if np.isfinite(lpp) and math.log(g.random()) < lpp - lp: x, lp, a = prop, lpp, a + 1
    return a / 1500
def tune(Sg):
    sc = 2.38 / math.sqrt(NP)
    for _ in range(6):
        ar = pilot(sc, Sg); print('pilot scale %.3f acceptance %.3f' % (sc, ar), flush=True)
        if 0.22 <= ar <= 0.38: break
        sc *= math.exp((ar - 0.3) * 3)
    return sc
def chain2(start, seed, Sg, scale, ndraw, burn, thin):
    g = np.random.default_rng(seed); L = np.linalg.cholesky(Sg); x = start.copy(); lp = log_post(x)
    while not np.isfinite(lp): x = mode + 0.5 * (L @ g.standard_normal(NP)); lp = log_post(x)
    out, lps, acc = [], [], 0
    for it in range(ndraw):
        prop = x + scale * (L @ g.standard_normal(NP)); lpp = log_post(prop)
        if np.isfinite(lpp) and math.log(g.random()) < lpp - lp:
            x, lp = prop, lpp
            if it >= burn: acc += 1
        if it >= burn and (it - burn) % thin == 0: out.append(x.copy()); lps.append(lp)
    return np.array(out), acc / (ndraw - burn), np.array(lps)
t1 = time.time(); L0 = np.linalg.cholesky(Sig)
N1 = int(os.environ.get('NDRAW1', 15000)); B1 = N1 // 3
sc1 = tune(Sig)
import multiprocessing as mp
def _run(a): return chain2(*a)
def run_chains(specs):  # the chains are independent: run them in parallel processes (fork shares the model and data)
    try:
        with mp.get_context('fork').Pool(min(len(specs), os.cpu_count() or 1)) as pool: return pool.map(_run, specs)
    except Exception as e:
        print('parallel run failed (%s); running chains one after another' % e, flush=True); return [chain2(*a) for a in specs]
st1 = run_chains([(mode + 1.0 * (L0 @ rng.standard_normal(NP)), SEED + 10 + k, Sig, sc1, N1, B1, 5) for k in range(2)])
D1 = np.vstack([c[0] for c in st1]); Sig2 = np.cov(D1.T) + 1e-10 * np.eye(NP)
print('stage 1 %.1fs; acceptance %s' % (time.time() - t1, [round(c[1], 3) for c in st1]), flush=True)
scale = tune(Sig2); L2 = np.linalg.cholesky(Sig2)
starts = [mode + 1.5 * (L2 @ rng.standard_normal(NP)), mode + 1.5 * (L2 @ rng.standard_normal(NP))]
chains = run_chains([(s, SEED + k, Sig2, scale, NDRAW, BURN, THIN) for k, s in enumerate(starts)])
print('MCMC %.1fs; acceptance %s' % (time.time() - t1, [round(c[1], 3) for c in chains]), flush=True)
D = np.vstack([c[0] for c in chains]); LPS = np.concatenate([c[2] for c in chains])
np.savez_compressed(ROOT / 'build' / 'bd_dsge_draws.npz', names=np.array(NAMES), chain1=chains[0][0], chain2=chains[1][0], lp1=chains[0][2], lp2=chains[1][2])

# convergence: Gelman-Rubin R-hat and Geweke z (first 10% vs last 50% of each chain)
def _rhat(m):
    n = len(m[0]); W = np.mean([np.var(x, ddof=1) for x in m]); Bv = n * np.var([np.mean(x) for x in m], ddof=1)
    return float(math.sqrt(((n - 1) / n * W + Bv / n) / W)) if W > 0 else float('nan')
def rhat(k):  # Gelman and Rubin (1992), two chains
    return _rhat([c[0][:, k] for c in chains])
def rhat_split(k):  # split R-hat (Gelman et al. 2013, BDA3): each chain cut in half, so drift within a chain also counts
    m = []
    for c in chains:
        x = c[0][:, k]; h = len(x) // 2; m += [x[:h], x[h:2 * h]]
    return _rhat(m)
def spec0(v):
    # spectral density at frequency zero from an AR(p) fit, order by AIC (as coda's spectrum0.ar); returns S(0) and gamma(0)
    v = np.asarray(v, float) - np.mean(v); n = len(v); g0 = v @ v / n
    if g0 <= 0: return 0.0, 0.0
    pmax = int(min(10 * math.log10(n), n // 5)); acf = np.array([v[:n - l] @ v[l:] / n for l in range(pmax + 1)])
    best = (n * math.log(g0), 0, np.zeros(0), g0)
    for p_ in range(1, pmax + 1):
        R = linalg.toeplitz(acf[:p_]); phi = np.linalg.solve(R, acf[1:p_ + 1]); s2 = acf[0] - phi @ acf[1:p_ + 1]
        if s2 <= 0: break
        aic = n * math.log(s2) + 2 * p_
        if aic < best[0]: best = (aic, p_, phi, s2)
    _, p_, phi, s2 = best; den = (1 - phi.sum()) ** 2
    return (float(s2 / den) if den > 1e-8 else float('inf')), float(g0)
def geweke(x):  # Geweke (1992): first 10% against last 50%, variances from the spectral density at zero
    a, b = x[: len(x) // 10], x[len(x) // 2:]
    va, vb = spec0(a)[0] / len(a), spec0(b)[0] / len(b)
    return float((a.mean() - b.mean()) / math.sqrt(va + vb)) if va + vb > 0 else float('nan')
def ess(k):  # effective sample size summed over chains (n * gamma0 / S(0) per chain)
    tot = 0.0
    for c in chains:
        S0, g0 = spec0(c[0][:, k]); tot += len(c[0]) * g0 / S0 if S0 > 0 else 0
    return float(tot)
# marginal data density: modified harmonic mean (Geweke 1999), p = 0.9
def mhm(p=0.9):
    mu = D.mean(axis=0); V = np.cov(D.T); Vi = np.linalg.inv(V); ld = np.linalg.slogdet(V)[1]; crit = stats.chi2.ppf(p, NP)
    q = np.einsum('ij,jk,ik->i', D - mu, Vi, D - mu); f = np.where(q <= crit, np.exp(-0.5 * NP * math.log(2 * math.pi) - 0.5 * ld - 0.5 * q) / p, 0.0)
    # LPS holds the log posterior kernel (log prior + log likelihood)
    vals = np.log(np.maximum(f, 1e-300)) - LPS; m = np.max(vals[f > 0]); return float(-(m + math.log(np.mean(np.where(f > 0, np.exp(vals - m), 0)))))
mdd = mhm()

# ------------------------------------------------------------------ results: parameters
res_params = []
for k, (nm, desc, fam, pm, ps) in enumerate(PARAMS):
    x = D[:, k]; grid = np.linspace(max(1e-6, min(PRI[k].ppf(0.002), x.min())), max(PRI[k].ppf(0.998), x.max()), 80)
    kd = stats.gaussian_kde(x)
    res_params.append({'name': nm, 'desc': desc, 'prior': {'dist': fam, 'mean': pm, 'sd': ps}, 'mode': float(mode[k]), 'mode_sd': float(mode_sd[k]),
                       'post': {'mean': float(x.mean()), 'median': float(np.median(x)), 'sd': float(x.std(ddof=1)), 'lo5': float(np.quantile(x, 0.05)), 'hi95': float(np.quantile(x, 0.95))},
                       'rhat': rhat(k), 'rhat_split': rhat_split(k), 'ess': ess(k), 'geweke': [geweke(c[0][:, k]) for c in chains], 'ratio': float(x.std(ddof=1) / ps),
                       'grid': [round(float(g), 5) for g in grid], 'prior_pdf': [round(float(v), 6) for v in PRI[k].pdf(grid)], 'post_pdf': [round(float(v), 6) for v in kd(grid)],
                       'trace': [[round(float(v), 5) for v in c[0][::10, k]] for c in chains]})

# impulse responses (posterior median and 90% bands), variance decomposition, forecasts
HZ = 16; ND = 400; idx = rng.choice(len(D), ND, replace=False)
REP = {'Output (% deviation)': ('y', 1), 'CPI inflation (% a year)': ('pi', 4), 'Interest rate (% a year)': ('R', 4), 'Depreciation (% a year)': ('de', 4), 'Real exchange rate / terms of trade change (% a year)': ('dq', 4)}
irf = {s: {v: [] for v in REP} for s in SHOCKS}; vd_draws = []; fc_draws = []
def irf_draw(th, sol):
    P, Qm = sol; out = {}
    for j, s in enumerate(SHOCKS):
        x = Qm[:, j] * th[12 + j]; resp = {v: [] for v in REP}
        for h in range(HZ + 1):
            for v, (var, sc) in REP.items(): resp[v].append(float(sc * x[IX[var]]))
            x = P @ x
        out[s] = resp
    return out
def vd_draw(th, sol, hs=(1, 4, 8, 40)):
    P, Qm = sol; sig = np.array(th[12:17]); res = {}
    for hh in hs:
        tot = np.zeros((NOBS, NS)); Pk = np.eye(N)
        for k in range(hh):
            M = H @ Pk @ Qm; tot += (M ** 2) * sig ** 2; Pk = P @ Pk
        res[hh] = (tot / tot.sum(axis=1, keepdims=True)).tolist()
    return res
FH = 8
for n_, k in enumerate(idx):
    th = D[k]; sol = solve(th)
    if sol is None: continue
    r = irf_draw(th, sol)
    for s in SHOCKS:
        for v in REP: irf[s][v].append(r[s][v])
    vd_draws.append(vd_draw(th, sol))
    ll, kf = kalman(th, sol, keep=True); xT, VT = kf['filt'][-1]; P, Qm = sol; sig = np.array(th[12:17])
    try: Lc = np.linalg.cholesky(VT + 1e-12 * np.eye(N))
    except np.linalg.LinAlgError: Lc = np.zeros((N, N))
    x = xT + Lc @ rng.standard_normal(N); path = []
    for h in range(FH):
        x = P @ x + Qm @ (sig * rng.standard_normal(NS)); path.append((H @ x + MEANS).tolist())
    fc_draws.append(path)
q = lambda arr, p: [float(v) for v in np.quantile(np.array(arr), p, axis=0)]
irf_out = {s: {v: {'med': q(irf[s][v], 0.5), 'lo': q(irf[s][v], 0.05), 'hi': q(irf[s][v], 0.95)} for v in REP} for s in SHOCKS}
vd_out = {str(hh): np.mean([d[hh] for d in vd_draws], axis=0).round(4).tolist() for hh in (1, 4, 8, 40)}
FD = np.array(fc_draws); fc_out = {'periods': [qlab(Q[-1] + h + 1) for h in range(FH)], 'median': np.median(FD, axis=0).round(3).tolist(), 'lo5': np.quantile(FD, 0.05, axis=0).round(3).tolist(), 'hi95': np.quantile(FD, 0.95, axis=0).round(3).tolist(), 'lo16': np.quantile(FD, 0.16, axis=0).round(3).tolist(), 'hi84': np.quantile(FD, 0.84, axis=0).round(3).tolist()}
ll_m, kf_m = kalman(mode, keep=True)
fit = {'periods': [qlab(q_) for q_ in Q], 'actual': Yraw.round(3).tolist(), 'pred': np.array(kf_m['preds']).round(3).tolist()}
rmse = np.sqrt(np.mean((np.array(kf_m['preds'])[4:] - Yraw[4:]) ** 2, axis=0))
# determinacy check of the posterior draws and the prior
det_share = float(np.mean([solve(D[k]) is not None for k in rng.choice(len(D), 300, replace=False)]))
out = {'model': 'Lubik and Schorfheide (2007) small open-economy New Keynesian model', 'sample': {'from': qlab(Q[0]), 'to': qlab(Q[-1]), 'T': T}, 'observables': OBS_NAMES, 'means': MEANS.round(4).tolist(),
       'params': res_params, 'acceptance': [round(c[1], 4) for c in chains], 'draws': {'per_chain': NDRAW, 'burn_in': BURN, 'thin': THIN, 'kept': int(len(D)), 'stage1_per_chain': N1, 'proposal': 'stage 1: inverse Hessian at the mode; stage 2: covariance of the stage-1 draws'}, 'log_post_mode': round(lp_mode, 4), 'log_lik_mode': round(float(ll_mode), 4),
       'log_mdd': round(mdd, 4), 'shocks': SHOCKS, 'irf': irf_out, 'irf_vars': list(REP), 'vd': vd_out, 'forecast': fc_out, 'fit': fit, 'fit_rmse': rmse.round(4).tolist(), 'determinate_share': det_share,
       'seed': SEED, 'built': time.strftime('%Y-%m-%d'), 'vars': VARS, 'equations': __doc__.split('Observables')[0].strip()}
(ROOT / 'build' / 'bd_dsge.json').write_text(json.dumps(out))
print('saved build/bd_dsge.json; log MDD %.3f; R-hat max %.3f' % (mdd, max(p['rhat'] for p in res_params)))
for p in res_params: print('%-7s prior %-8s %.3f (%.3f)  post mean %.3f [%.3f, %.3f]  rhat %.3f' % (p['name'], p['prior']['dist'], p['prior']['mean'], p['prior']['sd'], p['post']['mean'], p['post']['lo5'], p['post']['hi95'], p['rhat']))
