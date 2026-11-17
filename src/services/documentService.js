import { execSQL, esc, num } from './api';

/* ------------------------------------------------------------------
 * Payroll files - Excel sheets and the like prepared before the system,
 * kept for reference (Nadee, 5 Nov). Stored as they are, never read in:
 * the file goes to the InterServer file store, a row in payroll_document
 * says what it is. The store has no login, so the folder name and each
 * stored file name carry random parts that cannot be guessed; it has no
 * delete either, so removing a file only takes it off the list.
 * ------------------------------------------------------------------ */

const STORE  = 'https://folder.phvtech.com/api/directory';
const FOLDER = 'ais-payroll-docs-9907dd6bf745ab10';
const SP     = 'dbo.payroll_document_sp';

export const MAX_BYTES = 25 * 1024 * 1024;

export const fileUrl = (storedName) =>
  `${STORE}/${FOLDER}/files/${encodeURIComponent(storedName)}`;

// the database server keeps US Pacific time; shown here in Colombo time (UTC+5:30)
export const fetchDocuments = () =>
  execSQL(`SELECT id, title, periodMonth, category, fileName, storedName, sizeBytes, notes,
                  CONVERT(varchar(16), DATEADD(MINUTE, 330 - DATEDIFF(MINUTE, GETUTCDATE(), GETDATE()), uploadedAt), 120) AS uploadedAt
           FROM dbo.payroll_document WHERE status = 'Active'
           ORDER BY ISNULL(periodMonth, '0000-00') DESC, uploadedAt DESC`);

const randomPart = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

// the original name, made safe for a URL, behind a random prefix
const storedNameFor = (name) =>
  `${randomPart()}_${String(name).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(-150)}`;

/* Upload first, record second: a record is only written for a file the store
 * confirmed, so the list never points at something that is not there. */
export const uploadDocument = async (file, meta) => {
  const storedName = storedNameFor(file.name);
  const body = new FormData();
  body.append('files', file, storedName);
  const res = await fetch(`${STORE}/${FOLDER}/upload`, { method: 'POST', body });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const out = await res.json().catch(() => ({}));
  const saved = (out.uploadedFiles || [])[0];
  if (!saved) throw new Error('The file store did not confirm the upload');
  await execSQL(
    `EXEC ${SP} @action='INSERT',@title=${esc(meta.title || file.name)},@periodMonth=${esc(meta.periodMonth)},` +
    `@category=${esc(meta.category)},@fileName=${esc(file.name)},@storedName=${esc(saved)},` +
    `@sizeBytes=${num(file.size)},@notes=${esc(meta.notes)}`
  );
  return saved;
};

export const updateDocument = (id, meta) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${num(id)},@title=${esc(meta.title)},@periodMonth=${esc(meta.periodMonth)},` +
    `@category=${esc(meta.category)},@notes=${esc(meta.notes)}`
  );

export const hideDocument = (id) => execSQL(`EXEC ${SP} @action='HIDE',@id=${num(id)}`);
