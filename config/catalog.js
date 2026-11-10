/**
 * The lines GoGetCards sells, in one place.
 *
 * WHY THIS FILE EXISTS: the game list used to be typed out separately in
 * the header nav, the mobile nav, the hero chips, the home-page collection
 * grid, the footer Shop column, the brand badge, the product-card meta line,
 * the sitemap and the seed script. Nine copies of the same four names, and
 * adding a line meant finding all nine. GoGetCards sells seven lines across
 * two kinds of product (trading card games and sports cards), and will add
 * more, so every surface now reads this list.
 *
 * Each entry is one collection handle (`/collection/<handle>`) plus what the
 * templates need to label and colour it, and the words that identify a
 * product as belonging to it. Nothing here is copy: collection page copy
 * lives in config/collectionContent.js, keyed by the same handle.
 *
 * `kind` is 'tcg' or 'sport'. The two are sold the same way (sealed boxes,
 * hobby boxes, cases) but described differently: a TCG line has a publisher
 * and a set; a sport line has a manufacturer, a league and a season.
 */

const LINES = [
  {
    handle: 'pokemon',
    name: 'Pokémon',
    shortName: 'Pokémon',
    kind: 'tcg',
    publisher: 'The Pokémon Company',
    description: 'Elite trainer boxes, booster boxes, bundles and cases',
    accent: '#F2C035',
    badgeClass: 'brand-badge--pokemon',
    icon: 'pokemon.svg',
    /* Lower-cased fragments matched against productType, vendor and tags. */
    match: ['pokemon', 'pokémon'],
  },
  {
    handle: 'mtg',
    name: 'Magic: The Gathering',
    shortName: 'Magic',
    kind: 'tcg',
    publisher: 'Wizards of the Coast',
    description: 'Play boosters, collector boosters, bundles and cases',
    accent: '#C84A2D',
    badgeClass: 'brand-badge--mtg',
    icon: 'mtg.svg',
    match: ['mtg', 'magic', 'wizards'],
  },
  {
    handle: 'one-piece',
    name: 'One Piece',
    shortName: 'One Piece',
    kind: 'tcg',
    publisher: 'Bandai',
    description: 'English and Japanese booster boxes, starter decks and cases',
    accent: '#D12B2B',
    badgeClass: 'brand-badge--onepiece',
    icon: 'onepiece.svg',
    /* Not 'bandai': Bandai also publishes the Gundam Card Game, and the
       vendor alone would file it under One Piece. */
    match: ['one piece', 'one-piece', 'onepiece'],
  },
  {
    handle: 'lorcana',
    name: 'Disney Lorcana',
    shortName: 'Lorcana',
    kind: 'tcg',
    publisher: 'Ravensburger',
    description: 'Booster boxes, illumineer\'s troves and starter decks',
    accent: '#6B4FBF',
    badgeClass: 'brand-badge--lorcana',
    icon: 'lorcana.svg',
    match: ['lorcana', 'ravensburger'],
  },
  /* Shared with Zyphera TCG's catalogue (November 2026) so the two stores
     can carry the same products: GoGetCards advertises them in the US. */
  {
    handle: 'yugioh',
    name: 'Yu-Gi-Oh!',
    shortName: 'Yu-Gi-Oh!',
    kind: 'tcg',
    publisher: 'Konami',
    description: 'Booster boxes, box sets and premium collections',
    accent: '#A36B12',
    badgeClass: 'brand-badge--yugioh',
    icon: 'yugioh.svg',
    match: ['yu-gi-oh', 'yugioh', 'konami'],
  },
  {
    handle: 'riftbound',
    name: 'Riftbound',
    shortName: 'Riftbound',
    kind: 'tcg',
    publisher: 'Riot Games',
    description: 'League of Legends booster displays and preorders',
    accent: '#2F7FC1',
    badgeClass: 'brand-badge--riftbound',
    icon: 'riftbound.svg',
    match: ['riftbound', 'riot games'],
  },
  {
    handle: 'gundam',
    name: 'Gundam Card Game',
    shortName: 'Gundam',
    kind: 'tcg',
    publisher: 'Bandai',
    description: 'English booster boxes from each new set',
    accent: '#4A5568',
    badgeClass: 'brand-badge--gundam',
    icon: 'gundam.svg',
    match: ['gundam'],
  },
  {
    handle: 'baseball',
    name: 'Baseball',
    shortName: 'Baseball',
    kind: 'sport',
    publisher: 'Topps',
    league: 'MLB',
    description: 'Topps and Bowman hobby boxes, jumbo boxes and cases',
    accent: '#2457B8',
    badgeClass: 'brand-badge--baseball',
    icon: 'baseball.svg',
    match: ['baseball', 'topps', 'bowman', 'mlb'],
  },
  {
    handle: 'basketball',
    name: 'Basketball',
    shortName: 'Basketball',
    kind: 'sport',
    publisher: 'Panini',
    league: 'NBA',
    description: 'Prizm, Select and Donruss hobby boxes and cases',
    accent: '#8F94A3',
    badgeClass: 'brand-badge--basketball',
    icon: 'basketball.svg',
    match: ['basketball', 'nba'],
  },
  {
    handle: 'football',
    name: 'Football',
    shortName: 'Football',
    kind: 'sport',
    publisher: 'Panini',
    league: 'NFL',
    description: 'Prizm, Select and Mosaic hobby boxes and cases',
    accent: '#1F2026',
    badgeClass: 'brand-badge--football',
    icon: 'football.svg',
    match: ['football', 'nfl'],
  },
];

const BY_HANDLE = Object.fromEntries(LINES.map((l) => [l.handle, l]));

/** Every line, in display order. */
function all() {
  return LINES;
}

/** The lines of one kind: 'tcg' or 'sport'. */
function ofKind(kind) {
  return LINES.filter((l) => l.kind === kind);
}

/** One line by its collection handle, or null. */
function byHandle(handle) {
  return BY_HANDLE[handle] || null;
}

/** Collection handles that get their own sitemap entry and nav link. */
function handles() {
  return LINES.map((l) => l.handle);
}

/**
 * Which line a product belongs to, from its type, vendor and tags.
 *
 * Tags win over free text: a tag is set deliberately in the admin, while
 * "Panini" in the vendor field is true of basketball and football alike and
 * cannot decide between them. Returns null when nothing matches, and every
 * caller renders nothing in that case rather than guessing.
 */
function detect(product) {
  if (!product) return null;
  const tags = (product.tags || []).map((t) => String(t).toLowerCase());
  const tagged = LINES.find((l) => tags.includes(l.handle));
  if (tagged) return tagged;
  const text = [product.productType, product.vendor, product.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return LINES.find((l) => l.match.some((m) => text.includes(m))) || null;
}

/** "Pokémon, Magic: The Gathering, One Piece and Disney Lorcana" style list. */
function listNames(lines = LINES, key = 'name') {
  const names = lines.map((l) => l[key]);
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

module.exports = { LINES, all, ofKind, byHandle, handles, detect, listNames };
