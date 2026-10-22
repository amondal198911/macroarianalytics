#!/usr/bin/env python3
"""Download the open data used by Macro-Economic Monitor into data/raw/."""
import pathlib, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
RAW = ROOT / 'data' / 'raw'
GH = 'https://raw.githubusercontent.com/datasets/'
WDI_CODES = [
    'ny.gdp.mktp.kd.zg', 'ny.gdp.mktp.cd', 'ny.gdp.pcap.cd', 'ny.gdp.pcap.pp.cd', 'ne.gdi.totl.zs', 'ny.gns.ictr.zs',
    'fp.cpi.totl.zg', 'fr.inr.lend', 'fr.inr.rinr', 'fm.lbl.bmny.zg', 'pa.nus.fcrf', 'sl.uem.totl.zs', 'sp.pop.totl',
    'sp.pop.grow', 'gc.nld.totl.gd.zs', 'gc.dod.totl.gd.zs', 'gc.rev.xgrt.gd.zs', 'gc.xpn.totl.gd.zs', 'gc.tax.totl.gd.zs',
    'bn.cab.xoka.cd', 'ne.exp.gnfs.zs', 'ne.imp.gnfs.zs', 'bx.klt.dinv.cd.wd', 'bx.trf.pwkr.cd.dt', 'fi.res.totl.cd',
    'dt.dod.dect.gn.zs', 'fs.ast.prvt.gd.zs', 'si.pov.dday', 'si.pov.nahc', 'si.pov.gini', 'si.dst.05th.20',
    'si.dst.frst.20', 'sl.uem.1524.fe.zs', 'sl.uem.1524.ma.zs', 'sl.tlf.cact.fe.zs', 'sl.tlf.cact.ma.zs', 'dt.tds.dect.ex.zs']
DATAHUB = {
    'oil-prices_data_brent-monthly.csv': 'oil-prices/main/data/brent-monthly.csv',
    'oil-prices_data_brent-daily.csv': 'oil-prices/main/data/brent-daily.csv',
    'oil-prices_data_wti-monthly.csv': 'oil-prices/main/data/wti-monthly.csv',
    'oil-prices_data_wti-daily.csv': 'oil-prices/main/data/wti-daily.csv',
    'natural-gas_data_monthly.csv': 'natural-gas/main/data/monthly.csv',
    'natural-gas_data_daily.csv': 'natural-gas/main/data/daily.csv',
    'gold-prices_data_monthly.csv': 'gold-prices/main/data/monthly.csv',
    'bond-yields-us-10y_data_monthly.csv': 'bond-yields-us-10y/main/data/monthly.csv',
    'cpi-us_data_cpiai.csv': 'cpi-us/main/data/cpiai.csv',
    'exchange-rates_data_monthly.csv': 'exchange-rates/main/data/monthly.csv',
    'cc_main.csv': 'country-codes/main/data/country-codes.csv',
}

def fetch(url, dest, tries=4):
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                body = r.read()
            if len(body) < 200:
                raise ValueError('file is unexpectedly small')
            dest.write_bytes(body)
            return
        except Exception as e:
            if i == tries - 1:
                raise SystemExit(f'Download failed: {url} ({e})')
            time.sleep(5 * (i + 1))

if __name__ == '__main__':
    for code in WDI_CODES:
        fetch(f'{GH}world-development-indicators/main/indicators/{code}/data.csv', RAW / 'wdi' / f'{code}.csv')
    for name, path in DATAHUB.items():
        fetch(GH + path, RAW / 'dh' / name)
    print('Downloaded', len(WDI_CODES) + len(DATAHUB), 'files into', RAW)
