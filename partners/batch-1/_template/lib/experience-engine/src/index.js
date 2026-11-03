"use strict";

/**
 * experience-engine
 * -----------------------------------------------------------------------------
 * A small, dependency-free, framework-friendly engine for signed, server-side
 * "experience routing": mint a short-lived signed token for an experience,
 * resolve it (token -> cookie -> default) on a later request entirely on the
 * server, persist recognition in a signed cookie, and (optionally) render a
 * different page per experience. No business logic, no UI, no HTML assumptions.
 *
 * Usage:
 *   const { createExperienceEngine } = require("experience-engine");
 *   const engine = createExperienceEngine({
 *     secret: process.env.EXPERIENCE_SIGNING_SECRET,
 *     apiKey: process.env.EXPERIENCE_API_KEY,
 *     experiences: ["partner"],           // + implicit "default"
 *     tokenTtlMs: 10 * 60 * 1000,
 *     cookie: { name: "xp", ttlMs: 365*24*60*60*1000, secure: "auto" },
 *   });
 */
const { createConfig, fromEnv, validateEnv, ENV, DEFAULTS } = require("./config");
const { createLogger } = require("./logger");
const errors = require("./errors");

const tokenLib = require("./token");
const { createCatalog } = require("./experience/catalog");
const { createIssuer } = require("./experience/issuer");
const { createCookie } = require("./experience/cookie");
const { createResolver } = require("./experience/resolver");
const { createVariants } = require("./experience/variants");

const { createInternalAuth } = require("./middleware/internalAuth");
const { createResolveMiddleware } = require("./middleware/resolveExperience");
const { createIssueTokenHandler } = require("./routes/internalToken");
const {
  buildUrlCleanupSnippet,
  buildClaimEmitSnippet,
  buildParamStripSnippet,
  injectBeforeBodyClose,
  injectEarly,
} = require("./utils/urlCleanup");

/**
 * @param {object} options  see config.js (createConfig). `logger` and `level`
 *                          are optional; everything else is engine config.
 * @returns {object} the engine instance.
 */
function createExperienceEngine(options) {
  const opts = options || {};
  const logger =
    opts.logger && typeof opts.logger.info === "function"
      ? opts.logger
      : createLogger({ level: opts.level });

  const config = createConfig(opts);

  const catalog = createCatalog(config);
  const issuer = createIssuer(config, catalog);
  const cookie = createCookie(config);
  const resolver = createResolver(config, catalog, cookie);
  const variants = createVariants();

  const cleanupSnippet = buildUrlCleanupSnippet(config.tokenParam);

  const engine = {
    config,
    logger,
    errors,

    /** Experience catalog (ids + membership checks). */
    catalog,

    /** Token operations. `issue` optionally binds whitelisted passthrough
     *  claims (e.g. { email }) into the signed token. */
    token: {
      issue: (id, extraClaims) => issuer.issueToken(id, extraClaims),
      verify: (token) => tokenLib.verifyToken(config.secret, token),
    },

    /** Persistent signed cookie operations. */
    cookie,

    /** Resolve a request to an experience (token -> cookie -> default). */
    resolve: (req) => resolver.resolve(req),

    /** Optional standalone-variant HTML loader (cached). */
    variants,

    /** HTML helpers.
     *  - injectCleanup: strip the one-time token param from the URL.
     *  - injectClaims:  emit trusted passthrough claims (e.g. an assigned
     *    email) into the URL as ?<name>=<value> from the SIGNED token, early
     *    enough for the page to read them, and strip the token param. Pass the
     *    `claims` object from engine.resolve(req). No claims -> falls back to a
     *    plain cleanup. */
    html: {
      cleanupSnippet: () => cleanupSnippet,
      injectCleanup: (html) => injectBeforeBodyClose(html, cleanupSnippet),
      injectClaims: (html, claims) => {
        if (!claims || Object.keys(claims).length === 0) {
          return injectBeforeBodyClose(html, cleanupSnippet);
        }
        // Early: emit the trusted claims into the URL (+ strip the token) so the
        // page can read them. Late (after the page's scripts): strip the claim
        // params too, so the address bar ends completely clean.
        const withEmit = injectEarly(
          html,
          buildClaimEmitSnippet(claims, config.tokenParam)
        );
        return injectBeforeBodyClose(
          withEmit,
          buildParamStripSnippet(Object.keys(claims))
        );
      },
    },

    /** Ready-to-mount middleware and handlers. */
    middleware: {},
    handlers: {},
  };

  engine.middleware.internalAuth = createInternalAuth(config, logger);
  engine.middleware.resolve = (mwOptions) =>
    createResolveMiddleware(engine, mwOptions);
  engine.handlers.issueToken = createIssueTokenHandler(engine, logger);

  return engine;
}

module.exports = {
  createExperienceEngine,
  createConfigFromEnv: fromEnv,
  validateEnv,
  ENV,
  DEFAULTS,
  errors,
  token: tokenLib,
};
