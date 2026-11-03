import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Section';
import site from '../content/site';

/* ── The hand-off back to zypheratcg ──────────────────────────────────────
 *
 * WHY THIS PAGE HAS TO DO SOMETHING.
 *
 * A buyer who checks out through the embedded panel never lands here: the
 * checkout posts its signed fields up to the parent window, which builds
 * zypheratcg's own /thank-you URL and takes over the tab. But the embed is
 * not the only way a payment finishes. A blocked popup, a frame that never
 * greets in time, a browser that refuses third-party framing — every one of
 * those drops the customer onto this site TOP-LEVEL, and the checkout page
 * then navigates here with the signed field set on the query string
 * (see the redirect at the end of showSuccess in server/experiences/partner.html,
 * which targets a RELATIVE "/thank-you" precisely so this page owns the hop).
 *
 * Until now this page ignored that query string. The payment had already
 * been reported to zypheratcg server-to-server, so it was recorded as a
 * payment — but only a real browser arriving at zypheratcg's /thank-you
 * creates the ORDER. The customer sat on this page, the order was never
 * created, and the payment sat in the "paid but never confirmed" list
 * waiting to be turned into an order by hand. That is the bug this fixes.
 *
 * WHAT IT TAKES TO BE FORWARDED. Both of these, together:
 *
 *  1. A signed token on the URL (iat + sig), minted by our own server
 *     (/internal/thank-you/token) at the moment Whop confirmed the payment.
 *     It proves the query string's DATA is authentic; zypheratcg verifies
 *     the signature itself, server-side, before it creates anything.
 *
 *  2. A marker in THIS browser's localStorage for this same order_id,
 *     written by the checkout page the instant payment succeeded.
 *
 * The second check exists because the first cannot answer "who is looking
 * at this URL right now" — a signed link is exactly as copyable as an
 * unsigned one. If a buyer forwards their thank-you link, or pastes it into
 * a support chat, whoever opens it next must not be auto-forwarded to
 * zypheratcg carrying that buyer's email, address and phone in the query
 * string. A different browser, a different device, or this browser once the
 * marker's 30-minute TTL has lapsed all just read the page below and stop.
 *
 * Identical contract, and identical key, to the-bindery's thank-you page.
 */
const LOCAL_MARKER_KEY = 'tb_completed_order';
const LOCAL_MARKER_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ZYPHERATCG_THANK_YOU = 'https://gogetcards.com/thank-you';

function thisBrowserCompletedOrder(orderId: string | null): boolean {
  if (!orderId) return false;
  try {
    const raw = localStorage.getItem(LOCAL_MARKER_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as { orderId?: string; ts?: number };
    return (
      stored.orderId === orderId &&
      typeof stored.ts === 'number' &&
      Date.now() - stored.ts < LOCAL_MARKER_TTL_MS
    );
  } catch {
    // localStorage unavailable or unparseable: fail closed, do not forward.
    return false;
  }
}

function useZypheratcgHandoff(): boolean {
  const [redirecting, setRedirecting] = useState(false);

  /* In an effect, so it never runs during server rendering — there is no
     window and no localStorage there, and the decision is about this
     browser rather than this request. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('sig') || !params.get('iat')) return;
    if (!thisBrowserCompletedOrder(params.get('order_id'))) return;

    setRedirecting(true);
    /* The search string is forwarded VERBATIM. Every parameter on it is
       covered by the signature, so rebuilding the URL from parsed values
       risks re-encoding one of them into something that no longer verifies.
       Copying the string cannot. */
    const timer = setTimeout(() => {
      window.location.assign(ZYPHERATCG_THANK_YOU + window.location.search);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return redirecting;
}

export default function ThankYou() {
  const { copy } = site;
  const redirecting = useZypheratcgHandoff();

  /* On the way through to the storefront's own confirmation, the sections
     below are about the wrong order — they describe this studio's intake,
     not the purchase that was just made. One line, and nothing else. */
  if (redirecting) {
    return (
      <div className="pb-24">
        <PageHero
          eyebrow="Order confirmed"
          title={copy.thankYou.title}
          body="Payment received. Taking you to your full order confirmation…"
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHero eyebrow="Order confirmed" title={copy.thankYou.title} body={copy.thankYou.intro} />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-10">
        <section className="border border-brand-black/10 bg-brand-white p-8 md:p-10">
          <h2 className="text-[23px] font-medium mb-4">Send it through the storefront</h2>
          <p className="text-brand-gray leading-relaxed mb-4">
            Open your order on Whop and attach the material there. It arrives against your order,
            which is what keeps the file and the payment attached to each other.
          </p>
          <ul className="text-brand-gray leading-relaxed list-disc pl-5 space-y-2 mb-7">
            {copy.thankYou.sendList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <a
            href={site.whopUrl}
            className="inline-block bg-brand-black text-brand-light px-7 py-3.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-ink transition-colors"
          >
            Open your order
          </a>
        </section>

        <section>
          <h2 className="text-[23px] font-medium mb-4">What happens next</h2>
          <p className="text-brand-gray leading-relaxed">{copy.thankYou.next}</p>
        </section>

        <section>
          <h2 className="text-[23px] font-medium mb-4">Changed your mind</h2>
          <p className="text-brand-gray leading-relaxed">
            Nothing is assigned to a reader until the material arrives, so until then the order can
            be cancelled in full.{' '}
            <Link to="/refund-policy" className="text-brand-black underline underline-offset-2">
              How refunds work
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
