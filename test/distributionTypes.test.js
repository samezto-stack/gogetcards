const { test } = require('node:test');
const assert = require('node:assert');
const validators = require('../services/distribution/validators');

const detect = (title, productType = '') => {
  const t = validators.TCG_TYPES.find((x) => x.test.test(`${title} ${productType}`));
  return t ? t.id : null;
};

test('every configuration sold in the catalogue is recognised', () => {
  const cases = [
    ['Pokémon TCG Mega Evolution Booster Box', 'Booster Box', 'booster-box'],
    ['2025-26 Panini Prizm Basketball Hobby Box', 'Hobby Box', 'hobby-box'],
    ['2026-27 Topps Flagship Basketball Hobby Jumbo Box', 'Jumbo Hobby Box', 'hobby-box'],
    ['2026 Bowman Chrome Baseball Mega Box', 'Mega Box', 'hobby-box'],
    ['Pokémon TCG 30th Celebration Ultra-Premium Collection', 'Ultra-Premium Collection', 'premium'],
    ['Pokémon TCG 30th Celebration Figure Collection: Mew', 'Figure Collection', 'premium'],
    ['Disney Lorcana Hyperia City Prerelease Box', 'Prerelease Box', 'prerelease'],
    ['Pokémon TCG Delta Reign Build & Battle Box', 'Build & Battle Box', 'prerelease'],
    ['Disney Lorcana Attack of the Vine! Illumineer’s Trove', 'Illumineer’s Trove', 'trove'],
    ['MTG Star Trek Commander Deck: Klingon Fury', 'Commander Deck', 'starter'],
    ['MTG Star Trek Draft Night', 'Draft Night Box', 'starter'],
    ['Pokémon TCG 30th Celebration 2-Pack Blister', 'Blister Pack', 'pack'],
    ['Pokémon TCG 30th Celebration Booster Bundle', 'Booster Bundle', 'bundle'],
    ['Pokémon TCG Delta Reign Elite Trainer Box', 'Elite Trainer Box', 'etb'],
    ['One Piece Card Game OP-17 Booster Case', 'Case', 'case'],
  ];
  for (const [title, type, expected] of cases) assert.strictEqual(detect(title, type), expected, title);
});

test('a booster box of a "Mega" set is a booster box, not a retail mega box', () => {
  assert.strictEqual(detect('Pokémon TCG Mega Evolution Booster Box', 'Booster Box'), 'booster-box');
});
