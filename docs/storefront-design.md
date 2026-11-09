# Storefront design: "The Sealed Register"

The customer-facing site is designed as a printed collector's register,
the catalogue an auction house or a stamp dealer publishes. It replaced a
dark "gaming" theme (near-black glass, neon violet, glow, gradients). The
change is a concept change, not a palette swap: if a new page could be
mistaken for the old theme with the colours inverted, it is wrong.

## The rules

- **Paper and ink.** Page `--color-bg` #F4F1EA. Leaves (panels, cards)
  `--color-bg-card` #FBFAF6. Darker sheet (rails, footer, bands)
  `--color-bg-elevated` #ECE7DC. Product photos sit on a white plate,
  `--color-plate`. Text is ink.
- **One stamp colour.** `--color-primary` #4527A0 (the violet stamp, as
  printed ink) for links, focus, the active state, small emphasis. Never
  a large fill. Primary buttons are **ink** (`.btn-primary`), not violet.
- **Status inks.** In stock / free / included: `--color-accent` (green).
  Preorder: `--color-cyan`, which is now a vermilion stamp (#A3361C), the
  name is historical. Errors: `--color-red`. Each has a `-soft` tint for
  a note background.
- **No** gradients, glows, `backdrop-filter`, blur, drop shadows, neon,
  or `rgba(255,255,255,…)` overlays. Depth comes from rules. The only
  shadow is `--shadow-pop`, for menus and drawers.
- **Square corners.** Every radius token is 2px or 0. Only status dots
  are round. No pills.
- **Rules carry the layout.** `1.5px solid var(--color-ink)` under a
  section title or at the top of an important block; `1px solid
  var(--color-border-light)` hairlines between rows. Prefer ruled rows and
  shared borders over separate floating boxes.
- **Type.** Display and headings: Fraunces (`--font-display`), weight
  300–500, never bold. UI and body: Inter (`--font-heading`,
  `--font-body`). Numbers, prices, codes, SKUs, dates, labels and
  overlines: IBM Plex Mono (`--font-mono`), small, uppercase, tracked
  0.08–0.14em. Prices are always mono.
- **Buttons** are rectangular, uppercase Inter 600 at ~0.78rem with
  0.1em tracking: `.btn-primary` (ink), `.btn-outline` (ink frame),
  `.btn-ghost` (hairline frame).
- **Badges are stamps**: `.badge`, square, mono, 1px frame in the colour
  of what they say.

## Token names

Names are kept from the old theme so inline `var(--…)` references keep
working. Read them by meaning now:

| Token | Means now |
|---|---|
| `--color-white` | the strongest text colour (ink). Do not use it for text on a dark fill. |
| `--color-on-ink` | text on an ink fill |
| `--color-plate` | a real white surface |
| `--color-cyan` | preorder vermilion |
| `--font-heading` | Inter (UI), not a display face |

Hardcoded hex or rgba colours in a view are almost always leftovers from
the dark theme (`#0B0F14`, `#141C26`, `#7C3AED`, `#A78BFA`, `#06B6D4`,
`rgba(255,255,255,…)`, `rgba(124,58,237,…)`, `#FC8181`, `#FCA5A5`,
`#FCD34D` …). Replace them with tokens.

## Shared pieces

- `.reg-head` / `.reg-head__num` / `.reg-head__title` / `.reg-head__aside`:
  a section heading in register form (section mark, serif title, link,
  ink rule beneath).
- `.lot-grid`: a ruled product grid where neighbours share one border.
- `.zy-meta`: mono metadata line. `.zy-stamp`: a slightly rotated violet
  stamp, use sparingly.

Page-specific CSS goes in that view's own `<style>` block, not in
`public/css/gogetcards.css`.
