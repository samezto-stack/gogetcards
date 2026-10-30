/*
 * Requires every module in the project, and fails if any of them throws.
 *
 * WHY THIS EXISTS: a deploy crashed with "ReferenceError: site is not
 * defined" while `node --check` passed on every file and all four other
 * audit suites were green. The cause was a require statement that had been
 * inserted after the FIRST LINE of a block comment, so it was commented
 * out — syntactically perfect, and the identifier simply did not exist at
 * runtime.
 *
 * Nothing else here catches that. `node --check` parses without executing.
 * The page and route suites only load the modules those pages happen to
 * touch, and config/push.js and services/pushNotify.js are reached only
 * from server.js's boot path, which no test runs. So the first thing to
 * execute those files was Render, in production, and the first sign of
 * trouble was the service failing to start.
 *
 * Executing a module top-to-bottom is the cheapest possible check and it
 * catches the whole class: undefined identifiers at module scope, a
 * mistyped path, a circular require that resolves to undefined, a config
 * that throws when a variable is missing.
 *
 * Run:  node scripts/audit/check-modules.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/* Directories with nothing to load, or nothing we own. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'public', 'views', 'scripts', 'coverage']);

/* server.js calls boot() at module scope: requiring it would open a port
   and connect to a database. Its dependencies are all covered below, which
   is the part that can break this way. */
const SKIP_FILES = new Set(['server.js']);

/* The modules that legitimately demand configuration. Requiring them with
   an empty environment throws by design, which is correct behaviour and
   not a failure to report — so the environment gets the same minimum a
   deploy would provide. */
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(32);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.js') && !SKIP_FILES.has(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(ROOT).sort();
let failed = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  try {
    require(file);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${rel}`);
    console.log(`        ${err.name}: ${err.message}`);
    /* The first stack frame inside our own code, which is the line to go
       and look at. Node's own loader frames are noise here. */
    const frame = (err.stack || '').split('\n')
      .find((l) => l.includes(ROOT) && !l.includes('node_modules'));
    if (frame) console.log(`      ${frame.trim()}`);
  }
}

console.log(failed
  ? `\n${failed} of ${files.length} module(s) FAILED to load`
  : `\nAll ${files.length} modules load cleanly`);
process.exit(failed ? 1 : 0);
