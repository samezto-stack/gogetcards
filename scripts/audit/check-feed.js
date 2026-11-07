/*
 * Exercises the PUBLIC feed endpoint the way Google's fetcher will: no
 * session, no admin cookie, no auth header.
 *
 * The whole point of this route is that it works for a client that cannot
 * log in, so testing it while authenticated would prove nothing. An
 * earlier version of this feature was the admin-only export, which returns
 * a login page to an anonymous fetcher — HTTP 200, valid HTML, and a
 * completely malformed feed.
 *
 * Run:  node scripts/audit/check-feed.js
 */
const express = require('express');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'config/distribution')).defaults;
process.env.SITE_URL = 'https://gogetcards.com';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(32);

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

const Product = require(path.join(ROOT, 'models/Product'));
const ChannelConfig = require(path.join(ROOT, 'models/ChannelConfig'));

const FIXTURES = [
  { _id: 'p1', title: 'One Piece TCG OP-17 Booster Box', slug: 'op-17-booster-box',
    price: 29998, imageUrl: 'https://example.com/a.jpg', images: [],
    description: '<p>Factory sealed booster box with twenty-four packs inside.</p>',
    vendor: 'Bandai', brand: 'Bandai', productType: 'Booster Box', tags: [],
    available: true, sku: 'GGC-OP17-BB', gtin: '4570118083104', mpn: 'OP-17-BB',
    language: 'English', preorder: false, releaseDate: null },
  /* Pack-sold: listed as a multipack at the pack price, pictured as a pack. */
  { _id: 'p5', title: 'Pokémon TCG 30th Celebration Booster Bundle – 6 Booster Packs', slug: 'celebration-bundle',
    price: 19996, packSize: 3, imageUrl: 'https://example.com/b.jpg', images: [],
    description: '<p>Six booster packs in a bundle, factory sealed and ready to open.</p><p>Sold in packs of 3: 3 units for $199.96, $66.65 each.</p>',
    vendor: 'The Pokémon Company', brand: 'The Pokémon Company', productType: 'Booster Bundle', tags: ['ads-launch', 'pokemon'],
    available: true, sku: 'GGC-30TH-BB', gtin: '', mpn: '',
    language: 'English', preorder: false, releaseDate: null },
  /* Deliberately broken: no description, no image. Must NOT appear. */
  { _id: 'p2', title: 'Broken Product', slug: 'broken', price: 100,
    imageUrl: '', images: [], description: '', vendor: '', brand: '',
    productType: '', tags: [], available: true, language: 'English' },
  /* One product sold as two boxes, sharing a GTIN and an MPN — the Day and
     Night case. This is the arrangement that fails SILENTLY when it is
     wrong: Google reads two ungrouped offers carrying one barcode as the
     same listing submitted twice, keeps one, drops the other and reports
     nothing. So both are asserted to carry the group id and a DIFFERING
     variant attribute, which is the only thing that makes a shared barcode
     legitimate rather than a duplicate. */
  { _id: 'p3', title: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection',
    slug: 'celebration-upc-night', price: 29999, imageUrl: 'https://example.com/n.jpg',
    images: [], description: '<p>Factory sealed collection with thirty booster packs.</p>',
    vendor: 'The Pokémon Company', brand: 'The Pokémon Company',
    productType: 'Ultra-Premium Collection', tags: [], available: true,
    sku: 'ZT-30TH-NIGHT', gtin: '196214158696', mpn: '10-10448-120',
    language: 'English', preorder: false, releaseDate: null,
    variantGroup: '10-10448-120', variantName: 'Night (Umbreon ex)',
    variantAxis: 'color', variantOrder: 1 },
  { _id: 'p4', title: 'Pokémon TCG: 30th Celebration Ultra-Premium Collection',
    slug: 'celebration-upc-day', price: 27999, imageUrl: 'https://example.com/d.jpg',
    images: [], description: '<p>Factory sealed collection with thirty booster packs.</p>',
    vendor: 'The Pokémon Company', brand: 'The Pokémon Company',
    productType: 'Ultra-Premium Collection', tags: [], available: true,
    sku: 'ZT-30TH-DAY', gtin: '196214158696', mpn: '10-10448-120',
    language: 'English', preorder: false, releaseDate: null,
    variantGroup: '10-10448-120', variantName: 'Day (Espeon ex)',
    variantAxis: 'color', variantOrder: 2 },
];

const thenable = (v) => { const c = { lean: () => c, select: () => c, sort: () => c, limit: () => c,
  then: (r) => Promise.resolve(v).then(r), catch: () => c }; return c; };
Product.find = () => thenable(FIXTURES);
ChannelConfig.findOne = () => thenable({ selectionMode: 'all' });

const app = express();
app.use('/feed', require(path.join(ROOT, 'routes/feed')));

const server = http.createServer(app).listen(0, async () => {
  const port = server.address().port;
  const get = (p) => new Promise((r) => http.get(`http://127.0.0.1:${port}${p}`, (res) => {
    let b = ''; res.on('data', (c) => b += c); res.on('end', () => r({ status: res.statusCode, headers: res.headers, body: b }));
  }));

  const xml = await get('/feed/google.xml');
  check('anonymous GET /feed/google.xml is 200', xml.status === 200, 'got ' + xml.status);
  check('served as XML', /application\/xml/.test(xml.headers['content-type'] || ''));
  check('not indexable', /noindex/.test(xml.headers['x-robots-tag'] || ''));
  check('cacheable', /max-age=\d+/.test(xml.headers['cache-control'] || ''));
  check('is a Google RSS feed', /<rss[^>]+xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/.test(xml.body));
  /* offerId is sku || slug, so a product WITH a sku is keyed on it —
     the stable identifier a purchase order can be reconciled against,
     which is the point of preferring it. */
  check('valid product is present, keyed on its SKU',
    /<g:id>GGC-OP17-BB<\/g:id>/.test(xml.body));
  check('INVALID product is omitted', !/<g:id>broken<\/g:id>/.test(xml.body));

  /* ── Pack-sold product ── */
  const packItem = (xml.body.split('<item>').find((it) => it.includes('<g:id>GGC-30TH-BB</g:id>')) || '');
  check('pack product is present', !!packItem);
  check('pack: price is the pack price with multipack and unit pricing',
    /<g:price>199\.96 USD<\/g:price>/.test(packItem) && /<g:multipack>3<\/g:multipack>/.test(packItem)
    && /<g:unit_pricing_measure>3 ct<\/g:unit_pricing_measure>/.test(packItem) && /<g:unit_pricing_base_measure>1 ct<\/g:unit_pricing_base_measure>/.test(packItem));
  check('pack: title says so before the detail tail',
    /<g:title>Pokémon TCG 30th Celebration Booster Bundle \(Pack of 3\) – 6 Booster Packs<\/g:title>/.test(packItem));
  check('pack: pictured as a pack, single photo as the extra image',
    /<g:image_link>https:\/\/gogetcards\.com\/images\/multipack\/celebration-bundle\.png\?v=[a-f0-9]{8}<\/g:image_link>/.test(packItem)
    && /<g:additional_image_link>https:\/\/example\.com\/b\.jpg<\/g:additional_image_link>/.test(packItem));
  check('pack: the stale price sentence is out of the description, the pack fact is in',
    !/\$199\.96/.test(packItem) && /Sold as a pack of 3/.test(packItem));
  check('pack: custom labels', /<g:custom_label_0>ads_launch<\/g:custom_label_0>/.test(packItem) && /<g:custom_label_1>multipack<\/g:custom_label_1>/.test(packItem)
    && /<g:custom_label_2>pokemon<\/g:custom_label_2>/.test(packItem) && /<g:custom_label_3>price_050_199<\/g:custom_label_3>/.test(packItem)
    && /<g:custom_label_4>in_stock<\/g:custom_label_4>/.test(packItem));
  check('carries free shipping', /<g:price>0\.00 USD<\/g:price>/.test(xml.body));
  check('carries the GTIN', /<g:gtin>4570118083104<\/g:gtin>/.test(xml.body));
  check('no admin data leaks', !/merchantId|refreshToken|quota|lastSyncHash/i.test(xml.body));

  /* One shipping block per TARGETED market, and not one more.
  
     The store ships to thirty-two countries and the product page says so;
     the feed describes only the markets it is submitted under, which is now
     the US and Canada. One file serves both, because Google reads the block
     for the country it is fetching for. Thirty-two blocks per item would be
     file weight Google acts on none of, plus an invitation to an
     invalid-shipping-country warning — so this asserts the exact set from
     config/distribution rather than merely "at least one". */
  const targeted = D.targetCountries || [D.targetCountry];
  const countries = [...xml.body.matchAll(/<g:shipping>\s*<g:country>([A-Z]{2})<\/g:country>/g)]
    .map((m) => m[1]);
  /* Divided by the number of items in the feed, not counted raw: this
     asserts a PER-ITEM figure, and adding a fixture above would otherwise
     make it fail for having more products rather than more countries. */
  const itemCount = (xml.body.match(/<item>/g) || []).length;
  const perItem = (xml.body.match(/<g:shipping>/g) || []).length / itemCount;
  check('one shipping block per targeted market',
    perItem === targeted.length, `found ${perItem} per item, expected ${targeted.length}`);
  check('every targeted market has a shipping block',
    targeted.every((c) => countries.includes(c)), 'got ' + countries.join(', '));
  check('no untargeted country appears',
    countries.every((c) => targeted.includes(c)), 'got ' + countries.join(', '));

  /* ── Variant grouping ── */
  const itemOf = (id) => (xml.body.match(new RegExp(`<item>(?:(?!</item>)[\\s\\S])*<g:id>${id}</g:id>[\\s\\S]*?</item>`)) || [''])[0];
  const nightItem = itemOf('ZT-30TH-NIGHT');
  const dayItem = itemOf('ZT-30TH-DAY');
  const plainItem = itemOf('GGC-OP17-BB');
  check('both boxes are in the feed', !!nightItem && !!dayItem);
  check('both carry the same item_group_id',
    /<g:item_group_id>10-10448-120<\/g:item_group_id>/.test(nightItem)
    && /<g:item_group_id>10-10448-120<\/g:item_group_id>/.test(dayItem));
  check('each carries its own variant attribute',
    /<g:color>Night \(Umbreon ex\)<\/g:color>/.test(nightItem)
    && /<g:color>Day \(Espeon ex\)<\/g:color>/.test(dayItem));
  /* The reason the group exists. Two offers may share a barcode ONLY as
     variants; ungrouped they are a duplicate and one is suppressed. */
  check('a shared GTIN is carried by both, not deduplicated',
    /<g:gtin>196214158696<\/g:gtin>/.test(nightItem)
    && /<g:gtin>196214158696<\/g:gtin>/.test(dayItem));
  check('the version name reaches the title',
    /<g:title>[^<]*Night \(Umbreon ex\)<\/g:title>/.test(nightItem)
    && /<g:title>[^<]*Day \(Espeon ex\)<\/g:title>/.test(dayItem));
  check('each variant links to its own page',
    /<g:link>[^<]*celebration-upc-night<\/g:link>/.test(nightItem)
    && /<g:link>[^<]*celebration-upc-day<\/g:link>/.test(dayItem));
  check('an ungrouped product carries no variant markup',
    !/g:item_group_id|g:color/.test(plainItem));

  const csv = await get('/feed/google.csv');
  check('CSV variant works', csv.status === 200 && /^id,title,description/.test(csv.body));
  check('CSV gains the variant columns only when something fills them',
    /(^|,)item_group_id(,|$)/m.test(csv.body.split('\n')[0])
    && /(^|,)color(,|$)/m.test(csv.body.split('\n')[0])
    && !/(^|,)pattern(,|$)/m.test(csv.body.split('\n')[0]));
  const json = await get('/feed/google.json');
  check('JSON variant works', json.status === 200 && Array.isArray(JSON.parse(json.body).products));
  const bad = await get('/feed/google.txt');
  check('unknown format 404s', bad.status === 404, 'got ' + bad.status);

  /* Token gating, when configured. */
  process.env.FEED_TOKEN = 's3cret';
  const noKey = await get('/feed/google.xml');
  const withKey = await get('/feed/google.xml?key=s3cret');
  check('FEED_TOKEN set: request without the key 404s', noKey.status === 404, 'got ' + noKey.status);
  check('FEED_TOKEN set: request with the key succeeds', withKey.status === 200, 'got ' + withKey.status);
  delete process.env.FEED_TOKEN;

  server.close();
  console.log(fails ? `\n${fails} feed check(s) FAILED` : '\nAll feed checks pass');
  process.exit(fails ? 1 : 0);
});
