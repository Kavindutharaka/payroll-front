import axios from 'axios';

const API_URL = 'https://mas.phvtech.com/api/Master/sp';

export const execSQL = async (sql) => {
  const { data } = await axios.post(API_URL, { SysID: sql });
  return data;
};

// Escape string for SQL — wraps in quotes, escapes inner single quotes
export const esc = (v) => {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
};

// Numeric value or NULL
export const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : Number(v));

// Bit (boolean → 1/0)
export const bit = (v) => (v ? 1 : 0);
