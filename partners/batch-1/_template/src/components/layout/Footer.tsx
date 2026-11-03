import { Link } from 'react-router-dom';
import site from '../../content/site';

/* The Whop storefront is the ONLY contact route, on purpose. There is no
   email address anywhere on this site: an address nobody watches is worse
   than none, and Whop is where a message actually reaches someone. */
export default function Footer() {
  return (
    <footer className="border-t border-brand-black/10 bg-brand-white mt-24">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <p className="font-display text-[19px] font-semibold">{site.name}</p>
          <p className="text-brand-gray text-sm mt-3 max-w-sm leading-relaxed">{site.strapline}</p>
          <a
            href={site.whopUrl}
            className="inline-block mt-6 border border-brand-black/20 px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-light transition-colors"
          >
            Storefront &amp; contact
          </a>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-gray mb-4">Services</p>
          <ul className="space-y-2.5 text-sm">
            {site.services.map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`} className="text-brand-gray hover:text-brand-black transition-colors">
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/pricing" className="text-brand-gray hover:text-brand-black transition-colors">
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-gray mb-4">Site</p>
          <ul className="space-y-2.5 text-sm">
            {[
              ['/how-it-works', 'How it works'],
              ['/standards', 'Standards & limits'],
              ['/resources', 'Resources'],
              ['/faq', 'Questions'],
              ['/about', 'About'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-brand-gray hover:text-brand-black transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-black/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex flex-col sm:flex-row justify-between gap-4 text-[11px] font-mono uppercase tracking-[0.12em] text-brand-gray">
          <p>&copy; {new Date().getFullYear()} {site.legal.entity}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/terms" className="hover:text-brand-black transition-colors">Terms</Link>
            <Link to="/privacy-policy" className="hover:text-brand-black transition-colors">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-brand-black transition-colors">Refunds</Link>
            <Link to="/cookie-policy" className="hover:text-brand-black transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
