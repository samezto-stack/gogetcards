'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function walk(dir, filter, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

/* REGRESSION: the stored-XSS root cause was `<%- JSON.stringify(x) %>` inside
   an inline <script>. All such embeds must go through jsonForScript, which
   escapes a </script> breakout. This fails the build if a raw one reappears. */
test('no view embeds raw JSON.stringify in a raw EJS output tag', () => {
  const views = walk(path.join(ROOT, 'views'), (p) => p.endsWith('.ejs'));
  const offenders = [];
  for (const file of views) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // `<%-` (raw output) ... JSON.stringify ... on the same line
      if (/<%-[^%]*JSON\s*\.\s*stringify/.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
      }
    });
  }
  assert.deepStrictEqual(offenders, [],
    'Use jsonForScript(...) instead of JSON.stringify in <%- %>:\n' + offenders.join('\n'));
});

/* REGRESSION: admin routers guard per-route with requireAuth (there is no
   blanket router.use). A forgotten guard is an auth bypass. This asserts
   every admin route handler carries requireAuth. */
test('every admin route is protected by requireAuth', () => {
  const adminFiles = fs.readdirSync(path.join(ROOT, 'routes'))
    .filter((f) => /^admin/i.test(f) || f === 'distribution.js')
    .map((f) => path.join(ROOT, 'routes', f));

  const PUBLIC = /\/login|\/logout|\/test-error/;
  const unguarded = [];

  for (const file of adminFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const re = /router\.(get|post|put|delete|patch)\(/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const segment = content.slice(m.index, m.index + 800);
      // The middleware list ends where the handler function begins.
      const handlerAt = segment.search(/async\s*\(|\(\s*req\b/);
      const head = handlerAt >= 0 ? segment.slice(0, handlerAt) : segment;
      const pathMatch = head.match(/['"`]([^'"`]+)['"`]/);
      const routePath = pathMatch ? pathMatch[1] : '(unknown)';
      if (PUBLIC.test(routePath)) continue;
      if (!/requireAuth/.test(head)) {
        unguarded.push(`${path.relative(ROOT, file)} -> ${m[1].toUpperCase()} ${routePath}`);
      }
    }
  }
  assert.deepStrictEqual(unguarded, [],
    'These admin routes are missing requireAuth:\n' + unguarded.join('\n'));
});

/* REGRESSION: the session signing secret must never fall back to a hardcoded
   literal (the original bug let anyone forge an admin cookie). */
test('server.js does not hardcode a session secret fallback', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert.ok(!/secret:\s*process\.env\.SESSION_SECRET\s*\|\|\s*['"]/.test(server),
    'server.js must not fall back to a literal session secret');
});
