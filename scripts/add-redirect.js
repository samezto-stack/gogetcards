/**
 * Point an old product URL at the product it became.
 *
 *     node scripts/add-redirect.js <old-slug> <current-slug>
 *     node scripts/add-redirect.js <old-slug> <current-slug> --dry-run
 *
 * From here on, renaming a product records its own history automatically
 * (see the hooks in models/Product.js). This is for the renames that
 * already happened before that existed, where the old URL is out there
 * ranking and 404ing at the same time.
 *
 * It refuses to create a redirect that would break something:
 *
 *   - the current slug must exist, or the redirect points at a 404
 *   - the old slug must NOT belong to a live product, or a real page would
 *     start redirecting away from itself
 *   - a slug cannot redirect to itself
 *
 * Accepts a full URL or a bare slug, because the thing you have in front
 * of you is usually a URL out of Search Console.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Reduces anything you might paste to a bare slug. All of these work:
 *
 *   https://zypheratcg.com/products/foo-bar?utm_source=x
 *   /products/foo-bar/
 *   products/foo-bar          <- how Search Console shows it
 *   foo-bar
 */
function toSlug(input) {
  let s = String(input || '').trim();
  s = s.split('?')[0].split('#')[0];
  const at = s.indexOf('/products/');
  if (at !== -1) s = s.slice(at + '/products/'.length);
  while (s.startsWith('/')) s = s.slice(1);
  if (s.startsWith('products/')) s = s.slice('products/'.length);
  while (s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const oldSlug = toSlug(args[0]);
  const newSlug = toSlug(args[1]);

  if (!oldSlug || !newSlug) {
    console.error('usage: node scripts/add-redirect.js <old-slug-or-url> <current-slug-or-url> [--dry-run]');
    process.exit(1);
  }
  if (oldSlug === newSlug) {
    console.error('Those are the same slug. Nothing to redirect.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  const target = await Product.findOne({ slug: newSlug }).select('title slug previousSlugs');
  if (!target) {
    console.error(`No product has the slug "${newSlug}".`);
    console.error('The redirect would point at a 404, so nothing was written.');
    const near = await Product.find({ slug: new RegExp(newSlug.split('-').slice(0, 3).join('-'), 'i') })
      .select('slug').limit(5).lean();
    if (near.length) {
      console.error('\nDid you mean:');
      for (const p of near) console.error('  ' + p.slug);
    }
    process.exit(1);
  }

  const occupied = await Product.findOne({ slug: oldSlug }).select('title slug').lean();
  if (occupied) {
    console.error(`"${oldSlug}" is a LIVE product right now ("${occupied.title}").`);
    console.error('Redirecting it would take a working page off the internet. Nothing was written.');
    process.exit(1);
  }

  if ((target.previousSlugs || []).includes(oldSlug)) {
    console.log(`Already redirecting:\n  /products/${oldSlug}\n  -> /products/${target.slug}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`product : ${target.title}`);
  console.log(`redirect: /products/${oldSlug}`);
  console.log(`      -> /products/${target.slug}   (301)`);

  if (dryRun) {
    console.log('\nDry run. Nothing written.');
  } else {
    await Product.updateOne({ _id: target._id }, { $addToSet: { previousSlugs: oldSlug } });
    console.log('\nSaved. It takes effect on the next request; no redeploy needed.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
