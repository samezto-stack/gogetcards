import { useMemo, useState } from 'react';
import BriefUpload from './BriefUpload';
import type { BriefFile } from './BriefUpload';
import PaymentDialog from './PaymentDialog';
import type { Service, Plan } from '../content/types';

/**
 * The brief, the quantity, the total, and the payment that follows them.
 *
 * ORDER OF OPERATIONS, AND WHY. The buyer describes the work, attaches what
 * the work needs, chooses how many units, reads the total, and only then does
 * the payment dialog open. Nothing is committed anywhere until Whop reports a
 * successful payment, so an abandoned brief leaves no stored data — which is
 * both the privacy-respecting arrangement and the one that avoids a queue of
 * half-finished records nobody can act on.
 *
 * VALIDATION GATES THE DIALOG rather than the submit. Opening a checkout and
 * then telling somebody a required field is empty is the worst order to do
 * those two things in: they have committed attention to paying and are sent
 * backwards. So the button reports what is missing and the dialog does not
 * open until nothing is.
 *
 * THE OUTSTANDING LIST IS ALWAYS ON, not only after a failed submit. On a
 * form this long the useful question is "what is left", and answering it only
 * once somebody has already tried and failed makes them hunt for it. The
 * inline red text under a field still waits for a submit, because marking a
 * field the buyer has not reached yet as wrong is just noise.
 *
 * THE PRICE IS NOT MULTIPLIED HERE. Every quantity is its own Whop plan and
 * Whop charges what that plan is configured for. The figure shown comes from
 * the same plan object whose id opens the dialog, so the number read and the
 * number charged have one source rather than two.
 *
 * THE LAYOUT IS NOT IN HERE. The fields and the summary are two wrappers the
 * page positions however it likes — a site may put the summary in a sticky
 * rail beside the worksheet — so this component owns the sequence and the
 * rules, and takes all of its appearance from `cx`.
 */

export interface BriefFormClasses {
  form?: string;
  fields?: string;
  summary?: string;
  summaryHead?: string;
  fieldset?: string;
  fieldsetHalf?: string;
  label?: string;
  labelNum?: string;
  input?: string;
  area?: string;
  select?: string;
  help?: string;
  error?: string;
  qtyRow?: string;
  qtyButton?: string;
  qtyButtonActive?: string;
  lineRow?: string;
  total?: string;
  totalFigure?: string;
  checklist?: string;
  checklistDone?: string;
  checklistTodo?: string;
  checklistOptional?: string;
  submit?: string;
  submitBlocked?: string;
  note?: string;
  uploadZone?: string;
  uploadZoneActive?: string;
  uploadRow?: string;
  uploadButton?: string;
  dialog?: string;
  dialogHead?: string;
  dialogBody?: string;
  dialogClose?: string;
}

interface Props {
  service: Service;
  plans: Plan[];
  returnUrl: string;
  cx?: BriefFormClasses;
}

export default function BriefForm({ service, plans, returnUrl, cx = {} }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<BriefFile[]>([]);
  const [units, setUnits] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [paying, setPaying] = useState(false);

  const plan = plans.find((p) => p.units === units) || plans[0];
  const required = service.brief.fields.filter((f) => f.required);

  const missing = useMemo(
    () => required.filter((f) => !String(values[f.name] || '').trim()).map((f) => f.label),
    [required, values],
  );
  /* A file still in flight is not a reason to block payment — it is a reason
     to wait a moment — but a failed one is, because the buyer would pay
     believing something arrived that did not. */
  const failed = files.filter((f) => f.status === 'error').length;
  const inFlight = files.some((f) => f.status === 'uploading' || f.status === 'pending');
  const attached = files.filter((f) => f.status === 'done').length;
  /* A service whose work cannot start without the file says so here rather
     than discovering it after the money has moved. */
  const needFiles = !!service.brief.attachments.required && attached === 0;
  const blocked = missing.length > 0 || failed > 0 || inFlight || needFiles;

  const set = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));
  const noun = units === 1 ? service.unitNoun : service.unitNounPlural;
  const money = (n: number) => `$${n.toFixed(2)}`;

  return (
    <>
      <form
        className={cx.form}
        onSubmit={(e) => {
          e.preventDefault();
          setShowErrors(true);
          if (blocked) return;
          setPaying(true);
        }}
      >
        <div className={cx.fields}>
          <p className={cx.help}>{service.brief.intro}</p>

          {service.brief.fields.map((f, i) => {
            const bad = showErrors && f.required && !String(values[f.name] || '').trim();
            const id = `brief-${f.name}`;
            const n = String(i + 1).padStart(2, '0');
            return (
              <div key={f.name} className={`${cx.fieldset || ''} ${f.half ? cx.fieldsetHalf || '' : ''}`}>
                <label className={cx.label} htmlFor={id}>
                  <span className={cx.labelNum} aria-hidden="true">{n}</span>
                  {f.label}
                  {f.required ? '' : ' (optional)'}
                </label>

                {f.type === 'area' && (
                  <textarea
                    id={id}
                    className={cx.area}
                    rows={f.half ? 2 : 4}
                    placeholder={f.placeholder}
                    value={values[f.name] || ''}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
                {f.type === 'select' && (
                  <select
                    id={id}
                    className={cx.select}
                    value={values[f.name] || ''}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    <option value="">Choose&hellip;</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
                {f.type === 'text' && (
                  <input
                    id={id}
                    className={cx.input}
                    type="text"
                    placeholder={f.placeholder}
                    value={values[f.name] || ''}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}

                {f.help && <p className={cx.help}>{f.help}</p>}
                {bad && <p className={cx.error}>{f.label} is needed before payment.</p>}
              </div>
            );
          })}

          <div className={cx.fieldset}>
            <span className={cx.label}>
              <span className={cx.labelNum} aria-hidden="true">
                {String(service.brief.fields.length + 1).padStart(2, '0')}
              </span>
              {service.brief.attachments.label}
              {service.brief.attachments.required ? '' : ' (optional)'}
            </span>
            <p className={cx.help}>{service.brief.attachments.help}</p>
            <BriefUpload
              accept={service.brief.attachments.accept}
              maxMb={service.brief.attachments.maxMb}
              maxFiles={service.brief.attachments.maxFiles}
              files={files}
              onChange={setFiles}
              classNames={{
                zone: cx.uploadZone,
                zoneActive: cx.uploadZoneActive,
                row: cx.uploadRow,
                button: cx.uploadButton,
              }}
            />
          </div>
        </div>

        <aside className={cx.summary}>
          <h2 className={cx.summaryHead}>{service.checkoutHeading}</h2>

          <div className={cx.qtyRow}>
            {plans.map((p) => (
              <button
                key={p.units}
                type="button"
                className={`${cx.qtyButton || ''} ${p.units === units ? cx.qtyButtonActive || '' : ''}`}
                aria-pressed={p.units === units}
                aria-label={`${p.units} ${p.units === 1 ? service.unitNoun : service.unitNounPlural}, ${money(p.price)}`}
                onClick={() => setUnits(p.units)}
              >
                {p.units}
              </button>
            ))}
          </div>

          <div className={cx.lineRow}>
            <span>{money(service.unitRate)} per {service.unitNoun}</span>
            <span>&times; {units}</span>
          </div>
          <div className={cx.total}>
            <span>{units} {noun}</span>
            <span className={cx.totalFigure}>{money(plan.price)}</span>
          </div>

          <ul className={cx.checklist}>
            {required.map((f) => {
              const done = !!String(values[f.name] || '').trim();
              return (
                <li key={f.name} className={done ? cx.checklistDone : cx.checklistTodo}>
                  <span aria-hidden="true">{done ? '✓' : '○'}</span> {f.label}
                </li>
              );
            })}
            <li
              className={
                attached > 0
                  ? cx.checklistDone
                  : service.brief.attachments.required
                    ? cx.checklistTodo
                    : cx.checklistOptional
              }
            >
              <span aria-hidden="true">{attached > 0 ? '✓' : '○'}</span>{' '}
              {attached > 0
                ? `${attached} file${attached === 1 ? '' : 's'} attached`
                : service.brief.attachments.required
                  ? 'At least one file'
                  : 'Attachments (optional)'}
            </li>
          </ul>

          <button type="submit" className={`${cx.submit || ''} ${blocked ? cx.submitBlocked || '' : ''}`}>
            Buy now &mdash; {money(plan.price)}
          </button>

          {showErrors && blocked && (
            <p className={cx.error}>
              {missing.length > 0 && `Still needed: ${missing.join(', ')}. `}
              {needFiles && `${service.brief.attachments.requiredNote
                || 'This review is written from the material you attach'} — attach it before paying. `}
              {failed > 0 && `${failed} attachment${failed === 1 ? '' : 's'} did not upload — remove or retry. `}
              {inFlight && 'Waiting for an attachment to finish. '}
            </p>
          )}

          <p className={cx.note}>
            One payment. Nothing recurring, nothing to cancel. {service.turnaround}
          </p>
        </aside>
      </form>

      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        planId={plan.planId}
        returnUrl={returnUrl}
        summary={
          <>
            <strong>{service.name}</strong>
            <br />
            {units} {noun} · {money(plan.price)}
          </>
        }
        classNames={{
          dialog: cx.dialog,
          head: cx.dialogHead,
          body: cx.dialogBody,
          close: cx.dialogClose,
        }}
      />
    </>
  );
}
