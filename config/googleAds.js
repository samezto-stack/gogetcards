/**
 * GoGetCards' Google Ads account: the purchase conversion.
 *
 * IN CODE, NOT THE ENVIRONMENT (owner's decision, 2026-11-10). These are not
 * secrets — both appear in every page's HTML — so committing them exposes
 * nothing, and it means a stale GOOGLE_ADS_ID / GOOGLE_ADS_PURCHASE_LABEL
 * left in the hosting environment (the old account, 805-577-9007, shared
 * with Zyphera TCG) can no longer send GoGetCards purchases to the wrong
 * account. The environment variables are deliberately ignored.
 *
 * Account: the GoGetCards-only Google Ads account, conversion
 * "GoGetCards Purchase" (Purchase, value per order, USD, enhanced
 * conversions on). To change account, change these two lines.
 */
module.exports = {
  conversionId: 'AW-18565043379',
  purchaseLabel: 'TVEtCL6E9bUdELOpwJRF',
};
