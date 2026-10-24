#!/usr/bin/env python3
"""Download the open data used by Macroarianalytics into data/raw/.

Sources (all public, fetched from GitHub-hosted mirrors so the job also runs on GitHub Actions):
  * World Bank, World Development Indicators (CC BY 4.0) via the DataHub mirror
    https://github.com/datasets/world-development-indicators  (per-indicator CSV files)
  * World Bank WDI via the Gapminder Open Numbers mirror (extra indicators and the World Bank income groups)
    https://github.com/open-numbers/ddf--open_numbers--world_development_indicators
  * Market prices (U.S. EIA oil and gas, gold, U.S. Treasury 10-year yield, U.S. BLS CPI, Federal Reserve exchange rates)
    via DataHub core datasets, and ISO/UN country codes (country-codes dataset).
Bangladesh Bank / BBS series are not downloaded here: they ship in data/bd/ (Monthly Economic Trends and NSDP tables).
"""
import pathlib, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
RAW = ROOT / 'data' / 'raw'
GH = 'https://raw.githubusercontent.com/datasets/'
ON = 'https://raw.githubusercontent.com/open-numbers/ddf--open_numbers--world_development_indicators/master/'

# World Bank WDI codes taken from the DataHub mirror
WDI_CODES = [
    'ny.gdp.mktp.kd.zg', 'ny.gdp.pcap.kd.zg', 'ny.gdp.mktp.cd', 'ny.gdp.pcap.cd', 'ny.gdp.pcap.pp.cd', 'ne.gdi.totl.zs',
    'ny.gns.ictr.zs', 'nv.agr.totl.zs', 'nv.ind.totl.zs', 'fp.cpi.totl.zg', 'ny.gdp.defl.kd.zg', 'fr.inr.lend', 'fr.inr.dpst',
    'fr.inr.lndp', 'fr.inr.rinr', 'fm.lbl.bmny.zg', 'pa.nus.fcrf', 'sl.uem.totl.zs', 'sp.pop.totl', 'sp.pop.grow',
    'gc.nld.totl.gd.zs', 'gc.dod.totl.gd.zs', 'gc.rev.xgrt.gd.zs', 'gc.xpn.totl.gd.zs', 'gc.tax.totl.gd.zs', 'bn.cab.xoka.cd',
    'ne.exp.gnfs.zs', 'ne.imp.gnfs.zs', 'bx.klt.dinv.cd.wd', 'bx.trf.pwkr.cd.dt', 'fi.res.totl.cd', 'dt.dod.dect.gn.zs',
    'fs.ast.prvt.gd.zs', 'cm.mkt.lcap.gd.zs', 'si.pov.dday', 'si.pov.nahc', 'si.pov.gini', 'si.dst.05th.20', 'si.dst.frst.20',
    'sl.uem.1524.fe.zs', 'sl.uem.1524.ma.zs', 'sl.tlf.cact.fe.zs', 'sl.tlf.cact.ma.zs', 'dt.tds.dect.ex.zs',
    'fb.ast.nper.zs', 'fb.bnk.capa.zs']
# Country profile figures (optional: a failed download never stops the update)
PROF_CODES = ['ag.srf.totl.k2', 'ag.lnd.totl.k2', 'en.pop.dnst', 'sp.urb.totl.in.zs', 'sp.dyn.le00.in', 'sp.dyn.tfrt.in',
              'sp.pop.0014.to.zs', 'sp.pop.65up.to.zs', 'sp.pop.totl.fe.zs', 'se.adt.litr.zs', 'ag.lnd.frst.zs', 'ag.lnd.agri.zs',
              'eg.elc.accs.zs', 'sh.dyn.mort', 'sp.dyn.imrt.in', 'sp.dyn.cbrt.in']
# Extra WDI indicators that the DataHub mirror does not carry (Open Numbers file names use underscores)
ON_CODES = ['nv_srv_totl_zs', 'nv_ind_manf_zs', 'fi_res_totl_mo', 'bm_trf_pwkr_cd_dt']
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


def fetch(url, dest, tries=4, min_bytes=200):
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(tries):
        try:
            req = urllib.request.Request(url.replace(' ', '%20'), headers={'User-Agent': 'macroarianalytics-data-update'})
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read()
            if len(body) < min_bytes:
                raise ValueError('file is unexpectedly small')
            dest.write_bytes(body)
            return True
        except Exception as e:
            if i == tries - 1:
                raise SystemExit(f'Download failed: {url} ({e})')
            time.sleep(5 * (i + 1))


def optional(url, dest):
    try:
        return fetch(url, dest, tries=2)
    except SystemExit as e:
        print('optional file skipped:', url, e)
        return False


if __name__ == '__main__':
    for code in WDI_CODES:
        fetch(f'{GH}world-development-indicators/main/indicators/{code}/data.csv', RAW / 'wdi' / f'{code}.csv')
    for code in PROF_CODES:
        optional(f'{GH}world-development-indicators/main/indicators/{code}/data.csv', RAW / 'wdi' / f'{code}.csv')
    for code in ON_CODES:
        optional(f'{ON}datapoints/ddf--datapoints--{code}--by--geo--time.csv', RAW / 'on' / f'{code}.csv')
    fetch(ON + 'ddf--entities--geo--country.csv', RAW / 'on' / 'countries.csv')
    for name, path in DATAHUB.items():
        fetch(GH + path, RAW / 'dh' / name)
    print('Downloaded into', RAW)
