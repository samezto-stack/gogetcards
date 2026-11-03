import { Navigate, useParams } from 'react-router-dom';
import BriefForm from '../components/BriefForm';
import site from '../content/site';

/**
 * The service page, laid out as one filed item in the document it is about.
 *
 * THE BRIEF IS THE PAGE. Everything the review is written from is asked for
 * here, the quantity is chosen against a visible total, and the payment
 * dialog does not open until the required fields are filled and the file
 * has landed. Taking payment first and chasing the material afterwards buys
 * a paid order that cannot be started, which is the worst state this
 * business can be in.
 *
 * THE EXPLANATORY COPY MOVED BELOW THE WORKING AREA rather than going away.
 * A buyer who has already decided should not have to scroll past the pitch
 * to reach the form.
 *
 * WHY IT LOOKS LIKE THIS. No card, no shadow, no panel — a filed document is
 * a ruled thing and this page is one: hairline rules between every line,
 * numbers in the cool tone down the edge, and the rail separated by a single
 * heavier rule rather than a float. The rail is where a cover sheet carries
 * its summary, and so is this one.
 */
export default function Service() {
  const { slug } = useParams();
  const service = site.services.find((s) => s.slug === slug);
  if (!service) return <Navigate to="/services" replace />;

  const field =
    'w-full bg-brand-white border border-brand-black/20 px-3.5 py-2.5 text-[14.5px] leading-relaxed ' +
    'placeholder:text-brand-gray/50 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30';

  return (
    <div className="pb-24">
      <section className="bg-brand-white border-b border-brand-black/10 py-3 px-5 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <h1 className="text-[26px] md:text-[31px] leading-none font-semibold">{service.name}</h1>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-accent tabular-nums">
            ${service.unitRate.toFixed(2)} per {service.unitNoun} · one payment
          </p>
          <p className="text-[13px] text-brand-gray leading-snug basis-full max-w-3xl">{service.tagline}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-6">
        <BriefForm
          service={service}
          plans={site.plans}
          returnUrl={site.returnUrl}
          cx={{
            form: 'grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8 items-start',

            /* Two to a row, so the whole brief and the rail beside it land
               inside one screen. The outstanding list in the rail is only
               worth having while the fields it names are still visible. */
            fields: 'lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 items-start',
            fieldset: 'sm:col-span-2 min-w-0',
            fieldsetHalf: '!col-span-1',
            label:
              'flex items-baseline gap-2.5 text-[13.5px] font-medium mb-1.5 pb-1 border-b border-brand-black/10',
            labelNum: 'font-mono text-[11px] tabular-nums text-brand-cool',
            input: field,
            area: `${field} resize-y min-h-[60px]`,
            select: `${field} appearance-none`,
            /* col-span-2 so the intro sentence — the one child of this grid
               that is not a field — takes a full row rather than leaving an
               empty cell beside the first one. */
            help: 'text-[11.5px] text-brand-gray leading-snug mt-1.5 sm:col-span-2',
            error: 'text-[12px] text-brand-accent font-medium mt-1.5 leading-snug',

            uploadZone: 'border border-dashed border-brand-black/25 bg-brand-white p-3 mt-2',
            uploadZoneActive: '!border-brand-accent !bg-brand-light',
            uploadButton:
              'border border-brand-black/20 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] ' +
              'hover:bg-brand-light disabled:opacity-40 transition-colors',
            uploadRow:
              'flex items-center justify-between gap-4 text-[13px] font-mono tabular-nums ' +
              'border-b border-brand-black/10 py-2.5',

            /* The rail, ruled rather than floated — a sheet does not have
               cards on it. `sticky` keeps the total and the outstanding list
               in view while the buyer works down the form. */
            summary:
              'lg:col-span-5 lg:sticky lg:top-8 bg-brand-white border-t-[3px] border-brand-cool ' +
              'border-x border-b border-brand-black/10 p-6',
            summaryHead: 'text-[19px] font-medium mb-4',

            qtyRow: 'grid grid-cols-6 gap-1.5 mb-5',
            qtyButton:
              'h-9 border border-brand-black/20 font-mono text-[12.5px] tabular-nums ' +
              'hover:bg-brand-light transition-colors',
            qtyButtonActive: '!bg-brand-black !text-brand-white !border-brand-black',

            lineRow: 'flex justify-between text-[13px] text-brand-gray pb-3 font-mono tabular-nums',
            total:
              'flex justify-between items-baseline border-t border-brand-black/10 pt-4 text-[15px]',
            totalFigure: 'font-mono text-[27px] tabular-nums leading-none',

            checklist: 'mt-5 pt-4 border-t border-brand-black/10 space-y-1.5',
            checklistDone: 'flex gap-2.5 text-[12.5px] text-brand-gray leading-snug',
            checklistTodo: 'flex gap-2.5 text-[12.5px] font-medium leading-snug',
            checklistOptional: 'flex gap-2.5 text-[12.5px] text-brand-gray/70 leading-snug',

            submit:
              'w-full mt-5 bg-brand-black text-brand-white font-mono text-[12px] uppercase ' +
              'tracking-[0.2em] py-3.5 hover:bg-brand-accent transition-colors',
            submitBlocked: '!bg-brand-black/45 hover:!bg-brand-black/55',
            note: 'text-[11.5px] text-brand-gray leading-snug mt-3',

            dialog:
              'backdrop:bg-brand-black/60 bg-brand-white border border-brand-black/20 p-0 ' +
              'w-[min(94vw,460px)] m-auto',
            dialogHead:
              'flex items-start justify-between gap-4 px-6 py-5 border-b border-brand-black/10 ' +
              'text-[14px] leading-snug',
            dialogBody: 'min-h-[360px]',
            dialogClose: 'text-[24px] leading-none opacity-50 hover:opacity-100',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 mt-24">
        <div className="lg:col-span-7 space-y-14">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-6 border-b border-brand-black/15">
              The order it is read in
            </h2>
            <dl>
              {service.process.map((item) => (
                <div
                  key={item.step}
                  className="grid grid-cols-[minmax(0,34px)_minmax(0,1fr)] gap-x-5 py-4 border-b border-brand-black/[0.09]"
                >
                  <dt className="font-mono text-brand-cool text-[12px] pt-1 tabular-nums">{item.step}</dt>
                  <dd>
                    <h3 className="text-[15.5px] font-semibold mb-1.5 tracking-[-0.01em]">{item.title}</h3>
                    <p className="text-[14px] text-brand-gray leading-relaxed">{item.desc}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[13px] text-brand-gray mt-5 leading-relaxed max-w-xl">
              The model is read beside the narrative, because every claim in the words is read against the number that should produce it. A plan read section by section finds confident prose; it does not find the growth the narrative promises that the model three tabs over never produces.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-6 border-b border-brand-black/15">
              What comes back
            </h2>
            <ul>
              {service.included.map((f, i) => (
                <li
                  key={f}
                  className="flex items-baseline gap-5 py-3 border-b border-brand-black/[0.09] text-[14px] text-brand-gray"
                >
                  <span className="font-mono text-[11px] tabular-nums text-brand-cool">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-brand-gray mt-5 leading-relaxed max-w-xl">
              Turnaround — {service.turnaround} Counted from the day your material arrives, not the day
              you paid; nothing is assigned to a reader before there is something to read.
            </p>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-gray pb-3 mb-4 border-b border-brand-black/15">
              {service.note.title}
            </h2>
            <p className="text-[14px] text-brand-gray leading-relaxed max-w-xl">{service.note.body}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
