/**
 * Reports which database Page documents are now unreachable.
 *
 * WHAT CHANGED: this script used to patch the live policy pages, because
 * they were Page documents served at /page/<slug> and their text had
 * drifted from the rest of the site (they named PayPal as a payment
 * processor long after PayPal stopped being offered, and claimed prices
 * included taxes that the shipping policy said were the buyer's).
 *
 * Those pages are now hardcoded in config/trustPages.js and served at
 * top-level URLs, and every old /page/<slug> 301s to its replacement. So
 * there is nothing left to patch: the stored documents are no longer
 * rendered to anyone. Patching them would have been busywork on text that
 * nobody reads.
 *
 * What is still worth doing is telling you they are there. A Page document
 * that is shadowed by a redirect is invisible but editable, which is a trap:
 * someone edits the privacy policy in Admin > Pages, sees no change on the
 * site, and has no way to know why. This lists them so they can be deleted.
 *
 * Run:  node scripts/fix-legal-pages.js            (report only)
 *       node scripts/fix-legal-pages.js --delete   (removes the shadowed ones)
 *
 * Deleting is opt-in and never the default. These documents may hold text
 * worth copying into config/trustPages.js first.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Page = require('../models/Page');
const trustPages = require('../config/trustPages');

const DELETE = process.argv.includes('--delete');

/* Slugs whose /page/<slug> URL now 301s. Kept in step with
   LEGACY_PAGE_REDIRECTS in routes/frontend.js; a slug missing here is
   merely reported as "still live", never silently deleted. */
const SHADOWED = new Set([
  'shipping-and-returns',
  'refund-policy',
  'terms-of-service',
  'privacy-policy',
  'cookie-policy',
  'disclaimer',
  'track-order',
  'faq',
]);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Nothing to connect to.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const pages = await Page.find().select('slug title updatedAt').lean();
  const shadowed = pages.filter((p) => SHADOWED.has(p.slug));
  const live = pages.filter((p) => !SHADOWED.has(p.slug));

  console.log(`${pages.length} Page document(s) in this database.\n`);

  if (shadowed.length) {
    console.log('SHADOWED — /page/<slug> now 301s, so these are never rendered:');
    for (const p of shadowed) {
      console.log(`  ${p.slug.padEnd(24)} "${p.title}"  (edited ${new Date(p.updatedAt).toISOString().split('T')[0]})`);
      console.log(`      now served from config/trustPages.js at a top-level URL`);
    }
    console.log(
      DELETE
        ? '\nDeleting these.'
        : '\nRe-run with --delete to remove them. Copy anything worth keeping into'
          + '\nconfig/trustPages.js first: deleting is not reversible from here.'
    );
    if (DELETE) {
      const res = await Page.deleteMany({ slug: { $in: shadowed.map((p) => p.slug) } });
      console.log(`Deleted ${res.deletedCount}.`);
    }
  } else {
    console.log('No shadowed pages. Nothing to clean up.');
  }

  if (live.length) {
    console.log('\nSTILL LIVE at /page/<slug>, and editable in Admin > Pages:');
    live.forEach((p) => console.log(`  ${p.slug.padEnd(24)} "${p.title}"`));
  }

  /* A hardcoded page whose slug also exists in the database would be
     ambiguous to a maintainer even though the route order resolves it. */
  const clash = live.filter((p) => trustPages.bySlug(p.slug));
  if (clash.length) {
    console.log('\nWARNING — these database pages share a slug with a hardcoded page.');
    console.log('The hardcoded version wins (its route is registered first), so the');
    console.log('database copy is unreachable. Delete it to avoid confusion:');
    clash.forEach((p) => console.log(`  ${p.slug}`));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
