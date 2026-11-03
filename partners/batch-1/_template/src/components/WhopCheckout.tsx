import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { WhopElements, Checkout, CheckoutElement } from '@whop/elements-react';
import { loadWhop } from '@whop/elements';

const IFRAME_TIMEOUT_MS = 8000;

/** Same funnel-beacon pattern as zypheratcg/northbridgeai's
 *  /api/checkout/confirm-arrival — a 1x1 GIF request, no CORS needed, works
 *  even if nothing else on the page runs. Reuse this exact shape (id + step)
 *  for any future site's checkout instrumentation. */
function checkoutEventBeacon(step: 'payment_shown' | 'payment_failed', pageId: string): void {
  try {
    new Image().src = `/api/checkout-event?step=${encodeURIComponent(step)}&page=${encodeURIComponent(pageId)}`;
  } catch {
    /* no-op */
  }
}

/** The hosted SDK is loaded once per page and shared across every checkout
 *  that mounts (loadWhop() injects one <script> and returns one shared
 *  promise). Loaded lazily and ONLY in the browser: loadWhop() touches the
 *  DOM, so calling it during SSR would throw. The first client mount
 *  triggers it; later mounts reuse the same promise. */
let whopElementsLoad: ReturnType<typeof loadWhop> | null = null;
function getWhopElements() {
  if (!whopElementsLoad) whopElementsLoad = loadWhop();
  return whopElementsLoad;
}

interface WhopCheckoutProps {
  /** The Whop plan id this container checks out (e.g. "plan_xxx"). */
  planId: string;
  /** Absolute URL the tab is sent to after payment. Whop appends
   *  `?payment=<pay_…>&status=<succeeded|failed|canceled>`, so the page at
   *  this URL MUST branch on `status` before treating the visit as a sale.
   *  See docs.whop.com/elements/latest/checkout/overview. */
  returnUrl: string;
  /** DOM id for the container, so it stays addressable/stylable. */
  id: string;
  className?: string;
  /** Prefills the checkout's email field (replaces the old wco.setEmail);
   *  the buyer can still edit it. */
  buyerEmail?: string;
  /** Fallback content shown until the Elements SDK mounts the checkout. */
  children?: ReactNode;
}

/** Whop's checkout, via Whop Elements (the replacement for the retired
 *  legacy `js.whop.com/static/checkout/loader.js` embed). The Checkout
 *  provider opens the session from the plan id and mounts the full payment
 *  surface; on success the tab redirects to returnUrl. No checkout logic or
 *  card data touches this app.
 *
 *  SSR-safe: the SDK touches the DOM and must run only in the browser, so
 *  the element is mounted after hydration; the server and first paint render
 *  the fallback children (the same thing the old embed showed while loading).
 *
 *  Still reports the funnel beacon: 'payment_shown' once the checkout frame
 *  appears, 'payment_failed' if it has not within 8s — the same gap
 *  northbridgeai's checkout page instruments, so a drop-off here is never
 *  invisible. */
export default function WhopCheckout({ planId, returnUrl, id, className, buyerEmail, children }: WhopCheckoutProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const container = document.getElementById(id);
    if (!container) return;

    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      if (container.querySelector('iframe')) {
        settled = true;
        observer.disconnect();
        checkoutEventBeacon('payment_shown', id);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      checkoutEventBeacon('payment_failed', id);
    }, IFRAME_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [mounted, id]);

  // Server render and the pre-hydration paint show the fallback; the SDK
  // only exists in the browser.
  if (!mounted) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div id={id} className={className}>
      <WhopElements
        elements={getWhopElements()}
        locale="en"
        appearance={{
          theme: { appearance: 'light', accentColor: 'blue' },
          /* Hide Whop's own order summary (the page shows product + price),
             and the email field + Whop sign-in prompt when the email is
             already prefilled. */
          classes: {
            'whop-CheckoutDetails': { display: 'none' },
            ...(buyerEmail ? { 'whop-Email': { display: 'none' } } : {}),
          },
        }}
      >
        <Checkout plan={planId} returnUrl={returnUrl}>
          <CheckoutElement buyerEmail={buyerEmail} lockBuyerEmail={!!buyerEmail} fallback={children} />
        </Checkout>
      </WhopElements>
    </div>
  );
}
