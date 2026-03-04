/**
 * FormFields — custom replacements for Flowbite form components.
 * Explicit Tailwind dark-mode classes so every element is readable in any theme.
 *
 * Exports: CustomLabel, CustomInput, CustomSelect, CustomTextarea, CustomButton, CustomToggle
 */
import { HiChevronDown } from "react-icons/hi";

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

/* ─── CustomInput — replaces <TextInput> ────────────────────────────────── */
export function CustomInput({ icon: Icon, className = "", sizing, ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input className={`${base} pl-9 ${className}`} {...props} />
      </div>
    );
  }
  return <input className={`${base} ${className}`} {...props} />;
}

/* ─── CustomSelect — replaces <Select> ──────────────────────────────────── */
export function CustomSelect({ className = "", sizing, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={
          `${base} appearance-none cursor-pointer pr-8 ` +
          `dark:bg-gray-700 dark:[color-scheme:dark] ${className}`
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

export function CustomButton({
  color = "purple",
  size,
  outline = false,
  pill = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
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
