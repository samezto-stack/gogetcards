/**
 * The stores this operator runs, for the store switcher in the admin top
 * bar (views/admin/_sidebar.ejs). Same list, same order, in every store's
 * repo, so the toggle never changes places between admins; only CURRENT
 * differs. Each admin keeps its own sign-in: switching opens the other
 * store's admin, which asks for that store's login if it has no session.
 */
const STORES = [
  { id: 'gogetcards', name: 'GoGetCards', short: 'GGC', origin: 'https://gogetcards.com', color: '#0F2A4A' },
  { id: 'zypheratcg', name: 'Zyphera TCG', short: 'ZT', origin: 'https://zypheratcg.com', color: '#0E4D57' },
];

const CURRENT = 'gogetcards';

/** Same admin section on the other store when the path is a plain section path. */
function adminUrl(store, path) {
  const p = /^\/admin(\/[a-z0-9-]+)*$/.test(String(path || '')) ? path : '/admin';
  return store.origin + p;
}

module.exports = { STORES, CURRENT, adminUrl };
