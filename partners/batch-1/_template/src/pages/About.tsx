import { PageHero } from '../components/Section';
import site from '../content/site';

/**
 * WRITTEN TO WORK WITHOUT A NAMED OWNER.
 *
 * site.owner.name may be empty. When it is, this page describes the practice
 * and the method and stops — it never says "our team", never uses an
 * initial, and never implies a person it cannot name. When a name is
 * supplied it appears here and nothing else changes.
 *
 * The alternative — a plausible invented name on a page that takes payment —
 * is a misrepresentation, and a fabricated name is far harder to withdraw
 * later than an absent one is to add.
 */
export default function About() {
  const { owner, copy } = site;
  const hasOwner = owner.name.trim().length > 0;

  return (
    <div className="pb-24">
      <PageHero eyebrow="About" title={copy.about.title} body={copy.about.intro} />

      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-12">
        {copy.about.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-[26px] font-medium mb-5">{s.title}</h2>
            {s.paras.map((p) => (
              <p key={p} className="text-brand-gray leading-relaxed mb-4">
                {p}
              </p>
            ))}
          </section>
        ))}

        {hasOwner && (
          <section className="border-t border-brand-black/10 pt-12">
            <h2 className="text-[26px] font-medium mb-2">{owner.name}</h2>
            {owner.title && (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-accent mb-5">
                {owner.title}
              </p>
            )}
            {owner.bio.map((para) => (
              <p key={para} className="text-brand-gray leading-relaxed mb-4">
                {para}
              </p>
            ))}
          </section>
        )}

        <section className="border border-brand-black/10 bg-brand-white p-8">
          <h2 className="text-[19px] font-medium mb-3">{copy.about.closing.title}</h2>
          <p className="text-brand-gray leading-relaxed">{copy.about.closing.body}</p>
          <a
            href={site.whopUrl}
            className="inline-block mt-6 border border-brand-black/20 px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-light transition-colors"
          >
            Open the storefront
          </a>
        </section>
      </div>
    </div>
  );
}
