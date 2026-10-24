"""Browser audit of the built site (public/). For every route: console errors, page errors, horizontal overflow,
leftover spinners, failed exhibits, suspicious text (NaN, undefined), and counts of charts and tables.
Usage: python3 tests/audit.py ROUTES_FILE OUT_DIR [--phone] [--dark] [--shots]
ROUTES_FILE: one route token per line (e.g. c.BGD.inflation.forecast.2). Requires a server on http://127.0.0.1:8765."""
import asyncio, json, sys, time, pathlib, re
from playwright.async_api import async_playwright
ROUTES = [l.strip() for l in open(sys.argv[1]) if l.strip() and not l.startswith('#')]
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
PHONE, DARK, SHOTS = '--phone' in sys.argv, '--dark' in sys.argv, '--shots' in sys.argv
BASE = 'http://127.0.0.1:8765/index.html'
JS = '''() => {
  const de = document.documentElement, vw = de.clientWidth; const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const main = document.querySelector('#content'); if (!main) return { fatal: 'no #content' };
  const over = [...main.querySelectorAll('*')].filter(el => vis(el) && el.getBoundingClientRect().right > vw + 2 && !el.closest('.tscroll,svg,canvas,table,.chart,.subtabs,.nav')).slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 30) + ' r=' + Math.round(el.getBoundingClientRect().right));
  const text = main.innerText; const bad = []; for (const re of [/\\bNaN\\b/g, /\\bundefined\\b/g, /\\[object Object\\]/g, /\\bnull\\b(?! hypothesis|:| of)/g, /Infinity/g]) { const m = text.match(re); if (m) bad.push(m[0] + '×' + m.length); }
  const charts = [...main.querySelectorAll('.chart')].filter(vis); const withCanvas = charts.filter(c => c.querySelector('canvas')).length; const msgs = charts.filter(c => !c.querySelector('canvas')).map(c => (c.querySelector('.chart-msg') || c).innerText.trim().slice(0, 90));
  const fails = [...main.querySelectorAll('.callout.warn')].map(e => e.innerText.trim().slice(0, 140));
  const spin = [...main.querySelectorAll('.spinner')].filter(vis).length;
  const h1 = (main.querySelector('h1') || {}).innerText || '';
  return { scrollW: de.scrollWidth, vw, h: de.scrollHeight, charts: charts.length, withCanvas, msgs: msgs.slice(0, 6), tables: [...main.querySelectorAll('table')].filter(vis).length, over, bad, fails: fails.slice(0, 6), spin, h1, exhibits: main.querySelectorAll('.exhibit').length };
}'''
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844} if PHONE else {'width': 1366, 'height': 900}, color_scheme='dark' if DARK else 'light', device_scale_factor=1)
        pg = await ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}'[:300]) if m.type in ('error',) and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'[:500]))
        async def handler(r):
            u = r.request.url
            if u.startswith('http://127.0.0.1'): await r.continue_()
            else: await r.abort()
        await pg.route('**/*', handler)
        res = {}
        await pg.goto(BASE); await pg.wait_for_function('() => document.querySelector("#content") && !document.querySelector("#content > p.note .spinner")', timeout=60000)
        for i, route in enumerate(ROUTES):
            n0 = len(errs); t0 = time.time()
            await pg.evaluate('t => { location.hash = t; }', route)
            try: await pg.wait_for_function('() => ![...document.querySelectorAll("#content .spinner")].some(s => s.getBoundingClientRect().width > 0)', timeout=90000, polling=300)
            except Exception: pass
            await pg.wait_for_timeout(400)
            try: info = await pg.evaluate(JS)
            except Exception as e: info = {'fatal': str(e)[:200]}
            info['ms'] = int((time.time() - t0) * 1000); info['errors'] = errs[n0:]
            res[route] = info
            if SHOTS: await pg.screenshot(path=str(OUT / (re.sub(r'[^A-Za-z0-9.]', '_', route) + ('-phone' if PHONE else '') + ('-dark' if DARK else '') + '.png')), full_page=True)
            flag = []
            if info.get('errors'): flag.append('ERR')
            if info.get('scrollW', 0) > info.get('vw', 0) + 1 or info.get('over'): flag.append('OVERFLOW')
            if info.get('bad'): flag.append('BADTEXT')
            if info.get('spin'): flag.append('SPIN')
            if info.get('fatal'): flag.append('FATAL')
            print(f"{i+1:4d} {route:42s} {info.get('ms')}ms ex={info.get('exhibits')} ch={info.get('withCanvas')}/{info.get('charts')} tb={info.get('tables')} {' '.join(flag)} {info.get('errors', [])[:2]} {info.get('bad', '')} {info.get('over', [])[:2]}", flush=True)
        json.dump(res, open(OUT / ('audit' + ('-phone' if PHONE else '') + ('-dark' if DARK else '') + '.json'), 'w'), indent=1)
        await b.close()
asyncio.run(run())
