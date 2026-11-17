import { useEffect, useRef, useState } from "react";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiExclamation, HiX } from "react-icons/hi";
import { subscribe } from "./feedback";

const TONES = {
  success: { icon: HiCheckCircle,       bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  error:   { icon: HiExclamationCircle, bar: "bg-red-500",     text: "text-red-600 dark:text-red-400" },
  warning: { icon: HiExclamation,       bar: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" },
  info:    { icon: HiInformationCircle, bar: "bg-slate-500",   text: "text-slate-600 dark:text-slate-300" },
};

function Toast({ toast, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.icon;

  const close = () => { setLeaving(true); setTimeout(onClose, 160); };
  const start = () => { timer.current = setTimeout(close, toast.duration); };
  const stop  = () => clearTimeout(timer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { start(); return stop; }, []);

  return (
    <div role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={stop} onMouseLeave={start}
      className={`pointer-events-auto relative flex w-[22rem] max-w-[calc(100vw-2rem)] gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white py-3 pl-4 pr-3 shadow-lg shadow-gray-900/5 dark:border-gray-700 dark:bg-gray-800 ${leaving ? "fb-out" : "fb-in"}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tone.text}`} />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold text-gray-900 dark:text-white">{toast.title}</p>}
        <p className="text-sm leading-snug text-gray-700 dark:text-gray-300">{toast.message}</p>
      </div>
      <button type="button" onClick={close} aria-label="Dismiss"
        className="-mr-1 -mt-1 h-7 w-7 flex-shrink-0 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
        <HiX className="mx-auto h-4 w-4" />
      </button>
    </div>
  );
}

function Dialog({ dialog, onDone }) {
  const [value, setValue] = useState(dialog.initial ?? "");
  const [problem, setProblem] = useState("");
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const inputRef = useRef(null);
  const danger = dialog.tone === "danger";

  useEffect(() => {
    // destructive actions start on Cancel, so a stray Enter does no harm
    const el = dialog.kind === "prompt" ? inputRef.current : danger ? cancelRef.current : confirmRef.current;
    el?.focus();
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); finish(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (ok) => {
    if (dialog.kind === "prompt") {
      if (!ok) return onDone(null);
      const p = dialog.validate?.(value);
      if (p) { setProblem(p); inputRef.current?.focus(); return; }
      return onDone(value);
    }
    onDone(ok);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="fb-fade absolute inset-0 bg-gray-900/40" onClick={() => finish(false)} />
      <form role="dialog" aria-modal="true" aria-labelledby={`dlg-${dialog.id}`}
        onSubmit={(e) => { e.preventDefault(); finish(true); }}
        className="fb-pop relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="px-6 pb-4 pt-5">
          <h2 id={`dlg-${dialog.id}`} className="text-base font-semibold text-gray-900 dark:text-white">{dialog.title}</h2>
          {dialog.message && <div className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{dialog.message}</div>}
          {dialog.kind === "prompt" && (
            <div className="mt-4">
              {dialog.label && <label htmlFor={`dlg-in-${dialog.id}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">{dialog.label}</label>}
              <input id={`dlg-in-${dialog.id}`} ref={inputRef} value={value} inputMode={dialog.inputMode}
                onChange={(e) => { setValue(e.target.value); setProblem(""); }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white ${problem ? "border-red-400 focus:ring-red-500/30" : "border-gray-300 focus:border-purple-500 focus:ring-purple-500/30 dark:border-gray-600"}`} />
              {problem && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{problem}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl border-t border-gray-100 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800/60">
          <button ref={cancelRef} type="button" onClick={() => finish(false)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            {dialog.cancelLabel || "Cancel"}
          </button>
          <button ref={confirmRef} type="submit"
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 ${danger ? "bg-red-600 hover:bg-red-700 focus:ring-red-500/40" : "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/40"}`}>
            {dialog.confirmLabel || (danger ? "Delete" : "Continue")}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Mounted once. Draws every toast and dialog raised through ./feedback. */
export default function FeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [dialogs, setDialogs] = useState([]);

  useEffect(() => subscribe((e) => {
    if (e.type === "toast") setToasts((t) => [...t.slice(-3), e.toast]);
    if (e.type === "dialog") setDialogs((d) => [...d, e.dialog]);
  }), []);

  const current = dialogs[0];
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 print:hidden">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => setToasts((all) => all.filter((x) => x.id !== t.id))} />
        ))}
      </div>
      {current && (
        <Dialog key={current.id} dialog={current}
          onDone={(result) => { current.resolve(result); setDialogs((d) => d.slice(1)); }} />
      )}
    </>
  );
}
