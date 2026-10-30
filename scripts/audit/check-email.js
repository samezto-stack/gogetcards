/* Every transactional email, rendered in every state that changes it.
 *
 * Run:  node scripts/audit/check-email.js
 *
 * Email is the one thing this shop produces that it cannot take back.
 * A page with a bug gets refreshed; a confirmation that says "delivered
 * in 2 to 5 days" for a set that has not been printed sits in somebody's
 * inbox as written evidence of a promise.
 *
 * So the assertions here are mostly about WORDING, not markup: that a
 * preorder never carries a delivery estimate, that a refund is never
 * described as issued until it has been, that nothing renders the word
 * "undefined" at a customer. The markup checks that do exist are the
 * ones with a known failure mode in a real client — a missing bgcolor
 * attribute turns a dark email white in Outlook, a missing colour-scheme
 * declaration lets Gmail invert it.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
process.env.SITE_URL = 'https://zypheratcg.com';

const templates = require(path.join(ROOT, 'services/mail/templates'));
const view = require(path.join(ROOT, 'services/mail/view'));
const mailCfg = require(path.join(ROOT, 'config/mail'));
const company = require(path.join(ROOT, 'config/company'));

let passed = 0;
const failures = [];
function ok(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(label + (detail ? ' — ' + detail : ''));
  console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
}

/* ── Fixtures ───────────────────────────────────────────── */

/* THE SAME FIXTURES THE ADMIN PREVIEW USES. Two sets would drift, and
   the drift would be invisible: the preview would keep looking right
   while this kept passing, on different data. */
const samples = require(path.join(ROOT, 'services/mail/samples'));
const CASES = samples.CASES;
const ACCESS = samples.ACCESS_URL;

/* ── Render everything ──────────────────────────────────── */

const rendered = {};

console.log('rendering');
for (const [type, cases] of Object.entries(CASES)) {
  ok(`${type} is registered`, typeof templates[type] === 'object' && typeof templates[type].build === 'function');
  rendered[type] = {};
  for (const [label, data] of cases) {
    try {
      const out = templates[type].build(data);
      rendered[type][label] = out;

      ok(`${type} / ${label}: has a subject`, !!out.subject && out.subject.length < 120, out.subject);
      ok(`${type} / ${label}: has html`, !!out.html && out.html.length > 1500);
      ok(`${type} / ${label}: has a real text part`, !!out.text && out.text.length > 200);
      ok(`${type} / ${label}: no leaked placeholder in html`,
        !/undefined|\[object Object\]|NaN|\$NaN/.test(out.html));
      ok(`${type} / ${label}: no leaked placeholder in text`,
        !/undefined|\[object Object\]|NaN/.test(out.text));
      ok(`${type} / ${label}: no unresolved template literal`, !/\$\{/.test(out.html));
    } catch (err) {
      ok(`${type} / ${label}: renders`, false, err.message.split('\n')[0]);
      rendered[type][label] = { subject: '', html: '', text: '' };
    }
  }
}

const every = () => Object.values(rendered).flatMap((byLabel) => Object.entries(byLabel));

/* ── Wording: the promises we must not make ─────────────── */

console.log('wording');
{
  /* A PREORDER MUST NEVER CARRY A DELIVERY ESTIMATE. This is the single
     most expensive sentence this system could emit. */
  for (const [label, out] of Object.entries(rendered.preorderConfirmation)) {
    const both = out.html + out.text;
    ok(`preorder / ${label}: no delivery estimate`,
      !/\d\s*(to|-|–)\s*\d\s*business days|arrive in|delivered by|delivery date/i.test(both));
    /* The distinction that matters is TENSE. "We dispatch within one
       business day of the release arriving with us" is correct and
       useful; "your order has been dispatched" is a lie about a parcel
       that does not exist yet. Only the second kind is caught. */
    ok(`preorder / ${label}: never claims it is already in transit`,
      !/(has|have|was|were|is|are)\s+(been\s+)?(shipped|dispatched|sent out)|on its way|left our warehouse|in transit|out for delivery/i.test(both));
    ok(`preorder / ${label}: says the allocation is secured`, /secured/i.test(both));
  }
  /* And the in-stock one is allowed to, so the check above is testing
     the branch rather than the absence of the phrase everywhere. */
  ok('in-stock confirmation DOES give an estimate',
    /business days/i.test(rendered.orderConfirmation['in stock'].html));

  /* A preorder with no confirmed date must say so, not print a blank or
     invent one. */
  const noDate = rendered.preorderConfirmation['nothing announced yet'];
  ok('an unknown release date is stated as unknown',
    /not been announced|to be confirmed/i.test(noDate.html + noDate.text));

  /* REFUND WORDING. Only refundCompleted may say the money has gone. */
  const notYet = [rendered.cancellation['in stock'], rendered.refundInitiated['refund queued without a cancellation']];
  notYet.forEach((out, i) => {
    const both = out.html + out.text;
    ok(`queued refund ${i}: never claims it was issued`,
      !/has been (issued|sent|refunded|processed)|refund complete/i.test(both));
    ok(`queued refund ${i}: says it is being processed`, /being (refunded|returned|processed)/i.test(both));
    ok(`queued refund ${i}: gives the 7 to 10 day window`, /7 to 10 business days/i.test(both));
    ok(`queued refund ${i}: promises a second email`, /email you again/i.test(both));
  });
  const done = rendered.refundCompleted['issued'];
  ok('the completed refund DOES say it was issued', /has been issued|has left us/i.test(done.html));
  ok('and does not repeat the "being processed" hedge', !/is being refunded/i.test(done.html));

  /* Cancelling a preorder must mention the allocation; cancelling an
     in-stock order must not, because there is no allocation to release. */
  ok('a cancelled preorder mentions the allocation',
    /allocation/i.test(rendered.cancellation['preorder, allocation released'].html));
  ok('a cancelled in-stock order does not',
    !/allocation/i.test(rendered.cancellation['in stock'].html));

  /* Spam signals. These are transactional messages and must not read
     like promotions. */
  for (const [label, out] of every()) {
    const text = out.text || '';
    ok(`${label}: no exclamation marks`, !/!/.test(text.replace(/https?:\/\/\S+/g, '')));
    ok(`${label}: no shouted words`, !/\b(FREE|ACT NOW|LIMITED TIME|HURRY|BUY NOW|CLICK HERE)\b/.test(text));
    ok(`${label}: no fake urgency`, !/only \d+ left|ends (today|tonight|soon)|last chance/i.test(text));
    ok(`${label}: no emoji`, !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text));
    ok(`${label}: no marketing sign-off`, !/happy collecting|premium journey|we hope you love/i.test(text));
  }
}

/* ── Markup: the things that break in real clients ──────── */

console.log('markup');
for (const [label, out] of every()) {
  const html = out.html;
  if (!html) continue;

  /* LIGHT BASE, DARK VARIANT. The email was dark-only and Gmail's dark
     mode inverted it into a washed-out light message — Gmail ignores
     the colour-scheme opt-out that Apple Mail honours. A light base
     inverts gracefully instead, so both schemes are declared and the
     dark treatment is a media query rather than the default. */
  ok(`${label}: declares both colour schemes`,
    /name="color-scheme" content="light dark"/.test(html)
    && /name="supported-color-schemes" content="light dark"/.test(html));
  ok(`${label}: has a dark variant`, /@media \(prefers-color-scheme: dark\)/.test(html));

  /* Every themed element needs BOTH an inline light colour and a dm-
     class. One with only the inline style stays light inside the dark
     variant and arrives as a glaring patch. */
  const used = new Set([...html.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('dm-')));
  const defined = new Set([...html.matchAll(/\.(dm-[a-z]+)\s*\{/g)].map((m) => m[1]));
  const orphans = [...used].filter((c) => !defined.has(c));
  ok(`${label}: every dm- class has a dark rule`, orphans.length === 0, orphans.join(', '));
  ok(`${label}: the theme is actually applied`, used.size >= 6, `${used.size} classes used`);

  /* THE ONE THAT CATCHES A NEW MISTAKE. The orphan check above only
     finds a class with no rule; this finds the opposite and commoner
     error — an element given a hand-written colour and no class, which
     renders correctly in light mode and then sits in the dark variant
     as a light patch nobody notices until it is in somebody's inbox.
     White is exempt: it is the button label, deliberately the same in
     both schemes. */
  const bodyOnly = html.replace(/<style[\s\S]*?<\/style>/g, '');
  const unthemed = [...bodyOnly.matchAll(/<([a-z]+)\b([^>]*style="[^"]*color:\s*(#[0-9A-Fa-f]{3,6})[^"]*"[^>]*)>/g)]
    .filter((m) => !/^#(fff|ffffff)$/i.test(m[3]))
    .filter((m) => !/class="[^"]*\bdm-/.test(m[2]))
    .map((m) => `<${m[1]} ${m[3]}>`);
  ok(`${label}: no coloured element without a dark rule`, unthemed.length === 0,
    [...new Set(unthemed)].join(', '));

  /* Outlook on Windows ignores CSS background-color and honours the
     bgcolor attribute, and has no dark mode to opt into — so the
     attribute always carries the LIGHT value. */
  ok(`${label}: body carries a bgcolor attribute`, /<body[^>]*\bbgcolor="#[0-9A-Fa-f]{6}"/.test(html));
  const bgcolors = (html.match(/bgcolor="/g) || []).length;
  ok(`${label}: sections carry bgcolor too`, bgcolors >= 5, `${bgcolors} found`);

  /* A styled anchor loses its background in Outlook; a bgcolor table
     cell does not. */
  const buttons = (html.match(/<a href="[^"]*"[^>]*display:inline-block/g) || []).length;
  if (buttons) {
    ok(`${label}: buttons are table cells`,
      new RegExp('bgcolor="' + require(path.join(ROOT, 'services/mail/templates/layout')).C.accent + '"', 'i').test(html));
  }

  ok(`${label}: uses tables, not flexbox`, !/display:\s*(flex|grid)/.test(html));
  ok(`${label}: no external stylesheet`, !/<link[^>]+stylesheet/.test(html));
  ok(`${label}: no script`, !/<script/i.test(html));
  ok(`${label}: has a preheader`, /max-height:0;max-width:0;opacity:0/.test(html));
  ok(`${label}: 600px wrapper`, /width="600"/.test(html));

  /* Images are the loudest spam signal and the commonest reason a dark
     email arrives as a blank rectangle. At most one: the product. */
  const imgs = (html.match(/<img\s/g) || []).length;
  ok(`${label}: at most one image`, imgs <= 1, `${imgs} images`);

  /* Every link must be ours or the carrier's. A transactional email with
     a tracker pixel or a third-party CTA is how a domain gets a
     reputation it cannot shake. */
  const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const foreign = hrefs.filter((h) => !/^https:\/\/(zypheratcg\.com|tools\.usps\.com|ups\.com|www\.fedex\.com)/.test(h));
  ok(`${label}: no third-party links`, foreign.length === 0, foreign.join(', '));
  ok(`${label}: link count is modest`, hrefs.length <= 10, `${hrefs.length} links`);

  /* The footer identifies the business, which is both a trust signal and
     the thing a Merchant Center reviewer looks for. */
  ok(`${label}: names the business`, html.includes(company.business.tradingName));
  ok(`${label}: prints the postal address`, html.includes('El Segundo'));

  /* Two different footers, and asserting the wrong one on the wrong email
     is not a technicality.

     An order email is a service message about a purchase already made: it
     says so, and carries no unsubscribe link, because there is nothing to
     unsubscribe FROM — suppressing it would mean withholding a receipt or
     a shipping notice.

     An abandoned-checkout reminder is the opposite. Nobody asked for it,
     so it has to explain why it arrived and offer a way to stop. Printing
     "this is not marketing" on one would be a false statement in the one
     place a regulator looks first.

     This check used to demand the order-email sentence on every template,
     including the recovery ones, which correctly do not carry it. That is
     the audit being wrong about the product, not the product being wrong. */
  const isRecovery = /Unsubscribe from checkout reminders/.test(html);
  if (isRecovery) {
    ok(`${label}: explains why it arrived`, /you started a checkout/i.test(html));
    ok(`${label}: offers a way to stop`, /href="[^"]*unsubscribe/i.test(html));
    ok(`${label}: does not claim to be a service message`, !/not marketing/.test(html));
  } else {
    ok(`${label}: says it is not marketing`, /not marketing/.test(html));
    ok(`${label}: carries no unsubscribe link`, !/unsubscribe/i.test(html));
  }

  /* Escaping. The ampersand fixture proves customer data cannot inject. */
  ok(`${label}: no raw unescaped angle bracket in content`,
    !/>\s*<Bundle>/.test(html));
}

/* ── The access link ────────────────────────────────────── */

console.log('the access link');
for (const [label, out] of every()) {
  if (!out.html) continue;
  const hrefs = [...out.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

  /* Nothing identifying may ride in a URL: not an email address, not an
     order id, not a customer id. The access token is opaque and is the
     only thing that carries identity. */
  ok(`${label}: no email address in any link`, !hrefs.some((h) => /[?&/][^?&]*%40|@[\w.]+\.\w+/.test(h.replace(/^mailto:.*/, ''))));
  ok(`${label}: no order id in a query string`, !hrefs.some((h) => /[?&](order|order_id|orderId|id|email|customer)=/.test(h)));
}
ok('the access link is a path, not a query parameter', !ACCESS.includes('?'));

/* ── Configuration ──────────────────────────────────────── */

console.log('configuration');
{
  ok('From is a send-only address', /orders@zypheratcg\.com/.test(mailCfg.from()));
  ok('From carries a display name', /^"Zyphera TCG" </.test(mailCfg.from()));
  /* Replies must reach a human mailbox on Zoho, not the sending
     address. A bouncing Reply-To is a real deliverability penalty. */
  ok('Reply-To is the Zoho support mailbox', mailCfg.REPLY_TO === company.business.supportEmail);
  ok('Reply-To differs from From', mailCfg.REPLY_TO !== 'orders@zypheratcg.com');
  ok('the default host is ZeptoMail', mailCfg.HOST === 'smtp.zeptomail.com');
  ok('retries are bounded', mailCfg.RETRY_DELAYS_MS.length >= 2 && mailCfg.RETRY_DELAYS_MS.length <= 5);
  ok('every template has a label', templates.keys.every((k) => !!templates.LABELS[k]));
  ok('every registered template was exercised here',
    templates.keys.every((k) => !!CASES[k]), templates.keys.filter((k) => !CASES[k]).join(', '));
}

/* ── The wiring ─────────────────────────────────────────── */

console.log('wiring');
{
  const fs = require('fs');
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

  /* THE OLD PATH IS GONE, not merely unused. A second email module that
     sends without logging is one `require` away from being reintroduced
     by somebody who finds it and assumes it is the current one. */
  ok('the old emailService is deleted', !fs.existsSync(path.join(ROOT, 'services/orderPipeline/emailService.js')));
  const anyRef = ['services/orderPipeline/index.js', 'routes/account.js', 'routes/adminCustomers.js']
    .some((f) => /orderPipeline\/emailService|sendConfirmationEmail\(/.test(read(f)));
  ok('nothing references it any more', !anyRef);

  /* Every event the spec asks for is actually attached to something. */
  const pipeline = read('services/orderPipeline/index.js');
  ok('the confirmation fires from the verified-payment pipeline',
    /lifecycle\.orderConfirmation\(order\)/.test(pipeline));
  ok('and still behind the same one-shot claim',
    pipeline.indexOf('markConfirmationEmailSent') < pipeline.indexOf('lifecycle.orderConfirmation'));

  const admin = read('routes/adminCustomers.js');
  ok('dispatch sends the shipped email', /lifecycle\.shipped\(order\)/.test(admin));
  ok('tracking added later sends its own email', /lifecycle\.trackingAvailable\(order\)/.test(admin));
  /* Cancellation is no longer sent from this file — it moved into
     services/orderAdmin so the orders list and the customer page cannot
     disagree. Asserted below, where that service is checked. */
  ok('marking a refund owed emails the customer', /lifecycle\.refundInitiated\(order\)/.test(admin));
  ok('marking a refund sent emails the customer', /lifecycle\.refundCompleted\(order\)/.test(admin));

  /* Every one of those must fire on a TRANSITION. Sending on state
     instead means pressing Save twice mails the customer twice. */
  ok('shipping decisions are taken from a pre-save snapshot', /const wasShipped =/.test(admin));
  ok('refund decisions are taken from a pre-save snapshot',
    /const wasRefundStatus = order\.refundStatus/.test(admin));
  ok('a cancellation does not also send a refund-started email',
    /action === 'processing' && wasRefundStatus === 'none'/.test(admin));

  /* Cancellation now has one implementation, called from three places.
     Two implementations would eventually queue a refund from one button
     and not the other. */
  const orderAdmin = read('services/orderAdmin.js');
  ok('cancelling refuses a shipped order',
    /fulfillmentStatus === 'shipped' \|\| order\.fulfillmentStatus === 'delivered'[\s\S]{0,120}already_shipped/.test(orderAdmin));
  ok('cancelling twice is a no-op', /if \(order\.cancelledAt\) return \{ ok: true, changed: false/.test(orderAdmin));
  ok('it queues a refund rather than issuing one',
    /refundStatus = 'processing'/.test(orderAdmin) && !/refundStatus = 'refunded'/.test(orderAdmin));
  ok('it moves no money', !/stripe|whop|refunds?\.create/i.test(orderAdmin));
  ok('the email is part of the transition, not the caller\u2019s job',
    /lifecycle\.cancellation\(order\)\.catch/.test(orderAdmin));
  ok('and only on a real change',
    orderAdmin.indexOf('await order.save()') < orderAdmin.indexOf('lifecycle.cancellation'));

  ok('the orders list can cancel', /router\.post\('\/orders\/:id\/cancel'/.test(read('routes/admin.js')));
  ok('and goes through the one service', /orderAdmin\.cancelOrder\(order/.test(read('routes/admin.js')));
  ok('the customer page uses the same service', /orderAdmin\.cancelOrder\(order/.test(admin));
  ok('and no longer cancels inline', !/order\.cancelledBy = 'admin'/.test(admin));

  const account = read('routes/account.js');
  ok('customer cancellation emails them too', /lifecycle\.cancellation\(updated\)/.test(account));
  ok('the sign-in email goes through the logged sender', /mail\.send\('accountAccess'/.test(account));

  /* None of these may be awaited in a way that lets a mail failure fail
     the customer's action. */
  /* Four here — shipped, trackingAvailable, refundInitiated,
     refundCompleted. Cancellation is the fifth and lives in
     services/orderAdmin, checked below. */
  ok('lifecycle sends are fire-and-forget in the admin',
    (admin.match(/lifecycle\.\w+\(order[^)]*\)\.catch\(\(\) => \{\}\)/g) || []).length >= 4);
  ok('and in the customer cancel path', /lifecycle\.cancellation\(updated\)\.catch/.test(account));
}

/* ── The emailed link survives a scanner ────────────────── */

console.log('the emailed link');
{
  const account = require('fs').readFileSync(path.join(ROOT, 'routes/account.js'), 'utf8');

  /* A GET that consumes the token is a link Outlook Safe Links burns
     before the customer ever sees it. The consume must be a POST. */
  const getOpen = account.indexOf("router.get('/open/:token'");
  const postOpen = account.indexOf("router.post('/open/:token'");
  ok('there is a GET interstitial', getOpen > -1);
  ok('and a POST that consumes', postOpen > -1);
  /* Sliced to the handler rather than matched with a window, because a
     window wide enough to cover the GET body also reaches into the POST
     that follows it and reports a problem that is not there. */
  const getBody = account.slice(getOpen, postOpen);
  const postBody = account.slice(postOpen, account.indexOf("router.get('/sign-in/:token'"));
  ok('the GET does not consume the token', !/consumeMagicLink/.test(getBody), 'found in the GET handler');
  ok('the GET only renders', /res\.render\('pages\/account-open'/.test(getBody));
  ok('the POST does consume', /consumeMagicLink/.test(postBody));
  ok('the old sign-in path redirects rather than consuming',
    /router\.get\('\/sign-in\/:token'[\s\S]{0,200}?res\.redirect/.test(account));

  const auth = require(path.join(ROOT, 'services/customerAuth'));
  ok('an emailed order link outlives an interactive one',
    auth.ORDER_LINK_TTL_MS > auth.MAGIC_LINK_TTL_MS);
  ok('but not forever', auth.ORDER_LINK_TTL_MS <= 30 * 24 * 60 * 60 * 1000);
  ok('issueOrderLink exists', typeof auth.issueOrderLink === 'function');

  const view = require('fs').readFileSync(path.join(ROOT, 'views/pages/account-open.ejs'), 'utf8');
  /* Still a POST to the consume endpoint — the path is built through
     marketPath now, like every other form on the site, so the literal it
     used to match no longer appears. What must not change is the method
     and the endpoint: a GET here is a link a mail scanner can consume. */
  ok('the interstitial posts', /method="POST"[^>]*action="[^"]*\/account\/open\//.test(view));
  ok('and explains why it exists', /scanned/i.test(view));
}

/* ── No tracking pixel, ever ────────────────────────────── */

console.log('no tracking pixel');
{
  /* THE ASSERTION THAT PROTECTS INBOX PLACEMENT. Open tracking means a
     1x1 remote image with a per-recipient id — the classic spam-filter
     signature, because it is how a spammer confirms an address is live.
     It would also reverse the one-image rule these templates are built
     on. Engagement is measured from the link instead, which is a real
     person clicking and costs the email nothing.

     Written as an assertion rather than a comment because "just a tiny
     pixel for analytics" is the single likeliest well-meaning change
     somebody makes to this system. */
  for (const [label, out] of every()) {
    if (!out.html) continue;
    const imgs = [...out.html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    ok(`${label}: at most one image, still`, imgs.length <= 1, `${imgs.length}`);
    ok(`${label}: no 1x1 image`,
      !imgs.some((i) => /width="1"|height="1"|width:\s*1px|height:\s*1px/.test(i)));
    ok(`${label}: no hidden image`,
      !imgs.some((i) => /display:\s*none|visibility:\s*hidden|opacity:\s*0/.test(i)));
    /* The only image allowed is a product photo, on a real image host. */
    imgs.forEach((i) => {
      const src = (i.match(/src="([^"]*)"/) || [])[1] || '';
      ok(`${label}: the image is a product photo`,
        !/\b(open|track|pixel|beacon|o\.gif|t\.gif|1x1)\b/i.test(src), src.slice(0, 80));
    });
  }

  /* Comments stripped first: "tracking number" is a legitimate phrase in
     this file and matching the bare word made the check cry wolf. What
     is being looked for is beacon MARKUP, not the topic. */
  const src = require('fs').readFileSync(path.join(ROOT, 'services/mail/templates/layout.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('the layout renders no beacon',
    !/1x1|beacon|pixel\.gif|\bo\.gif|\bt\.gif|open\?.*=/i.test(src));

  /* And engagement IS measured, from the link. */
  const auth = require('fs').readFileSync(path.join(ROOT, 'services/customerAuth.js'), 'utf8');
  ok('a consumed link is attributed back to its email', /function attributeLink/.test(auth));
  ok('and only on first use', /linkOpenedAt: null/.test(auth));
  /* ATTRIBUTION LIVES IN THE SENDER, not in one caller. It was wired
     into the lifecycle events only, so a retried email and a test send
     both produced a link that could never be attributed — which on the
     admin page looks identical to a customer who never came back. */
  const send = require('fs').readFileSync(path.join(ROOT, 'services/mail/index.js'), 'utf8');
  ok('the link is tied to the log row inside send()', /emailLog: log\._id/.test(send));

  /* ── Recovery emails count too ──────────────────────────────────────
     The six-step sequence was the one family whose links went untracked:
     /admin/emails could say a reminder was delivered and nothing about
     whether it was used, so the emails with the most direct revenue claim
     were the only ones whose value could not be read off their own
     report — and an unused link looked exactly like an unsent one. */
  const rec = require('fs').readFileSync(path.join(ROOT, 'routes/checkoutRecovery.js'), 'utf8');
  ok('a used recovery link is attributed back to its email',
    /EmailLog\.updateOne/.test(rec) && /linkOpenedAt: now/.test(rec));
  ok('and only on first use, like the sign-in links',
    /linkOpenedAt: null/.test(rec));
  ok('the click is recorded before any branch, not only on the happy path',
    rec.indexOf('await recordClick(') < rec.indexOf('recoveryTokenExpiresAt < new Date()'));
  const lifecycle = require('fs').readFileSync(path.join(ROOT, 'services/mail/recoveryLifecycle.js'), 'utf8');
  ok('the reminder link names the step that sent it', /\?s=\$\{encodeURIComponent\(step\)\}/.test(lifecycle));
  ok('a link without that parameter still resolves to an email',
    /named \|\| latest/.test(rec));
  ok('and only when a link was actually carried', /if \(opts\.linkId\)/.test(send));
  const life = require('fs').readFileSync(path.join(ROOT, 'services/mail/lifecycle.js'), 'utf8');
  ok('the lifecycle no longer does it separately', !/emailLog: result\.logId/.test(life));
  ok('but still passes the link id through', /linkId,/.test(life));

  /* A test send used to mail the hardcoded sample token, so the button
     went nowhere and could never register. */
  const adminEmails = require('fs').readFileSync(path.join(ROOT, 'routes/adminEmails.js'), 'utf8');
  ok('a test send mints a real link', /issueMagicLink\(to, \{/.test(adminEmails));
  ok('and passes it to the sender', /mail\.send\(type, \{ to, data, linkId/.test(adminEmails));

  /* Deleting a row is possible; deleting a real one in bulk is not. */
  ok('a single row can be deleted', /router\.post\('\/:id\/delete'/.test(adminEmails));
  ok('the bulk clear is scoped to test sends only',
    /deleteMany\(\{ orderRef: 'SAMPLE' \}\)/.test(adminEmails));
  ok('and cannot be widened by a request parameter',
    !/deleteMany\(\{[^}]*req\.(body|query|params)/.test(adminEmails));
  const model = require('fs').readFileSync(path.join(ROOT, 'models/EmailLog.js'), 'utf8');
  ok('the field says what it is', /NOT AN OPEN/.test(model));
}

console.log(`\n${passed} assertions passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  • ' + f));
}
process.exit(failures.length ? 1 : 0);
