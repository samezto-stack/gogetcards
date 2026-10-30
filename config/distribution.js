/**
 * Product Distribution: which channels exist, and what each one supports.
 *
 * WHY A REGISTRY RATHER THAN A GOOGLE MODULE: every one of these channels
 * wants the same product facts under different names. Meta calls it
 * `availability: in stock`, Google calls it `availability: IN_STOCK`,
 * Microsoft mirrors Google, TikTok mirrors Meta. Building Google directly
 * into the admin would mean rebuilding the admin for the second channel.
 *
 * A provider supplies four things: a payload mapper, a validator set, a
 * transport, and a capability list. The UI reads capabilities, so a channel
 * that cannot do scheduled sync simply does not show the control.
 *
 * ONLY GOOGLE IS IMPLEMENTED. The rest are declared so the shape is fixed
 * and so the UI can show them as unavailable rather than pretending they
 * are one click away. Declaring a channel here does not make it work; it
 * needs a provider module in services/distribution/providers/.
 */

const CHANNELS = {
  google: {
    id: 'google',
    name: 'Google Merchant Center',
    short: 'Google',
    status: 'available',
    provider: 'google',
    /* Google migrated Shopping from the Content API for Shopping (v2.1) to
       the Merchant API. Content API v2.1 still answers but is deprecated
       and on a sunset path, so a new integration written against it would
       need rewriting. This targets the Merchant API. */
    api: 'merchantapi.googleapis.com',
    capabilities: {
      oauth: true,
      liveSync: true,          // push individual products over the API
      scheduledSync: true,
      inventoryUpdates: true,
      deletions: true,
      productStatus: true,     // read back Google's own verdict per product
      accountStatus: true,
      feedFile: true,          // XML/CSV fallback for a non-API workflow
    },
    docs: 'https://developers.google.com/merchant/api',
  },

  microsoft: {
    id: 'microsoft', name: 'Microsoft Merchant Center', short: 'Microsoft',
    status: 'planned', provider: null,
    /* Microsoft's catalogue format is close enough to Google's that the
       same payload mapper will mostly serve, which is the argument for the
       registry shape. */
    capabilities: { oauth: true, liveSync: true, scheduledSync: true, feedFile: true },
  },
  meta: {
    id: 'meta', name: 'Meta Commerce', short: 'Meta',
    status: 'planned', provider: null,
    capabilities: { oauth: true, liveSync: true, scheduledSync: true, feedFile: true },
  },
  pinterest: {
    id: 'pinterest', name: 'Pinterest Catalog', short: 'Pinterest',
    status: 'planned', provider: null,
    capabilities: { oauth: true, scheduledSync: true, feedFile: true },
  },
  tiktok: {
    id: 'tiktok', name: 'TikTok Catalog', short: 'TikTok',
    status: 'planned', provider: null,
    capabilities: { oauth: true, scheduledSync: true, feedFile: true },
  },
  file: {
    id: 'file', name: 'File export (XML, CSV, JSON)', short: 'File',
    status: 'available', provider: 'file',
    /* Always available and needs no credentials. It exists for two real
       cases: submitting to a channel with no API integration yet, and
       being able to see exactly what would be sent without connecting an
       account. */
    capabilities: { oauth: false, liveSync: false, scheduledSync: false, feedFile: true },
  },
};

/** Channels with a working provider, in display order. */
function available() {
  return Object.values(CHANNELS).filter((c) => c.status === 'available');
}

/** Declared but not built, so the UI can show them honestly. */
function planned() {
  return Object.values(CHANNELS).filter((c) => c.status === 'planned');
}

module.exports = {
  CHANNELS,
  available,
  planned,

  /* Feed-wide defaults. Read by the payload builder; a product-level
     override in Product.merchant always wins. */
  defaults: {
    /* Google Product Category
       "Toys & Games > Games > Card Games > Collectible Card Games" is the
       correct node for sealed TCG product. Sending the numeric id rather
       than the path is more robust: the path text changes between taxonomy
       revisions and the id does not. */
    googleCategoryId: '3793',
    googleCategoryPath: 'Toys & Games > Games > Card Games > Collectible Card Games',

    /* Content language and target country. These decide which Merchant
       Center feed the products land in, so they are not cosmetic. */
    contentLanguage: 'en',
    /* The market a single feed is submitted under. Merchant Center keys a
       feed on this, so it stays a single value. */
    targetCountry: 'US',
    /* Every market the SAME feed file is allowed to serve.

       CANADA HAS MOVED OUT. It used to be served from this file in USD, as
       a second Merchant Center feed pointed at the identical URL, because
       there was no Canadian storefront to send it to. There is one now:
       /ca/ prices in CAD, /feed/ca/google.xml declares CAD shipping, and
       the checkout charges a CAD plan ladder. Leaving CA here as well
       would offer Canadians both — USD from this feed and CAD from that
       one, for the same product, from two landing pages — which is a price
       mismatch against whichever page Google fetched second.

       So this feed is the US storefront only, and each market's feed now
       carries its own currency. Adding a country back here would mean
       serving it USD from a page that prices it in USD, which is what
       `targetCountries` is for and nothing else. */
    targetCountries: ['US'],
    channel: 'ONLINE',

    // Google's own condition enum. Everything this store sells is sealed.
    condition: 'NEW',

    /* How long a synced product stays valid before Google expires it.
       Google's own maximum is 30 days; syncing more often than the expiry
       is what keeps a catalogue live. */
    maxAgeDays: 25,
  },
};
