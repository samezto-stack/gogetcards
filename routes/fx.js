/**
 * The approximate-local-price script, served to the partner payment step.
 *
 * WHY THIS EXISTS. Step 2 of checkout lives on a partner domain, in a
 * separate repository, and shows the order summary in USD while Whop's own
 * payment widget converts to the buyer's local currency underneath it. A
 * Canadian therefore reads US$299.98 in the summary and CA$411 in the widget
 * on one screen, with nothing connecting the two numbers. That reads as a
 * discrepancy on the last page before payment, which is the worst place on
 * the site to introduce a doubt.
 *
 * WHY A SERVED SCRIPT RATHER THAN SIX COPIES. The currency tables and the
 * detection rules are the same everywhere, and there are six partner sites.
 * Pasting the logic into six HTML files guarantees they drift — one gets a
 * new market, five do not, and the difference surfaces as "the estimate is
 * wrong on that site" months later. One file here, one <script> tag there.
 *
 * WHY THE RATES ARE BAKED IN RATHER THAN FETCHED. Inlining them makes this a
 * single request with no second round trip, no CORS preflight, and nothing to
 * fail halfway. The rates change slowly and the response is cached.
 *
 * NOTHING HERE IS PERSONAL AND NOTHING IS CLOAKED. The response is identical
 * for every requester, contains only published exchange rates, and the code
 * it serves reads the browser's own locale — never an IP, never a user agent.
 * It is the same logic views/partials/fx-approx.ejs already runs on this
 * site's own pages.
 */

const express = require('express');
const router = express.Router();
const fx = require('../services/fx');

/* Matches the feed's cache. Rates refresh on a six-hour cycle, so a browser
   holding this for fifteen minutes is never meaningfully behind, and the
   partner pages stop asking for it on every checkout. */
const CACHE_SECONDS = 900;

/* Region subtag -> currency, and IANA zone -> region. Kept in step with
   views/partials/fx-approx.ejs; that file annotates this site's own pages
   and this one annotates the partner payment step, and a market added to one
   belongs in both. */
const CURRENCY_BY_REGION = {
  CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', JP: 'JPY', MX: 'MXN',
  SG: 'SGD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  BR: 'BRL', AE: 'AED',
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR',
  FI: 'EUR', FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR',
  LT: 'EUR', LU: 'EUR', LV: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR',
  SI: 'EUR', SK: 'EUR',
};

const REGION_BY_TZ = {
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'America/Regina': 'CA', 'America/Montreal': 'CA', 'America/Moncton': 'CA',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB',
  'Pacific/Auckland': 'NZ', 'Asia/Tokyo': 'JP', 'Asia/Singapore': 'SG',
  'Asia/Dubai': 'AE', 'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX', 'America/Tijuana': 'MX', 'America/Monterrey': 'MX',
  'America/Cancun': 'MX',
  'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL',
  'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT', 'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT',
  'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR', 'Europe/Bratislava': 'SK',
  'Europe/Ljubljana': 'SI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT', 'Europe/Luxembourg': 'LU', 'Europe/Malta': 'MT',
  'Europe/Zagreb': 'HR', 'Asia/Nicosia': 'CY',
};

function body() {
  const snap = fx.snapshot();
  return `/* Zyphera TCG - approximate local price for the partner payment step.
   Estimate only. The USD figure is what is charged. */
(function () {
  var FX = ${JSON.stringify(snap.rates || {})};
  var CURRENCY_BY_REGION = ${JSON.stringify(CURRENCY_BY_REGION)};
  var REGION_BY_TZ = ${JSON.stringify(REGION_BY_TZ)};

  function regionFromTimeZone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (REGION_BY_TZ[tz]) return REGION_BY_TZ[tz];
      if (tz.indexOf('Australia/') === 0) return 'AU';
    } catch (e) { /* no-op */ }
    return '';
  }

  function regionFromLanguage() {
    try {
      var tags = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
      try { tags = tags.concat([Intl.NumberFormat().resolvedOptions().locale]); } catch (e) { /* old browser */ }
      for (var i = 0; i < tags.length; i++) {
        var m = /^[a-z]{2,3}[-_]([A-Za-z]{2})\\b/.exec(String(tags[i] || ''));
        if (m) return m[1].toUpperCase();
      }
    } catch (e) { /* no-op */ }
    return '';
  }

  var code = CURRENCY_BY_REGION[regionFromTimeZone()] || CURRENCY_BY_REGION[regionFromLanguage()];
  var rate = code && FX[code];
  if (!rate) return;

  function money(usd) {
    var value = usd * rate;
    var rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    try {
      /* en-US on purpose: a Canadian browser renders CAD as a bare "$411",
         which is the exact ambiguity this exists to remove. */
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: code,
        minimumFractionDigits: value >= 100 ? 0 : 2,
        maximumFractionDigits: value >= 100 ? 0 : 2
      }).format(rounded);
    } catch (e) {
      return rounded + ' ' + code;
    }
  }

  /* The amount comes from the productPrice claim, not from the DOM.

     The page's own inline script rewrites .ck-grand-amount from that same
     claim, and this script is loaded async, so reading the element would be
     a race: sometimes the built-in fallback price, sometimes the real one.
     Reading the claim removes the ordering question entirely. The element
     text is only a fallback for a checkout opened without the claim. */
  function usdAmount() {
    try {
      var p = new URLSearchParams(window.location.search).get('productPrice');
      if (p && p.trim()) {
        var n = parseFloat(p.trim().replace(/^\\$/, '').replace(/,/g, ''));
        if (isFinite(n) && n > 0) return n;
      }
    } catch (e) { /* no-op */ }
    var el = document.querySelector('.ck-grand-amount');
    if (!el) return 0;
    var t = parseFloat(String(el.textContent || '').replace(/[^0-9.]/g, ''));
    return isFinite(t) && t > 0 ? t : 0;
  }

  function render() {
    var amount = document.querySelector('.ck-grand-amount');
    if (!amount || document.querySelector('.zfx')) return;
    var usd = usdAmount();
    if (!usd) return;

    /* The amount's parent holds the "USD" tag AND the figure, side by side.
       Turning that parent into a column stacks the three, which puts "USD"
       on its own line above the price — the first version of this did
       exactly that. So the existing children are moved into an inner line
       that keeps them inline, and only the outer element becomes a column.
       The estimate then sits under the whole "USD $299.98" group. */
    var host = amount.parentNode;
    if (!host) return;
    var line = document.createElement('span');
    line.style.cssText = 'display:block;';
    while (host.firstChild) line.appendChild(host.firstChild);
    host.appendChild(line);
    host.style.cssText = 'display:inline-flex;flex-direction:column;align-items:flex-end;';

    var note = document.createElement('span');
    note.className = 'zfx';
    note.setAttribute('title', 'Estimate only. You are charged the US dollar total. Your bank sets the final rate.');
    note.style.cssText = 'display:block;margin-top:4px;white-space:nowrap;';

    var label = document.createElement('span');
    label.textContent = 'approx';
    label.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.55;margin-right:5px;';

    var value = document.createElement('span');
    value.textContent = money(usd);
    value.style.cssText = 'font-size:11.5px;font-weight:500;opacity:0.75;font-variant-numeric:tabular-nums;';

    note.appendChild(label);
    note.appendChild(value);
    host.appendChild(note);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
`;
}

router.get('/fx-estimate.js', (req, res) => {
  res.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.type('application/javascript; charset=utf-8').send(body());
});

module.exports = router;
