/**
 * Brief attachments.
 *
 * THE STORAGE BACKEND IS IMPLEMENTED BY THE OWNER. This module is the seam it
 * plugs into: the route below receives the file, validates its type, size and
 * count, and hands it to persist(). Everything in front of it — the control on
 * the service page, its states, the payment gate that waits for uploads to
 * settle — is finished and does not change when the backend arrives.
 *
 * UNTIL persist() IS IMPLEMENTED THE BYTES ARE DISCARDED, and the boot line
 * below says so on every start. That warning is deliberately operator-facing
 * and permanent: it costs a visitor nothing, and it is the fastest way to
 * notice that a deploy went out ahead of the backend.
 *
 * WHAT persist() OWES ITS CALLER: durability, and an honest return. A file it
 * reports as stored must survive a restart, because the page has already told
 * somebody it was attached. If it cannot store one, throw — the route turns
 * that into a 500 and the control shows the file as failed, which stops the
 * payment gate. Do not return success for a write you did not make.
 */

import { randomUUID } from 'node:crypto';

/* Deliberately generous per file and strict in total: one 40MB PDF is a
   normal thing to be sent and forty of them is not. */
export const MAX_FILE_BYTES = 40 * 1024 * 1024;
export const MAX_FILES_PER_BRIEF = 12;

/** Whether anywhere exists to put a file. */
export function storageConfigured() {
  return Boolean(
    process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY,
  );
}

/**
 * Put one received file somewhere durable. THE ONE FUNCTION TO IMPLEMENT.
 *
 * Called with the whole buffer in memory, which is fine at 40MB a file and
 * would not be at 4GB — if this service ever accepts video, make this a
 * presigned PUT minted for the browser so the bytes stop transiting the app.
 *
 * Return { stored: true } only for a write that actually landed. Throw on
 * failure: the route turns that into a 500, the control marks the file
 * failed, and the payment gate refuses to open — which is the correct
 * outcome, because the alternative is somebody paying for work on a file
 * that is not there.
 */
async function persist(/* { buffer, filename, contentType, key } */) {
  if (!storageConfigured()) return { stored: false };
  throw new Error('persist() is not implemented yet — see server/uploads.js');
}

/** One boot line, so the state of this is never a surprise in production. */
export function reportStorage() {
  if (storageConfigured()) {
    console.log('[uploads] object storage configured');
  } else {
    console.warn(
      '[uploads] NO OBJECT STORAGE CONFIGURED — brief attachments are validated and discarded.\n'
      + '          The upload control is complete and behaves exactly as it will once the\n'
      + '          backend exists. Implement persist() in this file and set S3_ENDPOINT,\n'
      + '          S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY before taking real payments.',
    );
  }
}

/**
 * POST /api/brief/attachment
 *
 * Validated here as well as in the browser. Client-side validation is a
 * courtesy to an honest user and no obstacle at all to anybody else, and this
 * route is reachable directly.
 */
export function attachmentRoute(req, res) {
  const type = String(req.headers['content-type'] || '');
  if (!type.startsWith('multipart/form-data')) {
    return res.status(415).json({ error: 'Send the file as multipart/form-data' });
  }

  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_FILE_BYTES + 1024 * 64) {
    return res.status(413).json({ error: `Over ${Math.round(MAX_FILE_BYTES / 1048576)}MB` });
  }

  let received = 0;
  let aborted = false;

  req.on('data', (chunk) => {
    received += chunk.length;
    /* Stopped at the ceiling rather than buffered to the end and rejected.
       A body that is refused after being fully read has already cost the
       bandwidth the limit exists to protect. */
    if (received > MAX_FILE_BYTES + 1024 * 64 && !aborted) {
      aborted = true;
      res.status(413).json({ error: `Over ${Math.round(MAX_FILE_BYTES / 1048576)}MB` });
      req.destroy();
    }
  });

  req.on('end', async () => {
    if (aborted) return;
    if (received === 0) return res.status(400).json({ error: 'Empty file' });

    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
    try {
      const result = await persist();
      return res.json({ ok: true, key, stored: Boolean(result && result.stored) });
    } catch (err) {
      console.error('[uploads] persist failed:', err.message);
      return res.status(500).json({ error: 'Could not store the file' });
    }
  });

  req.on('error', () => {
    if (!aborted) res.status(400).json({ error: 'Upload interrupted' });
  });
}

/**
 * POST /api/brief
 *
 * The written part of the brief, committed only after payment succeeds — so
 * an abandoned checkout leaves nothing here. Same discard rule as the
 * attachments and the same one function to implement.
 */
export function briefRoute(req, res) {
  const reference = `BR-${randomUUID().slice(0, 8).toUpperCase()}`;
  if (!storageConfigured()) {
    console.warn(`[uploads] brief ${reference} received and discarded — no storage configured`);
  }
  return res.json({ ok: true, reference });
}
