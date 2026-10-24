/**
 * Macroarianalytics security-alert relay (Google Apps Script).
 * Receives the short reports that the site sends when it detects an injection attempt, framing, an unofficial copy or
 * machine-speed scraping, and e-mails them to you from your own Google account. Your address never appears in the site.
 *
 * Set-up (5 minutes):
 *  1. Open https://script.google.com, choose "New project", delete the sample code and paste this file.
 *  2. Change SITE below if your domain is different. Save.
 *  3. Deploy > New deployment > Select type: Web app. Execute as: Me. Who has access: Anyone. Deploy and authorise.
 *  4. Copy the Web app URL (https://script.google.com/macros/s/.../exec).
 *  5. In config.json set "alerts": { "endpoint": "<that URL>" }, run  python3 scripts/build_site.py  and upload public/ again.
 *  6. Test: open https://<your site>/#%3Cscript%3E once; you should receive an e-mail within a minute
 *     (the site sends at most one alert of each type every 10 minutes per visitor; this script at most 20 an hour).
 */
const SITE = 'www.macroarianalytics.com';
const MAX_PER_HOUR = 20;

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (String(p.site || '') !== SITE) return ContentService.createTextOutput('ignored');
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('alerts') || 0);
  if (n >= MAX_PER_HOUR) return ContentService.createTextOutput('throttled');
  cache.put('alerts', String(n + 1), 3600);
  const clean = v => String(v || '').replace(/[\r\n]+/g, ' ').slice(0, 300);
  const body = [
    'The website reported a security event.', '',
    'Type:    ' + clean(p.type), 'Detail:  ' + clean(p.detail), 'Page:    ' + clean(p.page), 'Host:    ' + clean(p.host),
    'Time:    ' + clean(p.time), 'Browser: ' + clean(p.ua), '',
    'What to do: see SECURITY.md (section "When you receive an alert").'
  ].join('\n');
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[Security alert] ' + clean(p.type) + ' on ' + SITE, body);
  return ContentService.createTextOutput('ok');
}
