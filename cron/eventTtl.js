/*
 * Brings the Event TTL index in line with the schema, once, at boot.
 *
 * WHY THIS FILE HAS TO EXIST. Changing expireAfterSeconds in the schema
 * changes nothing on a database that already has the index. MongoDB will
 * not redefine an existing index from a createIndex call — it either errors
 * with IndexOptionsConflict or quietly does nothing, depending on version —
 * so raising the retention in models/Event.js is an intention, not a
 * setting. The only way to change it in place is collMod.
 *
 * The failure mode without this is silent and expensive: /admin/analytics
 * offers a year of history, the schema says a year, and the database keeps
 * deleting at ninety days. Every panel would look right and be wrong, and
 * the data proving it wrong would already be gone.
 *
 * IDEMPOTENT AND CHEAP. Reads the current index, does nothing if it already
 * matches, and only issues collMod when the number actually differs. Safe to
 * run on every boot, which is what makes it safe to have no other trigger.
 *
 * NEVER FATAL. A database that refuses collMod — an unprivileged user, a
 * managed host that disallows it — must not stop the store from serving. It
 * logs loudly and leaves the old retention in place, which loses history but
 * costs nobody a page.
 */

const mongoose = require('mongoose');
const Event = require('../models/Event');

const WANT_SECONDS = (Event.EVENT_TTL_DAYS || 365) * 24 * 60 * 60;

async function apply() {
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1) return { ok: false, reason: 'not_connected' };

  const coll = conn.collection('events');

  let indexes;
  try {
    indexes = await coll.indexes();
  } catch (err) {
    console.error('[eventTtl] could not read indexes:', err.message);
    return { ok: false, reason: 'unreadable' };
  }

  /* The TTL index is the one on createdAt that carries an expiry, not
     merely any index on createdAt — the compound analytics indexes start
     with other fields and must not be touched. */
  const ttl = indexes.find(
    (i) => i.expireAfterSeconds !== undefined && i.key && Object.keys(i.key).join() === 'createdAt'
  );

  if (!ttl) {
    /* No TTL index yet: Mongoose's own ensureIndexes will create it from the
       schema with the right value, so there is nothing to correct. */
    return { ok: true, reason: 'no_ttl_index_yet' };
  }

  if (ttl.expireAfterSeconds === WANT_SECONDS) {
    return { ok: true, reason: 'already_correct', seconds: WANT_SECONDS };
  }

  const wasDays = Math.round(ttl.expireAfterSeconds / 86400);
  const wantDays = Math.round(WANT_SECONDS / 86400);

  try {
    await conn.db.command({
      collMod: 'events',
      index: { name: ttl.name, expireAfterSeconds: WANT_SECONDS },
    });
    console.log(`[eventTtl] event retention ${wasDays}d -> ${wantDays}d (index ${ttl.name})`);
    return { ok: true, reason: 'changed', from: ttl.expireAfterSeconds, to: WANT_SECONDS };
  } catch (err) {
    /* Loud, because analytics will now quietly disagree with the retention
       it advertises, and nothing else will say so. */
    console.error(
      `[eventTtl] COULD NOT raise event retention from ${wasDays}d to ${wantDays}d: ${err.message}\n` +
      '           /admin/analytics will show a shorter history than it offers.'
    );
    return { ok: false, reason: 'collmod_failed', error: err.message };
  }
}

function start() {
  /* Deferred a little so it is never competing with the first requests
     after a deploy. It is a one-shot, not a sweep. */
  setTimeout(() => {
    apply().catch((err) => console.error('[eventTtl] failed:', err.message));
  }, 15 * 1000).unref?.();
}

module.exports = { start, apply, WANT_SECONDS };
