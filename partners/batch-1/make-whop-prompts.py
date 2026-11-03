#!/usr/bin/env python3
"""
Write one Whop setup prompt per batch-1 site.

    python3 make-whop-prompts.py  >  whop-prompts.md

Each prompt is pasted into a Claude chat that can drive the browser on
whop.com, inside the Whop business that is being repurposed for that site.
The rules come from docs/whop-business-setup.md (gogetcards): rename the
existing business, never create one; transactional emails off; one-time
plans only; no invented claims; plan ids returned in one fixed block.

GoGetCards is US-only for now, so each business carries one ladder:
twenty-four USD plans, rung n priced at exactly n x $49.99.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEP_CENTS = 4999
RUNGS = 24


def money(cents: int) -> str:
    return f'${cents // 100:,}.{cents % 100:02d}'


def prompt(spec: dict, n: int) -> str:
    name = spec['name']
    slug = spec['slug']
    svc = spec['serviceSlug']
    host = f'https://{svc}.onrender.com'
    unit = spec['unitNoun']
    plural = spec.get('unitNounPlural', unit + 's')
    desc = spec['whop']['description'].replace('{host}', host)
    noclaim = spec['whop']['noClaim']
    ladder = '\n'.join(
        f'| {r:>2} | {name} — {r} {unit if r == 1 else plural} | {money(STEP_CENTS * r)} |'
        for r in range(1, RUNGS + 1))
    block = '\n'.join(f'USD-{r:02d}: plan_…' for r in range(1, RUNGS + 1))
    return f"""## {n:02d}. {name}  (`{slug}`)

````text
You are setting up a Whop business for a website called {name}. Work only
inside the Whop business I have open — do NOT create a new business.

1. RENAME THE EXISTING BUSINESS
   - Business name: {name}
   - Business URL / slug: {slug}   (so the store is whop.com/{slug}/)
     If that slug is taken, use {slug}-review and tell me at the end.
   - Delete or archive every existing product and plan left over from the
     business's previous name, so nothing old can still be bought.

2. TURN OFF WHOP'S CUSTOMER EMAILS
   Business Settings → Checkout → turn OFF "Send transactional emails to
   your members". The website sends its own receipt; a second email from a
   name the buyer has never seen reads as a duplicate charge.

3. BUSINESS DESCRIPTION (paste exactly)
   {desc}

4. ONE PRODUCT, TWENTY-FOUR PLANS
   Create one product called "{spec['serviceName']}". Give it 24 plans.
   Every plan is a ONE-TIME payment in USD — never a subscription, no
   trial, no renewal, no setup fee, no discount, quantity 1, unlimited
   stock, visible. Prices are exact: do not round anything.

   | # | Plan name | Price (USD, one-time) |
   |---|-----------|-----------------------|
{ladder}

   Product description: "One {spec['serviceName'].lower()} per {unit}, delivered as a
   written report through {host}. The purchase is used on that website,
   outside Whop."

5. WHAT THE BUSINESS MAY NOT SAY
   Anywhere on Whop (name, description, product, plans, images): no
   reviews, ratings, testimonials, customer counts, years in business,
   certifications, awards, partnerships or affiliations; no real company,
   platform, regulator or professional body named or implied; no claim to
   a qualification or licence. {noclaim}

6. DO NOT change payout, tax or bank settings. Do not publish anything
   to the Whop Discover marketplace.

7. REPLY FORMAT
   Finish with this block and nothing after it. One line per plan, in
   order, with the real plan id (it starts with plan_). Check each line's
   price against the table before you write it.

   SITE: {slug}
   WHOP: https://whop.com/<the final slug>/
{chr(10).join('   ' + l for l in block.splitlines())}
````
"""


def main():
    specs = sorted((HERE / 'specs').glob('*.json'))
    order = json.loads((HERE / 'order.json').read_text())
    by_slug = {json.loads(p.read_text())['slug']: json.loads(p.read_text()) for p in specs}
    missing = [s for s in order if s not in by_slug]
    if missing:
        sys.exit(f'specs missing for: {", ".join(missing)}')
    out = ['# GoGetCards partner batch 1 — Whop setup prompts', '',
           'One prompt per Whop business. Open the business you are repurposing, '
           'paste the prompt, and send the reply\'s final block back to Claude — '
           'it fills the plan ids into the site and writes the import CSV.', '',
           'Every business: 24 one-time USD plans, rung n = n × $49.99 '
           '($49.99 … $1,199.76). Transactional emails OFF.', '']
    for i, slug in enumerate(order, 1):
        out.append(prompt(by_slug[slug], i))
    sys.stdout.write('\n'.join(out))


if __name__ == '__main__':
    main()
