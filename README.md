# Macroarianalytics_Final — Macroeconomic Monitor and Forecasting

One website that merges the four earlier projects (the Bangladesh macroeconomic monitor, the Bangladesh inflation monitor,
the world macro monitor and the 21-file Macroarianalytics build) into a single, reproducible site:

* **Bangladesh in detail** — 153 curated series from Bangladesh Bank (Monthly Economic Trends, policy decisions) and BBS,
  in 13 categories that follow the chunks of Bangladesh Bank’s *Weekly Selected Economic Indicators* (2026 format), plus
  World Bank categories; and the full Economic Trends catalogue (6,910 series) to search and chart.
* **The world in context** — about 217 economies and 54 World Bank indicators (1960–2025), maps, rankings, comparisons,
  relationships, distributions, convergence, heterogeneity, panel regressions, a five-year forecast matrix and markets.
* **Sixteen pages for every country and category, always in the same order**:
  1 Charts and map · 2 Summary · 3 Tables · 4 Country comparisons (sub-region, similar-sized economies, income group,
  LDCs) · 5 Analysis · 6 Forecasting · 7 Results · 8 Tests · 9 Heterogeneity · 10 Robustness · 11 Validation ·
  12 Placebo tests · 13 Decisions · 14 Discussion · 15 Conclusions · 16 Sources and data.
  Each page is split into numbered sections (for example 8.1 Unit roots, 8.2 Cointegration…) so that every item is
  visible without endless scrolling; the contents tree on the left (or the selectors on a phone) opens any section.
* **Every chart** lets you tick or untick each series, whole sub-groups, or add series from any other category, shows
  dated events and benchmarks, has a table view, CSV and PNG downloads, and a numbered caption with units, notes,
  method and source — the conventions of journal exhibits.
* **Models** — ARIMA/SARIMA, damped exponential smoothing, AR, benchmarks and an ensemble; VARs, Cholesky and
  sign-restricted structural VARs, local projections (linear and asymmetric), GARCH and GJR-GARCH, Engle–Granger and
  Johansen cointegration with error correction, HP and Hamilton filters, Bai–Perron breaks, and a **Bayesian DSGE model of
  Bangladesh** (Lubik–Schorfheide small open economy) estimated by Metropolis–Hastings, plus an interactive DSGE laboratory.
* **Checks** — unit roots (ADF, PP, KPSS, Zivot–Andrews), residual diagnostics, heterogeneity tests (Welch, Mann–Whitney,
  Brown–Forsythe, ANOVA, Kruskal–Wallis, Pesaran–Yamagata, interactions), robustness (HAC, HC1, Huber, sub-samples,
  winsorising, rolling and recursive estimates, CUSUM, jackknife), validation (rolling-origin backtests, Diebold–Mariano,
  Mincer–Zarnowitz, interval coverage) and placebo tests (fake dates, time-shifted, reverse-timing and random drivers).

The statistics engine runs in the browser and has been verified against statsmodels, SciPy and arch:
**1,960 automated checks pass** (see *Models → Verification* on the site, and `scripts/verify_*`).

## Quality checks run on this build

| Check | Result |
|---|---|
| Statistics engine against statsmodels, SciPy and arch (`scripts/verify_*.mjs`, run by every build; `--strict` stops the build on any failure) | 1,960 of 1,960 pass |
| Browser audit of every Bangladesh page and section (`tests/audit.py`, Chromium): console errors, page errors, horizontal overflow, unfinished spinners, NaN/undefined text | 1,207 pages, no problems |
| The same audit for six other economies of different size and data coverage (United States, India, Nigeria, Tuvalu, South Sudan, Germany) | 758 pages, no problems |
| World, models, data, learning, reference and site pages | 41 pages, no problems |
| Phone width (390 px) for five Bangladesh categories, the world and model pages and one other economy | 411 pages, no problems |
| Dark theme, sample of 47 pages with screenshots | no problems |
| Interaction test (`tests/interact.py`): series picker, adding series from other categories, transforms, ranges, table view, CSV and PNG downloads, forecast models, horizons and bands, VAR scenario, DSGE laboratory, sign-restricted SVAR, league table and projections, data catalogue, search, theme, and the security guard (warning, lock, rate pause, frame refusal) | 47 of 47 pass |
| Bayesian DSGE: convergence of the two Markov chains (`scripts/bd_dsge.py`) | R-hat below 1.1 for every parameter |

## Folder structure

| Path | What it is |
|---|---|
| `public/` | **The website.** Upload this folder to any static host (see *Deploying*). |
| `public/index.html` | The whole site in one page (data embedded, 2.5 MB). |
| `public/data/` | Full Economic Trends catalogue and data, loaded only when you open the catalogue. |
| `public/_headers` | Security headers for Cloudflare Pages / Netlify (CSP, frame-ancestors, HSTS…). |
| `src/js/` | Application code: `stats*.js` (statistics engine), `core.js`, `charts.js`, `maps.js`, `analysis.js`, `pages-*.js`, `security.js`, `app.js`. |
| `src/css/site.css` | Styles (light and dark themes). |
| `scripts/` | Data and build pipeline (Python and Node), DSGE estimation, verification scripts. |
| `vendor/` | Apache ECharts 5.6.0 (the npm build), copied into `public/vendor/` by the build and pinned with Subresource Integrity. |
| `data/` | Raw downloads (`raw/`), Bangladesh Bank files (`bd/`), maps (`geo/`), policy-rate decisions (`ref/`). |
| `build/` | Intermediate data (`world.json`, `bd_data.json`, `world_fc.json`, `bd_dsge.json`, the DSGE posterior draws `bd_dsge_draws.npz`), verification references and `preview.html` (the one-file preview build). |
| `docs/` | `alert-relay.gs` (e-mail alerts), `MERGE_NOTES.md`. |
| `tests/` | Browser audit and interaction test (Playwright, `audit.py`, `interact.py`), route lists, and a Node harness for the model code. |
| `config.json` | Domain, names, official hosts, alert endpoint, contact form. |

## Updating the data and rebuilding

Requirements: Python 3.10+ with `pandas numpy scipy statsmodels arch`, Node 18+ (no npm packages needed for the build).

```bash
python3 scripts/fetch_data.py        # World Bank WDI and market data (DataHub / Open Numbers mirrors)
python3 scripts/build_data.py        # -> build/world.json (with automated plausibility checks)
python3 scripts/bd_build.py          # -> build/bd_data.json (Bangladesh Bank series, policy-rate decisions)
node    scripts/world_models.mjs     # -> build/world_fc.json (forecast matrix, about 2 minutes)
python3 scripts/bd_dsge.py           # -> build/bd_dsge.json (Bayesian DSGE, about 40 minutes on two cores; MODE_FROM_JSON=1 restarts from the stored mode)
python3 scripts/verify_ref.py && python3 scripts/verify_ref_ts.py && python3 scripts/verify_ref_eval.py \
  && python3 scripts/verify_ref_garch.py && python3 scripts/verify_ref_dsge.py   # reference values
python3 scripts/build_site.py        # runs every verification, then writes public/ and build/preview.html
```

To add a new Economic Trends edition, put the new monthly/quarterly files in `data/bd/` (same format) and add the
policy-rate decision, with its source, to `data/ref/bd_policy_rates.csv`; then rerun `bd_build.py` and `build_site.py`.

## Deploying (free)

1. **Cloudflare Pages** (recommended, free): create a project, upload the `public/` folder (or connect the GitHub repo
   with build output `public`). `_headers` is applied automatically. Add your domain under *Custom domains*.
2. Put the domain behind Cloudflare (orange cloud) and follow **SECURITY.md** to switch on the firewall, rate limiting,
   bot protection and e-mail alerts.
3. Alternatives: Netlify (reads `_headers`), GitHub Pages (does not read `_headers`; use Cloudflare in front of it).

## Credits and licences

Data: Bangladesh Bank and Bangladesh Bureau of Statistics; World Bank World Development Indicators (CC BY 4.0);
U.S. EIA, Federal Reserve and BLS via DataHub; Natural Earth (public domain). Charts: Apache ECharts 5.6 (Apache-2.0).
Data remain the property of their publishers. Analysis is statistical and is not official forecasting or advice.
