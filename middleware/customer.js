/**
 * Attaches the signed-in customer to the request, and guards the pages
 * that need one.
 *
 * TWO SEPARATE JOBS, deliberately not merged. `attachCustomer` runs on
 * every storefront request so the header can say "Account" instead of
 * "Sign in", and never blocks anything. `requireCustomer` runs only on
 * /account and refuses. Merging them would mean every product page carried
 * the ability to redirect somebody to a sign-in screen, which is one bad
 * conditional away from locking the shop.
 */

const customerAuth = require('../services/customerAuth');

/**
 * Resolves the session if there is one. Never throws, never blocks.
 *
 * A failure here — database blip, malformed cookie — must render the site
 * signed-out rather than fail the page. Somebody browsing sealed product
 * does not need an account for the page to work.
 */
async function attachCustomer(req, res, next) {
  try {
    const resolved = await customerAuth.resolveSession(req, res);
    req.customer = resolved ? resolved.customer : null;
    req.customerSession = resolved ? resolved.session : null;
  } catch (err) {
    console.error('[customer] session resolve failed:', err.message);
    req.customer = null;
    req.customerSession = null;
  }
  /* The header reads these. Kept to the minimum the nav needs — the whole
     customer document does not belong in every template's scope. */
  res.locals.customer = req.customer
    ? { firstName: req.customer.firstName, greeting: req.customer.greetingName(), email: req.customer.displayEmail || req.customer.email }
    : null;
  next();
}

/**
 * Refuses anonymous requests.
 *
 * Sends the customer to sign in and remembers where they were going, so a
 * bookmarked order link survives an expired session instead of dumping
 * them on a generic account page with no explanation.
 */
function requireCustomer(req, res, next) {
  if (req.customer) return next();

  if (req.method !== 'GET') {
    /* A POST from an expired session must not be silently redirected into
       a GET — the customer would see a page and assume the action worked. */
    return res.status(401).render('pages/account-signin', {
      pageTitle: 'Sign in | Zyphera TCG',
      metaDescription: '',
      robotsOverride: 'noindex, nofollow',
      sent: false,
      formError: 'Your session expired before that could be saved. Sign in and try again.',
      redirectTo: '/account',
      email: '',
    });
  }

  const target = customerAuth.safeRedirect(req.originalUrl);
  return res.redirect('/account/sign-in?next=' + encodeURIComponent(target));
}

module.exports = { attachCustomer, requireCustomer };
