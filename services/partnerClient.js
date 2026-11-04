const axios = require('axios');
const { URL } = require('url');

// Custom error classes for clear status mapping
class PartnerAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PartnerAuthError';
    this.status = 401;
  }
}

class PartnerExperienceNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PartnerExperienceNotFoundError';
    this.status = 404;
  }
}

class PartnerUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PartnerUnavailableError';
    this.status = 503;
  }
}

/**
 * Sleeps for a given number of milliseconds.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Requests a token from the Partner Experience server.
 * Ensures short timeouts and retries on transient errors, falling back safely.
 *
 * @param {Object} config - { url, apiKey, experienceId, claims? }.
 *   `claims` is an arbitrary bag of extra signed fields the partner host has
 *   whitelisted (e.g. { email, productName, productImage }) — undefined/empty
 *   values are dropped, so callers can pass a partially-filled object freely.
 *   `config.email` (legacy, single-field) is still honored for compatibility.
 * @returns {Promise<{ token: string, param: string }>}
 */
async function getPartnerToken(config) {
  const timeoutMs = parseInt(process.env.PARTNER_EXPERIENCE_REQUEST_TIMEOUT_MS || '2500', 10);
  const maxRetries = parseInt(process.env.PARTNER_EXPERIENCE_MAX_RETRIES || '1', 10);
  
  if (!config.url) throw new Error('Missing Partner Experience URL');
  if (!config.apiKey) throw new Error('Missing Partner Experience API Key');
  if (!config.experienceId) throw new Error('Missing Partner Experience ID');

  // Derive issuer URL from the origin of the configured URL
  let issuerUrl;
  try {
    const targetUrl = new URL(config.url);
    issuerUrl = `${targetUrl.origin}/internal/experience/token`;
  } catch (err) {
    throw new Error('Invalid Partner Experience URL format');
  }

  // config.apiKey is what the caller already resolved with the correct
  // precedence (per-route override -> global partnerExperience.apiKey ->
  // env var — see routes/frontend.js's resolvePartnerRedirect). This used
  // to be reversed (env var always won if set at all), silently overriding
  // whatever key was actually configured for this specific route in the
  // admin UI whenever PARTNER_EXPERIENCE_API_KEY happened to be set in the
  // environment — a real, previously-unnoticed cause of intermittent 401s
  // (routed to Shopify instead of the partner experience) for routes whose
  // configured key differs from that env var.
  const apiKey = config.apiKey || process.env.PARTNER_EXPERIENCE_API_KEY;

  const payload = {
    experience: config.experienceId
  };

  // Generic claims bag (email, productName, productImage, ...). Only
  // non-empty values are sent; the partner host decides what it whitelists.
  const claims = { ...(config.claims || {}) };
  if (config.email && claims.email === undefined) {
    claims.email = config.email; // back-compat with the single-field form
  }
  for (const [key, value] of Object.entries(claims)) {
    if (value !== undefined && value !== null && value !== "") {
      payload[key] = value;
    }
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      await require('../helpers/safeUrl').assertPublicUrl(issuerUrl);
      const response = await axios.post(issuerUrl, payload, {
        maxRedirects: 0,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: timeoutMs,
        // Reject all non-2xx responses to handle them in the catch block
        validateStatus: (status) => status >= 200 && status < 300,
        // Enforce HTTPS
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: true })
      });

      return {
        token: response.data.token,
        param: response.data.param || 't' // Use standard param from response, default to 't'
      };

    } catch (error) {
      const status = error.response ? error.response.status : null;
      
      // Never retry 401 (Auth Failed) or 404 (Experience Not Found) - these are configuration errors
      if (status === 401) {
        throw new PartnerAuthError('Partner API Key unauthorized');
      }
      if (status === 404) {
        throw new PartnerExperienceNotFoundError('Partner Experience ID not found');
      }
      
      // If it's a 503, or any other transient error (timeout, connection refused, 500)
      attempt++;
      if (attempt > maxRetries) {
        if (status === 503) {
          throw new PartnerUnavailableError('Partner Experience server is unavailable');
        }
        // Throw a generic error to trigger the fallback logic
        console.error(`Partner token request failed after ${attempt} attempts (Status: ${status || 'Network/Timeout'})`);
        throw new Error('Failed to obtain token from Partner Experience server');
      }

      // Short backoff before retry (e.g. 250ms)
      await sleep(250);
    }
  }
}

module.exports = {
  getPartnerToken,
  PartnerAuthError,
  PartnerExperienceNotFoundError,
  PartnerUnavailableError
};
