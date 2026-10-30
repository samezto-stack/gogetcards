/* ── Phone push notifications for new orders ──────────────
   A "cha-ching" on your phone the moment an order lands, without
   building and shipping an iOS app.

   Settings live in config/push.js, which carries the real values and
   still lets an environment variable override each one. Two providers
   are supported, both free, both plain HTTP; anything left unset is
   simply skipped.

   Bark (recommended for iPhone) — https://github.com/Finb/Bark
     Free, open source, on the App Store. Its API is a single HTTP POST.
     The reason it is the default here rather than ntfy is that it
     exposes two iOS features that matter for a sales alert:
       - a per-notification SOUND, including "paymentsuccess", which is
         the Apple Pay chime and the nearest built-in equivalent to
         Shopify's cash-register sound. Custom sounds can also be
         imported into the app itself.
       - CRITICAL ALERTS, which ring through silent mode and Do Not
         Disturb. Available via BARK_LEVEL=critical but off by default,
         because iOS stamps every critical alert with a red "CRITICAL"
         banner that cannot be turned off.
     Self-hosting is supported: point BARK_SERVER at your own instance.

   ntfy — https://ntfy.sh
     Free, open source, self-hostable, and works on Android as well as
     iOS. Sound control is coarser, so it is offered as an alternative
     or a second device rather than the default.

   Registered as a channel on services/orderPipeline/notificationService,
   so nothing in the order pipeline itself changes: the pipeline already
   calls every registered channel and already swallows a channel's
   failure. A push that fails can never affect whether an order is
   created or whether its confirmation email is sent.
*/

const site = require('../config/site');

const cfg = require('../config/push');
const markets = require('../config/markets');

const BRAND = cfg.brand || 'ZypheraTCG';
const DEFAULT_TIMEOUT_MS = 5000;

/** Money for humans: 389997 -> "$3,899.97". */
/* Through the storefront's own formatter, so an alert about a UK order
   reads £179.97 rather than "179.97 GBP" — the same figure the customer
   is looking at, in the same shape. */
function money(cents, currency = 'USD') {
  return markets.format(Number(cents || 0), currency || 'USD');
}

/**
 * How many units the order is for.
 *
 * Orders created by the checkout pipeline carry a single product and a
 * `quantity`. Orders imported from elsewhere may instead carry an `items`
 * array whose entries have their own quantities. Both shapes are handled,
 * because reporting "1 item" for a six-unit imported order would quietly
 * understate every one of them.
 */
function itemCount(order) {
  if (Array.isArray(order.items) && order.items.length) {
    const summed = order.items.reduce((n, it) => n + (Number(it && it.quantity) || 1), 0);
    if (summed > 0) return summed;
  }
  const qty = Number(order.quantity);
  if (Number.isFinite(qty) && qty > 0) return Math.round(qty);
  if (Array.isArray(order.products) && order.products.length) return order.products.length;
  return 1;
}

/** A short, readable description of what was bought. */
function describeOrder(order) {
  const product =
    order.productSlug ||
    (Array.isArray(order.products) && order.products[0]) ||
    'Order';
  const qty = itemCount(order);
  return qty > 1 ? `${product} x${qty}` : product;
}

async function postJson(url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends one push through every configured provider.
 * Never throws: a provider that fails is logged and the others still go.
 * @returns {Promise<{provider:string, ok:boolean, error?:string}[]>}
 */
async function sendPush({ title, body, url, group = 'Orders' }) {
  const results = [];
  const tasks = [];

  /* ── Bark ── */
  const barkKey = (cfg.bark.key || '').trim();
  if (barkKey) {
    const server = (cfg.bark.server || 'https://api.day.app').replace(/\/$/, '');
    /* POSTed as JSON rather than using Bark's /:key/:title/:body path
       form. A product name can contain slashes, colons and question
       marks ("One Piece TCG: OP-16 - Booster Box"), and putting that in a
       URL path either truncates the message or breaks the request
       outright. A JSON body has no such problem. */
    const payload = {
      device_key: barkKey,
      body,
      group,
      sound: (cfg.bark.sound || 'paymentsuccess').trim(),
      // See config/push.js. 'active' by default: an ordinary
      // notification with no banner, which plays the sound normally on a
      // phone whose ringer is on.
      level: cfg.bark.level || 'active',
      isArchive: 1,
    };
    // Critical-alert loudness, 1-10, independent of the ringer volume.
    // Ignored by Bark for non-critical levels.
    if (cfg.bark.level === 'critical' && Number.isFinite(cfg.bark.volume)
        && cfg.bark.volume >= 1 && cfg.bark.volume <= 10) {
      payload.volume = cfg.bark.volume;
    }
    if (title) payload.title = title;
    if (url) payload.url = url;
    if (cfg.bark.icon) payload.icon = cfg.bark.icon;

    tasks.push(
      postJson(`${server}/push`, payload)
        .then(() => results.push({ provider: 'bark', ok: true }))
        .catch((err) => {
          console.error('[pushNotify] Bark failed:', err.message);
          results.push({ provider: 'bark', ok: false, error: err.message });
        })
    );
  }

  /* ── ntfy ── */
  const ntfyTopic = (cfg.ntfy.topic || '').trim();
  if (ntfyTopic) {
    const server = (cfg.ntfy.server || 'https://ntfy.sh').replace(/\/$/, '');
    const headers = {};
    if (cfg.ntfy.token) headers.Authorization = `Bearer ${cfg.ntfy.token}`;
    const payload = { topic: ntfyTopic, message: body, priority: 4, tags: ['moneybag'] };
    if (title) payload.title = title;
    if (url) payload.click = url;

    tasks.push(
      postJson(server, payload, headers)
        .then(() => results.push({ provider: 'ntfy', ok: true }))
        .catch((err) => {
          console.error('[pushNotify] ntfy failed:', err.message);
          results.push({ provider: 'ntfy', ok: false, error: err.message });
        })
    );
  }

  if (tasks.length === 0) return [{ provider: 'none', ok: false, error: 'no_provider_configured' }];
  await Promise.all(tasks);
  return results;
}

/** True when at least one provider is configured. */
function isConfigured() {
  return !!((cfg.bark.key || '').trim() || (cfg.ntfy.topic || '').trim());
}

/** The notification for a real order. */
function buildOrderPush(order) {
  const count = itemCount(order);
  const noun = count === 1 ? 'item' : 'items';
  const amount = money(order.totalPrice, order.currency || 'USD');

  /* The channel clause is dropped rather than defaulted when the order
     has no resolved traffic source. Writing "from Direct" for an order
     whose source was never resolved would state something we do not
     know, and Direct is a real, distinct answer elsewhere in the admin —
     conflating the two would quietly inflate it. */
  const from = order.trafficSource ? ` from ${order.trafficSource}` : '';

  /* The sentence is split at the brand: the store name becomes the title
     and the rest becomes the body, so on screen it still reads as one
     sentence. Sending no title at all was worse in practice — iOS falls
     back to the app's own name for that bold line, so the notification
     led with "Bark" instead of the store. */
  const origin = site.origin();
  return {
    title: BRAND,
    body: `You have a new order for ${count} ${noun} totaling ${amount}${from}`,
    url: origin ? `${origin}/admin/orders` : undefined,
    group: 'Orders',
  };
}

/**
 * The notification for a payment that never became an order.
 *
 * A DIFFERENT SENTENCE FROM A NORMAL SALE, on purpose. This one needs
 * something done about it — the money arrived, the customer never reached
 * the confirmation page, and nothing downstream of /thank-you ran for them:
 * no confirmation email, no account, no order row to fulfil from. Reading
 * it as an ordinary "new order" would be the whole problem, so it says what
 * it is and links to the list that holds it.
 *
 * Its own group, so these do not stack into the Orders thread on the phone
 * and get swiped away with them.
 */
function buildPendingPaymentPush(pending) {
  const cents = toCents(pending && pending.price);
  const amount = Number.isFinite(cents)
    ? money(cents, (pending && pending.currency) || 'USD')
    : '';
  const forAmount = amount ? ` for ${amount}` : '';
  const origin = site.origin();
  return {
    title: BRAND,
    body: `Payment received${forAmount} but the customer never reached the confirmation page. No order was created — needs attention.`,
    url: origin ? `${origin}/admin/orders` : undefined,
    group: 'Unconfirmed',
  };
}

/* PendingPayment.price is the partner's string, as signed ("449.97").
   Anything unparseable yields NaN and the amount is left out of the
   sentence rather than printed as "$NaN". */
function toCents(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

/** Registers the push channel on the order pipeline's notifier. */
function register() {
  const { registerNotificationChannel } = require('./orderPipeline/notificationService');
  registerNotificationChannel({
    name: 'push',
    send: async (order) => {
      if (!isConfigured()) return; // nothing configured: silently no-op
      await sendPush(buildOrderPush(order));
    },
  });
}

module.exports = {
  register, sendPush, buildOrderPush, buildPendingPaymentPush,
  isConfigured, money, describeOrder, itemCount,
};
