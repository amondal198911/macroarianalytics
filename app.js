(function () {
'use strict';

/* ================= utilities ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs) {
  const n = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const MINUS = '\u2212';
const FONT = '"Archivo","Helvetica Neue",Arial,system-ui,sans-serif';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ================= data ================= */
const RAW = JSON.parse($('#mm-data').textContent);
const LAST = RAW.meta.last;
const ECON = {};
const COUNTRIES = [];
const GROUPS = [];
for (const [code, name, iso2, region, sub, num, g] of RAW.econ) {
  const e = { code, name, iso2, region, sub, num, group: !!g };
  ECON[code] = e;
  (g ? GROUPS : COUNTRIES).push(e);
}
COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));
const S = {};
for (const key in RAW.s) {
  const src = RAW.s[key], o = {};
  for (const code in src) {
    const [y0, str] = src[code];
    o[code] = { y0, v: str.split(',').map(x => (x === '' ? null : Number(x))) };
  }
  S[key] = o;
}
const COV = RAW.cov;

function val(key, code, y) {
  const s = S[key] && S[key][code];
  if (!s) return null;
  const i = y - s.y0;
  return i >= 0 && i < s.v.length ? s.v[i] : null;
}
function latest(key, code, upTo) {
  const s = S[key] && S[key][code];
  if (!s) return null;
  const top = Math.min(upTo == null ? 9999 : upTo, s.y0 + s.v.length - 1);
  for (let y = top; y >= s.y0; y--) { const v = s.v[y - s.y0]; if (v != null) return { y, v }; }
  return null;
}
function firstYear(key, code) { const s = S[key] && S[key][code]; return s ? s.y0 : null; }
function popAt(code, y) { const p = val('population', code, y); if (p != null) return p; const l = latest('population', code, y); return l ? l.v : null; }

let FLAG_OK = true;
function flag(e) {
  if (!e) return '';
  if (e.group) return '\u{1F310}';
  if (!e.iso2 || e.iso2.length !== 2) return '';
  if (!FLAG_OK) return e.iso2.toUpperCase();
  return String.fromCodePoint(...[...e.iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
const poss = n => (/s$/i.test(n) ? n + '’' : n + '’s');
const GROUP_SUBJ = {
  WLD: 'The world economy', EAS: 'East Asia and the Pacific', ECS: 'Europe and Central Asia',
  LCN: 'Latin America and the Caribbean', MEA: 'The Middle East, North Africa, Afghanistan and Pakistan',
  NAC: 'North America', SAS: 'South Asia', SSF: 'Sub-Saharan Africa', EUU: 'The European Union',
  EMU: 'The euro area', OED: 'OECD economies', HIC: 'High-income economies', UMC: 'Upper-middle-income economies',
  LMC: 'Lower-middle-income economies', LIC: 'Low-income economies'
};

/* ================= indicators ================= */
const WB = 'World Bank, World Development Indicators';
const IND = {
  gdp_growth: { label: 'Real GDP growth', short: 'Growth', unit: '% change on a year earlier', fmt: 'pct', scale: 'div', t: [-3, -1, 0, 2, 4, 6], dl: 'pts', src: WB + ' (NY.GDP.MKTP.KD.ZG)',
    desc: 'How much more the economy produced than a year earlier, after removing the effect of price changes.',
    why: 'The broadest sign of whether an economy is expanding or shrinking. A negative number means output fell.' },
  gdp_usd: { label: 'GDP', short: 'GDP', unit: 'US dollars, current prices', fmt: 'usdbn', scale: 'cool', t: [5, 20, 50, 200, 500, 2000], dl: 'pct', src: WB + ' (NY.GDP.MKTP.CD)',
    desc: 'The total value of goods and services produced in a year, converted to US dollars at market exchange rates.',
    why: 'Shows the size of an economy. Exchange-rate swings can move it even when output barely changes.' },
  gdp_pc: { label: 'GDP per person', short: 'GDP per person', unit: 'US dollars, current prices', fmt: 'usd', scale: 'cool', t: [1000, 2500, 5000, 10000, 25000, 50000], dl: 'pct', src: WB + ' (NY.GDP.PCAP.CD)',
    desc: 'GDP divided by the number of people.',
    why: 'A rough guide to average income and living standards.' },
  gdp_pc_ppp: { label: 'GDP per person, PPP', short: 'Per person, PPP', unit: 'international dollars, current prices', fmt: 'usd', scale: 'cool', t: [2500, 5000, 10000, 20000, 40000, 70000], dl: 'pct', src: WB + ' (NY.GDP.PCAP.PP.CD)',
    desc: 'GDP per person adjusted for differences in what money buys in each country (purchasing power parity).',
    why: 'Fairer than market exchange rates for comparing living standards across countries.' },
  investment: { label: 'Investment', short: 'Investment', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [10, 15, 20, 25, 30, 35], dl: 'pts', src: WB + ' (NE.GDI.TOTL.ZS)',
    desc: 'Spending on buildings, machinery, infrastructure and stocks of goods (gross capital formation).',
    why: 'Investment builds the capacity to produce more in the future.' },
  savings: { label: 'Gross savings', short: 'Savings', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [5, 10, 15, 20, 25, 35], dl: 'pts', src: WB + ' (NY.GNS.ICTR.ZS)',
    desc: 'National income that is not spent on consumption by households, companies and government.',
    why: 'Savings pay for investment at home. When they fall short, the gap is filled by borrowing from abroad.' },
  inflation: { label: 'Inflation', short: 'Inflation', unit: 'consumer prices, % change on a year earlier', fmt: 'pct', scale: 'infl', t: [0, 2, 4, 6, 10, 20], dl: 'pts', src: WB + ' (FP.CPI.TOTL.ZG)',
    desc: 'How fast the prices of everyday goods and services rose over the year.',
    why: 'High inflation erodes wages and savings. Many central banks aim for about 2%. Falling prices (deflation) can signal weak demand.' },
  lending_rate: { label: 'Lending interest rate', short: 'Lending rate', unit: '% a year', fmt: 'pct', scale: 'warm', t: [4, 7, 10, 15, 20, 30], dl: 'pts', src: WB + ' (FR.INR.LEND)',
    desc: 'The rate banks typically charge businesses for loans.',
    why: 'Shows the cost of credit. It tends to move with the central bank’s policy rate.' },
  real_rate: { label: 'Real interest rate', short: 'Real rate', unit: '% a year, lending rate minus inflation', fmt: 'pct', scale: 'div', t: [-5, -2, 0, 2, 5, 10], dl: 'pts', src: WB + ' (FR.INR.RINR)',
    desc: 'The lending rate adjusted for inflation (measured by the GDP deflator).',
    why: 'The true cost of borrowing. Below zero, inflation is eating away at what borrowers owe.' },
  money_growth: { label: 'Broad money growth', short: 'Money growth', unit: '% change on a year earlier', fmt: 'pct', scale: 'warm', t: [0, 5, 10, 15, 25, 50], dl: 'pts', src: WB + ' (FM.LBL.BMNY.ZG)',
    desc: 'Growth of the money in an economy, counting cash and bank deposits.',
    why: 'Very fast money growth often comes before or alongside high inflation.' },
  private_credit: { label: 'Credit to the private sector', short: 'Private credit', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [10, 25, 50, 75, 100, 150], dl: 'pts', src: WB + ' (FS.AST.PRVT.GD.ZS)',
    desc: 'Loans and other credit from banks and lenders to companies and households.',
    why: 'Shows how deep the financial system is. A sudden surge can be an early sign of a credit bubble.' },
  fx_change: { label: 'Currency change against the US dollar', short: 'Currency vs $', unit: '% change in value, yearly average', fmt: 'pct', scale: 'div', t: [-20, -10, -3, 0, 3, 10], dl: 'pts', src: 'Calculated from ' + WB + ' (PA.NUS.FCRF)',
    desc: 'How much the local currency gained or lost against the US dollar over the year.',
    why: 'A sharp fall makes imports more expensive and can push up inflation. A rise does the opposite.' },
  fx: { label: 'Exchange rate', short: 'Exchange rate', unit: 'local currency per US dollar, yearly average', fmt: 'fx', scale: null, dl: 'pct', src: WB + ' (PA.NUS.FCRF)',
    desc: 'How many units of local currency one US dollar buys.',
    why: 'A rising number means the local currency is getting weaker against the dollar.' },
  unemployment: { label: 'Unemployment', short: 'Unemployment', unit: '% of the labour force', fmt: 'pct', scale: 'warm', t: [3, 5, 7, 10, 15, 25], dl: 'pts', src: WB + ' (SL.UEM.TOTL.ZS, ILO modelled estimate)',
    desc: 'The share of people who want a job and are looking for one, but don’t have one.',
    why: 'A key measure of hardship and of how much slack there is in the economy.' },
  population: { label: 'Population', short: 'Population', unit: 'people', fmt: 'mn', scale: 'cool', t: [1, 5, 10, 30, 100, 300], dl: 'pct', src: WB + ' (SP.POP.TOTL)',
    desc: 'Everyone living in the country, counted at mid-year.',
    why: 'Sets the size of the workforce and the market, and the scale of public services needed.' },
  pop_growth: { label: 'Population growth', short: 'Population growth', unit: '% change on a year earlier', fmt: 'pct', scale: 'div', t: [-1, 0, 0.5, 1, 2, 3], dl: 'pts', src: WB + ' (SP.POP.GROW)',
    desc: 'How fast the population is growing or shrinking.',
    why: 'Fast growth needs many new jobs. A shrinking, ageing population can weigh on growth.' },
  budget: { label: 'Budget balance', short: 'Budget balance', unit: '% of GDP, revenue minus spending', fmt: 'pct', scale: 'div', t: [-9, -6, -3, -1, 1, 3], dl: 'pts', src: WB + ' (GC.NLD.TOTL.GD.ZS)',
    desc: 'Government revenue minus spending (net lending or borrowing). Below zero is a deficit.',
    why: 'Deficits are covered by borrowing, which adds to government debt.' },
  gov_debt: { label: 'Government debt', short: 'Government debt', unit: '% of GDP, central government', fmt: 'pct', scale: 'warm', t: [20, 40, 60, 90, 120, 150], dl: 'pts', src: WB + ' (GC.DOD.TOTL.GD.ZS)',
    desc: 'What the central government owes, compared with the size of the economy.',
    why: 'High debt means more spending on interest and less room to respond to a crisis. Only some countries report it.' },
  revenue: { label: 'Government revenue', short: 'Revenue', unit: '% of GDP, excluding grants', fmt: 'pct', scale: 'cool', t: [10, 15, 20, 25, 30, 40], dl: 'pts', src: WB + ' (GC.REV.XGRT.GD.ZS)',
    desc: 'Taxes, social contributions and other income collected by the government.',
    why: 'Shows how much the state collects to pay for public services.' },
  spending: { label: 'Government expense', short: 'Expense', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [10, 15, 20, 25, 30, 40], dl: 'pts', src: WB + ' (GC.XPN.TOTL.GD.ZS)',
    desc: 'Government spending on wages, goods and services, interest, subsidies and benefits.',
    why: 'Shows how large a role the government plays in the economy.' },
  tax: { label: 'Tax revenue', short: 'Tax', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [5, 10, 15, 20, 25, 30], dl: 'pts', src: WB + ' (GC.TAX.TOTL.GD.ZS)',
    desc: 'Taxes collected by the central government.',
    why: 'A low tax take can limit spending on health, education and infrastructure.' },
  current_account: { label: 'Current account balance', short: 'Current account', unit: '% of GDP', fmt: 'pct', scale: 'div', t: [-6, -3, -1, 1, 3, 6], dl: 'pts', src: 'Calculated from ' + WB + ' (BN.CAB.XOKA.CD, NY.GDP.MKTP.CD)',
    desc: 'The balance of trade in goods and services plus income and transfers with the rest of the world.',
    why: 'A deficit means a country spends more abroad than it earns and relies on foreign money. A surplus means it lends to the world.' },
  exports: { label: 'Exports', short: 'Exports', unit: '% of GDP, goods and services', fmt: 'pct', scale: 'cool', t: [10, 20, 30, 45, 60, 90], dl: 'pts', src: WB + ' (NE.EXP.GNFS.ZS)',
    desc: 'Goods and services sold to other countries.',
    why: 'Shows how open an economy is and how much it depends on demand from abroad.' },
  imports: { label: 'Imports', short: 'Imports', unit: '% of GDP, goods and services', fmt: 'pct', scale: 'cool', t: [10, 20, 30, 45, 60, 90], dl: 'pts', src: WB + ' (NE.IMP.GNFS.ZS)',
    desc: 'Goods and services bought from other countries.',
    why: 'Heavy reliance on imported food and fuel leaves a country exposed to world prices.' },
  fdi: { label: 'Foreign direct investment', short: 'FDI', unit: '% of GDP, net inflows', fmt: 'pct', scale: 'div', t: [-1, 0, 1, 2, 4, 8], dl: 'pts', src: 'Calculated from ' + WB + ' (BX.KLT.DINV.CD.WD)',
    desc: 'Long-term investment by foreign companies, such as building factories or buying stakes in firms.',
    why: 'Brings capital, jobs and know-how, and is steadier than short-term flows of money.' },
  remittances: { label: 'Remittances received', short: 'Remittances', unit: '% of GDP', fmt: 'pct', scale: 'cool', t: [0.5, 1, 2, 5, 10, 20], dl: 'pts', src: 'Calculated from ' + WB + ' (BX.TRF.PWKR.CD.DT)',
    desc: 'Money sent home by people working abroad.',
    why: 'A vital source of income for many households in developing economies.' },
  reserves: { label: 'Foreign reserves', short: 'Reserves', unit: 'US dollars, including gold', fmt: 'usdbn', scale: 'cool', t: [1, 5, 20, 50, 200, 1000], dl: 'pct', src: WB + ' (FI.RES.TOTL.CD)',
    desc: 'Foreign currency, gold and other assets held by the central bank.',
    why: 'A buffer against shocks. Running low can make a currency crisis more likely.' },
  ext_debt: { label: 'External debt', short: 'External debt', unit: '% of gross national income', fmt: 'pct', scale: 'warm', t: [20, 40, 60, 80, 100, 150], dl: 'pts', src: WB + ' (DT.DOD.DECT.GN.ZS)',
    desc: 'Everything a country’s government, companies and households owe to foreign lenders.',
    why: 'Reported for low- and middle-income countries. Large debts can become hard to repay if the currency falls.' },
  poverty: { label: 'Extreme poverty', short: 'Extreme poverty', unit: '% of people living on less than $3.00 a day (2021 prices, PPP)', fmt: 'pct', scale: 'warm', t: [1, 3, 10, 20, 35, 50], dl: 'pts', sparse: true, src: WB + ' (SI.POV.DDAY)',
    desc: 'The share of people living below the World Bank’s international extreme poverty line of $3.00 a day.',
    why: 'The headline measure of deprivation. It comes from household surveys, which most countries run only every few years.' },
  poverty_nat: { label: 'Poverty at national lines', short: 'National poverty', unit: '% of people below the country’s own poverty line', fmt: 'pct', scale: 'warm', t: [5, 10, 20, 30, 40, 50], dl: 'pts', sparse: true, src: WB + ' (SI.POV.NAHC)',
    desc: 'The share of people below the poverty line each country sets for itself.',
    why: 'It reflects local living costs, so it is useful for tracking one country over time but not for comparing countries.' },
  gini: { label: 'Income inequality (Gini index)', short: 'Inequality (Gini)', unit: 'index from 0 (everyone equal) to 100 (one person has everything)', fmt: 'idx', scale: 'warm', t: [25, 30, 35, 40, 45, 50], dl: 'pts', sparse: true, src: WB + ' (SI.POV.GINI)',
    desc: 'A single number for how unevenly income or consumption is shared.',
    why: 'High inequality can hold back growth and social mobility. Many European countries score about 25 to 35; parts of Latin America and southern Africa score above 50.' },
  top20: { label: 'Income share of the richest 20%', short: 'Richest 20%', unit: '% of income or consumption', fmt: 'pct', scale: 'warm', t: [38, 42, 46, 50, 54, 58], dl: 'pts', sparse: true, src: WB + ' (SI.DST.05TH.20)',
    desc: 'How much of all income (or consumption) goes to the richest fifth of people.',
    why: 'If incomes were equal it would be 20%. The further above that, the more concentrated income is.' },
  bottom20: { label: 'Income share of the poorest 20%', short: 'Poorest 20%', unit: '% of income or consumption', fmt: 'pct', scale: 'cool', t: [4, 5, 6, 7, 8, 9], dl: 'pts', sparse: true, src: WB + ' (SI.DST.FRST.20)',
    desc: 'How much of all income (or consumption) goes to the poorest fifth of people.',
    why: 'If incomes were equal it would be 20%. Low values mean the poorest are being left far behind.' },
  youth_unemp_f: { label: 'Youth unemployment, women', short: 'Youth jobless, women', unit: '% of women aged 15–24 in the labour force', fmt: 'pct', scale: 'warm', t: [5, 10, 15, 20, 30, 45], dl: 'pts', src: WB + ' (SL.UEM.1524.FE.ZS, ILO modelled estimate)',
    desc: 'The share of young women who want work and are looking for it, but don’t have a job.',
    why: 'Young people are hit first and hardest when jobs are scarce, and long spells without work can scar careers.' },
  youth_unemp_m: { label: 'Youth unemployment, men', short: 'Youth jobless, men', unit: '% of men aged 15–24 in the labour force', fmt: 'pct', scale: 'warm', t: [5, 10, 15, 20, 30, 45], dl: 'pts', src: WB + ' (SL.UEM.1524.MA.ZS, ILO modelled estimate)',
    desc: 'The share of young men who want work and are looking for it, but don’t have a job.',
    why: 'Compare it with the rate for young women to see whether either group faces a tougher job market.' },
  lfp_f: { label: 'Women in the labour force', short: 'Women working', unit: '% of women aged 15+ working or looking for work', fmt: 'pct', scale: 'cool', t: [20, 35, 45, 52, 58, 65], dl: 'pts', src: WB + ' (SL.TLF.CACT.FE.ZS, ILO modelled estimate)',
    desc: 'The share of women aged 15 and over who have a job or are looking for one.',
    why: 'Low participation means talent the economy isn’t using. It is one of the clearest gender gaps in economic data.' },
  lfp_m: { label: 'Men in the labour force', short: 'Men working', unit: '% of men aged 15+ working or looking for work', fmt: 'pct', scale: 'cool', t: [50, 60, 65, 70, 75, 80], dl: 'pts', src: WB + ' (SL.TLF.CACT.MA.ZS, ILO modelled estimate)',
    desc: 'The share of men aged 15 and over who have a job or are looking for one.',
    why: 'Read it alongside the figure for women to see the size of the gender gap.' },
  debt_service: { label: 'Debt service', short: 'Debt service', unit: '% of export earnings (goods, services and primary income)', fmt: 'pct', scale: 'warm', t: [5, 10, 15, 20, 30, 40], dl: 'pts', src: WB + ' (DT.TDS.DECT.EX.ZS)',
    desc: 'Interest and repayments on foreign debt in a year, compared with what the country earns from exports.',
    why: 'Shows how much foreign income goes straight to creditors. A rising share is an early warning of debt distress. Reported for low- and middle-income countries.' }
};
const CATS = [
  ['Growth and output', ['gdp_growth', 'gdp_usd', 'gdp_pc', 'gdp_pc_ppp', 'investment', 'savings']],
  ['Prices, money and interest rates', ['inflation', 'lending_rate', 'real_rate', 'money_growth', 'private_credit', 'fx_change']],
  ['Jobs and people', ['unemployment', 'youth_unemp_f', 'youth_unemp_m', 'lfp_f', 'lfp_m', 'population', 'pop_growth']],
  ['Poverty and inequality', ['poverty', 'poverty_nat', 'gini', 'top20', 'bottom20']],
  ['Public finances', ['budget', 'gov_debt', 'revenue', 'spending', 'tax']],
  ['Trade and external', ['current_account', 'exports', 'imports', 'fdi', 'remittances', 'reserves', 'ext_debt', 'debt_service']]
];
const PROFILE = [
  ['growth', 'Growth and output', 'Growth', [
    { k: ['gdp_growth'], type: 'bar', world: true, title: 'Real GDP growth' },
    { k: ['gdp_usd'], type: 'area', title: 'GDP' },
    { k: ['gdp_pc', 'gdp_pc_ppp'], type: 'line', title: 'GDP per person', names: ['US dollars', 'PPP, international dollars'], unit: 'current prices' },
    { k: ['investment', 'savings'], type: 'line', title: 'Investment and savings', names: ['Investment', 'Savings'] }]],
  ['prices', 'Prices, money and interest rates', 'Prices', [
    { k: ['inflation'], type: 'line', world: true, ref: 2, title: 'Inflation' },
    { k: ['lending_rate', 'real_rate'], type: 'line', title: 'Interest rates', names: ['Lending rate', 'Real rate'], unit: '% a year' },
    { k: ['money_growth'], type: 'line', title: 'Broad money growth' },
    { k: ['private_credit'], type: 'area', title: 'Credit to the private sector' },
    { k: ['fx'], type: 'line', title: 'Exchange rate' }]],
  ['jobs', 'Jobs and people', 'Jobs', [
    { k: ['unemployment'], type: 'line', world: true, title: 'Unemployment' },
    { k: ['youth_unemp_f', 'youth_unemp_m'], type: 'line', title: 'Youth unemployment', names: ['Women aged 15–24', 'Men aged 15–24'], unit: '% of the labour force aged 15–24' },
    { k: ['lfp_f', 'lfp_m'], type: 'line', title: 'Labour force participation', names: ['Women 15+', 'Men 15+'], unit: '% of people aged 15+ working or looking for work' },
    { k: ['population'], type: 'area', title: 'Population' },
    { k: ['pop_growth'], type: 'bar', title: 'Population growth' }]],
  ['poverty', 'Poverty and inequality', 'Poverty', [
    { k: ['poverty', 'poverty_nat'], type: 'line', sparse: true, title: 'Poverty', names: ['Below $3.00 a day', 'Below the national line'], unit: '% of people' },
    { k: ['gini'], type: 'line', sparse: true, title: 'Income inequality (Gini index)' },
    { k: ['top20', 'bottom20'], type: 'line', sparse: true, title: 'Who gets the income', names: ['Richest 20%', 'Poorest 20%'], unit: '% of income or consumption' }]],
  ['public', 'Public finances', 'Public finances', [
    { k: ['budget'], type: 'bar', title: 'Budget balance' },
    { k: ['gov_debt'], type: 'area', title: 'Government debt' },
    { k: ['revenue', 'spending', 'tax'], type: 'line', title: 'Revenue and spending', names: ['Revenue', 'Expense', 'Tax revenue'], unit: '% of GDP' }]],
  ['external', 'Trade and external', 'Trade', [
    { k: ['current_account'], type: 'bar', title: 'Current account balance' },
    { k: ['exports', 'imports'], type: 'line', title: 'Exports and imports', names: ['Exports', 'Imports'], unit: '% of GDP' },
    { k: ['fdi', 'remittances'], type: 'line', title: 'Foreign investment and remittances', names: ['Foreign direct investment', 'Remittances received'], unit: '% of GDP' },
    { k: ['reserves'], type: 'area', title: 'Foreign reserves' },
    { k: ['ext_debt'], type: 'area', title: 'External debt' },
    { k: ['debt_service'], type: 'area', title: 'Debt service' }]]
];

/* ================= formatting ================= */
const NF = {};
const nf = d => NF[d] || (NF[d] = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
function num(v, d) {
  if (!(d === 0 && Number.isInteger(+v))) d = 2;
  if (Number(v.toFixed(d)) === 0) v = 0;
  return nf(d).format(v).replace('-', MINUS);
}
function trimNum(v) { return nf(Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 1).format(v).replace('-', MINUS).replace(/\.0$/, ''); }
const CNF = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const compact = v => CNF.format(v).replace('-', MINUS);
function sig(v) {
  const a = Math.abs(v);
  return num(v, a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4);
}
function fmt(key, v) {
  if (v == null || !Number.isFinite(v)) return '–';
  const f = IND[key].fmt, a = Math.abs(v);
  if (f === 'pct') return num(v, a >= 100 ? 0 : 1) + '%';
  if (f === 'usdbn') return a >= 1000 ? '$' + num(v / 1000, a >= 10000 ? 1 : 2) + ' tn' : a >= 1 ? '$' + num(v, a >= 100 ? 0 : 1) + ' bn' : '$' + num(v * 1000, 0) + ' m';
  if (f === 'usd') return '$' + num(v, 0);
  if (f === 'mn') return a >= 1000 ? num(v / 1000, 2) + ' bn' : a >= 1 ? num(v, a >= 100 ? 0 : 1) + ' m' : num(v * 1000, 0) + 'k';
  if (f === 'fx') return num(v, 2);
  if (f === 'idx') return num(v, 1);
  return String(v);
}
function fmtT(key, t) {
  const f = IND[key].fmt;
  if (f === 'pct') return trimNum(t) + '%';
  if (f === 'usdbn') return t >= 1000 ? '$' + trimNum(t / 1000) + ' tn' : '$' + trimNum(t) + ' bn';
  if (f === 'usd') return '$' + compact(t);
  if (f === 'mn') return trimNum(t) + ' m';
  return trimNum(t);
}
function axisFmt(key) {
  const f = key && IND[key] ? IND[key].fmt : null;
  return v => {
    if (f === 'pct') return trimNum(v) + '%';
    if (f === 'usdbn') return Math.abs(v) >= 1000 ? '$' + trimNum(v / 1000) + ' tn' : '$' + trimNum(v) + ' bn';
    if (f === 'usd') return '$' + compact(v);
    if (f === 'mn') return Math.abs(v) >= 1000 ? trimNum(v / 1000) + ' bn' : trimNum(v) + ' m';
    return compact(v);
  };
}
function delta(key, cur, prev) {
  if (cur == null || prev == null) return null;
  if (IND[key].dl === 'pts') { const d = cur - prev; if (Math.abs(d) < 0.05) return { d: 0, txt: 'unchanged' }; return { d, txt: (d >= 0 ? '+' : MINUS) + num(Math.abs(d), 1) + ' pts' }; }
  if (!prev) return null;
  const p = (cur / prev - 1) * 100;
  return { d: p, txt: (p >= 0 ? '+' : MINUS) + num(Math.abs(p), Math.abs(p) >= 100 ? 0 : 1) + '%' };
}
const yy = y => '’' + String(y).slice(2);
const DFMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MFMT = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDay = d => DFMT.format(new Date(d + 'T00:00:00Z'));
const fmtMonth = d => MFMT.format(new Date(d.slice(0, 7) + '-01T00:00:00Z'));

/* ================= colour scales ================= */
const PAL = {
  div: ['#9E1B1B', '#D0473D', '#F2A38F', '#C6DBEF', '#7DB0DB', '#3A7CC1', '#164C8C'],
  warm: ['#FFF0BF', '#FDD38A', '#FBAF63', '#F3834B', '#DB5637', '#B22B2B', '#6F1420'],
  infl: ['#9DBEE0', '#FFF0BF', '#FDD38A', '#FBAF63', '#F3834B', '#DB5637', '#7D1620'],
  cool: ['#DDEFF3', '#B4DBE5', '#81C0D2', '#4CA0BC', '#2A7FA4', '#1A5F88', '#0F3F68']
};
function binOf(key, v) { const t = IND[key].t; let i = 0; while (i < t.length && v >= t[i]) i++; return i; }
function colorOf(key, v) { const I = IND[key]; if (!I.scale || v == null) return null; return PAL[I.scale][binOf(key, v)]; }
function textOn(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.58 ? '#0E1C2B' : '#FFFFFF';
}
function legendBins(key) {
  const t = IND[key].t, out = [];
  out.push('Below ' + fmtT(key, t[0]));
  for (let i = 0; i < t.length - 1; i++) out.push(fmtT(key, t[i]) + ' to ' + fmtT(key, t[i + 1]));
  out.push(fmtT(key, t[t.length - 1]) + ' or more');
  return out.map((label, i) => ({ label, color: PAL[IND[key].scale][i] }));
}

/* ================= theme ================= */
function isDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
function theme() {
  const cs = getComputedStyle(document.documentElement);
  const g = n => cs.getPropertyValue(n).trim();
  const dark = isDark();
  return {
    dark, ink: g('--ink'), ink2: g('--ink-2'), muted: g('--muted'), line: g('--line'), grid: g('--grid'),
    paper: g('--paper'), panel: g('--panel'), pos: g('--pos'), neg: g('--neg'), signal: g('--signal'),
    pal: dark ? ['#6FA8E8', '#F2B630', '#4CC9B0', '#E26BD0', '#A9B8C7', '#B388EB', '#F4A27F', '#9BE15D']
      : ['#1F5FA8', '#C98500', '#1F8A7D', '#A3168F', '#5E7185', '#6B2CB0', '#D4583A', '#2E7D32']
  };
}
const themeBtn = $('#theme-btn');
function syncThemeBtn() {
  const d = isDark();
  themeBtn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
  themeBtn.setAttribute('title', d ? 'Light mode' : 'Dark mode');
  themeBtn.innerHTML = d
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>';
}
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.set('mm.theme', next);
  syncThemeBtn();
  repaintAll();
});
if (window.matchMedia) {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onMq = () => { if (!document.documentElement.getAttribute('data-theme')) { syncThemeBtn(); repaintAll(); } };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
}
function repaintAll() {
  drawPulse();
  for (const [node, rec] of charts) { rec.dirty = true; if (rec.visible) applyChart(node, rec); }
}

/* ================= charts (ECharts, lazy) ================= */
const charts = new Map();
let echartsState = 'idle';
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const en of entries) {
    const rec = charts.get(en.target);
    if (!rec) continue;
    rec.visible = en.isIntersecting;
    if (rec.visible && (rec.dirty || !rec.inst)) applyChart(en.target, rec);
  }
}, { rootMargin: '250px 0px' }) : null;
const ro = 'ResizeObserver' in window ? new ResizeObserver(entries => {
  for (const en of entries) { const rec = charts.get(en.target); if (rec && rec.inst) rec.inst.resize(); }
}) : null;
function chartOn(node, render, opts) {
  ensureSrc(node);
  let rec = charts.get(node);
  if (!rec) {
    rec = { render, inst: null, dirty: true, visible: !io };
    charts.set(node, rec);
    if (io) io.observe(node);
  } else { rec.render = render; rec.dirty = true; }
  if (opts) { rec.merge = !!opts.merge; if (opts.onInit) rec.onInit = opts.onInit; }
  if (rec.visible || !io) applyChart(node, rec);
}
function msg(node, text) { node.innerHTML = ''; node.append(el('div', { class: 'chart-msg', text })); }
function applyChart(node, rec) {
  if (echartsState === 'idle') startECharts();
  if (echartsState !== 'ready') {
    msg(node, echartsState === 'failed' ? 'Charts couldn’t load. Check your connection, then reload the page.' : 'Loading chart…');
    return;
  }
  const opt = rec.render(theme());
  rec.dirty = false;
  if (!opt) {
    if (rec.inst) { rec.inst.dispose(); rec.inst = null; }
    msg(node, 'No data for this selection.');
    return;
  }
  if (!rec.inst) {
    node.innerHTML = '';
    rec.inst = window.echarts.init(node, null, { renderer: 'svg' });
    if (ro) ro.observe(node);
    if (rec.onInit) rec.onInit(rec.inst);
    rec.reset = true;
  }
  rec.inst.setOption(labelPlan(declutterAll(xplanApp(wmark(opt), rec.inst)), rec.inst), rec.merge && !rec.reset ? { notMerge: false } : true);
  rec.reset = false;
}
function disposeIn(root) {
  for (const [node, rec] of charts) {
    if (root.contains(node)) {
      if (rec.inst) rec.inst.dispose();
      if (io) io.unobserve(node);
      if (ro) ro.unobserve(node);
      charts.delete(node);
    }
  }
}
function pv(p) {
  if (typeof p.value === 'number') return p.value;
  if (Array.isArray(p.value) && typeof p.value[1] === 'number') return p.value[1];
  if (p.data && typeof p.data === 'object' && typeof p.data.value === 'number') return p.data.value;
  return null;
}
function tipRows(params, fmtFn, sort) {
  let list = (Array.isArray(params) ? params : [params]).map(p => ({ p, v: pv(p) })).filter(r => r.v != null);
  if (sort) list = list.sort((a, b) => b.v - a.v);
  return list.map(({ p, v }) => '<div class="r"><span><i style="background:' + esc(typeof p.color === 'string' ? p.color : '#888') + '"></i>' +
    esc(p.seriesName) + '</span><b>' + esc(fmtFn(p, v)) + '</b></div>').join('');
}
const keyOf = p => String(p.seriesId || '').split('|')[0];
function baseOption(TH, years, series, key, o) {
  o = o || {};
  return {
    aria: { enabled: true }, animation: !RM, animationDuration: 450, animationDurationUpdate: 300,
    textStyle: { fontFamily: FONT },
    color: TH.pal,
    grid: { left: 4, right: 14, top: o.legend ? 36 : 14, bottom: 4, containLabel: true },
    legend: o.legend ? { type: 'scroll', top: 0, left: 0, right: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 4, itemGap: 14,
      textStyle: { color: TH.ink2, fontSize: 12, fontFamily: FONT }, pageIconColor: TH.ink2, pageIconInactiveColor: TH.line, pageTextStyle: { color: TH.muted } } : { show: false },
    tooltip: {
      trigger: 'axis', confine: true, backgroundColor: TH.paper, borderColor: TH.line, borderWidth: 1, padding: [8, 10],
      extraCssText: 'box-shadow:0 8px 22px rgba(0,0,0,.16);border-radius:8px;', textStyle: { color: TH.ink, fontSize: 12.5, fontFamily: FONT },
      axisPointer: { type: o.bar ? 'shadow' : 'line', lineStyle: { color: TH.muted, width: 1 }, shadowStyle: { color: TH.dark ? 'rgba(255,255,255,.06)' : 'rgba(14,28,43,.06)' } },
      formatter: params => {
        const arr = Array.isArray(params) ? params : [params];
        if (!arr.length) return '';
        const rows = tipRows(arr, (p, v) => fmt(keyOf(p) || key, v), o.sortTip);
        return rows ? '<div class="tt"><div class="y">' + esc(arr[0].axisValueLabel || arr[0].name) + '</div>' + rows + '</div>' : '';
      }
    },
    xAxis: { type: 'category', data: years.map(String), boundaryGap: !!o.bar, axisLine: { lineStyle: { color: TH.line } }, axisTick: { show: false },
      axisLabel: { color: TH.muted, fontSize: 11, hideOverlap: true, fontFamily: FONT } },
    yAxis: { type: 'value', scale: !o.zero, splitNumber: 4, axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: TH.muted, fontSize: 11, formatter: axisFmt(key), fontFamily: FONT }, splitLine: { lineStyle: { color: TH.grid } } },
    series
  };
}
function lineSeries(id, name, data, color, extra) {
  const ok = i => data[i] != null && data[i] !== '-';
  const nn = data.filter((v, i) => ok(i)).length;
  const lone = new Set();
  data.forEach((v, i) => { if (ok(i) && !ok(i - 1) && !ok(i + 1)) lone.add(i); });
  const base = {
    id, name, type: 'line', data: data.map(v => (v == null ? '-' : v)), symbol: 'circle',
    connectNulls: false, lineStyle: { width: 2.2, color }, itemStyle: { color }, emphasis: { disabled: true }
  };
  if (nn < 4) Object.assign(base, { showSymbol: true, symbolSize: 5 });
  else if (lone.size) Object.assign(base, { showSymbol: true, showAllSymbol: true, symbolSize: (v, p) => (lone.has(p.dataIndex) ? 6 : 0) });
  else base.showSymbol = false;
  return Object.assign(base, extra || {});
}

/* ================= picker ================= */
const PK = { root: $('#picker'), list: $('#picker-list'), q: $('#picker-q'), title: $('#picker-title'), cb: null, exclude: null, prev: null };
const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
function openPicker(title, cb, exclude, mode) {
  PK.cb = cb; PK.exclude = exclude || null; PK.prev = document.activeElement; PK.mode = mode || 'econ';
  PK.title.textContent = title; PK.q.value = '';
  PK.q.placeholder = PK.mode === 'all' ? 'Search economies, indicators and pages' : 'Search by name, for example Bangladesh';
  renderPicker('');
  PK.root.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  setTimeout(() => PK.q.focus(), 40);
}
function closePicker() {
  PK.root.hidden = true;
  document.documentElement.style.overflow = '';
  if (PK.prev && PK.prev.focus) PK.prev.focus();
}
function renderPicker(q) {
  const nq = norm(q.trim());
  PK.list.innerHTML = '';
  PK.acts = [];
  const add = (kids, act) => { PK.list.append(el('button', { type: 'button', 'data-i': String(PK.acts.length) }, kids)); PK.acts.push(act); };
  if (PK.mode === 'all' && nq) {
    const pages = VIEWS.filter(v => norm(NAVNAME[v]).includes(nq));
    if (pages.length) { PK.list.append(el('h4', { text: 'Pages' })); pages.forEach(v => add([el('span', { text: NAVNAME[v] }), el('span', { class: 'code', text: 'Page' })], { view: v })); }
    const inds = MAP_KEYS.filter(k => norm(IND[k].label + ' ' + IND[k].short + ' ' + IND[k].desc).includes(nq)).slice(0, 8);
    if (inds.length) { PK.list.append(el('h4', { text: 'Indicators' })); inds.forEach(k => add([el('span', { text: IND[k].label }), el('span', { class: 'code', text: 'Map' })], { ind: k })); }
  }
  const popular = nq ? [] : [['Popular', ['WLD', 'USA', 'CHN', 'IND', 'JPN', 'DEU', 'GBR', 'BRA', 'BGD'].map(c => ECON[c]).filter(Boolean)]];
  const blocks = popular.concat(REGIONS.map(r => [r, COUNTRIES.filter(e => e.region === r)]), [['Regions and income groups', GROUPS]]);
  for (const [title, items] of blocks) {
    const hits = items.filter(e => (!PK.exclude || !PK.exclude.has(e.code)) && (!nq || norm(e.name).includes(nq) || e.code.toLowerCase() === nq));
    if (!hits.length) continue;
    PK.list.append(el('h4', { text: title }));
    for (const e of hits) add([el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(e) }), el('span', { text: e.name }), el('span', { class: 'code', text: e.group ? '' : e.code })], { code: e.code });
  }
  if (!PK.acts.length) PK.list.append(el('div', { class: 'none', text: 'Nothing matches “' + q.trim() + '”. Try another spelling.' }));
}
function runPick(act) {
  closePicker();
  if (!act) return;
  if (act.view) go(act.view);
  else if (act.ind) openMap(act.ind, null);
  else if (act.code && PK.cb) PK.cb(act.code);
}
PK.q.addEventListener('input', () => renderPicker(PK.q.value));
PK.q.addEventListener('keydown', e => { if (e.key === 'Enter' && PK.acts && PK.acts.length) { e.preventDefault(); runPick(PK.acts[0]); } });
PK.list.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; runPick(PK.acts[Number(b.getAttribute('data-i'))]); });
PK.root.addEventListener('click', e => { if (e.target === PK.root) closePicker(); });
$('#picker-close').addEventListener('click', closePicker);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !PK.root.hidden) closePicker(); });

/* ================= sparkline ================= */
function spark(vals, o) {
  o = o || {};
  const w = o.w || 120, h = o.h || 28, pad = 3;
  const svg = sv('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
  const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if (pts.length < 2) return svg;
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
  if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi === lo) { hi += 1; lo -= 1; }
  const X = i => pad + (i / (vals.length - 1)) * (w - pad * 2);
  const Y = v => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);
  if (o.zero && lo < 0 && hi > 0) svg.append(sv('line', { x1: 0, x2: w, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  svg.append(sv('polyline', { points: pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' '), fill: 'none', stroke: o.color || 'var(--ink-2)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }));
  const lp = pts[pts.length - 1];
  svg.append(sv('circle', { cx: X(lp[0]), cy: Y(lp[1]), r: 2.6, fill: 'var(--signal)' }));
  return svg;
}
const range = (a, b) => { const r = []; for (let y = a; y <= b; y++) r.push(y); return r; };

/* ================= hero pulse ================= */
const EVENTS = [
  { y: 1975, label: 'Oil shock', wide: true },
  { y: 1982, label: 'Early-1980s recession', wide: true },
  { y: 2009, label: 'Global financial crisis', short: 'Financial crisis' },
  { y: 2020, label: 'Pandemic' }
];
let pulseDrawn = false;
function drawPulse() {
  const host = $('#pulse-svg');
  const s = S.gdp_growth.WLD;
  if (!host || !s) return;
  const pts = s.v.map((v, i) => ({ y: s.y0 + i, v })).filter(p => p.v != null);
  const W = Math.max(300, Math.round(host.clientWidth || 900));
  const narrow = W < 600;
  const H = narrow ? 210 : 270;
  const m = { l: 30, r: narrow ? 44 : 62, t: 14, b: 26 };
  const vmin = Math.min(-4, Math.floor(Math.min(...pts.map(p => p.v)) / 2) * 2);
  const vmax = Math.max(8, Math.ceil(Math.max(...pts.map(p => p.v)) / 2) * 2);
  const y0 = pts[0].y, y1 = pts[pts.length - 1].y;
  const X = y => m.l + ((y - y0) / (y1 - y0)) * (W - m.l - m.r);
  const Y = v => m.t + ((vmax - v) / (vmax - vmin)) * (H - m.t - m.b);
  const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'World real GDP growth from ' + y0 + ' to ' + y1 });
  const defs = sv('defs');
  const cid = 'pc' + Math.random().toString(36).slice(2, 7);
  const cpA = sv('clipPath', { id: cid + 'a' }); cpA.append(sv('rect', { x: 0, y: 0, width: W, height: Y(0) }));
  const cpB = sv('clipPath', { id: cid + 'b' }); cpB.append(sv('rect', { x: 0, y: Y(0), width: W, height: H - Y(0) }));
  defs.append(cpA, cpB); svg.append(defs);
  // graph paper
  for (let y = y0; y <= y1; y++) {
    const dec = y % 10 === 0;
    svg.append(sv('line', { x1: X(y), x2: X(y), y1: m.t, y2: H - m.b, stroke: dec ? 'var(--line)' : 'var(--grid)', 'stroke-width': 1 }));
    if (dec) { const t = sv('text', { x: X(y), y: H - 8, 'text-anchor': 'middle', class: 'ax' }); t.textContent = y; svg.append(t); }
  }
  for (let v = vmin; v <= vmax; v += 2) {
    svg.append(sv('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? 'var(--ink)' : 'var(--grid)', 'stroke-width': v === 0 ? 1.2 : 1 }));
    if (v % 4 === 0) { const t = sv('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end', class: 'ax' }); t.textContent = v === 0 ? '0' : (v < 0 ? MINUS + Math.abs(v) : v) + '%'; svg.append(t); }
  }
  const line = pts.map((p, i) => (i ? 'L' : 'M') + X(p.y).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
  const area = line + 'L' + X(y1).toFixed(1) + ' ' + Y(0).toFixed(1) + 'L' + X(y0).toFixed(1) + ' ' + Y(0).toFixed(1) + 'Z';
  svg.append(sv('path', { d: area, fill: 'var(--pos-soft)', 'clip-path': 'url(#' + cid + 'a)' }));
  svg.append(sv('path', { d: area, fill: 'var(--neg-soft)', 'clip-path': 'url(#' + cid + 'b)' }));
  const gl = sv('g', { class: 'pulse-line-g' });
  const pa = sv('path', { d: line, fill: 'none', stroke: 'var(--ink)', 'stroke-width': narrow ? 2.2 : 2.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'pulse-line', 'clip-path': 'url(#' + cid + 'a)' });
  const pb = sv('path', { d: line, fill: 'none', stroke: 'var(--neg)', 'stroke-width': narrow ? 2.2 : 2.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'pulse-line', 'clip-path': 'url(#' + cid + 'b)' });
  gl.append(pa, pb); svg.append(gl);
  // annotations, with simple collision handling so labels never overlap
  const labs = [];
  for (const ev of EVENTS) {
    if (narrow && ev.wide) continue;
    const p = pts.find(q => q.y === ev.y);
    if (!p) continue;
    const label = (narrow && ev.short) ? ev.short : ev.label;
    const sub = p.y + ': ' + num(p.v, 1) + '%';
    labs.push({ px: X(p.y), py: Y(p.v), label, sub, w: Math.max(label.length * 6.4, sub.length * 5.7), anchor: 'middle' });
  }
  const spanOf = l => (l.anchor === 'middle' ? [l.px - l.w / 2, l.px + l.w / 2] : l.anchor === 'end' ? [l.px - l.w, l.px] : [l.px, l.px + l.w]);
  const fits = l => { const sp = spanOf(l); return sp[0] >= 0 && sp[1] <= W + 2; };
  for (const l of labs) { if (!fits(l)) { l.anchor = l.px > W / 2 ? 'end' : 'start'; } }
  const clash = (a, b) => { const x = spanOf(a), y = spanOf(b); return x[0] < y[1] + 8 && x[1] > y[0] - 8; };
  for (let i = 1; i < labs.length; i++) {
    const a = labs[i - 1], b = labs[i];
    if (a.drop || !clash(a, b)) continue;
    const pa0 = a.anchor, pb0 = b.anchor;
    a.anchor = 'end'; b.anchor = 'start';
    if (!fits(a)) a.anchor = pa0;
    if (!fits(b)) b.anchor = pb0;
    if (clash(a, b)) { a.anchor = pa0; b.anchor = pb0; a.drop = true; }
  }
  for (const l of labs) {
    if (l.drop) continue;
    const ty = Math.min(H - m.b - 20, l.py + (narrow ? 26 : 30));
    svg.append(sv('line', { x1: l.px, x2: l.px, y1: l.py + 5, y2: ty - 13, stroke: 'var(--muted)', 'stroke-width': 1 }));
    const dx = l.anchor === 'end' ? 3 : l.anchor === 'start' ? -3 : 0;
    const t = sv('text', { x: l.px + dx, y: ty, 'text-anchor': l.anchor, class: 'ann' }); t.textContent = l.label;
    const t2 = sv('text', { x: l.px + dx, y: ty + 14, 'text-anchor': l.anchor, class: 'ann-y' }); t2.textContent = l.sub;
    svg.append(t, t2);
  }
  // latest point
  const lp = pts[pts.length - 1];
  const lg = sv('g', { class: 'pulse-late' });
  lg.style.transformOrigin = X(lp.y) + 'px ' + Y(lp.v) + 'px';
  lg.append(sv('circle', { cx: X(lp.y), cy: Y(lp.v), r: 9, fill: 'var(--signal)', opacity: 0.25 }));
  lg.append(sv('circle', { cx: X(lp.y), cy: Y(lp.v), r: 4.6, fill: 'var(--signal)', stroke: 'var(--paper)', 'stroke-width': 2 }));
  const lt = sv('text', { x: X(lp.y) + 10, y: Y(lp.v) - 10, class: 'ann' }); lt.textContent = num(lp.v, 1) + '%';
  const lt2 = sv('text', { x: X(lp.y) + 10, y: Y(lp.v) + 4, class: 'ann-y' }); lt2.textContent = String(lp.y);
  lg.append(lt, lt2); svg.append(lg);
  // hover
  const guide = sv('line', { x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 });
  const dot = sv('circle', { r: 4, fill: 'var(--ink)', stroke: 'var(--paper)', 'stroke-width': 2, opacity: 0 });
  const hit = sv('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent' });
  svg.append(guide, dot, hit);
  const tip = $('#pulse-tip');
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * W;
    let yr = Math.round(y0 + ((sx - m.l) / (W - m.l - m.r)) * (y1 - y0));
    yr = Math.max(y0, Math.min(y1, yr));
    const p = pts.find(q => q.y === yr);
    if (!p) return;
    guide.setAttribute('x1', X(yr)); guide.setAttribute('x2', X(yr)); guide.setAttribute('opacity', 1);
    dot.setAttribute('cx', X(yr)); dot.setAttribute('cy', Y(p.v)); dot.setAttribute('opacity', 1);
    tip.textContent = yr + ': ' + num(p.v, 1) + '%';
    tip.style.left = (X(yr) / W) * r.width + 'px';
    tip.style.top = (Y(p.v) / H) * r.height + 'px';
    tip.style.opacity = 1;
  };
  const hide = () => { guide.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.style.opacity = 0; };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);
  host.innerHTML = '';
  host.append(svg);
  const len = Math.ceil(pa.getTotalLength ? pa.getTotalLength() : 3000);
  pa.style.setProperty('--len', len); pb.style.setProperty('--len', len);
  if (!pulseDrawn) { pulseDrawn = true; if (!RM) { $('#pulse').classList.add('draw'); setTimeout(() => $('#pulse').classList.remove('draw'), 2400); } }
}

/* ================= overview ================= */
const G20 = ['USA', 'CHN', 'DEU', 'JPN', 'IND', 'GBR', 'FRA', 'ITA', 'CAN', 'BRA', 'RUS', 'KOR', 'AUS', 'MEX', 'IDN', 'TUR', 'SAU', 'ARG', 'ZAF'];
const HEAT = [
  ['gdp_usd', 'GDP', 'US$', false], ['gdp_growth', 'Growth', 'real, %', true], ['inflation', 'Inflation', '%', true],
  ['unemployment', 'Unemployment', '%', true], ['current_account', 'Current account', '% of GDP', true],
  ['budget', 'Budget balance', '% of GDP', true], ['gdp_pc', 'GDP per person', 'US$', false]
];
function initOverview() {
  const g = latest('gdp_growth', 'WLD');
  const gp = g ? val('gdp_growth', 'WLD', g.y - 1) : null;
  if (g) {
    $('#hero-title').textContent = 'The world economy ' + (g.v >= 0 ? 'grew ' : 'shrank ') + num(Math.abs(g.v), 1) + '% in ' + g.y + '.';
    const s = S.gdp_growth.WLD;
    const neg = s.v.map((v, i) => ({ y: s.y0 + i, v })).filter(p => p.v != null && p.v < 0).map(p => p.y);
    let lede = 'That is the World Bank’s estimate of real growth' + (gp != null ? ', after ' + num(gp, 1) + '% in ' + (g.y - 1) : '') + '.';
    if (neg.length) lede += ' Since ' + s.y0 + ', world output has fallen in only ' + (neg.length === 2 ? 'two years, ' + neg[0] + ' and ' + neg[1] : neg.length + ' years') + '.';
    $('#hero-lede').textContent = lede;
    $('#pulse-cap').textContent = 'World real GDP growth, % a year, ' + s.y0 + '–' + g.y + '. Hover or tap the line to read any year. Source: ' + WB + '.';
  }
  const vit = $('#vitals'); vit.innerHTML = '';
  for (const [k, label] of [['gdp_usd', 'World GDP'], ['inflation', 'Inflation'], ['unemployment', 'Unemployment'], ['population', 'Population']]) {
    const l = latest(k, 'WLD');
    vit.append(el('div', null, el('dt', { text: label }), el('dd', null, l ? fmt(k, l.v) : '–', el('small', { text: l ? String(l.y) + (k === 'inflation' ? ', consumer prices' : k === 'unemployment' ? ', of labour force' : '') : '' }))));
  }
  drawPulse();
  if (window.ResizeObserver) { let lastW = 0; new ResizeObserver(debounce(() => { const w = $('#pulse-svg').clientWidth; if (Math.abs(w - lastW) > 4) { lastW = w; drawPulse(); } }, 120)).observe($('#pulse-svg')); }
  // markets
  renderTiles($('#ov-markets'), ['brent', 'wti', 'gas', 'gold', 'us10y', 'uscpi'], k => { mkSel = k; go('markets'); });
  const bd = MKD.brent.last;
  $('#mk-note').textContent = 'Oil and gas prices to ' + fmtDay(bd.d) + '. Gold, US bond yields and US inflation are monthly.';
  // heat table
  const ys = $('#ht-year');
  for (let y = LAST; y >= 2000; y--) ys.append(el('option', { value: y, text: y }));
  ys.addEventListener('change', renderHeat);
  renderHeat();
  renderLeaders();
  renderRegions();
}
function heatCell(k, code, Y, colored, exact) {
  let v = val(k, code, Y), yr = Y;
  if (v == null && !exact) { const l = latest(k, code, Y); if (l && l.y >= Y - 2) { v = l.v; yr = l.y; } }
  const td = el('td', { class: 'c' });
  if (v == null) { td.append(el('span', { class: 'cell dash', text: '–' })); return td; }
  const span = el('span', { class: 'cell', text: fmt(k, v) });
  if (yr !== Y) span.append(el('sup', { text: yy(yr) }));
  const c = colored ? colorOf(k, v) : null;
  if (c) { span.style.background = c; span.style.color = textOn(c); }
  td.append(span);
  return td;
}
function econRow(code, cells, cls) {
  const e = ECON[code];
  const tr = el('tr', { 'data-country': code, tabindex: '0', class: cls || null });
  tr.append(el('td', null, el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(e) + ' ' }), e.name));
  cells.forEach(c => tr.append(c));
  return tr;
}
function renderHeat() {
  const Y = Number($('#ht-year').value);
  const tbl = $('#heat'); tbl.innerHTML = '';
  const hr = el('tr', null, el('th', { scope: 'col', text: 'Economy' }));
  for (const [, name, unit] of HEAT) hr.append(el('th', { scope: 'col' }, name, el('br'), el('span', { class: 'num-muted', text: unit })));
  tbl.append(el('thead', null, hr));
  const tb = el('tbody');
  const size = c => { const l = latest('gdp_usd', c, Y); return l ? l.v : 0; };
  const rows = G20.slice().sort((a, b) => size(b) - size(a));
  tb.append(econRow('WLD', HEAT.map(([k, , , col]) => heatCell(k, 'WLD', Y, col)), 'ref'));
  for (const c of rows) tb.append(econRow(c, HEAT.map(([k, , , col]) => heatCell(k, c, Y, col))));
  tb.append(econRow('EMU', HEAT.map(([k, , , col]) => heatCell(k, 'EMU', Y, col)), 'ref'));
  tbl.append(tb);
}
function bigEnough(code, y) { const p = popAt(code, y); return p != null && p >= 1; }
function renderLeaders() {
  const Y = LAST;
  $('#lead-title').textContent = 'Leaders and laggards, ' + Y;
  $('#lead-note').textContent = 'Among economies with at least 1 million people. Tap a name to open it.';
  const box = $('#leaders'); box.innerHTML = '';
  const lists = [['Fastest growth', 'gdp_growth', -1], ['Slowest growth', 'gdp_growth', 1], ['Highest inflation', 'inflation', -1], ['Lowest inflation', 'inflation', 1]];
  for (const [title, k, dir] of lists) {
    const rows = COUNTRIES.filter(e => bigEnough(e.code, Y)).map(e => ({ e, v: val(k, e.code, Y) })).filter(r => r.v != null)
      .sort((a, b) => dir * (a.v - b.v)).slice(0, 5);
    const ol = el('ol');
    for (const r of rows) ol.append(el('li', null, el('button', { type: 'button', 'data-country': r.e.code }, el('span', { class: 'nm' }, el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(r.e) + ' ' }), r.e.name), el('span', { class: 'v', text: fmt(k, r.v) }))));
    box.append(el('section', null, el('h3', { text: title }), ol));
  }
}
function renderRegions() {
  const Y = LAST;
  const tbl = $('#regions'); tbl.innerHTML = '';
  tbl.append(el('thead', null, el('tr', null, el('th', { text: 'Region' }), el('th', { text: 'Growth, ' + Y }), el('th', { text: 'Inflation, ' + Y }), el('th', { text: 'Unemployment, ' + Y }), el('th', { text: 'GDP, ' + Y }), el('th', { text: 'Growth since 2000' }))));
  const tb = el('tbody');
  for (const c of ['WLD', 'EAS', 'ECS', 'LCN', 'MEA', 'NAC', 'SAS', 'SSF']) {
    if (!ECON[c]) continue;
    const td = el('td', { class: 'c' });
    const sp = spark(range(2000, Y).map(y => val('gdp_growth', c, y)), { w: 140, h: 28, zero: true, color: 'var(--pos)' });
    sp.setAttribute('width', 140); sp.setAttribute('height', 28);
    td.append(sp);
    tb.append(econRow(c, [heatCell('gdp_growth', c, Y, true), heatCell('inflation', c, Y, true), heatCell('unemployment', c, Y, true), heatCell('gdp_usd', c, Y, false), td], c === 'WLD' ? 'ref' : null));
  }
  tbl.append(tb);
}

/* ================= markets ================= */
const MK = {
  brent: { name: 'Brent crude oil', unit: 'US$ per barrel', pre: '$', dec: 2, kind: 'price', src: 'U.S. Energy Information Administration (EIA), Europe Brent spot price', desc: 'The main global oil benchmark, priced in the North Sea. Daily spot price; longer views use monthly averages.' },
  wti: { name: 'WTI crude oil', unit: 'US$ per barrel', pre: '$', dec: 2, kind: 'price', src: 'U.S. EIA, Cushing, Oklahoma WTI spot price', desc: 'The main US oil benchmark. Daily spot price; longer views use monthly averages.' },
  gas: { name: 'US natural gas', unit: 'US$ per million Btu', pre: '$', dec: 2, kind: 'price', src: 'U.S. EIA, Henry Hub natural gas spot price', desc: 'Henry Hub spot price, the main US gas benchmark. Daily; longer views use monthly averages.' },
  gold: { name: 'Gold', unit: 'US$ per troy ounce', pre: '$', dec: 0, kind: 'price', src: 'World Bank Commodity Price Data (the Pink Sheet)', desc: 'Monthly average price. Gold is often bought as a safe haven in uncertain times.' },
  us10y: { name: 'US 10-year yield', unit: '% a year', suf: '%', dec: 2, kind: 'rate', src: 'Federal Reserve, H.15 Selected Interest Rates', desc: 'Monthly average yield on 10-year US government bonds, a benchmark for borrowing costs around the world.' },
  uscpi: { name: 'US inflation', unit: 'consumer prices, % on a year earlier', suf: '%', dec: 1, kind: 'rate', src: 'U.S. Bureau of Labor Statistics, Consumer Price Index for All Urban Consumers (CPI-U)', desc: 'How fast prices are rising in the world’s largest economy, measured monthly.' },
  fx: { name: 'US dollar', unit: 'currency units per US$', dec: 4, kind: 'fx', src: 'Federal Reserve, H.10 Foreign Exchange Rates, via FRED', desc: 'Monthly average. A higher number means the dollar buys more of that currency.' }
};
const CUR = { EUR: 'Euro', JPY: 'Japanese yen', GBP: 'British pound', CNY: 'Chinese yuan', INR: 'Indian rupee', CAD: 'Canadian dollar', AUD: 'Australian dollar', CHF: 'Swiss franc', BRL: 'Brazilian real', MXN: 'Mexican peso', KRW: 'South Korean won', ZAR: 'South African rand', SGD: 'Singapore dollar', HKD: 'Hong Kong dollar', SEK: 'Swedish krona', NOK: 'Norwegian krone', DKK: 'Danish krone', NZD: 'New Zealand dollar', THB: 'Thai baht', MYR: 'Malaysian ringgit', TWD: 'New Taiwan dollar', LKR: 'Sri Lankan rupee' };
function monthlyPts(m) {
  const [start, str] = m; let y = +start.slice(0, 4), mo = +start.slice(5, 7);
  const out = [];
  for (const x of str.split(',')) {
    if (x !== '') out.push([y + '-' + String(mo).padStart(2, '0') + '-15', Number(x)]);
    mo++; if (mo === 13) { mo = 1; y++; }
  }
  return out;
}
function mkData(m, d) {
  const M = monthlyPts(m), D = d || null;
  const last = D && D.length ? { d: D[D.length - 1][0], v: D[D.length - 1][1], daily: true } : { d: M[M.length - 1][0], v: M[M.length - 1][1], daily: false };
  const findBack = (days) => {
    const t = new Date(last.d + 'T00:00:00Z').getTime() - days * 864e5;
    if (D && D.length && new Date(D[0][0] + 'T00:00:00Z').getTime() <= t) { for (let i = D.length - 1; i >= 0; i--) if (new Date(D[i][0] + 'T00:00:00Z').getTime() <= t) return D[i][1]; }
    for (let i = M.length - 1; i >= 0; i--) if (new Date(M[i][0] + 'T00:00:00Z').getTime() <= t + 15 * 864e5) return M[i][1];
    return null;
  };
  const byMonth = new Map(M.map(p => [p[0].slice(0, 7), p[1]]));
  const monthsBack = n => { const y = +last.d.slice(0, 4), mo = +last.d.slice(5, 7) - 1 - n; const d = new Date(Date.UTC(y, mo, 1)); const k = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); return byMonth.has(k) ? byMonth.get(k) : null; };
  const back = last.daily ? { m1: findBack(30), y1: findBack(365) } : { m1: monthsBack(1), y1: monthsBack(12) };
  return { M, D, last, back, monthsBack };
}
const MKD = {};
for (const k of ['brent', 'wti', 'gas', 'gold', 'us10y', 'uscpi']) MKD[k] = mkData(RAW.mk[k].m, RAW.mk[k].d);
const FXD = {};
for (const c in RAW.mk.fx) FXD[c] = mkData(RAW.mk.fx[c]);
function mkFmt(k, v) {
  const m = MK[k];
  if (m.kind === 'fx') return num(v, 2);
  return (m.pre || '') + num(v, m.dec) + (m.suf || '');
}
function mkChange(k, cur, old) {
  if (cur == null || old == null) return null;
  const m = MK[k];
  if (m.kind === 'rate') { const d = cur - old; return (d >= 0 ? '▲ ' : '▼ ') + num(Math.abs(d), 2) + ' pts'; }
  const p = (cur / old - 1) * 100;
  return (p >= 0 ? '▲ ' : '▼ ') + num(Math.abs(p), 1) + '%';
}
let mkSel = 'brent', mkRange = '5', fxCur = 'EUR';
function tileData(k) { return k === 'fx' ? FXD[fxCur] : MKD[k]; }
function renderTiles(box, keys, onPick, selected) {
  box.innerHTML = '';
  for (const k of keys) {
    const D = tileData(k), m = MK[k];
    const when = D.last.daily ? fmtDay(D.last.d) : fmtMonth(D.last.d);
    const chg = mkChange(k, D.last.v, D.back.y1);
    const sp = spark(D.M.slice(-36).map(p => p[1]), { w: 160, h: 30, color: 'var(--ink-2)' });
    const b = el('button', { type: 'button', class: 'mtile', 'aria-pressed': selected === k ? 'true' : 'false' },
      el('span', { class: 'mt-name', text: k === 'fx' ? 'US dollar vs ' + fxCur : m.name }),
      el('span', { class: 'mt-val', text: mkFmt(k, D.last.v) }),
      el('span', { class: 'mt-sub', text: (k === 'fx' ? CUR[fxCur] + ' per US$' : m.unit) + ', ' + when }),
      chg ? el('span', { class: 'mt-chg', text: chg + ' in a year' }) : null, sp);
    b.addEventListener('click', () => onPick(k));
    box.append(b);
  }
}
function initMarkets() {
  const cs = $('#mk-cur');
  for (const c in FXD) cs.append(el('option', { value: c, text: CUR[c] + ' (' + c + ')' }));
  cs.value = fxCur;
  cs.addEventListener('change', () => { fxCur = cs.value; renderMarkets(); });
  $('#mk-range').addEventListener('click', e => { const b = e.target.closest('button[data-r]'); if (!b) return; mkRange = b.getAttribute('data-r'); renderMarkets(); });
  $('#mk-dl').addEventListener('click', () => {
    const D = tileData(mkSel);
    const label = mkSel === 'fx' ? 'USD_' + fxCur : mkSel;
    const rows = [['Date', mkSel === 'fx' ? fxCur + ' per USD' : MK[mkSel].name + ' (' + MK[mkSel].unit + ')']].concat(D.M.map(p => [p[0].slice(0, 7), p[1]]));
    saveCSV('macro-monitor-' + label + '-monthly.csv', rows);
  });
  renderFxTable();
  initMarketsExt();
}
function renderMarkets() {
  renderTiles($('#mk-tiles'), ['brent', 'wti', 'gas', 'gold', 'us10y', 'uscpi', 'fx'], k => { mkSel = k; renderMarkets(); $('#mk-panel').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); }, mkSel);
  const m = MK[mkSel], D = tileData(mkSel);
  $('#mk-title').textContent = mkSel === 'fx' ? 'US dollar in ' + CUR[fxCur] + ' (' + fxCur + ')' : m.name;
  $('#mk-desc').textContent = m.desc;
  $('#mk-cur-wrap').hidden = mkSel !== 'fx';
  $('#mk-src').textContent = 'Source: ' + shortSrc(m.src) + '.';
  $$('#mk-range button').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-r') === mkRange ? 'true' : 'false'));
  chartOn($('#mk-chart'), TH => mkOption(TH));
}
function mkOption(TH) {
  const D = tileData(mkSel), m = MK[mkSel];
  let pts, daily = false;
  if (mkRange === '1' && D.D) {
    const t = new Date(D.last.d + 'T00:00:00Z').getTime() - 365 * 864e5;
    pts = D.D.filter(p => new Date(p[0] + 'T00:00:00Z').getTime() >= t); daily = true;
  } else {
    const n = mkRange === '1' ? 13 : mkRange === '5' ? 61 : mkRange === '20' ? 241 : D.M.length;
    pts = D.M.slice(-n);
  }
  if (!pts.length) return null;
  const color = TH.pos;
  return {
    aria: { enabled: true }, animation: !RM, animationDuration: 400, textStyle: { fontFamily: FONT },
    grid: { left: 4, right: 14, top: 14, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: TH.paper, borderColor: TH.line, borderWidth: 1, padding: [8, 10],
      extraCssText: 'box-shadow:0 8px 22px rgba(0,0,0,.16);border-radius:8px;', textStyle: { color: TH.ink, fontSize: 12.5, fontFamily: FONT },
      axisPointer: { type: 'line', lineStyle: { color: TH.muted, width: 1 } },
      formatter: params => {
        const p = (Array.isArray(params) ? params : [params])[0];
        if (!p || !Array.isArray(p.value)) return '';
        const d = String(p.value[0]);
        return '<div class="tt"><div class="y">' + esc(daily ? fmtDay(d) : fmtMonth(d)) + '</div><div class="r"><span>' + esc(mkSel === 'fx' ? fxCur + ' per US$' : m.name) + '</span><b>' + esc(mkFmt(mkSel, p.value[1])) + '</b></div></div>';
      } },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: TH.line } }, axisTick: { show: false }, axisLabel: { color: TH.muted, fontSize: 11, hideOverlap: true, fontFamily: FONT }, splitLine: { show: false } },
    yAxis: { type: 'value', scale: true, splitNumber: 4, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: TH.grid } },
      axisLabel: { color: TH.muted, fontSize: 11, fontFamily: FONT, formatter: v => (m.pre || '') + compact(v) + (m.suf || '') } },
    series: [{ id: 'mk', name: m.name, type: 'line', data: pts, showSymbol: false, lineStyle: { width: 2, color }, itemStyle: { color }, areaStyle: { color, opacity: 0.08 }, emphasis: { disabled: true } }]
  };
}
function renderFxTable() {
  const tbl = $('#fx-table'); tbl.innerHTML = '';
  tbl.append(el('thead', null, el('tr', null, el('th', { text: 'Currency' }), el('th', { text: 'Per US$' }), el('th', { text: '1 month' }), el('th', { text: '1 year' }), el('th', { text: '5 years' }), el('th', { text: 'Last 3 years' }))));
  const tb = el('tbody');
  const chg = (D, n) => { const old = D.monthsBack(n), cur = D.last.v; return old == null || !cur ? null : (old / cur - 1) * 100; };
  const cell = v => { const td = el('td'); if (v == null) { td.textContent = '–'; return td; } td.textContent = (v >= 0 ? '+' : MINUS) + num(Math.abs(v), 1) + '%'; td.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)'; td.style.fontWeight = '600'; return td; };
  for (const c in FXD) {
    const D = FXD[c];
    const tr = el('tr', { tabindex: '0', 'data-fx': c });
    tr.append(el('td', null, CUR[c] + ' ', el('span', { class: 'num-muted', text: c })), el('td', { text: sig(D.last.v) }), cell(chg(D, 1)), cell(chg(D, 12)), cell(chg(D, 60)));
    const td = el('td', { class: 'c' }); const sp = spark(D.M.slice(-36).map(p => p[1]), { w: 120, h: 26 }); sp.setAttribute('width', 120); sp.setAttribute('height', 26); td.append(sp);
    tr.append(td);
    tb.append(tr);
  }
  tbl.append(tb);
  tbl.addEventListener('click', e => { const tr = e.target.closest('tr[data-fx]'); if (!tr) return; fxCur = tr.getAttribute('data-fx'); mkSel = 'fx'; $('#mk-cur').value = fxCur; renderMarkets(); $('#mk-panel').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); });
  tbl.addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-fx]'); if (tr) tr.click(); } });
}

/* ================= country profile ================= */
let curCountry = null;
let cRange = String(store.get('mm.range', '25'));
let pins = store.get('mm.pins', []);
if (!Array.isArray(pins)) pins = [];
const POPULAR = ['WLD', 'USA', 'CHN', 'IND', 'JPN', 'DEU', 'GBR', 'BRA', 'BGD', 'NGA'];
function initCountries() {
  $('#c-switch').addEventListener('click', () => openPicker('Choose an economy', code => showCountry(code)));
  $('#c-pin').addEventListener('click', () => {
    const i = pins.indexOf(curCountry);
    if (i >= 0) pins.splice(i, 1); else pins.unshift(curCountry);
    pins = pins.slice(0, 12); store.set('mm.pins', pins);
    syncPin(); renderQuick();
  });
  $('#c-compare').addEventListener('click', () => {
    if (!cmp.codes.includes(curCountry)) { cmp.codes.unshift(curCountry); cmp.codes = cmp.codes.slice(0, 8); store.set('mm.cmp', cmp.codes); }
    go('compare');
  });
  const applyCR = v => { cRange = String(v); store.set('mm.range', cRange); syncRange(); resetCardRanges();
    for (const [node, rec] of charts) if ($('#c-sections').contains(node)) { rec.dirty = true; if (rec.visible) applyChart(node, rec); } };
  const crSecs = () => { const i = $('#c-range-s'); const v = i ? Math.round(+i.value) : 6; return (v >= 2 && v <= 120 ? v : 6) * 1000; };
  let crT = null; const CR_SEQ = ['5', '10', '15', '20', '25', 'all'];
  const crAuto = on => { if (crT) { clearInterval(crT); crT = null; } const ab = $('#c-range-auto'); if (ab) { ab.setAttribute('aria-pressed', on ? 'true' : 'false'); ab.textContent = on ? '■ Stop' : '▶ Auto'; }
    if (on) crT = setInterval(() => { const cs = $('#c-sections'); if (!cs || !cs.offsetParent) { crAuto(false); return; } if (document.hidden) return; applyCR(CR_SEQ[(CR_SEQ.indexOf(String(cRange)) + 1) % CR_SEQ.length]); }, crSecs()); };
  $('#c-range').addEventListener('click', e => {
    const b = e.target.closest('button[data-r]'); if (!b) return;
    crAuto(false); applyCR(b.getAttribute('data-r'));
  });
  const crn = $('#c-range-n');
  if (crn) crn.addEventListener('change', () => { const n = Math.round(+crn.value); if (n >= 1 && n <= 80) { crAuto(false); applyCR(n); } });
  const cra = $('#c-range-auto');
  if (cra) cra.addEventListener('click', () => crAuto(!crT));
  const crs = $('#c-range-s'); if (crs) crs.addEventListener('change', () => { if (crT) crAuto(true); });
  const crb = $('#c-range-blink');
  if (crb) { const sync = () => crb.setAttribute('aria-pressed', document.documentElement.classList.contains('no-blink') ? 'false' : 'true'); sync();
    crb.addEventListener('click', () => { const tg = $('#blink-tg'); if (tg) tg.click(); else { document.documentElement.classList.toggle('no-blink'); try { localStorage.setItem('mm.blink', JSON.stringify(!document.documentElement.classList.contains('no-blink'))); } catch (e) { /* private mode */ } } sync(); }); }
  $('#c-dl').addEventListener('click', () => downloadCountry(curCountry));
  $('#c-ai-btn').addEventListener('click', runAI);
  $('#c-ai-stop').addEventListener('click', () => { if (aiCtl) aiCtl.abort(); });
  syncRange();
  initCountriesExt();
}
function xplanApp(o, i) { try { return (typeof BDX !== 'undefined' && BDX && BDX.extraPlan) ? BDX.extraPlan(o, i) : o; } catch (e) { return o; } }
function syncRange() { $$('#c-range button').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-r') === String(cRange) ? 'true' : 'false')); const n = $('#c-range-n'); if (n) n.value = ['5', '10', '15', '20', '25', 'all'].includes(String(cRange)) ? '' : String(cRange); }
function syncPin() {
  const on = pins.includes(curCountry);
  const b = $('#c-pin');
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.innerHTML = '';
  b.append(svgStar(on), document.createTextNode(on ? 'Pinned' : 'Pin'));
}
function svgStar(on) {
  const s = sv('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  s.append(sv('path', { d: 'M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z', fill: on ? 'var(--signal)' : 'none', stroke: on ? 'var(--signal)' : 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
  return s;
}
function renderQuick() {
  const box = $('#c-quick'); box.innerHTML = '';
  const list = pins.filter(c => ECON[c]).concat(POPULAR.filter(c => !pins.includes(c) && ECON[c])).filter(c => c !== curCountry).slice(0, 10);
  for (const c of list) {
    const e = ECON[c];
    const b = el('button', { type: 'button', class: 'chip', 'data-country': c }, el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(e) }), e.name);
    if (pins.includes(c)) { const st = svgStar(true); st.setAttribute('width', 12); st.setAttribute('height', 12); b.prepend(st); }
    box.append(b);
  }
}
function summaryText(code) {
  const e = ECON[code];
  const subj = e.group ? (GROUP_SUBJ[code] || e.name) : poss(e.name) + ' economy';
  const g = latest('gdp_growth', code), i = latest('inflation', code), u = latest('unemployment', code), ca = latest('current_account', code);
  const out = [];
  if (g) {
    let s = subj + ' ' + (g.v >= 0 ? 'grew ' : 'shrank ') + num(Math.abs(g.v), 1) + '% in ' + g.y;
    const w = code !== 'WLD' ? val('gdp_growth', 'WLD', g.y) : null;
    if (w != null) s += g.v > w + 0.05 ? ', faster than the world as a whole (' + num(w, 1) + '%)' : g.v < w - 0.05 ? ', slower than the world as a whole (' + num(w, 1) + '%)' : ', in line with the world (' + num(w, 1) + '%)';
    out.push(s + '.');
  }
  if (i) out.push('Consumer prices ' + (i.v >= 0 ? 'rose ' : 'fell ') + num(Math.abs(i.v), 1) + '% in ' + i.y + (u ? ', and ' + num(u.v, 1) + '% of the labour force was out of work' + (u.y !== i.y ? ' in ' + u.y : '') + '.' : '.'));
  else if (u) out.push('Unemployment was ' + num(u.v, 1) + '% in ' + u.y + '.');
  if (ca) out.push('The current account ' + (ca.v >= 0 ? 'had a surplus' : 'ran a deficit') + ' of ' + num(Math.abs(ca.v), 1) + '% of GDP in ' + ca.y + '.');
  return out.join(' ') || 'There is little recent data for this economy.';
}
const KPI = ['gdp_growth', 'inflation', 'unemployment', 'gdp_usd', 'gdp_pc', 'current_account', 'budget', 'population'];
function showCountry(code) {
  if (!ECON[code]) code = 'USA';
  if (!inited.countries) { initCountries(); inited.countries = true; }
  curCountry = code; store.set('mm.country', code);
  try { renderGeo(code); } catch (e) { /* map optional */ }
  const e = ECON[code];
  $('#c-flag').textContent = flag(e);
  $('#c-name').textContent = e.name;
  const pop = latest('population', code);
  $('#c-meta').textContent = (e.group ? 'Group of economies, as defined by the World Bank' : (e.sub || e.region)) + (pop ? '. Population ' + fmt('population', pop.v) + ' (' + pop.y + ').' : '.');
  $('#c-summary').textContent = summaryText(code);
  syncPin(); renderQuick();
  const k = $('#c-kpis'); k.innerHTML = '';
  for (const key of KPI) {
    const l = latest(key, code);
    const card = el('div', { class: 'kpi' }, el('div', { class: 'k', text: IND[key].short }));
    if (!l) { card.append(el('div', { class: 'v dash', text: '–' }), el('div', { class: 's', text: 'No recent data' })); k.append(card); continue; }
    const d = delta(key, l.v, val(key, code, l.y - 1));
    card.append(el('div', { class: 'v', text: fmt(key, l.v) }), el('div', { class: 's', text: l.y + (d ? ', ' + d.txt + (d.txt === 'unchanged' ? ' from ' : ' on ') + (l.y - 1) : '') }));
    const sp = spark(range(l.y - 14, l.y).map(y => val(key, code, y)), { w: 160, h: 28, zero: IND[key].scale === 'div', color: 'var(--ink-2)' });
    card.append(sp);
    k.append(card);
  }
  renderRanks(code);
  renderCountryNotes(code);
  buildSections(code);
  resetAI();
  try { history.replaceState(null, '', '#country-' + code); } catch (err) { /* framed */ }
  document.title = e.name + ' economy | Macroeconomic Monitor and Forecasting';
}
function yearSpan(code, keys) {
  let first = 9999, last = 0;
  for (const k of keys) { const s = S[k] && S[k][code]; if (!s) continue; first = Math.min(first, s.y0); last = Math.max(last, s.y0 + s.v.length - 1); }
  if (!last) return [];
  const rr = arguments[2] || cRange;
  const n = rr === 'all' ? 999 : Number(rr);
  let end = LAST, start = Math.max(first, end - n + 1);
  if (last < start) { end = last; start = Math.max(first, end - n + 1); }
  return range(start, end);
}
function buildSections(code) {
  const host = $('#c-sections'); disposeIn(host); host.innerHTML = '';
  const links = $('#c-seclinks'); links.innerHTML = '';
  for (const [id, title, shortT, specs] of PROFILE) {
    const avail = specs.filter(sp => sp.k.some(k => S[k] && S[k][code]));
    if (!avail.length) continue;
    const sec = el('section', { class: 'csec', id: 'sec-' + id }, el('h2', { text: title }));
    const grid = el('div', { class: 'charts' });
    for (const sp of avail) grid.append(chartCard(code, sp));
    try { if (typeof BDX !== 'undefined' && BDX.countryFill) BDX.countryFill(grid, code, avail); } catch (e) { /* optional */ }
    sec.append(grid); host.append(sec);
    links.append(el('button', { type: 'button', text: shortT, onclick: () => {
      const top = sec.getBoundingClientRect().top + window.scrollY - (($('.topbar').offsetHeight || 60) + ($('.range-bar').offsetHeight || 50) + 8);
      window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
    } }));
  }
}
function latestLine(code, sp) {
  const parts = [];
  sp.k.forEach((k, i) => { const l = latest(k, code); if (l) parts.push((sp.k.length > 1 ? (sp.names ? sp.names[i] : IND[k].short) + ' ' : '') + fmt(k, l.v) + ' in ' + l.y); });
  return parts.length ? 'Latest: ' + parts.join(', ') : '';
}
function chartCard(code, sp) {
  const k0 = sp.k[0];
  const box = el('div', { class: 'chart' });
  const st = { r: null };
  const card = el('article', { class: 'chart-card' },
    el('h3', { text: sp.title }), el('div', { class: 'unit', text: sp.unit || IND[k0].unit }), cardCtl(st, box),
    el('div', { class: 'latest', text: latestLine(code, sp) }), box,
    el('p', { class: 'chart-src', text: 'Source: ' + shortSrc(sp.k.length > 1 ? WB : IND[k0].src) + '.' }));
  chartOn(box, TH => profileOption(code, Object.assign({}, sp, { _r: st.r }), TH));
  cardTools(card, box, { table: () => profileTable(code, sp), title: sp.title + ', ' + ECON[code].name, sub: () => sp.unit || IND[k0].unit,
    file: 'macro-monitor-' + code + '-' + sp.k[0] + '.png', src: sp.k.length > 1 ? WB : IND[k0].src });
  return card;
}
function profileOption(code, sp, TH) {
  const years = yearSpan(code, sp.k, sp._r);
  if (!years.length) return null;
  const series = [];
  sp.k.forEach((k, i) => {
    const data = years.map(y => val(k, code, y));
    if (!data.some(v => v != null)) return;
    const name = sp.names ? sp.names[i] : IND[k].label;
    if (sp.type === 'bar') {
      series.push({ id: k + '|' + i, name, type: 'bar', barMaxWidth: 16, barCategoryGap: '28%', emphasis: { disabled: true },
        data: data.map(v => (v == null ? '-' : { value: v, itemStyle: { color: v >= 0 ? TH.pos : TH.neg, borderRadius: v >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2] } })) });
    } else {
      const color = sp.k.length > 1 ? TH.pal[i] : TH.pos;
      const extra = sp.sparse ? { connectNulls: true, showSymbol: true, showAllSymbol: true, symbolSize: 5 } : sp.type === 'area' ? { areaStyle: { color, opacity: 0.12 } } : null;
      series.push(lineSeries(k + '|' + i, name, data, color, extra));
      if (sp.sparse) Object.assign(series[series.length - 1], extra);
    }
  });
  if (!series.length) return null;
  if (sp.ref != null && series[0]) {
    series[0].markLine = { silent: true, symbol: 'none', lineStyle: { color: TH.signal, type: 'dashed', width: 1.4 },
      label: { formatter: sp.ref + '%', color: TH.muted, fontSize: 11, position: 'insideStartTop' }, data: [{ yAxis: sp.ref }] };
  }
  if (sp.world && code !== 'WLD') {
    const wd = years.map(y => val(sp.k[0], 'WLD', y));
    if (wd.some(v => v != null)) series.push(lineSeries(sp.k[0] + '|w', 'World', wd, TH.muted, { lineStyle: { width: 1.6, type: 'dashed', color: TH.muted }, z: 4 }));
  }
  const opt = baseOption(TH, years, series, sp.k[0], { legend: series.length > 1, bar: sp.type === 'bar', zero: sp.type === 'bar' });
  const lvl = sp.k.every(k => LOGGABLE(k));
  if (cLog && lvl && series.every(se => se.data.every(d => d === '-' || (typeof d === 'number' && d > 0)))) {
    opt.yAxis.type = 'log'; opt.yAxis.logBase = 10; delete opt.yAxis.scale; delete opt.yAxis.splitNumber;
    opt.series.forEach(se => { delete se.areaStyle; });
  }
  return opt;
}
function downloadCountry(code) {
  const e = ECON[code];
  const keys = Object.keys(IND).filter(k => S[k][code]);
  const unitOf = k => IND[k].fmt === 'usdbn' ? 'US$ billions' : IND[k].fmt === 'mn' ? 'millions' : IND[k].unit;
  let y0 = 9999; keys.forEach(k => { y0 = Math.min(y0, S[k][code].y0); });
  const rows = [['Year'].concat(keys.map(k => IND[k].label + ' (' + unitOf(k) + ')'))];
  for (let y = y0; y <= LAST; y++) rows.push([y].concat(keys.map(k => { const v = val(k, code, y); return v == null ? '' : v; })));
  rows.push([]);
  rows.push(['Source: World Bank World Development Indicators (CC BY 4.0), via Macroeconomic Monitor and Forecasting. Economy: ' + e.name + ' (' + code + ')']);
  saveCSV('macro-monitor-' + code + '.csv', rows);
}

/* ================= AI brief (optional) ================= */
let SAMPLE = null, aiCtl = null;
function resetAI() {
  if (aiCtl) { aiCtl.abort(); aiCtl = null; }
  $('#c-ai-out').textContent = '';
  $('#c-ai-note').hidden = true;
  $('#c-ai-stop').hidden = true;
  $('#c-ai-btn').disabled = false;
  $('#c-ai-btn').textContent = 'Explain this economy';
}
function aiPrompt(code) {
  const e = ECON[code];
  const keys = ['gdp_growth', 'gdp_pc', 'inflation', 'unemployment', 'youth_unemp_f', 'youth_unemp_m', 'current_account', 'budget', 'gov_debt', 'fx_change', 'reserves', 'ext_debt', 'debt_service', 'remittances', 'poverty', 'gini', 'population'];
  const lines = [];
  for (const k of keys) {
    const s = S[k][code]; if (!s) continue;
    const pairs = range(LAST - 9, LAST).map(y => { const v = val(k, code, y); return v == null ? null : y + ': ' + fmt(k, v); }).filter(Boolean);
    if (pairs.length) lines.push('- ' + IND[k].label + ' (' + IND[k].unit + '): ' + pairs.join('; '));
  }
  const world = ['gdp_growth', 'inflation', 'unemployment'].map(k => { const l = latest(k, 'WLD'); return l ? IND[k].label + ' ' + fmt(k, l.v) + ' (' + l.y + ')' : null; }).filter(Boolean).join('; ');
  return 'You write for a general audience on an economics website. Using ONLY the World Bank figures below, write a short plain-English brief on the economy of ' + e.name +
    '. Write three short paragraphs and no more than 170 words in total, with no headings and no bullet points. First: the overall picture of growth and living standards. Second: the main strengths and pressure points (prices, jobs, public finances, external position). Third: what to watch next. Cite specific years and numbers from the data. If a figure is missing, do not guess it. Do not give investment advice.\n\nData for ' + e.name + ':\n' + lines.join('\n') + '\n\nWorld for reference: ' + world + '.';
}
async function runAI() {
  if (!SAMPLE || !curCountry) return;
  const out = $('#c-ai-out'), btn = $('#c-ai-btn'), stop = $('#c-ai-stop');
  if (aiCtl) aiCtl.abort();
  const ctl = new AbortController(); aiCtl = ctl;
  const code = curCountry;
  btn.disabled = true; stop.hidden = false; out.textContent = 'Thinking…';
  try {
    const res = await SAMPLE(aiPrompt(code), { signal: ctl.signal, onText: ({ text }) => { if (curCountry === code) out.textContent = text; } });
    if (curCountry === code) { out.textContent = res.text; $('#c-ai-note').hidden = false; }
  } catch (e) {
    const c = e && e.code;
    if (c === 'cancelled') { out.textContent = e.text || ''; }
    else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)) { out.textContent = ''; $('#c-ai').hidden = true; }
    else if (c === 'rate_limited') out.textContent = (e.text ? e.text + '\n\n' : '') + 'Claude has reached its limit for now. Try again later.';
    else if (c === 'session_expired') out.textContent = 'Sign in to Claude again to use this.';
    else if (c === 'refused') out.textContent = '';
    else out.textContent = (e && e.text ? e.text + '\n\n' : '') + 'The explanation stopped before it finished. Press the button to try again.';
  } finally {
    if (aiCtl === ctl) aiCtl = null;
    btn.disabled = false; stop.hidden = true; btn.textContent = 'Explain again';
  }
}

/* ================= compare ================= */
const cmp = { key: String(store.get('mm.cmpKey', 'gdp_growth')), codes: store.get('mm.cmp', ['USA', 'CHN', 'IND', 'DEU', 'JPN']), range: '25' };
if (!Array.isArray(cmp.codes)) cmp.codes = ['USA', 'CHN', 'IND', 'DEU', 'JPN'];
cmp.codes = cmp.codes.filter(c => ECON[c]).slice(0, 8);
if (!IND[cmp.key] || cmp.key === 'fx') cmp.key = 'gdp_growth';
const PRESETS = [
  ['G7', ['USA', 'JPN', 'DEU', 'GBR', 'FRA', 'ITA', 'CAN']], ['BRICS (original)', ['BRA', 'RUS', 'IND', 'CHN', 'ZAF']],
  ['South Asia', ['IND', 'PAK', 'BGD', 'LKA', 'NPL']], ['South-East Asia', ['IDN', 'THA', 'MYS', 'PHL', 'VNM']],
  ['Euro big four', ['DEU', 'FRA', 'ITA', 'ESP']], ['Latin America', ['BRA', 'MEX', 'ARG', 'COL', 'CHL']],
  ['Africa', ['NGA', 'ZAF', 'EGY', 'KEN', 'ETH']], ['Gulf', ['SAU', 'ARE', 'QAT', 'KWT', 'OMN']],
  ['World regions', ['EAS', 'ECS', 'LCN', 'MEA', 'NAC', 'SAS', 'SSF']], ['Income groups', ['HIC', 'UMC', 'LMC', 'LIC']]
];
function fillIndSelect(sel, keys, value) {
  sel.innerHTML = '';
  for (const [cat, list] of CATS) {
    const og = el('optgroup', { label: cat });
    for (const k of list) if (!keys || keys.includes(k)) og.append(el('option', { value: k, text: IND[k].label }));
    if (og.children.length) sel.append(og);
  }
  sel.value = value;
}
function initCompare() {
  const sel = $('#cmp-ind');
  fillIndSelect(sel, null, cmp.key);
  sel.addEventListener('change', () => { cmp.key = sel.value; store.set('mm.cmpKey', cmp.key); renderCompare(); });
  $('#cmp-range').addEventListener('click', e => { const b = e.target.closest('button[data-r]'); if (!b) return; cmp.range = b.getAttribute('data-r'); renderCompare(); });
  const pr = $('#cmp-presets');
  for (const [name, codes] of PRESETS) pr.append(el('button', { type: 'button', class: 'chip', text: name, onclick: () => { cmp.codes = codes.filter(c => ECON[c]).slice(0, 8); store.set('mm.cmp', cmp.codes); renderCompare(); } }));
  $('#cmp-chips').addEventListener('click', e => {
    const x = e.target.closest('button[data-rm]');
    if (x) { cmp.codes = cmp.codes.filter(c => c !== x.getAttribute('data-rm')); store.set('mm.cmp', cmp.codes); renderCompare(); return; }
    if (e.target.closest('#cmp-add')) openPicker('Add an economy', code => { if (!cmp.codes.includes(code)) { cmp.codes.push(code); cmp.codes = cmp.codes.slice(-8); store.set('mm.cmp', cmp.codes); renderCompare(); } }, new Set(cmp.codes));
  });
  initCompareExt();
}
function renderCompare() {
  const TH0 = theme();
  const chips = $('#cmp-chips'); chips.innerHTML = '';
  cmp.codes.forEach((c, i) => {
    const e = ECON[c];
    chips.append(el('span', { class: 'chip' }, el('span', { class: 'dot', style: 'background:' + TH0.pal[i % 8] }), el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(e) }), e.name,
      el('button', { type: 'button', class: 'x', 'data-rm': c, 'aria-label': 'Remove ' + e.name, text: '×' })));
  });
  if (cmp.codes.length < 8) chips.append(el('button', { type: 'button', class: 'chip', id: 'cmp-add', text: '+ Add economy' }));
  $$('#cmp-range button').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-r') === cmp.range ? 'true' : 'false'));
  const I = IND[cmp.key];
  $('#cmp-unit').textContent = I.label + ', ' + I.unit + '.';
  $('#cmp-src').textContent = 'Source: ' + I.src + '.';
  chartOn($('#cmp-chart'), TH => cmpOption(TH));
  // table
  const c = COV[cmp.key];
  const lastY = c ? c.last : LAST;
  const ys = range(lastY - 4, lastY);
  $('#cmp-tbl-title').textContent = I.label + ', ' + ys[0] + '–' + lastY;
  const tbl = $('#cmp-table'); tbl.innerHTML = '';
  const hr = el('tr', null, el('th', { text: 'Economy' })); ys.forEach(y => hr.append(el('th', { text: y })));
  tbl.append(el('thead', null, hr));
  const tb = el('tbody');
  for (const code of cmp.codes) tb.append(econRow(code, ys.map(y => heatCell(cmp.key, code, y, true, true))));
  tbl.append(tb);
  syncCmpScale();
}
function cmpOption(TH) {
  if (!cmp.codes.length) return null;
  const c = COV[cmp.key];
  if (!c) return null;
  let first = 9999, last = 0;
  for (const code of cmp.codes) { const s = S[cmp.key][code]; if (s) { first = Math.min(first, s.y0); last = Math.max(last, s.y0 + s.v.length - 1); } }
  if (!last) return null;
  const n = cmp.range === 'all' ? 999 : Number(cmp.range);
  const years = range(Math.max(first, last - n + 1), last);
  const series = cmp.codes.map((code, i) => lineSeries(cmp.key + '|' + code, ECON[code].name, years.map(y => val(cmp.key, code, y)), TH.pal[i % 8]));
  return scaleOpt(baseOption(TH, years, series, cmp.key, { legend: true, sortTip: true }), cmp.scale, series.flatMap(se => se.data));
}

/* ================= map ================= */
let mapKey = 'gdp_growth', mapYear = null, mapTimer = null, mapSel = null;
const MAP_KEYS = Object.keys(IND).filter(k => IND[k].scale);
function initMap() {
  const sel = $('#map-ind');
  fillIndSelect(sel, MAP_KEYS, mapKey);
  sel.addEventListener('change', () => { mapKey = sel.value; mapYear = null; stopPlay(); setupYear(); paintMap(); });
  const G = RAW.geo;
  const svg = sv('svg', { viewBox: '0 0 ' + G.w + ' ' + G.h, role: 'img', 'aria-label': 'World map coloured by the selected indicator' });
  G.p.forEach(([iso, d]) => { const p = sv('path', { d }); if (iso) p.setAttribute('data-iso', iso); svg.append(p); });
  const box = $('#mapbox'); box.prepend(svg);
  const tip = $('#maptip');
  svg.addEventListener('pointermove', e => {
    const p = e.target.closest && e.target.closest('path');
    if (!p || e.pointerType === 'touch') { tip.style.opacity = 0; return; }
    const iso = p.getAttribute('data-iso');
    const r = box.getBoundingClientRect();
    tip.innerHTML = '';
    const pk = iso ? pick(mapKey, iso, mapYear) : null;
    tip.append(el('b', { text: iso && ECON[iso] ? ECON[iso].name : 'No data' }), document.createTextNode(!pk ? 'No data for ' + mapYear : fmt(mapKey, pk.v) + (pk.y !== mapYear ? ' (' + pk.y + ')' : '')));
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x > r.width - 170) x = e.clientX - r.left - 170;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.opacity = 1;
  });
  svg.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
  svg.addEventListener('click', e => {
    const p = e.target.closest && e.target.closest('path'); if (!p) return;
    const iso = p.getAttribute('data-iso'); if (!iso || !ECON[iso]) return;
    mapSel = iso; paintSel(); mapInfo();
  });
  const yr = $('#map-year');
  yr.addEventListener('input', () => { mapYear = Number(yr.value); $('#map-yr').textContent = mapYear; paintMap(); });
  $('#map-play').addEventListener('click', () => { if (mapTimer) stopPlay(); else startPlay(); });
  setupYear();
  paintMap();
  initMapExt();
}
function setupYear() {
  const c = COV[mapKey];
  const yr = $('#map-year');
  yr.min = Math.max(c.first, 1970); yr.max = c.last;
  if (mapYear == null) mapYear = defaultYear(mapKey);
  mapYear = Math.min(c.last, Math.max(Number(yr.min), mapYear));
  yr.value = mapYear; $('#map-yr').textContent = mapYear;
}
function startPlay() {
  const yr = $('#map-year');
  if (mapYear >= Number(yr.max)) mapYear = Number(yr.min);
  $('#map-play').textContent = 'Pause';
  mapTimer = setInterval(() => {
    if (mapYear >= Number(yr.max)) { stopPlay(); return; }
    mapYear++; yr.value = mapYear; $('#map-yr').textContent = mapYear; paintMap();
  }, 650);
}
function stopPlay() { if (mapTimer) clearInterval(mapTimer); mapTimer = null; $('#map-play').textContent = 'Play'; }
function paintSel() { $$('#mapbox path').forEach(p => p.classList.toggle('sel', p.getAttribute('data-iso') === mapSel)); }
function paintMap() {
  let n = 0;
  $$('#mapbox path').forEach(p => {
    const iso = p.getAttribute('data-iso');
    const pk = iso ? pick(mapKey, iso, mapYear) : null;
    const c = pk ? colorOf(mapKey, pk.v) : null;
    p.style.fill = c || 'var(--nodata)';
  });
  for (const e of COUNTRIES) if (pick(mapKey, e.code, mapYear)) n++;
  const lg = $('#map-legend'); lg.innerHTML = '';
  for (const b of legendBins(mapKey)) lg.append(el('span', null, el('i', { style: 'background:' + b.color }), b.label));
  lg.append(el('span', null, el('i', { style: 'background:var(--nodata)' }), 'No data'));
  const I = IND[mapKey];
  $('#map-note').textContent = I.label + ', ' + I.unit + '. ' + n + ' economies have data for ' + mapYear + (I.sparse ? ', using each economy’s latest survey from the five years up to then' : '') + '. Source: ' + I.src + '.';
  mapInfo();
  mapLists();
}
function mapInfo() {
  const box = $('#map-info'); box.innerHTML = '';
  if (!mapSel) { box.append(el('span', { class: 'note', text: 'Tap or click a country to see its value.' })); return; }
  const e = ECON[mapSel]; const pk = pick(mapKey, mapSel, mapYear);
  box.append(el('div', null, el('span', { class: 'nm' }, flag(e) + ' ' + e.name), document.createTextNode(': ' + (!pk ? 'no data for ' + mapYear : fmt(mapKey, pk.v) + ' in ' + pk.y))),
    el('button', { type: 'button', class: 'btn', 'data-country': mapSel, text: 'Open ' + e.name }));
}
function mapLists() {
  const box = $('#map-lists'); box.innerHTML = '';
  const rows = COUNTRIES.filter(e => bigEnough(e.code, mapYear)).map(e => ({ e, pk: pick(mapKey, e.code, mapYear) })).filter(r => r.pk).map(r => ({ e: r.e, pk: r.pk, v: r.pk.v }));
  if (!rows.length) return;
  const hi = rows.slice().sort((a, b) => b.v - a.v).slice(0, 10), lo = rows.slice().sort((a, b) => a.v - b.v).slice(0, 10);
  for (const [title, list] of [['Highest, ' + mapYear, hi], ['Lowest, ' + mapYear, lo]]) {
    const tb = el('tbody');
    list.forEach(r => tb.append(econRow(r.e.code, [valueCell(mapKey, r.pk, mapYear)])));
    box.append(el('div', null, el('h2', { text: title, style: 'font-size:19px;margin-bottom:10px' }), el('div', { class: 'table-wrap' }, el('table', null, tb))));
  }
}

/* ================= rankings ================= */
const rk = { key: 'gdp_growth', year: null, region: 'all', sort: 'desc', small: false, q: '' };
function initRank() {
  const sel = $('#rk-ind');
  fillIndSelect(sel, MAP_KEYS, rk.key);
  sel.addEventListener('change', () => { rk.key = sel.value; rk.year = null; setupRankYears(); renderRank(); });
  const rs = $('#rk-region');
  rs.append(el('option', { value: 'all', text: 'All regions' }));
  REGIONS.forEach(r => rs.append(el('option', { value: r, text: r })));
  rs.addEventListener('change', () => { rk.region = rs.value; renderRank(); });
  $('#rk-year').addEventListener('change', () => { rk.year = Number($('#rk-year').value); renderRank(); });
  $('#rk-sort').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b) return; rk.sort = b.getAttribute('data-s'); renderRank(); });
  $('#rk-small').addEventListener('change', e => { rk.small = e.target.checked; renderRank(); });
  $('#rk-q').addEventListener('input', debounce(e => { rk.q = e.target.value; renderRank(); }, 120));
  $('#rk-dl').addEventListener('click', () => {
    const rows = [['Rank', 'Economy', 'Code', IND[rk.key].label + ' (' + IND[rk.key].unit + ')', 'Year']].concat(rankRows().map(r => [r.rank, r.e.name, r.e.code, r.v, r.vy]));
    saveCSV('macro-monitor-ranking-' + rk.key + '-' + rk.year + '.csv', rows);
  });
  setupRankYears();
  initRankExt();
}
function setupRankYears() {
  const c = COV[rk.key], ys = $('#rk-year');
  ys.innerHTML = '';
  for (let y = c.last; y >= Math.max(c.first, 1970); y--) ys.append(el('option', { value: y, text: y }));
  if (rk.year == null) rk.year = defaultYear(rk.key);
  ys.value = rk.year;
}
function rankRows() {
  const list = COUNTRIES.filter(e => rk.region === 'all' || e.region === rk.region)
    .map(e => { const pk = pick(rk.key, e.code, rk.year); return { e, v: pk ? pk.v : null, vy: pk ? pk.y : rk.year, p: pk && !IND[rk.key].sparse ? val(rk.key, e.code, pk.y - 1) : null }; })
    .filter(r => r.v != null && (rk.small || bigEnough(r.e.code, rk.year)));
  list.sort((a, b) => (rk.sort === 'desc' ? b.v - a.v : a.v - b.v));
  list.forEach((r, i) => { r.rank = i + 1; });
  return list;
}
function renderRank() {
  $$('#rk-sort button').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-s') === rk.sort ? 'true' : 'false'));
  const I = IND[rk.key];
  const all = rankRows();
  const nq = norm(rk.q.trim());
  const rows = nq ? all.filter(r => norm(r.e.name).includes(nq)) : all;
  $('#rk-note').textContent = all.length + ' economies ranked for ' + rk.year + (rk.small ? '' : ', counting those with at least 1 million people') + '. ' + I.label + ', ' + I.unit + '. Source: ' + I.src + '.';
  const tbl = $('#rk-table'); tbl.innerHTML = '';
  tbl.append(el('thead', null, el('tr', null, el('th', { text: 'Rank and economy' }), el('th', { text: I.short }), el('th', { text: 'Change on ' + (rk.year - 1) }), el('th', { class: 'bar' }, el('span', { class: 'sr', text: 'Bar' })))));
  const tb = el('tbody');
  const maxAbs = Math.max(1e-9, ...all.map(r => Math.abs(r.v)));
  const div = I.scale === 'div' || all.some(r => r.v < 0);
  for (const r of rows) {
    const tr = el('tr', { 'data-country': r.e.code, tabindex: '0' });
    tr.append(el('td', null, el('span', { class: 'rk-n', text: r.rank }), el('span', { class: 'flag', 'aria-hidden': 'true', text: flag(r.e) + ' ' }), r.e.name));
    tr.append(el('td', { style: 'font-weight:700', text: fmt(rk.key, r.v) + (r.vy !== rk.year ? ' (' + r.vy + ')' : '') }));
    const d = delta(rk.key, r.v, r.p);
    tr.append(el('td', { class: 'num-muted', text: d ? d.txt : '–' }));
    const track = el('div', { class: 'bartrack' });
    const c = colorOf(rk.key, r.v) || 'var(--ink-2)';
    const w = (Math.abs(r.v) / maxAbs) * (div ? 50 : 100);
    track.append(el('i', { style: 'background:' + c + ';width:' + w.toFixed(2) + '%;' + (div ? (r.v >= 0 ? 'left:50%' : 'right:50%') : 'left:0') }));
    if (div) track.append(el('span', { class: 'mid', style: 'left:50%' }));
    tr.append(el('td', { class: 'bar' }, track));
    tb.append(tr);
  }
  if (!rows.length) tb.append(el('tr', null, el('td', { colspan: '4', class: 'empty', text: 'No economy matches “' + rk.q.trim() + '”. Clear the search to see them all.' })));
  tbl.append(tb);
}

/* ================= learn & about ================= */
function initLearn() {
  const host = $('#learn-groups'); host.innerHTML = '';
  for (const [cat, keys] of CATS) {
    const grid = el('div', { class: 'gloss' });
    for (const k of keys.concat(cat === 'Prices, money and interest rates' ? ['fx'] : [])) {
      const I = IND[k];
      grid.append(el('article', null, el('h3', { text: I.label }), el('p', { text: I.desc }), el('p', { class: 'why', text: I.why }), el('span', { class: 'tag', text: 'Measured as: ' + I.unit })));
    }
    host.append(el('section', { class: 'block' }, el('h2', { text: cat }), grid));
  }
  const grid = el('div', { class: 'gloss' });
  for (const k of ['brent', 'wti', 'gas', 'gold', 'us10y', 'uscpi', 'fx']) {
    const m = MK[k];
    grid.append(el('article', null, el('h3', { text: k === 'fx' ? 'US dollar exchange rates' : m.name }), el('p', { text: m.desc }), el('span', { class: 'tag', text: 'Source: ' + m.src })));
  }
  host.append(el('section', { class: 'block' }, el('h2', { text: 'Market prices' }), grid));
}
function initAbout() {
  const bd = MKD.brent.last, gd = MKD.gold.last;
  $('#about-vintage').textContent = 'Annual figures for ' + COUNTRIES.length + ' economies and ' + GROUPS.length + ' regional and income groups come from the World Bank’s World Development Indicators, with values up to ' + LAST +
    ' for most economies. Some figures, such as government finances, are published with a longer delay. Oil and gas prices run to ' + fmtDay(bd.d) + '; gold, US bond yields, US inflation and exchange rates are monthly, to ' + fmtMonth(gd.d) + ' or the latest month published.';
}

/* ================= downloads ================= */
let DL = null;
function csvCell(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
async function saveCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  if (!DL) { if (STANDALONE) blobSave(filename, '\ufeff' + csv, 'text/csv;charset=utf-8'); return; }
  try { await DL.save({ filename, data: csv }); }
  catch (e) {
    const c = e && e.code;
    if (c === 'declined' || c === 'rate_limited') return;
    if (['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(c)) { DL = null; $$('[data-dl]').forEach(b => { b.hidden = true; }); }
  }
}

/* ================= navigation ================= */
const VIEWS = ['overview', 'bangladesh', 'lab', 'faq', 'countries', 'cl', 'plans', 'compare', 'explore', 'map', 'rankings', 'markets', 'learn', 'methods', 'about', 'contact', 'privacy'];
const TITLES = { plans: 'Subscribe and support', cl: 'Country analysis', overview: 'Macroeconomic Monitor and Forecasting', bangladesh: 'Bangladesh Monitor', lab: 'Forecast lab', faq: 'Frequently asked questions', compare: 'Compare economies', explore: 'Explore relationships', map: 'World map', rankings: 'Rankings', markets: 'Markets', learn: 'Learn the indicators', methods: 'Methods and notes', about: 'About', contact: 'Contact', privacy: 'Privacy' };
const inited = {};
const INIT = { plans: initPlans, cl: initCL, bangladesh: initBD, lab: initLab, compare: initCompare, explore: initExplore, map: initMap, rankings: initRank, markets: initMarkets, learn: initLearnX, faq: initFAQ, methods: initMethods, about: initAbout, contact: initContact, privacy: initPrivacy };
function go(view, opts) {
  opts = opts || {};
  if (!VIEWS.includes(view)) view = 'overview';
  if (gateBlocks(view, opts)) return;
  if (view !== 'map') stopPlay();
  if (view !== 'explore') exStop();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  $$('.views button').forEach(b => { if (b.getAttribute('data-go') === view) { b.setAttribute('aria-current', 'page'); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } else b.removeAttribute('aria-current'); });
  if (INIT[view] && !inited[view]) { INIT[view](); inited[view] = true; }
  if (view === 'countries') showCountry(opts.code || curCountry || store.get('mm.country', 'USA'));
  else {
    if (view === 'compare') renderCompare();
    if (view === 'rankings') renderRank();
    if (view === 'markets') renderMarkets();
    if (view === 'explore') renderExplore();
    document.title = view === 'overview' ? TITLES.overview : TITLES[view] + ' | Macroeconomic Monitor and Forecasting';
    try { history.replaceState(null, '', '#' + view); } catch (err) { /* framed */ }
  }
  if (!opts.keep) window.scrollTo(0, 0);
}
function route(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (routeBD(h)) return;
  if (routeExt(h)) return;
  const m = /^country-([A-Za-z]{3})$/.exec(h);
  if (m && ECON[m[1].toUpperCase()]) return go('countries', { code: m[1].toUpperCase() });
  if (/^[A-Za-z]{3}$/.test(h) && ECON[h.toUpperCase()]) return go('countries', { code: h.toUpperCase() });
  go(VIEWS.includes(h) ? h : 'overview');
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-country]');
  if (c) { e.preventDefault(); go('countries', { code: c.getAttribute('data-country') }); return; }
  const g = e.target.closest('[data-go]');
  if (g) {
    e.preventDefault(); go(g.getAttribute('data-go'));
    const a = g.getAttribute('data-anchor');
    if (a) setTimeout(() => { const t = document.getElementById(a); if (t) t.scrollIntoView({ block: 'start' }); }, 40);
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const tr = e.target.closest && e.target.closest('tr[data-country]');
  if (tr) go('countries', { code: tr.getAttribute('data-country') });
});
window.addEventListener('hashchange', () => route(location.hash));
function setHdr() { document.documentElement.style.setProperty('--hdr', ($('.topbar').offsetHeight || 60) + 'px'); }
window.addEventListener('resize', debounce(setHdr, 100));

/*__EXT__*/
/* ================= boot ================= */
syncThemeBtn();
setHdr();
bootEarly();
initOverview();
initOverviewExt();
route(location.hash);

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous'; if (src.indexOf('echarts') > -1) s.integrity = 'sha384-pPi0zxBAoDu6+JXW/C68UZLvBUUtU+7zonhif43rqj7pxsGyqyqzcian2Rj37Rss'; s.onload = res; s.onerror = rej; document.head.append(s); });
}
function startECharts() {
  echartsState = 'loading';
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/echarts/5.6.0/echarts.min.js')
    .catch(() => loadScript('https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js'))
    .then(() => { echartsState = window.echarts ? 'ready' : 'failed'; })
    .catch(() => { echartsState = 'failed'; })
    .then(() => { for (const [node, rec] of charts) { rec.dirty = true; if (rec.visible || !io) applyChart(node, rec); } });
}

const CL = window.claude;
if (CL && typeof CL.use === 'function') {
  CL.use('downloads').then(d => { if (d) { DL = d; $$('[data-dl]').forEach(b => { b.hidden = false; }); } }).catch(() => {});
  CL.use('sample').then(s => { if (s) { SAMPLE = s; $('#c-ai').hidden = false; } }).catch(() => {});
  CL.use('comments').then(c => { if (c) { CM = c; syncContact(); } }).catch(() => {});
}
})();

