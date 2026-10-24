#!/usr/bin/env python3
"""Check the downloaded data and write build/data.json for the website."""
import datetime, json, math
from pathlib import Path
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
GEO = ROOT / 'geo' if (ROOT / 'geo').is_dir() else ROOT
TODAY = datetime.datetime.now(datetime.timezone.utc).date()
YEAR_CAP = TODAY.year

WDI = str(ROOT / 'data' / 'raw' / 'wdi')
DH = str(ROOT / 'data' / 'raw' / 'dh')

# ---------- country metadata ----------
cc = pd.read_csv(f'{DH}/cc_main.csv', keep_default_na=False, dtype=str)
cc = cc[cc['ISO3166-1-Alpha-3'] != '']
NAME_FIX = {
    'COD': 'DR Congo', 'COG': 'Congo (Rep.)', 'MMR': 'Myanmar', 'HKG': 'Hong Kong SAR',
    'MAC': 'Macao SAR', 'PSE': 'West Bank and Gaza', 'VCT': 'St. Vincent and the Grenadines',
    'KNA': 'St. Kitts and Nevis', 'BIH': 'Bosnia and Herzegovina', 'TTO': 'Trinidad and Tobago',
    'ATG': 'Antigua and Barbuda', 'STP': 'São Tomé and Príncipe', 'TCA': 'Turks and Caicos Islands',
    'VIR': 'US Virgin Islands', 'MNP': 'Northern Mariana Islands', 'FSM': 'Micronesia',
    'USA': 'United States', 'GBR': 'United Kingdom', 'KOR': 'South Korea', 'PRK': 'North Korea',
    'CIV': 'Côte d’Ivoire', 'SXM': 'Sint Maarten', 'MAF': 'St. Martin (French part)',
    'CUW': 'Curaçao', 'TUR': 'Türkiye', 'CZE': 'Czechia', 'SWZ': 'Eswatini', 'CPV': 'Cabo Verde',
}
meta = {}
for _, r in cc.iterrows():
    code = r['ISO3166-1-Alpha-3']
    name = NAME_FIX.get(code) or r['CLDR display name'] or r['UNTERM English Short'] or code
    name = name.replace(' & ', ' and ')
    region = r['Region Name'] or ''
    sub = r['Sub-region Name'] or ''
    if sub in ('Latin America and the Caribbean', 'Sub-Saharan Africa') and r['Intermediate Region Name']:
        sub = r['Intermediate Region Name']
    num = r['ISO3166-1-numeric']
    meta[code] = dict(name=name, iso2=r['ISO3166-1-Alpha-2'], region=region, sub=sub,
                      num=num.zfill(3) if num else '')
meta['XKX'] = dict(name='Kosovo', iso2='XK', region='Europe', sub='Southern Europe', num='')
meta['CHI'] = dict(name='Channel Islands', iso2='', region='Europe', sub='Northern Europe', num='')

GROUPS = {
    'WLD': 'World', 'EAS': 'East Asia and Pacific', 'ECS': 'Europe and Central Asia',
    'LCN': 'Latin America and Caribbean', 'MEA': 'Middle East, North Africa, Afghanistan and Pakistan',
    'NAC': 'North America', 'SAS': 'South Asia', 'SSF': 'Sub-Saharan Africa', 'EUU': 'European Union',
    'EMU': 'Euro area', 'OED': 'OECD members', 'HIC': 'High income', 'UMC': 'Upper middle income',
    'LMC': 'Lower middle income', 'LIC': 'Low income',
}

def load(code):
    d = pd.read_csv(f'{WDI}/{code}.csv')
    d = d.dropna(subset=['Value'])
    d['Year'] = d['Year'].astype(int)
    return d.pivot_table(index='Country Code', columns='Year', values='Value', aggfunc='first')

raw = {}
for code in ['ny.gdp.mktp.kd.zg', 'ny.gdp.mktp.cd', 'ny.gdp.pcap.cd', 'ny.gdp.pcap.pp.cd', 'ne.gdi.totl.zs',
             'ny.gns.ictr.zs', 'fp.cpi.totl.zg', 'fr.inr.lend', 'fr.inr.rinr', 'fm.lbl.bmny.zg', 'pa.nus.fcrf',
             'sl.uem.totl.zs', 'sp.pop.totl', 'sp.pop.grow', 'gc.nld.totl.gd.zs', 'gc.dod.totl.gd.zs',
             'gc.rev.xgrt.gd.zs', 'gc.xpn.totl.gd.zs', 'gc.tax.totl.gd.zs', 'bn.cab.xoka.cd', 'ne.exp.gnfs.zs',
             'ne.imp.gnfs.zs', 'bx.klt.dinv.cd.wd', 'bx.trf.pwkr.cd.dt', 'fi.res.totl.cd', 'dt.dod.dect.gn.zs',
             'fs.ast.prvt.gd.zs', 'si.pov.dday', 'si.pov.nahc', 'si.pov.gini', 'si.dst.05th.20', 'si.dst.frst.20',
             'sl.uem.1524.fe.zs', 'sl.uem.1524.ma.zs', 'sl.tlf.cact.fe.zs', 'sl.tlf.cact.ma.zs', 'dt.tds.dect.ex.zs']:
    raw[code] = load(code)

gdp = raw['ny.gdp.mktp.cd']
def ratio(num):
    a, b = raw[num].align(gdp, join='inner')
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
fx_change = (fx.shift(1, axis=1) / fx - 1) * 100
# a currency cannot plausibly gain more than 100% against the dollar in one year: that is a change of currency unit
fx_breaks = {}
for code in fx_change.index:
    row = fx_change.loc[code]
    yrs = [int(y) for y, v in row.items() if pd.notna(v) and v > 100]
    if yrs:
        fx_breaks[code] = yrs
fx_change = fx_change.where(~(fx_change > 100))
print('euro converted', len(euro_done), sorted(euro_done), '| unit breaks', {k: v for k, v in fx_breaks.items()})

# key: (frame, kind) kind: 'pct' (2 dp) or 'lvl' (sig digits)
SERIES = {
    'gdp_growth': (raw['ny.gdp.mktp.kd.zg'], 'pct'),
    'gdp_usd': (gdp / 1e9, 'lvl4'),
    'gdp_pc': (raw['ny.gdp.pcap.cd'], 'lvl5'),
    'gdp_pc_ppp': (raw['ny.gdp.pcap.pp.cd'], 'lvl5'),
    'investment': (raw['ne.gdi.totl.zs'], 'pct'),
    'savings': (raw['ny.gns.ictr.zs'], 'pct'),
    'inflation': (raw['fp.cpi.totl.zg'], 'pct'),
    'lending_rate': (raw['fr.inr.lend'], 'pct'),
    'real_rate': (raw['fr.inr.rinr'], 'pct'),
    'money_growth': (raw['fm.lbl.bmny.zg'], 'pct'),
    'fx': (fx, 'lvl5'),
    'fx_change': (fx_change, 'pct'),
    'unemployment': (raw['sl.uem.totl.zs'], 'pct'),
    'population': (raw['sp.pop.totl'] / 1e6, 'lvl5'),
    'pop_growth': (raw['sp.pop.grow'], 'pct'),
    'budget': (raw['gc.nld.totl.gd.zs'], 'pct'),
    'gov_debt': (raw['gc.dod.totl.gd.zs'], 'pct'),
    'revenue': (raw['gc.rev.xgrt.gd.zs'], 'pct'),
    'spending': (raw['gc.xpn.totl.gd.zs'], 'pct'),
    'tax': (raw['gc.tax.totl.gd.zs'], 'pct'),
    'current_account': (ratio('bn.cab.xoka.cd'), 'pct'),
    'exports': (raw['ne.exp.gnfs.zs'], 'pct'),
    'imports': (raw['ne.imp.gnfs.zs'], 'pct'),
    'fdi': (ratio('bx.klt.dinv.cd.wd'), 'pct'),
    'remittances': (ratio('bx.trf.pwkr.cd.dt'), 'pct'),
    'reserves': (raw['fi.res.totl.cd'] / 1e9, 'lvl4'),
    'ext_debt': (raw['dt.dod.dect.gn.zs'], 'pct'),
    'private_credit': (raw['fs.ast.prvt.gd.zs'], 'pct'),
    'poverty': (raw['si.pov.dday'], 'pct'),
    'poverty_nat': (raw['si.pov.nahc'], 'pct'),
    'gini': (raw['si.pov.gini'], 'pct'),
    'top20': (raw['si.dst.05th.20'], 'pct'),
    'bottom20': (raw['si.dst.frst.20'], 'pct'),
    'youth_unemp_f': (raw['sl.uem.1524.fe.zs'], 'pct'),
    'youth_unemp_m': (raw['sl.uem.1524.ma.zs'], 'pct'),
    'lfp_f': (raw['sl.tlf.cact.fe.zs'], 'pct'),
    'lfp_m': (raw['sl.tlf.cact.ma.zs'], 'pct'),
    'debt_service': (raw['dt.tds.dect.ex.zs'], 'pct'),
}

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
for frame, _ in SERIES.values():
    all_codes |= set(frame.index)
countries = sorted(c for c in all_codes if c in meta)
groups = [g for g in GROUPS if g in all_codes]

out_s = {}
coverage = {}
for key, (frame, kind) in SERIES.items():
    ser = {}
    cov = {}
    for code in countries + groups:
        if code not in frame.index:
            continue
        row = frame.loc[code].dropna()
        row = row[(row.index >= 1960) & (row.index <= YEAR_CAP)]
        if row.empty:
            continue
        y0, y1 = int(row.index.min()), int(row.index.max())
        vals = []
        for y in range(y0, y1 + 1):
            v = row.get(y)
            vals.append(fmt(float(v), kind) if v is not None and not pd.isna(v) else '')
        ser[code] = [y0, ','.join(vals)]
        if code in countries:
            for y in row.index:
                cov[int(y)] = cov.get(int(y), 0) + 1
    out_s[key] = ser
    if cov:
        mx = max(cov.values())
        good = max(y for y, n in cov.items() if n >= 0.7 * mx)
        coverage[key] = dict(first=min(cov), last=max(cov), best=good, n=cov.get(good, 0))

# ---------- automated checks ----------
REVIEW = {'gdp_growth': (-30, 40), 'inflation': (-15, 200), 'unemployment': (0, 40), 'fx_change': (-75, 75),
          'current_account': (-40, 40), 'budget': (-30, 30), 'gov_debt': (0, 250), 'pop_growth': (-5, 8),
          'money_growth': (-30, 200), 'real_rate': (-50, 50), 'lending_rate': (0, 100), 'exports': (0, 250),
          'imports': (0, 250), 'fdi': (-50, 100), 'remittances': (0, 60), 'poverty': (0, 100), 'poverty_nat': (0, 100),
          'gini': (15, 70), 'top20': (20, 80), 'bottom20': (0.5, 20), 'youth_unemp_f': (0, 80), 'youth_unemp_m': (0, 80),
          'lfp_f': (5, 100), 'lfp_m': (5, 100), 'debt_service': (0, 150), 'investment': (0, 80), 'savings': (-60, 80),
          'private_credit': (0, 300), 'ext_debt': (0, 400), 'revenue': (0, 80), 'spending': (0, 80), 'tax': (0, 80)}
checked, flagged = 0, []
for key, (frame, kind) in SERIES.items():
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

econ = []
for c in countries:
    m = meta[c]
    econ.append([c, m['name'], m['iso2'], m['region'], m['sub'], m['num'], 0])
for g in groups:
    econ.append([g, GROUPS[g], '', 'Groups', '', '', 1])

# ---------- markets ----------
def monthly(series):  # pandas Series indexed by 'YYYY-MM'
    series = series.dropna()
    series = series[~series.index.duplicated(keep='last')].sort_index()
    start = series.index[0]
    y, m = int(start[:4]), int(start[5:7])
    end = series.index[-1]
    ey, em = int(end[:4]), int(end[5:7])
    vals = []
    while (y, m) <= (ey, em):
        k = f'{y:04d}-{m:02d}'
        v = series.get(k)
        vals.append(fmt(float(v), 'lvl5') if v is not None and not pd.isna(v) else '')
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return [start, ','.join(vals)]

def daily(df, col, n=400):
    df = df.dropna(subset=[col]).tail(n)
    return [[d, float(fmt(float(v), 'lvl5'))] for d, v in zip(df.iloc[:, 0], df[col])]

mk = {}
b = pd.read_csv(f'{DH}/oil-prices_data_brent-monthly.csv'); b['k'] = b['Date'].str[:7]
bd = pd.read_csv(f'{DH}/oil-prices_data_brent-daily.csv')
mk['brent'] = dict(m=monthly(b.set_index('k')['Price']), d=daily(bd, 'Price'))
w = pd.read_csv(f'{DH}/oil-prices_data_wti-monthly.csv'); w['k'] = w['Date'].str[:7]
wd = pd.read_csv(f'{DH}/oil-prices_data_wti-daily.csv')
wd = wd[wd['Price'] > 0]  # drop the April 2020 negative print from daily tail (outside window anyway)
mk['wti'] = dict(m=monthly(w.set_index('k')['Price']), d=daily(wd, 'Price'))
gm = pd.read_csv(f'{DH}/natural-gas_data_monthly.csv'); gm['k'] = gm['Month'].str[:7]
gd = pd.read_csv(f'{DH}/natural-gas_data_daily.csv')
mk['gas'] = dict(m=monthly(gm.set_index('k')['Price']), d=daily(gd, gd.columns[1]))
au = pd.read_csv(f'{DH}/gold-prices_data_monthly.csv'); au['k'] = au['Date'].str[:7]
au = au[au['k'] >= '1960-01']
mk['gold'] = dict(m=monthly(au.set_index('k')['Price']))
ty = pd.read_csv(f'{DH}/bond-yields-us-10y_data_monthly.csv'); ty['k'] = ty['Date'].str[:7]
mk['us10y'] = dict(m=monthly(ty.set_index('k')['Rate']))
cpi = pd.read_csv(f'{DH}/cpi-us_data_cpiai.csv'); cpi['k'] = cpi['Date'].str[:7]
ci = cpi.set_index('k')['Index']
full = pd.period_range(ci.index[0], ci.index[-1], freq='M').astype(str)
ci = ci.reindex(full)  # keeps gaps (e.g. Oct 2025, when no CPI was published)
yoy = (ci / ci.shift(12) - 1) * 100  # shift by calendar month on the complete index
mk['uscpi'] = dict(m=monthly(yoy.round(2)))
# fx (units of currency per US dollar)
fxm = pd.read_csv(f'{DH}/exchange-rates_data_monthly.csv'); fxm['k'] = fxm['Date'].str[:7]
CUR = {'Euro': 'EUR', 'Japan': 'JPY', 'United Kingdom': 'GBP', 'China': 'CNY', 'India': 'INR',
       'Canada': 'CAD', 'Australia': 'AUD', 'Switzerland': 'CHF', 'Brazil': 'BRL', 'Mexico': 'MXN',
       'South Korea': 'KRW', 'South Africa': 'ZAR', 'Singapore': 'SGD', 'Hong Kong': 'HKD',
       'Sweden': 'SEK', 'Norway': 'NOK', 'Denmark': 'DKK', 'New Zealand': 'NZD', 'Thailand': 'THB',
       'Malaysia': 'MYR', 'Taiwan': 'TWD', 'Sri Lanka': 'LKR'}
fxo = {}
for cname, iso in CUR.items():
    s = fxm[fxm['Country'] == cname].set_index('k')['Exchange rate']
    if len(s):
        fxo[iso] = monthly(s)
mk['fx'] = fxo

# ---------- map ----------
geo = json.load(open(GEO / 'geo.json'))
num2iso = {m['num']: c for c, m in meta.items() if m['num']}
paths = []
for gid, name, d in geo['paths']:
    if gid and gid in num2iso:
        iso = num2iso[gid]
    elif name == 'Kosovo':
        iso = 'XKX'
    elif name == 'Somaliland':
        iso = 'SOM'
    else:
        iso = ''
    paths.append([iso, d])
dj = json.load(open(GEO / 'dots.json'))
iso_list, iso_idx, flat = [], {}, []
for c_, r_, gid, name in dj['dots']:
    iso = num2iso.get(gid) if gid else None
    if not iso:
        iso = {'Kosovo': 'XKX', 'Somaliland': 'SOM', 'N. Cyprus': 'CYP'}.get(name, '')
    if iso not in iso_idx:
        iso_idx[iso] = len(iso_list); iso_list.append(iso)
    flat += [c_, r_, iso_idx[iso]]
geo_out = dict(w=geo['w'], h=geo['h'], p=paths, dots=dict(s=dj['step'], iso=iso_list, d=flat))

econ_codes = {e[0] for e in econ}
data = dict(
    meta=dict(built=TODAY.isoformat(), first=1960, last=coverage['gdp_growth']['best'], checks=checks, euro=euro_done, fx_breaks={k: v for k, v in fx_breaks.items() if k in meta}),
    econ=econ, cov=coverage, s=out_s, mk=mk, geo=geo_out,
)
PROF_CODES = {'ag.srf.totl.k2': 'area', 'ag.lnd.totl.k2': 'land', 'en.pop.dnst': 'density', 'sp.urb.totl.in.zs': 'urban', 'sp.dyn.le00.in': 'life',
              'sp.dyn.tfrt.in': 'fert', 'sp.pop.0014.to.zs': 'young', 'sp.pop.65up.to.zs': 'old', 'sp.pop.totl.fe.zs': 'female', 'se.adt.litr.zs': 'literacy',
              'ag.lnd.frst.zs': 'forest', 'ag.lnd.agri.zs': 'agri', 'eg.elc.accs.zs': 'elec', 'sh.dyn.mort': 'u5mort', 'sp.dyn.imrt.in': 'infmort', 'sp.dyn.cbrt.in': 'birth'}
prof = {}
for code, key in PROF_CODES.items():  # latest value and year for each economy (optional block)
    f = Path(WDI) / f'{code}.csv'
    if not f.exists():
        continue
    try:
        import csv as _csv
        with open(f, newline='', encoding='utf-8') as fh:
            for row in _csv.DictReader(fh):
                iso, yr, v = row.get('Country Code'), row.get('Year'), row.get('Value')
                if iso not in econ_codes or not v:
                    continue
                y, val = int(yr), float(v)
                cur = prof.setdefault(iso, {}).get(key)
                if cur is None or y > cur[0]:
                    prof[iso][key] = [y, round(val, 4)]
    except Exception as e:
        print('profile indicator skipped:', code, e)
data['prof'] = prof
# safety checks: stop (and keep the live site unchanged) if the download looks broken
assert len(countries) >= 200, 'too few economies'
assert coverage['gdp_growth']['n'] >= 150, 'too few growth figures for the latest year'
assert 'WLD' in out_s['gdp_growth'] and 'USA' in out_s['inflation'], 'core series missing'
assert len(mk['brent']['m'][1]) > 1000 and len(mk['fx']) >= 15, 'market data missing'
js = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
(ROOT / 'build').mkdir(exist_ok=True)
(ROOT / 'build' / 'data.json').write_text(js, encoding='utf-8')
print('bytes', len(js.encode()))
for k in out_s:
    print(k.ljust(16), 'econ', len(out_s[k]), 'cov', coverage.get(k), 'bytes', len(json.dumps(out_s[k])))
print('markets bytes', len(json.dumps(mk)), 'geo bytes', len(json.dumps(geo_out)))
print('fx', list(fxo))
print('missing map iso', [n for (gid, n, d) in geo['paths'] if not ((gid and gid in num2iso) or n in ('Kosovo', 'Somaliland'))])
