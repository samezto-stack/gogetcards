/**
 * The shell every Zyphera email is built inside, and the small set of
 * pieces they are built from.
 *
 * WHY IT LOOKS LIKE THIS. A receipt from a shop you trust is quiet. It
 * has one accent, a lot of space, and nothing that moves. The things
 * that make an email read as a scam are the same things that make it
 * read as AI-generated: a gradient header, a circle with a tick in it,
 * three rounded cards in a row, an emoji, and a sentence about your
 * "premium collecting journey". None of that is here.
 *
 * ── LIGHT BASE, DARK VARIANT, AND WHY ─────────────────────────────
 *
 * This was originally dark-only, matching the site. That was wrong, and
 * the failure is worth writing down so nobody reverts it.
 *
 * Gmail and Outlook.com apply their own colour inversion in dark mode.
 * The documented opt-out — `color-scheme` and `supported-color-schemes`
 * — is honoured by Apple Mail and IGNORED BY GMAIL. So a dark email
 * arrives in Gmail's dark theme with its near-black background flipped
 * to near-white and its light text flipped to dark: a washed-out mess,
 * for what is probably most of our customers.
 *
 * A light email inverts GRACEFULLY. Gmail's dark mode turns it into a
 * readable dark message on its own. That is why every large retailer
 * sends light transactional mail; it is not timidity.
 *
 * So: the inline styles are light, because inline styles are the only
 * thing every client honours. The dark treatment is a
 * `prefers-color-scheme` block keyed on `dm-*` classes, which the
 * clients that respect it (Apple Mail, iOS Mail, Outlook for macOS)
 * apply and the ones that do not simply ignore. Both look deliberate.
 *
 * EVERY COLOURED ELEMENT NEEDS BOTH: an inline light colour and a `dm-`
 * class. An element with only the inline style stays light inside the
 * dark variant and becomes an invisible or glaring patch. The helpers
 * below all carry both, which is why templates should build from them
 * rather than writing their own spans.
 *
 * ── OTHER CONSTRAINTS THAT LOOK ARBITRARY ─────────────────────────
 *
 * TABLES, NOT DIVS, and inline styles on every element. Outlook on
 * Windows renders with Word's engine: no flexbox, no grid, no external
 * or embedded stylesheet worth relying on.
 *
 * BACKGROUNDS ARE DECLARED TWICE — the `bgcolor` attribute and the CSS
 * property — because Outlook honours the attribute and ignores the
 * property. The attribute always carries the LIGHT value, since Outlook
 * for Windows has no dark treatment to opt into.
 *
 * NO IMAGES EXCEPT THE PRODUCT PHOTO. The wordmark is text, so it
 * renders before images load and cannot be blocked, and the ratio of
 * images to text stays where filters like it.
 */

/* The light palette, used inline. Contrast is checked against the sheet
   it sits on: muted text at #5B5B66 on white is 6.9:1, and the accent
   at #6D28D9 is 7.4:1, so both clear AA comfortably at small sizes. */
const C = {
  page: '#F2F2F5',
  sheet: '#FFFFFF',
  sheetAlt: '#FAFAFB',
  rule: '#E6E6EC',
  heading: '#15151A',
  text: '#33333C',
  muted: '#5B5B66',
  faint: '#83838F',
  accent: '#6D28D9',
  accentText: '#6D28D9',
  good: '#15803D',
  warn: '#A45A08',
};

/* The dark counterpart, applied by class in the media query at the
   bottom. Same roles, same order, so the two cannot drift apart
   without it being obvious in a diff. */
const D = {
  page: '#080B10',
  sheet: '#0F141C',
  sheetAlt: '#131A24',
  rule: '#212B38',
  heading: '#FFFFFF',
  text: '#E4E7EB',
  muted: '#A3ABB7',
  faint: '#78818D',
  accent: '#7C3AED',
  accentText: '#B49BF5',
  good: '#4ADE80',
  warn: '#FBBF24',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

const markets = require('../../../config/markets');

/** Everything a customer typed goes through this before it is HTML. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Delegates to the one formatter the storefront uses, so an email and the
   page it followed can never disagree about what a price looks like.

   This used to prefix every amount with a dollar sign and append the code
   for anything that was not USD, so a UK buyer's receipt read "$179.97 GBP"
   — a dollar sign on a pound amount, in the message confirming what they
   had just paid. CAD and EUR were wrong the same way, and this function
   renders the total on the order confirmation, the abandoned-checkout
   recovery mails and every refund notice. */
function money(cents, currency) {
  return markets.format(Number(cents || 0), currency || 'USD');
}

function day(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ── Pieces ─────────────────────────────────────────────── */

/** The one heading. Sentence case, full stop, no exclamation mark. */
function heading(text) {
  return `<h1 class="dm-head" style="margin:0 0 10px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:600;color:${C.heading};letter-spacing:-0.02em;">${esc(text)}</h1>`;
}

function lede(html) {
  return `<p class="dm-muted" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};">${html}</p>`;
}

function paragraph(html, { size = 14, top = 0 } = {}) {
  return `<p class="dm-muted" style="margin:${top}px 0 0;font-family:${FONT};font-size:${size}px;line-height:1.65;color:${C.muted};">${html}</p>`;
}

function label(text) {
  return `<p class="dm-faint" style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.faint};">${esc(text)}</p>`;
}

/**
 * A short value under a label, in one of four tones.
 *
 * Exists so templates never hand-write a coloured span: one written
 * without a `dm-` class stays light inside the dark variant and shows
 * up as a glaring patch nobody notices until it is in somebody's inbox.
 */
function value(text, tone = 'text') {
  const map = { text: [C.text, 'dm-text'], head: [C.heading, 'dm-head'],
    good: [C.good, 'dm-good'], warn: [C.warn, 'dm-warn'], faint: [C.faint, 'dm-faint'] };
  const [colour, cls] = map[tone] || map.text;
  return `<span class="${cls}" style="font-family:${FONT};font-size:13px;color:${colour};">${esc(text)}</span>`;
}

/** Emphasis inside a sentence. */
function strong(text) {
  return `<strong class="dm-head" style="color:${C.heading};font-weight:600;">${esc(text)}</strong>`;
}

/** A link in body copy. */
function link(href, text) {
  return `<a class="dm-accent" href="${esc(href)}" style="color:${C.accentText};">${esc(text)}</a>`;
}

/** A hairline. Rendered as a filled row, because Outlook ignores borders. */
function rule() {
  return `<tr><td class="dm-rule" height="1" bgcolor="${C.rule}" style="background-color:${C.rule};height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>`;
}

/** A section of the sheet. Padding lives here, once. */
function section(inner, { pad = '24px 32px', alt = false } = {}) {
  const bg = alt ? C.sheetAlt : C.sheet;
  return `<tr><td class="${alt ? 'dm-alt' : 'dm-sheet'}" bgcolor="${bg}" style="background-color:${bg};padding:${pad};">${inner}</td></tr>`;
}

/**
 * The call to action.
 *
 * A table with a bgcolor cell, not a styled anchor: Outlook will not
 * paint a background on an inline element, so the styled-anchor version
 * of this button arrives as bare blue underlined text. Purple on white
 * text works in both themes, so this is the one element that needs no
 * dark variant beyond a slightly brighter fill.
 */
function button(href, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;">
  <tr><td class="dm-btn" bgcolor="${C.accent}" style="background-color:${C.accent};border-radius:6px;">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;">${esc(text)}</a>
  </td></tr></table>`;
}

/** Order reference, tracking number — anything read aloud to support. */
function mono(text) {
  return `<span class="dm-text" style="font-family:${MONO};font-size:13px;color:${C.text};letter-spacing:0.02em;">${esc(text)}</span>`;
}

/**
 * The line item.
 *
 * The product photo is the only image in the whole email, at a fixed
 * width and height so the layout does not jump while it loads or
 * collapse if it never does.
 *
 * The price is nested INSIDE the text column rather than being a third
 * top-level cell. At 600px the two arrangements look identical; on a
 * 390px phone the flat version squeezes the title into a narrow gutter
 * and wraps a product name every two words.
 */
function lineItem({ image, title, quantity, price, currency, note }) {
  const img = image
    ? `<img src="${esc(image)}" width="72" height="72" alt="" class="dm-tile" style="display:block;width:72px;height:72px;object-fit:contain;background-color:${C.sheetAlt};border-radius:6px;">`
    : `<div class="dm-tile" style="width:72px;height:72px;background-color:${C.sheetAlt};border-radius:6px;"></div>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="72" valign="top" style="width:72px;padding-right:16px;">${img}</td>
    <td valign="top">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="drop" valign="top" style="font-family:${FONT};">
          <p class="dm-head" style="margin:0 0 5px;font-size:15px;line-height:1.4;font-weight:600;color:${C.heading};">${esc(title)}</p>
          <p class="dm-faint" style="margin:0;font-size:13px;line-height:1.5;color:${C.faint};">Quantity ${esc(quantity || 1)}${note ? ' &nbsp;&middot;&nbsp; ' + esc(note) : ''}</p>
        </td>
        <td class="drop dm-head" valign="top" align="right" style="font-family:${MONO};font-size:15px;color:${C.heading};white-space:nowrap;padding-left:12px;">${esc(money(price, currency))}</td>
      </tr></table>
    </td>
  </tr></table>`;
}

/** One line of the totals block. */
function totalRow(name, val, { strong: isStrong = false, good = false } = {}) {
  const size = isStrong ? 16 : 14;
  const nameColour = isStrong ? C.heading : C.muted;
  const nameClass = isStrong ? 'dm-head' : 'dm-muted';
  const valColour = good ? C.good : (isStrong ? C.heading : C.muted);
  const valClass = good ? 'dm-good' : (isStrong ? 'dm-head' : 'dm-muted');
  const weight = isStrong ? 600 : 400;
  return `<tr>
    <td class="${nameClass}" style="font-family:${FONT};font-size:${size}px;line-height:1.9;color:${nameColour};font-weight:${weight};">${esc(name)}</td>
    <td class="${valClass}" align="right" style="font-family:${isStrong ? MONO : FONT};font-size:${size}px;line-height:1.9;color:${valColour};font-weight:${weight};">${esc(val)}</td>
  </tr>`;
}

function totals(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`;
}

/** Two columns on desktop, stacked on a phone. */
function twoUp(left, right) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="stack" width="50%" valign="top" style="width:50%;padding-right:12px;">${left}</td>
    <td class="stack" width="50%" valign="top" style="width:50%;padding-left:12px;">${right}</td>
  </tr></table>`;
}

/** An address, one line per line, never invented. */
function addressBlock(lines) {
  const kept = (lines || []).filter(Boolean);
  if (!kept.length) return paragraph('We will confirm your delivery address by email before dispatch.');
  return kept.map((l, i) => {
    const cls = i === 0 ? 'dm-head' : 'dm-muted';
    const colour = i === 0 ? C.heading : C.muted;
    const weight = i === 0 ? 600 : 400;
    return `<p class="${cls}" style="margin:${i ? 2 : 0}px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${colour};font-weight:${weight};">${esc(l)}</p>`;
  }).join('');
}

/**
 * The three promises, as one quiet line.
 *
 * Not three icon cards. This is the part of a confirmation email most
 * likely to tip into looking like an advert, and the fix is to say the
 * three true things once, small, and stop.
 */
function trustLine(items) {
  return `<p class="dm-faint" style="margin:0;font-family:${FONT};font-size:12px;line-height:1.8;color:${C.faint};">${items.map(esc).join(' &nbsp;&middot;&nbsp; ')}</p>`;
}

/* ── The document ───────────────────────────────────────── */

/**
 * @param {string}  [unsubscribeUrl]  Present ONLY on recovery mail. It swaps
 *   the footer's "this is a service message, not marketing" sentence — which
 *   is true of a receipt and false of a reminder to come back and buy — for
 *   the wording and the opt-out that commercial mail actually requires. A
 *   transactional caller passes nothing and is unaffected.
 */
function document({ title, preheader, body, unsubscribeUrl }) {
  const company = require('../../../config/company');
  const site = require('../../../config/site');
  const origin = site.origin();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<%/* BOTH schemes declared. This tells a client we have a treatment for
     each, so Apple Mail applies the block below instead of inventing
     its own inversion. */%>
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${esc(title)}</title>
<style type="text/css">
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  /* Apple Mail and Outlook.com turn anything that looks like a phone
     number, date or address into a blue link. It is never wanted here. */
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important; }
  @media only screen and (max-width:620px) {
    .wrap { width:100% !important; }
    .pad { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; padding:0 0 18px 0 !important; }
    /* Same idea, but the cell keeps its left alignment and gains only a
       small gap — used for a price that drops under a product name. */
    .drop { display:block !important; width:100% !important; text-align:left !important; padding:10px 0 0 0 !important; }
  }

  /* ── Dark variant ──────────────────────────────────────────────
     Applied by clients that honour prefers-color-scheme (Apple Mail,
     iOS Mail, Outlook for macOS). Gmail ignores this block and renders
     the light version, then applies its own dark treatment to it —
     which is exactly why the base is light. */
  @media (prefers-color-scheme: dark) {
    .dm-page   { background-color:${D.page} !important; }
    .dm-sheet  { background-color:${D.sheet} !important; }
    .dm-alt    { background-color:${D.sheetAlt} !important; }
    .dm-rule   { background-color:${D.rule} !important; }
    .dm-tile   { background-color:${D.sheetAlt} !important; }
    .dm-btn    { background-color:${D.accent} !important; }
    .dm-head   { color:${D.heading} !important; }
    .dm-text   { color:${D.text} !important; }
    .dm-muted  { color:${D.muted} !important; }
    .dm-faint  { color:${D.faint} !important; }
    .dm-good   { color:${D.good} !important; }
    .dm-warn   { color:${D.warn} !important; }
    .dm-accent { color:${D.accentText} !important; }
    .dm-mark   { color:${D.accentText} !important; }
  }
</style>
</head>
<body class="dm-page" bgcolor="${C.page}" style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" class="dm-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">
<tr><td align="center" style="padding:32px 12px 40px;">

  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

    <tr><td class="dm-head" align="left" style="padding:0 0 22px;font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:0.01em;color:${C.heading};">
      Zyphera<span class="dm-mark" style="color:${C.accentText};">TCG</span>
    </td></tr>

    <tr><td>
      <table role="presentation" class="dm-sheet" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.sheet}" style="background-color:${C.sheet};border-radius:10px;overflow:hidden;">
        <tr><td class="dm-btn" height="2" bgcolor="${C.accent}" style="background-color:${C.accent};height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>
        ${body}
      </table>
    </td></tr>

    <tr><td class="dm-faint" style="padding:26px 8px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${C.faint};">
      <p class="dm-faint" style="margin:0 0 12px;color:${C.faint};">
        ${esc(company.business.tradingName)} &middot; ${esc(company.addressOneLine())}
      </p>
      <p style="margin:0 0 12px;">
        <a class="dm-faint" href="${origin}/shipping" style="color:${C.faint};text-decoration:underline;">Shipping</a> &nbsp;
        <a class="dm-faint" href="${origin}/refund-policy" style="color:${C.faint};text-decoration:underline;">Returns</a> &nbsp;
        <a class="dm-faint" href="${origin}/privacy-policy" style="color:${C.faint};text-decoration:underline;">Privacy</a> &nbsp;
        <a class="dm-faint" href="${origin}/terms-of-service" style="color:${C.faint};text-decoration:underline;">Terms</a>
      </p>
      ${unsubscribeUrl ? `
      <p class="dm-faint" style="margin:0 0 10px;color:${C.faint};">
        You are receiving this because you started a checkout with us and did not
        finish it. If you would rather not be reminded, we will stop.
      </p>
      <p style="margin:0;">
        <a class="dm-faint" href="${unsubscribeUrl}" style="color:${C.faint};text-decoration:underline;">Unsubscribe from checkout reminders</a>
      </p>` : `
      <p class="dm-faint" style="margin:0;color:${C.faint};">
        You are receiving this because you placed an order with us. This is a service
        message about that order, not marketing.
      </p>`}
      <p class="dm-faint" style="margin:10px 0 0;color:${C.faint};">&copy; ${year} ${esc(company.business.tradingName)}</p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`.replace(/<%\/\*[\s\S]*?\*\/%>\n?/g, '');
}

/**
 * The plain-text alternative.
 *
 * Written by hand per template rather than stripped from the HTML. A
 * stripped version reads like a broken web page; this is what a watch,
 * a screen reader and a text-only client show, and it is also what a
 * spam filter compares the HTML against.
 */
function textDocument(lines) {
  const company = require('../../../config/company');
  const site = require('../../../config/site');
  return lines
    .filter((l) => l !== undefined && l !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    + `\n\n—\n${company.business.tradingName}\n${company.addressOneLine()}\n${site.origin()}\n`
    + `\nThis is a service message about your order, not marketing.\n`;
}

module.exports = {
  C, D, FONT, MONO,
  esc, money, day,
  heading, lede, paragraph, label, value, strong, link, rule, section, button, mono,
  lineItem, totalRow, totals, twoUp, addressBlock, trustLine,
  document, textDocument,
};
