/**
 * When an order placed now actually leaves the building.
 *
 * "Ships within 1 business day" is a policy; "Ships today" is a promise a
 * buyer can hold us to, and it converts because it is checkable. This
 * turns the policy in config/shipping.js (a 2 PM Pacific cutoff, Monday to
 * Friday) into the day a parcel goes out if the order is placed right now,
 * in the warehouse's own clock, so a buyer at 9 AM Pacific reads "today"
 * and one at 9 PM reads "tomorrow" or "Monday".
 *
 * Pure: takes a Date, returns a label and the dispatch date. Nothing here
 * knows about holidays; a day the warehouse is closed is a promise missed
 * by one day, which the shipped email corrects, not a wrong claim.
 */
const shipping = require('../config/shipping');

const WAREHOUSE_TZ = 'America/Los_Angeles';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cutoffHour() {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(String(shipping.DISPATCH.cutoffLocal || '2:00 PM').trim());
  if (!m) return 14;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h + (parseInt(m[2] || '0', 10) / 60);
}

/** Local clock in the warehouse timezone: { weekday 0-6, hour (decimal) }. */
function localClock(now) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: WAREHOUSE_TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return { weekday: WEEKDAYS.indexOf(o.weekday), hour: parseInt(o.hour, 10) + parseInt(o.minute || '0', 10) / 60 };
}

/**
 * The dispatch day for an in-stock order placed at `now`.
 * Returns { label, daysAhead } where label is "Ships today", "Ships
 * tomorrow" or "Ships Monday", and daysAhead counts calendar days.
 */
function nextDispatch(now = new Date()) {
  const { weekday, hour } = localClock(now);
  let days = 0;
  let day = weekday;
  const isBusiness = (d) => d >= 1 && d <= 5;
  if (!(isBusiness(day) && hour < cutoffHour())) {
    do { days += 1; day = (day + 1) % 7; } while (!isBusiness(day));
  }
  const label = days === 0 ? 'Ships today' : days === 1 ? 'Ships tomorrow' : `Ships ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}`;
  return { label, daysAhead: days, weekday: day };
}

module.exports = { nextDispatch, cutoffHour, WAREHOUSE_TZ };
