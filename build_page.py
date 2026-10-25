import re
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
SHOW_OWNER = bool(CFG.get('show_owner', False))
AUTH = CFG.get('auth') or {}
EARN = CFG.get('earn') or {}
ADS_ON = str(EARN.get('adsense_client', '')).strip().startswith('ca-pub-')
_FB = AUTH.get('firebase') or {}
AUTH_ON = all(str(_FB.get(k, '')).strip() for k in ('apiKey', 'authDomain', 'projectId', 'appId'))


def MAPS_DATA():
    """Country and Bangladesh map data, stored inside geo.json under 'maps'."""
    if not hasattr(MAPS_DATA, 'v'):
        gf = (ROOT / 'geo' / 'geo.json') if (ROOT / 'geo').is_dir() else (ROOT / 'geo.json')
        try:
            MAPS_DATA.v = json.loads(gf.read_text(encoding='utf-8')).get('maps')
        except Exception:
            MAPS_DATA.v = None
    return MAPS_DATA.v


FRAMEBUST = "if(window.top!==window.self){document.documentElement.style.display='none';try{window.top.location.replace(window.location.href)}catch(e){}}"
SAFEMODE = "try{var q=location.search;if(/[?&]safe=1/.test(q))localStorage.setItem('mm.safe','1');if(/[?&]safe=0/.test(q))localStorage.removeItem('mm.safe');if(localStorage.getItem('mm.safe')==='1')document.documentElement.classList.add('safe')}catch(e){}"


BUILD_STAMP = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%d %b %Y, %H:%M UTC')


# ---------------- Bangladesh Macroeconomic Monitor and Bangladesh Inflation Monitor (hosted at /monitor/ and /inflation/) ----------------
MON_SRC = [('monitor.html', 'monitor'), ('inflation.html', 'inflation')]
MON_CSS = """<style id="mm-host">.mm-v{font:700 8px/1 system-ui,-apple-system,"Segoe UI",sans-serif;paint-order:stroke;stroke:rgba(0,0,0,.6);stroke-width:2px;stroke-linejoin:round}
/* hosted on macroarianalytics.com: keep phones fast and link back to the main site */
#hxRose{animation:none!important}
nav.subnav,.hc{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
#bdBar{width:100%!important;transform-origin:left center}
.gal-prog i{width:100%!important;transform:scaleX(0);transform-origin:left center}
.tick{contain:paint}
@media (max-width:899px),(pointer:coarse){#hxRose{display:none!important}.hx .kick .live i{animation:none!important}}
.mm-back{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;justify-content:space-between;padding:8px 16px;background:#0F3B2E;color:#F3EBD3;font:600 13.5px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border-bottom:1px solid rgba(217,180,90,.5)}
.mm-back a{color:#F2CF7A;text-decoration:none}.mm-back a:hover{text-decoration:underline}
</style>"""
MON_BAR = '<div class="mm-back"><a href="/">← Macroeconomic Monitor and Forecasting</a><span><a href="/monitor/">Macroeconomic Monitor</a> · <a href="/inflation/">Inflation Monitor</a> · <a href="/#bangladesh">Bangladesh pages</a></span></div>'
MON_SUBS = [
    (r'"data/catalog\.json"', '"/bd_catalog.json"'),
    (r'"data/"\+(\w+)\+"\.json"', r'"/bd_"+\1+".json"'),
    (r'"data/world\.json"', '"/bd_world.json"'),
    (r'"data/refresh\.json"', '"/bd_refresh.json"'),
    (r'"https://claude\.ai/artifact/H1exG2cpRtNSmNPYV6t45H"', '"/monitor/"'),
    (r'"https://claude\.ai/artifact/K3gQn3nkNbnN8s1L85STY3"', '"/inflation/"'),
    (r'"The world data file did not load \("\+\w+\.status\+"\)\."', '"World comparisons for 217 economies are on the main website: open Compare, Rankings or Country analysis at www.macroarianalytics.com."'),
    (r'function (\w+)\(\)\{const (\w+)=Date\.now\(\),(\w+)=\2-(\w+)\.last;\4\.last=\2,\4\.playing&&"board"===(\w+)&&', r'function \1(){if("board"!==\5||document.hidden){\4.last=Date.now();return}const \2=Date.now(),\3=\2-\4.last;\4.last=\2,\4.playing&&"board"===\5&&'),
    (r'(\w+)\("bdBar"\)\.style\.width=Math\.min\(100,(\w+)\.acc/\2\.ms\*100\)\.toFixed\(1\)\+"%"', r'\1("bdBar").style.transform="scaleX("+Math.min(1,\2.acc/\2.ms).toFixed(3)+")"'),
]


MON_JS = r"""<script id="mm-labels">(function(){var NS='http://www.w3.org/2000/svg';
function lab(svg){if(svg.__mmL)return;var vb=svg.viewBox&&svg.viewBox.baseVal;if(!vb||vb.width<200)return;var RW=svg.getBoundingClientRect().width;if(!RW)return;var sc=RW/vb.width;
var ax=[].slice.call(svg.querySelectorAll('text.ax'));
var yt=ax.filter(function(t){return t.getAttribute('text-anchor')==='end'}).map(function(t){return[parseFloat(t.getAttribute('y')),parseFloat((t.textContent||'').replace(/[^0-9.\-]/g,''))]}).filter(function(p){return isFinite(p[0])&&isFinite(p[1])});
if(yt.length<2)return;
if(ax.filter(function(t){return t.getAttribute('text-anchor')==='start'&&parseFloat(t.getAttribute('x'))>vb.width*0.6}).length>=2){svg.__mmL=1;return}
var n=yt.length,sx=0,sy=0,sxx=0,sxy=0;yt.forEach(function(p){sx+=p[0];sy+=p[1];sxx+=p[0]*p[0];sxy+=p[0]*p[1]});var d=n*sxx-sx*sx;if(!d)return;var b=(n*sxy-sx*sy)/d,a=(sy-b*sx)/n;if(!isFinite(b)||!b)return;
if(yt.some(function(p){return Math.abs(a+b*p[0]-p[1])>Math.abs(b)*2})){svg.__mmL=1;return}
var st=Math.abs(yt[1][1]-yt[0][1]),dec=st>=50?0:st>=5?1:2;
var lines=[].slice.call(svg.querySelectorAll('path')).filter(function(p){var dd=p.getAttribute('d')||'',f=p.getAttribute('fill');return(f==='none'||(!f&&getComputedStyle(p).fill==='none'))&&/^M\s*-?[\d.]+[ ,]-?[\d.]+\s*L/.test(dd)&&(p.getAttribute('stroke')||'none')!=='none'&&(dd.match(/L/g)||[]).length>=5});
if(!lines.length||lines.length>4){svg.__mmL=1;return}
var g=document.createElementNS(NS,'g');g.setAttribute('class','mm-lab');g.setAttribute('pointer-events','none');g.setAttribute('aria-hidden','true');
var W=vb.width,fs=Math.max(7.5,9/sc),maxL=Math.max(4,Math.floor(RW/(lines.length>1?36:24)));
lines.forEach(function(p){var pts=(p.getAttribute('d').match(/[ML]\s*-?[\d.]+[ ,]-?[\d.]+/g)||[]).map(function(s){var q=s.slice(1).trim().split(/[ ,]+/);return[+q[0],+q[1]]});var k=Math.max(1,Math.ceil(pts.length/maxL)),col=p.getAttribute('stroke');
pts.forEach(function(q,i){if(i%k&&i!==pts.length-1)return;var x=q[0]+3,y=q[1]-5,t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('transform','rotate(-90 '+x+' '+y+')');t.setAttribute('class','mm-v');t.style.fontSize=fs.toFixed(1)+'px';t.style.strokeWidth=(2/sc).toFixed(2)+'px';t.setAttribute('fill',col);t.textContent=(a+b*q[1]).toFixed(dec);g.appendChild(t)})});
if(g.childNodes.length)svg.appendChild(g);svg.__mmL=1}
function run(){[].forEach.call(document.querySelectorAll('svg[viewBox]'),function(s){try{lab(s)}catch(e){}})}
var tm;new MutationObserver(function(m){var own=m.every(function(r){return[].every.call(r.addedNodes,function(x){return x.nodeType===1&&x.getAttribute&&x.getAttribute('class')==='mm-lab'})});if(own)return;clearTimeout(tm);tm=setTimeout(run,450)}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',function(){clearTimeout(tm);tm=setTimeout(run,600)},true);window.addEventListener('resize',function(){clearTimeout(tm);tm=setTimeout(run,600)});setTimeout(run,1400)})();</script>"""


def build_monitors(pub):
    built = []
    for src, slug in MON_SRC:
        p = ROOT / src
        if not p.exists():
            continue
        t = p.read_text(encoding='utf-8')
        counts = []
        for pat, sub in MON_SUBS:
            t, k = re.subn(pat, sub, t)
            counts.append(k)
        g = t.find('.querySelector(".gal-prog i")')
        if g > 0:
            seg = t[g:g + 900]
            seg2 = seg.replace('.style.width="0"', '.style.transform="scaleX(0)"').replace('transition=`width ', 'transition=`transform ').replace('.style.width="100%"', '.style.transform="scaleX(1)"')
            counts.append(int(seg2 != seg))
            t = t[:g] + seg2 + t[g + 900:]
        spans = [(m.start(), m.end()) for m in re.finditer(r'<script\b.*?</script>', t, flags=re.S | re.I)]
        outside = lambda i: not any(a <= i < z for a, z in spans)
        h = next((m for m in re.finditer(r'<head[^>]*>', t, flags=re.I) if outside(m.start())), None)
        if h:
            t = t[:h.end()] + '<meta charset="utf-8">' + MON_CSS + t[h.end():]
        spans = [(m.start(), m.end()) for m in re.finditer(r'<script\b.*?</script>', t, flags=re.S | re.I)]
        bt = next((m for m in re.finditer(r'<body[^>]*>', t, flags=re.I) if outside(m.start())), None)
        if bt:
            t = t[:bt.end()] + MON_BAR + t[bt.end():]
        spans = [(m.start(), m.end()) for m in re.finditer(r'<script\b.*?</script>', t, flags=re.S | re.I)]
        eb = [m for m in re.finditer(r'</body\s*>', t, flags=re.I) if outside(m.start())]
        t = (t[:eb[-1].start()] + MON_JS + t[eb[-1].start():]) if eb else t + MON_JS
        counts.append(1)
        out = pub / slug
        out.mkdir(parents=True, exist_ok=True)
        (out / 'index.html').write_text(harden(t, main=True), encoding='utf-8')
        built.append(slug)
        print(f'  {slug}/ built; changes applied per rule: {counts}')
    return built


# ---------------- Owner data workbook (Excel), owner page and public Join page ----------------
import zipfile as _zip
from xml.sax.saxutils import escape as _xe


def _col(n):
    s = ''; n += 1
    while n:
        n, r = divmod(n - 1, 26); s = chr(65 + r) + s
    return s


def write_xlsx(path, sheets):
    """Minimal Excel writer with no extra packages. sheets = [(name, rows)]; the first row is bold."""
    with _zip.ZipFile(path, 'w', _zip.ZIP_DEFLATED) as z:
        n = len(sheets)
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, n + 1)) + '</Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + ''.join(f'<sheet name="{_xe(nm[:31])}" sheetId="{i}" r:id="rId{i}"/>' for i, (nm, _) in enumerate(sheets, 1)) + '</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, n + 1)) + f'<Relationship Id="rId{n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
        z.writestr('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
        for i, (nm, rows) in enumerate(sheets, 1):
            out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
            for ri, row in enumerate(rows, 1):
                cells = []
                for ci, v in enumerate(row):
                    if v is None or v == '':
                        continue
                    ref = _col(ci) + str(ri); st = ' s="1"' if ri == 1 else ''
                    if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) != float('inf'):
                        cells.append(f'<c r="{ref}"{st}><v>{v}</v></c>')
                    else:
                        cells.append(f'<c r="{ref}" t="inlineStr"{st}><is><t>{_xe(str(v))}</t></is></c>')
                out.append(f'<row r="{ri}">' + ''.join(cells) + '</row>')
            out.append('</sheetData></worksheet>')
            z.writestr(f'xl/worksheets/sheet{i}.xml', ''.join(out))


SOURCES = [
    ('World Development Indicators', 'World Bank', 'Annual indicators for 217 economies and regional aggregates (licence CC BY 4.0)', 'https://databank.worldbank.org/source/world-development-indicators'),
    ('Machine-readable WDI mirror used by this site', 'DataHub', 'The same World Bank data in CSV form', 'https://github.com/datasets'),
    ('Monthly Economic Trends', 'Bangladesh Bank', 'Bangladesh monthly, quarterly and fiscal-year series', 'https://www.bb.org.bd'),
    ('Consumer price index and inflation', 'Bangladesh Bureau of Statistics', 'CPI, food and non-food inflation, CPI groups', 'https://bbs.gov.bd'),
    ('Crude oil and natural gas prices', 'U.S. Energy Information Administration', 'Brent, WTI and Henry Hub prices', 'https://www.eia.gov'),
    ('Treasury yields and exchange rates', 'Federal Reserve', 'US 10-year yield and dollar exchange rates', 'https://www.federalreserve.gov'),
    ('US consumer prices', 'U.S. Bureau of Labor Statistics', 'US CPI', 'https://www.bls.gov'),
    ('Commodity prices (Pink Sheet)', 'World Bank', 'Gold price', 'https://www.worldbank.org/en/research/commodity-markets'),
    ('Maps', 'Natural Earth', 'Country outlines, divisions, rivers and cities (public domain)', 'https://www.naturalearthdata.com'),
]


def _ind_meta():
    meta = {}
    try:
        src = (SRC / 'app.js').read_text(encoding='utf-8'); i = src.index('const IND = {'); j = src.index('\n};', i)
        for m in re.finditer(r"\n  (\w+): \{ label: '([^']*)'[^\n]*?unit: '([^']*)'", src[i:j]):
            meta[m.group(1)] = (m.group(2), m.group(3))
    except Exception:
        pass
    return meta


def build_owner(pub, built):
    try:
        W = json.loads((ROOT / 'build' / 'data.json').read_text(encoding='utf-8'))
        M = json.loads((ROOT / 'bd_models.json').read_text(encoding='utf-8'))
    except Exception as e:
        print('  owner workbook skipped:', e); return
    names = {e[0]: e[1] for e in W.get('econ', [])}; meta = _ind_meta()
    readme = [['Macroeconomic Monitor and Forecasting: data workbook'], ['Built', built], [''], ['Sheet', 'Contents'],
              ['Sources', 'Every data source with its publisher and link'], ['World Bank (long)', 'All World Bank indicators: one row per indicator, economy and year'],
              ['Bangladesh monthly / quarterly / fiscal years', 'Bangladesh Bank and BBS series used on the site, one column per series'], ['Markets (monthly)', 'Oil, gas, gold, US yield and US prices, monthly'],
              ['DSGE (Bayesian)', 'Prior and posterior statistics and convergence diagnostics'], ['DSGE (least squares)', 'Estimated policy rule, Phillips curve and IS curve'], ['Inflation projection', 'Ensemble projection with 80% and 95% bands']]
    sheets = [('Read me', readme), ('Sources', [['Source', 'Publisher', 'What it covers', 'Link']] + [list(s) for s in SOURCES])]
    rows = [['indicator', 'label', 'unit', 'iso3', 'economy', 'year', 'value']]
    for k, by in sorted(W.get('s', {}).items()):
        lab, unit = meta.get(k, (k, ''))
        for iso, pk in sorted(by.items()):
            y0 = int(pk[0])
            for j, v in enumerate(str(pk[1]).split(',')):
                if v != '':
                    rows.append([k, lab, unit, iso, names.get(iso, iso), y0 + j, float(v)])
    sheets.append(('World Bank (long)', rows))
    S = M.get('series', {}); by_f = {}; labels_rows = [['code', 'label', 'unit', 'frequency', 'source table']]
    for key, s in S.items():
        p = s.get('series') or {}
        if p.get('v'):
            by_f.setdefault(p['f'], []).append((key, p))
            labels_rows.append([key, s.get('label', key) + (' (' + s['sub'] + ')' if s.get('sub') else ''), s.get('unit', ''), {'M': 'monthly', 'Q': 'quarterly', 'FY': 'fiscal year', 'CY': 'calendar year', 'A': 'annual'}.get(p['f'], p['f']), '; '.join(x.get('pub', '') + ' ' + x.get('newest', '') for x in (s.get('src') or []) if isinstance(x, dict)).strip()])
    lab_of = {'M': lambda k: f'{k // 12}-{k % 12 + 1:02d}', 'Q': lambda k: f'{k // 4}-Q{k % 4 + 1}', 'FY': lambda k: f'FY{k}'}
    for f, title in (('M', 'Bangladesh monthly'), ('Q', 'Bangladesh quarterly'), ('FY', 'Bangladesh fiscal years'), ('CY', 'Bangladesh calendar years'), ('A', 'Bangladesh annual')):
        cols = by_f.get(f)
        if not cols:
            continue
        k0 = min(p['k0'] for _, p in cols); k1 = max(p['k0'] + len(p['v']) - 1 for _, p in cols)
        out = [['period'] + [c[0] for c in cols]]
        for k in range(k0, k1 + 1):
            out.append([lab_of.get(f, str)(k)] + [(p['v'][k - p['k0']] if 0 <= k - p['k0'] < len(p['v']) else None) for _, p in cols])
        sheets.append((title, out))
    sheets.append(('Bangladesh labels', labels_rows))
    sheets.append(('Economies', [['iso3', 'name', 'iso2', 'region', 'subregion', 'un_code', 'is_group']] + [list(e[:7]) for e in W.get('econ', [])]))
    mk = W.get('mk', {}); mcols = [(k, v['m']) for k, v in mk.items() if isinstance(v, dict) and v.get('m')]
    if mcols:
        def mk_k(s): return int(s[:4]) * 12 + int(s[5:7]) - 1
        parsed = [(k, mk_k(m[0]), str(m[1]).split(',')) for k, m in mcols]
        k0 = min(p[1] for p in parsed); k1 = max(p[1] + len(p[2]) - 1 for p in parsed)
        out = [['period'] + [p[0] for p in parsed]]
        for k in range(k0, k1 + 1):
            out.append([f'{k // 12}-{k % 12 + 1:02d}'] + [(float(p[2][k - p[1]]) if 0 <= k - p[1] < len(p[2]) and p[2][k - p[1]] != '' else None) for p in parsed])
        sheets.append(('Markets (monthly)', out))
    D = M.get('dsge', {})
    if D.get('bayes'):
        out = [['Symbol', 'Parameter', 'Prior', 'Prior mean', 'Prior SD', 'Posterior mean', 'Median', 'SD', '95% low', '95% high', '99% low', '99% high', 'R-hat', 'ESS', 'Geweke p']]
        for q in D['bayes']['params']:
            o = q['post']; out.append([q['sym'], q['name'], q['prior']['dist'], q['prior']['mean'], q['prior']['sd'], o['mean'], o['median'], o['sd'], o['ci95'][0], o['ci95'][1], o['ci99'][0], o['ci99'][1], q['rhat'], q['ess'], q['geweke_p']])
        sheets.append(('DSGE (Bayesian)', out))
    if D.get('est'):
        out = [['Equation', 'Coefficient', 'Estimate', 'Std. error', 't', 'p-value', '95% low', '95% high', '99% low', '99% high', 'N', 'Sample']]
        for e in D['est']:
            for r in e['rows']:
                out.append([e['eq'], r['name'], r['coef'], r['se'], r['t'], r['p'], r['ci95'][0], r['ci95'][1], r['ci99'][0], r['ci99'][1], e['n'], e['sample']])
        sheets.append(('DSGE (least squares)', out))
    ens = M.get('ensemble', {})
    if ens.get('path') and ens.get('start'):
        s0 = int(ens['start'][:4]) * 12 + int(ens['start'][5:7]) - 1; out = [['Month', 'Mean', '80% low', '80% high', '95% low', '95% high']]
        for i, x in enumerate(ens['path']):
            k = s0 + i; out.append([f'{k // 12}-{k % 12 + 1:02d}', x.get('mean'), x.get('lo80'), x.get('hi80'), x.get('lo95'), x.get('hi95')])
        sheets.append(('Inflation projection', out))
    lab2 = {'M': lambda k: f'{k // 12}-{k % 12 + 1:02d}', 'Q': lambda k: f'{k // 4}-Q{k % 4 + 1}', 'FY': lambda k: f'FY{k}'}
    status = []
    for key, s in S.items():
        p = s.get('series') or {}; v = p.get('v') or []
        last = max((i for i, x in enumerate(v) if x is not None), default=None)
        if last is None:
            continue
        src = [x for x in (s.get('src') or []) if isinstance(x, dict)]
        pub_ = src[0].get('pub', '') if src else ''
        status.append((s.get('label', key), {'M': 'Monthly', 'Q': 'Quarterly', 'FY': 'Fiscal year'}.get(p['f'], p['f']), lab2.get(p['f'], str)(p['k0'] + last), pub_, (src[0].get('newest') or src[0].get('table', '')) if src else ''))
    status.sort(key=lambda r: r[2])
    try:
        fd = (ROOT / 'scripts' / 'fetch_data.py') if (ROOT / 'scripts' / 'fetch_data.py').exists() else (ROOT / 'fetch_data.py')
        ftxt = fd.read_text(encoding='utf-8'); base = re.search(r"GH = '([^']+)'", ftxt).group(1)
        dh = sorted(set(base + x for x in re.findall(r"'([a-z0-9-]+/main/[^']+\.csv)'", ftxt))) + [base + 'world-development-indicators/main/indicators/NY.GDP.MKTP.KD.ZG/data.csv']
    except Exception:
        dh = []
    sheets.append(('Data status', [['series', 'frequency', 'latest period', 'publisher', 'source table']] + [list(r) for r in status]))
    d = pub / 'owner'; d.mkdir(parents=True, exist_ok=True)
    write_xlsx(d / 'macro-data.xlsx', sheets)
    size = (d / 'macro-data.xlsx').stat().st_size
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Owner downloads</title>'
            '<style>body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F4F6F8;color:#0E1C2B}.w{max-width:860px;margin:0 auto;padding:28px 20px}h1{font-size:28px;margin:0 0 6px}.card{background:#fff;border:1px solid #D8DEE4;border-radius:14px;padding:18px 20px;margin:16px 0}'
            'a.b{display:inline-block;background:#0F3B2E;color:#F3EBD3;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #E3E8EC;padding:7px 8px;text-align:left;vertical-align:top}</style></head><body><div class="w">'
            '<p><a href="/">← Macroeconomic Monitor and Forecasting</a></p><h1>Owner downloads</h1><p>All data used on the website, in one Excel workbook. Built ' + built + '.</p>'
            '<div class="card"><a class="b" href="/owner/macro-data.xlsx" download>Download all data (Excel, ' + f'{size / 1e6:.1f}' + ' MB)</a><p>Sheets: ' + ', '.join(_xe(s[0]) for s in sheets) + '.</p></div>'
            '<div class="card" id="status"><h2>Data status</h2><p>Latest period in the site’s data for every Bangladesh series. A month is missing only because the publisher has not released it yet: Bangladesh Bank’s Monthly Economic Trends and BBS’s consumer price index appear several weeks after the month ends. When a newer edition is out, download it and send it to update the site.</p>'
            '<table><tr><th>Series</th><th>Frequency</th><th>Latest</th><th>Publisher</th><th>Source table</th></tr>' + ''.join(f'<tr><td>{_xe(r[0])}</td><td>{_xe(r[1])}</td><td><b>{_xe(r[2])}</b></td><td>{_xe(r[3])}</td><td>{_xe(r[4])}</td></tr>' for r in status) + '</table>'
            '<h3>Where to download updates</h3><ul><li><b>Bangladesh Bank, Monthly Economic Trends</b> (tables IA, IB and others): <a href="https://www.bb.org.bd" rel="noopener">www.bb.org.bd</a> → Publications → Monthly Economic Trends (download the newest edition’s Excel tables).</li>'
            '<li><b>BBS consumer price index</b> (monthly inflation, CPI groups): <a href="https://bbs.gov.bd" rel="noopener">bbs.gov.bd</a> → Consumer Price Index release for the month.</li>'
            '<li><b>Financial soundness and balance of payments</b> (NSDP): Bangladesh Bank’s National Summary Data Page, via <a href="https://www.bb.org.bd" rel="noopener">www.bb.org.bd</a>.</li>'
            '<li><b>World Bank indicators</b>: <a href="https://databank.worldbank.org/source/world-development-indicators" rel="noopener">World Development Indicators</a> (updated automatically every day by the site).</li>'
            '<li><b>Market prices</b> (updated automatically every day): ' + ', '.join(f'<a href="{_xe(u)}" rel="noopener">{_xe(u.rsplit("/", 2)[-2] + "/" + u.rsplit("/", 1)[-1])}</a>' for u in dh[:14]) + '.</li></ul></div>'
            '<div class="card"><h2>Sources and links</h2><table><tr><th>Source</th><th>Publisher</th><th>What it covers</th></tr>' + ''.join(f'<tr><td><a href="{s[3]}" rel="noopener">{_xe(s[0])}</a></td><td>{_xe(s[1])}</td><td>{_xe(s[2])}</td></tr>' for s in SOURCES) + '</table></div>'
            '<p style="font-size:13px;color:#4A5866">This page is for the owner. Protect the /owner/ path with an owner-only Cloudflare Access rule.</p></div></body></html>')
    (d / 'index.html').write_text(harden(page, main=True), encoding='utf-8')
    print(f'  owner workbook: {len(sheets)} sheets, {size / 1e6:.1f} MB')


def build_join(pub):
    earn = CFG.get('earn') or {}; plans = earn.get('plans') or []
    form = str(CFG.get('join_form') or CFG.get('contact_form') or '').strip()
    cards = ''.join('<div class="p"><h3>' + _xe(p.get('name', '')) + '</h3><p class="pr"><b>' + _xe(p.get('price', '')) + '</b> ' + _xe(p.get('period', '')) + '</p><ul>' + ''.join('<li>' + _xe(f) + '</li>' for f in p.get('features', [])) + '</ul>' + ('<a class="b" href="' + _xe(p['link']) + '" rel="noopener">Subscribe</a>' if p.get('link') else '') + '</div>' for p in plans if p.get('name') != 'Free')
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Join | ' + _xe(SITE_NAME if 'SITE_NAME' in globals() else 'Macroeconomic Monitor and Forecasting') + '</title>'
            '<style>body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F4F6F8;color:#0E1C2B}.hd{background:#0F3B2E;color:#F3EBD3;text-align:center;padding:44px 20px 36px}.hd h1{margin:0;font-size:clamp(26px,4vw,40px)}.hd p{max-width:680px;margin:10px auto 0;color:#E7DDC2}'
            '.w{max-width:980px;margin:0 auto;padding:24px 20px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.p{background:#fff;border:1px solid #D8DEE4;border-radius:16px;padding:18px 20px}.p h3{margin:0}.pr b{font-size:24px}'
            'a.b{display:inline-block;background:#C9A24B;color:#1A1300;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:800;margin-top:6px}ol li{margin:6px 0}.n{font-size:13px;color:#4A5866}</style></head><body>'
            '<div class="hd"><h1>Macroeconomic Monitor and Forecasting</h1><p>Data, models and forecasts for Bangladesh and more than 200 economies. Access is by subscription and approved by the editor.</p></div><div class="w">'
            '<h2>How to join</h2><ol><li>Choose a plan and subscribe.</li><li>' + ('<a href="' + _xe(form) + '" rel="noopener">Send the access request form</a>' if form else 'Send the editor the email address you will sign in with') + ', using the same email address as your payment.</li><li>Once approved, open <a href="/">www.macroarianalytics.com</a> and sign in with that email address: you receive a one-time code by email.</li></ol>'
            '<div class="g">' + cards + '</div><p class="n">Already approved? <a href="/">Sign in</a>. Access is checked on every visit; it ends if the subscription lapses.</p></div></body></html>')
    d = pub / 'join'; d.mkdir(parents=True, exist_ok=True)
    (d / 'index.html').write_text(harden(page, main=True), encoding='utf-8')


def harden(page, main=False):
    page = page.replace('%%BUILD%%', BUILD_STAMP)
    """Content Security Policy with exact script fingerprints, frame protection and referrer policy (live site only)."""
    import hashlib, base64
    anchor = '<meta charset="utf-8">' if '<meta charset="utf-8">' in page else '<head>'
    if main:
        page = page.replace(anchor, anchor + '\n<script>' + FRAMEBUST + '</script>\n<script>' + SAFEMODE + '</script>', 1)
    hashes = sorted({"'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode('utf-8')).digest()).decode() + "'"
                     for m in re.finditer(r'<script(?![^>]*\bsrc=)(?![^>]*type="application/(?:ld\+)?json")[^>]*>(.*?)</script>', page, flags=re.S)})
    csp = ("default-src 'self'; script-src 'self' " + ' '.join(hashes) + " https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.gstatic.com https://apis.google.com https://translate.googleapis.com https://translate.google.com; "
           "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.googleusercontent.com https://www.gstatic.com https://translate.google.com https://www.google.com; "
           "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://translate.googleapis.com https://script.google.com https://script.googleusercontent.com; frame-src https://*.firebaseapp.com https://docs.google.com https://accounts.google.com; "
           "object-src 'none'; base-uri 'self'; form-action 'self' https://docs.google.com; upgrade-insecure-requests")
    if ADS_ON:
        csp = (csp.replace("script-src 'self'", "script-src 'self' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google", 1)
               .replace("img-src 'self' data: blob:", "img-src 'self' data: blob: https:", 1)
               .replace("connect-src 'self'", "connect-src 'self' https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://*.doubleclick.net https://fundingchoicesmessages.google.com https://*.google.com", 1)
               .replace("frame-src ", "frame-src https://*.googlesyndication.com https://*.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com ", 1))
    meta = '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n<meta name="referrer" content="strict-origin-when-cross-origin">\n'
    return page.replace(anchor, anchor + '\n' + meta, 1)


DIAG_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Phone check | Macroeconomic Monitor</title>\n<style>\nbody{margin:0;padding:16px;font:16px/1.5 Arial,Helvetica,sans-serif;background:#ffffff;color:#000000}\nh1{font-size:21px;margin:0 0 6px}\ntable{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}\ntd{border:1px solid #888;padding:6px;vertical-align:top;word-break:break-word}\n.t{padding:12px;margin:8px 0;border:2px solid #666;font-weight:700;font-size:17px}\n#ta{background:rgba(240,240,240,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#000}\n#tb{background:#ffffff;color:#000000}\n#tc{background:#000000;color:#ffffff}\n#td{background:#123a66;color:#ffd000}\n.btn{display:inline-block;border:0;font:inherit;cursor:pointer;margin:8px 8px 0 0;padding:11px 15px;background:#0a7d4f;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px}\n</style></head><body>\n<h1>Macroeconomic Monitor: phone check</h1><p style="background:#fff7d6;border:1px solid #c9a24b;padding:8px 10px;border-radius:8px"><b>Site version 3.8, built %%BUILD%%</b></p>\n<p>Please take a screenshot of this page (scroll down for a second one if needed) and send it to Claude.</p>\n<div class="t" id="ta">Test A: text inside a blurred box</div>\n<div class="t" id="tb">Test B: black text on white</div>\n<div class="t" id="tc">Test C: white text on black</div>\n<div class="t" id="td">Test D: yellow text on blue</div>\n<table id="info"><tr><td>Checking…</td></tr></table>\n<p><a class="btn" href="/?safe=1">Open the site in safe mode</a><a class="btn" href="/?safe=0&amp;fresh=32">Open the site normally</a></p><p><button type="button" class="btn" id="rs">Reset this site’s saved settings and reload</button><button type="button" class="btn" id="ra" style="background:#8a2a1f">Reset everything, including the owner pass</button></p>\n<script>(function(){var r=[];function add(k,v){r.push(\'<tr><td>\'+k+\'</td><td>\'+String(v).replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\')+\'</td></tr>\')}\nfunction mm(q){try{return matchMedia(q).matches?\'yes\':\'no\'}catch(e){return \'unknown\'}}\nadd(\'Browser\',navigator.userAgent);\nadd(\'Screen\',screen.width+\' x \'+screen.height+\', pixel ratio \'+window.devicePixelRatio);\nadd(\'Page area\',window.innerWidth+\' x \'+window.innerHeight);\nadd(\'Phone prefers dark\',mm(\'(prefers-color-scheme: dark)\'));\nadd(\'Reduce motion\',mm(\'(prefers-reduced-motion: reduce)\'));\nadd(\'Inside a frame\',window.top!==window.self?\'yes\':\'no\');\nvar s;try{s=\'theme=\'+localStorage.getItem(\'mm.theme\')+\', safe mode=\'+(localStorage.getItem(\'mm.safe\')||\'off\')+\', owner pass=\'+(localStorage.getItem(\'mm.owner\')?\'yes\':\'no\')}catch(e){s=\'storage blocked\'}\nadd(\'Saved settings\',s);\nvar el=document.createElement(\'div\');el.style.cssText=\'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px)\';document.body.appendChild(el);add(\'Top safe area\',Math.round(el.getBoundingClientRect().height)+\' px\');el.parentNode.removeChild(el);\nvar bf=window.CSS&&CSS.supports&&(CSS.supports(\'backdrop-filter\',\'blur(2px)\')||CSS.supports(\'-webkit-backdrop-filter\',\'blur(2px)\'));add(\'Blur supported\',bf?\'yes\':\'no\');\nadd(\'Language\',navigator.language);add(\'Checked at\',new Date().toString());\ndocument.getElementById(\'info\').innerHTML=r.join(\'\');\nfunction clr(all){try{var ks=[];for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i));ks.forEach(function(k){if(k&&k.indexOf(\'mm.\')===0&&(all||k!==\'mm.owner\'))localStorage.removeItem(k);});}catch(e){}try{sessionStorage.clear();}catch(e){}location.href=\'/?safe=0&fresh=\'+Date.now();}\ndocument.getElementById(\'rs\').addEventListener(\'click\',function(){clr(false);});document.getElementById(\'ra\').addEventListener(\'click\',function(){clr(true);});})();</script>\n</body></html>\n'


def extras_inject(page, artifact=False):
    """Owner fingerprint, contact-form link and the Bangladesh map (all pages); every map in the claude.ai copy."""
    tags = []
    if AUTH.get('owner'):
        tags.append('window.MM_OWNERH=' + json.dumps(str(AUTH['owner'])) + ';')
    if str(CFG.get('contact_form', '')).strip():
        tags.append('window.MM_FORM=' + json.dumps(str(CFG['contact_form']).strip()) + ';')
    tags.append('window.MM_EARN=' + json.dumps(CFG.get('earn') or {}, ensure_ascii=False).replace('</', '<\\/') + ';')
    if str(CFG.get('alert_endpoint', '')).strip().startswith('https://script.google.com/'):
        tags.append('window.MM_ALERT=' + json.dumps(str(CFG['alert_endpoint']).strip()) + ';')
    mj = MAPS_DATA()
    if mj:
        tags.append('window.MM_BDMAP=' + json.dumps(mj.get('bd'), separators=(',', ':')) + ';')
        if artifact:
            tags.append('window.MM_MAPS=' + json.dumps(mj, separators=(',', ':')) + ';')
    if not tags:
        return page
    tag = '<script>' + ''.join(tags).replace('</', '<\\/') + '</script>\n'
    return page.replace('<script type="application/json" id="mm-data">', tag + '<script type="application/json" id="mm-data">', 1)


def auth_inject(page):
    """Add the sign-in settings to the live site (never to the claude.ai preview)."""
    if not AUTH_ON:
        return page
    cfg = {'firebase': {k: str(_FB[k]).strip() for k in ('apiKey', 'authDomain', 'projectId', 'appId')}, 'apple': bool(AUTH.get('apple')), 'sdk': AUTH.get('sdk', '10.12.2'), 'owner': str(AUTH.get('owner', ''))}
    tag = '<script>window.MM_AUTH=' + json.dumps(cfg).replace('</', '<\\/') + ';</script>\n'
    return page.replace('<script type="application/json" id="mm-data">', tag + '<script type="application/json" id="mm-data">', 1)
OWNER_TITLE = CFG.get('owner_title', 'Owner and editor')
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
    initials = ''.join(w[0] for w in OWNER.split()[:2]).upper()
    page = page.replace('{{OWNER}}', E(OWNER)).replace('{{OWNER_TITLE}}', E(OWNER_TITLE)).replace('{{INITIALS}}', E(initials))
    if SHOW_OWNER:
        page = page.replace(' data-owner-gate hidden', ' data-owner-gate').replace(' data-owner-alt>', ' data-owner-alt hidden>')
    bdm = ROOT / 'bd_models.json'
    page = page.replace('/*__BD_DATA__*/', bdm.read_text(encoding='utf-8').replace('</', '<\\/') if bdm.exists() else 'null')
    if seo:
        page = page.replace('</title>', '</title>\n' + head_tags(), 1)
    return page


def head_tags():
    ld = [{'@context': 'https://schema.org', '@type': 'WebSite', 'name': NAME, 'url': SITE, 'description': DESC,
           'author': ({'@type': 'Person', 'name': OWNER} if SHOW_OWNER else {'@type': 'Organization', 'name': NAME})},
          {'@context': 'https://schema.org', '@type': 'Dataset', 'name': NAME + ' data',
           'description': 'Annual macroeconomic indicators for more than 200 economies, compiled from the World Bank World Development Indicators.',
           'url': SITE + '#methods', 'license': 'https://creativecommons.org/licenses/by/4.0/',
           'creator': ({'@type': 'Person', 'name': OWNER} if SHOW_OWNER else {'@type': 'Organization', 'name': NAME}), 'isBasedOn': 'World Bank, World Development Indicators'}]
    return '\n'.join([
        f'<link rel="canonical" href="{SITE}">', f'<link rel="icon" href="{ICON}">',
        '<meta property="og:type" content="website">', f'<meta property="og:site_name" content="{E(NAME)}">',
        f'<meta property="og:title" content="{E(NAME)}">', f'<meta property="og:description" content="{E(DESC)}">',
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
<footer>© {built[:4]} {E(OWNER if SHOW_OWNER else NAME)}. <a href="../../#about">About</a><a href="../../#methods">Methods</a><a href="../../#contact">Contact</a><a href="../../#privacy">Privacy</a></footer>
</body></html>
"""


def main():
    raw = (ROOT / 'build' / 'data.json').read_text(encoding='utf-8')
    D = json.loads(raw)
    if len(sys.argv) >= 3 and sys.argv[1] == '--artifact':
        out = Path(sys.argv[2])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(extras_inject(assemble(raw, False), artifact=True), encoding='utf-8')
        print('Wrote', out, out.stat().st_size, 'bytes')
        return
    pub = ROOT / 'public'
    if pub.exists():
        shutil.rmtree(pub)
    pub.mkdir()
    (pub / 'index.html').write_text(harden(extras_inject(auth_inject(assemble(raw, True))), main=True), encoding='utf-8')
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
        (d / 'index.html').write_text(harden(stub(code, name, sub or region, summary(S, code, name), rows, built)), encoding='utf-8')
        codes.append(code)
    urls = [SITE] + [f'{SITE}country/{c.lower()}/' for c in codes]
    urls += [f'{SITE}{s}/' for s in build_monitors(pub)]
    build_owner(pub, built)
    build_join(pub)
    urls.append(f'{SITE}join/')
    (pub / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + ''.join(f'  <url><loc>{u}</loc><lastmod>{built}</lastmod></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (pub / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n', encoding='utf-8')
    (pub / '404.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
                                  f'<title>Page not found | {E(NAME)}</title><style>{STUB_CSS}</style></head><body><header><a href="/">Macro&#8209;Economic Monitor</a></header>'
                                  f'<main><h1>Page not found</h1><p class="sum">That page doesn’t exist. Try the home page instead.</p><a class="btn" href="/">Go to the home page</a></main></body></html>\n', encoding='utf-8')
    og = next((p for p in (ROOT / 'assets' / 'og-image.png', ROOT / 'og-image.png') if p.exists()), None)
    if og:
        shutil.copy(og, pub / 'og-image.png')
    if MAPS_DATA():
        (pub / 'maps.json').write_text(json.dumps(MAPS_DATA(), separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
    for f in ['bd_catalog.json', 'bd_M.json', 'bd_Q.json', 'bd_CY.json', 'bd_FY.json']:
        if (ROOT / f).exists():
            shutil.copy(ROOT / f, pub / f)
    try:
        import json as _json
        _built = _json.loads((ROOT / 'build' / 'data.json').read_text(encoding='utf-8')).get('meta', {}).get('built')
        _bm = _json.loads((ROOT / 'bd_models.json').read_text(encoding='utf-8')).get('meta', {}) if (ROOT / 'bd_models.json').exists() else {}
        (pub / 'live.json').write_text(_json.dumps({'built': _built, 'bd': _bm.get('estimated')}), encoding='utf-8')
    except Exception as _e:
        print('live.json not written:', _e)
    (pub / '404.html').write_text(harden((pub / '404.html').read_text(encoding='utf-8')), encoding='utf-8')
    if ADS_ON:
        (pub / 'ads.txt').write_text('google.com, ' + str(EARN['adsense_client']).strip().replace('ca-pub-', 'pub-') + ', DIRECT, f08c47fec0942fa0\n', encoding='utf-8')
    dg = (ROOT / 'diag.html') if (ROOT / 'diag.html').exists() else None
    (pub / 'diag.html').write_text(harden(dg.read_text(encoding='utf-8') if dg else DIAG_HTML), encoding='utf-8')
    print('Built public/ with', len(codes), 'country pages and', len(urls), 'sitemap entries')


if __name__ == '__main__':
    main()
