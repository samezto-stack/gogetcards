/**
 * Product variants — one manufactured item sold as two or more boxes.
 *
 * THE CASE THIS EXISTS FOR: the 30th Celebration Ultra-Premium Collection
 * ships as Day (Espeon) and Night (Umbreon). Same manufacturer item number,
 * same barcode, same 30 booster packs — the promos, the coin and the
 * artwork differ. A shopper wants to pick one. Google wants two offers it
 * can tell apart.
 *
 * VARIANTS ARE SEPARATE PRODUCTS, LINKED — not an array inside one.
 *
 * That is the whole design decision and it is worth stating why, because
 * an embedded array looks tidier and is wrong here. Everything downstream
 * of the Buy button in this codebase is keyed on the product SLUG: the
 * checkout session, the partner route that resolves a Whop plan, the
 * bundle plans for quantity > 1, the order record, the abandoned-checkout
 * schedule, and every analytics row. A variant that is not a slug either
 * cannot be bought or has to be threaded through all of that, and the one
 * thing worse than a missing feature is a payment path with a new seam in
 * it.
 *
 * Given a slug per variant, all of that already works — each box has its
 * own price, stock, plan, orders and reporting with no new code. What was
 * genuinely missing is only the two things this module adds:
 *
 *   1. The storefront needs to know the boxes are alternatives, so the
 *      product page can offer a choice instead of looking like two
 *      unrelated listings that happen to share a photo.
 *   2. The feed needs to say so in Google's own terms — item_group_id
 *      plus one variant attribute — or Google reads two offers with the
 *      same GTIN as a duplicate and suppresses one.
 *
 * WHY THE TITLE IS COMPOSED RATHER THAN TYPED. The admin types the base
 * title once per variant and names the variant once; "… — Night (Umbreon
 * ex)" is derived. Typing the full title twice means the day it is edited
 * it gets edited once, and then the two listings disagree about the
 * product they are variants of — which is exactly the mismatch that makes
 * Google stop treating them as a group.
 */

/**
 * The attributes Google accepts as the thing that distinguishes variants.
 *
 * NOT a free-text field. Google reads a fixed set here and ignores
 * anything else, so an axis of "style" would leave the group with no
 * differing attribute at all — which is the one condition that invalidates
 * a variant group.
 *
 * `color` is the default because artwork variants are what this store
 * actually sells: Day/Night, alternate-art printings, regional covers.
 */
const VARIANT_AXES = [
  { id: 'color', label: 'Colour / artwork (Day, Night, Alt Art)' },
  { id: 'pattern', label: 'Pattern (Holo, Reverse, Textured)' },
  { id: 'material', label: 'Material (Foil, Matte)' },
  { id: 'size', label: 'Size' },
];

const AXIS_IDS = VARIANT_AXES.map((a) => a.id);
const DEFAULT_AXIS = 'color';

/* Google's own limits. item_group_id is capped at 50 characters and a
   variant attribute value at 100; exceeding either drops the item rather
   than truncating it. Enforced here so the cap lives with the field it
   belongs to instead of in whichever caller remembered. */
const GROUP_ID_MAX = 50;
const AXIS_VALUE_MAX = 100;

/** The group this product belongs to, or '' when it is a standalone item. */
function groupIdOf(product) {
  return String((product && product.variantGroup) || '').trim().slice(0, GROUP_ID_MAX);
}

/** What this particular box is called within its group. */
function nameOf(product) {
  return String((product && product.variantName) || '').trim().slice(0, AXIS_VALUE_MAX);
}

/**
 * Which Google attribute carries the variant name.
 * An unrecognised value falls back rather than being passed through: a
 * made-up attribute name is silently ignored by Google, which would leave
 * the group with nothing to tell its members apart.
 */
function axisOf(product) {
  const raw = String((product && product.variantAxis) || '').trim().toLowerCase();
  return AXIS_IDS.includes(raw) ? raw : DEFAULT_AXIS;
}

/**
 * A product is part of a group only when BOTH halves are set.
 *
 * A group id with no name gives Google a group whose members are
 * indistinguishable; a name with no group id gives a suffix that groups
 * nothing. Neither half is useful alone, so neither half alone counts.
 */
function isGrouped(product) {
  return !!(groupIdOf(product) && nameOf(product));
}

/**
 * The title a shopper and Google both see: base title, then the variant.
 *
 * IDEMPOTENT ON PURPOSE. If the stored title already contains the variant
 * name — because it was typed in full before the variant fields existed,
 * or pasted from the distributor sheet — nothing is appended. Otherwise
 * every save would grow the title by another " — Night (Umbreon ex)".
 */
function displayTitle(product) {
  const packs = require('../helpers/packs');
  const base = String((product && product.title) || '').trim();
  const name = nameOf(product);
  if (!name) return packs.titleFor(product, base);
  if (base.toLowerCase().includes(name.toLowerCase())) return packs.titleFor(product, base);
  return packs.titleFor(product, `${base} — ${name}`);
}

/**
 * The feed fields that make a group a group.
 *
 * Returns {} for an ungrouped product, so callers can spread it
 * unconditionally and a standalone item carries no variant markup at all —
 * an item_group_id with one member in it is not wrong, but it invites the
 * question of where the other members went.
 */
function feedFields(product) {
  if (!isGrouped(product)) return {};
  return {
    itemGroupId: groupIdOf(product),
    variantAttributes: { [axisOf(product)]: nameOf(product) },
  };
}

/**
 * The query that finds every box in the same group, including this one.
 *
 * Includes self deliberately: the switcher renders the current variant as
 * the selected option, and building that from a separate object would mean
 * the selected chip could show different text from the sibling chips.
 */
function siblingQuery(product) {
  const group = groupIdOf(product);
  return group ? { variantGroup: group } : null;
}

/**
 * Order the switcher by the admin's sortOrder, then by name.
 *
 * Name is the tiebreak rather than creation date because the order the two
 * boxes were entered in is invisible to the person looking at the page,
 * and a switcher whose options move when a product is re-saved reads as a
 * bug.
 */
function sortSiblings(list) {
  return [...(list || [])].sort((a, b) => {
    const ao = Number(a.variantOrder) || 0;
    const bo = Number(b.variantOrder) || 0;
    if (ao !== bo) return ao - bo;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

module.exports = {
  VARIANT_AXES,
  AXIS_IDS,
  DEFAULT_AXIS,
  GROUP_ID_MAX,
  AXIS_VALUE_MAX,
  groupIdOf,
  nameOf,
  axisOf,
  isGrouped,
  displayTitle,
  feedFields,
  siblingQuery,
  sortSiblings,
};
