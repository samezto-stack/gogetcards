import { PageHero } from '../components/Section';
import site from '../content/site';

/**
 * The limits page.
 *
 * This exists where a testimonials page would normally go. A new practice
 * has no testimonials it can honestly print, and inventing them is both a
 * lie and the easiest thing in this business to get caught doing. What it
 * can offer someone deciding whether to spend money is an unusually specific
 * account of what it will not do.
 */
export default function Standards() {
  const all = [...site.limits, ...site.copy.standards.extra];

  return (
    <div className="pb-24">
      <PageHero eyebrow="Standards & limits" title="What this is not" body={site.copy.standards.intro} />

      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-12">
        {all.map((l) => (
          <section key={l.title} className="border-l-2 border-brand-accent pl-7">
            <h2 className="text-[23px] font-medium mb-3">{l.title}</h2>
            <p className="text-brand-gray leading-relaxed">{l.body}</p>
          </section>
        ))}

        <section className="border-l-2 border-brand-accent pl-7">
          <h2 className="text-[23px] font-medium mb-3">No testimonials, and no numbers we cannot show you</h2>
          <p className="text-brand-gray leading-relaxed">
            There are no quotes on this site, no star ratings, no client logos and no count of
            work done. Not because none of that would help — it would — but because a new
            practice does not have any of it yet, and the ones you see elsewhere on day one were
            written by the same person who built the site. What is here instead is the exact
            contents of the work, the exact price, and the exact turnaround.
          </p>
        </section>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-10">
        <div className="border border-brand-black/10 bg-brand-white p-8">
          <h2 className="text-[19px] font-medium mb-3">Questions before you buy</h2>
          <p className="text-brand-gray leading-relaxed">
            Ask through the storefront. There is no email address on this site because an address
            nobody watches is worse than none.
          </p>
          <a
            href={site.whopUrl}
            className="inline-block mt-6 border border-brand-black/20 px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-light transition-colors"
          >
            Open the storefront
          </a>
        </div>
      </div>
    </div>
  );
}
