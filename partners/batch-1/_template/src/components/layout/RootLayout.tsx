import { Outlet, useLocation, NavLink, Link } from 'react-router-dom';
import { useEffect } from 'react';
import site from '../../content/site';

/**
 * Business Plan's shell: a pack with tab dividers.
 *
 * WHY THIS SHAPE. The material these buyers read is a filed set of parts —
 * a cover, a contents, then a run of items each behind its own tab. The
 * site is laid out as one: a masthead, then a numbered strip naming the
 * four things each part has to carry, then the parts themselves.
 *
 * THE STRIP IS THE ARGUMENT, not decoration. It names, in order, what a
 * reader needs from each part and the order in which each missing one makes
 * the rest harder to use. It carries no figure, because a number on a
 * marketing page would be a number about somebody else's document.
 *
 * THE NUMBERS ARE IN THE COOL TONE, never the accent. The accent on this
 * site means one thing — the site's single emphasis — and spending it on
 * numbering would leave the mark meaning nothing.
 *
 * Header.tsx and Footer.tsx are deliberately unused. The shell is the design.
 */

const NAV = [
  { to: site.copy.ctaTo, label: 'The review' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/standards', label: 'Standards' },
  { to: '/resources', label: 'Notes' },
  { to: '/faq', label: 'Questions' },
  { to: '/about', label: 'About' },
];

/* The four things each part has to carry before a reader can act on it. */
const ASSUMPTIONS = ['Narrative', 'Market', 'Ask', 'Assumptions'];

export default function RootLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen bg-brand-light flex flex-col">
      <header className="bg-brand-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-6 pb-3">
            <Link to="/" className="flex items-baseline gap-3">
              <span className="font-display text-[21px] font-bold tracking-[-0.03em]">{site.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-gray">
                {site.copy.navTagline}
              </span>
            </Link>
            <Link
              to={site.copy.ctaTo}
              className="font-mono text-[11px] uppercase tracking-[0.16em] border border-brand-black px-4 py-2 hover:bg-brand-black hover:text-brand-white transition-colors"
            >
              {site.copy.ctaLabel}
            </Link>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-1 pb-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `text-[13px] pb-0.5 border-b-2 ${
                    isActive
                      ? 'border-brand-accent text-brand-accent font-semibold'
                      : 'border-transparent text-brand-ink hover:text-brand-accent'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ── The strip: what each part has to carry ── */}
        <div className="border-t border-brand-cool/25">
          <ol className="max-w-6xl mx-auto px-5 md:px-8 flex flex-wrap gap-x-8 gap-y-1 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-gray">
            {ASSUMPTIONS.map((a, i) => (
              <li key={a} className="flex items-baseline gap-2">
                <span className="tabular-nums text-brand-cool">{String(i + 1).padStart(2, '0')}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="pack-rule" aria-hidden="true" />
      </header>

      <main className="flex-1 bg-brand-light">
        <Outlet />
      </main>

      <footer className="bg-brand-white pack-rule border-b-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-7">
          <p className="text-[12px] text-brand-gray max-w-3xl leading-relaxed">
            {site.name} is not an investor, an adviser or an accountant, builds no model and advises on no raise. Nothing here builds the model, writes the plan, sets a valuation, forecasts a return or endorses the business, and no section is drafted or reworded. Whether the business will raise or is viable is the founder&rsquo;s and the market&rsquo;s.
          </p>
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-3 mt-6">
            <p className="text-[12.5px] text-brand-gray max-w-md leading-relaxed">{site.strapline}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-brand-gray">
              <Link className="hover:text-brand-accent" to="/terms">Terms</Link>
              <Link className="hover:text-brand-accent" to="/privacy-policy">Privacy</Link>
              <Link className="hover:text-brand-accent" to="/refund-policy">Refunds</Link>
              <Link className="hover:text-brand-accent" to="/cookie-policy">Cookies</Link>
              <Link className="hover:text-brand-accent" to="/contact">Contact</Link>
            </div>
          </div>
          <p className="font-mono text-[10px] text-brand-gray mt-6">
            &copy; {new Date().getFullYear()} {site.legal.entity}
          </p>
        </div>
      </footer>
    </div>
  );
}
