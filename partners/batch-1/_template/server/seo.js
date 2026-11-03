/**
 * Every real route, in one map.
 *
 * server.js reads this for three things, which is the reason it is a map
 * rather than three lists that drift apart:
 *   1. the <title>, description and Open Graph tags injected per page;
 *   2. whether an incoming request is a real page at all — anything not
 *      here gets a true HTTP 404 rather than a 200 carrying the visual
 *      not-found page, which is what tells a crawler the difference;
 *   3. sitemap.xml.
 *
 * Adding a route to App.tsx without adding it here produces a page that
 * renders correctly to a human and 404s to Google. That is the failure this
 * arrangement exists to make impossible to ship quietly.
 */

/* No SITE_URL needs setting anywhere. Render exports RENDER_EXTERNAL_URL
   for every service it runs — the service's own public origin — so
   canonical links, og:url and the sitemap all follow the host the site is
   really served from rather than a domain that may not resolve yet. Set
   SITE_URL only to override both, once a custom domain is attached. */
export const SITE_URL =
  process.env.SITE_URL ||
  (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '') ||
  'https://business-plan-review.onrender.com';

export const SITE_NAME = 'Business Plan';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** @type {Record<string, {title: string, description: string, ogType?: string, noindex?: boolean}>} */
export const ROUTES = {
  '/': {
    title: 'Business Plan | Business Plan Reviews',
    description:
      'One business plan read cold, the way an investor or lender reads it: the narrative read against the model claim by claim, the market checked for a bottom-up sizing, the ask checked against the use of funds, and the load-bearing assumptions checked for whether they are stated or buried. One payment, no subscription.',
  },
  '/services': {
    title: 'Services | Business Plan',
    description:
      'The business plan review, priced per plan, in twelve steps. No advice on whether the business is viable or whether it will raise, nothing certified, nothing argued or rewritten, no packages and no retainer.',
  },
  '/services/business-plan-review': {
    title: 'Business Plan Review | Business Plan',
    description:
      'Send one business plan and the financial model behind it. The narrative read against the model claim by claim, the market checked for a path from a real customer and price to the total, the ask checked against the use of funds and the runway, and the assumptions checked for whether they are stated.',
  },
  '/pricing': {
    title: 'Pricing | Business Plan',
    description:
      'One rate per plan at $74.99, in twelve steps from $74.99 to $899.88. No packages, no subscription, no volume discount and no surcharge.',
  },
  '/how-it-works': {
    title: 'How It Works | Business Plan',
    description:
      'Write the brief with what kind of plan and who reads it, attach the plan and the model, pay in a panel on the same page, and get findings section by section back in three business days.',
  },
  '/standards': {
    title: 'Standards & Limits | Business Plan',
    description:
      'What Business Plan does not do: no advice on whether the business is viable or whether it will raise, no view on the decision the material informs, nothing certified as viable or investment-ready, and nothing argued or rewritten.',
  },
  '/about': {
    title: 'About | Business Plan',
    description:
      'A business plan is not a description of the company you want to build but a case an investor or lender reads for whether the story and the numbers are the same story, and Business Plan reads one the way they do — narrative against model.',
  },
  '/faq': {
    title: 'Questions | Business Plan',
    description:
      'Why the report will not say whether the business will raise or is viable, why a plan the team knows cold is still worth checking, why nothing is written, what an investor objects to first, and how much can be redacted.',
  },
  '/resources': {
    title: 'Resources | Business Plan',
    description:
      'Notes on why the narrative and the model have to be the same company, why a market sized top-down is a number and not a plan, why the ask has to be the size of the plan it funds, and why a buried assumption is a risk the reader finds by breaking the sheet.',
  },
  '/contact': {
    title: 'Contact | Business Plan',
    description: 'Reach Business Plan through its Whop storefront, where messages are actually read.',
  },
  '/terms': {
    title: 'Terms of Service | Business Plan',
    description: 'The terms under which Business Plan supplies Business Plan reviews, and what it does not advise on, certify or rewrite.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Business Plan',
    description: 'What Business Plan collects, why, how long it is kept, and how to have it deleted.',
  },
  '/refund-policy': {
    title: 'Refund Policy | Business Plan',
    description: 'Cancel for a full refund before your pack is assigned for review. What happens after it is.',
  },
  '/cookie-policy': {
    title: 'Cookie Policy | Business Plan',
    description: 'Business Plan sets no tracking or advertising cookies. What Whop\u2019s checkout sets, and why.',
  },
  '/thank-you': {
    title: 'Order Confirmed | Business Plan',
    description: 'Your order is confirmed. What happens to the brief you submitted, and what comes next.',
    /* Kept out of the index deliberately: it is a post-payment page, it is
       useless to anyone arriving cold, and an indexed confirmation page
       makes a search result that promises something it cannot give. */
    noindex: true,
  },
};

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function metaFor(pathname) {
  return ROUTES[pathname] || {
    title: `Page not found | ${SITE_NAME}`,
    description: 'That page does not exist.',
    noindex: true,
  };
}

/** The <head> tags for one page, injected into index.html at render time. */
export function renderHead(pathname) {
  const meta = metaFor(pathname);
  const url = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
  const rows = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    meta.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow">',
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:type" content="${esc(meta.ogType || 'website')}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(DEFAULT_OG_IMAGE)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
  ];
  return rows.join('\n    ');
}

/**
 * sitemap.xml, generated rather than served from public/.
 *
 * A static file in public/ is a second list of routes, and the day someone
 * adds a page they update one of the two. Generating it from ROUTES means
 * the sitemap cannot describe a site that no longer exists.
 *
 * noindex routes are omitted: listing a page in the sitemap while telling
 * crawlers not to index it is the two instructions contradicting each other,
 * which Search Console reports as an error rather than resolving.
 */
export function renderSitemap() {
  const urls = Object.entries(ROUTES)
    .filter(([, meta]) => !meta.noindex)
    .map(([pathname]) => `  <url><loc>${esc(SITE_URL)}${pathname === '/' ? '' : esc(pathname)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobots() {
  return `User-agent: *\nAllow: /\nDisallow: /thank-you\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
