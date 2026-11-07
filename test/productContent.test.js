const { test } = require('node:test');
const assert = require('node:assert');
const csv = require('../services/productCsv');
const variants = require('../services/variants');

test('boxPackCount reads packs per box, never cards per pack', () => {
  const cases = [
    ['12 Collector Boosters per box, 15 cards per pack', 12],
    ['30 Play Boosters per box, 14 cards per pack', 30],
    ['24 Jumpstart Boosters per box, 20 cards per pack (51 possible themes)', 24],
    ['English box: 20 packs per box, 10 cards per pack', 20],
    ['36 booster packs, 10 cards per pack', 36],
    ['6 Delta Reign booster packs', 6],
    ['6 packs per box, 10 cards per pack', 6],
    ['15 cards per pack', null], // a lone cards count must NOT be read as packs
  ];
  for (const [cfg, want] of cases) assert.strictEqual(csv.boxPackCount(cfg), want, cfg);
});

test('titlePackCount parses both title formats', () => {
  assert.strictEqual(csv.titlePackCount('MTG Lorwyn Eclipsed Collector Booster Box (12 Packs)'), 12);
  assert.strictEqual(csv.titlePackCount('One Piece Card Game PRB-02 The Best Vol. 2 Booster Box (English, 20 packs)'), 20);
  assert.strictEqual(csv.titlePackCount('Pokémon TCG Pitch Black Elite Trainer Box'), null);
});

test('import plan flags a title whose pack count contradicts the configuration', () => {
  const header = 'handle,title,specs';
  const bad = `${header}\nx-box,X Collector Booster Box (15 Packs),Configuration: 12 Collector Boosters per box, 15 cards per pack`;
  const good = `${header}\nx-box,X Collector Booster Box (12 Packs),Configuration: 12 Collector Boosters per box, 15 cards per pack`;
  const lookup = () => ({ _id: '1', slug: 'x-box', title: 'X', price: 9998 });
  const planBad = csv.plan(bad, { lookup });
  const planGood = csv.plan(good, { lookup });
  assert.ok(planBad.rows[0].warnings.some((w) => /title says 15 packs but the configuration says 12/.test(w)), 'contradiction is flagged');
  assert.ok(!planGood.rows[0].warnings.some((w) => /packs but the configuration says/.test(w)), 'agreement is not flagged');
});

test('displayTitle appends the variant name on grouped products, without duplicating it', () => {
  const mew = { title: 'Pokémon TCG 30th Celebration Figure Collection', variantGroup: 'g-figure', variantName: 'Mew', packSize: 1 };
  const mewtwo = { ...mew, variantName: 'Mewtwo' };
  assert.strictEqual(variants.displayTitle(mew), 'Pokémon TCG 30th Celebration Figure Collection — Mew');
  assert.strictEqual(variants.displayTitle(mewtwo), 'Pokémon TCG 30th Celebration Figure Collection — Mewtwo');
  // Star Trek Commander decks must be distinguishable.
  const fed = { title: 'MTG Star Trek Commander Deck', variantGroup: 'g-st-cd', variantName: 'Federation Fleet', packSize: 1 };
  const borg = { ...fed, variantName: 'We Are the Borg' };
  assert.notStrictEqual(variants.displayTitle(fed), variants.displayTitle(borg));
  // Already-named titles are not grown.
  const already = { title: 'MTG Star Trek Commander Deck — Federation Fleet', variantGroup: 'g-st-cd', variantName: 'Federation Fleet', packSize: 1 };
  assert.strictEqual(variants.displayTitle(already), 'MTG Star Trek Commander Deck — Federation Fleet');
  // An ungrouped single product is unchanged.
  assert.strictEqual(variants.displayTitle({ title: 'Pokémon TCG Pitch Black Booster Box', packSize: 1 }), 'Pokémon TCG Pitch Black Booster Box');
});
