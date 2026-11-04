import axios from 'axios';

const API_URL = 'https://mas.phvtech.com/api/Master/sp';

export const execSQL = async (sql) => {
  const { data } = await axios.post(API_URL, { SysID: sql });
  return data;
};

/* Several statements sent as one all-or-nothing request: if any of them fails,
 * or the connection drops partway, none of them takes effect. Saving a sheet in
 * separate batches is what left October's payroll with 100 of its 231 people. */
export const execAtomic = (statements) =>
  execSQL(`SET XACT_ABORT ON; BEGIN TRAN;\n${statements.join('\n')}\nCOMMIT;`);

// Escape string for SQL — wraps in quotes, escapes inner single quotes
export const esc = (v) => {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
};

// Numeric value or NULL
export const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : Number(v));

// Bit (boolean → 1/0)
export const bit = (v) => (v ? 1 : 0);
