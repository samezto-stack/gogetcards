/**
 * File export: the same payload, as XML, CSV or JSON.
 *
 * WHY THIS EXISTS ALONGSIDE THE API: two real cases, neither of which is
 * "we could not build the API integration".
 *
 *   1. Seeing exactly what would be sent, without connecting an account.
 *      A feed you can read is a feed you can check, and the fastest way to
 *      settle an argument about what Google received is to look at it.
 *   2. Channels with no API integration yet. Microsoft, Pinterest and
 *      TikTok all accept a scheduled fetch of an XML or CSV URL, so this
 *      makes them usable today from the same validated payload the Google
 *      provider sends.
 *
 * The RSS 2.0 dialect below is Google's published feed specification, which
 * Microsoft accepts unchanged and the others largely do.
 */

const feedBuilder = require('../feedBuilder');

/** XML text escaping. Omitting this breaks the feed on any title with an ampersand. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Google's feed spec wants a plain decimal and a currency, not micros. */
function priceText(price) {
  if (!price) return '';
  const amount = Number(price.amountMicros || 0) / 1_000_000;
  return `${amount.toFixed(2)} ${price.currencyCode || 'USD'}`;
}

const AVAILABILITY_TEXT = {
  IN_STOCK: 'in_stock',
  OUT_OF_STOCK: 'out_of_stock',
  PREORDER: 'preorder',
  BACKORDER: 'backorder',
};

/** One <item> in Google's RSS dialect. */
function itemXml(p) {
  const rows = [
    ['g:id', p.offerId],
    ['g:title', p.title],
    ['g:description', p.description],
    ['g:link', p.link],
    ['g:image_link', p.imageLink],
    ...(p.additionalImageLinks || []).map((u) => ['g:additional_image_link', u]),
    ['g:availability', AVAILABILITY_TEXT[p.availability] || 'in_stock'],
    ...(p.availabilityDate ? [['g:availability_date', p.availabilityDate]] : []),
    ['g:price', priceText(p.price)],
    ['g:condition', String(p.condition || 'new').toLowerCase()],
    ['g:brand', p.brand],
    ...(p.gtin ? [['g:gtin', p.gtin]] : []),
    ...(p.mpn ? [['g:mpn', p.mpn]] : []),
    ['g:identifier_exists', p.identifierExists ? 'yes' : 'no'],
    /* Variant grouping. The id and the differing attribute have to travel
       together — an item_group_id whose members share every attribute is
       an invalid group, and an attribute with no group id groups nothing —
       so both come from the same payload fields or neither is written. */
    ...(p.itemGroupId ? [['g:item_group_id', p.itemGroupId]] : []),
    ...Object.entries(p.variantAttributes || {}).map(([axis, value]) => [`g:${axis}`, value]),
    ['g:google_product_category', p.googleProductCategory],
    ...(p.productTypes || []).map((t) => ['g:product_type', t]),
    ...(p.shippingLabel ? [['g:shipping_label', p.shippingLabel]] : []),
    ...(p.isBundle ? [['g:is_bundle', 'yes']] : []),
    ...(p.multipack ? [['g:multipack', p.multipack]] : []),
    ...(p.unitPricingMeasure ? [['g:unit_pricing_measure', p.unitPricingMeasure]] : []),
    ...(p.unitPricingBaseMeasure ? [['g:unit_pricing_base_measure', p.unitPricingBaseMeasure]] : []),
    ...(p.adult ? [['g:adult', 'yes']] : []),
    ...(p.customLabel0 ? [['g:custom_label_0', p.customLabel0]] : []),
    ...(p.customLabel1 ? [['g:custom_label_1', p.customLabel1]] : []),
    ...(p.excludedDestinations || []).map((d) => ['g:excluded_destination', d]),
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  const shippingBlocks = (p.shipping || []).map((s) => (
    `    <g:shipping>\n`
    + `      <g:country>${esc(s.country)}</g:country>\n`
    + `      <g:service>${esc(s.service)}</g:service>\n`
    + `      <g:price>${esc(priceText(s.price))}</g:price>\n`
    + `      <g:min_handling_time>${esc(s.minHandlingTime)}</g:min_handling_time>\n`
    + `      <g:max_handling_time>${esc(s.maxHandlingTime)}</g:max_handling_time>\n`
    + `      <g:min_transit_time>${esc(s.minTransitTime)}</g:min_transit_time>\n`
    + `      <g:max_transit_time>${esc(s.maxTransitTime)}</g:max_transit_time>\n`
    + `    </g:shipping>`
  )).join('\n');

  const details = (p.productDetails || []).map((d) => (
    `    <g:product_detail>\n`
    + `      <g:section_name>${esc(d.sectionName)}</g:section_name>\n`
    + `      <g:attribute_name>${esc(d.attributeName)}</g:attribute_name>\n`
    + `      <g:attribute_value>${esc(d.attributeValue)}</g:attribute_value>\n`
    + `    </g:product_detail>`
  )).join('\n');

  return `  <item>\n`
    + rows.map(([tag, v]) => `    <${tag}>${esc(v)}</${tag}>`).join('\n')
    + (shippingBlocks ? '\n' + shippingBlocks : '')
    + (details ? '\n' + details : '')
    + `\n  </item>`;
}

/** A complete RSS 2.0 feed. */
function toXml(payloads, { title = 'GoGetCards', link = feedBuilder.siteOrigin() } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`
    + `<channel>\n`
    + `  <title>${esc(title)}</title>\n`
    + `  <link>${esc(link)}</link>\n`
    + `  <description>${esc(title)} product feed</description>\n`
    + payloads.map(itemXml).join('\n') + '\n'
    + `</channel>\n</rss>\n`;
}

/* CSV column order follows Google's spec so the header row can be pasted
   into Merchant Center's own column mapper without renaming anything. */
const CSV_COLUMNS = [
  ['id', (p) => p.offerId],
  ['title', (p) => p.title],
  ['description', (p) => p.description],
  ['link', (p) => p.link],
  ['image_link', (p) => p.imageLink],
  ['additional_image_link', (p) => (p.additionalImageLinks || []).join(',')],
  ['availability', (p) => AVAILABILITY_TEXT[p.availability] || 'in_stock'],
  ['availability_date', (p) => p.availabilityDate || ''],
  ['price', (p) => priceText(p.price)],
  ['condition', (p) => String(p.condition || 'new').toLowerCase()],
  ['brand', (p) => p.brand],
  ['gtin', (p) => p.gtin || ''],
  ['mpn', (p) => p.mpn || ''],
  ['identifier_exists', (p) => (p.identifierExists ? 'yes' : 'no')],
  ['google_product_category', (p) => p.googleProductCategory],
  ['product_type', (p) => (p.productTypes || []).join(',')],
  ['shipping_label', (p) => p.shippingLabel || ''],
  ['is_bundle', (p) => (p.isBundle ? 'yes' : '')],
  ['multipack', (p) => p.multipack || ''],
];

/** RFC 4180 quoting: a description containing a comma or a newline breaks the file otherwise. */
function csvCell(value) {
  const s = String(value == null ? '' : value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The variant columns this particular catalogue needs.
 *
 * ADDED ONLY WHEN SOMETHING FILLS THEM. Google's variant attributes are a
 * fixed set, so every one of them could be a column always — but a store
 * with no variants would then get four permanently empty columns it has to
 * map or dismiss in Merchant Center's importer, which is noise standing in
 * for a feature it does not use. A catalogue that groups by colour gets an
 * item_group_id and a colour column and nothing else.
 */
function variantColumns(payloads) {
  const axes = new Set();
  let grouped = false;
  for (const p of payloads) {
    if (p.itemGroupId) grouped = true;
    for (const axis of Object.keys(p.variantAttributes || {})) axes.add(axis);
  }
  if (!grouped && !axes.size) return [];
  return [
    ['item_group_id', (p) => p.itemGroupId || ''],
    ...[...axes].sort().map((axis) => [axis, (p) => (p.variantAttributes || {})[axis] || '']),
  ];
}

function toCsv(payloads) {
  const columns = [...CSV_COLUMNS, ...variantColumns(payloads)];
  const header = columns.map(([name]) => name).join(',');
  const rows = payloads.map((p) => columns.map(([, get]) => csvCell(get(p))).join(','));
  return [header, ...rows].join('\n') + '\n';
}

/** JSON, exactly as the API would receive it. The most useful one for debugging. */
function toJson(payloads) {
  return JSON.stringify({ generatedAt: new Date().toISOString(), count: payloads.length, products: payloads }, null, 2);
}

module.exports = { id: 'file', toXml, toCsv, toJson, priceText, AVAILABILITY_TEXT };
