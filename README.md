# Macroeconomic Monitor and Forecasting

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


## Sign-in (Firebase)

Every page except the front page and Privacy needs a Google sign-in (Apple optional). Sign-in switches on only when
all four Firebase values are filled in config.json under "auth" -> "firebase"; with them empty the site stays open.
Set "apple": true only after Sign in with Apple is configured in Firebase (needs the Apple Developer Program).

The Firebase web values (apiKey, authDomain, projectId, appId) are designed to be public; access is controlled by
Authorized domains and the Firestore rules below. Each signed-in visitor gets users/{uid} (name, email, provider,
joined, lastSeen, sessions) and users/{uid}/visits (page, time). Visitors can delete their own account and record.

Firestore rules:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{uid} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
          match /visits/{visit} {
            allow read, create, delete: if request.auth != null && request.auth.uid == uid;
          }
        }
      }
    }

## Version 3.8 (25 October 2026)
- Series picker: "+ Add a series" on every time chart (Bangladesh series on monthly/quarterly charts, World Bank indicators on yearly charts); added series are dashed on their own right-hand axis and removable.
- No blank spaces: chart grids fixed at two columns on desktop; a grid left with an odd number of charts gets one more ("All the series above in one chart", or a distribution chart); country-page sections get "All the indicators above in one chart".
- Outlook section at the end of every Bangladesh tab: status table, summary, one-year Holt projection with 80% range, methods, merits, limitations, future perspectives.
- Forecast lab, References tab: "Models explained" (17 models and tests, equations, symbols, worked examples, APA 7 references with DOI links).
- Forecast lab, World analysis: explorer with groups (G7, G20, BRICS, OECD, EU, SAARC, ASEAN, OPEC, OIC, Arab League, UN LDCs, income groups, continents, sub-continents), union/intersection, and Map, Distribution, Table, Convergence and tests, Correlations, Projections and Guidance tabs.
- Country pages: time range 5, 10, 15, 20, 25 years or All, a custom number of years, and Auto cycling.
- Monitor and Inflation pages: vertical value labels on line charts, sized for the screen.
- Phones: nothing wider than the screen (menus, maps and grids shrink to fit).
