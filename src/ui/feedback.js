/* Toasts and dialogs that can be raised from anywhere - a page, a service, the API layer -
 * without a hook. <FeedbackHost/> (mounted once in App) draws them.
 *
 *   notify.success("Saved")                     floating message, goes by itself
 *   if (!(await confirmDialog({...}))) return;  in-app replacement for window.confirm
 *   const v = await promptDialog({...});        in-app replacement for window.prompt
 */

const listeners = new Set();
const emit = (event) => listeners.forEach((fn) => fn(event));
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let seq = 0;
let lastToast = { message: "", at: 0 };
const toast = (tone, message, opts = {}) => {
  if (!message) return;
  // the API layer and the page can both report the same failure - show it once
  if (message === lastToast.message && Date.now() - lastToast.at < 2000) return;
  lastToast = { message, at: Date.now() };
  emit({ type: "toast", toast: { id: ++seq, tone, message, title: opts.title, duration: opts.duration ?? (tone === "error" ? 7000 : 4500) } });
};

export const notify = {
  success: (message, opts) => toast("success", message, opts),
  error:   (message, opts) => toast("error", message, opts),
  info:    (message, opts) => toast("info", message, opts),
  warning: (message, opts) => toast("warning", message, opts),
};

/**
 * @param {{title: string, message?: string|React.ReactNode, confirmLabel?: string,
 *          cancelLabel?: string, tone?: "danger"|"primary"}} opts
 * @returns {Promise<boolean>}
 */
export const confirmDialog = (opts) =>
  new Promise((resolve) => emit({ type: "dialog", dialog: { kind: "confirm", id: ++seq, ...opts, resolve } }));

/**
 * @param {{title: string, message?: string, label?: string, initial?: string, inputMode?: string,
 *          confirmLabel?: string, validate?: (v: string) => string|null}} opts
 * @returns {Promise<string|null>} the value, or null when cancelled
 */
export const promptDialog = (opts) =>
  new Promise((resolve) => emit({ type: "dialog", dialog: { kind: "prompt", id: ++seq, ...opts, resolve } }));
