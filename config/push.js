/* ── Order push notification settings ─────────────────────
   The settings that never change live here rather than in the
   environment, because putting three variables into Render for something
   that never varies is friction with no payoff.

   BARK_KEY is the deliberate exception and stays environment-only. It is
   a credential: anyone holding it can push notifications to the phone,
   which makes it a route for a convincing fake like "Payment failed, tap
   to fix". Keeping it out of the repository means it is not in git
   history, is not exposed if the repo is ever made public or a
   collaborator is added, and can be rotated from the Render dashboard
   without a code change.

   The rest still read an environment variable first and fall back to the
   value here, so any of them can be overridden per-deploy without an
   edit.
*/

const site = require('./site');

module.exports = {
  // Store name as it appears at the start of the notification sentence.
  brand: process.env.PUSH_BRAND || 'GoGetCards',

  bark: {
    /* From the Bark iOS app: the last path segment of the URL it shows.
       Environment-only, on purpose — see the note above. With this unset
       the push channel simply no-ops, so a missing key degrades to "no
       notifications" rather than to an error on every order. */
    key: process.env.BARK_KEY || '',

    // Change only if self-hosting bark-server.
    server: process.env.BARK_SERVER || 'https://api.day.app',

    /* Must match a sound imported into the Bark app, without the file
       extension. See docs/push-sound.md — docs/cha-ching.caf is the file
       to import. Bark falls back to its default rather than erroring when
       a name does not resolve, so a mismatch shows up as "wrong sound
       played", never as a failure. */
    sound: process.env.BARK_SOUND || 'cha-ching',

    /* How insistent the notification is.
     *
     *   active  (default) An ordinary notification. Plays the sound
     *           normally on a phone whose ringer is on, and carries no
     *           banner of any kind. Silent when the phone is silenced,
     *           and suppressed by an active Focus mode.
     *
     *   critical  Rings through the physical silent switch and Do Not
     *             Disturb. iOS stamps every one of these with a red
     *             "CRITICAL" label. That label is Apple's own doing — the
     *             system disclosing that an app deliberately overrode the
     *             ringer — and no flag removes it, so the banner and the
     *             silent-mode override are the same single choice.
     *             Also requires the Critical Alerts permission on the
     *             phone, and degrades quietly to an ordinary notification
     *             without it.
     *
     * 'active' is the default because the ringer is kept on, which makes
     * the override pointless and leaves only the banner as its effect.
     *
     * timeSensitive is deliberately not offered. It reads like a middle
     * setting but is not one: it breaks through Focus and Do Not Disturb
     * while still respecting the silent switch, so on a silenced phone it
     * behaves exactly like 'active' while appearing as though it should
     * be louder.
     */
    level: process.env.BARK_LEVEL
      || (process.env.BARK_CRITICAL === 'true' ? 'critical' : 'active'),

    // Critical-alert loudness, 1-10. Only meaningful at level 'critical'.
    volume: Number(process.env.BARK_VOLUME || 7),

    /* Notification icon (iOS 15+). Must be a publicly reachable URL —
       Bark's app fetches it from the phone, so a local path or an
       unroutable host silently yields no icon rather than an error.
       Points at the generated 192px mark, so it changes with the brand
       automatically. */
    icon: process.env.BARK_ICON
      || `${site.origin()}/favicon-192.png`,
  },

  ntfy: {
    /* Unset by default. Anyone who knows a public ntfy topic name can
       read everything published to it, so a topic name is a password and
       is deliberately NOT committed here. Set NTFY_TOPIC in Render if a
       second device or an Android phone is ever needed. */
    topic: process.env.NTFY_TOPIC || '',
    server: process.env.NTFY_SERVER || 'https://ntfy.sh',
    token: process.env.NTFY_TOKEN || '',
  },
};
