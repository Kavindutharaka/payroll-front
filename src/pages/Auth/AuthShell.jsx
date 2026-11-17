import { useState } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi";

export const NAVY = "#29166F";   // from the school crest
export const GOLD = "#F3DD00";

/* The frame around the sign-in and new-password screens: the school's crest and colours on
 * the left (desktop), the form on the right. */
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden px-12 py-12 text-white lg:flex"
        style={{ backgroundColor: NAVY }}>
        {/* the crest's globe lines, very faint */}
        <svg aria-hidden="true" className="pointer-events-none absolute -right-40 top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 opacity-[0.07]" viewBox="0 0 200 200" fill="none" stroke="white" strokeWidth="0.8">
          <circle cx="100" cy="100" r="96" />
          <ellipse cx="100" cy="100" rx="40" ry="96" />
          <ellipse cx="100" cy="100" rx="72" ry="96" />
          <line x1="100" y1="4" x2="100" y2="196" />
          <path d="M8 70h184M4 100h192M8 130h184M26 42h148M26 158h148" />
        </svg>

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <img src="/ais-logo.jpg" alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">Asian International School</p>
            <p className="text-sm text-white/70">Colombo</p>
          </div>
        </div>

        <div className="relative">
          <span className="mb-5 block h-1 w-12 rounded-full" style={{ backgroundColor: GOLD }} />
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Payroll</h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-white/75">
            Salaries, statutory returns, increments and bonuses for academic and administrative staff.
          </p>
        </div>

        <p className="relative text-xs leading-relaxed text-white/55">
          For authorised staff only. Sign-ins and changes on this system are recorded.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/ais-logo.jpg" alt="" className="h-12 w-12 rounded-lg bg-white object-contain" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Asian International School</p>
              <p className="text-xs text-gray-500">Payroll</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] text-gray-900 shadow-sm " +
  "placeholder:text-gray-400 focus:border-[#29166F] focus:outline-none focus:ring-2 focus:ring-[#29166F]/20 " +
  "disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400";

export function Field({ id, label, hint, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        {hint}
      </div>
      {children}
    </div>
  );
}

export function TextInput(props) {
  return <input {...props} className={inputCls} />;
}

/** Password box with show / hide and a Caps Lock warning. */
export function PasswordInput({ id, value, onChange, autoComplete = "current-password", autoFocus, disabled }) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e) => setCaps(!!e.getModifierState?.("CapsLock"));
  return (
    <div>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} value={value} onChange={onChange}
          onKeyUp={checkCaps} onKeyDown={checkCaps} onBlur={() => setCaps(false)}
          autoComplete={autoComplete} autoFocus={autoFocus} disabled={disabled}
          spellCheck={false} className={`${inputCls} pr-11`} />
        <button type="button" onClick={() => setShown((s) => !s)} tabIndex={-1}
          aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          {shown ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
        </button>
      </div>
      {caps && <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">Caps Lock is on</p>}
    </div>
  );
}

export function SubmitButton({ busy, children, busyText }) {
  return (
    <button type="submit" disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-medium text-white shadow-sm transition-colors hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#29166F]/40 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-80 dark:focus:ring-offset-gray-900"
      style={{ backgroundColor: NAVY }}>
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {busy ? busyText : children}
    </button>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      {children}
    </div>
  );
}
