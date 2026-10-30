/* ── Meta Conversions API (CAPI) ───────────────────────────
   Server-to-server Purchase event push to Meta, so ad optimization/
   attribution doesn't depend solely on the client-side browser pixel
   (which ad blockers, iOS tracking prevention, etc. can silently drop).
   Shared by:
     - routes/admin.js's manual "Push to Meta" button (operator-triggered,
       any order)
     - services/orderPipeline/index.js's automatic push (fired once per
       newly-created order, ONLY when that order's traffic-source
       attribution is Facebook — see runThankYouPipeline)
   Both call the same sendPurchaseEvent() so there is exactly one place
   that knows the Graph API payload shape.
*/

const axios = require('axios');
const crypto = require('crypto');

/**
 * @param {object} params
 * @param {number|string} params.value  order total, in the given currency's
 *   major unit (e.g. 149.99), NOT cents.
 * @param {string} [params.currency]    defaults to 'USD'.
 * @param {string} [params.email]       hashed before ever leaving this
 *   process — Meta only ever receives the SHA-256 digest, never the
 *   plaintext address.
 * @param {string} [params.eventId]     lets a future client-side pixel fire
 *   for the same purchase without Meta double-counting it (Meta dedupes by
 *   matching event_id across pixel + CAPI for the same event_name).
 * @returns {Promise<{ok: true} | {ok: false, error: string}>} never throws —
 *   callers can fire-and-forget without a try/catch of their own.
 */
async function sendPurchaseEvent({ value, currency, email, eventId }) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { ok: false, error: 'missing_credentials' };
  }
  const amount = parseFloat(value);
  if (!value || isNaN(amount)) {
    return { ok: false, error: 'invalid_value' };
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ...(eventId ? { event_id: String(eventId) } : {}),
        user_data: {
          em: email ? [crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex')] : [],
        },
        custom_data: {
          currency: (currency || 'USD').toUpperCase(),
          value: amount,
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    await axios.post(url, payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response ? JSON.stringify(err.response.data) : err.message };
  }
}

module.exports = { sendPurchaseEvent };
