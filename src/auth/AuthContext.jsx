import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http, tokenStore, authEvents, clearReadCache } from "../services/api";

const AuthContext = createContext(null);

const IDLE_MINUTES = 40;        // signed out after this long with no mouse or keyboard
const WARN_SECONDS = 60;        // ...after a minute's warning

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? "loading" : "signedOut"));
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const endSession = useCallback((message = "") => {
    tokenStore.clear();
    clearReadCache();   // the next person must not be answered from this one's data
    setUser(null);
    setStatus("signedOut");
    setNotice(message);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await http.get("/api/auth/me");
      setUser(data.user);
      setStatus("signedIn");
    } catch (e) {
      endSession(e.response ? "" : e.userMessage);
    }
  }, [endSession]);

  useEffect(() => { if (tokenStore.get()) refresh(); }, [refresh]);

  useEffect(() => {
    const ended = (e) => { if (tokenStore.get()) endSession(e.detail || "Your session has ended. Please sign in again."); };
    const mustChange = () => setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
    authEvents.addEventListener("session-ended", ended);
    authEvents.addEventListener("password-change-required", mustChange);
    return () => {
      authEvents.removeEventListener("session-ended", ended);
      authEvents.removeEventListener("password-change-required", mustChange);
    };
  }, [endSession]);

  const login = useCallback(async (username, password) => {
    const { data } = await http.post("/api/auth/login", { username, password });
    tokenStore.set(data.token);
    clearReadCache();
    setNotice("");
    setUser(data.user);
    setStatus("signedIn");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await http.post("/api/auth/logout"); } catch { /* signing out regardless */ }
    endSession("You have signed out.");
    navigate("/", { replace: true });
  }, [endSession, navigate]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await http.post("/api/auth/change-password", { currentPassword, newPassword });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const can = useCallback((perm) => !!user && (user.isAdmin || user.permissions?.includes(perm)), [user]);

  const value = useMemo(
    () => ({ user, status, notice, login, logout, changePassword, can, refresh }),
    [user, status, notice, login, logout, changePassword, can, refresh]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {status === "signedIn" && <IdleGuard onTimeout={() => endSession(`You were signed out after ${IDLE_MINUTES} minutes without activity.`)} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** `can("employees.edit")` - true for administrators and roles that include it. */
export const useCan = () => {
  const ctx = useContext(AuthContext);
  return ctx?.can ?? (() => true);
};

/* Signs a forgotten, unattended session out - this is payroll data on an office PC. */
function IdleGuard({ onTimeout }) {
  const [warning, setWarning] = useState(false);
  const [left, setLeft] = useState(WARN_SECONDS);
  const last = useRef(Date.now());
  const warningRef = useRef(false);

  useEffect(() => {
    const touch = () => { if (!warningRef.current) last.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const tick = setInterval(() => {
      const idle = (Date.now() - last.current) / 1000;
      const warnAt = IDLE_MINUTES * 60 - WARN_SECONDS;
      if (idle >= IDLE_MINUTES * 60) { clearInterval(tick); onTimeout(); return; }
      if (idle >= warnAt) {
        warningRef.current = true;
        setWarning(true);
        setLeft(Math.max(0, Math.ceil(IDLE_MINUTES * 60 - idle)));
      }
    }, 1000);
    return () => { clearInterval(tick); events.forEach((e) => window.removeEventListener(e, touch)); };
  }, [onTimeout]);

  if (!warning) return null;
  const stay = () => { last.current = Date.now(); warningRef.current = false; setWarning(false); };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="fb-fade absolute inset-0 bg-gray-900/40" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title"
        className="fb-pop relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h2 id="idle-title" className="text-base font-semibold text-gray-900 dark:text-white">Are you still there?</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          For security you'll be signed out in <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{left}</span> second{left === 1 ? "" : "s"}.
          Anything not saved will be lost.
        </p>
        <div className="mt-5 flex justify-end">
          <button autoFocus type="button" onClick={stay}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
