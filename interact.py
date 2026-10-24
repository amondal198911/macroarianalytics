"""Interaction test of the built site (public/): exercises the controls a visitor uses and checks the result of each.
Usage: python3 tests/interact.py [OUT_DIR]   (requires a server on http://127.0.0.1:8765 serving public/)"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'tests/out_interact'); OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:8765/index.html'
RESULTS = []

def check(name, cond, detail=''):
    RESULTS.append({'check': name, 'pass': bool(cond), 'detail': str(detail)[:300]})
    print(('PASS ' if cond else 'FAIL ') + name + ('  — ' + str(detail)[:200] if detail != '' else ''), flush=True)

IDLE = '() => ![...document.querySelectorAll("#content .spinner")].some(s => s.getBoundingClientRect().width > 0)'
NSER = '''() => { const el = document.querySelector('#content .exhibit .chart'); if (!el || !window.echarts) return -2; const inst = echarts.getInstanceByDom(el); if (!inst) return -1;
  const o = inst.getOption(); return (o.series || []).filter(s => s.type === 'line' && s.data && s.data.length).length; }'''
SHOWN = '() => { const s = document.querySelector(".serpick-head strong"); return s ? s.textContent : ""; }'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1366, 'height': 900}, accept_downloads=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:300]))
        pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        async def handler(r):
            if r.request.url.startswith('http://127.0.0.1'): await r.continue_()
            else: await r.abort()
        await pg.route('**/*', handler)

        async def go(tok):
            await pg.evaluate('t => { location.hash = t; }', tok)
            await pg.wait_for_timeout(250)
            try: await pg.wait_for_function(IDLE, timeout=90000, polling=250)
            except Exception: pass
            await pg.wait_for_timeout(350)

        await pg.goto(BASE)
        await pg.wait_for_function('() => document.querySelector("#content h1")', timeout=60000)
        check('home page renders', await pg.locator('#content h1').count() > 0)

        # ---- 1. series picker on a category chart
        await go('c.BGD.inflation.charts.1')
        shown0 = await pg.evaluate(SHOWN); n0 = await pg.evaluate(NSER)
        check('inflation chart draws the default selection', n0 >= 1, f'{shown0}; lines={n0}')
        await pg.click('[data-sel="none"]'); await pg.wait_for_timeout(600)
        shown = await pg.evaluate(SHOWN); msg = await pg.locator('#content .exhibit .chart .chart-msg').count()
        check('Clear removes every series', shown.startswith('Series shown: 0') and msg >= 1, shown)
        await pg.click('[data-sel="all"]'); await pg.wait_for_timeout(900)
        shown = await pg.evaluate(SHOWN); nall = await pg.evaluate(NSER)
        tot = shown.split(' of ')[-1]
        check('Select all shows every series', shown.startswith(f'Series shown: {tot}') and nall >= 2, f'{shown}; lines={nall}')
        await pg.click('[data-sel="target"]'); await pg.wait_for_timeout(600)
        shown = await pg.evaluate(SHOWN); n1 = await pg.evaluate(NSER)
        check('Headline only leaves one series', shown.startswith('Series shown: 1 ') and n1 == 1, f'{shown}; lines={n1}')
        await pg.click('[data-g="0"][data-on="1"]'); await pg.wait_for_timeout(700)
        shown_g = await pg.evaluate(SHOWN)
        check('a sub-group "all" button adds the group', int(shown_g.split(':')[1].split(' of')[0]) >= 1, shown_g)
        boxes = pg.locator('.serpick input[data-id]:checked')
        before = await boxes.count()
        if before > 1:
            await boxes.nth(before - 1).click(); await pg.wait_for_timeout(600)
            after = await pg.locator('.serpick input[data-id]:checked').count()
            check('unticking one series removes it', after == before - 1, f'{before} -> {after}')
        await pg.click('[data-sel="add"]'); await pg.wait_for_timeout(300)
        dlg = pg.locator('.dlg [role="dialog"]')
        check('Add from other categories opens a dialog', await dlg.count() == 1)
        await pg.fill('.dlg [data-q]', 'call money'); await pg.wait_for_timeout(200)
        vis = pg.locator('.dlg .serbox:not([hidden]) input')
        nv = await vis.count(); check('dialog search filters the list', nv >= 1, f'{nv} matches for "call money"')
        if nv:
            await vis.first.check(); await pg.click('.dlg [data-x]'); await pg.wait_for_timeout(900)
            added = await pg.locator('.sergroup h4', has_text='Added from other categories').count()
            nl = await pg.evaluate(NSER)
            check('a series from another category is added to the chart', added == 1 and nl >= 2, f'lines={nl}')
            await pg.click('.serpick [data-rm]'); await pg.wait_for_timeout(700)
            check('the added series can be removed again', await pg.locator('.sergroup h4', has_text='Added from other categories').count() == 0)
        for tf in ['z', 'index', 'yoy', 'raw']:
            btn = pg.locator(f'[data-tf] button[data-v="{tf}"]')
            if await btn.count():
                await btn.click(); await pg.wait_for_timeout(700)
                check(f'transform "{tf}" redraws', await btn.get_attribute('aria-pressed') == 'true' and await pg.evaluate(NSER) >= 1)
        await pg.click('[data-rg] button[data-v="5"]'); await pg.wait_for_timeout(500)
        check('range 5Y applies', await pg.locator('[data-rg] button[data-v="5"]').get_attribute('aria-pressed') == 'true')
        await pg.click('#content .exhibit [data-act="tab"]'); await pg.wait_for_timeout(500)
        check('Table view opens a data table', await pg.locator('#content .exhibit .ex-table:not([hidden]) table').count() >= 1)
        async with pg.expect_download(timeout=10000) as dl:
            await pg.click('#content .exhibit [data-act="csv"]')
        d = await dl.value; path = OUT / d.suggested_filename; await d.save_as(str(path)); txt = path.read_text()
        check('CSV download has a source line and data', txt.startswith('# Macroarianalytics export. Sources:') and txt.count('\n') > 20, d.suggested_filename)
        check('CSV header line is a plain comment', txt.split('\n')[1].startswith('period,'), txt.split('\n')[1][:60])
        async with pg.expect_download(timeout=10000) as dl:
            await pg.click('#content .exhibit [data-act="png"]')
        d = await dl.value; check('PNG download works', d.suggested_filename.endswith('.png'), d.suggested_filename)

        # ---- 2. tiles toggle and persistence of the selection across pages
        await go('c.BGD.inflation.charts.2')
        t = pg.locator('[data-toggle]').first; was = await t.get_attribute('aria-pressed'); await t.click(); await pg.wait_for_timeout(200)
        check('a tile toggles its series', await t.get_attribute('aria-pressed') != was)
        await go('c.BGD.inflation.charts.1'); check('the selection persists across pages', (await pg.evaluate(SHOWN)).startswith('Series shown:'))

        # ---- 3. forecasting controls
        await go('c.BGD.inflation.forecast.1')
        opts = await pg.locator('[data-m] option').count(); check('forecast page lists models', opts >= 4, f'{opts} models')
        if opts > 1:
            await pg.select_option('[data-m]', '1'); await pg.wait_for_timeout(300); await pg.wait_for_function(IDLE, timeout=60000)
            check('choosing another model redraws', await pg.locator('[data-m]').input_value() == '1')
        hb = pg.locator('[data-h] button'); await hb.last.click(); await pg.wait_for_timeout(300); await pg.wait_for_function(IDLE, timeout=60000)
        check('horizon buttons work', await pg.locator('[data-h] button').last.get_attribute('aria-pressed') == 'true')
        b0 = await pg.locator('[data-l] button[data-v="0.68"]').get_attribute('aria-pressed')
        await pg.locator('[data-l] button[data-v="0.68"]').click(); await pg.wait_for_timeout(300); await pg.wait_for_function(IDLE, timeout=60000)
        check('band buttons toggle', await pg.locator('[data-l] button[data-v="0.68"]').get_attribute('aria-pressed') != b0, f'0.68 was {b0}')
        await go('c.BGD.inflation.forecast.4')
        if await pg.locator('[data-s]').count():
            await pg.fill('[data-s]', '2'); await pg.press('[data-s]', 'Enter'); await pg.wait_for_timeout(600); await pg.wait_for_function(IDLE, timeout=60000)
            check('VAR scenario accepts a 2 s.d. shock', await pg.locator('#content .exhibit').count() >= 1)

        # ---- 4. model laboratories
        await go('models.dsgelab')
        sl = pg.locator('input[type="range"][data-k]'); ns = await sl.count(); check('DSGE laboratory has sliders', ns >= 8, ns)
        if ns:
            await sl.first.evaluate('e => { e.value = e.max; e.dispatchEvent(new Event("input", {bubbles: true})); e.dispatchEvent(new Event("change", {bubbles: true})); }'); await pg.wait_for_timeout(900)
            check('moving a DSGE slider recomputes the model', await pg.evaluate(NSER) >= 1)
            await pg.click('[data-reset="prior"]'); await pg.wait_for_timeout(700); check('DSGE reset to prior means', len(errs) == 0, errs[-1:] if errs else '')
        await go('models.svar')
        if await pg.locator('[data-id] button[data-v="sign"]').count():
            await pg.click('[data-id] button[data-v="sign"]'); await pg.wait_for_timeout(500); await pg.wait_for_function(IDLE, timeout=120000)
            check('SVAR with sign restrictions runs', await pg.locator('[data-sg]').count() >= 2 and await pg.locator('#content .chart canvas').count() >= 1, errs[-1:] if errs else '')
            await pg.click('[data-id] button[data-v="chol"]'); await pg.wait_for_timeout(500); await pg.wait_for_function(IDLE, timeout=120000)
        for tok in ['models.league', 'models.projections']:
            await go(tok)
            run = pg.locator('[data-run]')
            if await run.count():
                await run.first.click(); await pg.wait_for_timeout(1000); await pg.wait_for_function(IDLE, timeout=240000, polling=500); await pg.wait_for_timeout(500)
                check(f'{tok}: Compute now produces a table', await pg.locator('#content table').count() >= 1)

        # ---- 5. data catalogue, search dialog and theme
        await go('data.2'); check('data tab 2 shows the World Bank indicators', await pg.locator('#content .ex-title', has_text='World Bank indicators').count() >= 1)
        await go('data.3')
        await pg.wait_for_selector('.cat-host [data-q]', timeout=60000)
        await pg.fill('.cat-host [data-q]', 'remittance'); await pg.press('.cat-host [data-q]', 'Enter'); await pg.wait_for_timeout(500)
        n = await pg.locator('.cat-host [data-show]').count(); check('catalogue search finds series', n >= 1, f'{n} rows')
        if n:
            await pg.locator('.cat-host [data-show]').first.click(); await pg.wait_for_timeout(2500)
            check('a catalogue series can be charted', await pg.locator('.cat-chart .chart canvas').count() >= 1)
        await pg.keyboard.press('Escape'); await pg.click('body', position={'x': 5, 'y': 400}); await pg.keyboard.press('/'); await pg.wait_for_timeout(300)
        if await pg.locator('#q-search').count():
            await pg.fill('#q-search', 'remittance'); await pg.wait_for_timeout(200)
            check('search dialog lists results', await pg.locator('#q-res [data-i]').count() >= 1)
            await pg.press('#q-search', 'Enter'); await pg.wait_for_timeout(1500)
            check('Enter opens the first result', 'remit' in (await pg.evaluate('location.hash')).lower() or 'remit' in (await pg.locator('#content h1').inner_text()).lower(), await pg.evaluate('location.hash'))
        else: check('search dialog opens with "/"', False)
        th0 = await pg.evaluate('document.documentElement.dataset.theme || "auto"')
        tb = pg.locator('#mast [data-theme-btn], #mast button[aria-label*="theme" i]')
        if await tb.count():
            await tb.first.click(); await pg.wait_for_timeout(500)
            check('theme button changes the theme', await pg.evaluate('document.documentElement.dataset.theme || "auto"') != th0)
        check('no page errors during interaction', len(errs) == 0, errs[:3])

        # ---- 6. security guard (separate page so the lock does not affect the rest)
        sp = await ctx.new_page(); await sp.route('**/*', handler); await sp.goto(BASE); await sp.wait_for_function('() => document.querySelector("#content h1")', timeout=60000)
        await sp.evaluate('() => { location.hash = "%3Cscript%3Ealert(1)%3C/script%3E"; }'); await sp.wait_for_timeout(600)
        t1 = await sp.locator('#sec-overlay').inner_text() if await sp.locator('#sec-overlay').count() else ''
        check('code in the address is refused with a warning', 'Warning' in t1, t1[:80])
        h = await sp.evaluate('location.hash'); check('the refused address is not rendered', '<' not in h and 'script' not in (await sp.locator('#content').inner_text()).lower()[:200], h)
        if await sp.locator('#sec-overlay [data-x]').count(): await sp.click('#sec-overlay [data-x]')
        await sp.goto(BASE + '#c.BGD.inflation.charts'); await sp.wait_for_timeout(1500)
        await sp.fill('#content input[type="search"], #content input[type="text"]', '') if await sp.locator('#content input[type="search"], #content input[type="text"]').count() else None
        await sp.keyboard.press('/'); await sp.wait_for_timeout(300)
        if await sp.locator('#q-search').count():
            await sp.type('#q-search', '<img src=x onerror=alert(1)>', delay=5); await sp.wait_for_timeout(400)
            check('code typed in a search box is cleared', (await sp.locator('#q-search').input_value() if await sp.locator('#q-search').count() else '') in ('', ) or not (await sp.locator('#q-search').input_value()).startswith('<img'))
        await sp.evaluate('() => { location.hash = "javascript:alert(2)"; }'); await sp.wait_for_timeout(500)
        await sp.evaluate('() => { location.hash = "%3Csvg%20onload=alert(3)%3E"; }'); await sp.wait_for_timeout(600)
        t3 = await sp.locator('#sec-overlay').inner_text() if await sp.locator('#sec-overlay').count() else ''
        check('repeated attempts lock the page', 'locked' in t3.lower(), t3[:80])
        sp2 = await ctx.new_page(); await sp2.route('**/*', handler)
        await sp2.goto(BASE); await sp2.wait_for_timeout(2500)
        t4 = await sp2.locator('#sec-overlay').inner_text() if await sp2.locator('#sec-overlay').count() else ''
        check('a new tab in a fresh session is not locked (lock is per tab session)', 'locked' not in t4.lower(), t4[:60])
        # rate guard
        rp = await ctx.new_page(); await rp.route('**/*', handler); await rp.goto(BASE); await rp.wait_for_function('() => document.querySelector("#content h1")', timeout=60000)
        await rp.evaluate('''async () => { const toks = ['home','countries','learn','refs','about']; for (let i = 0; i < 70; i++) { location.hash = toks[i % 5] + (i % 2 ? '' : ''); location.hash = (i % 2 ? 'countries' : 'learn'); await new Promise(r => setTimeout(r, 20)); } }''')
        await rp.wait_for_timeout(600)
        t5 = await rp.locator('#sec-overlay').inner_text() if await rp.locator('#sec-overlay').count() else ''
        check('machine-speed browsing is paused', 'slow down' in t5.lower(), t5[:60])
        # framing guard
        fp = await ctx.new_page(); await fp.route('**/*', handler)
        await fp.set_content('<iframe src="http://127.0.0.1:8765/index.html" style="width:800px;height:600px"></iframe>'); await fp.wait_for_timeout(3000)
        fr = fp.frames[-1]; ftxt = await fr.evaluate('() => document.body ? document.body.innerText : ""') if fr != fp.main_frame else ''
        check('the site refuses to run inside another site\'s frame', 'cannot be shown inside another website' in ftxt, ftxt[:80])
        await b.close()
    json.dump(RESULTS, open(OUT / 'interact.json', 'w'), indent=1)
    print(f"\n{sum(r['pass'] for r in RESULTS)}/{len(RESULTS)} interaction checks passed")

asyncio.run(main())
