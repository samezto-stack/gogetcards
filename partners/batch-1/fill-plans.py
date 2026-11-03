#!/usr/bin/env python3
"""
Take the reply blocks the Whop setup prompts end with and put the plan
ids where they belong.

    python3 fill-plans.py replies.txt

replies.txt holds one or more blocks, pasted as returned:

    SITE: case-study
    WHOP: https://whop.com/case-study/
    USD-01: plan_abc...
    ...
    USD-24: plan_xyz...

For each block: every rung present exactly once, every id shaped like a
Whop plan id, no id reused anywhere in the batch. Then the ids replace
the pending ones in content/<slug>.ts and in the built site's
src/content/site.ts (whopUrl too, when the slug came back different), and
the site is committed. Finally gogetcards-import.csv is rewritten from
every site whose ladder is complete: that file is what gogetcards'
/admin/settings import reads (site,url,market,step,plan_id,unit_price).

Nothing is half-applied: a block with any problem changes nothing.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNGS = 24
UNIT = '49.99'
PLAN = re.compile(r'^plan_[A-Za-z0-9]{6,40}$')


def parse(text):
    blocks, cur = [], None
    for raw in text.splitlines():
        line = raw.strip().strip('`').strip()
        if not line:
            continue
        m = re.match(r'^SITE:\s*([a-z0-9-]+)$', line)
        if m:
            cur = {'slug': m.group(1), 'whop': None, 'ids': {}, 'errors': []}
            blocks.append(cur)
            continue
        if cur is None:
            continue
        m = re.match(r'^WHOP:\s*(https://whop\.com/[a-z0-9-]+/?)$', line)
        if m:
            cur['whop'] = m.group(1).rstrip('/') + '/'
            continue
        m = re.match(r'^USD-(\d{2}):\s*(\S+)$', line)
        if m:
            rung, pid = int(m.group(1)), m.group(2)
            if not 1 <= rung <= RUNGS:
                cur['errors'].append(f'rung {rung} is outside 1..{RUNGS}')
            elif rung in cur['ids']:
                cur['errors'].append(f'rung {rung:02d} appears twice')
            elif not PLAN.match(pid):
                cur['errors'].append(f'rung {rung:02d}: "{pid}" is not a Whop plan id')
            else:
                cur['ids'][rung] = pid
    return blocks


def ids_in(ts: str):
    return re.findall(r"planId: '([^']+)'", ts)


def apply(block, spec):
    slug = block['slug']
    content = HERE / 'content' / f'{slug}.ts'
    site = HERE / slug / 'src' / 'content' / 'site.ts'
    ts = content.read_text(encoding='utf-8')
    for r in range(1, RUNGS + 1):
        pat = re.compile(r"(\{ units: %d, planId: ')[^']*(')" % r)
        ts, n = pat.subn(lambda m: m.group(1) + block['ids'][r] + m.group(2), ts)
        if n != 1:
            raise SystemExit(f'{slug}: rung {r} found {n} times in {content.name}')
    if block['whop']:
        ts = re.sub(r"whopUrl: '[^']*'", f"whopUrl: '{block['whop']}'", ts, count=1)
    content.write_text(ts, encoding='utf-8')
    if site.exists():
        site.write_text(ts, encoding='utf-8')
        subprocess.run(['git', 'add', 'src/content/site.ts'], cwd=site.parents[2], check=True)
        subprocess.run(['git', '-c', 'user.name=samezto', '-c', 'user.email=samezto@gmail.com',
                        'commit', '-q', '-m',
                        f"{spec['name']}: Whop plan ids for all twenty-four rungs\n\n"
                        "The checkout opens: every rung now names the one-time USD plan\n"
                        "that charges exactly that multiple of $49.99.\n\n"
                        "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
                        "Claude-Session: https://claude.ai/code/session_018GyUPW9UPkeg2u6aFgNWoi"],
                       cwd=site.parents[2], check=True)


def write_csv(specs):
    rows = ['site,url,market,step,plan_id,unit_price']
    done, pending = [], []
    for slug in json.loads((HERE / 'order.json').read_text()):
        spec = specs.get(slug)
        f = HERE / 'content' / f'{slug}.ts'
        if not spec or not f.exists():
            pending.append(slug)
            continue
        ids = ids_in(f.read_text(encoding='utf-8'))
        if len(ids) != RUNGS or any(i.startswith('plan_PENDING') for i in ids):
            pending.append(slug)
            continue
        url = f"https://{spec['serviceSlug']}.onrender.com/services/{spec['serviceSlug']}"
        for step, pid in enumerate(ids, 1):
            rows.append(f"{spec['name']},{url},US,{step},{pid},{UNIT}")
        done.append(slug)
    (HERE / 'gogetcards-import.csv').write_text('\n'.join(rows) + '\n', encoding='utf-8')
    print(f'gogetcards-import.csv: {len(done)} site(s) complete, {len(pending)} pending')
    if pending:
        print('  pending: ' + ', '.join(pending))


def main(path):
    specs = {}
    for p in (HERE / 'specs').glob('*.json'):
        s = json.loads(p.read_text(encoding='utf-8'))
        specs[s['slug']] = s
    blocks = parse(Path(path).read_text(encoding='utf-8'))
    if not blocks:
        sys.exit('no "SITE: <slug>" block found')

    # every id already in the batch, other than the ones being replaced
    seen = {}
    for slug in specs:
        f = HERE / 'content' / f'{slug}.ts'
        if f.exists():
            for pid in ids_in(f.read_text(encoding='utf-8')):
                if not pid.startswith('plan_PENDING'):
                    seen[pid] = slug

    bad = False
    incoming = {}
    for b in blocks:
        if b['slug'] not in specs:
            b['errors'].append('no such site in this batch')
        missing = [f'{r:02d}' for r in range(1, RUNGS + 1) if r not in b['ids']]
        if missing:
            b['errors'].append('missing rung(s) ' + ', '.join(missing))
        for r, pid in b['ids'].items():
            other = seen.get(pid)
            if other and other != b['slug']:
                b['errors'].append(f'rung {r:02d}: {pid} is already {other}\'s')
            if pid in incoming and incoming[pid] != (b['slug'], r):
                b['errors'].append(f'rung {r:02d}: {pid} is used twice in this paste')
            incoming[pid] = (b['slug'], r)
        if b['errors']:
            bad = True
            print(f"{b['slug']}: NOT applied")
            for e in b['errors']:
                print('   - ' + e)
    if bad:
        sys.exit('nothing was changed; fix the block(s) above and run again')
    for b in blocks:
        apply(b, specs[b['slug']])
        print(f"{b['slug']}: 24 plan ids filled" + (f" · whopUrl {b['whop']}" if b['whop'] else ''))
    write_csv(specs)


if __name__ == '__main__':
    main(sys.argv[1])
