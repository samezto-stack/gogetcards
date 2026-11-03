import { PageHero } from '../components/Section';
import site from '../content/site';

/**
 * NO CONTACT FORM AND NO EMAIL ADDRESS, deliberately.
 *
 * A form needs a mailbox behind it and a mailbox needs someone reading it.
 * Publishing an address that goes unwatched is worse than publishing none:
 * it invites a message and then swallows it. Whop's storefront already has
 * messaging that reaches someone, so that is the single route in.
 */
export default function Contact() {
  const { copy } = site;
  return (
    <div className="pb-24">
      <PageHero eyebrow="Contact" title="One way in" body={copy.contact.intro} />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-10">
        <section className="border border-brand-black/10 bg-brand-white p-8 md:p-10">
          <h2 className="text-[23px] font-medium mb-4">{site.name} on Whop</h2>
          <p className="text-brand-gray leading-relaxed mb-7">
            The storefront handles both messages and payments. Ask anything before you buy — and
            asking first is free.
          </p>
          <a
            href={site.whopUrl}
            className="inline-block bg-brand-black text-brand-light px-7 py-3.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-ink transition-colors"
          >
            Open the storefront
          </a>
          <p className="font-mono text-[11px] text-brand-gray mt-5 break-all">{site.whopUrl}</p>
        </section>

        <section>
          <h2 className="text-[23px] font-medium mb-4">Why there is no email address here</h2>
          <p className="text-brand-gray leading-relaxed">
            Because it would not be watched. A published address that nobody reads is a worse
            answer than no address at all — it takes a message from someone who needed one and
            silently loses it. Everything routes through the storefront instead, where messages
            arrive somewhere they are seen.
          </p>
        </section>

        <section>
          <h2 className="text-[23px] font-medium mb-4">{copy.contact.materialTitle}</h2>
          <p className="text-brand-gray leading-relaxed">{copy.contact.materialBody}</p>
        </section>
      </div>
    </div>
  );
}
