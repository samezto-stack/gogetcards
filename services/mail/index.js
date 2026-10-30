/**
 * The one way an email leaves this application.
 *
 * WHAT WAS WRONG BEFORE: a send was a bare `transport.sendMail()` with
 * no record of the attempt, no retry, and a "did we send it" flag stored
 * on the Order. When SMTP was unconfigured — which it was, for the whole
 * life of the store, because the variables were never in .env.example —
 * every confirmation was written to stdout and dropped, and nothing
 * anywhere said so. Worse, the Order's flag was claimed BEFORE the send,
 * so a send that failed could never be retried: the flag said it had
 * already gone.
 *
 * So the log row is written FIRST, and the outcome is written onto it.
 * A row stuck in `pending` is a process that died mid-send; a row in
 * `skipped` is an environment with no transport; a row in `failed`
 * carries what the provider actually said. All three are visible in
 * /admin/emails and all three can be retried by hand.
 *
 * NOTHING HERE THROWS. Every caller is in the middle of something more
 * important than an email — confirming a payment, cancelling an order —
 * and none of them should fail because a mail server was slow. Callers
 * get a result object they are free to ignore, and the log has the
 * truth either way.
 */

const nodemailer = require('nodemailer');

const cfg = require('../../config/mail');
const EmailLog = require('../../models/EmailLog');
const templates = require('./templates');
const zeptoApi = require('./zeptoApi');

let cachedTransport = null;
let cachedKey = '';

/**
 * The SMTP transport, or null when this deploy has no credentials.
 *
 * Cached against the credentials themselves rather than a boolean, so
 * changing them without a restart takes effect — which matters the first
 * time somebody pastes a ZeptoMail key into Render and wants to know
 * whether it worked.
 */
function getTransport() {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return null;

  const key = `${cfg.HOST}:${cfg.PORT}:${SMTP_USER}:${SMTP_PASS.length}`;
  if (cachedTransport && cachedKey === key) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: cfg.HOST,
    port: cfg.PORT,
    /* 465 is implicit TLS; 587 starts plaintext and upgrades. Deriving
       this from the port rather than asking for it separately removes
       the commonest SMTP misconfiguration there is. */
    secure: cfg.PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: cfg.TIMEOUTS.connection,
    greetingTimeout: cfg.TIMEOUTS.greeting,
    socketTimeout: cfg.TIMEOUTS.socket,
  });
  cachedKey = key;
  return cachedTransport;
}

/**
 * Is there a working way to send at all, whichever transport is chosen?
 *
 * The two writers of an email — a payment confirming, an admin retrying —
 * should not each know whether this deploy talks SMTP or HTTPS. They ask
 * this, and `deliver` below routes to the right one.
 */
function deliveryConfigured() {
  /* Through module.exports so a test that stubs getTransport is honoured
     here too — the same convention partnerHealth uses for its sweep. */
  return cfg.useApi() ? zeptoApi.configured() : !!module.exports.getTransport();
}

/**
 * Hand one message to whichever transport is active, returning the same
 * `{ messageId, response }` either way. The API adapter is written to
 * nodemailer's contract precisely so this stays a one-line choice.
 */
async function deliver(message) {
  if (cfg.useApi()) return zeptoApi.send(message);
  const info = await module.exports.getTransport().sendMail(message);
  return { messageId: info.messageId, response: info.response };
}

/** Proves the credentials work, for the admin settings page. */
async function verifyTransport() {
  /* THE HTTPS API HAS NO VERIFY. There is no endpoint that authenticates
     without sending, so the honest report for API mode is "a token is
     present" — the test send on this same page is what actually proves it.
     Claiming more would put a green "Sending is live" over a bad token. */
  if (cfg.useApi()) {
    if (!zeptoApi.configured()) {
      return { ok: false, error: 'No ZeptoMail API token: set ZEPTOMAIL_TOKEN (or SMTP_PASS) and redeploy. See docs/email-setup.md.' };
    }
    return { ok: true, host: cfg.apiHost(), port: 443 };
  }
  const transport = getTransport();
  if (!transport) return { ok: false, error: 'SMTP_USER and SMTP_PASS are not set on this server.' };
  try {
    await transport.verify();
    return { ok: true, host: cfg.HOST, port: cfg.PORT };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A bare address, or '' if it is not one.
 *
 * Only used for Reply-To, which is the single header here whose value can
 * come from something a stranger typed into a form. Deliberately stricter
 * than real address syntax: no display name, no angle brackets, no commas,
 * no whitespace of any kind — so there is nothing to fold a second header
 * into, and nothing to turn one recipient into two.
 */
function safeAddress(input) {
  const a = String(input || '').trim();
  return /^[^\s<>,;:"()[\]\\]+@[^\s<>,;:"()[\]\\]+\.[^\s<>,;:"()[\]\\]+$/.test(a) ? a : '';
}

/**
 * List-Unsubscribe headers, for the mail that actually needs them.
 *
 * Only the checkout reminders carry an unsubscribe URL, and only they are
 * promotional. Order confirmations, shipping notices and refund notices are
 * service messages about a purchase already made — advertising an opt-out on
 * one would be offering to withhold somebody's receipt.
 *
 * WHY THESE MATTER. Gmail and Yahoo have required a working one-click
 * opt-out on promotional mail since February 2024, and a footer link alone
 * does not satisfy it: the client puts its OWN Unsubscribe button next to
 * the sender name when it sees these headers, and treats their absence on
 * promotional mail as a reason to distrust the sender. The domain that
 * reputation belongs to is the same one the order confirmations go out on,
 * so a reminder scoring badly costs receipts, not just reminders.
 *
 * The URL is refused unless it is an https URL with no CR or LF in it. It is
 * built server-side from an HMAC token so it cannot currently contain
 * either, but a header value assembled from anything but a literal is how
 * header injection happens, and the check costs nothing.
 */
function unsubscribeHeaders(opts) {
  const url = String((opts && opts.data && opts.data.unsubscribeUrl) || '').trim();
  if (!url || !/^https:\/\/[^\s<>]+$/.test(url) || /[\r\n]/.test(url)) return {};
  return {
    'List-Unsubscribe': `<${url}>`,
    /* RFC 8058. Only claim one-click where it is genuinely served — see the
       POST handler in routes/checkoutRecovery.js. Advertising it without an
       endpoint is worse than omitting it. */
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Renders a template and sends it, recording every attempt.
 *
 * @param {string} type   a key in services/mail/templates
 * @param {object} opts
 * @param {string} opts.to        recipient address
 * @param {object} opts.data      template variables
 * @param {string} [opts.orderId] joins the log row back to the Order
 * @param {string} [opts.orderRef] the ZTCG- reference, for the admin log
 * @param {object} [opts.customer] Customer id, for the admin log
 * @param {object} [opts.linkId] the MagicLink carried in this message
 * @param {object} [opts.retryOf] the EmailLog row this replaces
 * @param {string} [opts.replyTo] overrides the support Reply-To. Used by the
 *   contact-form notification, which goes TO support and should reply to the
 *   customer — a Reply-To of support on a message already in the support
 *   inbox makes the reply go to ourselves.
 * @returns {Promise<{ok: boolean, status: string, logId?: string, error?: string}>}
 */
async function send(type, opts = {}) {
  /* `templates` also carries LABELS and helpers, so the check is for a
     usable template rather than for a truthy key — otherwise a typo'd
     type could resolve to the labels object and fail deep inside. */
  const template = templates[type];
  if (!template || typeof template.build !== 'function') {
    console.error(`[mail] unknown template "${type}"`);
    return { ok: false, status: 'failed', error: `Unknown template: ${type}` };
  }

  const to = String(opts.to || '').trim();
  let log = null;

  try {
    /* Rendering first, so a template that throws is recorded as a failed
       message rather than as an exception in whatever called us. */
    const rendered = template.build(opts.data || {});

    log = await EmailLog.create({
      type,
      to,
      subject: rendered.subject,
      orderId: opts.orderId || '',
      orderRef: opts.orderRef || '',
      customer: opts.customer || null,
      /* A broadcast row being sent replaces its `queued` row through the
         same retryOf path, but it is not a retry — nothing failed — so it
         does not wear the retry chip in the log. */
      retriedFrom: opts.broadcast ? null : (opts.retryOf || null),
      /* Which campaign, and which orders, so the admin can count what a
         run has sent and the enqueue can refuse to send it twice. */
      broadcast: opts.broadcast || null,
      status: 'pending',
    });

    /* THE ROW THIS ONE REPLACES IS REMOVED.
     *
     * A retry is another attempt at the same message, not a second
     * message, so the log keeps one row per message showing the latest
     * attempt rather than one row per attempt. The alternative — keeping
     * the superseded row — meant the failure count could only ever grow:
     * a customer whose confirmation was retried successfully still left a
     * permanent red row behind, and /admin/emails looked identical after
     * a retry that had worked. There is no reading of that list which
     * answers "who is still waiting".
     *
     * It also stops the queue eating its own tail. A retry that fails
     * again while the provider is still refusing is itself a failed row,
     * so without the delete each press of "Retry all" would pick up the
     * originals AND every retry of them, sending more each round.
     *
     * Deleted only once the replacement row exists, so a crash between
     * the two leaves the original intact rather than losing the message
     * entirely. The provider's response for the earlier attempt is what
     * is lost; the customer's current state is what is kept. */
    if (opts.retryOf) {
      await EmailLog.deleteOne({ _id: opts.retryOf })
        .catch((err) => console.error('[mail] could not remove the superseded row:', err.message));
    }

    if (!to || !to.includes('@')) {
      await finish(log, { status: 'skipped', error: 'No usable email address on this record.' });
      return { ok: false, status: 'skipped', logId: String(log._id) };
    }

    if (!deliveryConfigured()) {
      await finish(log, {
        status: 'skipped',
        error: 'No mail credentials on this server, so nothing was sent. See docs/email-setup.md.',
      });
      console.warn(`[mail] ${type} for ${to} was NOT sent: mail is not configured.`);
      return { ok: false, status: 'skipped', logId: String(log._id) };
    }

    const message = {
      from: cfg.from(),
      to,
      /* Replies reach a human at Zoho rather than the send-only address.
         A Reply-To that bounces is a real deliverability penalty, and a
         customer who replies to a confirmation and hears nothing is a
         support ticket that did not need to exist.

         Overridable for the one case where the default is wrong: the
         contact-form notification is addressed TO support, so pointing its
         Reply-To at support would send the reply to ourselves instead of to
         the customer who wrote in. Validated the same way the unsubscribe
         URL is — an address with a CR or LF in it is header injection, and
         this one is the only header value derived from a form field. */
      replyTo: safeAddress(opts.replyTo) || cfg.REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      /* Always both parts. A multipart message with a real plain-text
         alternative scores better with every filter there is, and it is
         what a screen reader and a watch notification actually show. */
      text: rendered.text,
      headers: {
        /* RFC 3834. Stops out-of-office autoresponders replying to us,
           which otherwise fills the support inbox and, over time, looks
           like a conversation with a machine. */
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        ...unsubscribeHeaders(opts),
      },
    };

    let lastError = null;
    for (let attempt = 1; attempt <= cfg.RETRY_DELAYS_MS.length + 1; attempt++) {
      try {
        const info = await deliver(message);
        await finish(log, {
          status: 'sent',
          attempts: attempt,
          messageId: info.messageId || '',
          providerResponse: String(info.response || '').slice(0, 500),
          sentAt: new Date(),
        });
        /* Tie the access link to the row it went out in, so that when
           the customer clicks it we can mark THIS email as opened.

           IT LIVES HERE, not in the caller, because there are three
           callers — the lifecycle events, the admin retry and the test
           send — and it was previously only wired into the first. A
           retried email's link was silently unattributable, which looks
           exactly like a customer who never came back. */
        if (opts.linkId) {
          require('../../models/MagicLink')
            .updateOne({ _id: opts.linkId }, { $set: { emailLog: log._id } })
            .catch((err) => console.error('[mail] could not attribute link:', err.message));
        }
        return { ok: true, status: 'sent', logId: String(log._id) };
      } catch (err) {
        lastError = err;
        await EmailLog.updateOne({ _id: log._id }, {
          $set: { attempts: attempt, lastAttemptAt: new Date(), error: err.message.slice(0, 500) },
        }).catch(() => {});

        /* A rejected recipient or a refused message will be rejected
           and refused again in five seconds. Retrying a permanent
           failure only delays the moment somebody notices it. */
        if (isPermanent(err) || attempt > cfg.RETRY_DELAYS_MS.length) break;
        await wait(cfg.RETRY_DELAYS_MS[attempt - 1]);
      }
    }

    await finish(log, {
      status: 'failed',
      error: (lastError && lastError.message || 'Unknown error').slice(0, 500),
      providerResponse: String((lastError && lastError.response) || '').slice(0, 500),
    });
    console.error(`[mail] ${type} to ${to} failed:`, lastError && lastError.message);
    return { ok: false, status: 'failed', logId: String(log._id), error: lastError && lastError.message };

  } catch (err) {
    /* The catch of last resort. Anything that lands here — a template
       that threw, a database that went away — must still not propagate. */
    console.error(`[mail] ${type} threw:`, err.message);
    if (log) await finish(log, { status: 'failed', error: err.message.slice(0, 500) }).catch(() => {});
    return { ok: false, status: 'failed', error: err.message };
  }
}

/**
 * Sends only if this exact message has never been sent for this order.
 *
 * The guard against a second confirmation for one payment, and against a
 * second dispatch notice when an admin re-saves a tracking number to fix
 * a typo. Idempotency lives on the EMAIL LOG rather than on the Order,
 * because the question is about the message: an order has many kinds of
 * email over its life and one boolean cannot answer for all of them.
 */
async function sendOnce(type, opts = {}) {
  try {
    if (opts.orderId && await EmailLog.alreadySent(type, opts.orderId)) {
      return { ok: true, status: 'duplicate' };
    }
  } catch (err) {
    /* If the check itself fails, send. A duplicate confirmation is
       mildly embarrassing; a missing one costs a support ticket and
       some trust. */
    console.error('[mail] duplicate check failed, sending anyway:', err.message);
  }
  return send(type, opts);
}

/**
 * Should the retry loop give up on this error?
 *
 * The HTTPS API adapter already classified its own failures — a 4xx is our
 * mistake, a 5xx or network blip is not — and says so on `err.permanent`,
 * which wins because HTTP status codes mean the opposite of SMTP ones (a
 * 5xx over SMTP is a rejected recipient; a 5xx over HTTP is the server
 * having a bad minute). For SMTP there is no flag, so fall back to the
 * reply code: 5xx there really is the sender's problem and will not fix
 * itself in five seconds.
 */
function isPermanent(err) {
  if (err && typeof err.permanent === 'boolean') return err.permanent;
  const code = Number(err && err.responseCode);
  if (code >= 500 && code < 600) return true;
  return /EAUTH|EENVELOPE|Invalid login|no recipients/i.test(String(err && err.message));
}

function finish(log, fields) {
  return EmailLog.updateOne({ _id: log._id }, {
    $set: Object.assign({ lastAttemptAt: new Date() }, fields),
  });
}

module.exports = { send, sendOnce, getTransport, verifyTransport, templates };
