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

## Version 3.9 (26 October 2026)
- Type hierarchy: a centred site title (largest) on every page, then page headline, sections, sub-sections and body text in descending sizes.
- Empty space inside cards is filled: the front-page live card gets "Bangladesh at a glance" (latest readings) and three-year trend lines sized to the space; other cards get key figures from their chart.
- Inflation: food and non-food inflation from July 2006 (published rates on each base); CPI groups from July 2013 (2005–06 base) linked to the 2021–22 base, with the year after the change of base left blank; Granger-causality table for related variables.
- Bangladesh map: population and density by division (BBS Census 2022, preliminary report) and a demography strip.
- Sector outlooks: distribution chart, model-accuracy chart, Holt equations, model estimates and back-tests, links with inflation, scenarios and risks.
- Country pages: seconds between automatic changes and a Blink switch on the time-range bar.
- Monitor and Inflation pages: labels on two-axis line charts (matched by colour) and bar charts; "+ Add a series" on line charts (search over all monthly series).

## Version 3.10 (26 October 2026)
- Subscription only: the Free plan is removed; Monthly and Yearly plans show prices in US$ and Taka, or a shaded "Offer price coming soon" while blank.
- Join page rewritten: bKash and Nagad payment steps, payment confirmation form, card payment through SSLCOMMERZ (when approved), signing in.
- New public pages for payment-gateway approval: /terms/ (Terms and conditions), /refund/ (Refund and cancellation), /contact/ (Contact), /privacy/ (Privacy notice). Missing details show as shaded placeholders.
- Owner editor on /owner/ (opens only on a device that has used the owner link): edit contact details, prices and payment numbers, then download an updated config.json and upload it to GitHub.
- Settings: new "contact" and "pay" sections in config.json.

## Version 3.11 (26 October 2026)
- Forecast lab, new "Model library" tab: comparative overview of 11 model families in three groups (structural and policy simulation, time series and data-driven, theoretical foundations).
- Five new models estimated on Bangladesh data, each with equations, symbols, data and method, results tables, four charts, scenarios, reading of results, merits, assumptions, limitations, future development and APA references:
  - Structural macroeconometric (Keynesian) model: consumption (2SLS), investment and import equations; fiscal and export multipliers.
  - VECM of imports, exports and remittances: unit-root and Johansen tests, long-run relation, adjustment speeds, impulse responses, forecasts.
  - Dynamic factor model of 17 monthly indicators, GDP nowcast (bridge equation) and FAVAR of a call-rate shock.
  - SARIMAX of inflation with exchange-rate and call-rate drivers, compared with ARIMA (Diebold–Mariano), with scenarios.
  - 1-2-3 CGE model: tariff, export-price, remittance, import-price and LDC-graduation scenarios, with elasticity sensitivity.
- New file scripts/models_build.py, run automatically at the end of bd_build.py; results stored in bd_models.json ("models2").
- Next: IS-LM-BP, AD-AS, Solow–Swan and Ramsey–Cass–Koopmans.

## Version 3.12 (27 October 2026)
- New course page at /course/: "Data, APIs and AI engineering for economists", 10 modules in four levels plus a capstone:
  Python; Excel vs Python vs SQL; APIs and webhooks; Docker; production Gen-AI architecture; RAG and hybrid search;
  AI agents; fine-tuning with LoRA/QLoRA; seven ways to make an LLM faster; capstone "Bangladesh Macro Copilot".
- Each module: learning outcomes, notes from beginner to advanced, worked example on the site's real data, common mistakes,
  three exercises with solutions, a quick check, and further reading.
- Working labs on real data: hybrid search over 6,723 catalogue series (BM25 + LSA, reciprocal rank fusion, reranking);
  a rule-based agent with a visible trace and a 12-question evaluation set; a fine-tuning dataset builder (JSONL download)
  with a LoRA calculator; a GPU memory calculator.
- Due list on the page: what needs a server, a GPU or an account.
- New files: course.html (page template) and course_build.py (run automatically at the end of build_page.py).
- "Course" link added to the top navigation and the footer.

## Version 3.13 (27 October 2026)
- Course deepened from beginner to doctoral (PhD) depth: every module now has a "Doctoral depth" section (formal theory,
  derivations with worked numbers, research frontier, open problems), a fourth doctoral exercise, two doctoral quiz
  questions and seminal papers with DOI or arXiv links.
- New module 2, "Python II: the ecosystem": files and standard library, Flask/Django/FastAPI, Tkinter/PyQt/Kivy,
  automation and scraping, data science and machine learning, debugging and testing, with a real forecasting experiment
  on Bangladesh inflation (rolling-origin evaluation, Diebold-Mariano tests, a direction classifier).
- Capstone now has MSc and PhD tracks (research design, McNemar tests, reproducibility); milestones renumbered.
- Fix: course_build.py now needs only NumPy and pandas (the GitHub workflow installs only pandas); version 3.12 used
  scikit-learn, which is not installed there, so the course page would not have been built online.
- Note: bd_build.py and models_build.py are not run by the GitHub workflow; model results are estimated locally and
  shipped in bd_models.json.
