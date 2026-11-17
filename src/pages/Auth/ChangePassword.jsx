import { useState } from "react";
import { HiCheck } from "react-icons/hi";
import { useAuth } from "../../auth/AuthContext";
import { notify } from "../../ui/feedback";
import { AuthShell, Field, PasswordInput, SubmitButton, FormError } from "./AuthShell";

const DEFAULT_PASSWORD = "123456";

function rules(next, confirm, current, username) {
  return [
    { ok: next.length >= 8, text: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(next) && /\d/.test(next), text: "Letters and numbers" },
    { ok: next.length > 0 && next !== DEFAULT_PASSWORD && next !== current && !(username && next.toLowerCase().includes(username.toLowerCase())),
      text: "Not the old password or your username" },
    { ok: next.length > 0 && next === confirm, text: "Both new passwords match" },
  ];
}

/** The form itself - used on the first-sign-in screen and from the account menu. */
export function ChangePasswordForm({ forced = false, onDone, onCancel }) {
  const { user, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);

  const checks = rules(next, confirm, current, user?.username);
  const ready = current && checks.every((c) => c.ok);

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (!current) { setError("Enter your current password."); return; }
    if (!ready) { setError("The new password doesn't meet the rules below yet."); return; }
    setBusy(true); setError("");
    try {
      await changePassword(current, next);
      notify.success("Your password has been changed.");
      onDone?.();
    } catch (err) {
      setError(err.userMessage || "Could not change the password.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError>{error}</FormError>
      <Field id="cp-current" label={forced ? "Temporary password" : "Current password"}>
        <PasswordInput id="cp-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus disabled={busy} />
      </Field>
      <Field id="cp-new" label="New password">
        <PasswordInput id="cp-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" disabled={busy} />
      </Field>
      <Field id="cp-confirm" label="Type the new password again">
        <PasswordInput id="cp-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" disabled={busy} />
      </Field>

      <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2" aria-label="Password rules">
        {checks.map((c) => (
          <li key={c.text} className={`flex items-center gap-2 ${c.ok ? "text-emerald-700 dark:text-emerald-400" : tried ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
            <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${c.ok ? "border-emerald-600 bg-emerald-600 text-white" : "border-current"}`}>
              {c.ok && <HiCheck className="h-3 w-3" />}
            </span>
            {c.text}
          </li>
        ))}
      </ul>

      <SubmitButton busy={busy} busyText="Saving…">{forced ? "Set password and continue" : "Change password"}</SubmitButton>
      {forced ? (
        <button type="button" onClick={logout} className="text-sm text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline dark:hover:text-gray-200">
          Sign out instead
        </button>
      ) : onCancel && (
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
      )}
    </form>
  );
}

/** Shown straight after signing in with a new or reset (default) password. */
export default function ForcedPasswordChange() {
  const { user } = useAuth();
  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Choose your password</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Welcome{user?.displayName ? `, ${user.displayName}` : ""}. You signed in with a temporary password — set your own before continuing.
      </p>
      <div className="mt-6"><ChangePasswordForm forced /></div>
    </AuthShell>
  );
}

/** From the account menu. */
export function ChangePasswordModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="fb-fade absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="cp-title"
        className="fb-pop relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h2 id="cp-title" className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Change password</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Other devices signed in to your account will be signed out.</p>
        <ChangePasswordForm onDone={onClose} onCancel={onClose} />
      </div>
    </div>
  );
}
