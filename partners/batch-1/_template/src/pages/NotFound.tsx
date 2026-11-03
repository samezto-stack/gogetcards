import { Link } from 'react-router-dom';
import site from '../content/site';

export default function NotFound() {
  return (
    <div className="flex-grow flex items-center px-6 md:px-10 py-28">
      <div className="max-w-3xl mx-auto w-full">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-accent mb-5">
          404
        </p>
        <h1 className="text-[44px] md:text-[68px] leading-[0.95] font-semibold mb-7">
          No page here
        </h1>
        <p className="text-lg text-brand-gray leading-relaxed mb-10 max-w-xl">
          The address does not match anything on this site. The services are below, or the
          storefront if you were looking for a way to get in touch.
        </p>
        <div className="flex flex-wrap gap-4">
          {site.services.map((s) => (
            <Link
              key={s.slug}
              to={`/services/${s.slug}`}
              className="border border-brand-black/20 px-6 py-3 text-[11px] font-mono font-semibold tracking-[0.14em] uppercase hover:bg-brand-white transition-colors"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
