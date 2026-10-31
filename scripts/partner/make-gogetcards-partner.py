#!/usr/bin/env python3
"""
Turn a fresh clone of the partner-site template into a GoGetCards partner.

The partner sites are the same React/Express template zypheratcg's batch
uses; what makes one belong to a store is a handful of hardcoded values:
which parent origins may frame the checkout, where arrival and payment
reports are sent, where the thank-you hop lands, which policy pages and
support address the checkout footer shows, and the checkout theme. This
script rewrites exactly those, nothing else, so the partner logic that has
been proved with real cards stays byte-for-byte the same.

Usage:
    python3 scripts/partner/make-gogetcards-partner.py /path/to/partner-clone

It is idempotent: a site already converted is left alone. It refuses to
touch a directory that does not look like the template.
"""
import re
import sys
from pathlib import Path

STORE_ORIGIN = 'https://gogetcards.com'
STORE_NAME = 'GoGetCards'
STORE_SUPPORT = 'support@gogetcards.com'
PARENT_ORIGINS = [
    'https://gogetcards.com',
    'https://www.gogetcards.com',
    'https://gogetcards.onrender.com',
]

# Whop Elements theme: light to match the Buy Box storefront, with Whop's
# "blue" accent (the closest of its fixed palette to the storefront navy).
WHOP_THEME_OLD = 'theme: { appearance: "dark", accentColor: "violet" }'
WHOP_THEME_NEW = 'theme: { appearance: "light", accentColor: "blue" }'
WHOP_THEME_OLD_TSX = "theme: { appearance: 'dark', accentColor: 'violet' }"
WHOP_THEME_NEW_TSX = "theme: { appearance: 'light', accentColor: 'blue' }"

# The checkout page's token block, dark -> light. Everything else in that
# stylesheet reads these tokens, so this is most of the retheme.
TOKENS_OLD_RE = re.compile(r':root \{\n  color-scheme: dark;.*?\n\}\n', re.S)
TOKENS_NEW = """:root {
  color-scheme: light;

  /* ── surfaces ── */
  --color-bg:           #F3F4F7;
  --color-bg-elevated:  #FFFFFF;
  --color-bg-card:      #FFFFFF;
  --color-bg-input:     #FFFFFF;
  --color-border:       #C9CFD8;
  --color-border-light: #E1E4EA;

  /* ── brand ── */
  --color-primary:      #0F2A4A;
  --color-primary-text: #0F2A4A;
  --color-primary-dark: #0B1F38;

  --color-accent:       #15803D;   /* free / included / secure */
  --color-cta:          #C2410C;   /* the pay button */
  --color-cta-dark:     #9A3412;
  --color-cyan:         #1D4FB8;
  --color-gold:         #B45309;
  --color-red:          #DC2626;

  /* ── ink ── */
  --color-text:         #111827;
  --color-text-muted:   #4B5563;
  --color-text-faint:   #5B6472;
  --color-white:        #FFFFFF;
  --color-heading:      #0F2A4A;

  --text-soft: var(--color-text-muted);

  --font-heading: 'Public Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body:    'Public Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   8px;
  --radius-full: 9999px;

  --shadow-card: 0 8px 24px rgba(15, 42, 74, 0.10), 0 1px 2px rgba(15, 42, 74, 0.06);
  --shadow-deep: 0 8px 24px rgba(15, 42, 74, 0.10), 0 1px 2px rgba(15, 42, 74, 0.06);

  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;

  --page: 1120px;
}
"""


def sub_all(text, pairs, label):
    for old, new in pairs:
        if old not in text:
            raise SystemExit(f'{label}: expected text not found: {old[:70]!r}')
        text = text.replace(old, new)
    return text


def retheme_css(text):
    """The same light-theme patch gogetcards applied to its own checkout.css."""
    text = TOKENS_OLD_RE.sub(TOKENS_NEW, text, count=1)
    text = text.replace('color: var(--color-white)', 'color: var(--color-heading)')
    text = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)', r'rgba(15, 42, 74, \1)', text)
    text = re.sub(r'rgba\(\s*124\s*,\s*58\s*,\s*237\s*,\s*([0-9.]+)\s*\)', r'rgba(15, 42, 74, \1)', text)
    text = text.replace('background: #1D2739;', 'background: #FFFFFF;')
    text = text.replace('background: rgba(5, 8, 12, 0.84);', 'background: rgba(15, 42, 74, 0.55);')
    text = text.replace('#8B4CF0', '#9A3412').replace('#34D399', '#15803D').replace('#A78BFA', '#1D4FB8').replace('#FBBF24', '#B45309')
    text = text.replace('background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary) 42%, var(--color-cyan) 100%);', 'background: var(--color-cta);')
    text = text.replace('background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-border-light) 100%);', 'background: var(--color-border-light);')
    # the pay button: orange, white text, pill
    text = re.sub(r'(\.ck-cta \{[^}]*?)background: var\(--color-primary\);\n(\s*)color: var\(--color-heading\);',
                  r'\1background: var(--color-cta);\n\2color: var(--color-white);', text, count=1, flags=re.S)
    text = text.replace('.ck-cta:active { background: var(--color-primary-dark);', '.ck-cta:active { background: var(--color-cta-dark);')
    return text


def convert(root: Path):
    server = root / 'server.js'
    page = root / 'server' / 'experiences' / 'partner.html'
    checkout_tsx = root / 'src' / 'components' / 'WhopCheckout.tsx'
    thankyou_tsx = root / 'src' / 'pages' / 'ThankYou.tsx'
    for f in (server, page, checkout_tsx, thankyou_tsx):
        if not f.exists():
            raise SystemExit(f'not a partner-site template: missing {f.relative_to(root)}')

    s = server.read_text(encoding='utf-8')
    if STORE_ORIGIN in s:
        print('server.js already converted')
    else:
        s = sub_all(s, [
            ("const ALLOWED_PARENT_ORIGINS = new Set([\n  'https://zypheratcg.com',\n  'https://www.zypheratcg.com',\n  'https://zypheratcg.onrender.com',\n]);",
             'const ALLOWED_PARENT_ORIGINS = new Set([\n' + ''.join(f"  '{o}',\n" for o in PARENT_ORIGINS) + ']);'),
            ("new URL('https://zypheratcg.com/api/checkout/confirm-arrival')", f"new URL('{STORE_ORIGIN}/api/checkout/confirm-arrival')"),
            ("|| 'https://zypheratcg.com/api/checkout/payment-recorded'", f"|| '{STORE_ORIGIN}/api/checkout/payment-recorded'"),
            # where a mid-checkout visitor is sent back to when the token fails
            ("return 'https://zypheratcg.com/products/' + slug;", f"return '{STORE_ORIGIN}/products/' + slug;"),
            ("return 'https://zypheratcg.com/';", f"return '{STORE_ORIGIN}/';"),
        ], 'server.js')
        server.write_text(s, encoding='utf-8')
        print('server.js: parent origins, arrival and payment endpoints -> gogetcards.com')

    p = page.read_text(encoding='utf-8')
    if STORE_ORIGIN in p:
        print('partner.html already converted')
    else:
        p = sub_all(p, [
            ('data-policy-base="https://zypheratcg.com"', f'data-policy-base="{STORE_ORIGIN}"'),
            ('<a href="mailto:support@zypheratcg.com">support@zypheratcg.com</a>', f'<a href="mailto:{STORE_SUPPORT}">{STORE_SUPPORT}</a>'),
            ('"https://zypheratcg.com/api/checkout/confirm-arrival?zcid="', f'"{STORE_ORIGIN}/api/checkout/confirm-arrival?zcid="'),
            ('var ENDPOINT = "https://zypheratcg.com/api/checkout/session";', f'var ENDPOINT = "{STORE_ORIGIN}/api/checkout/session";'),
            ('<a href="https://zypheratcg.com/">Continue at Zyphera TCG</a>', f'<a href="{STORE_ORIGIN}/">Continue at {STORE_NAME}</a>'),
            ('<script src="https://zypheratcg.com/js/fx-estimate.js" async></script>', f'<script src="{STORE_ORIGIN}/js/fx-estimate.js" async></script>'),
            (WHOP_THEME_OLD, WHOP_THEME_NEW),
            ('<meta name="theme-color" content="#0B0F14">', '<meta name="theme-color" content="#0F2A4A">'),
            # the template falls back to zypheratcg's own $74.99 plan when no
            # whopPlanId claim arrives; for GoGetCards there is no safe fallback
            ('|| "plan_hJoWqq65Z09B2"; // fallback: this site\'s own x1 step ($74.99) if no whopPlanId claim arrives.',
             '|| ""; // no fallback: a checkout without a whopPlanId claim must fail loudly, never charge another store\'s plan'),
            # and with no plan id the mount goes straight to the "could not load
            # the payment form" state (showFallback) instead of asking Whop to
            # mint a session for an empty plan
            ('    ensureWhopElements().then(function (WhopElements) {',
             '    (WHOP_PLAN_ID ? ensureWhopElements() : Promise.reject(new Error("no whopPlanId claim on this visit"))).then(function (WhopElements) {'),
        ], 'partner.html')
        p = retheme_css(p)
        page.write_text(p, encoding='utf-8')
        print('partner.html: store links, support address, Whop theme and page theme -> GoGetCards light')

    c = checkout_tsx.read_text(encoding='utf-8')
    if WHOP_THEME_NEW_TSX in c:
        print('WhopCheckout.tsx already converted')
    else:
        c = sub_all(c, [(WHOP_THEME_OLD_TSX, WHOP_THEME_NEW_TSX)], 'WhopCheckout.tsx')
        checkout_tsx.write_text(c, encoding='utf-8')
        print('WhopCheckout.tsx: Whop theme -> light/blue')

    t = thankyou_tsx.read_text(encoding='utf-8')
    if STORE_ORIGIN in t:
        print('ThankYou.tsx already converted')
    else:
        t = sub_all(t, [("const ZYPHERATCG_THANK_YOU = 'https://zypheratcg.com/thank-you';", f"const ZYPHERATCG_THANK_YOU = '{STORE_ORIGIN}/thank-you';")], 'ThankYou.tsx')
        thankyou_tsx.write_text(t, encoding='utf-8')
        print('ThankYou.tsx: thank-you hop -> gogetcards.com')

    leftovers = []
    for f in (server, page, checkout_tsx, thankyou_tsx):
        for i, line in enumerate(f.read_text(encoding='utf-8').splitlines(), 1):
            # comments may still explain the history; only live code counts
            if 'zypheratcg.com' in line and not line.lstrip().startswith(('//', '*', '/*')):
                leftovers.append(f'{f.relative_to(root)}:{i}')
    if leftovers:
        print('WARNING, zypheratcg.com still referenced at:', ', '.join(leftovers))
    else:
        print('no zypheratcg.com reference left in the four files')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    convert(Path(sys.argv[1]).resolve())
