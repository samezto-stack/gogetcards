import { Link } from 'react-router-dom';
import { PageHero } from '../components/Section';
import site from '../content/site';

export default function HowItWorks() {
  return (
    <div className="pb-24">
      <PageHero
        eyebrow="How it works"
        title="Five steps, no calls"
        body="From choosing a count to getting the report back. Nothing here requires you to speak to anyone before you can see a price."
      />
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14">
        <ol className="space-y-12">
          {site.howItWorks.map((s) => (
            <li key={s.step} className="flex gap-7">
              <span className="font-mono text-brand-accent text-[15px] pt-1">{s.step}</span>
              <div>
                <h2 className="text-[21px] font-medium mb-2">{s.title}</h2>
                <p className="text-brand-gray leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 border border-brand-black/10 bg-brand-white p-8">
          <h2 className="text-[21px] font-medium mb-3">Where the money goes</h2>
          <p className="text-brand-gray leading-relaxed">
            Payment is handled by Whop, which runs the checkout inside this page in its own frame.
            Card details are entered into Whop's form and never reach this site — it has no payment
            fields, stores no card data and could not receive any if it wanted to.
          </p>
          <a
            href={site.whopUrl}
            className="inline-block mt-6 border border-brand-black/20 px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-light transition-colors"
          >
            View the storefront
          </a>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to="/services"
            className="bg-brand-black text-brand-light px-7 py-3.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase text-center hover:bg-brand-ink transition-colors"
          >
            See the services
          </Link>
          <Link
            to="/pricing"
            className="border border-brand-black/20 px-7 py-3.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase text-center hover:bg-brand-white transition-colors"
          >
            See every price
          </Link>
        </div>
      </div>
    </div>
  );
}
