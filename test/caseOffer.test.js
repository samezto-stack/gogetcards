const test = require('node:test');
const assert = require('node:assert/strict');
const { pairFor, boxesIn, isCase } = require('../services/caseOffer');

const box = { _id: 'b1', title: 'Pokémon TCG Prismatic Evolutions Booster Box', productType: 'Booster Box', price: 19999, available: true };
const theCase = { _id: 'c1', title: 'Pokémon TCG Prismatic Evolutions Booster Box Case (6 Boxes)', productType: 'Case', price: 99999, available: true };
const otherCase = { _id: 'c2', title: 'Pokémon TCG Surging Sparks Booster Box Case (6 Boxes)', productType: 'Case', price: 89999, available: true };

test('a box finds its case by title, with boxes, per-box price and savings', () => {
  const pair = pairFor(box, [otherCase, theCase, box]);
  assert.equal(pair.kind, 'case');
  assert.equal(pair.product._id, 'c1');
  assert.equal(pair.boxes, 6);
  assert.equal(pair.perBox, 16667);
  assert.equal(pair.savingsPct, 17);
});

test('a case finds its box', () => {
  const pair = pairFor(theCase, [box, otherCase]);
  assert.equal(pair.kind, 'box');
  assert.equal(pair.product._id, 'b1');
});

test('set codes decide outright, and a mismatch is a miss', () => {
  const b = { ...box, setCode: 'SV8.5' };
  const c = { ...theCase, title: 'PE Case', setCode: 'SV8.5' };
  assert.equal(pairFor(b, [c]).product._id, 'c1');
  assert.equal(pairFor(b, [{ ...c, setCode: 'SV8' }]), null);
});

test('no clean match, sold out, or self: null', () => {
  assert.equal(pairFor(box, [otherCase]), null);
  assert.equal(pairFor(box, [{ ...theCase, available: false }]), null);
  assert.equal(pairFor(box, [box]), null);
  assert.equal(pairFor(null, []), null);
});

test('boxes in a case come from specs before the title', () => {
  assert.equal(boxesIn({ title: 'X Case', specs: [{ label: 'Boxes per case', value: '12' }] }), 12);
  assert.equal(boxesIn({ title: 'X Case (6 Boxes)' }), 6);
  assert.equal(boxesIn({ title: 'X Case' }), null);
});

test('isCase reads the type or the title', () => {
  assert.equal(isCase({ productType: 'Case' }), true);
  assert.equal(isCase({ title: 'Something Case (6 Boxes)' }), true);
  assert.equal(isCase({ title: 'Showcase Box', productType: 'Booster Box' }), false);
});
