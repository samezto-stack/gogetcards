/*
 * Drains the broadcast queue, one message at a time.
 *
 * Started from server.js's boot() alongside the other sweeps. The same
 * arrangement as cron/emailRetryQueue.js: the interval is only how often
 * it LOOKS, the spacing between sends is stamped on each row when the
 * campaign is queued, and a pass sends at most one due row — so a process
 * that restarts mid-run picks the cadence back up rather than flushing
 * everything that came due while it was down. See services/mail/broadcast.
 *
 * Its own timer rather than a second job inside the retry sweep, because
 * the two queues have different cadences on purpose: a provider outage is
 * drained slowly and a release-day announcement is drained at a human
 * pace, and one tick could not serve both.
 */

const broadcast = require('../services/mail/broadcast');

/* Under the minimum gap, so a row goes out close to its due time. */
const TICK_MS = parseInt(process.env.MAIL_BROADCAST_TICK_MS || '', 10) || 10 * 1000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const r = await broadcast.drainOne();
    if (r.reason !== 'nothing_due') {
      console.log(`[broadcast] ${r.reason}${r.to ? ' -> ' + r.to : ''}`);
    }
  } catch (err) {
    console.error('[broadcast] sweep failed:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  if (timer.unref) timer.unref();
  setTimeout(tick, 15 * 1000).unref?.();
  console.log(`[broadcast] queue drain every ${Math.round(TICK_MS / 1000)}s, `
    + `${broadcast.GAP_SECONDS}-${broadcast.GAP_SECONDS + broadcast.JITTER_SECONDS}s between sends`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick };
