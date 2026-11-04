/**
 * EmployeePicker — type-to-search employee field.
 *
 * A plain <select> of 231 people is unusable when you know the ID but not where
 * the name sorts, so this searches name and ID together the way the Payslip and
 * Employee screens already do. Value in and out is the emp_id, so it drops into
 * a form wherever a select used to be.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { HiSearch, HiX } from "react-icons/hi";

/* The payslip's name - "Mrs.S.R Fernando" - so a loan or a report never shows
 * the same person differently. First names are still searchable. */
const fullName = (e) => {
  const salutation = [e.initial, e.initials].filter(Boolean).join("").replace(/\s+/g, "");
  return [salutation, e.surName].filter(Boolean).join(" ").trim() || e.firstName || "";
};

export default function EmployeePicker({
  employees = [], value, onChange, id = "employee", disabled, placeholder = "Search by name or EPF number…",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);

  const selected = useMemo(
    () => employees.find((e) => String(e.emp_id) === String(value)) || null,
    [employees, value]
  );

  // clicking anywhere else closes the list without changing the selection
  useEffect(() => {
    const away = (ev) => { if (box.current && !box.current.contains(ev.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? employees.filter((e) =>
          fullName(e).toLowerCase().includes(q) || String(e.firstName || "").toLowerCase().includes(q) ||
          String(e.emp_id).toLowerCase().includes(q))
      : employees;
    return pool.slice(0, 50);
  }, [employees, query]);

  useEffect(() => { setActive(0); }, [query]);

  const pick = (e) => {
    onChange?.({ target: { value: String(e.emp_id), id } });
    setQuery(""); setOpen(false);
  };

  const clear = () => {
    onChange?.({ target: { value: "", id } });
    setQuery(""); setOpen(false);
  };

  const onKeyDown = (ev) => {
    if (!open && (ev.key === "ArrowDown" || ev.key === "Enter")) { setOpen(true); return; }
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (ev.key === "Enter" && matches[active]) { ev.preventDefault(); pick(matches[active]); }
    else if (ev.key === "Escape") { setOpen(false); }
  };

  const field =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm " +
    "text-gray-800 placeholder-gray-400 shadow-sm transition-colors " +
    "focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 " +
    "disabled:cursor-not-allowed disabled:opacity-60 " +
    "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 " +
    "dark:placeholder-gray-500 dark:focus:border-purple-400";

  return (
    <div className="relative" ref={box}>
      {selected ? (
        <div className={`${field} flex items-center justify-between gap-2`}>
          <span className="min-w-0 truncate">
            <span className="font-medium">{fullName(selected)}</span>
            <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {selected.emp_id}
            </span>
          </span>
          {!disabled && (
            <button type="button" onClick={clear} aria-label="Clear employee"
              className="shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500">
              <HiX className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id={id}
            type="text"
            autoComplete="off"
            disabled={disabled}
            className={`${field} pl-9`}
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
      )}

      {open && !selected && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No employee matches “{query}”</li>
          ) : matches.map((e, i) => (
            <li key={e.emp_id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(e)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-purple-50 dark:bg-gray-600" : ""
                }`}
              >
                <span className="min-w-0 truncate text-gray-800 dark:text-gray-100">{fullName(e)}</span>
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {e.emp_id}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 50 && (
            <li className="px-3 py-1.5 text-xs text-gray-400">Showing the first 50 — keep typing to narrow it down.</li>
          )}
        </ul>
      )}
    </div>
  );
}
