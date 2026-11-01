const test = require('node:test');
const assert = require('node:assert/strict');
const csv = require('../services/productCsv');

test('parseCsv handles quotes, doubled quotes, embedded commas and newlines, CRLF and a BOM', () => {
  const rows = csv.parseCsv('﻿a,b,c\r\n1,"two, with comma","line\nbreak"\r\n"say ""hi""",,\r\n\r\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', 'two, with comma', 'line\nbreak'], ['say "hi"', '', '']]);
});

test('toCsv and parseCsv round-trip every column', () => {
  const product = {
    slug: 'op-11-booster-box-japanese', title: 'One Piece — OP-11 Booster Box (Japanese)', vendor: 'Bandai', productType: 'Booster Box',
    price: 14997, comparePrice: 15999, stock: 10, available: true, preorder: false, preorderShips: '', releaseDate: null, featured: true, badge: '',
    imageUrl: 'https://img.example/op11.jpg', images: ['https://img.example/op11-back.jpg'], description: '<p>24 packs, "sealed".</p>',
    specs: [{ label: 'Configuration', value: '24 Booster Packs' }, { label: 'Language', value: 'Japanese' }],
    collections: ['one-piece', 'booster-boxes'], tags: ['one-piece', 'op-11'], sku: 'GGC-OP11', gtin: '4549660000000', mpn: 'OP-11', brand: 'Bandai',
    language: 'Japanese', edition: '', setCode: 'OP-11', variantGroup: '', variantName: '', variantAxis: 'color', variantOrder: 0,
    allocationLimit: 0, stockHold: false, supersededBy: '', marketPrices: [{ market: 'CA', amount: 19999, compareAmount: 0, available: true }],
  };
  const text = csv.toCsv([product]);
  const rows = csv.parseCsv(text);
  assert.equal(rows.length, 2);
  const { columns } = csv.resolveHeaders(rows[0]);
  assert.equal(columns.length, csv.COLUMNS.length, 'every exported header is recognised on the way back in');
  const body = csv.rowToBody(rows[1], columns, null);
  assert.equal(body.slug, product.slug);
  assert.equal(body.price, '149.97');
  assert.equal(body.images, 'https://img.example/op11-back.jpg');
  assert.equal(body.specs, 'Configuration: 24 Booster Packs\nLanguage: Japanese');
  assert.equal(body.collections, 'one-piece, booster-boxes');
  assert.equal(body.available, 'true');
  assert.equal(body.preorder, '');
  assert.equal(body.mp_CA_amount, '199.99');
  assert.equal(body.mp_CA_available, 'true');
  assert.equal(body.mp_UK_amount, '');
});

test('plan: a new row needs a title and a price, and matches an existing product by handle or sku', () => {
  const existing = { _id: 'abc', slug: 'pokemon-etb', sku: 'GGC-ETB', title: 'Pokémon ETB', price: 9998, available: true, collections: ['pokemon'], tags: ['pokemon'], images: [], specs: [], marketPrices: [] };
  const lookup = ({ slug, sku }) => (slug === existing.slug || sku === existing.sku) ? existing : null;
  const text = [
    'handle,title,price,stock,collections',
    'pokemon-etb,,,7,',                          // update by handle: only stock changes
    ',Magic Bundle,149.97,3,mtg',                // create
    ',No Price Here,,1,pokemon',                 // error: price missing
    'pokemon-etb,Dup,99.98,1,pokemon',           // error: duplicate handle in file
  ].join('\n');
  const out = csv.plan(text, { lookup, knownCollections: new Set(['pokemon', 'mtg']) });
  assert.equal(out.headerError, null);
  assert.deepEqual(out.summary, { create: 1, update: 1, error: 2, total: 4 });
  const [upd, cre, bad, dup] = out.rows;
  assert.equal(upd.action, 'update');
  assert.equal(upd.existingId, 'abc');
  assert.equal(upd.body.stock, '7');
  assert.equal(upd.body.title, '', 'a present-but-blank title cell clears the field, as in Shopify');
  assert.equal(upd.body.sku, 'GGC-ETB', 'a column the file lacks is left as stored');
  assert.equal(cre.action, 'create');
  assert.equal(cre.handle, 'magic-bundle');
  assert.equal(cre.body.available, 'true', 'a create with no available column defaults to sellable');
  assert.equal(bad.action, 'error');
  assert.match(bad.errors.join(' '), /price is required/);
  assert.equal(dup.action, 'error');
  assert.match(dup.errors.join(' '), /already used on row 2/);
});

test('plan: warns about an off-grid price, a missing line collection and a missing image', () => {
  const out = csv.plan('title,price,collections\nSome Box,150.00,booster-boxes', { lookup: () => null });
  const w = out.rows[0].warnings.join(' | ');
  assert.match(w, /not a multiple of 49.99/);
  assert.match(w, /no line collection/);
  assert.match(w, /no image_url/);
  assert.equal(out.rows[0].action, 'create', 'warnings do not block');
});

test('plan: Shopify headers are understood', () => {
  const out = csv.plan('Handle,Title,Body (HTML),Vendor,Type,Variant Price,Variant SKU,Image Src\nsv-etb,SV ETB,<p>x</p>,Pokémon,ETB,99.98,SKU1,https://x/y.jpg', { lookup: () => null });
  assert.equal(out.headerError, null);
  const b = out.rows[0].body;
  assert.equal(b.slug, 'sv-etb');
  assert.equal(b.description, '<p>x</p>');
  assert.equal(b.productType, 'ETB');
  assert.equal(b.price, '99.98');
  assert.equal(b.sku, 'SKU1');
  assert.equal(b.imageUrl, 'https://x/y.jpg');
});

test('plan: no header row is refused', () => {
  const out = csv.plan('foo,bar\n1,2', { lookup: () => null });
  assert.match(out.headerError, /header/);
});

test('draftFromImageUrls groups views of one product and guesses the line', () => {
  const { csv: text, count } = csv.draftFromImageUrls([
    'https://cdn.example.com/img/pokemon-prismatic-evolutions-etb-front.jpg',
    'https://cdn.example.com/img/pokemon-prismatic-evolutions-etb-back.jpg',
    'https://cdn.example.com/img/2025%20topps%20chrome%20baseball%20hobby%20box.png',
  ].join('\n'));
  assert.equal(count, 2);
  const rows = csv.parseCsv(text);
  const { columns } = csv.resolveHeaders(rows[0]);
  const a = csv.rowToBody(rows[1], columns, null);
  const b = csv.rowToBody(rows[2], columns, null);
  assert.equal(a.slug, 'pokemon-prismatic-evolutions-etb');
  assert.equal(a.title, 'Pokemon Prismatic Evolutions ETB');
  assert.equal(a.imageUrl, 'https://cdn.example.com/img/pokemon-prismatic-evolutions-etb-front.jpg');
  assert.equal(a.images, 'https://cdn.example.com/img/pokemon-prismatic-evolutions-etb-back.jpg');
  assert.equal(a.collections, 'pokemon');
  assert.equal(b.collections, 'baseball');
  assert.equal(a.price, '', 'the price is never guessed');
});

test('template parses back with no errors except the ones its blanks are meant to show', () => {
  const out = csv.plan(csv.template(), { lookup: () => null });
  assert.equal(out.headerError, null);
  assert.equal(out.summary.error, 0);
  assert.equal(out.summary.create, 2);
});
