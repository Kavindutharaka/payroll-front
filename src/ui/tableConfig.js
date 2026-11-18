/* How the lists across the app behave - one place to change it.
 *
 * Each feature can be switched off for every table (DEFAULTS) or for one table (TABLES),
 * without touching the screens. If the client prefers the old look, set the flag to false.
 *
 *   density        "compact" (more rows on screen) or "comfortable" (roomier rows).
 *                  People can also switch this themselves in the Columns menu; their
 *                  choice is remembered on their PC.
 *   pinFirst       the first column (usually the employee) stays put while scrolling sideways
 *   pinActions     the Edit / Delete buttons stay put on the right
 *   columnPicker   a "Columns" button to show or hide columns (remembered per PC)
 *   rowDetails     clicking a row opens a side panel with every field of that record
 *   mobileCards    on a phone, records show as cards instead of a wide table
 *
 * TABLES.<id>.visible lists the columns shown until someone changes them with the
 * Columns button. Leave it out to show every column.
 */
export const DEFAULTS = {
  density: "compact",
  pinFirst: true,
  pinActions: true,
  columnPicker: true,
  rowDetails: true,
  mobileCards: true,
};

export const TABLES = {
  employees: {
    visible: ["employee", "category", "type", "basic", "total", "status"],
  },
  bankAccounts: {
    visible: ["employee", "bank", "branch", "accountNo", "split", "status"],
  },
  standingOrders: {},
  loans: {
    visible: ["employee", "type", "months", "installment", "progress", "status"],
  },
  leave: {
    visible: ["employee", "type", "from", "to", "days", "status"],
  },
  salaryComponents: {},
  documents: {},
};

export const tableSettings = (id) => ({ ...DEFAULTS, ...(TABLES[id] || {}) });

/* The sheets people type into - Run Payroll, Bonus and Increment. They keep their own
 * layout (every column matters while entering figures); these two switches apply to them.
 *
 *   pinEmployee   the Employee column stays put while scrolling sideways
 *   compact       tighter rows, so more people fit on screen
 */
export const SHEETS = {
  pinEmployee: true,
  compact: true,
};

// class names the sheets use - follow the switches above
export const sheetClasses = {
  wrap: SHEETS.compact ? "sheet-compact" : "",
  row: "group",
  pinHead: SHEETS.pinEmployee ? "sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 pin-edge-r" : "",
  pinCell: SHEETS.pinEmployee
    ? "sticky left-0 z-10 bg-white group-hover:bg-purple-50 dark:bg-gray-800 dark:group-hover:bg-gray-700 pin-edge-r"
    : "",
};
