/* Merchant Center compliance assertions against the HTML that
   scripts/audit/render-pages.js actually produced.
 *
 * Run:  node scripts/audit/render-pages.js && node scripts/audit/check-pages.js
 *
 * These are regression guards for claims that have been wrong before, not
 * style checks. Each one corresponds to a specific Merchant Center policy:
 * a payment method the buyer cannot use, a preorder advertised as in
 * stock, or an identifiable seller a reviewer cannot find. */
const fs = require('fs');
const path = require('path');

const pages = JSON.parse(fs.readFileSync(path.join(require('os').tmpdir(), 'gogetcards-rendered.json'), 'utf8'));

let fails = 0;
function check(name, ok, detail) {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
}
const all = Object.entries(pages);
const companyCfg = require('../../config/company');

/* Text a human actually sees: script and style bodies stripped, tags
   removed, whitespace collapsed. Asserting against raw HTML would pass
   on a value that only appears inside a JSON-LD blob. */
const visibleText = (html) => String(html)
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

/* ── Payment claims ──
   PayPal appeared on five separate surfaces and is not offered at
   checkout; Klarna was a buy-now-pay-later claim with nothing behind it. */
for (const [page, html] of all) {
  check(`${page}: no PayPal claim`, !/PayPal/i.test(html));
  check(`${page}: no Klarna claim`, !/Klarna/i.test(html));
}
const paymentsCfg = require('../../config/payments');
check('footer: payment badge row renders', /aria-label="Accepted payment methods"/.test(pages.home));
check('footer: every configured method has a badge',
  paymentsCfg.METHODS.every(m => pages.home.includes(`aria-label="${m.label}"`)),
  'a method in config/payments.js is missing from the rendered row');
check('footer: no badge for a method that is not configured', (() => {
  const rendered = [...pages.home.matchAll(/role="listitem" title="([^"]+)"/g)].map(m => m[1]);
  return rendered.length === paymentsCfg.METHODS.length
    && rendered.every(label => paymentsCfg.METHODS.some(m => m.label === label));
})());
check('trust bar: secure-checkout copy comes from config',
  pages.home.includes(paymentsCfg.copy.secureCheckout));

/* ── Footer trust badges ──
   Originally three inert spans reading "SSL Secure", "Factory Sealed" and
   "Tracked Shipping". A self-applied SSL seal is a marker of a cheap
   template rather than a secure site, so it must not come back.

   The badges are a visual strip and are deliberately NOT links: the footer
   columns already carry one link each to /shipping,
   /factory-sealed-guarantee and /refund-policy, and a second differently
   worded link to the same page in the same footer reads as a second
   destination. What made the originals bad was their wording, not the
   absence of a link. */
check('footer: no self-applied SSL seal', !/SSL Secure/i.test(pages.home));
check('footer: trust badges are a strip, not a second set of links',
  !/class="footer__trust-badge"[^>]*href=/.test(pages.home));
check('footer: trust badges state specific, checkable promises',
  ['Free shipping on all orders', 'Factory-sealed guarantee', '14-day returns']
    .every(t => pages.home.includes(t)));
check('footer: each of those pages is still reachable from the columns',
  ['href="/shipping"', 'href="/factory-sealed-guarantee"', 'href="/refund-policy"']
    .every(h => pages.home.includes(h)));

/* ── Business identity ── */
check('footer: trading name in copyright', /GoGetCards\.\s*All rights reserved/.test(pages.home));
check('footer: trademark disclaimer', /independent retailer/i.test(pages.home));
check('footer: support email linked', /mailto:support@gogetcards\.com/.test(pages.home));
check('footer: currency stated', /Prices in USD/.test(pages.home));

/* ── Contact form ── */
const c = pages.contact;
check('contact: form posts to /contact', /<form[^>]*method="POST"[^>]*action="\/contact"/.test(c));
check('contact: every input has a label', (() => {
  const ids = [...c.matchAll(/<(?:input|textarea|select)[^>]*id="(cf-[^"]+)"/g)].map(m => m[1]);
  const labelled = [...c.matchAll(/<label[^>]*for="(cf-[^"]+)"/g)].map(m => m[1]);
  return ids.length >= 5 && ids.every(id => labelled.includes(id));
})(), 'id/for mismatch');
check('contact: autocomplete on name + email', /autocomplete="name"/.test(c) && /autocomplete="email"/.test(c));
check('contact: honeypot present', /name="website"/.test(c));
/* The form was being spammed with only the honeypot in front of it. Both
   guards run: the honeypot catches the naive bots for free, reCAPTCHA the
   ones that fill it in correctly. */
check('contact: reCAPTCHA widget rendered', /<div class="g-recaptcha" data-sitekey="[^"]+"/.test(c));
check('contact: and its script is loaded', /recaptcha\/api\.js/.test(c));
check('contact: the widget sits inside the contact form', (() => {
  /* Scoped to THIS form. The first <form> on the page is the header search
     box, so comparing against it proved nothing. */
  const start = c.indexOf('<form class="contact-form"');
  const end = c.indexOf('</form>', start);
  const w = c.indexOf('g-recaptcha');
  return start !== -1 && end !== -1 && w > start && w < end;
})());
check('contact: and before the submit button',
  c.indexOf('g-recaptcha') < c.indexOf('id="contact-submit"'));
check('contact: the secret key is never rendered',
  !c.includes(require('../../services/recaptcha').SITE_KEY.slice(0, 0) + '6LcQGJ0tAAAAAAjO3ZVhRA55fA5ygFz2nDSmI3Jl'));
check('contact(error): the widget survives a validation failure',
  /<div class="g-recaptcha"/.test(pages['contact(error)']));
check('contact: business details block', /Business Details/.test(c));
check('contact(sent): confirmation announced', /role="status"/.test(pages['contact(sent)']));
check('contact(error): error announced', /role="alert"/.test(pages['contact(error)']));
check('contact(error): input value preserved', /value="a@b\.c"/.test(pages['contact(error)']));
check('contact: every configured question is rendered',
  require('../../config/faq').faqs().every(f => c.includes(f.q.replace(/&/g, '&amp;'))));
/* FAQPage and ContactPoint are built in the ROUTE, not the template, so
   they are asserted in check-routes.js against the real Express handler.
   Checking them here would only prove this harness passes its own stub. */

/* ── Preorder compliance ── */
const po = pages['product(preorder)'];
const ins = pages.product;
check('preorder: payment-taken-today disclosed', /card is charged today/i.test(po));
check('preorder: release date shown', /March 26, 2027/.test(po));
check('preorder: full terms in the HTML', /If our allocation is cut/.test(po));
check('preorder: allocation wording, not stock', /remaining in our distributor allocation/.test(po));
check('preorder: NOT described as In Stock', !/>\s*In Stock\s*</.test(po));
check('preorder: availability says not yet released', /Preorder — not yet released/.test(po));
check('preorder: no live urgency countdown', !/dynamic-stock-wrapper/.test(po));
check('in-stock: keeps the urgency countdown', /dynamic-stock-wrapper/.test(ins));
check('in-stock: says In Stock', />\s*In Stock\s*</.test(ins));

/* ── Identifiers on the page ── */
check('product: GTIN shown', /4570118083104/.test(ins));
check('product: SKU shown', /GGC-OP17-BB/.test(ins));
check('product: language shown', /Language/.test(ins));
check('product: shipping stated on the page', /tracked/i.test(ins));
check('product: return window from config', /14-Day Return Window/.test(ins));

/* ── Search ── */
check('header: search box present', /role="search"/.test(pages.home));
check('header: search targets the schema URL', /action="\/collection\/all"[^>]*method="GET"|method="GET"[^>]*action="\/collection\/all"/.test(pages.home));
check('header: search input is labelled', /<label class="sr-only" for="site-search"/.test(pages.home));

/* ── Brand consistency ── */
check('header + footer use the three-card mark',
  (pages.home.match(/rotate\(14 288 240\)/g) || []).length >= 2);
check('old hexagon mark is gone', !/polygon points="14,2 26,8 26,20 14,26 2,20 2,8"/.test(pages.home));

/* ── Organization schema ── */
const org = (() => {
  for (const s of (pages.home.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs) || [])) {
    const j = JSON.parse(s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
    const n = (j['@graph'] || []).find(x => x['@type'] === 'Organization');
    if (n) return n;
  }
  return null;
})();
check('Organization: emitted', !!org);
check('Organization: contactPoint', !!(org && org.contactPoint && org.contactPoint[0].email));
check('Organization: paymentAccepted matches config',
  !!(org && org.paymentAccepted === paymentsCfg.copy.schemaPaymentAccepted));
check('Organization: logo is a real PNG asset', !!(org && /favicon-512\.png$/.test(org.logo.url)));
/* These two guard against a future edit inventing values that Google
   verifies against public records. */
/* sameAs must contain exactly the profiles config/company.js holds — no
   more, no fewer. The original form of this check asserted sameAs was
   ABSENT, which was correct while every social field was null and became
   wrong the moment a real one was added. The intent was never "no sameAs",
   it was "nothing invented": sameAs pointing at a profile that does not
   exist ties the brand entity to a 404, which is worse than omitting it. */
const configuredSocials = Object.values(companyCfg.social || {}).filter(Boolean);
if (configuredSocials.length) {
  check('Organization: sameAs lists every configured profile',
    !!(org && Array.isArray(org.sameAs)
       && configuredSocials.every((u) => org.sameAs.includes(u))));
  check('Organization: sameAs invents nothing',
    !!(org && (org.sameAs || []).every((u) => configuredSocials.includes(u))));
  check('footer links every configured profile',
    configuredSocials.every((u) => String(pages.home).includes(`href="${u}"`)));
} else {
  check('Organization: no invented sameAs', !!(org && !org.sameAs));
}
check('Organization: no invented legalName', !!(org && !org.legalName));

/* Business address.
   Merchant Center's most common first-submission rejection is that the
   reviewer cannot identify or locate the seller. The address now exists in
   config/company.js, and these assert it actually reaches the page — a
   value in a config nothing renders is worth exactly nothing to a
   reviewer. All three surfaces are checked because they are formatted by
   the same helper precisely so they cannot disagree, and an inconsistency
   between them is what a misrepresentation review looks for. */
const bizCfg = companyCfg.business;
if (bizCfg.address) {
  check('Organization: postal address emitted',
    !!(org && org.address && org.address.streetAddress === bizCfg.address.street
       && org.address.postalCode === bizCfg.address.postalCode
       && org.address.addressCountry === bizCfg.countryCode));

  const oneLine = companyCfg.addressOneLine();
  check('footer prints the business address on every page',
    all.every(([, html]) => visibleText(html).includes(oneLine)));

  /* The contact page prints it across lines, so the one-line form will not
     match; assert the parts instead. */
  const contactText = visibleText(pages.contact);
  check('contact page prints the business address',
    companyCfg.addressLines().every((line) => contactText.includes(line)));

  check('support hours carry a timezone',
    /Pacific Time|Eastern Time|Central Time|Mountain Time|UTC|GMT/.test(contactText));
}

/* ── No Google tag on the payment step ──────────────────────────────
   Rendered here rather than read from the page cache: the checkout steps
   render standalone and are not in it, and the property is about the
   partial's own switch in any case.

   The failure this guards against is a silent one. Dropping the option
   from the include, or renaming it, puts the tag back on the payment step
   and nothing would say so — the page keeps working and keeps converting,
   it just resumes reporting a step it is not meant to.

   Asserted in BOTH directions, because a partial that has stopped
   emitting the tag anywhere at all would otherwise sail through the
   negative half by being uniformly empty. */
{
  const ejs = require('ejs');
  const partial = path.join(__dirname, '../../views/partials/analytics.ejs');
  const src = fs.readFileSync(partial, 'utf8');
  const locals = { googleAdsId: 'AW-TESTID', metaPixelId: '000' };
  const on = ejs.render(src, locals, { filename: partial });
  const off = ejs.render(src, { ...locals, googleAds: false }, { filename: partial });

  check('the Google tag renders where it is wanted',
    on.includes('AW-TESTID') && on.includes('window.gtag'));
  check('googleAds:false withholds the tag id', !off.includes('AW-TESTID'));
  check('googleAds:false withholds gtag() itself', !off.includes('window.gtag'));
  check('and leaves Meta and Clarity running',
    off.includes('fbevents.js') && off.includes('clarity.ms'));

  const view = (f) => fs.readFileSync(path.join(__dirname, '../../views/pages/', f), 'utf8');
  check('the payment step passes the opt-out',
    /include\(\s*'\.\.\/partials\/analytics'\s*,\s*\{\s*googleAds:\s*false\s*\}\s*\)/
      .test(view('checkout-token-step2.ejs')));
  check('step 1 still carries the tag',
    /include\(\s*'\.\.\/partials\/analytics'\s*\)/.test(view('checkout-token-step1.ejs')));
}

console.log(fails ? `\n${fails} check(s) FAILED` : `\nAll ${all.length} pages pass every check`);
process.exit(fails ? 1 : 0);
