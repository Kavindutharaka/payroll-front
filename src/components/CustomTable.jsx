/**
 * CustomTable — drop-in replacements for Flowbite's Table components.
 * Uses explicit Tailwind dark-mode classes so rows and headers are
 * always readable regardless of theme.
 *
 * Exports:
 *   CustomTable       → <table>
 *   CustomTableHead   → <thead>
 *   CustomTableBody   → <tbody>
 *   CustomTableHeadCell → <th>
 *   CustomTableRow    → <tr>  (detects thead vs tbody via context)
 *   CustomTableCell   → <td>
 */

import { createContext, useContext } from "react";

const RowContext = createContext("body"); // "head" | "body"

/** Outer table wrapper */
export function CustomTable({ className = "", children, ...props }) {
  return (
    <table
      className={`w-full text-left text-sm ${className}`}
      {...props}
    >
      {children}
    </table>
  );
}

/** <thead> — subtle gray background */
export function CustomTableHead({ className = "", children, ...props }) {
  return (
    <RowContext.Provider value="head">
      <thead
        className={`bg-gray-50 dark:bg-gray-700/60 ${className}`}
        {...props}
      >
        {children}
      </thead>
    </RowContext.Provider>
  );
}

/** <tbody> */
export function CustomTableBody({ className = "", children, ...props }) {
  return (
    <RowContext.Provider value="body">
      <tbody className={`divide-y divide-gray-100 dark:divide-gray-700 ${className}`} {...props}>
        {children}
      </tbody>
    </RowContext.Provider>
  );
}

/** <tr> — hover tint in body rows, plain in head */
export function CustomTableRow({ className = "", children, ...props }) {
  const ctx = useContext(RowContext);
  const base =
    ctx === "head"
      ? ""
      : "bg-white dark:bg-gray-800 transition-colors hover:bg-purple-50 dark:hover:bg-gray-700/70";
  return (
    <tr className={`${base} ${className}`} {...props}>
      {children}
    </tr>
  );
}

/** <th> — uppercase label style */
export function CustomTableHeadCell({ className = "", children, ...props }) {
  return (
    <th
      className={
        `px-4 py-3 text-xs font-semibold uppercase tracking-wider ` +
        `text-gray-500 dark:text-gray-400 ${className}`
      }
      {...props}
    >
      {children}
    </th>
  );
}

/** <td> */
export function CustomTableCell({ className = "", children, ...props }) {
  return (
    <td
      className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
