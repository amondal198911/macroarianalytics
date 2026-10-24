// Write route lists for the browser audit: every page and section of Bangladesh, sample countries, world, models, misc.
import fs from 'fs'; import { load } from './harness.mjs';
for (const f of ['charts.js', 'maps.js', 'pages-country.js', 'pages-country2.js', 'pages-country3.js', 'pages-world.js', 'pages-models.js', 'pages-misc.js']) {} // node counts come from the page registry below
const ctx = load(['stat-tables.js', 'stats.js', 'stats-ts.js', 'stats-eval.js', 'core.js', 'charts.js', 'maps.js', 'analysis.js', 'pages-country.js', 'pages-country2.js', 'pages-country3.js', 'pages-world.js', 'pages-models.js', 'pages-misc.js']);
const MA = ctx.MA; const nodesOf = (iso, cat, sub) => { const pg = MA.PAGES[sub]; const n = pg.nodesFor ? pg.nodesFor(MA.ctx(iso, cat)) : pg.nodes; return n ? n.length : 1; };
const bd = [], other = [], misc = [];
for (const c of MA.cats('BGD')) for (const s of MA.SUBS) { const n = nodesOf('BGD', c.id, s.id); for (let i = 1; i <= n; i++) bd.push(`c.BGD.${c.id}.${s.id}${i > 1 ? '.' + i : ''}`); }
for (const iso of ['USA', 'IND', 'NGA', 'TUV', 'SSD', 'DEU']) { other.push('c.' + iso); for (const c of MA.cats(iso)) for (const s of MA.SUBS) other.push(`c.${iso}.${c.id}.${s.id}`); }
misc.push('home', 'countries', 'c.BGD', 'data', 'data.2', 'data.3', 'learn', 'refs', 'about', 'privacy', 'security', 'contact');
MA.WORLD_SECS.forEach(s => misc.push('world.' + s.id)); misc.push('world.rank.2', 'world.rank.3');
MA.MODEL_SECS.forEach(s => misc.push('models.' + s.id)); for (let i = 2; i <= 6; i++) misc.push('models.dsge.' + i);
fs.writeFileSync('tests/routes_bd.txt', bd.join('\n')); fs.writeFileSync('tests/routes_other.txt', other.join('\n')); fs.writeFileSync('tests/routes_misc.txt', misc.join('\n'));
console.log('bd', bd.length, 'other', other.length, 'misc', misc.length);
