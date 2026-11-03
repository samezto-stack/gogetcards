import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import site from '../../content/site';

const NAV = [
  { to: '/services', label: 'Services' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/standards', label: 'Standards' },
  { to: '/resources', label: 'Resources' },
  { to: '/faq', label: 'Questions' },
  { to: '/about', label: 'About' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-brand-light/95 backdrop-blur border-b border-brand-black/10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between gap-6">
        <Link to="/" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">{site.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-brand-gray mt-1">
            {site.copy.navTagline}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'text-[13px] transition-colors ' +
                (isActive ? 'text-brand-black font-medium' : 'text-brand-gray hover:text-brand-black')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to={site.copy.ctaTo}
            className="bg-brand-black text-brand-light px-5 py-2.5 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-ink transition-colors"
          >
            {site.copy.ctaLabel}
          </Link>
        </nav>

        <button
          type="button"
          className="lg:hidden p-2 -mr-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-brand-black/10 bg-brand-light px-6 py-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] text-brand-gray"
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to={site.copy.ctaTo}
            onClick={() => setOpen(false)}
            className="mt-3 bg-brand-black text-brand-light px-5 py-3 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase text-center"
          >
            {site.copy.ctaLabel}
          </Link>
        </nav>
      )}
    </header>
  );
}
