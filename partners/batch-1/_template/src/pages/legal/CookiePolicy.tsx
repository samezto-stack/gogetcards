import Legal from './Legal';

export default function CookiePolicy() {
  return (
    <Legal title="Cookie Policy">
      <section>
        <h2>This site sets none</h2>
        <p>
          No analytics cookies, no advertising cookies, no consent banner, and no preference
          cookies — there are no preferences to store. There is nothing here to opt out of because
          there is nothing switched on.
        </p>
      </section>

      <section>
        <h2>What the checkout sets</h2>
        <p>
          The payment form on the service pages is Whop's, running in its own frame. Whop sets what
          it needs to process a payment and to keep that payment secure, under its own cookie and
          privacy policies. Those cookies belong to Whop and are readable only by Whop — this site
          cannot see them, and could not read your card details if it tried.
        </p>
      </section>

      <section>
        <h2>The checkout signal is not a cookie</h2>
        <p>
          When a checkout appears — or fails to appear within eight seconds — the page requests a
          one-pixel image to record that fact. It stores nothing in your browser, sets no
          identifier, and carries only which page it happened on. It exists so that a checkout
          failing to load is not an invisible problem.
        </p>
      </section>

      <section>
        <h2>Fonts</h2>
        <p>
          Typefaces are served by Google Fonts, which receives the request as a matter of serving
          the file. No cookie is set by it.
        </p>
      </section>
    </Legal>
  );
}
