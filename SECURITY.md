# Security: what protects the site, and how to get an e-mail when something happens

A static website has no server code to break into, which removes most of the usual risks. What remains is handled in
three layers. **Be clear about what each layer can do:** the page itself can refuse malicious input and report it, but it
cannot see or stop network attacks (floods of requests, bots hitting the server); those must be stopped by the hosting
network before they reach the page. Nothing can make published data impossible to copy; what the site can do is label,
attribute and watermark it, and detect copies hosted elsewhere.

## Layer 1 — built into the page (already on)

| Protection | What it does |
|---|---|
| Escaping, no `eval` | Every piece of text is escaped before display and nothing from the address bar, search boxes or data is ever executed, so cross-site scripting has nothing to run. |
| Content Security Policy | Only the page’s own scripts (pinned by SHA-256 hash) and the ECharts library (Subresource Integrity) may run; styles only from the page and Google Fonts; no plugins, no forms to other sites. |
| Address and input guard | Addresses must be plain page tokens (`#c.BGD.inflation.forecast`). Code in the address bar or typed into a search box is refused with a warning (ordinary text such as `GDP > 5` is fine); the third attempt **locks the page in that browser tab until the tab is closed**. Each attempt is reported (see Layer 3). A determined attacker can always open a new tab or use another tool, which is why Layers 2 and 3 matter. |
| Rate guard | More than 60 page changes in 10 seconds (machine speed) pauses the site for 30 seconds; bulk downloads are limited. |
| Frame guard | The page refuses to run inside another site’s frame (clickjacking); the `_headers` file also sends `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Unofficial-copy banner | If the page is served from any domain other than those in `config.json → official_hosts`, it shows a banner pointing to the official site and reports the domain. |
| Attribution | Copied text gets a source line; every exported chart carries the site’s watermark; every CSV starts with its sources. |
| Security headers | `public/_headers`: CSP, HSTS (with preload), `nosniff`, strict referrer policy, permissions policy, COOP/CORP. |

## Layer 2 — Cloudflare in front of the site (free plan, 20 minutes)

1. Create a free Cloudflare account, add `macroarianalytics.com`, and change the domain’s name servers to the two that
   Cloudflare gives you. Host the site on **Cloudflare Pages** (upload `public/`), or keep your host and proxy it (orange cloud).
2. **SSL/TLS → Overview**: *Full (strict)*. **Edge Certificates**: *Always Use HTTPS* on, *Minimum TLS 1.2*, *HSTS* on.
3. **Security → Bots**: turn on **Bot Fight Mode** (blocks known bad bots and scrapers).
4. **Security → WAF → Custom rules** (5 free rules). Suggested:
   * Block requests whose URI query or path contains `<script`, `javascript:`, `../`, `union select`
     (expression: `http.request.uri contains "<script" or http.request.uri contains "javascript:" or http.request.uri contains "../" or lower(http.request.uri.query) contains "union select"`) → *Block*.
   * Block vulnerability scanners probing for files this site does not have
     (`http.request.uri.path contains ".php" or http.request.uri.path contains "/wp-" or http.request.uri.path contains ".env" or http.request.uri.path contains ".git"`) → *Block*.
   * Block methods other than GET and HEAD (`not http.request.method in {"GET" "HEAD"}`) → *Block* — the site needs nothing else.
5. **Security → WAF → Rate limiting rules** (1 free rule; on the Free plan it counts per IP over 10 seconds):
   for path `/` and `/data/*`, more than 100 requests in 10 seconds → *Block* for 10 seconds.
6. If an attack is under way: **Overview → Under Attack Mode** (every visitor gets a browser check) — switch it off afterwards.
7. **DNS**: enable **DNSSEC**; add a CAA record so only your certificate authority can issue certificates for the domain.

## Layer 3 — e-mail to the owner

There are two independent kinds of alert. Set up both.

**A. Attacks on the network (Cloudflare → your e-mail).**
Cloudflare dashboard → **Notifications → Add**:
* **HTTP DDoS Attack Alert** — available on all plans, delivered by e-mail within about a minute of an attack being
  mitigated (no duplicates within an hour).
* **Security Events Alert** (spikes in firewall, rate-limit and bot actions) — Business plan and above; on the free plan
  check *Security → Events* when the DDoS alert arrives.

**B. Attempts against the page itself (the page → your e-mail).**
The page reports injection attempts, framing, unofficial copies, machine-speed scraping and CSP violations to an
endpoint that you choose. Your e-mail address is never written into the site:

1. Open https://script.google.com → *New project*, paste `docs/alert-relay.gs`, save.
2. *Deploy → New deployment → Web app*; *Execute as: Me*; *Who has access: Anyone*; copy the Web app URL.
3. Paste it in `config.json → alerts.endpoint`, run `python3 scripts/build_site.py`, and upload `public/` again
   (the build adds the endpoint to the Content Security Policy automatically).
4. Test by opening `https://www.macroarianalytics.com/#%3Cscript%3E`: an e-mail arrives within a minute. The page sends
   at most one alert of each type every 10 minutes per visitor and the relay at most 20 an hour, so you are never flooded.

(Any form-to-e-mail service that accepts a form-encoded POST, such as Formspree, works the same way.)

**C. Defacement and downtime (monitor → your e-mail).** A free UptimeRobot account (50 monitors, 5-minute checks,
keyword monitoring) can watch `https://www.macroarianalytics.com/` for the keyword `Macroarianalytics` and alert you if the
page goes down or changes.

## Your accounts

* Turn on two-factor authentication for Cloudflare, your domain registrar, GitHub and Google.
* If the site is in a GitHub repository: protect the main branch, enable Dependabot and secret scanning, and never commit keys.
* Keep `config.json` free of secrets — everything in it is public.

## When you receive an alert

1. **DDoS alert**: Cloudflare has already mitigated it. Look at *Security → Events*; if the site is slow, turn on *Under Attack Mode*.
2. **Injection or framing alert**: nothing ran (the page refuses code); note the `Host` and `Detail`. If it repeats, add the
   source IP or country to a WAF custom rule.
3. **Unofficial-copy alert**: the host name in the e-mail is serving a copy. Ask the host to take it down (most hosts have
   an abuse form); the banner already warns its visitors.
4. **Defacement alert**: re-upload `public/` from your copy of this package, rotate your hosting passwords, and check
   your accounts’ access logs.

## Reporting a vulnerability

See `/.well-known/security.txt` on the official site.
