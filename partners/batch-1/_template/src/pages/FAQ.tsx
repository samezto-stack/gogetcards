import { PageHero } from '../components/Section';
import site from '../content/site';

export default function FAQ() {
  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Questions"
        title="Asked and answered"
        body="Everything below is answered in full on the page. Nothing is gated behind a form."
      />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14">
        <dl className="divide-y divide-brand-black/10 border-t border-b border-brand-black/10">
          {site.faqs.map((f) => (
            <div key={f.q} className="py-8">
              <dt className="text-[19px] font-medium mb-3 font-display">{f.q}</dt>
              <dd className="text-brand-gray leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
