/**
 * FormFields — custom replacements for Flowbite form components.
 * Explicit Tailwind dark-mode classes so every element is readable in any theme.
 *
 * Exports: CustomLabel, CustomInput, CustomSelect, CustomTextarea, CustomButton, CustomToggle
 */
import { useState, useEffect, useRef } from "react";
import { HiChevronDown, HiCalendar } from "react-icons/hi";
import { useCan } from "../auth/AuthContext";

/* ─── CustomLabel — replaces <Label> ────────────────────────────────────── */
export function CustomLabel({ htmlFor, className = "", children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    >
      {children}
    </label>
  );
}

/* ─── shared input base ─────────────────────────────────────────────────── */
const base =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm " +
  "text-gray-800 placeholder-gray-400 shadow-sm transition-colors " +
  "focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 " +
  "dark:placeholder-gray-500 dark:focus:border-purple-400";

/* ─── dates ──────────────────────────────────────────────────────────────
 * A native <input type="date"> renders in the BROWSER's locale, not the page's
 * — Chrome on an en-US profile shows mm/dd/yyyy however the document is tagged,
 * so setting lang on <html> does nothing. The school works in dd/mm/yyyy, so a
 * date field is a text box in that format with the native picker one click
 * away. The value in and the value out stay yyyy-mm-dd, so callers don't change.
 * ----------------------------------------------------------------------- */
const toDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

const toISO = (text) => {
  const m = /^(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})$/.exec(String(text ?? "").trim());
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const dt = new Date(y, mo - 1, d);
  // rejects 31/02/2026 and friends, which Date would silently roll forward
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function DateInput({ className = "", value, onChange, id, name, disabled, ...rest }) {
  const [text, setText] = useState(toDisplay(value));
  const picker = useRef(null);

  useEffect(() => { setText(toDisplay(value)); }, [value]);

  const emit = (iso) => onChange?.({ target: { value: iso, id, name } });

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") { emit(""); return; }
    const iso = toISO(trimmed);
    if (iso) { setText(toDisplay(iso)); emit(iso); }
    else setText(toDisplay(value));   // unreadable — restore what was there
  };

  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        className={`${base} pr-9 ${className}`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => { const el = picker.current; if (!el) return; el.showPicker ? el.showPicker() : el.click(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-purple-400"
        aria-label="Open calendar"
      >
        <HiCalendar className="h-4 w-4" />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={String(value ?? "").slice(0, 10)}
        onChange={(e) => emit(e.target.value)}
        className="pointer-events-none absolute right-2 bottom-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}

/* ─── CustomInput — replaces <TextInput> ────────────────────────────────── */
/* Width classes (w-64, sm:w-72, flex-1 ...) size the wrapper - the box that sits in the
 * row - while the field itself always fills it. On the field they had no effect. */
const SIZE = /^(?:[a-z]+:)*(?:w-|max-w-|min-w-|flex-1$|grow$|basis-)/;
const splitSize = (cls = "") => {
  const parts = cls.split(/\s+/).filter(Boolean);
  return [parts.filter((c) => SIZE.test(c)).join(" "), parts.filter((c) => !SIZE.test(c)).join(" ")];
};

export function CustomInput({ icon: Icon, className = "", sizing, ...props }) {
  if (props.type === "date") return <DateInput className={className} {...props} />;
  if (Icon) {
    const [size, rest] = splitSize(className);
    return (
      <div className={`relative ${size}`}>
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input className={`${base} pl-9 ${rest}`} {...props} />
      </div>
    );
  }
  return <input className={`${base} ${className}`} {...props} />;
}

/* ─── CustomSelect — replaces <Select> ──────────────────────────────────── */
export function CustomSelect({ className = "", sizing, children, ...props }) {
  const [size, rest] = splitSize(className);
  return (
    <div className={`relative ${size}`}>
      <select
        className={
          `${base} appearance-none cursor-pointer pr-8 ` +
          `dark:bg-gray-700 dark:[color-scheme:dark] ${rest}`
        }
        {...props}
      >
        {children}
      </select>
      <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
    </div>
  );
}

/* ─── CustomTextarea — replaces <Textarea> ───────────────────────────────── */
export function CustomTextarea({ className = "", sizing, ...props }) {
  return (
    <textarea
      className={`${base} resize-none ${className}`}
      {...props}
    />
  );
}

/* ─── CustomButton — replaces <Button> ──────────────────────────────────── */
const BTN_SOLID = {
  purple:  "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500/40",
  gray:    "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400/40",
  blue:    "bg-blue-600  text-white hover:bg-blue-700  focus:ring-blue-500/40",
  green:   "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500/40",
  red:     "bg-red-600   text-white hover:bg-red-700   focus:ring-red-500/40",
  failure: "bg-red-600   text-white hover:bg-red-700   focus:ring-red-500/40",
  warning: "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400/40",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500/40",
};
const BTN_OUTLINE = {
  purple:  "border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white",
  gray:    "border border-gray-400   text-gray-500   hover:bg-gray-500   hover:text-white dark:border-gray-500 dark:text-gray-400",
  blue:    "border border-blue-500   text-blue-500   hover:bg-blue-500   hover:text-white",
  green:   "border border-green-500  text-green-500  hover:bg-green-500  hover:text-white",
  red:     "border border-red-500    text-red-500    hover:bg-red-500    hover:text-white",
  failure: "border border-red-500    text-red-500    hover:bg-red-500    hover:text-white",
  warning: "border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white",
  success: "border border-green-500  text-green-500  hover:bg-green-500  hover:text-white",
};
const BTN_SIZE = {
  xs: "px-2 py-1 text-xs gap-1",
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

/* `perm="employees.edit"` hides the button from roles that don't include it. */
export function CustomButton({
  perm,
  color = "purple",
  size,
  outline = false,
  pill = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  const can = useCan();
  if (perm && !can(perm)) return null;
  const colorCls = (outline ? BTN_OUTLINE : BTN_SOLID)[color] ?? (outline ? BTN_OUTLINE.purple : BTN_SOLID.purple);
  const sizeCls  = BTN_SIZE[size] ?? BTN_SIZE.md;
  const shape    = pill ? "rounded-full" : "rounded-lg";
  return (
    <button
      type={type}
      className={
        `inline-flex items-center justify-center font-medium transition-colors ` +
        `focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ` +
        `${shape} ${sizeCls} ${colorCls} ${className}`
      }
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── CustomToggle — replaces <ToggleSwitch> ────────────────────────────── */
const TOGGLE_ON = {
  purple: "bg-purple-600",
  blue:   "bg-blue-600",
  green:  "bg-green-600",
};

export function CustomToggle({
  checked = false,
  onChange,
  color = "purple",
  label,
  className = "",
}) {
  const onColor  = TOGGLE_ON[color] ?? TOGGLE_ON.purple;
  const offColor = "bg-gray-300 dark:bg-gray-600";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className={
        `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center ` +
        `rounded-full transition-colors duration-200 ease-in-out ` +
        `focus:outline-none focus:ring-2 focus:ring-purple-500/40 ` +
        `${checked ? onColor : offColor} ${className}`
      }
    >
      <span
        className={
          `inline-block h-4 w-4 transform rounded-full bg-white shadow ` +
          `transition-transform duration-200 ease-in-out ` +
          `${checked ? "translate-x-6" : "translate-x-1"}`
        }
      />
      {label && <span className="ml-2 text-sm">{label}</span>}
    </button>
  );
}
