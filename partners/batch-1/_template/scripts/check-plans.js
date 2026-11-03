/*
 * The plan ladder, the route map and the copy, checked.
 *
 * WHY THIS IS WORTH A SCRIPT AT ALL. The prices printed on this site are
 * display only — Whop charges whatever the plan id is configured for. So the
 * failure mode of a wrong ladder is not an error, a blank page or a declined
 * card. It is a customer selecting twelve passes, reading $899.88, and being
 * charged $49.99, with nothing anywhere reporting that it happened. Two
 * tiers sharing an id does it. A placeholder id does it. A gap in the units
 * does it.
 *
 * The route check is here for a quieter version of the same problem: a route
 * in App.tsx that is missing from server/seo.js renders perfectly to a human
 * and returns 404 to a crawler, because seo.js is what server.js consults to
 * decide the status code.
 *
 * And the copy check enforces the one rule this whole family of sites is
 * built on — no invented numbers, no testimonials, no fake email addresses.
 *
 * Everything is read out of the source rather than imported: the content is
 * TypeScript and the pages are TSX, and a check that needs a build step to
 * run is a check that stops being run.
 *
 * Run:  node scripts/check-plans.js
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

const content = readFileSync(join(ROOT, 'src/content/site.ts'), 'utf8');

/* ── The ladder ── */
const plans = [...content.matchAll(
  /\{\s*units:\s*(\d+),\s*planId:\s*'([^']+)',\s*price:\s*([\d.]+)\s*\}/g
)].map((m) => ({ units: Number(m[1]), planId: m[2], price: Number(m[3]) }));

check('ladder is readable', plans.length > 0);
check('ladder has 24 tiers', plans.length === 24, `found ${plans.length}`);

const ids = plans.map((p) => p.planId);
check('every tier has its own plan id',
  new Set(ids).size === ids.length,
  [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].join(', '));
/* A rung may be PENDING until its Whop business exists. The checkout then
   renders a "not open yet" notice instead of a plan Whop would refuse, so a
   pending ladder is safe to deploy; it is not safe to launch, and the
   warning below says so on every build. */
const pending = ids.filter((id) => /^plan_PENDING_\d{2}$/.test(id));
if (pending.length) console.log(`WARN  ${pending.length} rung(s) still pending a Whop plan id — the checkout stays closed until they are filled`);
check('every plan id is real or pending',
  ids.every((id) => /^plan_[A-Za-z0-9]{10,}$/.test(id) || /^plan_PENDING_\d{2}$/.test(id)) && !/replace|todo|xxx|placeholder|example/i.test(ids.join(' ')),
  ids.filter((id) => !/^plan_[A-Za-z0-9]{10,}$/.test(id) && !/^plan_PENDING_\d{2}$/.test(id)).join(', '));
check('units run 1..24 with no gaps',
  plans.every((p, i) => p.units === i + 1),
  plans.map((p) => p.units).join(','));

const RATE = 49.99;
const wrong = plans.filter((p) => Math.abs(p.price - p.units * RATE) > 0.005);
check(`every price is ${RATE} x its unit count`,
  wrong.length === 0,
  wrong.map((p) => `${p.units} -> ${p.price}`).join('; '));
check('prices ascend with quantity',
  plans.every((p, i) => i === 0 || p.price > plans[i - 1].price));

/* A fixed-scope service reuses a tier rather than carrying its own plan. If
   its tier is not in the ladder the checkout renders nothing at all, which
   is safe but silent — so it is asserted here instead. */
for (const m of content.matchAll(/fixedTier:\s*(\d+)/g)) {
  const tier = Number(m[1]);
  check(`fixed tier ${tier} exists in the ladder`, plans.some((p) => p.units === tier));
}

/* ── Routes: App.tsx and server/seo.js must agree ── */
const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
const seo = readFileSync(join(ROOT, 'server/seo.js'), 'utf8');

const seoRoutes = new Set([...seo.matchAll(/^\s*'(\/[^']*)':\s*\{/gm)].map((m) => m[1]));
const appRoutes = [...app.matchAll(/<Route path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== '*' && p !== '/' && !p.includes(':'))
  .map((p) => '/' + p.replace(/^\//, ''));

check('seo.js declares the index route', seoRoutes.has('/'));
const missing = appRoutes.filter((p) => !seoRoutes.has(p));
check('every App route has an seo.js entry', missing.length === 0, missing.join(', '));

/* The dynamic /services/:slug route means each service slug in the content
   must have its own seo entry — the parameterised route is invisible to the
   check above and would otherwise 404 for a crawler on every service page. */
const slugs = [...content.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
check('content declares service slugs', slugs.length >= 1, slugs.join(', '));
const slugMissing = slugs.filter((s) => !seoRoutes.has(`/services/${s}`));
check('every service slug has an seo.js entry', slugMissing.length === 0, slugMissing.join(', '));

/* Reverse direction: an seo entry with no page renders the 404 component
   under a 200 status and lists a dead URL in the sitemap. */
const known = new Set([...appRoutes, '/', ...slugs.map((s) => `/services/${s}`)]);
const orphan = [...seoRoutes].filter((p) => !known.has(p));
check('every seo.js entry has a page', orphan.length === 0, orphan.join(', '));

/* ── Honesty rules, across every source file ── */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|js|html)$/.test(entry)) out.push(full);
  }
  return out;
}
const files = walk(join(ROOT, 'src')).concat(
  join(ROOT, 'server/seo.js'),
  join(ROOT, 'server.js'),
  join(ROOT, 'index.html'),
);

/* No email address anywhere. This site routes contact through Whop on
   purpose; a stray address would be one nobody watches. */
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const withEmail = files.filter((f) => {
  const body = readFileSync(f, 'utf8');
  /* Font and script URLs are not addresses; strip URLs before looking. */
  return EMAIL.test(body.replace(/https?:\/\/\S+/g, ''));
});
check('no email address anywhere in the source',
  withEmail.length === 0,
  withEmail.map((f) => relative(ROOT, f)).join(', '));

/* No invented social proof. These are the phrases that show up when a site
   reaches for credibility it has not earned yet. */
const BANNED = [
  /\baward[- ]winning\b/i,
  /\btrusted by\b/i,
  /\bas seen (in|on)\b/i,
  /\b\d[\d,]*\+?\s+(clients|writers|customers|scripts read|happy)\b/i,
  /\b\d{1,3}%\s+(success|of our clients|satisfaction)\b/i,
  /\bindustry[- ]leading\b/i,
  /\bworld[- ]class\b/i,
  /\btestimonial/i,
  /\bfive[- ]star\b/i,
  /\bguarantee(d)? (results|success|representation|an agent)\b/i,
];
/* COMMENTS ARE STRIPPED BEFORE SCANNING. What this rule polices is copy a
   reader sees, and the source is full of comments explaining the rule
   itself — types.ts describes why there is no testimonials page, and that
   sentence is not a testimonial. Scanning them made the check fail on its
   own documentation, which trains people to disable the check. */
function withoutComments(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const offenders = [];
for (const f of files) {
  const body = withoutComments(readFileSync(f, 'utf8'));
  for (const rx of BANNED) {
    const hit = body.match(rx);
    /* The limits copy names some of these in order to disclaim them — a
       sentence saying the site HAS no testimonials is not a claim to have
       any. Exempted per file, since the disclaimer and the phrase it
       disclaims necessarily sit together. */
    if (hit && !/no testimonials|there are no quotes|and no count of/i.test(body)) {
      offenders.push(`${relative(ROOT, f)}: ${hit[0]}`);
    }
  }
}
check('no unsubstantiated claims', offenders.length === 0, offenders.join(' | '));

/* The Whop storefront must be present and must be the one this site's plans
   belong to — a copied content file pointing at the previous site's
   storefront is the mistake this catches. */
const whop = (content.match(/whopUrl:\s*'([^']+)'/) || [])[1];
check('whop storefront url is set', !!whop && /^https:\/\/whop\.com\/[a-z0-9-]+\/$/.test(whop), whop);

/* ── The payment panel shows the currency it is charging ────────────
   zypheratcg sends productPrice AND productCurrency into this frame. The
   override read only the price and pasted a dollar sign in front of it, so
   a buyer who had read £119.98 on the product page, in the cart and in the
   summary beside this very frame was shown "$119.98" on the panel taking
   the money — the last figure before they pay, and the only one that
   disagreed. */
{
  const partner = readFileSync(join(ROOT, 'server/experiences/partner.html'), 'utf8');
  check('the payment panel reads productCurrency',
    /params\.get\("productCurrency"\)/.test(partner));
  check('and builds the amount from that currency, not a hardcoded $',
    /CUR_PREFIX/.test(partner) && !/const disp = "\$" \+ price/.test(partner));
  check('the currency code beside the total is written too',
    /ck-grand-currency"\)[\s\S]{0,80}textContent = cur/.test(partner));
  check('the USD tidy-up pass cannot relabel another currency',
    /_cur !== "USD"\) return null/.test(partner));

  /* AND THE ENGINE HAS TO FORWARD IT. The page reads its claims off the URL,
     and the engine only emits the ones on this whitelist — so productCurrency
     missing from that list meant the claim was dropped in transit and the
     page fell back to a dollar sign no matter what it was sent. Fixing the
     page without this changed nothing at all, which is exactly how it
     survived a deploy. */
  const experience = readFileSync(join(ROOT, 'server/experience.js'), 'utf8');
  check('productCurrency is a passthrough claim',
    /'productCurrency'/.test(experience));
  check('and travels beside the price it labels',
    experience.indexOf("'productPrice'") < experience.indexOf("'productCurrency'"));
}

/* ── The two secrets that have to match the rest of the group ─────────
   WHY THIS CHECK EXISTS. Three 64-character constants sit in
   server/secrets.js and they do not behave the same way. Two are shared
   with gogetcards and every sibling host: EXPERIENCE_API_KEY is the bearer
   token gogetcards presents to mint a gated visit here, and
   THANK_YOU_SIGNING_SECRET is what this server signs a completed purchase
   with before gogetcards will create an order from it. The third,
   EXPERIENCE_SIGNING_SECRET, is private to this site and MUST differ from
   every sibling.

   A scaffold that rotates all three looks careful and is not. Nothing
   throws: the site builds, deploys, serves every page and passes every
   other check here. What happens is that gogetcards' token mint gets a
   401, the partner hop is abandoned, and the buyer meets "This checkout
   cannot be completed" on a storefront that looks perfectly healthy. It is
   invisible from inside this repository, which is precisely why it belongs
   in the repository's own check.

   FINGERPRINTS, NOT VALUES. The expected secrets are hashed rather than
   repeated, so this file adds no second copy of a live secret to the
   repository while still being able to prove the first copy is right. */
{
  const secrets = readFileSync(join(ROOT, 'server/secrets.js'), 'utf8');
  const sha = (v) => createHash('sha256').update(v).digest('hex');
  const valueOf = (name) => {
    const m = secrets.match(new RegExp(`export const ${name}\\b[\\s\\S]{0,1200}?'([0-9a-f]{64})'`));
    return m ? m[1] : '';
  };
  const api = valueOf('EXPERIENCE_API_KEY');
  const thanks = valueOf('THANK_YOU_SIGNING_SECRET');
  const mine = valueOf('EXPERIENCE_SIGNING_SECRET');
  check('EXPERIENCE_API_KEY is the group value — a rotated one 401s the token mint and kills every checkout',
    sha(api) === 'd202202f737818a6c984c64fe1ab89c9be626976289632fc632ded71b7a89ced');
  check('THANK_YOU_SIGNING_SECRET is the group value — a rotated one makes gogetcards reject every order this site signs',
    sha(thanks) === '79fac228397a409e9d678245c3cf842e32f4f0f9487475aa19ebbab4ec54fc27');
  check('EXPERIENCE_SIGNING_SECRET is this site\'s own, not one of the shared two',
    !!mine && mine !== api && mine !== thanks);
}

console.log(fails ? `\n${fails} check(s) FAILED` : `\nAll checks pass (${plans.length} plans, ${seoRoutes.size} routes)`);
process.exit(fails ? 1 : 0);
