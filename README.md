# Macro-Economic Monitor

Website owned by Arian Mondal: growth, inflation, jobs, poverty, public finances, trade and market prices
for more than 200 economies, built from open official data.

## How it works

1. `scripts/fetch_data.py` downloads the latest data (World Bank WDI, U.S. EIA, Federal Reserve, U.S. BLS)
   from DataHub's open-data mirrors into `data/raw/`.
2. `scripts/build_data.py` checks it (ranges, consistency, minimum coverage) and writes `build/data.json`.
   If a check fails, the job stops and the live site stays as it was.
3. `scripts/build_page.py` builds `public/`: the site, a page for every economy, `sitemap.xml` and `robots.txt`.

`setup/update-workflow.yml` runs all three every day at 05:30 UTC on GitHub Actions and publishes to GitHub Pages.
Add it in the Actions tab with "set up a workflow yourself" (or save it as `.github/workflows/update.yml`).

The ready-made `public/` folder in the download is for a quick manual launch (for example Netlify Drop).
Don't upload it to GitHub: the workflow builds it, and GitHub's upload page takes at most 100 files at a time.

## Settings

- Web address and site name: `config.json`
- Email address shown on the site: `src/ext.js` (search for `arian.hu.idec`)

## Run it yourself

```
pip install pandas
python scripts/fetch_data.py && python scripts/build_data.py && python scripts/build_page.py
```

Data licences: World Bank data is CC BY 4.0 (attribution required); EIA, Federal Reserve and BLS data are public domain.


## Bangladesh Monitor and Forecast lab (added October 2026)

Two sections are built from Bangladesh Bank data and a set of pre-estimated models:

| File | What it is |
| --- | --- |
| bd.js | Code for the Bangladesh section (sector groups, matrices, figures, data catalogue) and the Forecast lab |
| bd_models.json | Curated Bangladesh series, model estimates, tests and projections (embedded in the page at build time) |
| bd_catalog.json, bd_M.json, bd_Q.json, bd_CY.json, bd_FY.json | All 6,910 Bangladesh series and their provenance (copied to the site for the Data catalogue) |
| bd_build.py | Re-estimates everything and rewrites bd_models.json |

Sources: Bangladesh Bank, Monthly Economic Trends (September 2026 edition and earlier editions); Bangladesh Bank,
National Summary Data Page (NSDP); World Bank WDI (CC BY 4.0) for the world analysis.

The daily update does not re-estimate the models; it only embeds bd_models.json. To refresh the Bangladesh data or
the models, replace the bd_*.json data files and run (needs Python with numpy, scipy and statsmodels):

    pip install numpy scipy statsmodels
    python bd_build.py --data . --world build/data.json --out bd_models.json

Headline inflation is a linked series (CPI bases 1995–96, 2005–06 and 2021–22), switched where the bases differ
least; Table VII's own headline series is not used because it changes base in July 2012.
