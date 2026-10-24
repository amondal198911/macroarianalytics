#!/usr/bin/env python3
"""Check the downloaded world data and write build/world.json for the website.

Every indicator keeps its World Bank code, so each chart and table on the site can cite its exact source.
If a check fails the script stops with an error, and the live site stays as it was.
"""
import csv, datetime, json, math
from pathlib import Path
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GEO = ROOT / 'data' / 'geo'
TODAY = datetime.datetime.now(datetime.timezone.utc).date()
YEAR_CAP = TODAY.year
WDI = ROOT / 'data' / 'raw' / 'wdi'
ON = ROOT / 'data' / 'raw' / 'on'
DH = ROOT / 'data' / 'raw' / 'dh'

# ---------------------------------------------------------------- country metadata
cc = pd.read_csv(DH / 'cc_main.csv', keep_default_na=False, dtype=str)
cc = cc[cc['ISO3166-1-Alpha-3'] != '']
NAME_FIX = {
    'COD': 'DR Congo', 'COG': 'Congo (Rep.)', 'MMR': 'Myanmar', 'HKG': 'Hong Kong SAR', 'MAC': 'Macao SAR',
    'PSE': 'West Bank and Gaza', 'VCT': 'St. Vincent and the Grenadines', 'KNA': 'St. Kitts and Nevis',
    'BIH': 'Bosnia and Herzegovina', 'TTO': 'Trinidad and Tobago', 'ATG': 'Antigua and Barbuda',
    'STP': 'São Tomé and Príncipe', 'TCA': 'Turks and Caicos Islands', 'VIR': 'US Virgin Islands',
    'MNP': 'Northern Mariana Islands', 'FSM': 'Micronesia', 'USA': 'United States', 'GBR': 'United Kingdom',
    'KOR': 'South Korea', 'PRK': 'North Korea', 'CIV': 'Côte d’Ivoire', 'SXM': 'Sint Maarten',
    'MAF': 'St. Martin (French part)', 'CUW': 'Curaçao', 'TUR': 'Türkiye', 'CZE': 'Czechia', 'SWZ': 'Eswatini',
    'CPV': 'Cabo Verde', 'LAO': 'Lao PDR', 'IRN': 'Iran', 'SYR': 'Syria', 'VEN': 'Venezuela', 'BOL': 'Bolivia',
    'TZA': 'Tanzania', 'RUS': 'Russia', 'VNM': 'Viet Nam', 'MDA': 'Moldova', 'BRN': 'Brunei'}
meta = {}
for _, r in cc.iterrows():
    code = r['ISO3166-1-Alpha-3']
    name = NAME_FIX.get(code) or r['CLDR display name'] or r['UNTERM English Short'] or code
    name = name.replace(' & ', ' and ')
    sub = r['Sub-region Name'] or ''
    if sub in ('Latin America and the Caribbean', 'Sub-Saharan Africa') and r['Intermediate Region Name']:
        sub = r['Intermediate Region Name']
    num = r['ISO3166-1-numeric']
    meta[code] = dict(name=name, iso2=r['ISO3166-1-Alpha-2'], region=r['Region Name'] or '', sub=sub,
                      num=num.zfill(3) if num else '', ldc=r['Least Developed Countries (LDC)'] == 'x',
                      lldc=r['Land Locked Developing Countries (LLDC)'] == 'x',
                      sids=r['Small Island Developing States (SIDS)'] == 'x', capital=r.get('Capital', ''))
meta['XKX'] = dict(name='Kosovo', iso2='XK', region='Europe', sub='Southern Europe', num='', ldc=False, lldc=True, sids=False, capital='Pristina')
meta['CHI'] = dict(name='Channel Islands', iso2='', region='Europe', sub='Northern Europe', num='', ldc=False, lldc=False, sids=False, capital='')

# World Bank income groups (current classification) from the Open Numbers copy of the WDI country list
INC_MAP = {'high_income': 'HIC', 'upper_middle_income': 'UMC', 'lower_middle_income': 'LMC', 'low_income': 'LIC'}
income = {}
on_iso = {}
with open(ON / 'countries.csv', newline='', encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        iso = (row.get('iso3166_1_alpha3') or '').upper()
        if row.get('country') == 'kos':
            iso = 'XKX'
        if iso:
            on_iso[row['country']] = iso
            if row.get('income_groups') in INC_MAP:
                income[iso] = INC_MAP[row['income_groups']]

GROUPS = {
    'WLD': 'World', 'EAS': 'East Asia and Pacific', 'ECS': 'Europe and Central Asia', 'LCN': 'Latin America and Caribbean',
    'MEA': 'Middle East, North Africa, Afghanistan and Pakistan', 'NAC': 'North America', 'SAS': 'South Asia',
    'SSF': 'Sub-Saharan Africa', 'EUU': 'European Union', 'EMU': 'Euro area', 'OED': 'OECD members', 'HIC': 'High income',
    'UMC': 'Upper middle income', 'LMC': 'Lower middle income', 'LIC': 'Low income'}


def load(code):
    d = pd.read_csv(WDI / f'{code}.csv').dropna(subset=['Value'])
    d['Year'] = d['Year'].astype(int)
    return d.pivot_table(index='Country Code', columns='Year', values='Value', aggfunc='first')


def load_on(code):
    f = ON / f'{code}.csv'
    if not f.exists():
        return None
    d = pd.read_csv(f).dropna(subset=[code])
    d['iso'] = d['geo'].map(on_iso)
    d = d.dropna(subset=['iso'])
    return d.pivot_table(index='iso', columns='time', values=code, aggfunc='first')


codes = ['ny.gdp.mktp.kd.zg', 'ny.gdp.pcap.kd.zg', 'ny.gdp.mktp.cd', 'ny.gdp.pcap.cd', 'ny.gdp.pcap.pp.cd', 'ne.gdi.totl.zs',
         'ny.gns.ictr.zs', 'nv.agr.totl.zs', 'nv.ind.totl.zs', 'fp.cpi.totl.zg', 'ny.gdp.defl.kd.zg', 'fr.inr.lend', 'fr.inr.dpst',
         'fr.inr.lndp', 'fr.inr.rinr', 'fm.lbl.bmny.zg', 'pa.nus.fcrf', 'sl.uem.totl.zs', 'sp.pop.totl', 'sp.pop.grow',
         'gc.nld.totl.gd.zs', 'gc.dod.totl.gd.zs', 'gc.rev.xgrt.gd.zs', 'gc.xpn.totl.gd.zs', 'gc.tax.totl.gd.zs', 'bn.cab.xoka.cd',
         'ne.exp.gnfs.zs', 'ne.imp.gnfs.zs', 'bx.klt.dinv.cd.wd', 'bx.trf.pwkr.cd.dt', 'fi.res.totl.cd', 'dt.dod.dect.gn.zs',
         'fs.ast.prvt.gd.zs', 'cm.mkt.lcap.gd.zs', 'si.pov.dday', 'si.pov.nahc', 'si.pov.gini', 'si.dst.05th.20', 'si.dst.frst.20',
         'sl.uem.1524.fe.zs', 'sl.uem.1524.ma.zs', 'sl.tlf.cact.fe.zs', 'sl.tlf.cact.ma.zs', 'dt.tds.dect.ex.zs']
OPTIONAL = ['fb.ast.nper.zs', 'fb.bnk.capa.zs']  # banking soundness (used for country comparisons); skipped if not downloaded
raw = {c: load(c) for c in codes}
for c in OPTIONAL:
    if (WDI / (c + '.csv')).exists():
        raw[c] = load(c)
on = {c: load_on(c) for c in ['nv_srv_totl_zs', 'nv_ind_manf_zs', 'fi_res_totl_mo', 'bm_trf_pwkr_cd_dt']}

gdp = raw['ny.gdp.mktp.cd']


def ratio(frame):
    a, b = frame.align(gdp, join='inner')
    return (a / b * 100).where(b > 0)


fx = raw['pa.nus.fcrf'].copy()
EURO = {'AUT': (1999, 13.7603), 'BEL': (1999, 40.3399), 'FIN': (1999, 5.94573), 'FRA': (1999, 6.55957), 'DEU': (1999, 1.95583),
        'IRL': (1999, 0.787564), 'ITA': (1999, 1936.27), 'LUX': (1999, 40.3399), 'NLD': (1999, 2.20371), 'PRT': (1999, 200.482),
        'ESP': (1999, 166.386), 'GRC': (2001, 340.75), 'SVN': (2007, 239.64), 'CYP': (2008, 0.585274), 'MLT': (2008, 0.4293),
        'SVK': (2009, 30.126), 'EST': (2011, 15.6466), 'LVA': (2014, 0.702804), 'LTU': (2015, 3.4528), 'HRV': (2023, 7.5345),
        'SMR': (1999, 1936.27), 'MCO': (1999, 6.55957)}
euro_done = {}
for code, (y, conv) in EURO.items():
    if code in fx.index and (y - 1) in fx.columns and y in fx.columns:
        a, b = fx.at[code, y - 1], fx.at[code, y]
        if pd.notna(a) and pd.notna(b) and b > 0 and 0.6 * conv <= a / b <= 1.6 * conv:
            cols = [c for c in fx.columns if c < y]
            fx.loc[code, cols] = fx.loc[code, cols] / conv
            euro_done[code] = [y, conv]
# depreciation (+) / appreciation (-) of the local currency against the US dollar, % change in LCU per US$
fx_dep = (fx / fx.shift(1, axis=1) - 1) * 100
fx_breaks = {}
for code in fx_dep.index:
    yrs = [int(y) for y, v in fx_dep.loc[code].items() if pd.notna(v) and v > 900]
    if yrs:
        fx_breaks[code] = yrs
fx_dep = fx_dep.where(~(fx_dep > 900))

# key: (frame, kind, wdi code, label, unit)
SERIES = {
    'gdp_growth': (raw['ny.gdp.mktp.kd.zg'], 'pct', 'NY.GDP.MKTP.KD.ZG', 'Real GDP growth', '% per year'),
    'gdppc_growth': (raw['ny.gdp.pcap.kd.zg'], 'pct', 'NY.GDP.PCAP.KD.ZG', 'Real GDP per capita growth', '% per year'),
    'gdp_usd': (gdp / 1e9, 'lvl4', 'NY.GDP.MKTP.CD', 'GDP, current US$', 'US$ bn'),
    'gdp_pc': (raw['ny.gdp.pcap.cd'], 'lvl5', 'NY.GDP.PCAP.CD', 'GDP per capita', 'US$'),
    'gdp_pc_ppp': (raw['ny.gdp.pcap.pp.cd'], 'lvl5', 'NY.GDP.PCAP.PP.CD', 'GDP per capita, PPP', 'int. $'),
    'investment': (raw['ne.gdi.totl.zs'], 'pct', 'NE.GDI.TOTL.ZS', 'Gross capital formation', '% of GDP'),
    'savings': (raw['ny.gns.ictr.zs'], 'pct', 'NY.GNS.ICTR.ZS', 'Gross national savings', '% of GDP'),
    'agr_share': (raw['nv.agr.totl.zs'], 'pct', 'NV.AGR.TOTL.ZS', 'Agriculture, value added', '% of GDP'),
    'ind_share': (raw['nv.ind.totl.zs'], 'pct', 'NV.IND.TOTL.ZS', 'Industry, value added', '% of GDP'),
    'srv_share': (on['nv_srv_totl_zs'], 'pct', 'NV.SRV.TOTL.ZS', 'Services, value added', '% of GDP'),
    'manf_share': (on['nv_ind_manf_zs'], 'pct', 'NV.IND.MANF.ZS', 'Manufacturing, value added', '% of GDP'),
    'inflation': (raw['fp.cpi.totl.zg'], 'pct', 'FP.CPI.TOTL.ZG', 'Inflation, consumer prices', '% per year'),
    'deflator': (raw['ny.gdp.defl.kd.zg'], 'pct', 'NY.GDP.DEFL.KD.ZG', 'Inflation, GDP deflator', '% per year'),
    'lending_rate': (raw['fr.inr.lend'], 'pct', 'FR.INR.LEND', 'Lending interest rate', '%'),
    'deposit_rate': (raw['fr.inr.dpst'], 'pct', 'FR.INR.DPST', 'Deposit interest rate', '%'),
    'spread': (raw['fr.inr.lndp'], 'pct', 'FR.INR.LNDP', 'Lending minus deposit rate', 'pp'),
    'real_rate': (raw['fr.inr.rinr'], 'pct', 'FR.INR.RINR', 'Real interest rate', '%'),
    'money_growth': (raw['fm.lbl.bmny.zg'], 'pct', 'FM.LBL.BMNY.ZG', 'Broad money growth', '% per year'),
    'private_credit': (raw['fs.ast.prvt.gd.zs'], 'pct', 'FS.AST.PRVT.GD.ZS', 'Domestic credit to private sector', '% of GDP'),
    'mktcap': (raw['cm.mkt.lcap.gd.zs'], 'pct', 'CM.MKT.LCAP.GD.ZS', 'Market capitalisation of listed companies', '% of GDP'),
    'npl': (raw.get('fb.ast.nper.zs'), 'pct', 'FB.AST.NPER.ZS', 'Bank non-performing loans', '% of gross loans'),
    'bank_capital': (raw.get('fb.bnk.capa.zs'), 'pct', 'FB.BNK.CAPA.ZS', 'Bank capital to assets', '%'),
    'fx': (fx, 'lvl5', 'PA.NUS.FCRF', 'Official exchange rate', 'LCU per US$'),
    'fx_change': (fx_dep, 'pct', 'PA.NUS.FCRF', 'Depreciation against the US$', '% per year'),
    'remittances': (ratio(raw['bx.trf.pwkr.cd.dt']), 'pct', 'BX.TRF.PWKR.CD.DT', 'Personal remittances received', '% of GDP'),
    'remit_usd': (raw['bx.trf.pwkr.cd.dt'] / 1e9, 'lvl4', 'BX.TRF.PWKR.CD.DT', 'Personal remittances received', 'US$ bn'),
    'remit_paid': (on['bm_trf_pwkr_cd_dt'] / 1e9 if on['bm_trf_pwkr_cd_dt'] is not None else None, 'lvl4', 'BM.TRF.PWKR.CD.DT', 'Personal remittances paid', 'US$ bn'),
    'current_account': (ratio(raw['bn.cab.xoka.cd']), 'pct', 'BN.CAB.XOKA.CD', 'Current account balance', '% of GDP'),
    'ca_usd': (raw['bn.cab.xoka.cd'] / 1e9, 'lvl4', 'BN.CAB.XOKA.CD', 'Current account balance', 'US$ bn'),
    'exports': (raw['ne.exp.gnfs.zs'], 'pct', 'NE.EXP.GNFS.ZS', 'Exports of goods and services', '% of GDP'),
    'imports': (raw['ne.imp.gnfs.zs'], 'pct', 'NE.IMP.GNFS.ZS', 'Imports of goods and services', '% of GDP'),
    'trade_bal': (raw['ne.exp.gnfs.zs'] - raw['ne.imp.gnfs.zs'], 'pct', 'NE.EXP.GNFS.ZS − NE.IMP.GNFS.ZS', 'Trade balance (goods and services)', '% of GDP'),
    'fdi': (ratio(raw['bx.klt.dinv.cd.wd']), 'pct', 'BX.KLT.DINV.CD.WD', 'Foreign direct investment, net inflows', '% of GDP'),
    'reserves': (raw['fi.res.totl.cd'] / 1e9, 'lvl4', 'FI.RES.TOTL.CD', 'Total reserves including gold', 'US$ bn'),
    'reserves_mo': (on['fi_res_totl_mo'], 'pct', 'FI.RES.TOTL.MO', 'Reserves in months of imports', 'months'),
    'ext_debt': (raw['dt.dod.dect.gn.zs'], 'pct', 'DT.DOD.DECT.GN.ZS', 'External debt stocks', '% of GNI'),
    'debt_service': (raw['dt.tds.dect.ex.zs'], 'pct', 'DT.TDS.DECT.EX.ZS', 'Total debt service', '% of exports'),
    'budget': (raw['gc.nld.totl.gd.zs'], 'pct', 'GC.NLD.TOTL.GD.ZS', 'Fiscal balance (net lending/borrowing)', '% of GDP'),
    'gov_debt': (raw['gc.dod.totl.gd.zs'], 'pct', 'GC.DOD.TOTL.GD.ZS', 'Central government debt', '% of GDP'),
    'revenue': (raw['gc.rev.xgrt.gd.zs'], 'pct', 'GC.REV.XGRT.GD.ZS', 'Government revenue, excluding grants', '% of GDP'),
    'spending': (raw['gc.xpn.totl.gd.zs'], 'pct', 'GC.XPN.TOTL.GD.ZS', 'Government expense', '% of GDP'),
    'tax': (raw['gc.tax.totl.gd.zs'], 'pct', 'GC.TAX.TOTL.GD.ZS', 'Tax revenue', '% of GDP'),
    'unemployment': (raw['sl.uem.totl.zs'], 'pct', 'SL.UEM.TOTL.ZS', 'Unemployment rate', '% of labour force'),
    'youth_unemp_f': (raw['sl.uem.1524.fe.zs'], 'pct', 'SL.UEM.1524.FE.ZS', 'Youth unemployment, female', '% of female labour force 15–24'),
    'youth_unemp_m': (raw['sl.uem.1524.ma.zs'], 'pct', 'SL.UEM.1524.MA.ZS', 'Youth unemployment, male', '% of male labour force 15–24'),
    'lfp_f': (raw['sl.tlf.cact.fe.zs'], 'pct', 'SL.TLF.CACT.FE.ZS', 'Labour force participation, female', '% of women 15+'),
    'lfp_m': (raw['sl.tlf.cact.ma.zs'], 'pct', 'SL.TLF.CACT.MA.ZS', 'Labour force participation, male', '% of men 15+'),
    'poverty': (raw['si.pov.dday'], 'pct', 'SI.POV.DDAY', 'Poverty headcount at the international line', '% of population'),
    'poverty_nat': (raw['si.pov.nahc'], 'pct', 'SI.POV.NAHC', 'Poverty headcount at national lines', '% of population'),
    'gini': (raw['si.pov.gini'], 'pct', 'SI.POV.GINI', 'Gini index', 'index'),
    'top20': (raw['si.dst.05th.20'], 'pct', 'SI.DST.05TH.20', 'Income share of the richest 20%', '%'),
    'bottom20': (raw['si.dst.frst.20'], 'pct', 'SI.DST.FRST.20', 'Income share of the poorest 20%', '%'),
    'population': (raw['sp.pop.totl'] / 1e6, 'lvl5', 'SP.POP.TOTL', 'Population', 'million'),
    'pop_growth': (raw['sp.pop.grow'], 'pct', 'SP.POP.GROW', 'Population growth', '% per year'),
}
SERIES = {k: v for k, v in SERIES.items() if v[0] is not None}


def fmt(v, kind):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return ''
    if kind == 'pct':
        s = f'{v:.2f}'
    else:
        sig = int(kind[3:])
        if v == 0:
            return '0'
        mag = math.floor(math.log10(abs(v)))
        dp = max(0, sig - 1 - mag)
        s = f'{round(v, dp):.{dp}f}'
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    if s in ('-0', ''):
        s = '0'
    return s


all_codes = set()
for v in SERIES.values():
    all_codes |= set(v[0].index)
countries = sorted(c for c in all_codes if c in meta)
groups = [g for g in GROUPS if g in all_codes]

out_s, coverage, ind_meta = {}, {}, {}
for key, (frame, kind, wcode, label, unit) in SERIES.items():
    ser, cov = {}, {}
    for code in countries + groups:
        if code not in frame.index:
            continue
        row = frame.loc[code].dropna()
        row = row[(row.index >= 1960) & (row.index <= YEAR_CAP)]
        row = row[[math.isfinite(float(x)) for x in row.values]]
        if row.empty:
            continue
        y0, y1 = int(row.index.min()), int(row.index.max())
        ser[code] = [y0, ','.join(fmt(float(row[y]), kind) if y in row.index else '' for y in range(y0, y1 + 1))]
        if code in countries:
            for y in row.index:
                cov[int(y)] = cov.get(int(y), 0) + 1
    out_s[key] = ser
    ind_meta[key] = dict(code=wcode, label=label, unit=unit,
                         url='https://data.worldbank.org/indicator/' + wcode.split(' ')[0])
    if cov:
        mx = max(cov.values())
        good = max(y for y, n in cov.items() if n >= 0.7 * mx)
        coverage[key] = dict(first=min(cov), last=max(cov), best=good, n=cov.get(good, 0))

# ---------------------------------------------------------------- automated checks
REVIEW = {'gdp_growth': (-30, 40), 'inflation': (-15, 200), 'deflator': (-30, 300), 'unemployment': (0, 40), 'fx_change': (-75, 300),
          'current_account': (-40, 40), 'budget': (-30, 30), 'gov_debt': (0, 250), 'pop_growth': (-5, 8),
          'money_growth': (-30, 200), 'real_rate': (-50, 50), 'lending_rate': (0, 100), 'exports': (0, 250),
          'imports': (0, 250), 'fdi': (-50, 100), 'remittances': (0, 60), 'poverty': (0, 100), 'poverty_nat': (0, 100),
          'gini': (15, 70), 'top20': (20, 80), 'bottom20': (0.5, 20), 'youth_unemp_f': (0, 80), 'youth_unemp_m': (0, 80),
          'lfp_f': (5, 100), 'lfp_m': (5, 100), 'debt_service': (0, 150), 'investment': (0, 80), 'savings': (-60, 80),
          'private_credit': (0, 300), 'ext_debt': (0, 400), 'revenue': (0, 80), 'spending': (0, 80), 'tax': (0, 80),
          'reserves_mo': (0, 40), 'npl': (0, 80), 'bank_capital': (0, 60), 'agr_share': (0, 80), 'ind_share': (0, 90), 'srv_share': (0, 100), 'manf_share': (0, 60)}
checked, flagged = 0, []
for key, (frame, kind, *_r) in SERIES.items():
    lo, hi = REVIEW.get(key, (-math.inf, math.inf))
    for code in countries:
        if code not in frame.index:
            continue
        row = frame.loc[code].dropna()
        row = row[(row.index >= 1960) & (row.index <= YEAR_CAP)]
        for y, v in row.items():
            if not math.isfinite(float(v)):
                continue
            checked += 1
            if v < lo or v > hi:
                over = (lo - v) if v < lo else (v - hi)
                flagged.append((over / max(1.0, abs(hi - lo)), key, code, int(y), float(v)))
flagged.sort(reverse=True)
pc_a, pc_b = (raw['ny.gdp.mktp.cd'] / raw['sp.pop.totl']).align(raw['ny.gdp.pcap.cd'], join='inner')
ratio_pc = (pc_a / pc_b).stack().dropna()
ratio_pc = ratio_pc[[c in meta for c in ratio_pc.index.get_level_values(0)]]
checks = dict(values=checked, indicators=len(SERIES), flagged_n=len(flagged),
              flagged=[[k, c, y, round(v, 2)] for _, k, c, y, v in flagged[:12]],
              pc_pairs=int(len(ratio_pc)), pc_within1=int(((ratio_pc - 1).abs() <= 0.01).sum()),
              pc_within5=int(((ratio_pc - 1).abs() <= 0.05).sum()))
print('checks', {k: v for k, v in checks.items() if k != 'flagged'})

# econ rows: [iso3, name, iso2, region, sub-region, m49, is_group, income group, flags(LDC|LLDC|SIDS), capital]
econ = []
for c in countries:
    m = meta[c]
    flags = ''.join(f for f, on_ in (('L', m['ldc']), ('D', m['lldc']), ('S', m['sids'])) if on_)
    econ.append([c, m['name'], m['iso2'], m['region'], m['sub'], m['num'], 0, income.get(c, ''), flags, m.get('capital', '')])
for g in groups:
    econ.append([g, GROUPS[g], '', 'Groups', '', '', 1, '', '', ''])

# ---------------------------------------------------------------- markets
def monthly(series):
    series = series.dropna()
    series = series[~series.index.duplicated(keep='last')].sort_index()
    start, end = series.index[0], series.index[-1]
    y, m = int(start[:4]), int(start[5:7])
    ey, em = int(end[:4]), int(end[5:7])
    vals = []
    while (y, m) <= (ey, em):
        v = series.get(f'{y:04d}-{m:02d}')
        vals.append(fmt(float(v), 'lvl5') if v is not None and not pd.isna(v) else '')
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return [start, ','.join(vals)]


def daily(df, col, n=400):
    df = df.dropna(subset=[col]).tail(n)
    return [[d, float(fmt(float(v), 'lvl5'))] for d, v in zip(df.iloc[:, 0], df[col])]


mk = {}
b = pd.read_csv(DH / 'oil-prices_data_brent-monthly.csv'); b['k'] = b['Date'].str[:7]
mk['brent'] = dict(m=monthly(b.set_index('k')['Price']), d=daily(pd.read_csv(DH / 'oil-prices_data_brent-daily.csv'), 'Price'))
w = pd.read_csv(DH / 'oil-prices_data_wti-monthly.csv'); w['k'] = w['Date'].str[:7]
wd = pd.read_csv(DH / 'oil-prices_data_wti-daily.csv'); wd = wd[wd['Price'] > 0]
mk['wti'] = dict(m=monthly(w.set_index('k')['Price']), d=daily(wd, 'Price'))
gm = pd.read_csv(DH / 'natural-gas_data_monthly.csv'); gm['k'] = gm['Month'].str[:7]
gd = pd.read_csv(DH / 'natural-gas_data_daily.csv')
mk['gas'] = dict(m=monthly(gm.set_index('k')['Price']), d=daily(gd, gd.columns[1]))
au = pd.read_csv(DH / 'gold-prices_data_monthly.csv'); au['k'] = au['Date'].str[:7]
mk['gold'] = dict(m=monthly(au[au['k'] >= '1960-01'].set_index('k')['Price']))
ty = pd.read_csv(DH / 'bond-yields-us-10y_data_monthly.csv'); ty['k'] = ty['Date'].str[:7]
mk['us10y'] = dict(m=monthly(ty.set_index('k')['Rate']))
cpi = pd.read_csv(DH / 'cpi-us_data_cpiai.csv'); cpi['k'] = cpi['Date'].str[:7]
ci = cpi.set_index('k')['Index']
ci = ci[~ci.index.duplicated(keep='last')]
ci = ci.reindex(pd.period_range(ci.index[0], ci.index[-1], freq='M').astype(str))
mk['uscpi'] = dict(m=monthly(((ci / ci.shift(12) - 1) * 100).round(2)))
fxm = pd.read_csv(DH / 'exchange-rates_data_monthly.csv'); fxm['k'] = fxm['Date'].str[:7]
CUR = {'Euro': 'EUR', 'Japan': 'JPY', 'United Kingdom': 'GBP', 'China': 'CNY', 'India': 'INR', 'Canada': 'CAD',
       'Australia': 'AUD', 'Switzerland': 'CHF', 'Brazil': 'BRL', 'Mexico': 'MXN', 'South Korea': 'KRW',
       'South Africa': 'ZAR', 'Singapore': 'SGD', 'Hong Kong': 'HKD', 'Sweden': 'SEK', 'Norway': 'NOK', 'Denmark': 'DKK',
       'New Zealand': 'NZD', 'Thailand': 'THB', 'Malaysia': 'MYR', 'Taiwan': 'TWD', 'Sri Lanka': 'LKR'}
mk['fx'] = {iso: monthly(fxm[fxm['Country'] == cname].set_index('k')['Exchange rate'])
            for cname, iso in CUR.items() if (fxm['Country'] == cname).any()}
MK_META = {
    'brent': dict(label='Brent crude oil', unit='US$ per barrel', src='U.S. Energy Information Administration, via DataHub (oil-prices)', url='https://www.eia.gov/dnav/pet/hist/RBRTED.htm'),
    'wti': dict(label='WTI crude oil', unit='US$ per barrel', src='U.S. Energy Information Administration, via DataHub (oil-prices)', url='https://www.eia.gov/dnav/pet/hist/RWTCD.htm'),
    'gas': dict(label='Henry Hub natural gas', unit='US$ per million Btu', src='U.S. Energy Information Administration, via DataHub (natural-gas)', url='https://www.eia.gov/dnav/ng/hist/rngwhhdm.htm'),
    'gold': dict(label='Gold', unit='US$ per troy ounce', src='DataHub gold-prices dataset', url='https://github.com/datasets/gold-prices'),
    'us10y': dict(label='US 10-year Treasury yield', unit='% a year', src='Federal Reserve (H.15), via DataHub', url='https://www.federalreserve.gov/releases/h15/'),
    'uscpi': dict(label='US consumer price inflation', unit='% y/y', src='U.S. Bureau of Labor Statistics CPI-U, via DataHub', url='https://www.bls.gov/cpi/'),
    'fx': dict(label='US dollar exchange rates', unit='units per US$', src='Federal Reserve (H.10), via DataHub', url='https://www.federalreserve.gov/releases/h10/'),
}

# ---------------------------------------------------------------- map and profiles
geo = json.load(open(GEO / 'geo.json'))
num2iso = {m['num']: c for c, m in meta.items() if m['num']}
paths = []
for gid, name, d in geo['paths']:
    iso = num2iso.get(gid) if gid else None
    iso = iso or {'Kosovo': 'XKX', 'Somaliland': 'SOM', 'N. Cyprus': 'CYP'}.get(name, '')
    paths.append([iso, d])
dj = json.load(open(GEO / 'dots.json'))
iso_list, iso_idx, flat = [], {}, []
for c_, r_, gid, name in dj['dots']:
    iso = (num2iso.get(gid) if gid else None) or {'Kosovo': 'XKX', 'Somaliland': 'SOM', 'N. Cyprus': 'CYP'}.get(name, '')
    if iso not in iso_idx:
        iso_idx[iso] = len(iso_list); iso_list.append(iso)
    flat += [c_, r_, iso_idx[iso]]
geo_out = dict(w=geo['w'], h=geo['h'], p=paths, dots=dict(s=dj['step'], iso=iso_list, d=flat))

PROF = {'ag.srf.totl.k2': 'area', 'ag.lnd.totl.k2': 'land', 'en.pop.dnst': 'density', 'sp.urb.totl.in.zs': 'urban',
        'sp.dyn.le00.in': 'life', 'sp.dyn.tfrt.in': 'fert', 'sp.pop.0014.to.zs': 'young', 'sp.pop.65up.to.zs': 'old',
        'sp.pop.totl.fe.zs': 'female', 'se.adt.litr.zs': 'literacy', 'ag.lnd.frst.zs': 'forest', 'ag.lnd.agri.zs': 'agri',
        'eg.elc.accs.zs': 'elec', 'sh.dyn.mort': 'u5mort', 'sp.dyn.imrt.in': 'infmort', 'sp.dyn.cbrt.in': 'birth'}
econ_codes = {e[0] for e in econ}
prof = {}
for code, key in PROF.items():
    f = WDI / f'{code}.csv'
    if not f.exists():
        continue
    with open(f, newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            iso, yr, v = row.get('Country Code'), row.get('Year'), row.get('Value')
            if iso not in econ_codes or not v:
                continue
            y, val = int(yr), float(v)
            cur = prof.setdefault(iso, {}).get(key)
            if cur is None or y > cur[0]:
                prof[iso][key] = [y, round(val, 4)]

data = dict(meta=dict(built=TODAY.isoformat(), first=1960, last=coverage['gdp_growth']['best'], checks=checks, euro=euro_done,
                      fx_breaks={k: v for k, v in fx_breaks.items() if k in meta}),
            econ=econ, cov=coverage, ind=ind_meta, s=out_s, mk=mk, mkmeta=MK_META, geo=geo_out, prof=prof)

# safety checks: stop (and keep the live site unchanged) if the download looks broken
assert len(countries) >= 200, 'too few economies'
assert coverage['gdp_growth']['n'] >= 150, 'too few growth figures for the latest year'
assert 'WLD' in out_s['gdp_growth'] and 'USA' in out_s['inflation'] and 'BGD' in out_s['inflation'], 'core series missing'
assert len(mk['brent']['m'][1]) > 1000 and len(mk['fx']) >= 15, 'market data missing'
assert sum(1 for c in countries if income.get(c)) >= 180, 'income groups missing'
js = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
(ROOT / 'build').mkdir(exist_ok=True)
(ROOT / 'build' / 'world.json').write_text(js, encoding='utf-8')
print('bytes', len(js.encode()), '| economies', len(countries), '| groups', groups, '| with income group', sum(1 for c in countries if income.get(c)))
for k in out_s:
    print(k.ljust(15), 'econ', len(out_s[k]), 'cov', coverage.get(k))
