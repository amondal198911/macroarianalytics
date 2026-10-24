#!/usr/bin/env python3
"""Curate the Bangladesh series for the website, grouped like Bangladesh Bank's Weekly Selected Economic Indicators.

Input : data/bd/bd_catalog.json and bd_M / bd_Q / bd_FY / bd_CY.json (Bangladesh Bank Monthly Economic Trends, September 2026
        edition and earlier editions; Bangladesh Bank / IMF National Summary Data Page tables), data/ref/bd_policy_rates.csv
        (policy-rate decisions compiled from Bangladesh Bank announcements as reported in the press, one source per row).
Output: build/bd_data.json  — categories, series (with source table, code and provenance for every series) and checks.
Every transformation is listed in the series 'how' and 'note' fields, so each figure on the site can be traced to its table.
"""
import csv, datetime, json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'data' / 'bd'
cat = json.load(open(D / 'bd_catalog.json'))
META = {r[0]: r for r in cat}
SER = {f: json.load(open(D / f'bd_{f}.json')) for f in ['M', 'Q', 'CY', 'FY']}


def r6(x):
    if x is None or not isinstance(x, (int, float)) or not math.isfinite(x):
        return None
    return float(f'{x:.6g}')


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
    k0 = mk(int(st[:4]), int(st[5:7])) if f == 'M' else qk(int(st[:4]), int(st[-1])) if f == 'Q' else int(st[2:]) if f == 'FY' else int(st)
    return {k0 + i: float(v) for i, v in enumerate(vals) if v is not None and math.isfinite(float(v))}


M = lambda c: get(c, 'M')
Qs = lambda c: get(c, 'Q')
FYs = lambda c: get(c, 'FY')


def splice(*ds):
    out = {}
    for d in ds:
        out.update(d)
    return out


def yoy(d, lag):
    return {k: (v / d[k - lag] - 1) * 100 for k, v in d.items() if (k - lag) in d and d[k - lag] > 0}


def roll(d, n, fn=sum):
    out = {}
    for k in d:
        w = [d.get(j) for j in range(k - n + 1, k + 1)]
        if all(v is not None for v in w):
            out[k] = fn(w)
    return out


def src_of(codes):
    out = []
    for c in codes:
        m = META.get(c)
        if not m:
            continue
        prov = m[6] or ''
        newest = prov.split('newest:')[1].split(';')[0].strip() if 'newest:' in prov else ''
        out.append({'code': c, 'pub': m[1], 'table': m[2], 'name': m[3], 'unit': m[4], 'prov': prov[:260], 'newest': newest})
    return out


C, ORDER = {}, []


def add(key, label, unit, f, cat_, codes, d, sub='', note='', how='raw', role='component', dec=2, good=None):
    if not d:
        print('  (skipped, no data):', key)
        return
    C[key] = dict(key=key, label=label, sub=sub, unit=unit, f=f, cat=cat_, how=how, note=note, src=src_of(codes), data=d, role=role, dec=dec, good=good)
    ORDER.append(key)


# =============================================================== 1. INFLATION AND PRICES
def fillholes(base, donors):
    out, ks, done = dict(base), sorted(base), []
    for k in range(ks[0], ks[-1] + 1):
        if k in out:
            continue
        for d in donors:
            nb = [j for j in (k - 1, k + 1) if j in base and j in d]
            if k in d and nb and all(abs(base[j] - d[j]) < 0.06 for j in nb):
                out[k] = d[k]; done.append(mlab(k)); break
    return out, done


def link(old, new, newest, lo, hi):
    ov = [k for k in old if k in new and lo <= k <= hi]
    S = min(ov, key=lambda k: abs(old[k] - new[k]))
    out = {k: v for k, v in old.items() if k <= S}
    out.update({k: v for k, v in new.items() if k > S})
    out.update({k: v for k, v in newest.items() if k > max(new)})
    return out, S, abs(old[S] - new[S])


OLD_END = mk(2013, 7)
_n1, _ = fillholes(M('ET.SEI_B.002'), [M('ET.CPI.002')])
_i1, S1, d1 = link({k: v for k, v in M('ET.SEI_B.001').items() if k <= OLD_END}, _n1, M('ET.CPI_B.002'), mk(2011, 5), OLD_END)
_n3, _ = fillholes(M('ET.SEI_B.004'), [M('ET.CPI.003')])
_i3, S3, d3 = link({k: v for k, v in M('ET.SEI_B.003').items() if k <= OLD_END}, _n3, M('ET.CPI_B.003'), mk(2012, 7), OLD_END)
LINK = ('Linked series: CPI base 1995–96 to {s}, base 2005–06 from the next month to March 2023 (Table IB, second series, checked '
        'against Table VII), base 2021–22 from April 2023 (Table VIII). The base switch is made in the month where the two bases '
        'differ least ({g:.2f} points), so no artificial jump is created.')
add('infl', 'Headline inflation', '% y/y', 'M', 'inflation', ['ET.SEI_B.001', 'ET.SEI_B.002', 'ET.CPI.002', 'ET.CPI_B.002'], _i1,
    'point-to-point', LINK.format(s=mlab(S1), g=d1), 'splice', 'target', good='low')
add('infl_avg', 'Headline inflation', '%', 'M', 'inflation', ['ET.SEI_B.003', 'ET.SEI_B.004', 'ET.CPI.003', 'ET.CPI_B.003'], _i3,
    '12-month average', LINK.format(s=mlab(S3), g=d3), 'splice', good='low')
K12 = mk(2012, 7)
COMP = 'From July 2012 (base 2005–06, Table VII), after that table’s change of base; base 2021–22 (Table VIII) from April 2023.'
add('food', 'Food inflation', '% y/y', 'M', 'inflation', ['ET.CPI.005', 'ET.CPI_B.005'], {k: v for k, v in splice(M('ET.CPI.005'), M('ET.CPI_B.005')).items() if k >= K12}, 'point-to-point', COMP, 'splice', good='low')
add('nonfood', 'Non-food inflation', '% y/y', 'M', 'inflation', ['ET.CPI.008', 'ET.CPI_B.008'], {k: v for k, v in splice(M('ET.CPI.008'), M('ET.CPI_B.008')).items() if k >= K12}, 'point-to-point', COMP, 'splice', good='low')
add('food_avg', 'Food inflation', '%', 'M', 'inflation', ['ET.CPI.006', 'ET.CPI_B.006'], {k: v for k, v in splice(M('ET.CPI.006'), M('ET.CPI_B.006')).items() if k >= K12}, '12-month average', COMP, 'splice', good='low')
add('nonfood_avg', 'Non-food inflation', '%', 'M', 'inflation', ['ET.CPI.009', 'ET.CPI_B.009'], {k: v for k, v in splice(M('ET.CPI.009'), M('ET.CPI_B.009')).items() if k >= K12}, '12-month average', COMP, 'splice', good='low')
for c in [f'ET.CPI_B.0{i}' for i in range(11, 21)]:
    d = yoy(M(c), 12)
    if d:
        nm = META[c][3].split('|')[-1].strip()
        add('cpi_' + c[-2:], nm, '% y/y', 'M', 'inflation', [c], d, 'CPI group, base 2021–22', 'Calculated: change in the group index on a year earlier.', 'yoy', good='low')
add('wage_g', 'Wage rate index growth', '% y/y', 'M', 'inflation', ['N.WE.2.0004'], yoy(M('N.WE.2.0004'), 12), 'nominal wage rate index (BBS)', 'Calculated from the BBS wage rate index (NSDP).', 'yoy')
add('ppi_g', 'Producer price inflation', '% y/y', 'M', 'inflation', ['N.PPI.1.0005'], yoy(M('N.PPI.1.0005'), 12), 'manufacturing PPI, base 2015–16', 'Calculated from the BBS producer price index (NSDP).', 'yoy', good='low')
add('rice_px', 'Coarse rice price, Dhaka', 'Tk per kg', 'M', 'inflation', ['ET.AVGPRICE.003'], M('ET.AVGPRICE.003'), 'retail market price', '', 'raw', dec=1)
add('brent_bdt', 'Brent crude oil (Economic Trends)', 'US$ per barrel', 'M', 'inflation', ['ET.COMMOD.005'], M('ET.COMMOD.005'), 'international market price', '', 'raw', 'driver', dec=1)

# =============================================================== 2. EXCHANGE RATE
xr = M('ET.SEI_B.013')
add('xr', 'Exchange rate', 'Tk per US$', 'M', 'exchange', ['ET.SEI_B.013'], xr, 'weighted average, period average', '', 'raw', 'target', good='low')
add('xr_end', 'Exchange rate', 'Tk per US$', 'M', 'exchange', ['ET.SEI_B.014'], M('ET.SEI_B.014'), 'weighted average, end of period', '', 'raw', good='low')
add('xr_dep', 'Taka depreciation against the US$', '% y/y', 'M', 'exchange', ['ET.SEI_B.013'], yoy(xr, 12), 'positive = weaker Taka', 'Calculated: change in Taka per US$ on a year earlier.', 'yoy', good='low')
add('xr_mom', 'Taka depreciation, month on month', '%', 'M', 'exchange', ['ET.SEI_B.013'], yoy(xr, 1), 'positive = weaker Taka', 'Calculated: change in Taka per US$ on the previous month.', 'yoy')
for code, nm in [('ET.EXR.013', 'Euro'), ('ET.EXR.069', 'UK pound'), ('ET.EXR.017', 'Indian rupee'), ('ET.EXR.009', 'Chinese yuan'), ('ET.EXR.023', 'Japanese yen'),
                 ('ET.EXR.047', 'Saudi riyal'), ('ET.EXR.065', 'UAE dirham'), ('ET.EXR.027', 'Malaysian ringgit'), ('ET.EXR.051', 'Singapore dollar'), ('ET.EXR.061', 'SDR')]:
    if code in META:
        add('fx_' + nm.split()[-1].lower(), 'Taka per ' + nm, 'Tk per unit', 'M', 'exchange', [code], M(code), 'period average (Table XX)', '', 'raw', dec=3)

# =============================================================== 3. REMITTANCES
remit = M('ET.MIGR.002')
add('remit', 'Remittance inflows', 'US$ mn', 'M', 'remittances', ['ET.MIGR.002'], remit, 'wage earners’ remittances, monthly', '', 'raw', 'target', dec=1, good='high')
add('remit_g', 'Remittance growth', '% y/y', 'M', 'remittances', ['ET.MIGR.002'], yoy(remit, 12), '', 'Calculated: change on the same month a year earlier.', 'yoy', good='high')
add('remit_12m', 'Remittances, last 12 months', 'US$ bn', 'M', 'remittances', ['ET.MIGR.002'], {k: v / 1000 for k, v in roll(remit, 12).items()}, 'rolling 12-month sum', 'Calculated: sum of the latest 12 months.', 'derived', good='high')
add('migr', 'Workers leaving for jobs abroad', 'persons', 'M', 'remittances', ['ET.MIGR.001'], M('ET.MIGR.001'), 'Table XVIII', '', 'raw', 'driver', dec=0)
tot = M('ET.REMIT_CTRY.020')
for i, nm in [(1, 'Saudi Arabia'), (2, 'UAE'), (3, 'UK'), (5, 'USA'), (14, 'Malaysia'), (16, 'Italy'), (4, 'Kuwait'), (7, 'Qatar'), (8, 'Oman')]:
    c = f'ET.REMIT_CTRY.{i:03d}'
    sh = {k: v / tot[k] * 100 for k, v in M(c).items() if tot.get(k)}
    add('rsh_' + nm.lower().replace(' ', '_'), 'Share from ' + nm, '% of total', 'M', 'remittances', [c, 'ET.REMIT_CTRY.020'], sh, 'country share (Table XIX)', 'Calculated: country inflow ÷ total (both in Taka crore).', 'derived', dec=1)

# =============================================================== 4. EXPORTS AND IMPORTS
exp_ = M('ET.SEI_B.009')
imp = splice(M('ET.SEI_B.015'), {k: v for k, v in M('ET.SEI_B.010').items() if k > mk(2024, 7)})
add('exp', 'Exports', 'US$ mn', 'M', 'trade', ['ET.SEI_B.009'], exp_, 'shipments (EPB), monthly', 'Export Promotion Bureau shipment data (Table IB). Bangladesh Bank’s f.o.b. export figures in the WSEI are lower after the 2024 data revision.', 'raw', 'target', dec=1, good='high')
add('exp_g', 'Export growth', '% y/y', 'M', 'trade', ['ET.SEI_B.009'], yoy(exp_, 12), '', 'Calculated.', 'yoy', good='high')
add('imp', 'Imports', 'US$ mn', 'M', 'trade', ['ET.SEI_B.015', 'ET.SEI_B.010'], imp, 'payments to July 2024, shipments after', 'Import payments to July 2024, import shipments afterwards: the two measures differ.', 'splice', dec=1)
add('imp_g', 'Import growth', '% y/y', 'M', 'trade', ['ET.SEI_B.015', 'ET.SEI_B.010'], yoy(imp, 12), '', 'Calculated; the change of measure in August 2024 affects the year-on-year rate until July 2025.', 'yoy')
tb = {k: exp_[k] - imp[k] for k in exp_ if k in imp}
add('tbal', 'Trade balance', 'US$ mn', 'M', 'trade', ['ET.SEI_B.009', 'ET.SEI_B.015', 'ET.SEI_B.010'], tb, 'exports minus imports', 'Calculated.', 'derived', dec=1, good='high')
add('exp_12m', 'Exports, last 12 months', 'US$ bn', 'M', 'trade', ['ET.SEI_B.009'], {k: v / 1000 for k, v in roll(exp_, 12).items()}, 'rolling 12-month sum', 'Calculated.', 'derived', good='high')
add('imp_12m', 'Imports, last 12 months', 'US$ bn', 'M', 'trade', ['ET.SEI_B.015', 'ET.SEI_B.010'], {k: v / 1000 for k, v in roll(imp, 12).items()}, 'rolling 12-month sum', 'Calculated.', 'derived')

# =============================================================== 5. BALANCE OF PAYMENTS (Table IIIA, Taka crore -> US$ mn at the monthly average rate)
def to_usd(d):
    return {k: v * 10 / xr[k] for k, v in d.items() if xr.get(k)}


bop_note = 'Table IIIA is published in Taka crore; converted to US$ million at the month’s average exchange rate (Tk crore × 10 ÷ Tk per US$).'
for key, code, lab, role in [('ca_m', 'ET.BOP.013', 'Current account balance', 'target'), ('goods_m', 'ET.BOP.003', 'Trade balance (goods, BoP)', 'component'),
                             ('serv_m', 'ET.BOP.006', 'Services, net', 'component'), ('pinc_m', 'ET.BOP.009', 'Primary income, net', 'component'),
                             ('sinc_m', 'ET.BOP.012', 'Secondary income, net', 'component'), ('kap_m', 'ET.BOP.014', 'Capital account', 'component'),
                             ('fin_m', 'ET.BOP.019', 'Financial account', 'component'), ('fdi_m', 'ET.BOP.015', 'Direct investment, net', 'component'),
                             ('eo_m', 'ET.BOP.020', 'Errors and omissions', 'component')]:
    add(key, lab, 'US$ mn', 'M', 'bop', [code, 'ET.SEI_B.013'], to_usd(M(code)), 'monthly, Table IIIA', bop_note, 'derived', role, dec=1, good='high' if key in ('ca_m', 'goods_m') else None)
for key, code, lab in [('ca_fy', 'BGD_BOP_BCA_FY_USD', 'Current account balance'), ('goods_fy', 'BGD_BOP_BG_FY_USD', 'Trade balance (goods)'),
                       ('serv_fy', 'BGD_BOP_BS_FY_USD', 'Services balance'), ('pinc_fy', 'BGD_BOP_BIP_FY_USD', 'Primary income'),
                       ('sinc_fy', 'BGD_BOP_BIS_FY_USD', 'Secondary income (mainly remittances)'), ('kap_fy', 'BGD_BOP_BK_FY_USD', 'Capital account'),
                       ('fin_fy', 'BGD_BOP_BF_FY_USD', 'Financial account'), ('bop_fy', 'BGD_BOP_BOP_FY_USD', 'Overall balance'),
                       ('fdi_fy', 'BGD_BOP_BFFDI_FY_USD', 'Foreign direct investment (net)')]:
    add(key, lab, 'US$ mn', 'FY', 'bop', ['N.BOPALT.' + code], FYs('N.BOPALT.' + code), 'fiscal year (NSDP, BPM6 presentation)', '', 'raw', dec=0, good='high' if key in ('ca_fy', 'bop_fy') else None)
add('xdebt', 'Gross external debt', 'US$ mn', 'Q', 'bop', ['N.EXD.1.0015'], Qs('N.EXD.1.0015'), 'quarterly (NSDP)', '', 'raw', dec=0, good='low')
add('xdebt_st', 'Short-term external debt', 'US$ mn', 'Q', 'bop', ['N.EXD.1.0016'], Qs('N.EXD.1.0016'), 'quarterly (NSDP)', '', 'raw', dec=0, good='low')
add('fdi_in', 'FDI inflows', 'US$ mn', 'FY', 'bop', ['ET.FDI.004'], FYs('ET.FDI.004'), 'gross inflows (Table IIIB)', '', 'raw', dec=0, good='high')

# =============================================================== 6. FOREIGN EXCHANGE RESERVES
res = M('ET.SEI_B.011')
add('res', 'Gross foreign exchange reserves', 'US$ mn', 'M', 'reserves', ['ET.SEI_B.011'], res, 'Bangladesh Bank gross reserves', '', 'raw', 'target', dec=0, good='high')
add('res_bpm6', 'Reserves, BPM6 definition', 'US$ mn', 'M', 'reserves', ['ET.SEI_B.012'], M('ET.SEI_B.012'), 'IMF BPM6 measure (from June 2023)', '', 'raw', dec=0, good='high')
cover = {}
for k, v in res.items():
    w = [imp.get(j) for j in range(k - 11, k + 1)]
    if all(x is not None for x in w):
        cover[k] = v / (sum(w) / 12)
add('cover', 'Import cover of reserves', 'months', 'M', 'reserves', ['ET.SEI_B.011', 'ET.SEI_B.015', 'ET.SEI_B.010'], cover, 'gross reserves ÷ average monthly imports (12 months)', 'Calculated. A common rule of thumb is at least 3 months (IMF).', 'derived', dec=2, good='high')
add('res_g', 'Reserve growth', '% y/y', 'M', 'reserves', ['ET.SEI_B.011'], yoy(res, 12), '', 'Calculated.', 'yoy', good='high')
add('res_chg', 'Change in reserves', 'US$ mn', 'M', 'reserves', ['ET.SEI_B.011'], {k: v - res[k - 1] for k, v in res.items() if (k - 1) in res}, 'month on month', 'Calculated.', 'derived', dec=0, good='high')

# =============================================================== 7. CALL MONEY MARKET
call = M('ET.CALLMONEY.003')
add('call', 'Call money rate', '%', 'M', 'callmoney', ['ET.CALLMONEY.003'], call, 'weighted average (Table XVI)', '', 'raw', 'target')
add('call_hi', 'Call money rate, highest', '%', 'M', 'callmoney', ['ET.CALLMONEY.001'], M('ET.CALLMONEY.001'), 'monthly high', '', 'raw')
add('call_lo', 'Call money rate, lowest', '%', 'M', 'callmoney', ['ET.CALLMONEY.002'], M('ET.CALLMONEY.002'), 'monthly low', '', 'raw')
add('excess_res', 'Excess reserves of banks', 'Tk crore', 'M', 'callmoney', ['ET.SEI_A.041'], M('ET.SEI_A.041'), 'balances with Bangladesh Bank above requirement', '', 'raw', 'driver', dec=0)

# =============================================================== 8. POLICY AND INTEREST RATES
pol_rows = list(csv.DictReader(open(ROOT / 'data' / 'ref' / 'bd_policy_rates.csv', encoding='utf-8')))
def step(col):
    out, cur = {}, None
    ev = sorted(((datetime.date.fromisoformat(r['effective']), r) for r in pol_rows), key=lambda t: t[0])
    k0, k1 = mk(2016, 1), max(call) if call else mk(2026, 9)
    for k in range(k0, k1 + 1):
        y, m = k // 12, k % 12 + 1
        last_day = (datetime.date(y + (m == 12), m % 12 + 1, 1) - datetime.timedelta(days=1))
        for d, r in ev:
            if d <= last_day and r[col]:
                cur = float(r[col])
        if cur is not None:
            out[k] = cur
    return out
pol = step('policy_rate'); floor_ = step('floor_rate'); ceil_ = step('ceiling_rate')
POLNOTE = ('Compiled from Bangladesh Bank decisions as reported in the press (one source per decision, listed on the Sources page). '
           'Monthly value = rate in force on the last day of the month.')
C_POL_SRC = [{'code': 'policy-rates.csv', 'pub': 'Bangladesh Bank decisions (press reports)', 'table': 'Policy rate decisions 2016–2026', 'name': r['decision'], 'unit': '%',
              'prov': r['source'], 'url': r['url'], 'newest': r['effective']} for r in pol_rows]
for key, d, lab, sub in [('policy', pol, 'Policy (repo) rate', 'rate in force at month end'), ('sdf', floor_, 'Corridor floor: reverse repo / SDF', 'standing deposit facility from July 2023'),
                         ('slf', ceil_, 'Corridor ceiling: SLF', 'standing lending facility, from July 2023')]:
    C[key] = dict(key=key, label=lab, sub=sub, unit='%', f='M', cat='policy', how='compiled', note=POLNOTE, src=C_POL_SRC, data=d, role='target' if key == 'policy' else 'component', dec=2, good=None)
    ORDER.append(key)
add('lend', 'Lending rate', '%', 'M', 'policy', ['ET.SEI_A.067'], M('ET.SEI_A.067'), 'scheduled banks, weighted average', '', 'raw')
add('dep', 'Deposit rate', '%', 'M', 'policy', ['ET.SEI_A.066'], M('ET.SEI_A.066'), 'scheduled banks, weighted average', '', 'raw')
add('spread', 'Lending–deposit spread', 'pp', 'M', 'policy', ['ET.SEI_A.068'], M('ET.SEI_A.068'), 'scheduled banks', '', 'raw')
add('bankrate', 'Bank rate', '%', 'M', 'policy', ['ET.SEI_A.065'], M('ET.SEI_A.065'), '', '', 'raw')
add('real_lend', 'Real lending rate', '%', 'M', 'policy', ['ET.SEI_A.067', 'ET.CPI_B.002'], {k: v - _i1[k] for k, v in M('ET.SEI_A.067').items() if k in _i1}, 'lending rate minus headline inflation', 'Calculated: lending rate minus point-to-point inflation.', 'derived')
add('real_policy', 'Real policy rate', '%', 'M', 'policy', ['ET.CPI_B.002'], {k: v - _i1[k] for k, v in pol.items() if k in _i1}, 'policy rate minus headline inflation', 'Calculated.', 'derived')
add('nbfi_lend', 'NBFI lending rate', '%', 'M', 'policy', ['ET.SEI_A.070'], M('ET.SEI_A.070'), 'non-bank financial institutions', '', 'raw')

# =============================================================== 9. MONEY AND CREDIT
m2 = M('ET.SEI_A.015')
add('m2', 'Broad money (M2) growth', '% y/y', 'M', 'money', ['ET.SEI_A.015'], yoy(m2, 12), '', 'Calculated from the M2 stock (Table IA).', 'yoy', 'target')
add('rm', 'Reserve money growth', '% y/y', 'M', 'money', ['ET.RM_SRC.009'], yoy(M('ET.RM_SRC.009'), 12), '', 'Calculated (Table IID).', 'yoy')
add('m1', 'Narrow money (M1) growth', '% y/y', 'M', 'money', ['ET.SEI_A.014'], yoy(M('ET.SEI_A.014'), 12), '', 'Calculated.', 'yoy')
add('pcredit', 'Private sector credit growth', '% y/y', 'M', 'money', ['ET.MS_M2.010'], yoy(M('ET.MS_M2.010'), 12), '', 'Calculated (Table IIA).', 'yoy', good='high')
add('govcredit', 'Net credit to government growth', '% y/y', 'M', 'money', ['ET.MS_M2.006'], yoy(M('ET.MS_M2.006'), 12), 'banking system', 'Calculated (Table IIA).', 'yoy')
add('opcredit', 'Credit to other public sector growth', '% y/y', 'M', 'money', ['ET.MS_M2.009'], yoy(M('ET.MS_M2.009'), 12), '', 'Calculated (Table IIA).', 'yoy')
add('dcredit', 'Domestic credit growth', '% y/y', 'M', 'money', ['ET.MS_M2.011'], yoy(M('ET.MS_M2.011'), 12), '', 'Calculated (Table IIA).', 'yoy')
add('nfa_g', 'Net foreign assets growth', '% y/y', 'M', 'money', ['ET.MS_M2.003'], yoy(M('ET.MS_M2.003'), 12), '', 'Calculated (Table IIA).', 'yoy')
mm = {k: m2[k] / v for k, v in M('ET.RM_SRC.009').items() if k in m2 and v}
add('mult', 'Money multiplier', 'M2 ÷ reserve money', 'M', 'money', ['ET.SEI_A.015', 'ET.RM_SRC.009'], mm, '', 'Calculated.', 'derived', dec=3)
add('cdr', 'Credit–deposit ratio', '%', 'M', 'money', ['ET.SEI_A.061'], M('ET.SEI_A.061'), 'deposit money banks', '', 'raw')
add('cob_g', 'Currency outside banks growth', '% y/y', 'M', 'money', ['ET.SEI_A.005'], yoy(M('ET.SEI_A.005'), 12), '', 'Calculated.', 'yoy')

# =============================================================== 10. BANKING SOUNDNESS AND FINANCIAL INCLUSION
for key, code, lab, unit, good in [('npl', 'N.FSD.1.0022', 'Non-performing loans', '% of gross loans', 'low'), ('crar', 'N.FSD.1.0007', 'Capital to risk-weighted assets', '%', 'high'),
                                   ('tier1', 'N.FSD.1.0010', 'Tier 1 capital to risk-weighted assets', '%', 'high'), ('prov', 'N.FSD.1.0028', 'Provisions to non-performing loans', '%', 'high'),
                                   ('roa', 'N.FSD.1.0031', 'Return on assets', '%', 'high'), ('roe', 'N.FSD.1.0034', 'Return on equity', '%', 'high'),
                                   ('liq', 'N.FSD.1.0043', 'Liquid assets to total assets', '%', 'high'), ('liq_st', 'N.FSD.1.0046', 'Liquid assets to short-term liabilities', '%', 'high')]:
    add(key, lab, unit, 'Q', 'banking', [code], Qs(code), 'deposit takers, IMF financial soundness indicators (NSDP)', '', 'raw', 'target' if key == 'npl' else 'component', good=good)
add('dep_g', 'Bank deposit growth', '% y/y', 'M', 'banking', ['ET.SEI_A.039'], yoy(M('ET.SEI_A.039'), 12), 'total deposit liabilities', 'Calculated.', 'yoy')
add('adv_g', 'Bank advances growth', '% y/y', 'M', 'banking', ['ET.SEI_A.020'], yoy(M('ET.SEI_A.020'), 12), 'total advances', 'Calculated.', 'yoy')
add('mfs_g', 'Mobile financial services, value growth', '% y/y', 'M', 'banking', ['FI.MFSTransac.003'], yoy(M('FI.MFSTransac.003'), 12), 'all MFS transactions', 'Calculated (FIDFS e-banking statistics).', 'yoy')
add('mfs_acc', 'Mobile financial services accounts', 'million', 'M', 'banking', ['FI.MFSAccount.016'], {k: v / 1e6 if v > 1e5 else v for k, v in M('FI.MFSAccount.016').items()}, 'total accounts', '', 'raw', dec=1)
add('ab_dep', 'Agent banking deposits', 'Tk crore', 'M', 'banking', ['FI.AgentBanki.004.2'], M('FI.AgentBanki.004.2'), 'deposit balance', '', 'raw', dec=0)

# =============================================================== 11. FISCAL
nbr = M('ET.TAX.010')
add('tax', 'NBR tax revenue', 'Tk crore', 'M', 'fiscal', ['ET.TAX.010'], nbr, 'monthly collection (Table XXIII)', '', 'raw', 'target', dec=0, good='high')
add('tax_g', 'NBR tax revenue growth', '% y/y', 'M', 'fiscal', ['ET.TAX.010'], yoy(nbr, 12), '', 'Calculated.', 'yoy', good='high')
add('tax_12m', 'NBR revenue, last 12 months', 'Tk crore', 'M', 'fiscal', ['ET.TAX.010'], roll(nbr, 12), 'rolling 12-month sum', 'Calculated.', 'derived', dec=0, good='high')
for key, code, lab in [('vat_d', 'ET.TAX.005', 'VAT, domestic'), ('vat_i', 'ET.TAX.006', 'VAT, imports'), ('inc_tax', 'ET.TAX.004', 'Income tax'), ('customs', 'ET.TAX.001', 'Customs duty')]:
    add(key, lab, 'Tk crore', 'M', 'fiscal', [code], M(code), 'monthly collection', '', 'raw', dec=0)
add('nsc_net', 'National savings certificates, net sales', 'Tk crore', 'M', 'fiscal', ['ET.NSAV.017'], M('ET.NSAV.017'), 'Table XXVIII', '', 'raw', dec=0)
add('nsc_out', 'National savings certificates, outstanding', 'Tk crore', 'M', 'fiscal', ['ET.NSAV.018'], M('ET.NSAV.018'), 'Table XXVIII', '', 'raw', dec=0)
gdpn = splice(FYs('ET.NA_KEY.001'), FYs('ET.NA_KEY.002'))
for key, code, lab, good in [('bud_rev', 'ET.BUDGET.003', 'Government revenue', 'high'), ('bud_exp', 'ET.BUDGET.017', 'Government expenditure', None), ('bud_def', 'ET.BUDGET.018', 'Overall budget deficit', 'high'),
                             ('bud_dfin', 'ET.BUDGET.020', 'Domestic financing', None), ('bud_ffin', 'ET.BUDGET.019', 'Foreign financing (net)', None)]:
    d = {k: v / gdpn[k] * 100 for k, v in FYs(code).items() if gdpn.get(k)}
    add(key, lab, '% of GDP', 'FY', 'fiscal', [code, 'ET.NA_KEY.001', 'ET.NA_KEY.002'], d, 'budget outturn (Table XXIX)', 'Calculated: Taka amount ÷ nominal GDP (base 2005–06 to FY2015, 2015–16 from FY2016).', 'derived', good=good)
debt = Qs('N.CGD.1.0027')
add('gdebt', 'Central government gross debt', 'Tk bn', 'Q', 'fiscal', ['N.CGD.1.0027'], {k: v / 1000 for k, v in debt.items()}, 'quarterly (NSDP)', '', 'raw', dec=0, good='low')

# =============================================================== 12. REAL SECTOR
gdp_fy = splice(FYs('ET.NA_KEY.029'), FYs('ET.NA_KEY.030'))
add('gdp_fy', 'Real GDP growth', '%', 'FY', 'real', ['ET.NA_KEY.029', 'ET.NA_KEY.030'], gdp_fy, 'fiscal year', 'Base 2005–06 to FY2016, base 2015–16 from FY2017.', 'splice', 'target', good='high')
add('gdp_q', 'Real GDP growth, quarterly', '% y/y', 'Q', 'real', ['ET.QGDP.034'], Qs('ET.QGDP.034'), 'constant prices', '', 'raw', good='high')
for key, code, lab in [('agr_q', 'ET.QGDP.018', 'Agriculture growth'), ('ind_q', 'ET.QGDP.023', 'Industry growth'), ('srv_q', 'ET.QGDP.030', 'Services growth'), ('mfg_q', 'ET.QGDP.020', 'Manufacturing growth')]:
    add(key, lab, '% y/y', 'Q', 'real', [code], yoy(Qs(code), 4), 'quarterly GDP, constant prices', 'Calculated from quarterly value added.', 'yoy', good='high')
qiip = splice(M('N.PI.2.0011'), {k: v for k, v in M('N.PI.1.0011').items()})
add('iip', 'Industrial production growth', '% y/y', 'M', 'real', ['N.PI.2.0011', 'N.PI.1.0011'], splice(yoy(M('N.PI.2.0011'), 12), yoy(M('N.PI.1.0011'), 12)), 'manufacturing, mining and electricity', 'Calculated from the BBS production index (base 2005–06 to June 2021, 2015–16 from July 2022).', 'yoy', good='high')
add('inv_gdp', 'Investment', '% of GDP', 'FY', 'real', ['ET.NA_KEY.021', 'ET.NA_KEY.022'], splice(FYs('ET.NA_KEY.021'), FYs('ET.NA_KEY.022')), '', '', 'splice', good='high')
add('sav_gdp', 'National savings', '% of GDP', 'FY', 'real', ['ET.NA_KEY.017', 'ET.NA_KEY.018'], splice(FYs('ET.NA_KEY.017'), FYs('ET.NA_KEY.018')), '', '', 'splice', good='high')
add('cons_gdp', 'Consumption', '% of GDP', 'FY', 'real', ['ET.NA_KEY.011', 'ET.NA_KEY.012'], splice(FYs('ET.NA_KEY.011'), FYs('ET.NA_KEY.012')), '', '', 'splice')
add('defl_g', 'GDP deflator inflation', '%', 'FY', 'real', ['ET.NA_KEY.031', 'ET.NA_KEY.032'], splice(yoy(FYs('ET.NA_KEY.031'), 1), yoy(FYs('ET.NA_KEY.032'), 1)), '', 'Calculated.', 'yoy', good='low')
for key, code, lab in [('boro', 'ET.AGRI.005', 'Boro rice production'), ('aman', 'ET.AGRI.003', 'Aman rice production'), ('wheat', 'ET.AGRI.007', 'Wheat production')]:
    add(key, lab, "'000 tonnes", 'FY', 'real', [code], FYs(code), 'Table V', '', 'raw', dec=0, good='high')
add('unemp', 'Unemployment rate', '%', 'Q', 'real', ['N.LMI.1.0009'], Qs('N.LMI.1.0009'), 'quarterly labour force survey (NSDP)', '', 'raw', good='low')

# =============================================================== 13. CAPITAL MARKET
dse = splice(M('N.SPI.1.0004'), M('ET.SHAREIDX.001'))
add('dse', 'DSE broad index (DSEX)', 'index', 'M', 'capital', ['ET.SHAREIDX.001', 'N.SPI.1.0004'], M('ET.SHAREIDX.001'), 'month end (Table X)', '', 'raw', 'target', dec=0, good='high')
add('dse_g', 'DSE index change', '% y/y', 'M', 'capital', ['ET.SHAREIDX.001'], yoy(M('ET.SHAREIDX.001'), 12), '', 'Calculated.', 'yoy', good='high')
mcap = M('ET.MCAP.016')
add('mcap', 'Market capitalisation', 'Tk crore', 'M', 'capital', ['ET.MCAP.016'], mcap, 'listed companies (Table XI)', '', 'raw', dec=0, good='high')
add('mcap_gdp', 'Market capitalisation', '% of GDP', 'M', 'capital', ['ET.MCAP.016', 'ET.NA_KEY.002'], {k: v / gdpn[(k // 12) + (1 if k % 12 >= 6 else 0)] * 100 for k, v in mcap.items() if gdpn.get((k // 12) + (1 if k % 12 >= 6 else 0))}, 'of the fiscal year’s nominal GDP', 'Calculated.', 'derived', good='high')
add('turnover', 'DSE turnover', 'Tk crore', 'M', 'capital', ['ET.SHAREIDX.002'], M('ET.SHAREIDX.002'), 'monthly (Table X)', '', 'raw', dec=0)

# =============================================================== categories (Weekly Selected Economic Indicators order)
CATS = [
    dict(id='inflation', title='Inflation and prices', wsei='Inflation (national, base 2021–22)', target='infl', drivers=['xr_dep', 'm2', 'call', 'policy', 'brent_bdt'], wdi='inflation',
         desc='Consumer price inflation (point-to-point and 12-month average), food and non-food inflation, CPI groups, wages and producer prices.',
         bench=[dict(y=7.5, label='Government target FY26: 7.5%', src='The Daily Star, 31 Jul 2026')], events=['covid', 'commodity', 'transition']),
    dict(id='exchange', title='Exchange rate', wsei='Reserves and exchange rate', target='xr', drivers=['res', 'remit_g', 'exp_g', 'call', 'infl'], wdi='fx_change',
         desc='Taka per US dollar (average and end of period), depreciation, and the Taka against other major currencies.', events=['commodity', 'crawl', 'transition']),
    dict(id='remittances', title='Remittances', wsei='Remittances', target='remit', drivers=['xr', 'migr', 'xr_dep'], wdi='remittances',
         desc='Monthly remittance inflows, growth, 12-month totals, workers leaving for jobs abroad and the main source countries.', events=['covid', 'crawl', 'transition']),
    dict(id='trade', title='Exports and imports', wsei='Imports and exports', target='exp', drivers=['xr', 'imp', 'remit'], wdi='exports',
         desc='Merchandise exports and imports, the trade balance and 12-month totals.', events=['covid', 'commodity']),
    dict(id='bop', title='Balance of payments', wsei='Current account balance', target='ca_m', drivers=['exp', 'imp', 'remit', 'xr'], wdi='current_account',
         desc='Current account and its parts, the financial account, the overall balance, FDI and external debt.', events=['covid', 'commodity']),
    dict(id='reserves', title='Foreign exchange reserves', wsei='Reserves and exchange rate', target='res', drivers=['ca_m', 'xr', 'remit', 'exp'], wdi='reserves',
         desc='Gross and BPM6 reserves, import cover and monthly changes.', bench=[dict(y=3, label='3 months of imports (IMF rule of thumb)', src='IMF (2011), Assessing Reserve Adequacy', series='cover')], events=['commodity', 'transition']),
    dict(id='callmoney', title='Call money market', wsei='Money market: call money rate', target='call', drivers=['policy', 'rm', 'excess_res', 'govcredit'], wdi='lending_rate',
         desc='Weighted average, highest and lowest call money rates and banks’ excess reserves.', events=['covid', 'transition']),
    dict(id='policy', title='Policy and interest rates', wsei='Interest rates: lending rates', target='lend', drivers=['policy', 'call', 'infl', 'm2'], wdi='lending_rate',
         desc='Policy (repo) rate and corridor, bank lending and deposit rates, spread and real interest rates.', events=['covid', 'commodity', 'transition']),
    dict(id='money', title='Money and credit', wsei='Monetary aggregates and credit', target='m2', drivers=['rm', 'pcredit', 'govcredit', 'call', 'infl'], wdi='money_growth',
         desc='Reserve money, broad and narrow money, credit to the private sector, the government and other public bodies.', events=['covid', 'transition']),
    dict(id='banking', title='Banking soundness and inclusion', wsei='Classified loans', target='npl', drivers=['crar', 'pcredit', 'lend'], wdi='private_credit',
         desc='Non-performing loans, capital adequacy, profitability and liquidity of banks; deposits and advances; mobile and agent banking.',
         bench=[dict(y=12.5, label='Basel III capital requirement 12.5%', src='Bangladesh Bank Basel III guidelines', series='crar')], events=['covid', 'transition']),
    dict(id='fiscal', title='Fiscal and government finance', wsei='Tax revenue and national savings certificates', target='tax', drivers=['imp', 'infl', 'gdp_fy'], wdi='budget',
         desc='NBR tax revenue and its main taxes, the budget balance and its financing, national savings certificates and government debt.', events=['covid', 'transition']),
    dict(id='real', title='Real sector and growth', wsei='GDP growth (base 2015–16)', target='gdp_fy', drivers=['inv_gdp', 'iip', 'pcredit', 'infl'], wdi='gdp_growth',
         desc='GDP growth (annual and quarterly), sector growth, industrial production, investment, savings, crops and unemployment.', events=['covid', 'commodity', 'transition']),
    dict(id='capital', title='Capital market', wsei='Capital market: DSEX and CASPI', target='dse', drivers=['call', 'lend', 'xr_dep', 'pcredit'], wdi='mktcap',
         desc='The Dhaka Stock Exchange broad index, market capitalisation and turnover.', events=['covid', 'transition']),
]
EVENTS = dict(
    covid=dict(label='COVID-19', start='2020-03', end='2020-12', src='WHO pandemic declaration 11 March 2020; Bangladesh general holiday from 26 March 2020'),
    commodity=dict(label='Global commodity and dollar shock', start='2022-03', end='2022-12', src='Russia–Ukraine war (Feb 2022) and the US Federal Reserve tightening cycle'),
    crawl=dict(label='Crawling peg introduced', start='2024-05', end='2024-05', src='Bangladesh Bank, 8 May 2024 (crawling peg mid-rate Tk 117 per US$)'),
    transition=dict(label='Political transition', start='2024-07', end='2024-08', src='Change of government in August 2024'),
)
for c in CATS:
    c['series'] = [k for k in ORDER if C[k]['cat'] == c['id']]

# =============================================================== checks (stop if something looks broken)
issues = []
def last(k):
    d = C[k]['data']; return max(d), d[max(d)]
for k in ['infl', 'xr', 'remit', 'res', 'call', 'm2', 'npl', 'tax', 'gdp_fy', 'dse', 'exp', 'policy']:
    kk, v = last(k)
    print(f'  latest {k:8s} {LAB[C[k]["f"]](kk):9s} {v:10.2f}')
assert 0 < last('infl')[1] < 20 and 80 < last('xr')[1] < 200 and 1000 < last('remit')[1] < 6000, 'implausible headline values'
assert abs(sum(FYs('ET.MIGR.002').get(k, 0) for k in [2026]) - 35594.3961) < 1, 'FY26 remittance total changed: check against the WSEI (US$ 35.59 bn)'
for k, s in C.items():
    vals = list(s['data'].values())
    if any(not math.isfinite(v) for v in vals):
        issues.append(f'{k}: non-finite values')
    if s['unit'].startswith('%') and s['how'] == 'yoy' and max(abs(v) for v in vals) > 500:
        issues.append(f'{k}: growth above 500% (max {max(vals):.0f})')
print('issues:', issues or 'none')


def pack(d, f):
    ks = sorted(d); k0, k1 = ks[0], ks[-1]
    return {'f': f, 's': LAB[f](k0), 'v': [r6(d.get(k)) for k in range(k0, k1 + 1)]}


out_series = {}
for k in ORDER:
    s = C[k]
    out_series[k] = {kk: s[kk] for kk in ('label', 'sub', 'unit', 'f', 'cat', 'how', 'note', 'src', 'role', 'dec', 'good')}
    out_series[k].update(pack(s['data'], s['f']))
OUT = dict(meta=dict(built=datetime.date.today().isoformat(), vintage='Bangladesh Bank, Monthly Economic Trends (September 2026 and earlier editions); Bangladesh Bank / IMF National Summary Data Page; BBS',
                     n_catalog=len(cat), n_series=len(out_series)),
           cats=CATS, events=EVENTS, series=out_series, policy=pol_rows)
(ROOT / 'build').mkdir(exist_ok=True)
js = json.dumps(OUT, separators=(',', ':'), ensure_ascii=False)
(ROOT / 'build' / 'bd_data.json').write_text(js, encoding='utf-8')
print('series', len(out_series), 'bytes', len(js))
for c in CATS:
    print(f"  {c['id']:12s} {len(c['series']):3d} series, target {c['target']}: " + ', '.join(c['series'][:14]))
