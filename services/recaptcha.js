/* ── Google reCAPTCHA ──────────────────────────────────────────────────
 *
 * Guards the contact form, which had only a honeypot and was being spammed.
 * The honeypot stays: it costs nothing, catches the naive bots, and keeps
 * working on the day this verification cannot reach Google.
 *
 * WHICH VERSION. The widget on the page is v2 ("I'm not a robot"), because
 * a contact form wants a hard pass or fail rather than a score somebody has
 * to tune. This verifier accepts either: `success` is what v2 returns, and
 * if a `score` comes back — which only v3 sends — it is checked against
 * MIN_SCORE as well. Switching the page to v3 therefore needs no change
 * here.
 *
 * FAILS OPEN ON OUR OWN FAULTS, CLOSED ON A BAD TOKEN. Google being
 * unreachable, a mistyped secret, a timeout: those are our problems, and
 * turning them into "your message could not be sent" would silently close
 * the only channel a customer has. Merchant Center reviewers check that a
 * shopper can reach the seller before buying, so a contact form that
 * rejects everybody is worse than one that lets some spam through. A token
 * that is present and genuinely rejected is a different matter and is
 * refused.
 */
const https = require('https');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/* The site key is public by design (it is in the page's HTML), so it can
   live here; RECAPTCHA_SITE_KEY in the environment overrides it. Its
   partner secret is NOT here: see below. */
const SITE_KEY = process.env.RECAPTCHA_SITE_KEY
  || '6LegfxAuAAAAAL8c-uSs8TO-aiuLH3IWdrAm38uR';
/* No fallback: a secret committed to the repository is a secret in every
   clone and in git history for good. Unset means verify() fails open and
   the honeypot + rate limit carry the form; set RECAPTCHA_SECRET in the
   platform environment (and rotate the pair the old literal belonged to). */
const SECRET = process.env.RECAPTCHA_SECRET || '';

/* Only consulted when Google sends a score, i.e. v3. 0.5 is Google's own
   suggested starting point. */
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

const TIMEOUT_MS = 4000;

function post(body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8');
    const req = https.request(
      VERIFY_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': payload.length,
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (err) { reject(new Error('unparseable response')); }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(payload);
  });
}

/**
 * @returns {Promise<{ok: boolean, reason: string}>}
 *   ok:false only when a token was supplied and Google rejected it, or when
 *   no token arrived at all. Never for a failure on our side.
 */
async function verify(token, ip) {
  if (!SECRET) {
    console.error('[recaptcha] no secret configured — letting the message through');
    return { ok: true, reason: 'not_configured' };
  }

  const clean = String(token || '').trim();
  if (!clean) return { ok: false, reason: 'missing' };
  /* Google's tokens are long. Anything short is not one, and is not worth
     a round trip. */
  if (clean.length < 20 || clean.length > 4096) return { ok: false, reason: 'malformed' };

  const params = new URLSearchParams({ secret: SECRET, response: clean });
  if (ip) params.set('remoteip', String(ip));

  let body;
  try {
    body = await post(params.toString());
  } catch (err) {
    console.error('[recaptcha] verification unreachable:', err.message);
    return { ok: true, reason: 'unreachable' };
  }

  if (!body || typeof body !== 'object') {
    console.error('[recaptcha] unexpected response shape');
    return { ok: true, reason: 'bad_response' };
  }

  const codes = Array.isArray(body['error-codes']) ? body['error-codes'] : [];

  /* Our misconfiguration, not the visitor's failure. Loud in the log,
     invisible to them. */
  const OURS = ['invalid-input-secret', 'missing-input-secret', 'bad-request'];
  if (codes.some((c) => OURS.includes(c))) {
    console.error('[recaptcha] misconfigured:', codes.join(', '));
    return { ok: true, reason: 'misconfigured' };
  }

  if (body.success !== true) {
    return { ok: false, reason: codes.join(',') || 'rejected' };
  }

  /* v3 only. v2 sends no score and this is skipped. */
  if (typeof body.score === 'number' && body.score < MIN_SCORE) {
    return { ok: false, reason: `low_score_${body.score}` };
  }

  return { ok: true, reason: 'ok' };
}

module.exports = { verify, SITE_KEY, MIN_SCORE };
