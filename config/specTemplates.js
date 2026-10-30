/**
 * Specification templates for the admin product form.
 *
 * Picking a template in the admin fills the Specifications textarea with a
 * starting set of rows, so a new listing doesn't have to be typed out by
 * hand. The filled rows stay fully editable afterwards — the template is a
 * starting point that gets copied onto the product, NOT a live link. That is
 * deliberate: once a set ships, its configuration is a fixed historical fact,
 * so a template edit years later must never silently rewrite the specs of
 * products already sold under different numbers.
 *
 * WHY TEMPLATES ARE KEYED BY GAME **AND** CONFIGURATION, not configuration
 * alone: pack counts are not a property of "booster box" in the abstract.
 * A One Piece booster box is 24 packs of 12; a Magic Collector Booster box is
 * 12 packs of 15; a Pokémon booster box is 36 packs of 10. Keying on
 * configuration alone would put confidently wrong numbers on live listings.
 *
 * The counts below are the usual configuration for each line, but publishers
 * do vary them set to set (Pokémon ETB pack counts in particular move almost
 * every release). Treat them as defaults to check against the distributor
 * sheet, not as gospel — that is exactly why they remain editable per product.
 */

const SPEC_TEMPLATES = [
  {
    id: 'op-booster-box',
    label: 'One Piece — Booster Box',
    specs: [
      { label: 'Configuration', value: '24 Booster Packs' },
      { label: 'Cards Per Pack', value: '12' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'op-booster-case',
    label: 'One Piece — Booster Case',
    specs: [
      { label: 'Configuration', value: '12 Sealed Booster Boxes' },
      { label: 'Packs Per Case', value: '288' },
      { label: 'Cards Per Pack', value: '12' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'mtg-collector-booster-box',
    label: 'Magic: The Gathering — Collector Booster Box',
    specs: [
      { label: 'Configuration', value: '12 Collector Booster Packs' },
      { label: 'Cards Per Pack', value: '15' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'mtg-play-booster-box',
    label: 'Magic: The Gathering — Play Booster Box',
    specs: [
      { label: 'Configuration', value: '36 Play Booster Packs' },
      { label: 'Cards Per Pack', value: '14' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'mtg-booster-case',
    label: 'Magic: The Gathering — Booster Case',
    specs: [
      { label: 'Configuration', value: '6 Sealed Booster Boxes' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'pkm-booster-box',
    label: 'Pokémon — Booster Box',
    specs: [
      { label: 'Configuration', value: '36 Booster Packs' },
      { label: 'Cards Per Pack', value: '10' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'pkm-etb',
    label: 'Pokémon — Elite Trainer Box',
    specs: [
      { label: 'Configuration', value: '9 Booster Packs' },
      { label: 'Cards Per Pack', value: '10' },
      { label: 'Also Includes', value: '65 Card Sleeves, 45 Energy Cards, Dice & Counters' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'pkm-booster-case',
    label: 'Pokémon — Booster Case',
    specs: [
      { label: 'Configuration', value: '6 Sealed Booster Boxes' },
      { label: 'Packs Per Case', value: '216' },
      { label: 'Cards Per Pack', value: '10' },
      { label: 'Language', value: 'English' },
    ],
  },
  {
    id: 'lor-booster-box',
    label: 'Disney Lorcana — Booster Box',
    specs: [
      { label: 'Configuration', value: '24 Booster Packs' },
      { label: 'Cards Per Pack', value: '12' },
      { label: 'Language', value: 'English' },
    ],
  },
  /* Sports templates leave the counts blank on purpose. Pack counts, cards
     per pack and guaranteed hits are printed on each box and differ between
     Topps Chrome, Bowman, Prizm and Select, and between years of the same
     line; a confident default here would be wrong more often than right.
     The rows exist so every sports listing states the same facts in the
     same order. */
  {
    id: 'sport-hobby-box',
    label: 'Sports — Hobby Box',
    specs: [
      { label: 'Configuration', value: 'Hobby Box' },
      { label: 'Packs Per Box', value: '' },
      { label: 'Cards Per Pack', value: '' },
      { label: 'Guaranteed Hits', value: '' },
      { label: 'Sport', value: '' },
      { label: 'Season', value: '' },
    ],
  },
  {
    id: 'sport-jumbo-box',
    label: 'Sports — Jumbo Box',
    specs: [
      { label: 'Configuration', value: 'Jumbo Hobby Box' },
      { label: 'Packs Per Box', value: '' },
      { label: 'Cards Per Pack', value: '' },
      { label: 'Guaranteed Hits', value: '' },
      { label: 'Sport', value: '' },
      { label: 'Season', value: '' },
    ],
  },
  {
    id: 'sport-hobby-case',
    label: 'Sports — Hobby Case',
    specs: [
      { label: 'Configuration', value: '12 Sealed Hobby Boxes' },
      { label: 'Packs Per Box', value: '' },
      { label: 'Guaranteed Hits Per Box', value: '' },
      { label: 'Sport', value: '' },
      { label: 'Season', value: '' },
    ],
  },
];

module.exports = SPEC_TEMPLATES;
