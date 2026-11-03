import { Link } from 'react-router-dom';
import { PageHero } from '../components/Section';
import site from '../content/site';

/**
 * The whole ladder, written out.
 *
 * A pricing page that says "from $49.99" and makes you open a checkout to
 * see the rest is a pricing page that is hiding something. Every one of the
 * twenty-four steps is printed here with its total, which is also the fastest way
 * for anyone to check that the arithmetic on the service pages is real.
 */
export default function Pricing() {
  const rate = site.plans[0].price;
  const perUnit = site.services.filter((s) => !s.fixedTier);
  const fixed = site.services.filter((s) => s.fixedTier);

  return (
    <div className="pb-24">
      <PageHero
        eyebrow="Pricing"
        title="One rate, twenty-four steps"
        body={`Every per-unit service is $${rate.toFixed(2)} a unit. Twenty-four steps, no packages, no volume discount and no surcharge for a short deadline.`}
      />

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14">
        <div className="border border-brand-black/10 bg-brand-white">
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-6 px-6 md:px-8 py-4 border-b border-brand-black/10 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-gray">
            <span>Step</span>
            <span>Units of work</span>
            <span className="text-right">Total</span>
          </div>
          {site.plans.map((p) => (
            <div
              key={p.planId}
              className="grid grid-cols-[auto_1fr_auto] gap-x-6 px-6 md:px-8 py-3.5 border-b border-brand-black/5 last:border-0 items-baseline"
            >
              <span className="font-mono text-brand-gray text-sm tabular-nums w-6">{p.units}</span>
              <span className="text-sm text-brand-gray">
                {p.units} &times; ${rate.toFixed(2)}
              </span>
              <span className="font-mono tabular-nums text-right">${p.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-14 space-y-10">
          <div>
            <h2 className="text-[24px] font-medium mb-4">What one unit buys</h2>
            <ul className="space-y-3">
              {perUnit.map((s) => (
                <li key={s.slug} className="text-brand-gray leading-relaxed">
                  <Link to={`/services/${s.slug}`} className="text-brand-black underline underline-offset-2">
                    {s.name}
                  </Link>
                  {' — '}
                  one {s.unitNoun}. {s.note.body}
                </li>
              ))}
            </ul>
          </div>

          {fixed.map((s) => (
            <div key={s.slug}>
              <h2 className="text-[24px] font-medium mb-4">{s.name}</h2>
              <p className="text-brand-gray leading-relaxed">
                A fixed engagement at ${s.unitRate.toFixed(2)} — the same amount as the top of the
                ladder, because it is roughly that much reading.{' '}
                <Link to={`/services/${s.slug}`} className="text-brand-black underline underline-offset-2">
                  What it covers
                </Link>
                .
              </p>
            </div>
          ))}

          <div>
            <h2 className="text-[24px] font-medium mb-4">What the price does not do</h2>
            <p className="text-brand-gray leading-relaxed">
              It does not fall for buying several at once and it does not rise for a tight
              deadline. Both of those are ways of charging different people differently for the
              same work, and the reading takes the same time either way. There is no subscription,
              no retainer and no call you have to sit through before a number appears.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
