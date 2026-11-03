import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PageHero } from '../components/Section';
import site from '../content/site';

export default function Services() {
  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Services"
        title="Three ways to have it read"
        body="Two are priced per unit of work on the same twenty-four-step ladder. One is a fixed engagement. Nothing is a package and nothing recurs."
      />
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 space-y-12">
        {site.services.map((s) => (
          <article key={s.slug} className="border border-brand-black/10 bg-brand-white p-8 md:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent mb-4">
              {s.fixedTier
                ? `Fixed engagement · $${s.unitRate.toFixed(2)}`
                : `$${s.unitRate.toFixed(2)} per ${s.unitNoun}`}
            </p>
            <h2 className="text-[30px] font-medium mb-4">{s.name}</h2>
            <p className="text-brand-gray leading-relaxed mb-7">{s.tagline}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {s.included.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={15} className="mt-1 flex-shrink-0 text-brand-accent" />
                  <span className="text-brand-gray">{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-brand-gray mb-7">{s.turnaround}</p>
            <Link
              to={`/services/${s.slug}`}
              className="inline-block bg-brand-black text-brand-light px-6 py-3 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-ink transition-colors"
            >
              {s.checkoutHeading}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
