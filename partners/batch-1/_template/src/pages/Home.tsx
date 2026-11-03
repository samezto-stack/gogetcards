import { Link } from 'react-router-dom';
import site from '../content/site';

/**
 * Business Plan's home page, laid out as the pack the subject arrives in.
 *
 * THE PILLARS ARE FILED ITEMS, not cards. Each gets a number, a tab edge
 * and an entry beside it, because that is the shape of every item in the
 * document these buyers read, and they recognise it before they have read
 * a word.
 *
 * THE LADDER IS RIGHT-ALIGNED on its figures. A column that does not align
 * undermines a site whose entire claim is that somebody else's document was
 * not read carefully enough.
 *
 * THE LIMITS CARRY THE ACCENT RULE and nothing else on the page does. The
 * mark means one thing here — the site's single emphasis — and the heading
 * beside it says so in words, so nothing depends on colour being seen.
 *
 * NO NUMBERS ABOUT ANYBODY'S DOCUMENT ANYWHERE ON THIS PAGE. Every figure is
 * either a price, which is ours, or a rung count.
 */
export default function Home() {
  const service = site.services[0];

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      {/* ── Statement ── */}
      <section className="pt-12 md:pt-16 pb-10 border-b border-brand-black/[0.12]">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand-accent">
          {site.hero.eyebrow}
        </p>
        <h1 className="font-display text-[32px] md:text-[54px] leading-[1.02] tracking-[-0.04em] font-bold mt-5 max-w-3xl">
          {site.hero.title}
          <br />
          <span className="text-brand-gray">{site.hero.titleAccent}</span>
        </h1>
        <p className="text-[16px] text-brand-gray mt-7 max-w-2xl leading-relaxed">{site.hero.body}</p>

        <div className="flex flex-wrap gap-3 mt-9">
          <Link
            to={site.hero.primaryCta.to}
            className="bg-brand-black text-brand-white font-mono text-[11.5px] uppercase tracking-[0.16em] px-7 py-3.5 hover:bg-brand-accent transition-colors"
          >
            {site.hero.primaryCta.label}
          </Link>
          <Link
            to={site.hero.secondaryCta.to}
            className="border border-brand-black/25 font-mono text-[11.5px] uppercase tracking-[0.16em] px-7 py-3.5 hover:border-brand-accent hover:text-brand-accent transition-colors"
          >
            {site.hero.secondaryCta.label}
          </Link>
        </div>

        <p className="font-mono text-[11px] text-brand-gray mt-6 tabular-nums">
          ${service.unitRate.toFixed(2)} per {service.unitNoun} · one payment · nothing recurring
        </p>
      </section>

      {/* ── What the report contains, as schedule lines ── */}
      <section className="py-12 md:py-14 border-b border-brand-black/[0.12]">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-2 border-b border-brand-black/15">
          What the report contains
        </h2>
        <dl>
          {site.pillars.map((p, i) => (
            <div
              key={p.title}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,72px)_minmax(0,250px)_minmax(0,1fr)] gap-1 md:gap-8 py-5 border-b border-brand-black/[0.09]"
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-cool tabular-nums pt-1 hidden md:block">
                Check {String(i + 1).padStart(2, '0')}
              </dt>
              <dd className="tab font-semibold text-[15px] tracking-[-0.01em] md:col-start-2">
                {p.title}
              </dd>
              <dd className="text-[14px] text-brand-gray leading-relaxed md:pt-0.5">{p.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── The ladder ── */}
      <section className="py-12 md:py-14 border-b border-brand-black/[0.12]">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-6 border-b border-brand-black/15">
          Price ladder
        </h2>
        <div className="max-w-lg font-mono text-[13px]">
          {site.plans.map((p) => (
            <div
              key={p.units}
              className="flex items-baseline justify-between py-1.5 border-b border-brand-black/[0.08] tabular-nums"
            >
              <span className="text-brand-gray">
                {String(p.units).padStart(2, '0')}{' '}
                {p.units === 1 ? service.unitNoun : service.unitNounPlural}
              </span>
              <span className="font-medium">${p.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-brand-gray mt-5 max-w-xl leading-relaxed">
          One rate, multiplied. No packages, no volume discount and no surcharge — the twelfth
          costs what the first did.
        </p>
      </section>

      {/* ── Limits ── */}
      <section className="py-12 md:py-14">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-2 border-b border-brand-black/15">
          What this is not
        </h2>
        <dl>
          {site.limits.map((l) => (
            <div
              key={l.title}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,294px)_minmax(0,1fr)] gap-1 md:gap-8 py-5 border-b border-brand-black/[0.09]"
            >
              <dt className="unstated font-semibold text-[15px] tracking-[-0.01em] text-brand-accent">
                {l.title}
              </dt>
              <dd className="text-[14px] text-brand-gray leading-relaxed">{l.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
