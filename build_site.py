#!/usr/bin/env python3
"""Build Macroarianalytics.

Outputs
  public/                     the self-hosted site (upload this folder to any static host; Cloudflare Pages recommended)
    index.html                one page with the data embedded (gzip + base64), CSS, and the application script
    vendor/echarts.min.js     Apache ECharts 5.6.0 (loaded with Subresource Integrity; jsDelivr copy as fallback)
    data/*.json               the full Bangladesh Bank Economic Trends catalogue and data (loaded on demand)
    _headers                  security headers (Cloudflare Pages / Netlify format), incl. frame-ancestors 'none'
    robots.txt, sitemap.xml, 404.html, .well-known/security.txt
  build/preview.html          the same site as one file for an embedded preview (no doctype; ECharts from cdnjs)

Run from the project folder:  python3 scripts/build_site.py
"""
import base64, datetime, gzip, hashlib, json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, BUILD, PUB = ROOT / 'src', ROOT / 'build', ROOT / 'public'
CFG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
JS_ORDER = ['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js', 'charts.js', 'maps.js', 'analysis.js', 'pages-country.js', 'pages-country2.js',
            'pages-country3.js', 'pages-world.js', 'pages-models.js', 'pages-misc.js', 'security.js', 'app.js']
FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap'
ECHARTS_CDNJS = 'https://cdnjs.cloudflare.com/ajax/libs/echarts/5.6.0/echarts.min.js'
ECHARTS_JSDELIVR = 'https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js'
TITLE = 'Macroarianalytics'
DESC = 'Macroeconomic monitor and forecasts for Bangladesh and about 200 economies: charts, tables, comparisons, tests, robustness and placebo checks, and models from ARIMA to an estimated DSGE, with every number sourced.'


def gzb64(obj):
    raw = json.dumps(obj, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    return base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode('ascii')


def sri(data, alg='sha384'):
    return f'{alg}-' + base64.b64encode(hashlib.new(alg, data).digest()).decode()


def verification():
    """Run every verification script and record how many checks pass."""
    jobs = [('Descriptive statistics, distributions, OLS and diagnostics, unit-root tests', 'verify_stats.mjs', 'statsmodels 0.15, scipy 1.18', 'Statistics and tests'),
            ('VAR, causality, impulse responses, FEVD, Johansen, Engle–Granger, HP filter, ARMA forecasts', 'verify_ts.mjs', 'statsmodels 0.15', 'Time-series models'),
            ('Welch, Mann–Whitney, Kruskal–Wallis, ANOVA, Brown–Forsythe', 'verify_eval.mjs', 'scipy 1.18', 'Heterogeneity tests'),
            ('GARCH(1,1) and GJR-GARCH parameters, robust standard errors, log-likelihood', 'verify_garch.mjs', 'arch 8.0', 'Volatility models'),
            ('DSGE solution and impulse responses of the in-browser model against the estimation code', 'verify_dsge.mjs', 'scripts/bd_dsge.py (NumPy)', 'DSGE')]
    out = []
    for what, script, ref, area in jobs:
        try:
            r = subprocess.run(['node', str(ROOT / 'scripts' / script)], capture_output=True, text=True, timeout=900)
            m = re.findall(r'(\d+)/(\d+) [\w ]*checks passed', r.stdout)
            if m:
                ok, n = map(int, m[-1]); out.append({'area': area, 'what': what, 'ref': ref, 'checks': n, 'passed': ok})
                print(f'  verify {script}: {ok}/{n}')
            else:
                print(f'  verify {script}: no result ({r.stderr[-200:]})')
        except Exception as e:  # a missing reference file never stops the build
            print(f'  verify {script} skipped: {e}')
    return out


def bundle_js(embed):
    cfg = {k: CFG.get(k) for k in ('domain', 'site_name', 'owner', 'owner_title', 'show_owner', 'official_hosts', 'contact_form', 'security_contact')}
    cfg['alerts'] = {k: CFG.get('alerts', {}).get(k) for k in ('endpoint', 'min_interval_s')}
    if not CFG.get('show_owner'):  # the owner's name is written into the page only when it is to be shown
        cfg.pop('owner', None); cfg.pop('owner_title', None)
    head = f'window.MA_CONFIG = {json.dumps(cfg, ensure_ascii=False)}; window.MA_EMBED = {"true" if embed else "false"};\n'
    return head + '\n'.join((SRC / 'js' / f).read_text(encoding='utf-8') for f in JS_ORDER)


def data_tags():
    world = json.loads((BUILD / 'world.json').read_text())
    bd = json.loads((BUILD / 'bd_data.json').read_text())
    maps = json.loads((ROOT / 'data' / 'geo' / 'geo.json').read_text())['maps']
    models = {'verify': VERIFY}
    if (BUILD / 'bd_dsge.json').exists():
        models['dsge'] = json.loads((BUILD / 'bd_dsge.json').read_text())
    wfc = json.loads((BUILD / 'world_fc.json').read_text()) if (BUILD / 'world_fc.json').exists() else None
    tags = []
    for tid, obj in (('d-world', world), ('d-bd', bd), ('d-models', models), ('d-maps', maps), ('d-worldfc', wfc)):
        if obj is not None:
            tags.append(f'<script type="application/json" id="{tid}" data-z="gz">{gzb64(obj)}</script>')
    return '\n'.join(tags), world, bd


SKELETON = '''<header id="mast" class="mast"></header>
<div id="shell" class="shell"><aside id="side" class="side" aria-label="Contents"></aside><main id="main" class="content"><div id="content" class="content-in"><p class="note"><span class="spinner"></span> Loading the data and the statistics engine…</p></div></main></div>
<footer id="foot" class="foot"></footer>
<noscript><div class="banner">This site needs JavaScript to draw its charts and compute its statistics.</div></noscript>'''
ICON = "data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 24'%3E%3Crect x='1' y='14' width='5' height='9' rx='1' fill='%232a78d6'/%3E%3Crect x='8' y='9' width='5' height='14' rx='1' fill='%231baf7a'/%3E%3Crect x='15' y='4' width='5' height='19' rx='1' fill='%230b6b57'/%3E%3C/svg%3E"


def build():
    global VERIFY
    vf = BUILD / 'verify_summary.json'
    if '--fast' in sys.argv and vf.exists(): VERIFY = json.loads(vf.read_text()); print('verification: reused', sum(v['passed'] for v in VERIFY), 'checks')
    else: print('verification:'); VERIFY = verification(); vf.write_text(json.dumps(VERIFY, indent=1))
    if '--strict' in sys.argv and (len(VERIFY) < 5 or any(v['passed'] < v['checks'] for v in VERIFY)):
        raise SystemExit('verification incomplete or failing: ' + json.dumps(VERIFY))
    css = (SRC / 'css' / 'site.css').read_text(encoding='utf-8')
    tags, world, bd = data_tags()
    today = datetime.date.today().isoformat()
    # ---------------------------------------------------------- self-hosted site
    if PUB.exists(): shutil.rmtree(PUB)
    (PUB / 'vendor').mkdir(parents=True); (PUB / 'data').mkdir(); (PUB / '.well-known').mkdir()
    ech = (ROOT / 'vendor' / 'echarts.min.js').read_bytes(); (PUB / 'vendor' / 'echarts.min.js').write_bytes(ech); ech_sri = sri(ech)
    loader = f"if(!window.echarts){{document.write('<script src=\"{ECHARTS_JSDELIVR}\" integrity=\"{ech_sri}\" crossorigin=\"anonymous\"><\\/script>')}}"
    app = bundle_js(embed=False)
    hashes = ' '.join(f"'sha256-{base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()}'" for s in (loader, app))
    origins = {re.match(r'https?://[^/]+', u).group(0) for u in (CFG.get('alerts', {}).get('endpoint') or '', CFG.get('contact_form') or '') if u and re.match(r'https?://', u)}
    if 'https://script.google.com' in origins: origins.add('https://script.googleusercontent.com')  # Apps Script web apps answer through a redirect
    csp = (f"default-src 'none'; script-src 'self' {hashes} https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
           f"img-src 'self' data: blob:; connect-src 'self' {' '.join(sorted(origins))}; base-uri 'none'; form-action 'none'; object-src 'none'; manifest-src 'self'; worker-src 'none'").replace('  ', ' ')
    dom = CFG.get('domain', '')
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{TITLE} · {CFG.get('site_name', '')}</title><meta name="description" content="{DESC}">
<link rel="canonical" href="https://{dom}/"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESC}"><meta property="og:type" content="website"><meta property="og:url" content="https://{dom}/"><meta property="og:image" content="https://{dom}/og-image.png">
<meta name="theme-color" content="#0b6b57"><link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="{FONTS}">
<style>{css}</style></head><body>
{SKELETON}
{tags}
<script src="vendor/echarts.min.js" integrity="{ech_sri}" crossorigin="anonymous"></script>
<script>{loader}</script>
<script>{app}</script>
</body></html>'''
    (PUB / 'index.html').write_text(html, encoding='utf-8')
    for f in ('bd_catalog.json', 'bd_M.json', 'bd_Q.json', 'bd_FY.json', 'bd_CY.json'):
        shutil.copy(ROOT / 'data' / 'bd' / f, PUB / 'data' / f)
    if (SRC / 'og-image.png').exists(): shutil.copy(SRC / 'og-image.png', PUB / 'og-image.png')
    headers = f'''/*
  Content-Security-Policy: {csp}; frame-ancestors 'none'; upgrade-insecure-requests
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
/data/*
  Cache-Control: public, max-age=86400
/vendor/*
  Cache-Control: public, max-age=31536000, immutable
'''
    (PUB / '_headers').write_text(headers, encoding='utf-8')
    (PUB / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nCrawl-delay: 10\nSitemap: https://{dom}/sitemap.xml\n', encoding='utf-8')
    urls = ['', '#c.BGD', '#world', '#models', '#data', '#countries', '#learn', '#refs'] + [f'#c.BGD.{c["id"]}.charts' for c in bd['cats']]
    (PUB / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://{dom}/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (PUB / '404.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/"><title>Not found</title></head><body><p>Page not found. <a href="/">Go to the home page</a>.</p></body></html>', encoding='utf-8')
    exp = (datetime.date.today() + datetime.timedelta(days=360)).isoformat()
    (PUB / '.well-known' / 'security.txt').write_text(f'Contact: {CFG.get("security_contact") or "https://" + dom + "/#contact"}\nExpires: {exp}T00:00:00.000Z\nPreferred-Languages: en, bn\nCanonical: https://{dom}/.well-known/security.txt\n', encoding='utf-8')
    print('public/index.html', round((PUB / 'index.html').stat().st_size / 1e6, 2), 'MB')
    # ---------------------------------------------------------- single-file preview (artifact contract: no doctype/html/head/body)
    app_e = bundle_js(embed=True)
    prev = f'''<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{FONTS}">
<style>{css}</style>
{SKELETON}
{tags}
<script src="{ECHARTS_CDNJS}"></script>
<script>if(!window.echarts){{document.write('<script src="{ECHARTS_JSDELIVR}"><\\/script>')}}</script>
<script>{app_e}</script>
'''
    (BUILD / 'preview.html').write_text(prev, encoding='utf-8')
    print('build/preview.html', round((BUILD / 'preview.html').stat().st_size / 1e6, 2), 'MB')


if __name__ == '__main__':
    build()
