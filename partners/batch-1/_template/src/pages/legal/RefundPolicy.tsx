import Legal from './Legal';
import site from '../../content/site';

export default function RefundPolicy() {
  /* The unit noun comes from the service, so the worked example below is
     always in the buyer's own vocabulary. Typed in, it becomes the sentence
     that tells a heating engineer about coverage passes. */
  const unit = site.services[0].unitNounPlural;
  const { entity } = site.legal;
  return (
    <Legal title="Refund Policy">
      <section>
        <h2>Before your material is assigned</h2>
        <p>
          Cancel for a full refund at any point before your script or pitch has been assigned to a
          reader. If you have paid and not yet sent anything, that is always the case. Ask through
          the storefront and the payment is returned in full.
        </p>
      </section>

      <section>
        <h2>After the work is delivered</h2>
        <p>
          A report cannot be un-read, so it is not refundable once it has been sent to you. This is
          the ordinary position for bespoke work made to order, and it is why the service pages set
          out exactly what the report contains before you buy rather than after.
        </p>
      </section>

      <section>
        <h2>If the work is in progress</h2>
        <p>
          Between assignment and delivery, cancelling refunds the unstarted part of your order. If
          you booked four {unit} and one has been written, three are refunded.
        </p>
      </section>

      <section>
        <h2>If what arrives is not what was described</h2>
        <p>
          If a report is missing something the service page said it includes, say so and it will be
          completed at no charge, or refunded in full if you would rather not wait. Disagreeing
          with the assessment is not the same thing — a report that concludes a script does not
          work has done its job, and a service that refunded unwelcome verdicts would only ever
          deliver welcome ones.
        </p>
      </section>

      <section>
        <h2>How to ask</h2>
        <p>
          Through the Whop storefront, where the order lives. Refunds are issued through Whop to the
          original payment method; {entity} has no access to your card details and cannot return
          money any other way.
        </p>
        <p>
          Requests are answered within {site.legal.refundWindowDays} days at the outside, and
          normally much sooner.
        </p>
      </section>
    </Legal>
  );
}
