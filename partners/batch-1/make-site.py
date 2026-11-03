#!/usr/bin/env python3
"""
Build one GoGetCards partner site from the staged template.

    python3 make-site.py specs/case-study.json

The template at _template/ is already converted to GoGetCards (parent
origins, endpoints, shared secrets, 24-rung ladder). This script does the
per-site part: names and slugs in the thirteen files that carry them, a
fresh EXPERIENCE_SIGNING_SECRET, the palette and display font, the SEO
descriptions, the footer disclaimer, the service-page paragraph, the share
image, and the content file. Then it initialises git and commits.

The spec is a JSON file; the content file is TypeScript written by hand,
because the copy is the product and nothing mechanical can write it.
"""
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / '_template'
TEMPLATE_SLUG = 'business-plan-review'
TEMPLATE_NAME = 'Business Plan'


def sub(path: Path, pairs, label=None):
    s = path.read_text(encoding='utf-8')
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f'{label or path.name}: expected text not found: {old[:80]!r}')
        s = s.replace(old, new)
    path.write_text(s, encoding='utf-8')


def seo_routes(spec, name, service_slug):
    d = spec['seo']
    return [
        ("'https://business-plan-review.onrender.com';", f"'https://{service_slug}.onrender.com';"),
        ("export const SITE_NAME = 'Business Plan';", f"export const SITE_NAME = '{name}';"),
        ("title: 'Business Plan | Business Plan Reviews',", f"title: '{name} | {name} Reviews',"),
        ("'One business plan read cold, the way an investor or lender reads it: the narrative read against the model claim by claim, the market checked for a bottom-up sizing, the ask checked against the use of funds, and the load-bearing assumptions checked for whether they are stated or buried. One payment, no subscription.',", repr_js(d['home'])),
        ("'The business plan review, priced per plan, in twelve steps. No advice on whether the business is viable or whether it will raise, nothing certified, nothing argued or rewritten, no packages and no retainer.',", repr_js(d['services'])),
        ("'/services/business-plan-review': {", f"'/services/{service_slug}': {{"),
        ("title: 'Business Plan Review | Business Plan',", f"title: '{spec['serviceName']} | {name}',"),
        ("'Send one business plan and the financial model behind it. The narrative read against the model claim by claim, the market checked for a path from a real customer and price to the total, the ask checked against the use of funds and the runway, and the assumptions checked for whether they are stated.',", repr_js(d['service'])),
        ("'One rate per plan at $74.99, in twelve steps from $74.99 to $899.88. No packages, no subscription, no volume discount and no surcharge.',", repr_js(d['pricing'])),
        ("'Write the brief with what kind of plan and who reads it, attach the plan and the model, pay in a panel on the same page, and get findings section by section back in three business days.',", repr_js(d['howItWorks'])),
        ("'What Business Plan does not do: no advice on whether the business is viable or whether it will raise, no view on the decision the material informs, nothing certified as viable or investment-ready, and nothing argued or rewritten.',", repr_js(d['standards'])),
        ("'A business plan is not a description of the company you want to build but a case an investor or lender reads for whether the story and the numbers are the same story, and Business Plan reads one the way they do — narrative against model.',", repr_js(d['about'])),
        ("'Why the report will not say whether the business will raise or is viable, why a plan the team knows cold is still worth checking, why nothing is written, what an investor objects to first, and how much can be redacted.',", repr_js(d['faq'])),
        ("'Notes on why the narrative and the model have to be the same company, why a market sized top-down is a number and not a plan, why the ask has to be the size of the plan it funds, and why a buried assumption is a risk the reader finds by breaking the sheet.',", repr_js(d['resources'])),
        ("'Reach Business Plan through its Whop storefront, where messages are actually read.'", repr_js(f'Reach {name} through its Whop storefront, where messages are actually read.')[:-1]),
        ("'The terms under which Business Plan supplies Business Plan reviews, and what it does not advise on, certify or rewrite.'", repr_js(d['terms'])[:-1]),
    ]


def repr_js(s: str) -> str:
    """A single-quoted JS string literal with the right escapes."""
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "',"


def main(spec_path: str):
    spec = json.loads(Path(spec_path).read_text(encoding='utf-8'))
    slug = spec['slug']                      # repo name, e.g. case-study
    service_slug = spec['serviceSlug']       # e.g. case-study-review
    name = spec['name']                      # e.g. Case Study
    content = HERE / 'content' / f'{slug}.ts'
    if not content.exists():
        raise SystemExit(f'no content file at {content}')
    ts = content.read_text(encoding='utf-8')
    if '__LADDER__' in ts:
        ladder = '[\n' + ''.join(
            f"    {{ units: {r}, planId: 'plan_PENDING_{r:02d}', price: {r * 4999 // 100}.{r * 4999 % 100:02d} }},\n"
            for r in range(1, 25)) + '  ]'
        content.write_text(ts.replace('__LADDER__', ladder), encoding='utf-8')
    out = HERE / slug
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(TEMPLATE, out, symlinks=False, ignore=shutil.ignore_patterns('node_modules', 'dist', '.git'))

    # ── shared secrets: the saved copy of the template carries placeholders ──
    sj = out / 'server' / 'secrets.js'
    txt = sj.read_text(encoding='utf-8')
    for ph, env in (('__GGC_THANK_YOU_SIGNING_SECRET__', 'GGC_THANK_YOU_SIGNING_SECRET'),
                    ('__GGC_EXPERIENCE_API_KEY__', 'GGC_EXPERIENCE_API_KEY')):
        if ph in txt:
            val = os.environ.get(env, '')
            if not re.fullmatch(r'[0-9a-f]{64}', val):
                raise SystemExit(f'{env} must be set (64 hex characters) to build from the saved template')
            txt = txt.replace(ph, val)
    sj.write_text(txt, encoding='utf-8')

    # ── names and slugs ──
    sub(out / 'package.json', [(f'"name": "{TEMPLATE_SLUG}"', f'"name": "{service_slug}"')])
    sub(out / 'render.yaml', [(f'# Render Blueprint for {TEMPLATE_SLUG} (SSR Express server).', f'# Render Blueprint for {service_slug} (SSR Express server).'),
                              (f'    name: {TEMPLATE_SLUG}', f'    name: {service_slug}')])
    sub(out / 'server' / 'experience.js', [(f"'partner', '{TEMPLATE_SLUG}'", f"'partner', '{service_slug}'")])
    sub(out / 'server.js', [(f"  '{TEMPLATE_SLUG}',", f"  '{service_slug}',")])
    sub(out / 'server' / 'secrets.js', [("'b138178b40230232c7edc9c8dea83b3feb1da7d8933db6e240a6f01c2152b65e'", f"'{secrets.token_hex(32)}'")])
    sub(out / 'server' / 'seo.js', seo_routes(spec, name, service_slug), 'seo.js')
    seo = (out / 'server' / 'seo.js').read_text(encoding='utf-8').replace(TEMPLATE_NAME, name)
    (out / 'server' / 'seo.js').write_text(seo, encoding='utf-8')
    lock = (out / 'package-lock.json').read_text(encoding='utf-8')
    if lock.count(f'"name": "{TEMPLATE_SLUG}"') != 2:
        raise SystemExit('package-lock.json: expected the template name twice')
    (out / 'package-lock.json').write_text(lock.replace(f'"name": "{TEMPLATE_SLUG}"', f'"name": "{service_slug}"'), encoding='utf-8')

    # ── layout: tabs, comment, footer disclaimer ──
    tabs = ', '.join(f"'{t}'" for t in spec['tabs'])
    sub(out / 'src' / 'components' / 'layout' / 'RootLayout.tsx', [
        ("const ASSUMPTIONS = ['Narrative', 'Market', 'Ask', 'Assumptions'];", f'const ASSUMPTIONS = [{tabs}];'),
        (" * Business Plan's shell: a pack with tab dividers.", f" * {name}'s shell: a pack with tab dividers."),
        ("{site.name} is not an investor, an adviser or an accountant, builds no model and advises on no raise. Nothing here builds the model, writes the plan, sets a valuation, forecasts a return or endorses the business, and no section is drafted or reworded. Whether the business will raise or is viable is the founder&rsquo;s and the market&rsquo;s.",
         '{site.name} ' + spec['footerDisclaimer']),
    ])
    sub(out / 'src' / 'pages' / 'Home.tsx', [(" * Business Plan's home page, laid out as the pack the subject arrives in.", f" * {name}'s home page, laid out as the pack the subject arrives in.")])
    sub(out / 'src' / 'pages' / 'Service.tsx', [
        ("The model is read beside the narrative, because every claim in the words is read against the number that should produce it. A plan read section by section finds confident prose; it does not find the growth the narrative promises that the model three tabs over never produces.",
         spec['servicePara']),
    ])

    # ── palette and display font ──
    p = spec['palette']
    sub(out / 'src' / 'index.css', [
        ('--color-brand-light: #EAF0EE;', f"--color-brand-light: {p['light']};"),
        ('--color-brand-accent: #1F6B5C;', f"--color-brand-accent: {p['accent']};"),
        ('--color-brand-accent-lift: #79B2A5;', f"--color-brand-accent-lift: {p['accentLift']};"),
        ('--color-brand-cool: #273230;', f"--color-brand-cool: {p['cool']};"),
        ('--color-brand-cool-lift: #99A6A2;', f"--color-brand-cool-lift: {p['coolLift']};"),
        ("--font-display: 'Fraunces', Georgia, serif;", f"--font-display: {spec['font']['css']};"),
    ])
    sub(out / 'index.html', [
        ('family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&', f"family={spec['font']['link']}&"),
    ])

    # ── content ──
    shutil.copyfile(content, out / 'src' / 'content' / 'site.ts')

    # ── share image ──
    og = spec['og']
    html = f"""<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={spec['font']['link']}&family=IBM+Plex+Mono:wght@500&family=Inter:wght@400;600&display=swap">
<style>html,body{{margin:0}} .c{{width:1200px;height:630px;background:#0E1114;box-sizing:border-box;padding:84px 90px 72px;display:flex;flex-direction:column;justify-content:space-between;font-family:Inter,sans-serif;color:#C9CED3}}
.e{{font-family:'IBM Plex Mono',monospace;font-size:19px;letter-spacing:.32em;text-transform:uppercase;color:{p['accentLift']}}} .r{{width:96px;height:4px;background:{p['accent']};margin:26px 0 30px}}
.t{{font-family:{spec['font']['css']};font-size:80px;font-weight:700;color:#FFFFFF;letter-spacing:-.02em;line-height:1.05;margin:0 0 34px}} .b{{font-size:27px;line-height:1.5;max-width:960px;color:#AEB5BC;margin:0}}
.p{{font-size:21px;color:#8F969E}} .p b{{color:#FFFFFF;font-weight:600}}</style></head>
<body><div class="c"><div><div class="e">{og['eyebrow']}</div><div class="r"></div><h1 class="t">{name}</h1><p class="b">{og['body']}</p></div><div class="p"><b>$49.99</b> · one payment · nothing recurring</div></div></body></html>"""
    (out / 'public' / 'og.html').write_text(html, encoding='utf-8')
    subprocess.run(['node', str(HERE / 'og.js'), str(out / 'public' / 'og.html'), str(out / 'public' / 'og-image.png')], check=True)
    (out / 'public' / 'og.html').unlink()

    # ── nothing of the template's identity may survive ──
    leftovers = subprocess.run(['grep', '-rIl', '-e', TEMPLATE_NAME, '-e', TEMPLATE_SLUG, '-e', '74.99', '-e', 'plan_hJoWqq65Z09B2',
                                '--exclude-dir=node_modules', '--exclude-dir=.git', '.'], cwd=out, capture_output=True, text=True).stdout.split()
    if leftovers:
        raise SystemExit(f'{slug}: template identity left in ' + ', '.join(leftovers))

    # ── syntax gate: the server files are plain JS that vite never compiles ──
    for f in ['server.js', 'server/seo.js', 'server/secrets.js', 'server/experience.js']:
        subprocess.run(['node', '--check', str(out / f)], check=True)

    # ── git ──
    subprocess.run(['git', 'init', '-q', '-b', 'main'], cwd=out, check=True)
    subprocess.run(['git', 'add', '-A'], cwd=out, check=True)
    subprocess.run(['git', '-c', 'user.name=samezto', '-c', 'user.email=samezto@gmail.com', 'commit', '-q', '-m',
                    f"{name}: a GoGetCards partner site\n\nBuilt from the partner template with the GoGetCards conversion: the\n{spec['serviceName']} sold per {spec['unitNoun']} on a twenty-four rung ladder of $49.99.\nPlan ids are pending until this site's Whop business exists; the checkout\nshows a closed notice until they are filled in.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_018GyUPW9UPkeg2u6aFgNWoi"],
                   cwd=out, check=True)
    print(f'{slug}: built at {out}')


if __name__ == '__main__':
    main(sys.argv[1])
