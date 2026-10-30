/**
 * What happens next to this order, in the store's own words.
 *
 * WHY IT IS COMPUTED RATHER THAN WRITTEN INTO THE PAGE: the honest answer
 * differs by order. A sealed box in stock leaves within a business day. A
 * preorder cannot leave at all until the set releases, and telling that
 * customer "ships within 1 business day" is a promise the warehouse
 * physically cannot keep — the same availability misrepresentation the feed
 * is careful to avoid, except here it is aimed at somebody who has already
 * paid and will notice.
 *
 * Every figure comes from config/shipping and config/preorder, which are the
 * same modules the product page, the policy pages and the Google feed read.
 * The confirmation cannot promise a different dispatch time than the page
 * the customer bought from.
 *
 * Pure and synchronous: the caller does the product lookup. That keeps it
 * testable without a database and keeps the confirmation route's data access
 * in one visible place.
 */

const shipping = require('../config/shipping');
const preorderCfg = require('../config/preorder');

/**
 * @param {object} order    an Order document (or the pipeline's order shape)
 * @param {object|null} product  the Product this order was for, when resolvable
 * @returns {{isPreorder: boolean, release: object|null, steps: Array}}
 */
function fulfilmentFor(order, product) {
  /* Preorder status comes from the PRODUCT, not the order: the order record
     stores what was bought and what was paid, not the release schedule. When
     the product cannot be resolved — a deleted listing, an order imported
     without a slug — the in-stock wording is the safe default, because it
     promises a dispatch window rather than a release date nobody has. */
  const isPreorder = !!(product && (product.preorder
    || (product.tags || []).includes('preorder')));

  const release = isPreorder && product ? preorderCfg.releaseInfo(product) : null;
  const dispatchDays = shipping.DISPATCH.inStockBusinessDays;
  const afterRelease = shipping.DISPATCH.preorderBusinessDaysAfterRelease;
  const plural = (n) => (n === 1 ? 'business day' : 'business days');

  if (isPreorder) {
    return {
      isPreorder: true,
      release,
      steps: [
        {
          key: 'confirmed', label: 'Confirmed', state: 'done',
          detail: 'Your preorder allocation is secured and paid for.',
        },
        {
          key: 'release', label: 'Release', state: 'next',
          /* Only names a date when there is a real one. "Releases soon" is
             not a date and is not written as though it were. */
          detail: release && release.hasDate
            ? `Releases ${release.display}. We prepare your order for fulfilment after the official release.`
            : 'We prepare your order for fulfilment after the official release date is confirmed.',
        },
        {
          key: 'shipped', label: 'Shipped', state: 'pending',
          detail: release && release.hasDate
            ? `Dispatched within ${afterRelease} ${plural(afterRelease)} of release. Tracking is emailed when it ships.`
            : 'Tracking is emailed the moment your order ships.',
        },
      ],
    };
  }

  return {
    isPreorder: false,
    release: null,
    steps: [
      {
        key: 'confirmed', label: 'Confirmed', state: 'done',
        detail: 'Your order is secured and paid for.',
      },
      {
        key: 'processing', label: 'Processing', state: 'next',
        detail: `Picked and packed within ${dispatchDays} ${plural(dispatchDays)}. `
          + `Orders placed before ${shipping.DISPATCH.cutoffLocal} ${shipping.DISPATCH.cutoffTimezone} go the same day.`,
      },
      {
        key: 'shipped', label: 'Shipped', state: 'pending',
        detail: 'Tracking is emailed the moment your order ships.',
      },
    ],
  };
}

module.exports = fulfilmentFor;
