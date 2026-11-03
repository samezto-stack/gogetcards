import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import WhopCheckout from './WhopCheckout';

/**
 * Payment, in a dialog on the page the buyer is already on.
 *
 * WHY A DIALOG RATHER THAN A REDIRECT. The buyer has just spent several
 * minutes writing a brief and attaching files. Navigating away from that to a
 * checkout means either persisting an unpaid brief somewhere or losing it if
 * they come back — and both are worse than keeping them here. Whop's embedded
 * checkout mounts an iframe into any container, so the container can be a
 * dialog as easily as a section.
 *
 * NATIVE <dialog>, NOT A DIV WITH A HIGH Z-INDEX. showModal() gives focus
 * trapping, inertness of the page behind, Escape-to-close and the top layer
 * for free, all of which are things a hand-rolled modal gets wrong and only
 * a keyboard user ever notices.
 *
 * THE BRIEF IS NOT SUBMITTED UNTIL PAYMENT SUCCEEDS. Whop returns the buyer
 * to returnUrl on success, and that is what commits the brief — so an
 * abandoned checkout leaves nothing stored anywhere. Closing this dialog is
 * therefore always safe and always non-destructive, which is why the close
 * control says so rather than warning about losing progress.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  returnUrl: string;
  /** What is being bought, in the buyer's own words. */
  summary: ReactNode;
  /** Styling hook — every site dresses this differently. */
  classNames?: {
    dialog?: string;
    head?: string;
    body?: string;
    close?: string;
  };
}

export default function PaymentDialog({ open, onClose, planId, returnUrl, summary, classNames = {} }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  /* Escape and the backdrop both route through the same handler as the
     button, so the parent's state cannot drift out of step with whether the
     dialog is actually open. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', handle);
    return () => el.removeEventListener('cancel', handle);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={classNames.dialog || ''}
      onClick={(e) => {
        /* Only the backdrop. A click that started inside the panel must not
           close it, which is what comparing the target to the dialog itself
           achieves — the panel is a child, so it never matches. */
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={classNames.head || ''}>
        <div>{summary}</div>
        <button type="button" onClick={onClose} className={classNames.close || ''} aria-label="Close payment">
          ×
        </button>
      </div>

      <div className={classNames.body || ''}>
        {/* Mounted only while open. Whop's loader binds to the container on
            insert, so keeping a hidden one in the tree would start a checkout
            session for every visitor who never opened the dialog. */}
        {open && /^plan_PENDING_/.test(planId) ? (
          /* The rung has no Whop plan behind it yet (the business is being
             set up). Say so plainly rather than hand Whop a plan it refuses:
             a buyer who paid nothing and was told why is a buyer who comes
             back; one who watched a spinner is not. */
          <p className="p-8 text-center text-[13px] leading-relaxed opacity-80">
            Checkout for this service is not open yet. Your brief is kept on this page; please try again shortly.
          </p>
        ) : open && (
          <WhopCheckout planId={planId} returnUrl={returnUrl} id={`pay-${planId}`}>
            <p className="p-8 text-center text-[13px] opacity-70">Loading secure payment…</p>
          </WhopCheckout>
        )}
      </div>

      <p className="px-5 pb-5 text-[12px] opacity-70">
        Card details are handled by Whop and never reach this site. Closing this panel changes nothing —
        your brief stays as you left it.
      </p>
    </dialog>
  );
}
