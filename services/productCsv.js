/**
 * Products as a CSV, both ways.
 *
 * One file, one row per product, columns named the way the product form
 * labels them. Shopify's product CSV is the model: an operator who has used
 * that knows what to expect here (handle = slug, blank cell = clear the
 * field, matching handle = update), and the parts that would have needed
 * several rows per product there (images) are a single pipe-separated cell
 * here, because a spreadsheet with one row per product is what somebody
 * actually maintains.
 *
 * WHAT THIS MODULE DOES NOT DO. It never touches the database and never
 * builds the stored document itself. Every row is turned into the same
 * flat `body` the product form posts, and routes/admin.js runs it through
 * the one parseProductBody that the form uses. One conversion, one set of
 * rules: a price typed as 139.99 is stored as 13999 whichever door it came
 * in by, a GTIN is never synthesised, a variant axis is checked against
 * Google's list. The import cannot be more lenient than the form.
 *
 * COLUMNS. `COLUMNS` is the single description of the file: the header,
 * how a product is written out, and how a cell becomes a form field. The
 * template, the export, the import and the docs all read from it, so they
 * cannot disagree.
 */

const catalog = require('../config/catalog');
const markets = require('../config/markets');
const partnerRotation = require('./partnerRotation');

/* Lists inside a cell: "pokemon | etbs | best-sellers". Commas are the
   CSV's own separator, so a second one is needed, and a pipe is the one
   nobody puts in a product title. */
const LIST_SEP = '|';

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'on', 'x']);

function bool(cell) {
  return TRUE_WORDS.has(String(cell || '').trim().toLowerCase()) ? 'true' : '';
}
function list(cell) {
  return String(cell || '').split(LIST_SEP).map((s) => s.trim()).filter(Boolean);
}
function joinList(arr) {
  return (arr || []).filter(Boolean).join(` ${LIST_SEP} `);
}
function cents(n) {
  return n == null || n === '' ? '' : (Number(n) / 100).toFixed(2);
}
function slugify(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function dateOnly(d) {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString().slice(0, 10);
}

/* Each column: the header as it appears in the file, how the product's
   stored value is written to a cell, and which form field(s) the cell
   sets. `set` writes into a body object the way the form would post it. */
const BASE_COLUMNS = [
  { key: 'handle', header: 'handle', hint: 'URL slug. Blank: made from the title. A row whose handle (or sku) matches an existing product updates it.',
    get: (p) => p.slug || '', set: (b, v) => { b.slug = v.trim(); } },
  { key: 'title', header: 'title', required: true, hint: 'Required.',
    get: (p) => p.title || '', set: (b, v) => { b.title = v.trim(); } },
  { key: 'vendor', header: 'vendor', hint: 'Publisher or manufacturer, as shown on the page.',
    get: (p) => p.vendor || '', set: (b, v) => { b.vendor = v.trim(); } },
  { key: 'product_type', header: 'product_type', hint: 'Booster Box, Elite Trainer Box, Hobby Box, Case …',
    get: (p) => p.productType || '', set: (b, v) => { b.productType = v.trim(); } },
  { key: 'price', header: 'price', required: true, hint: 'USD, as you would write it: 149.97. Must be a multiple of 49.99.',
    get: (p) => cents(p.price), set: (b, v) => { b.price = v.trim(); } },
  { key: 'compare_price', header: 'compare_price', hint: 'The "was" price. Blank: no saving shown.',
    get: (p) => cents(p.comparePrice), set: (b, v) => { b.comparePrice = v.trim(); } },
  { key: 'stock', header: 'stock', hint: 'Units on hand (or allocation for a preorder).',
    get: (p) => (p.stock == null ? '' : String(p.stock)), set: (b, v) => { b.stock = v.trim(); } },
  { key: 'available', header: 'available', hint: 'true/false. Blank is false.',
    get: (p) => (p.available ? 'true' : 'false'), set: (b, v) => { b.available = bool(v); } },
  { key: 'preorder', header: 'preorder', hint: 'true/false.',
    get: (p) => (p.preorder ? 'true' : 'false'), set: (b, v) => { b.preorder = bool(v); } },
  { key: 'preorder_ships', header: 'preorder_ships', hint: 'Display text for a preorder: "Q2 2026".',
    get: (p) => p.preorderShips || '', set: (b, v) => { b.preorderShips = v.trim(); } },
  { key: 'availability', header: 'availability', hint: 'Force a Google state: in_stock, preorder, backorder, out_of_stock. Blank derives it from the preorder flag and release date (released + still flagged = backorder).',
    get: (p) => p.availabilityOverride || '', set: (b, v) => { b.availabilityOverride = v.trim().toLowerCase(); } },
  { key: 'release_date', header: 'release_date', hint: 'YYYY-MM-DD. Drives the page and Google availabilityDate.',
    get: (p) => dateOnly(p.releaseDate), set: (b, v) => { b.releaseDate = v.trim(); } },
  { key: 'featured', header: 'featured', hint: 'true/false: on the home page.',
    get: (p) => (p.featured ? 'true' : 'false'), set: (b, v) => { b.featured = bool(v); } },
  { key: 'badge', header: 'badge', hint: 'Hot, Limited, Preorder, Rare, New, or blank.',
    get: (p) => p.badge || '', set: (b, v) => { b.badge = v.trim(); } },
  { key: 'image_url', header: 'image_url', hint: 'Main photo URL.',
    get: (p) => p.imageUrl || '', set: (b, v) => { b.imageUrl = v.trim(); } },
  { key: 'images', header: 'images', hint: 'More photo URLs, separated by |.',
    get: (p) => joinList(p.images), set: (b, v) => { b.images = list(v).join('\n'); } },
  { key: 'description', header: 'description', hint: 'HTML allowed.',
    get: (p) => p.description || '', set: (b, v) => { b.description = v; } },
  { key: 'specs', header: 'specs', hint: '"Label: Value" pairs separated by |. Example: Configuration: 24 Booster Packs | Cards Per Pack: 12',
    get: (p) => joinList((p.specs || []).map((s) => `${s.label}: ${s.value}`)), set: (b, v) => { b.specs = list(v).join('\n'); } },
  { key: 'collections', header: 'collections', hint: 'Collection handles separated by |. Include the line: ' + catalog.handles().join(', ') + '.',
    get: (p) => joinList(p.collections), set: (b, v) => { b.collections = list(v).join(', '); } },
  { key: 'tags', header: 'tags', hint: 'Separated by |.',
    get: (p) => joinList(p.tags), set: (b, v) => { b.tags = list(v).join(', '); } },
  { key: 'sku', header: 'sku', hint: 'Your own code. Also used to match an existing product when handle is blank.',
    get: (p) => p.sku || '', set: (b, v) => { b.sku = v.trim(); } },
  { key: 'gtin', header: 'gtin', hint: 'Barcode. Copy it; never guess it.',
    get: (p) => p.gtin || '', set: (b, v) => { b.gtin = v.trim(); } },
  { key: 'mpn', header: 'mpn', hint: 'Manufacturer part number.',
    get: (p) => p.mpn || '', set: (b, v) => { b.mpn = v.trim(); } },
  { key: 'brand', header: 'brand', hint: 'Manufacturer for Google. Blank: the vendor.',
    get: (p) => p.brand || '', set: (b, v) => { b.brand = v.trim(); } },
  { key: 'language', header: 'language', hint: 'English, Japanese …',
    get: (p) => p.language || '', set: (b, v) => { b.language = v.trim(); } },
  { key: 'edition', header: 'edition', hint: '1st Edition, Unlimited, or blank.',
    get: (p) => p.edition || '', set: (b, v) => { b.edition = v.trim(); } },
  { key: 'set_code', header: 'set_code', hint: 'OP-11, SV8.5 …',
    get: (p) => p.setCode || '', set: (b, v) => { b.setCode = v.trim(); } },
  { key: 'variant_group', header: 'variant_group', hint: 'Shared id for boxes of one product.',
    get: (p) => p.variantGroup || '', set: (b, v) => { b.variantGroup = v.trim(); } },
  { key: 'variant_name', header: 'variant_name', hint: 'This box\'s name within the group.',
    get: (p) => p.variantName || '', set: (b, v) => { b.variantName = v.trim(); } },
  { key: 'variant_axis', header: 'variant_axis', hint: 'color, pattern, material, size or style.',
    get: (p) => p.variantAxis || '', set: (b, v) => { b.variantAxis = v.trim(); } },
  { key: 'variant_order', header: 'variant_order', hint: 'Position in the chooser.',
    get: (p) => (p.variantOrder == null ? '' : String(p.variantOrder)), set: (b, v) => { b.variantOrder = v.trim(); } },
  { key: 'pack_size', header: 'pack_size', hint: 'Sold in multiples of this many. price is then the price of one pack; the shop shows the single-unit price. Blank or 1 = sold singly.',
    get: (p) => (p.packSize && p.packSize > 1 ? String(p.packSize) : ''), set: (b, v) => { b.packSize = v.trim(); } },
  { key: 'allocation_limit', header: 'allocation_limit', hint: 'Max units per customer. 0 = unlimited.',
    get: (p) => (p.allocationLimit == null ? '' : String(p.allocationLimit)), set: (b, v) => { b.allocationLimit = v.trim(); } },
  { key: 'stock_hold', header: 'stock_hold', hint: 'true/false. Listed but refused at payment. Read the product form before using it.',
    get: (p) => (p.stockHold ? 'true' : 'false'), set: (b, v) => { b.stockHold = bool(v); } },
  { key: 'superseded_by', header: 'superseded_by', hint: 'Handle of the replacement offered at a stock-hold refusal.',
    get: (p) => p.supersededBy || '', set: (b, v) => { b.supersededBy = v.trim(); } },
];

/* Three columns per non-default market: price_CA, compare_CA,
   available_CA. A blank price is the product not being sold there; a price
   with a blank available cell is sold (the form's default). */
function marketColumns() {
  const out = [];
  for (const m of markets.MARKETS.filter((x) => !x.isDefault)) {
    const row = (p) => (p.marketPrices || []).find((r) => String(r.market).toUpperCase() === m.id) || null;
    out.push({ key: `price_${m.id}`, header: `price_${m.id}`, hint: `${m.name} price in ${m.currency}, as written. Blank: not sold there.`,
      get: (p) => { const r = row(p); return r ? cents(r.amount) : ''; },
      set: (b, v) => { b[`mp_${m.id}_amount`] = v.trim(); if (v.trim() && b[`mp_${m.id}_available`] === undefined) b[`mp_${m.id}_available`] = 'true'; } });
    out.push({ key: `compare_${m.id}`, header: `compare_${m.id}`, hint: `${m.name} "was" price.`,
      get: (p) => { const r = row(p); return r && r.compareAmount ? cents(r.compareAmount) : ''; },
      set: (b, v) => { b[`mp_${m.id}_compare`] = v.trim(); } });
    out.push({ key: `available_${m.id}`, header: `available_${m.id}`, hint: `true/false. Blank with a price: true.`,
      get: (p) => { const r = row(p); return r ? (r.available === false ? 'false' : 'true') : ''; },
      set: (b, v) => { if (v.trim()) b[`mp_${m.id}_available`] = bool(v); } });
  }
  return out;
}

const COLUMNS = [...BASE_COLUMNS, ...marketColumns()];

/* ── CSV text ───────────────────────────────────────────────────────── */

/** RFC 4180: quotes, doubled quotes, embedded commas and newlines, CRLF, a BOM. */
function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  /* A trailing empty line is not a row. */
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function csvCell(value) {
  const s = String(value == null ? '' : value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Header normalisation: "Compare Price", "compare-price" and "compare_price" are one column. */
function normaliseHeader(h) {
  return String(h || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/* Keyed by the normalised header, so price_CA and PRICE_CA are one column. */
const BY_HEADER = new Map(COLUMNS.map((c) => [normaliseHeader(c.header), c]));

/* Shopify's own headers, for a file exported from there. Only the ones
   with a one-to-one meaning here; the rest are ignored with a note. */
const ALIASES = {
  handle: 'handle', title: 'title', vendor: 'vendor', type: 'product_type', product_category: null,
  tags: 'tags', published: 'available', image_src: 'image_url', body_html: 'description', body: 'description',
  variant_price: 'price', variant_compare_at_price: 'compare_price', variant_inventory_qty: 'stock',
  variant_sku: 'sku', variant_barcode: 'gtin', slug: 'handle', name: 'title', quantity: 'stock', url: 'image_url',
  image: 'image_url', photo: 'image_url', collection: 'collections', line: 'collections',
};

function resolveHeaders(headerRow) {
  const columns = [];
  const unknown = [];
  headerRow.forEach((raw, i) => {
    const h = normaliseHeader(raw);
    if (!h) return;
    const key = BY_HEADER.has(h) ? h : (ALIASES[h] || null);
    if (key && BY_HEADER.has(key)) columns.push({ index: i, column: BY_HEADER.get(key), raw: String(raw).trim() });
    else unknown.push(String(raw).trim());
  });
  return { columns, unknown };
}

/* ── Rows → form bodies ─────────────────────────────────────────────── */

/**
 * Turns a parsed row into the body the product form would post.
 *
 * `existing` is the stored product this row updates, or null. For an
 * update the body starts as the existing product written back into form
 * fields, so a column the file does not have is left exactly as it was,
 * while a column the file does have — even blank — is what the file says.
 * That is the Shopify rule, and the one a spreadsheet user expects: what
 * you can see in the sheet is what the product becomes.
 */
function rowToBody(cells, columns, existing) {
  const body = existing ? productToBody(existing) : {};
  for (const { index, column } of columns) {
    column.set(body, cells[index] == null ? '' : String(cells[index]));
  }
  /* The form posts checkboxes only when ticked; a create with no
     `available` column should default to sellable, like a new product
     in the form would after the operator ticks the box they always tick. */
  if (!existing && !columns.some((c) => c.column.key === 'available')) body.available = 'true';
  return body;
}

/** A stored product as the form would have posted it. */
function productToBody(p) {
  const body = {};
  for (const c of BASE_COLUMNS) {
    const v = c.get(p);
    c.set(body, v);
  }
  for (const c of marketColumns()) c.set(body, c.get(p));
  /* Booleans: `get` writes "false" as text and `set` folds that to '' —
     which is exactly how an unticked box arrives. */
  return body;
}

/* ── Validation, before anything is written ────────────────────────── */

/* ── Pack-count sanity (packs per box vs cards per pack) ────────────────
   A title that says "(15 Packs)" for a box whose specs say "12 Collector
   Boosters per box, 15 cards per pack" is the exact error this guards: the
   title took the cards-per-pack number. These read the per-box pack count
   the same way the storefront does and warn on a contradiction rather than
   rewriting anyone's data. */
function boxPackCount(text) {
  const s = String(text || '');
  let m = s.match(/\b(\d+)\s+[A-Za-z!’'\-,/ ]{0,40}?(?:boosters?|packs?)\s+per\s+(?:box|display|case)\b/i);
  if (m) return parseInt(m[1], 10);
  m = s.match(/\b(\d+)\s+(?:[A-Za-z!’'\- ]{0,40}?\s)?packs?\b/i);
  if (m && !/card/i.test(s.slice(m.index, m.index + m[0].length))) return parseInt(m[1], 10);
  m = s.match(/\b(\d+)\s+(?:play|collector|jumpstart)?\s*boosters?\b/i);
  if (m) return parseInt(m[1], 10);
  return null;
}
function titlePackCount(title) {
  const m = String(title || '').match(/\(\s*(?:english,\s*)?(\d+)\s*packs?\s*\)/i);
  return m ? parseInt(m[1], 10) : null;
}
function configFromSpecs(specsText) {
  const line = String(specsText || '').split('\n').find((l) => /^\s*config/i.test(l));
  return line ? line.replace(/^\s*[^:]*:\s*/, '') : '';
}

function offGrid(priceText) {
  const cents = Math.round((parseFloat(priceText) || 0) * 100);
  if (!cents) return null;
  const unit = partnerRotation.DEFAULT_UNIT_CENTS;
  if (cents % unit !== 0) {
    const below = Math.floor(cents / unit) * unit;
    return `price ${(cents / 100).toFixed(2)} is not a multiple of ${(unit / 100).toFixed(2)}: nearest are ${(below / 100).toFixed(2)} and ${((below + unit) / 100).toFixed(2)}`;
  }
  if (cents / unit > partnerRotation.LADDER_STEPS) {
    return `price ${(cents / 100).toFixed(2)} is above the ${partnerRotation.LADDER_STEPS}-rung ladder (max ${((partnerRotation.LADDER_STEPS * unit) / 100).toFixed(2)})`;
  }
  return null;
}

/**
 * Reads a CSV and plans one action per row. Nothing is written.
 *
 * `lookup` resolves a row to an existing product: `({ slug, sku }) =>
 * product | null`. It is passed in rather than required here so this file
 * stays database-free and testable; the route hands it a map it loaded
 * once for the whole file.
 *
 * Returns { columns, unknownColumns, rows: [{ line, handle, action,
 * body, errors, warnings, existingId }], summary }.
 */
function plan(text, { lookup, knownCollections = null } = {}) {
  const table = parseCsv(text);
  if (!table.length) return { columns: [], unknownColumns: [], rows: [], summary: { create: 0, update: 0, error: 0, total: 0 }, headerError: 'The file is empty.' };
  const { columns, unknown } = resolveHeaders(table[0]);
  if (!columns.some((c) => c.column.key === 'title') && !columns.some((c) => c.column.key === 'handle')) {
    return { columns, unknownColumns: unknown, rows: [], summary: { create: 0, update: 0, error: 0, total: 0 },
      headerError: 'The first row must be a header with at least a "title" column. Download the template to see the expected headers.' };
  }

  const seen = new Map();
  const rows = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const line = r + 1;
    const errors = [];
    const warnings = [];
    const get = (key) => { const c = columns.find((x) => x.column.key === key); return c ? String(cells[c.index] == null ? '' : cells[c.index]).trim() : undefined; };

    const title = get('title');
    const handleCell = get('handle');
    const sku = get('sku');
    let handle = handleCell ? slugify(handleCell) : '';
    if (handleCell && handle !== handleCell) warnings.push(`handle "${handleCell}" was tidied to "${handle}"`);

    const existing = lookup ? (lookup({ slug: handle || null, sku: sku || null }) || null) : null;
    if (!handle) handle = existing ? existing.slug : slugify(title);

    if (!existing && !title) errors.push('title is required for a new product');
    if (!handle) errors.push('no handle and no title to make one from');
    if (seen.has(handle)) errors.push(`handle "${handle}" is already used on row ${seen.get(handle)}`);
    else if (handle) seen.set(handle, line);

    const body = rowToBody(cells, columns, existing);
    body.slug = handle;

    const price = body.price;
    if (!existing && !(parseFloat(price) > 0)) errors.push('price is required for a new product');
    else if (price !== undefined && price !== '' && !(parseFloat(price) >= 0)) errors.push(`price "${price}" is not a number`);
    const grid = offGrid(body.price);
    if (grid) warnings.push(grid);
    if (body.comparePrice && parseFloat(body.comparePrice) <= parseFloat(body.price)) warnings.push('compare_price is not above price, so no saving will show');

    if (body.releaseDate && Number.isNaN(Date.parse(body.releaseDate))) errors.push(`release_date "${body.releaseDate}" is not a date (use YYYY-MM-DD)`);
    if (body.badge && !['Hot', 'Limited', 'Preorder', 'Rare', 'New'].includes(body.badge)) warnings.push(`badge "${body.badge}" is not one of Hot, Limited, Preorder, Rare, New`);
    if (body.gtin && !/^\d{8}$|^\d{12,14}$/.test(body.gtin.replace(/\s/g, ''))) warnings.push(`gtin "${body.gtin}" does not look like a barcode (8, 12, 13 or 14 digits)`);
    if (body.preorder === 'true' && !body.releaseDate && !existing) warnings.push('a preorder with no release_date competes as a mislabelled in-stock item on Google');
    if (body.availabilityOverride && !['in_stock', 'preorder', 'backorder', 'out_of_stock'].includes(body.availabilityOverride)) warnings.push(`availability "${body.availabilityOverride}" is not one of in_stock, preorder, backorder, out_of_stock — it will be ignored and the state derived instead`);
    /* Packs-per-box vs cards-per-pack: flag a title whose pack count does
       not match the configuration, the error that made a 12-pack box read
       "(15 Packs)". Flagged for review, never auto-corrected. */
    const tP = titlePackCount(body.title);
    const cP = boxPackCount(configFromSpecs(body.specs));
    if (tP != null && cP != null && tP !== cP) warnings.push(`title says ${tP} packs but the configuration says ${cP} per box — check whether the title took the cards-per-pack number`);

    const cols = (body.collections || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (knownCollections) {
      const bad = cols.filter((c) => !knownCollections.has(c));
      if (bad.length) warnings.push(`unknown collection${bad.length > 1 ? 's' : ''} ${bad.map((b) => `"${b}"`).join(', ')}: the product will not appear on that page`);
    }
    const line_ = catalog.detect({ tags: (body.tags || '').split(',').map((s) => s.trim()), title: body.title, vendor: body.vendor, productType: body.productType });
    const lineHandles = catalog.handles();
    if (!cols.some((c) => lineHandles.includes(c))) {
      if (line_) warnings.push(`no line collection: this looks like ${line_.name}, so add "${line_.handle}" to collections`);
      else warnings.push(`no line collection (${lineHandles.join(', ')}): the product will not be on any line page`);
    }
    if (!body.imageUrl && !existing) warnings.push('no image_url: the product is left out of the Google feed until it has one');

    rows.push({ line, handle, title: body.title || (existing && existing.title) || '', action: errors.length ? 'error' : (existing ? 'update' : 'create'),
      existingId: existing ? String(existing._id) : null, body, errors, warnings });
  }

  const summary = { create: 0, update: 0, error: 0, total: rows.length };
  for (const r of rows) summary[r.action]++;
  return { columns: columns.map((c) => c.column.header), unknownColumns: unknown, rows, summary, headerError: null };
}

/* ── Writing ────────────────────────────────────────────────────────── */

function toCsv(products) {
  const head = COLUMNS.map((c) => csvCell(c.header)).join(',');
  const body = products.map((p) => COLUMNS.map((c) => csvCell(c.get(p))).join(','));
  return [head, ...body].join('\r\n') + '\r\n';
}

/** The template: the headers, one filled example row, one blank-ish row. */
function template() {
  const example = {
    slug: 'pokemon-prismatic-evolutions-etb', title: 'Pokémon Prismatic Evolutions — Elite Trainer Box',
    vendor: 'The Pokémon Company', productType: 'Elite Trainer Box', price: 9998, comparePrice: 10999, stock: 4,
    available: true, preorder: false, preorderShips: '', releaseDate: null, featured: true, badge: 'Hot',
    imageUrl: 'https://example.com/prismatic-etb-front.jpg', images: ['https://example.com/prismatic-etb-back.jpg'],
    description: '<p>Nine Prismatic Evolutions booster packs plus 65 sleeves, 45 energy cards, dice, markers and the player\'s guide. Factory sealed.</p>',
    specs: [{ label: 'Configuration', value: '9 Booster Packs' }, { label: 'Cards Per Pack', value: '10' }, { label: 'Language', value: 'English' }],
    collections: ['pokemon', 'etbs', 'best-sellers'], tags: ['pokemon', 'etb', 'sealed'],
    sku: 'GGC-PRE-ETB', gtin: '820650859649', mpn: '', brand: '', language: 'English', edition: '', setCode: 'SV8.5',
    variantGroup: '', variantName: '', variantAxis: 'color', variantOrder: 0, allocationLimit: 0, stockHold: false, supersededBy: '', marketPrices: [],
  };
  const preorder = {
    ...example, slug: '2025-bowman-baseball-jumbo-box-preorder', title: '2025 Bowman Baseball — Jumbo Box (Preorder)',
    vendor: 'Topps', productType: 'Jumbo Box', price: 44991, comparePrice: null, stock: 6, preorder: true, preorderShips: 'Q2 2026',
    releaseDate: new Date('2026-05-15'), featured: false, badge: 'Preorder', imageUrl: 'https://example.com/bowman-jumbo.jpg', images: [],
    description: '<p>Jumbo configuration, three autographs per box on average. Ships on release day.</p>',
    specs: [{ label: 'Configuration', value: 'Jumbo Box' }, { label: 'Packs Per Box', value: '12' }, { label: 'Sport', value: 'Baseball' }],
    collections: ['baseball', 'preorders'], tags: ['baseball', 'bowman', 'preorder'], sku: 'GGC-BOW-JB', gtin: '', setCode: '', allocationLimit: 2,
  };
  return toCsv([example, preorder]);
}

/* ── A draft from image links alone ────────────────────────────────── */

/**
 * Turns a list of image URLs into CSV rows with the handle, title, line
 * and main image filled in from the file name, and everything else left
 * for the operator. "prismatic-evolutions-etb-front.jpg" is enough to
 * write "Prismatic Evolutions Etb" and guess Pokémon; the price is not,
 * so it is left blank and the preview will refuse the row until it is
 * typed. Several URLs of one product (…-front, …-back, …-2) fold into one
 * row with the extras in `images`.
 */
function draftFromImageUrls(text) {
  const urls = String(text || '').split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
  const groups = new Map();
  for (const url of urls) {
    let name;
    try { name = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); } catch (e) { name = url.split('/').pop(); }
    name = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_\s]+/g, '-').toLowerCase();
    /* Strip a trailing view marker so the views of one product group. */
    const base = name.replace(/-(front|back|side|top|seal|sealed|\d{1,2}|img\d*|image\d*|photo\d*|[a-f0-9]{8,})$/i, '') || name;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(url);
  }
  const products = [];
  for (const [base, images] of groups) {
    const handle = slugify(base);
    const words = handle.split('-').filter(Boolean);
    const title = words.map((w) => (/^(etb|tcg|op|sv|mtg|ufc|nba|nfl|mlb)$/i.test(w) ? w.toUpperCase() : /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
    const line = catalog.detect({ title, tags: [], vendor: '', productType: '' });
    products.push({
      slug: handle, title, vendor: line ? line.publisher : '', productType: '', price: null, comparePrice: null, stock: 0,
      available: true, preorder: false, featured: false, badge: '', imageUrl: images[0], images: images.slice(1),
      description: '', specs: [], collections: line ? [line.handle] : [], tags: line ? [line.handle] : [], language: 'English', variantAxis: 'color', marketPrices: [],
    });
  }
  return { csv: toCsv(products), count: products.length, urls: urls.length };
}

module.exports = { COLUMNS, LIST_SEP, parseCsv, csvCell, normaliseHeader, resolveHeaders, rowToBody, productToBody, plan, toCsv, template, draftFromImageUrls, slugify, offGrid, boxPackCount, titlePackCount, configFromSpecs };
