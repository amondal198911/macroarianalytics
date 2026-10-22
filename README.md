# Macro-Economic Monitor (macroarianalytics.com)

Website owned by Arian Mondal: growth, inflation, jobs, poverty, public finances, trade and market prices
for more than 200 economies, built from open official data.

## Files

- `fetch_data.py` downloads the latest open data (World Bank WDI, U.S. EIA, Federal Reserve, U.S. BLS) into `data/raw/`.
- `build_data.py` checks it and writes `build/data.json`. If a check fails, the job stops and the live site stays as it was.
- `build_page.py` builds `public/`: the website, a page for every economy, `sitemap.xml` and `robots.txt`.
- `shell.html`, `styles.css`, `styles2.css`, `app.js`, `ext.js`: the website's code.
- `geo.json`, `dots.json`: map shapes. `og-image.png`: the social-media preview.
- `config.json`: the web address and site name. The email shown on the site is in `ext.js` (search for `arian.hu.idec`).

## Daily updates

Create `.github/workflows/update.yml` with this content, and set Settings > Pages > Source to GitHub Actions:

```yaml
name: Update data and publish

on:
  schedule:
    - cron: '30 5 * * *'
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install pandas
        run: pip install pandas==3.0.2
      - name: Download the latest data
        run: python fetch_data.py
      - name: Check the data and build data.json
        run: python build_data.py
      - name: Build the website
        run: python build_page.py
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Data licences: World Bank data is CC BY 4.0 (attribution required); EIA, Federal Reserve and BLS data are public domain.
