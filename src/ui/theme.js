import { useState } from "react";

/* Light or dark, as chosen in the account menu. Remembered on this PC; dark until
 * someone chooses. "system" follows the computer's own setting.
 * public/index.html applies the saved choice before the page is drawn - keep the two in step. */
const KEY = "ais.theme";
export const DEFAULT_THEME = "dark";
export const THEMES = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "System"],
];

const systemDark = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function getTheme() {
  try { return localStorage.getItem(KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

function apply(theme) {
  const dark = theme === "system" ? !!systemDark?.matches : theme !== "light";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

// "System" keeps following the computer while the app is open
systemDark?.addEventListener?.("change", () => { if (getTheme() === "system") apply("system"); });

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* private mode: this visit only */ }
  apply(theme);
}

export function useTheme() {
  const [theme, set] = useState(getTheme);
  return [theme, (t) => { setTheme(t); set(t); }];
}
