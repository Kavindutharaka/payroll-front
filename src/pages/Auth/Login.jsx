import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { AuthShell, Field, TextInput, PasswordInput, SubmitButton, FormError } from "./AuthShell";

export default function Login() {
  const { login, notice } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) { setError("Enter your username and password."); return; }
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.userMessage || "Could not sign in. Please try again.");
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Sign in</h2>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Use the username given to you by the payroll administrator.</p>

      {notice && !error && (
        <p className="mt-6 rounded-lg bg-gray-100 px-3.5 py-2.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{notice}</p>
      )}

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <FormError>{error}</FormError>
        <Field id="username" label="Username">
          <TextInput id="username" value={username} onChange={(e) => setUsername(e.target.value)}
            autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus disabled={busy} />
        </Field>
        <Field id="password" label="Password">
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </Field>
        <SubmitButton busy={busy} busyText="Signing in…">Sign in</SubmitButton>
      </form>

      <p className="mt-8 border-t border-gray-100 pt-5 text-sm leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Forgotten your password? Ask the payroll administrator to reset it. You'll choose a new one when you next sign in.
      </p>
    </AuthShell>
  );
}
