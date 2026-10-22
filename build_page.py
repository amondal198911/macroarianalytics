#!/usr/bin/env python3
"""Assemble Macro-Economic Monitor from src/ and build/data.json.

  python scripts/build_page.py                   -> public/  (website for your own web address)
  python scripts/build_page.py --artifact FILE   -> one self-contained HTML file (the claude.ai copy)
"""
import html, json, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent if HERE.name == 'scripts' else HERE
SRC = ROOT / 'src' if (ROOT / 'src').is_dir() else ROOT
CFG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
DOMAIN = CFG['domain'].replace('https://', '').replace('http://', '').strip('/ ')
SITE = 'https://' + DOMAIN + '/'
NAME = CFG.get('site_name', 'Macro-Economic Monitor')
OWNER = CFG.get('owner', 'Arian Mondal')
DESC = ('Growth, inflation, jobs, poverty, public finances, trade and market prices for more than 200 economies, '
        'plus a Bangladesh monitor and a forecasting lab, explained in plain language, using official data from '
        'the World Bank, Bangladesh Bank and other public sources.')
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' "
        "font-size='90'%3E%F0%9F%93%88%3C/text%3E%3C/svg%3E")
MINUS = '\u2212'
E = html.escape


def read(name):
    return (SRC / name).read_text(encoding='utf-8')


def assemble(raw, seo):
    bdjs = read('bd.js') if (SRC / 'bd.js').exists() else ''
    js = read('app.js').replace('/*__EXT__*/', read('ext.js') + '\n' + bdjs)
    if '</script' in js.lower():
        raise SystemExit('The script contains </script, which would break the page.')
    css = read('styles.css') + '\n' + read('styles2.css')
    page = read('shell.html').replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
    page = page.replace('/*__DATA__*/', raw.replace('</', '<\\/'))
    bdm = ROOT / 'bd_models.json'
    page = page.replace('/*__BD_DATA__*/', bdm.read_text(encoding='utf-8').replace('</', '<\\/') if bdm.exists() else 'null')
    if seo:
        page = page.replace('</title>', '</title>\n' + head_tags(), 1)
    return page


def head_tags():
    ld = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': NAME, 'url': SITE, 'description': DESC,
           'author': {'@type': 'Person', 'name': OWNER}},
          {'@context': 'https://schema.org', '@type': 'Dataset', 'name': NAME + ' data',
           'description': 'Annual macroeconomic indicators for more than 200 economies, compiled from the World Bank World Development Indicators.',
           'url': SITE + '#methods', 'license': 'https://creativecommons.org/licenses/by/4.0/',
           'creator': {'@type': 'Person', 'name': OWNER}, 'isBasedOn': 'World Bank, World Development Indicators'}]
    return '\n'.join([
        f'<link rel="canonical" href="{SITE}">', f'<link rel="icon" href="{ICON}">',
        '<meta property="og:type" content="website">', f'<meta property="og:site_name" content="{E(NAME)}">',
        f'<meta property="og:title" content="{E(NAME)} | by {E(OWNER)}">', f'<meta property="og:description" content="{E(DESC)}">',
        f'<meta property="og:url" content="{SITE}">', f'<meta property="og:image" content="{SITE}og-image.png">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>'])


def num(v, d):
    s = f'{abs(v):,.{d}f}'
    return MINUS + s if v < 0 and float(f'{abs(v):.{d}f}') != 0 else s


def fmt(kind, v):
    a = abs(v)
    if kind == 'pct':
        return num(v, 1) + '%'
    if kind == 'usdbn':
        return '$' + num(v / 1000, 2 if a < 10000 else 1) + ' tn' if a >= 1000 else '$' + num(v, 0 if a >= 100 else 1) + ' bn' if a >= 1 else '$' + num(v * 1000, 0) + ' m'
    if kind == 'usd':
        return '$' + num(v, 0)
    if kind == 'mn':
        return num(v / 1000, 2) + ' bn' if a >= 1000 else num(v, 0 if a >= 100 else 1) + ' m' if a >= 1 else num(v * 1000, 0) + 'k'
    return num(v, 1)


def series(S, key, code):
    v = S.get(key, {}).get(code)
    if not v:
        return {}
    y0, s = v
    return {y0 + i: float(x) for i, x in enumerate(s.split(',')) if x != ''}


def latest(S, key, code):
    d = series(S, key, code)
    return (max(d), d[max(d)]) if d else None


def summary(S, code, name):
    poss = name + '’' if name.endswith('s') else name + '’s'
    out = []
    g = latest(S, 'gdp_growth', code)
    if g:
        y, v = g
        s = f"{poss} economy {'grew' if v >= 0 else 'shrank'} {num(abs(v), 1)}% in {y}"
        w = series(S, 'gdp_growth', 'WLD').get(y)
        if w is not None:
            s += (f', faster than the world as a whole ({num(w, 1)}%)' if v > w + 0.05 else
                  f', slower than the world as a whole ({num(w, 1)}%)' if v < w - 0.05 else f', in line with the world ({num(w, 1)}%)')
        out.append(s + '.')
    i, u = latest(S, 'inflation', code), latest(S, 'unemployment', code)
    if i:
        s = f"Consumer prices {'rose' if i[1] >= 0 else 'fell'} {num(abs(i[1]), 1)}% in {i[0]}"
        if u:
            s += f', and {num(u[1], 1)}% of the labour force was out of work' + (f' in {u[0]}' if u[0] != i[0] else '')
        out.append(s + '.')
    elif u:
        out.append(f'Unemployment was {num(u[1], 1)}% in {u[0]}.')
    return ' '.join(out) or f'There is little recent World Bank data for {name}.'


ROWS = [('gdp_growth', 'Real GDP growth', 'pct'), ('inflation', 'Inflation (consumer prices)', 'pct'),
        ('unemployment', 'Unemployment', 'pct'), ('gdp_usd', 'GDP (US dollars)', 'usdbn'),
        ('gdp_pc', 'GDP per person (US dollars)', 'usd'), ('gdp_pc_ppp', 'GDP per person (PPP, international dollars)', 'usd'),
        ('current_account', 'Current account balance, % of GDP', 'pct'), ('budget', 'Budget balance, % of GDP', 'pct'),
        ('poverty', 'Extreme poverty, % of people below $3.00 a day', 'pct'), ('population', 'Population', 'mn')]

STUB_CSS = """:root{--bg:#EEF2F4;--paper:#fff;--ink:#0E1C2B;--muted:#5E7185;--line:#D4DCE3;--signal:#E0A100;--band:#0B1724}
@media (prefers-color-scheme: dark){:root{--bg:#0A1219;--paper:#101B25;--ink:#E7EEF4;--muted:#8C9DAE;--line:#22313F;--band:#08121B}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Archivo","Helvetica Neue",Arial,sans-serif;line-height:1.55;font-variant-numeric:tabular-nums}
header{background:var(--band);padding:14px 20px}header a{color:#F2F6FA;text-decoration:none;font-weight:800;font-stretch:118%;font-size:17px}
main{max-width:860px;margin:0 auto;padding:28px 20px 48px}.crumb{color:var(--muted);font-size:14px;margin:0}.crumb a{color:var(--muted)}
h1{font-stretch:120%;font-weight:820;font-size:clamp(30px,6vw,46px);line-height:1.05;letter-spacing:-.012em;margin:8px 0 0}
.sum{font-size:18px;margin:16px 0 0}table{width:100%;border-collapse:collapse;margin:22px 0 0;background:var(--paper);border:1px solid var(--line)}
th,td{padding:10px 14px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:13px}td.v{text-align:right;font-weight:700;white-space:nowrap}td.y,th.r{text-align:right;color:var(--muted)}
.btn{display:inline-block;margin-top:22px;background:var(--signal);color:#17130A;font-weight:700;padding:12px 18px;border-radius:10px;text-decoration:none}
.src{color:var(--muted);font-size:13.5px;margin-top:18px}footer{border-top:1px solid var(--line);padding:18px 20px 30px;color:var(--muted);font-size:13.5px;text-align:center}footer a{color:var(--muted);margin:0 8px}"""


def stub(code, name, region, summ, rows, built):
    url = f'{SITE}country/{code.lower()}/'
    title = f'{name} economy: growth, inflation and jobs | {NAME}'
    desc = summ if len(summ) <= 160 else summ[:157].rsplit(' ', 1)[0] + '…'
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{url}"><link rel="icon" href="{ICON}">
<meta property="og:type" content="article"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}og-image.png"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;display=swap">
<style>{STUB_CSS}</style></head>
<body><header><a href="../../">Macro&#8209;Economic Monitor</a></header>
<main><p class="crumb"><a href="../../">Home</a> / <a href="../../#countries">Countries</a> / {E(region)}</p>
<h1>{E(name)} economy</h1>
<p class="sum">{E(summ)}</p>
<table><thead><tr><th>Indicator</th><th class="r">Latest</th><th class="r">Year</th></tr></thead><tbody>
{''.join(rows)}</tbody></table>
<a class="btn" href="../../#country-{code}">Open the full interactive profile</a>
<p class="src">Source: World Bank, World Development Indicators (CC BY 4.0). Data release {built}. Figures are revised by their publishers.</p>
</main>
<footer>© {built[:4]} {E(OWNER)}. <a href="../../#about">About</a><a href="../../#methods">Methods</a><a href="../../#contact">Contact</a><a href="../../#privacy">Privacy</a></footer>
</body></html>
"""


def main():
    raw = (ROOT / 'build' / 'data.json').read_text(encoding='utf-8')
    D = json.loads(raw)
    if len(sys.argv) >= 3 and sys.argv[1] == '--artifact':
        out = Path(sys.argv[2])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(assemble(raw, False), encoding='utf-8')
        print('Wrote', out, out.stat().st_size, 'bytes')
        return
    pub = ROOT / 'public'
    if pub.exists():
        shutil.rmtree(pub)
    pub.mkdir()
    (pub / 'index.html').write_text(assemble(raw, True), encoding='utf-8')
    S, built, codes = D['s'], D['meta']['built'], []
    for code, name, iso2, region, sub, _n, grp in D['econ']:
        if grp:
            continue
        rows = []
        for key, label, kind in ROWS:
            l = latest(S, key, code)
            if l:
                rows.append(f'<tr><td>{E(label)}</td><td class="v">{fmt(kind, l[1])}</td><td class="y">{l[0]}</td></tr>\n')
        d = pub / 'country' / code.lower()
        d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(stub(code, name, sub or region, summary(S, code, name), rows, built), encoding='utf-8')
        codes.append(code)
    urls = [SITE] + [f'{SITE}country/{c.lower()}/' for c in codes]
    (pub / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + ''.join(f'  <url><loc>{u}</loc><lastmod>{built}</lastmod></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (pub / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n', encoding='utf-8')
    (pub / '404.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
                                  f'<title>Page not found | {E(NAME)}</title><style>{STUB_CSS}</style></head><body><header><a href="/">Macro&#8209;Economic Monitor</a></header>'
                                  f'<main><h1>Page not found</h1><p class="sum">That page doesn’t exist. Try the home page instead.</p><a class="btn" href="/">Go to the home page</a></main></body></html>\n', encoding='utf-8')
    og = next((p for p in (ROOT / 'assets' / 'og-image.png', ROOT / 'og-image.png') if p.exists()), None)
    if og:
        shutil.copy(og, pub / 'og-image.png')
    for f in ['bd_catalog.json', 'bd_M.json', 'bd_Q.json', 'bd_CY.json', 'bd_FY.json']:
        if (ROOT / f).exists():
            shutil.copy(ROOT / f, pub / f)
    print('Built public/ with', len(codes), 'country pages and', len(urls), 'sitemap entries')


if __name__ == '__main__':
    main()
