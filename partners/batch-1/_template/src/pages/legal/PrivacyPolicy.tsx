import Legal from './Legal';
import site from '../../content/site';

export default function PrivacyPolicy() {
  const { entity } = site.legal;
  return (
    <Legal title="Privacy Policy">
      <section>
        <h2>The short version</h2>
        <p>
          This site has no accounts, no login, no newsletter and no contact form. It collects
          nothing about you until you buy something, and what it holds after that is your order and
          the material you sent to be read.
        </p>
      </section>

      <section>
        <h2>What is collected, and when</h2>
        <ul>
          <li>
            <strong>Nothing, while you browse.</strong> No analytics service, no advertising
            pixels, no fingerprinting and no third-party tracking scripts run on these pages.
          </li>
          <li>
            <strong>Server logs.</strong> The web server records the address requested, the time,
            and the requesting IP — what any web server records in order to run. These rotate and
            are not used to build a profile of anyone.
          </li>
          <li>
            <strong>One checkout signal.</strong> When a checkout is shown, the page reports back
            that it appeared, or that it failed to appear within eight seconds. It carries which
            page it happened on and nothing about you. It exists because a checkout that silently
            fails to load is otherwise invisible.
          </li>
          <li>
            <strong>Your order.</strong> Handled by Whop, under Whop's own privacy policy. Card
            details are entered on Whop's form and never reach this site.
          </li>
          <li>
            <strong>The material you send.</strong> Your script, pitch or bible, and whatever you
            write alongside it.
          </li>
        </ul>
      </section>

      <section>
        <h2>What your material is used for</h2>
        <p>
          Reading and writing your report. Nothing else. It is not published, not quoted, not shown
          to anyone else, not used as a teaching example, and not used to train anything.
        </p>
      </section>

      <section>
        <h2>How long it is kept</h2>
        <p>
          Your material and report are kept while the engagement is open and for a short period
          afterwards, so that a lost file can be re-sent. Ask and they are deleted immediately.
          Order records are retained by Whop for as long as its own policy and the applicable tax
          rules require.
        </p>
      </section>

      <section>
        <h2>Who else sees anything</h2>
        <p>
          Whop, which processes the payment and hosts the storefront messaging. The hosting
          provider, which runs the server. Nobody else — there is no email marketing platform, no
          CRM, no analytics vendor and no advertising network attached to this site.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Ask for a copy of what is held about you, ask for it to be corrected, or ask for it to be
          deleted. Requests go through the storefront and are actioned rather than acknowledged.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Through the {entity} storefront on Whop. There is deliberately no email address on this
          site — see the contact page for why.
        </p>
      </section>
    </Legal>
  );
}
