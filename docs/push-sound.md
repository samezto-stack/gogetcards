# Custom order sound for Bark

`cha-ching.caf` is a synthesised cash-register chime for the order push
notification. `cha-ching.wav` is the same audio in a format you can
preview on a desktop; `make.py` is the generator.

It is **not** Shopify's sound. Shopify's "cha-ching" is their own
proprietary audio asset and is not redistributed here. This is an
original, royalty-free equivalent: a short mechanical transient followed
by two struck-metal tones a fifth apart (C6 then G6), the second ringing
longer. The rising interval is what makes it read as a completed sale
rather than an error, and the inharmonic partials are what make it sound
like a bell rather than a beep.

If you own or prefer a different file, any short audio will work — the
import steps below are the same.

## Installing the sound into Bark

The sound is imported inside the **Bark app**, not into iOS. Custom
notification sounds live in each app's own sandbox — there is no
system-wide "add a notification sound" on iPhone, which is why it cannot
be found anywhere in Settings.

Two things about Bark's UI make this hard to find, and both are worth
stating plainly because guessing wastes time:

- The sound list is **not** a settings screen or a tab. It is reached
  from the tutorial rows on Bark's **Home** tab.
- The import control is **not** a "+" in the navigation bar. It is a row
  inside the list itself.

Steps:

1. Get `cha-ching.caf` onto the phone and into the **Files** app. AirDrop
   is easiest: accept it, then choose **Save to Files**.
2. Open **Bark** and stay on the **Home** tab — the screen listing
   example push URLs.
3. Scroll to the **Notification Sound** example (its example parameter is
   `sound=minuet`) and tap its **View all sounds** link.
4. That opens the **Notification Sound** screen, split into
   **Custom Sounds** and **Default Sounds**.
5. In the list, tap the **add sound** row. This is the import control;
   there is no toolbar button. It opens the standard iOS file picker.
6. Pick `cha-ching.caf`. It then appears under Custom Sounds.
7. Tap its name in the list to copy it, and confirm it matches
   `BARK_SOUND` in config/push.js exactly, without the `.caf` extension.

Tapping any sound in that list plays it, which is the quickest way to
confirm the file imported correctly before involving the server at all.

That screen also links to a converter (convertio.co/mp3-caf) for turning
an MP3 into CAF if a different sound is wanted later. iOS requires the
file to be under 30 seconds; ours is one second.

### If the wrong sound still plays

Bark falls back to the phone's default alert tone when it cannot resolve
the name, and it reports no error. A default tone such as "Rebound"
playing means the name did not resolve, which is almost always one of:

- the file was never imported, so nothing is registered under that name;
- the imported name differs from `BARK_SOUND` (check for a `.caf`
  suffix, capitals, or a rename during transfer).

## Insistence: the level setting

`BARK_LEVEL` takes two values.

| Level | Sound with ringer on | Rings on a silenced phone | Suppressed by Focus | Red CRITICAL banner |
|---|---|---|---|---|
| `active` (default) | yes | no | yes | no |
| `critical` | yes | yes | no | yes, unavoidable |

`active` is the default because the ringer is kept on. In that setup the
silent-mode override buys nothing, and its only visible effect is the
banner.

The red **CRITICAL** banner comes from iOS, not from Bark and not from
this code. Apple stamps it on every critical alert deliberately: it is
the system disclosing that an app overrode the ringer switch on purpose.
No flag removes it, which means "rings on a silenced phone" and "shows
that banner" are not two settings — they are one.

### The one thing `active` gives up

A **Focus mode** suppresses it. Sleep Focus overnight, or a Work or
Do Not Disturb schedule, will hold the notification silently until the
Focus ends. Only `critical` breaks through that, and only with the
banner attached.

If a missed overnight order ever matters, either allow Bark through in
the relevant Focus (Settings > Focus > *your focus* > Apps), which keeps
the sound without the banner, or set `BARK_LEVEL=critical` and accept it.

`critical` additionally requires **Settings > Notifications > Bark >
Critical Alerts** to be granted on the phone. Without it, `level=critical`
degrades quietly to an ordinary notification rather than failing, so a
silenced phone stays silent and nothing reports a problem.
