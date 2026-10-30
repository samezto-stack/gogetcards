/*
 * Drains the failed-email retry queue, one message at a time.
 *
 * Started from server.js's boot() alongside the other sweeps, so there is
 * one answer to "where do background jobs live".
 *
 * The interval is only how often it LOOKS. The spacing between sends is
 * stamped on each row as retryDueAt when the queue is built, and this sweep
 * sends at most one due message per pass — so a process that was down for
 * an hour comes back and resumes the cadence rather than flushing the
 * backlog in one burst, which is the exact thing the queue exists to avoid.
 */

const retryQueue = require('../services/mail/retryQueue');

/* Well under the minimum gap between two sends, so a message goes out close
   to its due time rather than up to a full gap late. */
const TICK_MS = parseInt(process.env.MAIL_RETRY_TICK_MS || '', 10) || 30 * 1000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const r = await retryQueue.drainOne();
    if (r.reason !== 'nothing_due') {
      console.log(`[mailRetry] ${r.reason}${r.to ? ' -> ' + r.to : ''}`);
    }
  } catch (err) {
    console.error('[mailRetry] sweep failed:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  if (timer.unref) timer.unref();
  setTimeout(tick, 20 * 1000).unref?.();
  console.log(`[mailRetry] queue drain every ${Math.round(TICK_MS / 1000)}s, `
    + `${retryQueue.GAP_SECONDS}-${retryQueue.GAP_SECONDS + retryQueue.JITTER_SECONDS}s between sends`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick };
