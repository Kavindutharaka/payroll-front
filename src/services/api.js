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

/* ---------------------------------------------------------------------------------
 * Read cache. Moving between screens used to fetch the same employees, components and
 * runs again every time - each fetch is a round trip to the server. Now:
 *  - the same read asked for twice at once goes to the server once;
 *  - a read answered in the last READ_TTL seconds is answered from memory;
 *  - any change made from this browser empties the cache (before and after it runs),
 *    so a screen never shows its own edit missing.
 * Changes made by someone else on another PC show up within READ_TTL seconds; the
 * calculations that must use live figures run inside freshReads(). */
const READ_TTL = 30_000;
const CACHE_MAX = 200;
const cache = new Map();      // sql -> { at, data }
const inflight = new Map();   // sql -> Promise
let generation = 0;           // bumped by every change; older answers aren't kept
let freshDepth = 0;

// The two read-only procedures; every other EXEC changes something
const READ_PROCS = /\bEXEC(?:UTE)?\s+(?:dbo\.)?payroll_(?:period_employees|increment_for_month)_sp\b/gi;
const WRITES = /\b(?:INSERT|UPDATE|DELETE|MERGE|EXEC|EXECUTE|TRUNCATE|TRAN|TRANSACTION)\b/i;
const isWrite = (sql) => WRITES.test(sql.replace(READ_PROCS, ''));

const copy = (d) => (d && typeof d === 'object' ? structuredClone(d) : d);

export const clearReadCache = () => { generation += 1; cache.clear(); inflight.clear(); };

/** Run `work` with every read going to the server - for calculations. */
export const freshReads = async (work) => {
  freshDepth += 1;
  try { return await work(); } finally { freshDepth -= 1; }
};

const post = async (sql) => (await http.post('/api/sql', { SysID: sql })).data;

export const execSQL = async (sql) => {
  if (isWrite(sql)) {
    clearReadCache();
    try { return await post(sql); } finally { clearReadCache(); }
  }
  if (freshDepth === 0) {
    const hit = cache.get(sql);
    if (hit && Date.now() - hit.at < READ_TTL) return copy(hit.data);
  }
  let p = inflight.get(sql);
  if (!p) {
    const gen = generation;
    p = post(sql).then((data) => {
      if (gen === generation) {
        cache.delete(sql);
        cache.set(sql, { at: Date.now(), data });
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
      }
      return data;
    }).finally(() => { if (inflight.get(sql) === p) inflight.delete(sql); });
    inflight.set(sql, p);
  }
  return copy(await p);
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
