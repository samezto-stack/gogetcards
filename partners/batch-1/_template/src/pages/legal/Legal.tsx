import type { ReactNode } from 'react';
import site from '../../content/site';

/** Shared shell for the four policy pages, so they are typeset alike and
 *  each one only has to carry its own clauses. */
export default function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pb-24">
      <section className="bg-brand-white border-b border-brand-black/10 py-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-accent mb-5">
            {site.legal.entity}
          </p>
          <h1 className="text-[38px] md:text-[54px] leading-[0.98] font-semibold">{title}</h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-gray mt-6">
            Last updated {site.legal.updated}
          </p>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-14 space-y-10 [&_h2]:text-[22px] [&_h2]:font-medium [&_h2]:mb-3 [&_p]:text-brand-gray [&_p]:leading-relaxed [&_p]:mb-3 [&_li]:text-brand-gray [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
        {children}
      </div>
    </div>
  );
}
