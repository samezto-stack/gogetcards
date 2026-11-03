import { useCallback, useRef, useState } from 'react';

/**
 * The attachment control on a service page.
 *
 * WHAT HAPPENS TO THE BYTES. They go to server/uploads.js, which validates
 * them and hands them to persist(). The storage backend behind persist() is
 * the owner's; until it exists the bytes are discarded and the server says so
 * on every boot. Nothing in this file changes when it arrives.
 *
 * The validation here is real regardless — type, size and count are checked
 * in the browser and again on the server, because a control that accepts a
 * 900MB video and fails silently at the far end is worse than one that
 * refuses it immediately.
 */

export interface BriefFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  /** Extensions the service actually reads, e.g. ['.pdf', '.xlsx']. */
  accept: string[];
  /** Per-file ceiling in megabytes. */
  maxMb: number;
  /** How many files this brief may carry. */
  maxFiles: number;
  files: BriefFile[];
  onChange: (files: BriefFile[]) => void;
  /** Styling hook — every site dresses this differently. */
  classNames?: {
    zone?: string;
    zoneActive?: string;
    row?: string;
    button?: string;
  };
}

const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;

export default function BriefUpload({ accept, maxMb, maxFiles, files, onChange, classNames = {} }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxBytes = maxMb * 1024 * 1024;

  const reject = useCallback(
    (file: File): string | null => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (accept.length && !accept.includes(ext)) return `${ext || 'That type'} is not read for this service`;
      if (file.size > maxBytes) return `Over ${maxMb}MB`;
      if (file.size === 0) return 'Empty file';
      return null;
    },
    [accept, maxBytes, maxMb],
  );

  const add = useCallback(
    async (incoming: FileList | null) => {
      if (!incoming || !incoming.length) return;
      const room = maxFiles - files.length;
      const taking = Array.from(incoming).slice(0, Math.max(0, room));

      /* Queued first, then sent one at a time. Showing every file as
         "uploading" simultaneously implies parallelism that is not
         happening and makes a stall impossible to attribute. */
      const queued: BriefFile[] = taking.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        status: reject(f) ? 'error' : 'pending',
        error: reject(f) || undefined,
      }));

      let current = [...files, ...queued];
      onChange(current);

      for (let i = 0; i < taking.length; i += 1) {
        const meta = queued[i];
        if (meta.status === 'error') continue;

        current = current.map((f) => (f.id === meta.id ? { ...f, status: 'uploading' } : f));
        onChange(current);

        try {
          const body = new FormData();
          body.append('file', taking[i]);
          const res = await fetch('/api/brief/attachment', { method: 'POST', body });
          const ok = res.ok;
          const detail = ok ? null : ((await res.json().catch(() => ({}))) as { error?: string }).error;
          current = current.map((f) =>
            f.id === meta.id
              ? { ...f, status: ok ? 'done' : 'error', error: ok ? undefined : detail || 'Upload failed' }
              : f,
          );
        } catch {
          current = current.map((f) =>
            f.id === meta.id ? { ...f, status: 'error', error: 'Upload failed — check your connection' } : f,
          );
        }
        onChange(current);
      }
    },
    [files, maxFiles, onChange, reject],
  );

  const full = files.length >= maxFiles;

  return (
    <div>
      <div
        className={`${classNames.zone || ''} ${dragging ? classNames.zoneActive || '' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!full) void add(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept.join(',')}
          className="sr-only"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
        {/* Button and hint share a line. Stacked, the zone was the tallest
            block on the page for the least information on it. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            className={classNames.button || ''}
            disabled={full}
            onClick={() => inputRef.current?.click()}
          >
            {full ? `Limit of ${maxFiles} reached` : 'Choose files'}
          </button>
          <p className="text-[11.5px] opacity-70 leading-snug min-w-0">
            {accept.length ? accept.join(' · ') : 'Any file'} — up to {maxMb}MB each, {maxFiles} max.
            Or drop them here.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-1">
          {files.map((f) => (
            <li key={f.id} className={classNames.row || ''}>
              <span className="truncate">{f.name}</span>
              <span className="flex items-center gap-3 flex-shrink-0 tabular-nums">
                <span className="opacity-60">{bytes(f.size)}</span>
                <span aria-live="polite">
                  {f.status === 'pending' && 'queued'}
                  {f.status === 'uploading' && 'sending…'}
                  {f.status === 'done' && 'attached'}
                  {f.status === 'error' && (f.error || 'failed')}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  className="opacity-60 hover:opacity-100"
                  onClick={() => onChange(files.filter((x) => x.id !== f.id))}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
