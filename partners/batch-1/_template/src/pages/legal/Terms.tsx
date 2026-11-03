import Legal from './Legal';
import site from '../../content/site';

export default function Terms() {
  const { entity, jurisdiction } = site.legal;
  /* DERIVED, NEVER TYPED. This sentence used to name one site's services in
     every site's terms, because the file was copied and the sentence was
     not read. Building it from what the site actually sells means a copy
     cannot describe the wrong trade. */
  const names = site.services.map((s) => s.name.toLowerCase());
  /* "a onboarding review" is how this read before the article was derived
     too. Vowel letter rather than vowel sound is the crude test, and it is
     the right one here because every service name on these sites is an
     ordinary English noun phrase — not an acronym, not a "one-", not a
     "usable". */
  const article = /^[aeiou]/.test(names[0]) ? 'an' : 'a';
  const serviceList =
    names.length === 1
      ? `${article} ${names[0]}`
      : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return (
    <Legal title="Terms of Service">
      <section>
        <h2>What these terms cover</h2>
        <p>
          They apply when you buy {serviceList} from {entity}. Buying any of them means accepting
          them.
        </p>
      </section>

      <section>
        <h2>What is being sold</h2>
        <p>
          A written assessment of material you supply. Each service page states exactly what its
          report contains and how long it takes; that description is the specification, and it is
          what {entity} is obliged to deliver.
        </p>
        <p>
          What is not being sold: representation, submission of your work to anyone, introductions,
          rewriting, ghostwriting, or any outcome in the market. {entity} is not an agency, a
          management company or a production company, and has no arrangement with any.
        </p>
      </section>

      <section>
        <h2>Your material and your rights in it</h2>
        <p>
          You keep every right in what you send. Nothing here transfers copyright, creates a
          licence beyond what is needed to read and assess the work, or gives {entity} any claim
          over your script, your premise or anything derived from them.
        </p>
        <p>
          You confirm the material is yours to send — that you wrote it, or have the right to
          submit it — and that sending it breaches nobody else's agreement.
        </p>
      </section>

      <section>
        <h2>Confidentiality</h2>
        <p>
          Your material is read by one person, is not circulated, is not published, and is not used
          as an example anywhere. It is deleted on request. No separate non-disclosure agreement is
          signed; the obligation in this clause is the same obligation, without the paperwork.
        </p>
      </section>

      <section>
        <h2>Timing</h2>
        <p>
          Turnaround is counted in working days from when your material arrives, not from when you
          paid. If your material arrives incomplete — parts referred to in the material but not supplied — the clock starts when the missing part does.
        </p>
      </section>

      <section>
        <h2>The document, not the decisions: not advice, not a certification, not a rewrite</h2>
        <p>
          The report is a professional opinion about whether the document you send gives its reader what they need to act on it. It is not advice in the field the document belongs to, and no view is offered on the underlying decisions the document informs — those are judgements for the people who will carry them.
        </p>
        <p>
          {entity} is not a professional adviser in the field its subject documents belong to, advises nobody, and holds no appointment over your organisation. Nothing is certified: no report certifies that your material is compliant, complete, correct or fit for any purpose, and none may be presented to a regulator, counterparty or third party as assurance that it is. Nothing is rewritten either — no document is redrafted, no summary is written and no replacement is produced, so your material is returned exactly as it arrived. Findings rest on the material you send, read without access to its authors; where it refers to material not supplied, the report says which findings depend on it. Decisions you take after reading one are yours.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          Payments are processed by Whop. {entity} does not receive, store or have access to your
          card details. The price charged is the price configured against the plan you select at
          checkout.
        </p>
      </section>

      <section>
        <h2>Cancelling</h2>
        <p>
          See the refund policy. In short: cancel in full before your material is assigned to a
          reader; once the work has been done and delivered it cannot be returned.
        </p>
      </section>

      <section>
        <h2>Conduct</h2>
        <p>
          Reports are written plainly and will sometimes say a script does not work. That is the
          service. Abuse directed at a reader ends the engagement without a refund of work already
          delivered.
        </p>
      </section>

      <section>
        <h2>Limit of liability</h2>
        <p>
          Liability for any claim arising from an engagement is limited to the amount paid for that
          engagement. Nothing here limits liability that cannot lawfully be limited.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          These terms may be updated. The version in force for your order is the one published when
          you paid, and the date at the top of this page is when it last changed substantively.
        </p>
      </section>

      {/* The governing-law clause is omitted entirely until a trading
          jurisdiction is confirmed. Naming one nobody has chosen would be a
          worse defect than leaving it out — it would be a statement about
          where a customer must bring a claim, invented. */}
      {jurisdiction ? (
        <section>
          <h2>Governing law</h2>
          <p>These terms are governed by the laws of {jurisdiction}.</p>
        </section>
      ) : null}
    </Legal>
  );
}
