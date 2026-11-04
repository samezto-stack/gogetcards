/* Regression checks from the 2026-11 production audit. Each one is a
   static assertion for a defect that was live at the time. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}
const js = (dirs) => dirs.flatMap((d) => walk(path.join(ROOT, d), (p) => p.endsWith('.js')));
const rel = (p) => path.relative(ROOT, p);

test('Order documents are created only inside services/orderPipeline/orderService.js', () => {
  const offenders = js(['routes', 'services', 'middleware', 'helpers', 'cron'])
    .filter((f) => !f.endsWith(path.join('orderPipeline', 'orderService.js')))
    .filter((f) => /\bOrder\.(create|insertMany)\(|new Order\(|Order\.findOneAndUpdate\([^;]*upsert:\s*true/.test(fs.readFileSync(f, 'utf8')))
    .map(rel);
  assert.deepStrictEqual(offenders, []);
});

test('the Shopify-era /api/track-order endpoint is gone (410), not an order writer', () => {
  const src = fs.readFileSync(path.join(ROOT, 'routes/frontend.js'), 'utf8');
  const m = src.match(/router\.post\('\/api\/track-order'[^\n]*\n/);
  assert.ok(m && /410/.test(m[0]), 'expected a one-line 410 handler');
});

test('no secret falls back to a literal in code', () => {
  const re = /(?<!SITE_)(?<!PUBLIC_)(SECRET|_KEY|TOKEN|PASSWORD)\s*=\s*process\.env\.(?!RECAPTCHA_SITE_KEY)\w+\s*(\|\||\?\?)\s*['"`][A-Za-z0-9_\-]{16,}['"`]/;
  const offenders = js(['routes', 'services', 'config', 'helpers', 'middleware']).concat([path.join(ROOT, 'server.js')])
    .filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map(rel);
  assert.deepStrictEqual(offenders, []);
});

test('route handlers never put err.message or err.stack in a response', () => {
  const re = /res\.(status\(\d+\)\.)?(send|json|redirect)\([^;]*\b(err|error|e)\.(message|stack)\b/;
  const offenders = [];
  for (const f of js(['routes'])) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (re.test(line)) offenders.push(`${rel(f)}:${i + 1}`);
    });
  }
  assert.deepStrictEqual(offenders, []);
});

test('seed scripts carry no literal admin password', () => {
  for (const f of ['seed.js', 'seed-data.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/password:\s*['"][^'"]+['"]/.test(src), `${f} contains a literal password`);
  }
});

test('outbound requests to operator-supplied URLs go through helpers/safeUrl', () => {
  for (const f of ['services/partnerClient.js', 'services/distribution/imageProbe.js']) {
    assert.ok(/helpers\/safeUrl/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `${f} does not use safeUrl`);
  }
});

test('the 404 page is sent through helpers/notFound everywhere', () => {
  const offenders = js(['routes', 'middleware']).concat([path.join(ROOT, 'server.js')])
    .filter((f) => /render\('pages\/404'\)/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  assert.deepStrictEqual(offenders, []);
});
