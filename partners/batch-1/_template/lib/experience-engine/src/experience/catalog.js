"use strict";

/**
 * Catalog of experiences (segments), built from the normalized config Map.
 * A "browser-safe" view of an experience is a fresh object exposing only its
 * id and traits — never internal fields — so nothing sensitive can leak to a
 * rendering layer, and callers can't mutate shared state.
 */
function createCatalog(config) {
  const experiences = config.experiences; // Map<id, { id, traits }>
  const DEFAULT_ID = config.defaultExperienceId;

  function has(id) {
    return typeof id === "string" && experiences.has(id);
  }

  /** Issuable = a known, non-default experience (default needs no token). */
  function isIssuable(id) {
    return has(id) && id !== DEFAULT_ID;
  }

  /** Fresh, browser-safe copy. Unknown ids collapse to the default. */
  function publicView(id) {
    const entry = has(id) ? experiences.get(id) : experiences.get(DEFAULT_ID);
    return { id: entry.id, traits: Object.assign({}, entry.traits) };
  }

  function ids() {
    return Array.from(experiences.keys());
  }

  return { has, isIssuable, publicView, ids, DEFAULT_ID };
}

module.exports = { createCatalog };
