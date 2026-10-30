/**
 * Collection page copy.
 *
 * Collection pages previously carried about 25 words of unique text: a
 * title, a one-line description on two of them, and a product grid. Two
 * consequences of that. For search, there is nothing on the page that a
 * ranking system can attach to a query beyond the product names, which
 * appear on the product pages too, so the collection page competes with
 * its own children and usually loses. For a buyer, there is nothing that
 * answers the questions that decide the purchase: what is actually in a
 * booster box of this game, what the sealed configurations are called,
 * whether a preorder locks the price.
 *
 * Everything here is either a product-configuration fact published by the
 * game's own publisher, or a statement of how this store operates. There
 * are no invented statistics, no review counts, and no claims about
 * resale value or investment return.
 *
 * Handles that are not listed simply render no extra copy. That is the
 * intended behaviour for tag-fallback collections; add an entry when a
 * collection is worth its own page.
 */

const collections = {
  all: {
    intro:
      'Every sealed product currently allocated to GoGetCards: Pokémon, Magic: The Gathering, One Piece and Disney Lorcana on the trading card game side, and Topps and Panini baseball, basketball and football hobby boxes on the sports side. Nothing here is opened, weighed, searched or resold from a secondary marketplace. Stock comes through authorized distribution and ships in the state it arrived in.',
    guide: {
      title: 'How sealed product is sold',
      body: [
        'Sealed trading card product is sold in a small number of standard configurations, and the names are consistent across games even when the contents are not. Sports cards use their own vocabulary for the same idea: a hobby box is the sealed box sold through card shops, a jumbo box holds fewer, fatter packs, and a case holds a fixed number of either.',
        'A booster pack is the base unit. A booster box holds a fixed number of packs, usually 24 or 36 depending on the game and the product line. A case holds a fixed number of booster boxes, most often 6 or 12. Collector or premium boxes hold fewer packs but a higher share of rare treatments, and elite trainer boxes bundle packs with sleeves, dice and a storage box.',
        'Buying a full case rather than loose boxes matters for one practical reason: a factory-sealed case has not been opened since it left the printer, so there is no point at which individual boxes could have been substituted or weighed.',
      ],
    },
    faqs: [
      {
        q: 'What does factory sealed mean here?',
        a: 'The product arrives from the distributor in its original manufacturer wrap and ships that way. Boxes are not opened, weighed, searched or resealed at any point.',
      },
      {
        q: 'Where does the stock come from?',
        a: 'Authorized distribution, not secondary marketplaces. That is what makes it possible to guarantee the seal.',
      },
      {
        q: 'How quickly do in-stock orders ship?',
        a: 'In-stock orders are dispatched within one business day. Preorders ship on the product\'s release date.',
      },
    ],
  },

  preorders: {
    intro:
      'Preorders are sealed product that has been announced and allocated but has not reached its release date. Ordering now fixes your price at today\'s rate and reserves a unit from our allocation. Nothing ships before the publisher\'s release day, and nothing is charged twice.',
    guide: {
      title: 'What a preorder commits you to',
      body: [
        'Preorder pricing on sealed product moves in one direction more often than the other. Allocation is decided before release, and once a set is out, the supply available to any given retailer is fixed. Placing a preorder locks the price you see at the moment you order.',
        'Release dates are set by the publisher, not by us. If a publisher moves a date, the order moves with it and you are told. If a set is cancelled outright, the order is refunded in full.',
        'You can cancel a preorder at any point before it is dispatched.',
      ],
    },
    faqs: [
      {
        q: 'When am I charged for a preorder?',
        a: 'At the time you place the order. That is what locks the price and reserves the unit against our allocation.',
      },
      {
        q: 'What happens if the release date moves?',
        a: 'The order moves with it. Publishers set release dates and occasionally change them; you are notified and the order stays valid at the price you paid.',
      },
      {
        q: 'Can I cancel a preorder?',
        a: 'Yes, at any time before it is dispatched.',
      },
      {
        q: 'Will the price change before release?',
        a: 'Not for your order. The price is fixed at the point of purchase, whatever the product sells for later.',
      },
    ],
  },

  pokemon: {
    intro:
      'Sealed Pokémon Trading Card Game product: booster boxes, booster bundles, elite trainer boxes and cases, in the configurations The Pokémon Company prints them. Sourced through authorized distribution and shipped in the original manufacturer wrap.',
    guide: {
      title: 'Pokémon sealed configurations',
      body: [
        'A modern Pokémon booster pack contains 10 cards. A booster box holds 36 packs. A case holds 6 booster boxes. Those numbers have been stable across recent Scarlet & Violet era sets, though special sets and regional releases can differ, so the exact contents are listed on each product page rather than assumed here.',
        'An Elite Trainer Box holds fewer packs, typically 9 to 11 depending on the set, plus card sleeves, damage counters, dice, a condition marker and a storage box. It is the configuration aimed at players rather than at people buying by the case.',
        'Booster bundles are a smaller sealed unit, usually 6 packs, and exist mainly as a retail impulse size.',
      ],
    },
    faqs: [
      {
        q: 'How many packs are in a Pokémon booster box?',
        a: 'Recent English-language sets are 36 packs of 10 cards. Special sets vary, so the pack count is stated on each product page.',
      },
      {
        q: 'How many booster boxes are in a case?',
        a: 'Six, for standard English-language sets.',
      },
      {
        q: 'Is the product English language?',
        a: 'Language is stated in the specifications on every product page. We do not mix languages within a listing.',
      },
    ],
  },


  mtg: {
    intro:
      'Sealed Magic: The Gathering product from Wizards of the Coast: play boosters, collector boosters, bundles and cases. Sourced through authorized distribution and shipped sealed in the original wrap.',
    guide: {
      title: 'Play boosters, collector boosters and the rest',
      body: [
        'Magic replaced the older draft and set booster split with a single Play Booster in 2024. A Play Booster holds 14 cards, and a Play Booster box holds 30 of them. This is the box most players buy, and the one used for drafting.',
        'A Collector Booster is a different product, not a premium version of the same one. It holds a much higher proportion of foil, extended-art, borderless and serialized treatments, and it is sold in boxes of 12. Collector Booster boxes cost more per pack by a wide margin and are bought for the treatments rather than for playable volume.',
        'Bundles contain a set number of Play Boosters plus basic lands, a spindown die and a storage box. Case counts differ by product line and are listed on each product page.',
      ],
    },
    faqs: [
      {
        q: 'What is the difference between a Play Booster and a Collector Booster?',
        a: 'A Play Booster holds 14 cards and is the standard draftable pack, 30 to a box. A Collector Booster is a separate product weighted heavily toward foil and alternate-art treatments, 12 to a box.',
      },
      {
        q: 'How many Play Boosters are in a box?',
        a: 'Thirty.',
      },
      {
        q: 'Are these sealed English product?',
        a: 'Language and region are stated in the specifications on every product page.',
      },
    ],
  },

  /* Keyed by the ROUTE handle. This was `onepiece` in zypheratcg while the
     collection lives at /collection/one-piece, so forHandle() never found
     it and the One Piece page rendered with no copy at all. */
  'one-piece': {
    intro:
      'Sealed One Piece Card Game product from Bandai: booster boxes, cases and premium sets. English-language releases sourced through authorized distribution and shipped in original manufacturer wrap.',
    guide: {
      title: 'One Piece sealed configurations',
      body: [
        'A One Piece Card Game booster pack holds 12 cards. An English-language booster box holds 24 packs, and a case holds 12 booster boxes.',
        'Bandai prints in waves rather than to open-ended demand, which is why allocation for a given set is effectively fixed once it is released. Reprints exist but arrive on Bandai\'s schedule, not on demand.',
        'Set numbering runs OP-01 upward for main sets, with EB and ST prefixes for extra boosters and starter decks. The set code is listed in the specifications on every product page so there is no ambiguity about which wave a box belongs to.',
      ],
    },
    faqs: [
      {
        q: 'How many packs are in a One Piece booster box?',
        a: 'Twenty-four packs of 12 cards for English-language releases.',
      },
      {
        q: 'How many boxes are in a case?',
        a: 'Twelve.',
      },
      {
        q: 'What do the OP, EB and ST codes mean?',
        a: 'OP is a main booster set, EB is an extra booster, ST is a starter deck. The code for each product is in its specifications.',
      },
    ],
  },
  lorcana: {
    intro:
      'Sealed Disney Lorcana product from Ravensburger: booster boxes, illumineer\'s troves and starter decks. English-language releases sourced through authorized distribution and shipped in original manufacturer wrap.',
    guide: {
      title: 'Lorcana sealed configurations',
      body: [
        'A Disney Lorcana booster pack holds 12 cards. A booster box holds 24 packs, and a case holds 4 booster boxes.',
        'An Illumineer\'s Trove bundles booster packs with a storage box, deck boxes and a player\'s guide; the pack count is printed on the trove and listed on each product page.',
        'Sets are numbered in order of release and the set name is listed in the specifications on every product page, so there is no ambiguity about which chapter a box belongs to.',
      ],
    },
    faqs: [
      { q: 'How many packs are in a Lorcana booster box?', a: 'Twenty-four packs of 12 cards.' },
      { q: 'How many boxes are in a case?', a: 'Four.' },
      { q: 'Who publishes Disney Lorcana?', a: 'Ravensburger, under license from Disney.' },
    ],
  },

  baseball: {
    intro:
      'Sealed baseball card product from Topps and Bowman: hobby boxes, jumbo boxes and cases. Sourced through authorized distribution and shipped in the original factory wrap.',
    guide: {
      title: 'How sealed baseball product is sold',
      body: [
        'Topps and Bowman sell the same card set in several sealed formats. A hobby box is the version sold through card shops and carries the guaranteed autograph or relic count printed on the box. A jumbo box holds fewer packs with more cards in each and usually a higher hit count. Retail blasters and hanger boxes are a separate product with different odds and are not what we stock.',
        'Pack and card counts, and the number of guaranteed hits, change from product to product and year to year, so every listing states the configuration printed on that box rather than a general rule.',
        'A hobby case holds a fixed number of hobby boxes, typically 12, and is the only format that has not been opened since it left Topps.',
      ],
    },
    faqs: [
      { q: 'What is the difference between a hobby box and a retail box?', a: 'A hobby box is sold through card shops and carries guaranteed autographs or relics printed on the box. Retail product has different odds and is not stocked here.' },
      { q: 'How many boxes are in a case?', a: 'Usually 12 for Topps and Bowman hobby product. The count is listed on each product page.' },
      { q: 'Is the product factory sealed?', a: 'Yes. Boxes ship in the original Topps wrap and are never opened, searched or resealed.' },
    ],
  },

  basketball: {
    intro:
      'Sealed basketball card product from Panini: Prizm, Select, Donruss and other hobby boxes and cases. Sourced through authorized distribution and shipped in the original factory wrap.',
    guide: {
      title: 'How sealed basketball product is sold',
      body: [
        'Panini sells each basketball set in several sealed formats. A hobby box is the card-shop version and carries the guaranteed autograph count printed on the box. Some lines also sell a hobby hybrid, a choice box or a first-off-the-line variant with different pack and hit counts.',
        'Pack counts, cards per pack and guaranteed hits are printed on every box and change between products, so every listing states the configuration printed on that box rather than a general rule.',
        'A hobby case holds a fixed number of hobby boxes, typically 12, and is the only format that has not been opened since it left Panini.',
      ],
    },
    faqs: [
      { q: 'How many autographs are in a hobby box?', a: 'It depends on the product. The guaranteed count printed on the box is listed on each product page.' },
      { q: 'How many boxes are in a case?', a: 'Usually 12 for Panini hobby product. The count is listed on each product page.' },
      { q: 'Is the product factory sealed?', a: 'Yes. Boxes ship in the original Panini wrap and are never opened, searched or resealed.' },
    ],
  },

  football: {
    intro:
      'Sealed football card product from Panini: Prizm, Select, Mosaic and other hobby boxes and cases. Sourced through authorized distribution and shipped in the original factory wrap.',
    guide: {
      title: 'How sealed football product is sold',
      body: [
        'Panini sells each football set in several sealed formats. A hobby box is the card-shop version and carries the guaranteed autograph or memorabilia count printed on the box. Some lines also sell a hobby hybrid or a first-off-the-line variant with different pack and hit counts.',
        'Pack counts, cards per pack and guaranteed hits are printed on every box and change between products, so every listing states the configuration printed on that box rather than a general rule.',
        'A hobby case holds a fixed number of hobby boxes, typically 12, and is the only format that has not been opened since it left Panini.',
      ],
    },
    faqs: [
      { q: 'How many autographs are in a hobby box?', a: 'It depends on the product. The guaranteed count printed on the box is listed on each product page.' },
      { q: 'How many boxes are in a case?', a: 'Usually 12 for Panini hobby product. The count is listed on each product page.' },
      { q: 'Is the product factory sealed?', a: 'Yes. Boxes ship in the original Panini wrap and are never opened, searched or resealed.' },
    ],
  },
};

module.exports = {
  /** Returns the copy block for a handle, or null when none is defined. */
  forHandle(handle) {
    return Object.prototype.hasOwnProperty.call(collections, handle)
      ? collections[handle]
      : null;
  },
  collections,
};
