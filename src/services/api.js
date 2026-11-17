import axios from 'axios';
import { notify } from '../ui/feedback';

/* Every request goes to the payroll API (backend/PayrollApi), which checks who is signed in
 * and what their role allows before anything reaches the database. Set the address with
 * REACT_APP_API_BASE in .env.development / .env.production. */
export const API_BASE = (process.env.REACT_APP_API_BASE || 'http://localhost:5080').replace(/\/+$/, '');

// The session lives in this browser tab only: closing the browser signs the person out.
const TOKEN_KEY = 'ais-payroll.token';
export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

/* "session-ended" and "password-change-required" are picked up by the AuthProvider. */
export const authEvents = new EventTarget();

export const http = axios.create({ baseURL: API_BASE, timeout: 180000 });

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const body = err.response?.data || {};
    err.userMessage =
      body.error ||
      (err.code === 'ECONNABORTED' ? 'The server took too long to answer. Please try again.'
        : !err.response ? "Can't reach the payroll server. Check the internet connection and try again."
        : 'Something went wrong. Please try again.');
    err.reason = body.code;

    const isLogin = String(err.config?.url || '').includes('/api/auth/login');
    if (status === 401 && !isLogin) authEvents.dispatchEvent(new CustomEvent('session-ended', { detail: err.userMessage }));
    else if (status === 403 && body.code === 'password_change_required') authEvents.dispatchEvent(new Event('password-change-required'));
    else if ((status === 403 && body.code === 'forbidden') || body.code === 'refused') notify.error(err.userMessage, { title: 'Not allowed' });
    else if (status === 429) notify.warning(err.userMessage);
    return Promise.reject(err);
  }
);

export const execSQL = async (sql) => {
  const { data } = await http.post('/api/sql', { SysID: sql });
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
