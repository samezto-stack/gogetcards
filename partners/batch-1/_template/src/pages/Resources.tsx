import { PageHero } from '../components/Section';
import site from '../content/site';

/* Written out in full rather than teased. A resources section that is a list
   of titles linking nowhere is a sitemap wearing a hat. */
export default function Resources() {
  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Resources"
        title="Craft notes"
        body={site.copy.resourcesIntro}
      />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-16">
        {site.resources.map((r) => (
          <article key={r.title}>
            <h2 className="text-[28px] font-medium mb-3">{r.title}</h2>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-accent mb-6">
              {r.summary}
            </p>
            {r.body.map((para) => (
              <p key={para} className="text-brand-gray leading-relaxed mb-4">
                {para}
              </p>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
