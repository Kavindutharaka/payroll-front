/**
 * StatusBadge — replaces Flowbite's Badge for all label/status/boolean indicators.
 * Uses explicit Tailwind classes so text and background are always readable
 * in both light and dark mode (Flowbite Badge has dark-mode contrast issues).
 *
 * Usage:
 *   <StatusBadge color="success">Active</StatusBadge>
 *   <StatusBadge color="failure">Deduction</StatusBadge>
 *   <StatusBadge color="gray">No</StatusBadge>
 */

const colorMap = {
  success: "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300",
  failure: "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300",
  warning: "bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300",
  indigo:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  purple:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blue:    "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
  pink:    "bg-pink-100   text-pink-700   dark:bg-pink-900/40   dark:text-pink-300",
  gray:    "bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-300",
  dark:    "bg-gray-700   text-gray-200   dark:bg-gray-600      dark:text-gray-100",
};

export function StatusBadge({ color = "gray", children, className = "" }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-medium ${colorMap[color] ?? colorMap.gray} ${className}`}
    >
      {children}
    </span>
  );
}
