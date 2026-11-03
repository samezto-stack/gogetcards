"use strict";

/**
 * Handler for the protected, server-to-server token issuer:
 *
 *   POST <mount>/token
 *   Authorization: Bearer <apiKey>
 *   Content-Type: application/json
 *   { "experience": "<id>" }
 *
 * 200 -> { token, param, expiresInMs }
 * 404 -> { error: "not_found" }   (unknown / non-issuable experience id)
 *
 * Auth (401/503) is enforced by the internalAuth middleware, which callers
 * mount in front of this handler. Requires a JSON body parser upstream (the
 * handler reads req.body); it also tolerates a pre-parsed object.
 *
 * Framework-neutral: works as an Express handler, or wrap in any router.
 */
function createIssueTokenHandler(engine, logger) {
  return function issueToken(req, res) {
    const body = req.body || {};
    const id = typeof body.experience === "string" ? body.experience : "";

    // Collect only whitelisted passthrough claims from the body (e.g. email).
    const extra = {};
    for (const name of engine.config.passthroughClaims) {
      if (body[name] !== undefined) extra[name] = body[name];
    }

    const token = engine.token.issue(id, extra);

    if (!token) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "not_found" }));
    }

    logger.info("issued experience token", { experience: id });
    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        token: token,
        param: engine.config.tokenParam,
        expiresInMs: engine.config.tokenTtlMs,
      })
    );
  };
}

module.exports = { createIssueTokenHandler };
