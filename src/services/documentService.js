import { execSQL, esc, num, http } from './api';

/* ------------------------------------------------------------------
 * Payroll files - Excel sheets and the like prepared before the system,
 * kept for reference (Nadee, 5 Nov). Stored as they are, never read in:
 * the file goes to the InterServer file store through the payroll API, a row
 * in payroll_document says what it is. The store's folder is known only to
 * the API, which also checks the person's role before handing a file over.
 * The store has no delete, so removing a file only takes it off the list.
 * ------------------------------------------------------------------ */

const SP = 'dbo.payroll_document_sp';

export const MAX_BYTES = 25 * 1024 * 1024;

// the database server keeps US Pacific time; shown here in Colombo time (UTC+5:30)
export const fetchDocuments = () =>
  execSQL(`SELECT id, title, periodMonth, category, fileName, storedName, sizeBytes, notes,
                  CONVERT(varchar(16), DATEADD(MINUTE, 330 - DATEDIFF(MINUTE, GETUTCDATE(), GETDATE()), uploadedAt), 120) AS uploadedAt
           FROM dbo.payroll_document WHERE status = 'Active'
           ORDER BY ISNULL(periodMonth, '0000-00') DESC, uploadedAt DESC`);

/* Upload first, record second: a record is only written for a file the store
 * confirmed, so the list never points at something that is not there. */
export const uploadDocument = async (file, meta) => {
  const body = new FormData();
  body.append('file', file, file.name);
  const { data } = await http.post('/api/files', body);
  await execSQL(
    `EXEC ${SP} @action='INSERT',@title=${esc(meta.title || file.name)},@periodMonth=${esc(meta.periodMonth)},` +
    `@category=${esc(meta.category)},@fileName=${esc(file.name)},@storedName=${esc(data.storedName)},` +
    `@sizeBytes=${num(file.size)},@notes=${esc(meta.notes)}`
  );
  return data.storedName;
};

/* Fetched with the person's sign-in, then opened or saved from memory. */
export const openDocument = async (d) => {
  const res = await http.get(`/api/files/${encodeURIComponent(d.storedName)}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const viewable = /\.(pdf|png|jpe?g|txt)$/i.test(d.fileName || '');
  if (!viewable || !window.open(url, '_blank')) {
    const a = document.createElement('a');
    a.href = url; a.download = d.fileName || d.storedName;
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const updateDocument = (id, meta) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${num(id)},@title=${esc(meta.title)},@periodMonth=${esc(meta.periodMonth)},` +
    `@category=${esc(meta.category)},@notes=${esc(meta.notes)}`
  );

export const hideDocument = (id) => execSQL(`EXEC ${SP} @action='HIDE',@id=${num(id)}`);
