import type { ReactNode } from 'react';

/** Page heading with the eyebrow/rule treatment used across the site, so
 *  every section is spaced and weighted the same without each page
 *  re-deciding it. */
export function PageHero({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <section className="bg-brand-white border-b border-brand-black/10 py-20 md:py-24 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-accent mb-5">
          {eyebrow}
        </p>
        <h1 className="text-[40px] md:text-[62px] leading-[0.95] font-semibold">{title}</h1>
        {body && <p className="text-lg text-brand-gray mt-7 max-w-2xl leading-relaxed">{body}</p>}
      </div>
    </section>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="max-w-4xl mx-auto px-6 md:px-10 py-14">
      {title && (
        <h2 className="text-[27px] font-medium mb-8 pb-4 border-b border-brand-black/10">{title}</h2>
      )}
      {children}
    </section>
  );
}
