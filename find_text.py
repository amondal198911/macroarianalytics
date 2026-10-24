import asyncio, sys, re
from playwright.async_api import async_playwright
route, pat = sys.argv[1], sys.argv[2]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1366, 'height': 900})
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
        await pg.goto('http://127.0.0.1:8765/index.html#' + route)
        await pg.wait_for_timeout(1500)
        await pg.wait_for_function('() => ![...document.querySelectorAll("#content .spinner")].some(s => s.getBoundingClientRect().width > 0)', timeout=90000, polling=300)
        t = await pg.evaluate('() => document.querySelector("#content").innerText')
        for m in re.finditer(pat, t): print('...', t[max(0, m.start()-120):m.end()+60].replace('\n', ' | '), '...')
        await b.close()
asyncio.run(run())
