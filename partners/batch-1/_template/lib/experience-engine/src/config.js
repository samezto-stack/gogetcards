"use strict";

/**
 * Configuration layer. Normalizes and validates the small set of options a
 * consuming project provides, applies sensible defaults, and can build that
 * options object straight from environment variables.
 *
 * The ONLY things a project must configure:
 *   - secret            (signs tokens + cookies; server-side only)
 *   - apiKey            (authorizes the internal token issuer)
 *   - experiences       (the supported experience ids)
 * Everything else has production-ready defaults.
 */
const { ConfigError } = require("./errors");

const DEFAULTS = {
  tokenTtlMs: 10 * 60 * 1000, // 10 minutes
  tokenParam: "t",
  defaultExperienceId: "default",
  cookie: {
    name: "xp",
    ttlMs: 365 * 24 * 60 * 60 * 1000, // 365 days
    secure: "auto", // "auto" | true | false
    sameSite: "Lax",
    path: "/",
    domain: undefined,
  },
};

/** Environment variable names this engine understands. */
const ENV = {
  secret: "EXPERIENCE_SIGNING_SECRET",
  apiKey: "EXPERIENCE_API_KEY",
  tokenTtlMs: "EXPERIENCE_TOKEN_TTL_MS",
  tokenParam: "EXPERIENCE_TOKEN_PARAM",
  cookieName: "EXPERIENCE_COOKIE_NAME",
  cookieTtlMs: "EXPERIENCE_COOKIE_TTL_MS",
  cookieSecure: "EXPERIENCE_COOKIE_SECURE",
  ids: "EXPERIENCE_IDS",
  defaultId: "EXPERIENCE_DEFAULT_ID",
  passthroughClaims: "EXPERIENCE_PASSTHROUGH_CLAIMS",
};

function normalizeClaimNames(input) {
  // Whitelist of extra, signed claim names the issuer may bind into a token
  // and the resolver may expose (e.g. ["email"]). Anything not listed is
  // ignored — callers can never smuggle arbitrary fields into a token.
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(",")
    : [];
  return list
    .map((s) => String(s).trim())
    .filter(Boolean)
    // never allow reserved fields to be overridden
    .filter((s) => s !== "experience" && s !== "iat" && s !== "exp");
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseSecure(value) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return "auto";
}

function normalizeExperiences(input, defaultId) {
  // Accepts: ["partner","vip"] or [{ id, traits }, ...]. The default id is
  // always present implicitly. Returns a Map<id, { id, traits }>.
  const map = new Map();
  map.set(defaultId, { id: defaultId, traits: {} });

  const list = Array.isArray(input) ? input : [];
  for (const entry of list) {
    const obj = typeof entry === "string" ? { id: entry } : entry;
    if (!obj || typeof obj.id !== "string" || !obj.id) {
      throw new ConfigError(
        "experiences must be strings or objects with a string `id`"
      );
    }
    map.set(obj.id, { id: obj.id, traits: obj.traits || {} });
  }
  return map;
}

/**
 * Build a normalized options object from an environment map (process.env).
 * Missing optional values fall back to defaults.
 */
function fromEnv(env) {
  const e = env || {};
  const ids = (e[ENV.ids] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    secret: e[ENV.secret],
    apiKey: e[ENV.apiKey],
    tokenTtlMs: toInt(e[ENV.tokenTtlMs], DEFAULTS.tokenTtlMs),
    tokenParam: e[ENV.tokenParam] || DEFAULTS.tokenParam,
    defaultExperienceId: e[ENV.defaultId] || DEFAULTS.defaultExperienceId,
    experiences: ids,
    passthroughClaims: normalizeClaimNames(e[ENV.passthroughClaims]),
    cookie: {
      name: e[ENV.cookieName] || DEFAULTS.cookie.name,
      ttlMs: toInt(e[ENV.cookieTtlMs], DEFAULTS.cookie.ttlMs),
      secure: parseSecure(e[ENV.cookieSecure]),
    },
  };
}

/**
 * Validate an environment map without throwing. Returns { ok, errors }.
 * Useful for a startup self-check.
 */
function validateEnv(env) {
  const errors = [];
  const e = env || {};
  if (!e[ENV.secret]) errors.push(ENV.secret + " is required");
  if (!e[ENV.apiKey]) errors.push(ENV.apiKey + " is required");
  return { ok: errors.length === 0, errors };
}

/**
 * Create the frozen, validated runtime config from a normalized options object.
 * Throws ConfigError on invalid input.
 */
function createConfig(input) {
  const opts = input || {};

  if (!opts.secret || typeof opts.secret !== "string") {
    throw new ConfigError("`secret` is required (a strong random string)");
  }
  if (!opts.apiKey || typeof opts.apiKey !== "string") {
    throw new ConfigError("`apiKey` is required (shared server-to-server key)");
  }

  const defaultExperienceId =
    opts.defaultExperienceId || DEFAULTS.defaultExperienceId;

  const cookieIn = opts.cookie || {};
  const cookie = {
    name: cookieIn.name || DEFAULTS.cookie.name,
    ttlMs:
      typeof cookieIn.ttlMs === "number" ? cookieIn.ttlMs : DEFAULTS.cookie.ttlMs,
    secure: parseSecure(cookieIn.secure),
    sameSite: cookieIn.sameSite || DEFAULTS.cookie.sameSite,
    path: cookieIn.path || DEFAULTS.cookie.path,
    domain: cookieIn.domain || DEFAULTS.cookie.domain,
  };

  const config = {
    secret: opts.secret,
    apiKey: opts.apiKey,
    tokenTtlMs:
      typeof opts.tokenTtlMs === "number"
        ? opts.tokenTtlMs
        : DEFAULTS.tokenTtlMs,
    tokenParam: opts.tokenParam || DEFAULTS.tokenParam,
    defaultExperienceId,
    experiences: normalizeExperiences(opts.experiences, defaultExperienceId),
    passthroughClaims: normalizeClaimNames(opts.passthroughClaims),
    cookie,
  };

  return Object.freeze(config);
}

module.exports = { createConfig, fromEnv, validateEnv, DEFAULTS, ENV };
