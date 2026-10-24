# How the earlier projects were merged into Macroarianalytics_Final

## Inputs reviewed

| Input | What it contained | Decision |
|---|---|---|
| Bangladesh_Macroeconomic_Monitor_6 | Bangladesh monitor: 200 curated series, pre-computed model results (DSGE, VARs, projections to 2050), no code for the models | Data kept (re-curated); results replaced by reproducible estimates |
| Bangladesh_Inflation_Monitor_2 | Same data files as the macroeconomic monitor (byte-identical) | **Duplicate — removed** |
| macro-monitor-website | Early world monitor | **Superseded — removed** |
| macroarianalytics-13-files | Second world monitor | **Superseded — removed** |
| macroarianalytics-21-files | Latest world site + Bangladesh module, data scripts, Economic Trends files, maps | Data pipeline kept and extended; front end rebuilt |
| Macroeconomic_Monitor_and_Forecasting.html | Built output of the 21-file version | **Build output — regenerated, not kept** |

## What was kept, extended or rebuilt

* **Data**: the Economic Trends files (6,910 series), the World Bank pipeline and the maps were kept. Added: World Bank
  bank non-performing loans and bank capital (for banking comparisons), a policy-rate decision file with one source per
  decision (2016–2026), and an automated plausibility check of all 377,771 World Bank values.
* **Structure**: every country and category now has the same sixteen pages in the requested order, each split into
  numbered sections, with a contents tree; Bangladesh categories follow the Weekly Selected Economic Indicators chunks.
* **Statistics**: one JavaScript engine for all countries, verified against statsmodels, SciPy and arch (1,960 checks).
* **Models**: the DSGE model is now estimated by a script in the package (scripts/bd_dsge.py) instead of being shipped as
  fixed numbers; world forecasts are computed by scripts/world_models.mjs; everything else is computed in the browser.

## Removed

* Results that could not be reproduced from any code in the inputs (old DSGE posterior, projections to 2050,
  several pre-computed tables). They were replaced by reproducible estimates; nothing is shown that cannot be recomputed.
* The optional sign-in gate of the 21-file version (never configured, and unnecessary for public statistics).
* Claims of “live” updating: data are as of the build date shown on the home page, and the update steps are in README.md.

## Problems in the earlier versions that are fixed

* Tables clipped on narrow screens → every wide table scrolls inside its own frame with a sticky first column, and long
  tables are split into sections (decades, pages of 50 or 100 rows, or two tables when there are many columns).
* Map labels duplicated or misplaced → labels are placed with collision checks; small states are drawn as dots in the
  same projection as the outlines.
* Overlapping chart labels → event bands are lettered and explained in the notes; end labels move apart automatically;
  benchmark and extreme-value labels are positioned away from the axes.
* Two different units on one axis → never: series with different units are stacked in separate panels sharing the
  time axis, or put on one scale by standardising or indexing.
* Colours changing when series were switched off → each series keeps its colour; a ninth series uses a dashed line.
* Phone layout overflow (ticker, chips) → removed the ticker; controls wrap; audited at 390 px width.

## Fixed in the final review (browser audit and interaction test)

* The Data page tabs (World Bank indicators, Economic Trends catalogue) always showed the first tab: single pages now keep
  their tab in the address (`#data.2`, `#data.3`).
* Sign-restricted SVAR: restrictions now apply to the level of each variable (responses of differenced variables are
  cumulated, as in Uhlig 2005); before, the default monetary-tightening signs could not be met by any rotation.
* VAR scenario (page 6.4): when a driver ends before the latest observation, the baseline is now the best univariate
  forecast from today and the scenario adds the VAR response, instead of showing no chart.
* Correlations (page 3.2): with fewer than two series selected, every series of the category is used; quarterly series
  can now be averaged to fiscal or calendar years, so mixed-frequency categories (real sector) work.
* Survey-based series (poverty, inequality): page 5.1 shows the change between surveys and the growth elasticity of
  poverty instead of only a message that time-series filters need regular data.
* ARIMA: at most one difference for rates, ratios and exchange rates (a second difference implied ever-accelerating
  projections); the world forecast matrix was recomputed (49 series affected).
* DSGE: two-stage Metropolis–Hastings (R-hat below 1.1 for every parameter), Greek symbols, split R-hat, effective
  draws and Geweke tests with spectral variances (as in coda).
* Phone layout: previous/next buttons and long reference links wrapped instead of widening the page; exhibit tools
  sit in one row; CSV files start with a plain `#` comment line naming the sources.
* Security guard: typed text such as `GDP > 5` is no longer mistaken for code; direct address changes count towards the
  rate guard; the owner's name is not written into the page while `show_owner` is false.
