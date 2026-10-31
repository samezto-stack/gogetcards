/*
 * Does a localised storefront stay localised?
 *
 * THE FAILURE THIS EXISTS FOR. A shopper picked Canada, clicked a
 * collection, and was returned to the US store in US dollars — because
 * every internal link in the templates was written as a bare absolute
 * path. Paid traffic landed on /ca, took one navigation, and was quietly
 * back on a page whose prices the Canadian campaign was not selling.
 *
 * Nothing about that is visible from a single page render. It only shows
 * up when you follow a link, which is what this does: render each market's
 * pages and assert that every link out of them stays inside the market,
 * and that no money on the page is printed in another currency's symbol.
 *
 * Run:  node scripts/audit/check-market-leaks.js
 */
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const markets = require(path.join(ROOT, 'config/markets'));
const marketService = require(path.join(ROOT, 'services/market'));

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

const PRODUCT = {
  slug: 'op-18', title: 'One Piece OP-18 Booster Box', productType: 'Booster Box',
  vendor: 'Bandai', price: 22497, comparePrice: 24999, stock: 4, available: true,
  imageUrl: 'https://example.com/a.jpg', tags: ['one-piece'], collections: ['op'],
  marketPrices: [
    { market: 'CA', amount: 32997, compareAmount: 35999, available: true },
    { market: 'UK', amount: 17997, compareAmount: 19999, available: true },
    { market: 'EU', amount: 20997, compareAmount: 22999, available: true },
  ],
};

/* Every currency symbol that is NOT this market's. A page in one market
   printing another's symbol is the bug in its most literal form. */
const SYMBOLS = { USD: 'US$', CAD: 'CA$', GBP: '£', EUR: '€' };

function localsFor(market) {
  return {
    market,
    sellableMarkets: markets.configured(),
    marketPath: (p) => markets.path(market, p),
    marketMoney: (a, c) => markets.format(a, c || market.currency),
    marketPrice: (p) => marketService.priceFor(p, market),
    marketSuggestion: null,
    cartMarket: null,
    formatPrice: (c) => (c / 100).toFixed(2),
    productImage: { attrs: () => 'src="x"' },
    preorder: { shortLine: () => '' },
    /* Enough of the page's furniture for the shared partials to render. */
    cart: { items: [], totalItems: 0, totalPrice: 0 },
    currentPath: '/',
    currentYear: 2026,
    settings: {},
    collections: [],
    company: require(path.join(ROOT, 'config/company')),
    catalog: require(path.join(ROOT, 'config/catalog')),
    jsonForScript: require(path.join(ROOT, 'helpers/jsonForScript')),
    shippingCopy: require(path.join(ROOT, 'config/shipping')).copy,
    returnWindowDays: require(path.join(ROOT, 'config/faq')).RETURN_WINDOW_DAYS,
    payments: require(path.join(ROOT, 'config/payments')),
  };
}

/* The header, the footer and the hero are where the collection links the
   customer actually clicked live — the card was only the first one found.
   Anything that renders an internal link belongs in this list. */
const VIEWS = [
  ['product card', 'views/partials/product-card.ejs', () => ({ product: PRODUCT })],
  ['header', 'views/partials/header.ejs', () => ({})],
  ['footer', 'views/partials/footer.ejs', () => ({})],
  ['hero', 'views/partials/hero.ejs', () => ({})],
  ['collection grid', 'views/partials/collection-grid.ejs', () => ({})],
  ['cart drawer', 'views/partials/cart-drawer.ejs', () => ({})],
];

/* The Buy form lives on the product page, which needs more furniture than
   the partials do. Rendered separately so the list above stays simple. */
const PRODUCT_VIEW = 'views/pages/product.ejs';

for (const market of markets.configured()) {
  const locals = localsFor(market);
  const prefix = market.prefix ? `/${market.prefix}` : '';

  for (const [label, file, extra] of VIEWS) {
    const full = path.join(ROOT, file);
    let html = '';
    try {
      html = ejs.render(fs.readFileSync(full, 'utf8'), { ...locals, ...extra(market) }, { filename: full });
    } catch (e) {
      check(`${market.id} ${label} renders`, false, e.message.split('\n')[0]);
      continue;
    }

    /* Every internal href must start with this market's prefix — except
       the market selector's own links, which exist precisely to leave it.
       Cut that block out rather than allow-listing the paths, so a link
       that escapes from anywhere else is still caught. */
    const body = html.replace(/<details class="mkt">[\s\S]*?<\/details>/g, '');
    const hrefs = [...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    const escaped = hrefs.filter((h) => !h.startsWith(prefix + '/') && h !== (prefix || '/'));
    check(`${market.id} ${label}: every link stays in the market`,
      escaped.length === 0, escaped.join(' '));

    /* ── AND EVERY FORM ACTION ──────────────────────────────────────
       Checking href alone missed the one that mattered most. The Buy
       button is a form posting to /checkout/start, and posting to the
       bare path meant the request never carried the prefix — so
       middleware/market resolved the default market, the session was
       created in USD, and a shopper who read £119.98 on the product page
       was quoted US$149.98 at the payment step. The money was wrong, not
       just the symbol. /api is exempt: it is market-neutral and sits
       ahead of the middleware. */
    const actions = [...body.matchAll(/action="(\/[^"]*)"/g)].map((m) => m[1])
      .filter((a) => !a.startsWith('/api'));
    const escapedActions = actions.filter((a) => !a.startsWith(prefix + '/') && a !== (prefix || '/'));
    check(`${market.id} ${label}: every form posts inside the market`,
      escapedActions.length === 0, escapedActions.join(' '));

    /* And no other market's money symbol appears. */
    const foreign = Object.entries(SYMBOLS)
      .filter(([code]) => code !== market.currency)
      .filter(([, sym]) => body.includes(sym))
      /* US$ contains $, and CA$ does too — compare on the full prefix only. */
      .map(([code]) => code);
    check(`${market.id} ${label}: prices carry no other currency`,
      foreign.length === 0, foreign.join(', '));
  }

  /* The market's own price is the one shown. */
  const priced = marketService.priceFor(PRODUCT, market);
  check(`${market.id}: the product is priced in ${market.currency}`,
    !!priced && priced.currency === market.currency,
    priced ? priced.currency : 'not sold');
}

/* ── The Buy button, per market ─────────────────────────────────────
   Static, because rendering the whole product page needs half the app.
   The assertion is the same one the loop above makes: the form that
   starts a checkout must post inside the market, or the session is
   created in the wrong currency. */
{
  const src = fs.readFileSync(path.join(ROOT, PRODUCT_VIEW), 'utf8');
  check('the Buy form posts through marketPath',
    /action="<%= marketPath\('\/checkout\/start'\) %>"/.test(src),
    (src.match(/action="[^"]*checkout\/start[^"]*"/) || ['not found'])[0]);
}

/* ── And the redirects that follow it ───────────────────────────────
   A 303 to a bare /checkout/<token> keeps the session's currency — the
   market is pinned on the session — but lands the buyer on a URL that
   says the default store, with a header and links to match. */
{
  const flow = fs.readFileSync(path.join(ROOT, 'routes/checkoutFlow.js'), 'utf8');
  const bare = [...flow.matchAll(/res\.redirect\(30\d, `\/checkout\/[^`]*`\)/g)].map((m) => m[0]);
  check('no checkout redirect drops the market prefix', bare.length === 0, bare.join(' | '));
  check('checkout redirects build their path from req.market', /function mpath\(req, p\)/.test(flow));
}

/* The one link that MUST leave the market: the selector itself. A store
   whose currency switcher pointed back at the market you were already in
   would be unswitchable. */
for (const market of markets.configured()) {
  const full = path.join(ROOT, 'views/partials/market-selector.ejs');
  const html = ejs.render(fs.readFileSync(full, 'utf8'), localsFor(market), { filename: full });
  const others = markets.configured().filter((m) => m.id !== market.id);
  const offered = others.every((m) => html.includes(`href="${m.prefix ? '/' + m.prefix : '/'}"`));
  check(`${market.id}: the selector offers every other market`, offered);
}

/* marketPath itself: the property every link now leans on. */
for (const market of markets.configured()) {
  const p = markets.path(market, '/collection/one-piece');
  const want = market.prefix ? `/${market.prefix}/collection/one-piece` : '/collection/one-piece';
  check(`${market.id}: marketPath builds ${want}`, p === want, p);
}

/* The client-side money formatter must agree with the server's, or the
   mobile buy bar prints one figure and the page above it another. */
const clientJs = fs.readFileSync(path.join(ROOT, 'public/js/gogetcards.js'), 'utf8');
check('the mobile buy bar formats money per currency, not always in dollars',
  /MONEY_PREFIX/.test(clientJs) && !/return '\$' \+ \(cents/.test(clientJs));
check('and reads the currency from the button',
  /data-currency/.test(clientJs));
const productView = fs.readFileSync(path.join(ROOT, 'views/pages/product.ejs'), 'utf8');
check('which the product page supplies', /data-currency="/.test(productView));

/* The checkout steps price in the market that will be charged. */
const flow = fs.readFileSync(path.join(ROOT, 'routes/checkoutFlow.js'), 'utf8');
check('the checkout steps do not hardcode dollars',
  !/money: \(c\) => '\$'/.test(flow) && /money: moneyFor\(ctx\)/.test(flow));
check('and take the currency from the priced result',
  /ctx\.priced && ctx\.priced\.currency/.test(flow));

/* ── Order history is in the currency it was CHARGED in ─────────────
   The thank-you page and the account portal show what a customer paid.
   That figure belongs to the order, not to the storefront being viewed —
   a UK order is pounds even when they open their account from the US
   site months later. Every one of those pages defined its own money
   helper as '$' + amount + (code unless USD), so a pound order rendered
   as "$119.98 GBP": a dollar sign in front of a figure that is not
   dollars, on the screens where a buyer checks against their bank. */
{
  const ORDER_VIEWS = ['thank-you', 'account', 'account-order', 'account-orders', 'account-cancel'];
  for (const v of ORDER_VIEWS) {
    const src = fs.readFileSync(path.join(ROOT, 'views/pages', v + '.ejs'), 'utf8');
    check(`${v}: money is not hardcoded to dollars`,
      !/const money = \(c(?:ents)?, cur\) => `\$/.test(src) && /marketMoney/.test(src));
    check(`${v}: no amount is printed with a bare dollar sign`,
      !/">\$<%=|>\$<%= (value|order|o)\./.test(src));
  }

  /* And the helper renders each currency the way the rest of the site
     does, rather than appending a code to a dollar figure. */
  const money = (c, cur) => markets.format(Number(c || 0), cur || 'USD');
  check('an order helper renders GBP as pounds', money(11998, 'GBP') === '£119.98', money(11998, 'GBP'));
  check('and CAD distinguishably from USD',
    money(21998, 'CAD') === 'CA$219.98' && money(14998, 'USD') === 'US$149.98',
    money(21998, 'CAD') + ' / ' + money(14998, 'USD'));
}

/* ── The emails a buyer keeps ───────────────────────────────────────
   Every template builds its totals through one helper in
   services/mail/templates/layout.js, and that helper used to prefix a
   dollar sign to everything and append the code when it was not USD. A
   UK buyer's order confirmation therefore read "$179.97 GBP", and so did
   their refund notice and every abandoned-checkout reminder — the three
   messages they keep and check against their bank.

   Asserted against the real module rather than a copy of it, because a
   copy is exactly what stopped the block above from catching this. */
{
  const L = require(path.join(ROOT, 'services/mail/templates/layout.js'));
  check('order emails render GBP as pounds',
    L.money(17997, 'GBP') === '£179.97', L.money(17997, 'GBP'));
  check('and EUR as euros',
    L.money(20997, 'EUR') === '€209.97', L.money(20997, 'EUR'));
  check('and CAD distinguishably from USD',
    L.money(32997, 'CAD') === 'CA$329.97' && L.money(22497, 'USD') === 'US$224.97',
    L.money(32997, 'CAD') + ' / ' + L.money(22497, 'USD'));
  check('and never put a bare dollar sign on a non-dollar amount',
    ['GBP', 'EUR'].every((c) => !L.money(9999, c).includes('$')),
    ['GBP', 'EUR'].map((c) => L.money(9999, c)).join(' / '));
  check('with a missing currency falling back to the default market',
    L.money(7499, '') === 'US$74.99', L.money(7499, ''));
}

/* ── The admin screens you reconcile against ────────────────────────
   Several admin views defined their own `'$' + amount` helper, so a
   Belgian order for 69.99 EUR read "$69.99" on the orders list, on the
   customer page and in the push notification — the right number wearing
   the wrong currency, on exactly the screens used to check against the
   payment provider.

   Per-order amounts must carry the order's own currency. Aggregates that
   sum across currencies are a separate problem and are not asserted here;
   see the note in routes/admin.js. */
{
  const PER_ORDER = [
    ['orders.ejs', /money\(order\.totalPrice, order\.currency\)/],
    ['customer.ejs', /locals\.money\(/],
    ['preorder-detail.ejs', /locals\.money\(/],
  ];
  for (const [file, wanted] of PER_ORDER) {
    const src = fs.readFileSync(path.join(ROOT, 'views/admin', file), 'utf8');
    check(`admin ${file}: order totals carry the order's currency`, wanted.test(src));
    check(`admin ${file}: no hand-rolled dollar helper`,
      !/const money = \([^)]*\) => `?\$/.test(src));
  }

  /* And the helper every admin router hands the views is the shared one.
     It lives at app level because the admin is seven routers and the
     others mount ahead of the catch-all, so a router.use inside any one
     of them would reach only its own pages. */
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  check('the admin money helper is mounted for every admin router',
    /app\.use\('\/admin', \(req, res, next\) => \{[\s\S]{0,220}res\.locals\.money/.test(server));
  check('and it is built from markets.format',
    /res\.locals\.money = \(cents, currency\) =>\s*\n?\s*markets\.format/.test(server));

  /* Push notifications go to a phone and are the first thing seen. */
  const push = fs.readFileSync(path.join(ROOT, 'services/pushNotify.js'), 'utf8');
  check('push notifications format through markets.format',
    /return markets\.format\(/.test(push));
  check('and no longer bolt a dollar sign onto every amount',
    !/currency === 'USD' \? `\$/.test(push));
}

/* ── An abandoned checkout belongs to a market ──────────────────────
   A UK checkout saved at £179.97 was re-priced against the base USD
   figure of 224.97 before every send, differed every time, and stopped
   itself with "price changed". No customer outside the US could ever
   receive a recovery email, and the row sat expired showing a price that
   had never moved. The comparison has to happen in one storefront. */
{
  const svc = fs.readFileSync(path.join(ROOT, 'services/abandonedCheckout/index.js'), 'utf8');
  check('the re-price reads the market off the row',
    /markets\.byId\(doc\.market\)/.test(svc));
  check('and compares against that market\'s price, not the base one',
    /marketService\.priceFor\(product, market\)/.test(svc) && !/const liveCents = Number\(product\.price\)/.test(svc));

  const model = fs.readFileSync(path.join(ROOT, 'models/AbandonedCheckout.js'), 'utf8');
  check('the row records which storefront it happened in', /market: \{ type: String/.test(model));

  const flow = fs.readFileSync(path.join(ROOT, 'routes/checkoutFlow.js'), 'utf8');
  check('and capture is given it', /market: session\.market/.test(flow));

  /* The reminder has to send them back where they were. */
  const life = fs.readFileSync(path.join(ROOT, 'services/mail/recoveryLifecycle.js'), 'utf8');
  check('the reminder link carries the market prefix',
    /markets\.path\(market, `\/checkout\/recover/.test(life));
  check('and the reminder quotes the market\'s own price',
    /marketService\.priceFor\(product, market\)/.test(life)
    && !/Number\(product\.price\) : toCents/.test(life));

  const rec = fs.readFileSync(path.join(ROOT, 'routes/checkoutRecovery.js'), 'utf8');
  const bareRedirects = [...rec.matchAll(/res\.redirect\(302, `\$\{origin\}\/[^`]*`\)/g)].map((m) => m[0]);
  check('every recovery redirect lands in the buyer\'s market',
    bareRedirects.length === 0, bareRedirects.join(' | '));

  /* And the admin list shows each row in its own currency. */
  const view = fs.readFileSync(path.join(ROOT, 'views/admin/abandoned.ejs'), 'utf8');
  check('the abandoned list prints each total in its own currency',
    /r\.currency\)/.test(view) && !/'\$' \+ r\.total/.test(view));
}

/* ── Assets must NOT be prefixed ────────────────────────────────────
   express.static is mounted before the market middleware, so it never
   sees the rewritten path: /uk/css/checkout.css is a 404, not a
   stylesheet. A blanket link rewrite catches these, and the result is a
   market page with no CSS at all — which is what happened, and what this
   assertion exists to stop happening again. */
{
  const assetLinked = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ejs')) continue;
      const body = fs.readFileSync(full, 'utf8');
      if (/marketPath\('\/(css|js|images|img|fonts|assets)\//.test(body)) {
        assetLinked.push(path.relative(ROOT, full));
      }
    }
  };
  walk(path.join(ROOT, 'views'));
  check('no static asset URL is built through marketPath',
    assetLinked.length === 0, assetLinked.join(', '));
}

/* Flags render as SVG, because emoji flags do not render at all on
   Windows — the platform most of this traffic is on. */
const selector = fs.readFileSync(path.join(ROOT, 'views/partials/market-selector.ejs'), 'utf8');
check('the market selector draws flags as SVG, not emoji',
  /include\('flag'/.test(selector) && !/\.flag %>/.test(selector));

console.log(fails ? `\n${fails} market-leak check(s) FAILED` : '\nNo market leaks');
process.exit(fails ? 1 : 0);
