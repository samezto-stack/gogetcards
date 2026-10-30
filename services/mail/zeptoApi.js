/**
 * Sending mail over ZeptoMail's HTTPS API instead of SMTP.
 *
 * WHY THIS FILE EXISTS. The hosts this store runs on block outbound SMTP —
 * Render outright, Railway on every plan below Pro — so a socket to
 * smtp.zeptomail.com never opens and every message times out unsent. Port
 * 443 is not blocked by anyone, so the same mail goes out over ZeptoMail's
 * REST API, which is what both ZeptoMail and Railway tell you to do here.
 *
 * IT SPEAKS THE SAME LANGUAGE AS NODEMAILER. services/mail/index.js does not
 * know or care which transport it is using: this exposes `send(message)`
 * taking the very object index.js already builds for `transport.sendMail`,
 * and returns `{ messageId, response }` the way `sendMail` does. A failure
 * throws an Error carrying `responseCode` and, crucially, `permanent` — so
 * the retry loop in index.js can tell "the token is wrong, stop" from "the
 * API had a bad minute, try again" without knowing anything about HTTP.
 *
 * NOTHING SECRET LEAVES IN A URL. The token travels in the Authorization
 * header, the recipient and body in the JSON payload, exactly as ZeptoMail
 * requires — there is no query string.
 */

const cfg = require('../../config/mail');

/** True when there is a token to authenticate with. */
function configured() {
  return !!cfg.API_TOKEN;
}

/**
 * Custom headers ZeptoMail carries verbatim.
 *
 * The same List-Unsubscribe / Auto-Submitted headers index.js sets for
 * SMTP, handed to the API through its `mime_headers` field so promotional
 * reminders keep their one-click opt-out and service mail keeps suppressing
 * autoresponders. index.js has already validated every value (the
 * unsubscribe URL is HMAC-built and CRLF-checked), and JSON encoding cannot
 * fold a second header in the way a raw SMTP header can, so there is nothing
 * left to sanitise here.
 */
function mimeHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * The message ZeptoMail actually returns lives under `data`, but the shape
 * has moved between versions and a failed parse must not read as a failed
 * send. So this reaches for the id in the likely places and falls back to
 * the request id, which is always present and is what support asks for.
 */
function messageIdOf(json) {
  if (!json || typeof json !== 'object') return '';
  const first = Array.isArray(json.data) ? json.data[0] : null;
  return (
    (first && (first.message_id || first.messageId || first.additional_info)) ||
    json.request_id ||
    ''
  ) + '';
}

/** ZeptoMail's error body is `{ error: { message, code, details:[...] } }`. */
function errorMessageOf(json, status) {
  const e = json && json.error;
  if (e) {
    const detail = Array.isArray(e.details) && e.details.length
      ? ' — ' + e.details.map((d) => d && (d.message || d.target)).filter(Boolean).join('; ')
      : '';
    return `${e.message || 'ZeptoMail rejected the message'}${detail}`;
  }
  return `ZeptoMail API returned HTTP ${status}`;
}

/**
 * 4xx is our mistake and will not fix itself in five seconds — a wrong
 * token (401), a malformed request or a refused recipient (400). 429 is a
 * rate limit and 5xx is ZeptoMail's own hiccup, both worth another attempt.
 * A network error has no status at all and is the whole reason retries
 * exist, so it is never permanent.
 */
function isPermanentStatus(status) {
  if (status === 429) return false;
  return status >= 400 && status < 500;
}

/**
 * Send one message. Mirrors nodemailer's resolve/throw contract so the
 * caller's log, retry and idempotency code is identical for both transports.
 */
async function send(message) {
  if (!configured()) {
    const err = new Error('No ZeptoMail API token (set ZEPTOMAIL_TOKEN, or SMTP_PASS).');
    err.permanent = true;
    throw err;
  }

  const payload = {
    from: { address: cfg.FROM_ADDRESS, name: cfg.FROM_NAME },
    to: [{ email_address: { address: message.to } }],
    subject: message.subject,
    htmlbody: message.html,
    textbody: message.text,
  };
  if (message.replyTo) payload.reply_to = [{ address: message.replyTo }];
  const mh = mimeHeaders(message.headers);
  if (Object.keys(mh).length) payload.mime_headers = mh;

  let res;
  try {
    res = await fetch(cfg.API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-enczapikey ${cfg.API_TOKEN}`,
      },
      body: JSON.stringify(payload),
      /* The same ceiling SMTP had, so a stalled request fails the send
         rather than hanging the confirmation behind the thank-you page. */
      signal: AbortSignal.timeout(cfg.TIMEOUTS.socket),
    });
  } catch (err) {
    /* No HTTP response at all: DNS, TLS, a reset, or the abort timeout.
       Transient by nature — let the retry loop have it. */
    const e = new Error(`ZeptoMail API unreachable: ${err.message}`);
    e.permanent = false;
    throw e;
  }

  const bodyText = await res.text().catch(() => '');
  let json = null;
  try { json = bodyText ? JSON.parse(bodyText) : null; } catch { /* non-JSON body */ }

  if (!res.ok) {
    const err = new Error(errorMessageOf(json, res.status));
    err.responseCode = res.status;
    err.permanent = isPermanentStatus(res.status);
    err.response = bodyText.slice(0, 500);
    throw err;
  }

  return {
    messageId: messageIdOf(json),
    response: (json && (json.message || (json.data && json.data[0] && json.data[0].message))) || 'accepted',
  };
}

module.exports = { send, configured };
