import { execSQL, esc, num } from './api';

const RUN_SP    = 'dbo.payroll_run_sp';
const DETAIL_SP = 'dbo.payroll_run_detail_sp';

/* ------------------------------------------------------------------
 * Payroll engine.
 * Formulas verified against the client's June 2026 payroll run —
 * 225/225 employees matched exactly on every field, including PAYE.
 *
 *   Gross     = Basic - NoPay + Budgetary + Increment + Class-Teacher (net of
 *               any late-attendance cut) + Other Allowances
 *   EPF base  = Basic - NoPay + Budgetary + Increment   (NoPay reduces the base)
 *   EPF 8%    = employee deduction
 *   EPF 12%   = employer contribution  (never deducted from the employee)
 *   ETF 3%    = employer contribution  (never deducted from the employee)
 *   StampDuty = Rs.25 when gross > 25,000
 *   PAYE      = slab table applied to gross pay
 *   Net       = Gross - (StampDuty + PAYE + Loan + Advance + Insurance + Other
 *                        + Festival Advance + EPF 8%)
 *
 * Attendance allowance is deliberately NOT part of any of the above.
 * Per the client it is worked out separately from the previous month's
 * attendance for support staff and added on top of net pay in the bank
 * transfer, so it is carried on the run but never taxed or EPF'd.
 * ------------------------------------------------------------------ */

/* Class teacher allowance is cut when the teacher reports late.
 * Memo dated 18 Nov 2025, in force from January 2026:
 *   up to 2 days late  -> paid in full
 *   3 to 5 days        -> 20% deducted
 *   6 to 10 days       -> 30% deducted
 *   over 10 days       -> 50% deducted
 * (the memo overlaps at 5; treated as 3-5 then 6-10) */
export const LATE_BANDS = [
  { upTo: 2,        rate: 0,  label: "Up to 2 days — full payment" },
  { upTo: 5,        rate: 20, label: "3 to 5 days — 20% deducted" },
  { upTo: 10,       rate: 30, label: "6 to 10 days — 30% deducted" },
  { upTo: Infinity, rate: 50, label: "Over 10 days — 50% deducted" },
];

export const lateDeductionRate = (days) => {
  const d = Number(days) || 0;
  return (LATE_BANDS.find((b) => d <= b.upTo) ?? LATE_BANDS[LATE_BANDS.length - 1]).rate;
};

/* ------------------------------------------------------------------
 * Resolving a salary component's value.
 *
 * A component carries a calculation type, and until now the engine
 * ignored it and just used the raw number — so "Percentage of Basic 5"
 * added Rs.5 instead of 5%. These helpers make the type mean something.
 *
 * Percentage of Gross uses the *base* gross (basic - no pay + budgetary
 * + increment) rather than the final gross, because the final gross
 * depends on the allowances themselves and would be circular.
 * ------------------------------------------------------------------ */

// Only plain arithmetic over known variables is allowed — anything else
// is rejected rather than executed.
const FORMULA_VARS = ['basic', 'budgetary', 'increment', 'baseGross', 'noPay', 'noPayDays', 'days', 'hours'];

export const evalFormula = (formula, ctx = {}) => {
  if (!formula) return 0;
  const expr = String(formula).trim();
  // Strip the variable names out, then confirm only maths remains.
  // Longest first, otherwise "noPay" would eat the front of "noPayDays"
  // and the leftover would look like an unknown word.
  const byLength = [...FORMULA_VARS].sort((a, b) => b.length - a.length);
  const stripped = byLength.reduce((acc, v) => acc.split(v).join(' '), expr);
  if (!/^[\s0-9+\-*/().]*$/.test(stripped)) return 0;   // contains something unexpected
  try {
    const args = FORMULA_VARS;
    const vals = args.map((k) => Number(ctx[k]) || 0);
    // eslint-disable-next-line no-new-func -- expression already whitelisted above
    const fn = new Function(...args, `"use strict"; return (${expr});`);
    const out = Number(fn(...vals));
    return Number.isFinite(out) ? out : 0;
  } catch {
    return 0;
  }
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const resolveComponentValue = (comp, ctx = {}) => {
  const raw = Number(comp?.value ?? comp?.defaultValue ?? 0) || 0;
  switch (comp?.calcType) {
    case 'Percentage of Basic': return round2(((Number(ctx.basic) || 0) * raw) / 100);
    case 'Percentage of Gross': return round2(((Number(ctx.baseGross) || 0) * raw) / 100);
    case 'Formula Based':       return round2(evalFormula(comp.formula, ctx));
    case 'Fixed Amount':
    default:                    return raw;
  }
};

/* No-pay is worked out from the daily rate, which their June payroll shows is
 * (basic + budgetary allowance) / 30 — verified against all five staff who had
 * a no-pay deduction that month. Entering the days derives the amount. */
export const DAYS_IN_MONTH = 30;

/* A no-pay day costs a day of everything that is salary: basic, budgetary and,
 * in the month it is shown as its own line, the increment. Leaving the increment
 * out undercharged anyone with a rise that month - 1381 lost 1,333 a day on
 * 37,500 + 2,500 when the day was worth 43,000 / 30 = 1,433. */
export const noPayFromDays = (days, basic, budgetary = 0, increment = 0) => {
  const d = Number(days) || 0;
  if (d <= 0) return 0;
  const daily = ((Number(basic) || 0) + (Number(budgetary) || 0) + (Number(increment) || 0)) / DAYS_IN_MONTH;
  return Math.round(daily * d);
};

export const calcPAYE = (gross, slabs) => {
  if (!Array.isArray(slabs) || slabs.length === 0) return 0;
  let tax = 0;
  for (const s of slabs) {
    const from = Number(s.fromAmount);
    const to   = Number(s.toAmount);
    const rate = Number(s.rate);
    if (rate <= 0 || gross <= from - 1) continue;
    const band = Math.min(gross, to) - (from - 1);
    if (band > 0) tax += (band * rate) / 100;
  }
  return tax;
};

/* The tax table already starts with a 0% band up to Rs. 150,000, so PAYE is
 * worked out automatically and most staff need no tax mode at all. Setting a
 * mode is an override: a "no tax" mode zeroes PAYE whatever the gross is. */
export const isNoTaxMode = (mode) => /no\s*tax/i.test(String(mode || ''));

export const computePayroll = (input, slabs, rates = {}) => {
  const employeeRate = rates.employeeContribution    ?? 8;
  const employerRate = rates.employerContributionEPF ?? 12;
  const etfRate      = rates.employerContributionETF ?? 3;

  const basic      = Number(input.basicSalary)        || 0;
  const budgetary0 = Number(input.budgetaryAllowance) || 0;
  const noPayDays  = Number(input.noPayDays)          || 0;
  // days drive the amount unless the amount itself was typed in
  const noPay      = input.noPayAmountEdited
    ? (Number(input.noPay) || 0)
    : (noPayDays > 0 ? noPayFromDays(noPayDays, basic, budgetary0, Number(input.increment) || 0) : (Number(input.noPay) || 0));
  const budgetary  = Number(input.budgetaryAllowance) || 0;
  const other      = Number(input.otherAllowance)     || 0;
  const increment  = Number(input.increment)          || 0;
  const festival   = Number(input.festivalAdvance)    || 0;
  const attendance = Number(input.attendanceAllowance) || 0;
  const formTeacher = Number(input.formTeacherAllowance) || 0;
  const lateDays    = Number(input.lateDays) || 0;
  // pay for an earlier month (arrears, part-month for a late joiner), plus or
  // minus; it is salary, so it counts toward gross, EPF and tax like basic does
  const salaryAdjustment = Number(input.salaryAdjustment) || 0;

  // late attendance reduces the class teacher allowance only
  const formTeacherDeduction = Math.round((formTeacher * lateDeductionRate(lateDays)) / 100);
  const formTeacherNet       = formTeacher - formTeacherDeduction;

  // An increment is part of salary, so it counts toward gross AND the EPF base.
  const grossPay = basic - noPay + budgetary + increment + salaryAdjustment + formTeacherNet + other;
  const epfBase  = basic - noPay + budgetary + increment + salaryAdjustment;   // allowances are outside the EPF base

  const epfEmployee = input.epfEtf === false ? 0 : Math.round((epfBase * employeeRate) / 100);
  const epfEmployer = input.epfEtf === false ? 0 : Math.round((epfBase * employerRate) / 100);
  const etf         = input.epfEtf === false ? 0 : Math.round((epfBase * etfRate) / 100);

  const stampDuty = grossPay > 25000 ? 25 : 0;
  const paye      = isNoTaxMode(input.taxMode) ? 0 : Math.round(calcPAYE(grossPay, slabs));

  const loan      = Number(input.loanDeduction)      || 0;
  const advance   = Number(input.advanceDeduction)   || 0;
  const insurance = Number(input.insuranceDeduction) || 0;
  const otherDed  = Number(input.otherDeduction)     || 0;

  const totalDeductions = stampDuty + paye + loan + advance + insurance + otherDed + festival + epfEmployee;

  return {
    basicSalary: basic, noPay, noPayDays,
    budgetaryAllowance: budgetary, increment, salaryAdjustment, otherAllowance: other, festivalAdvance: festival,
    formTeacherAllowance: formTeacher, formTeacherDeduction, lateDays,
    allowanceBreakdown: input.allowanceBreakdown ?? null,
    grossPay, stampDuty, paye, taxMode: input.taxMode ?? null,
    loanDeduction: loan, advanceDeduction: advance,
    insuranceDeduction: insurance, otherDeduction: otherDed,
    epfEmployee, epfEmployer, etf, attendanceAllowance: attendance,
    totalDeductions, netPay: grossPay - totalDeductions,
  };
};

/* ---------------- data access ---------------- */

// Opens (or creates) the run for a month and returns its header row.
export const openRun = (runMonth) =>
  execSQL(`EXEC ${RUN_SP} @action='OPEN',@runMonth=${esc(runMonth)}`);

export const fetchRunDetails = (runId) =>
  execSQL(
    `SELECT d.*, ISNULL(e.paymentMode,'Bank') AS paymentMode, e.employmentType, ` +
    `e.initial, e.initials, e.surName ` +
    `FROM dbo.payroll_run_detail d ` +
    `LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id ` +
    `WHERE d.runId=${num(runId)} ORDER BY CAST(d.emp_id AS INT)`
  );

// Read-only lookup — unlike openRun this never creates a run.
export const fetchRunByMonth = (runMonth) =>
  execSQL(
    `SELECT TOP 1 * FROM dbo.payroll_run WHERE runMonth=${esc(runMonth)} ` +
    `AND status<>'Deleted' ORDER BY id DESC`
  );

// Joined to the employee so payslips can show the full name with initials,
// NIC, job title and bank account without a second round trip.
export const fetchRunDetailsByMonth = (runMonth) =>
  execSQL(`
    SELECT d.*,
           e.initial, e.initials, e.firstName, e.midName, e.surName,
           e.nic, e.title AS jobTitle, e.designation, e.epfEtfName,
           e.accountNum, e.bank, e.branch, ISNULL(e.paymentMode,'Bank') AS paymentMode,
           e.employmentType, e.tin
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    WHERE r.runMonth = ${esc(runMonth)} AND r.status <> 'Deleted'
    ORDER BY CAST(d.emp_id AS INT)
  `);

export const refreshRunTotals = (runId) =>
  execSQL(`EXEC ${RUN_SP} @action='TOTALS',@id=${num(runId)}`);

/* The pay period. Defaults to the whole calendar month; change it when the
 * cycle doesn't run 1st-to-last, or to cover a mid-month cut-off. */
export const setRunPeriod = (runId, periodFrom, periodTo) =>
  execSQL(
    `EXEC ${RUN_SP} @action='SETPERIOD',@id=${num(runId)},` +
    `@periodFrom=${esc(periodFrom)},@periodTo=${esc(periodTo)}`
  );

// Who was employed during the period, and for how many of its days.
export const fetchPeriodEmployees = (periodFrom, periodTo) =>
  execSQL(
    `EXEC dbo.payroll_period_employees_sp ` +
    `@periodFrom=${esc(periodFrom)},@periodTo=${esc(periodTo)}`
  );

export const setRunStatus = (runId, status) =>
  execSQL(`EXEC ${RUN_SP} @action='STATUS',@id=${num(runId)},@status=${esc(status)}`);

const detailValues = (r) =>
  `@basicSalary=${num(r.basicSalary)},@noPay=${num(r.noPay)},@noPayDays=${num(r.noPayDays ?? 0)},` +
  `@budgetaryAllowance=${num(r.budgetaryAllowance)},@otherAllowance=${num(r.otherAllowance)},` +
  `@increment=${num(r.increment ?? 0)},@festivalAdvance=${num(r.festivalAdvance ?? 0)},` +
  `@formTeacherAllowance=${num(r.formTeacherAllowance ?? 0)},` +
  `@formTeacherDeduction=${num(r.formTeacherDeduction ?? 0)},@lateDays=${num(r.lateDays ?? 0)},` +
  `@grossPay=${num(r.grossPay)},@stampDuty=${num(r.stampDuty)},@paye=${num(r.paye)},` +
  `@loanDeduction=${num(r.loanDeduction)},@advanceDeduction=${num(r.advanceDeduction)},` +
  `@insuranceDeduction=${num(r.insuranceDeduction)},@otherDeduction=${num(r.otherDeduction)},` +
  `@taxMode=${r.taxMode ? esc(r.taxMode) : 'NULL'},` +
  `@epfEmployee=${num(r.epfEmployee)},@epfEmployer=${num(r.epfEmployer)},@etf=${num(r.etf)},` +
  `@totalDeductions=${num(r.totalDeductions)},@netPay=${num(r.netPay)},` +
  `@epfEtf=${r.epfEtf === false ? 0 : 1},` +
  `@attendanceAllowance=${num(r.attendanceAllowance ?? 0)},` +
  `@salaryAdjustment=${num(r.salaryAdjustment ?? 0)},` +
  `@editedFields=${esc(r.editedFields ?? null)},` +
  `@allowanceBreakdown=${esc(r.allowanceBreakdown ?? null)}`;

// Re-runs the engine over a saved detail row after a monthly figure is edited.
export const recomputeDetailRow = (row, slabs, rates) =>
  computePayroll(
    {
      basicSalary: row.basicSalary,
      noPay: row.noPay,
      noPayDays: row.noPayDays,
      noPayAmountEdited: String(row.editedFields || '').split(',').includes('noPay'),
      editedFields: row.editedFields,
      allowanceBreakdown: row.allowanceBreakdown,
      budgetaryAllowance: row.budgetaryAllowance,
      increment: row.increment,
      salaryAdjustment: row.salaryAdjustment,
      festivalAdvance: row.festivalAdvance,
      attendanceAllowance: row.attendanceAllowance,
      formTeacherAllowance: row.formTeacherAllowance,
      lateDays: row.lateDays,
      otherAllowance: row.otherAllowance,
      loanDeduction: row.loanDeduction,
      advanceDeduction: row.advanceDeduction,
      insuranceDeduction: row.insuranceDeduction,
      otherDeduction: row.otherDeduction,
      taxMode: row.taxMode,
      epfEtf: row.epfEtf === false || row.epfEtf === 0 ? false : true,
    },
    slabs,
    rates
  );

export const insertRunDetail = (runId, runMonth, r) =>
  execSQL(
    `EXEC ${DETAIL_SP} @action='INSERT',@runId=${num(runId)},@runMonth=${esc(runMonth)},` +
    `@emp_id=${esc(r.emp_id)},@empName=${esc(r.empName)},@category=${esc(r.category)},` +
    detailValues(r)
  );

export const updateRunDetail = (id, r) =>
  execSQL(`EXEC ${DETAIL_SP} @action='UPDATE',@id=${num(id)},${detailValues(r)}`);

const savedRowCount = async (runId) => {
  const r = await execSQL(`SELECT COUNT(*) AS n FROM dbo.payroll_run_detail WHERE runId=${num(runId)}`);
  return Number(r?.[0]?.n) || 0;
};

/* A recalculation replaces every row of the run in one all-or-nothing request.
 * It used to delete the old rows and then save the new ones 25 at a time; on
 * 21 October the connection dropped after the fourth batch and October was left
 * with 100 of its 231 employees, the other 131 simply gone. Now the delete and
 * every insert commit together or not at all, and the rows being replaced are
 * first copied into payroll_run_snapshot so an earlier state can be restored.
 *
 * The answer to the request proves nothing either way: the API reports only the
 * first statement's result, so a save that fails at the 150th employee still
 * comes back "OK" (and rolled back), and a dropped connection can hide one that
 * did commit. So each save carries a token written in the same transaction and
 * is judged by that alone: found, it committed; not found, nothing changed and
 * it is safe to send again. Counting rows would not do - a failed save leaves
 * the old rows, often just as many. */
export const replaceRunDetails = async (runId, runMonth, rows) => {
  const id = num(runId);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sql =
    `SET XACT_ABORT ON; BEGIN TRAN;\n` +
    `DECLARE @snap NVARCHAR(MAX) = (SELECT * FROM dbo.payroll_run_detail WHERE runId=${id} FOR JSON PATH);\n` +
    `INSERT INTO dbo.payroll_run_snapshot (runId, runMonth, reason, detailCount, rowsJson, saveToken)\n` +
    `  SELECT ${id}, ${esc(runMonth)}, 'Recalculate', COUNT(*), @snap, ${esc(token)} FROM dbo.payroll_run_detail WHERE runId=${id};\n` +
    `DELETE FROM dbo.payroll_run_detail WHERE runId=${id};\n` +
    rows.map((r) =>
      `EXEC ${DETAIL_SP} @action='INSERT',@runId=${id},@runMonth=${esc(runMonth)},` +
      `@emp_id=${esc(r.emp_id)},@empName=${esc(r.empName)},@category=${esc(r.category)},` +
      detailValues(r)
    ).join('\n') + '\n' +
    `IF (SELECT COUNT(*) FROM dbo.payroll_run_detail WHERE runId=${id}) <> ${rows.length}\n` +
    `  THROW 50001, 'The saved rows do not match the calculation', 1;\n` +
    `COMMIT;`;
  const committed = async () => {
    const r = await execSQL(`SELECT COUNT(*) AS n FROM dbo.payroll_run_snapshot WHERE saveToken=${esc(token)}`);
    return Number(r?.[0]?.n) > 0;
  };
  const attempt = async () => { try { await execSQL(sql); } catch (e) { console.error(e); } };
  await attempt();
  if (!(await committed())) {
    await attempt();                                  // nothing was saved - one more try
    if (!(await committed())) throw new Error('The calculation was not saved');
  }
  const saved = await savedRowCount(runId);
  if (saved !== rows.length) throw new Error(`Saved ${saved} of ${rows.length} rows`);
};

/* The payroll month being worked on: the one after the latest month marked Paid.
 * October's payroll is still being finished in November, so "this month" by the
 * calendar showed November's (empty) salary advances instead of October's. */
export const fetchOpenPayrollMonth = async () => {
  const r = await execSQL(`SELECT MAX(runMonth) AS m FROM dbo.payroll_run WHERE status = 'Paid'`);
  const m = r?.[0]?.m;
  if (!m) return null;
  const [y, mm] = String(m).split('-').map(Number);
  const next = new Date(y, mm, 1);   // month index mm is the month after
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

/* How many people a payroll for this period should hold: the same people a
 * calculation picks up - current staff employed at some point in the period. */
export const countExpectedForPeriod = async (periodFrom, periodTo) => {
  const r = await execSQL(
    `SELECT COUNT(*) AS n FROM dbo.payroll_employee ` +
    `WHERE status = 'Active' AND (dateOfResignation IS NULL OR dateOfResignation > GETDATE()) ` +
    `AND (dateOfJoining IS NULL OR dateOfJoining <= ${esc(periodTo)}) ` +
    `AND (dateOfResignation IS NULL OR dateOfResignation >= ${esc(periodFrom)})`
  );
  return Number(r?.[0]?.n) || 0;
};

/* ------------------------------------------------------------------
 * Bulk update of the monthly figures.
 * Nadee already works in Excel, so the fastest route is: export the sheet,
 * fill the columns there, import it back. Only the per-month figures are
 * touched — basic salary, EPF and the like are never overwritten by a file.
 * ------------------------------------------------------------------ */

// The columns a person is allowed to change in bulk.
/* A run is a stored snapshot. Anything added to a salary structure afterwards
 * is invisible until it is recalculated, which is how an Insurance deduction
 * and a Sports allowance both went missing from the August payslips. Rather
 * than recalculate silently — that would throw away typed figures without
 * asking — count what has changed and let the screen say so. */
export const countStructureChangesSince = async (runMonth) => {
  // Measured against the detail rows, not run.calculatedAt — that header stamp
  // moves when the run is merely reopened or its totals refreshed, so it says
  // a payroll is current when the figures in it are weeks old.
  const since =
    `(SELECT MAX(d2.createdAt) FROM dbo.payroll_run_detail d2 ` +
    ` INNER JOIN dbo.payroll_run r2 ON r2.id=d2.runId AND r2.status<>'Deleted' ` +
    ` WHERE r2.runMonth=${esc(runMonth)})`;
  const inRun = (col) =>
    `EXISTS (SELECT 1 FROM dbo.payroll_run_detail d ` +
    `        INNER JOIN dbo.payroll_run r ON r.id=d.runId AND r.status<>'Deleted' ` +
    `        WHERE r.runMonth=${esc(runMonth)} AND d.emp_id=${col})`;
  // salary structure, loans and increments all feed the run, so a change to any
  // of them leaves the stored figures behind.
  const rows = await execSQL(
    `SELECT ` +
    // an edited or deleted component counts as much as a new one - deleting the
    // Insurance components after September was calculated left it deducting
    // insurance twice, with nothing on screen to say so
    `(SELECT COUNT(*) FROM dbo.payroll_salary_structure s ` +
    ` WHERE ((s.status<>'Deleted' AND ISNULL(s.updatedAt, s.createdAt) > ${since}) ` +
    `     OR (s.status='Deleted' AND s.updatedAt > ${since})) AND ${inRun('s.emp_id')}) + ` +
    // an installment that was edited after the run was calculated counts too,
    // which is why this looks at updatedAt before falling back to createdAt
    `(SELECT COUNT(*) FROM dbo.payroll_loan l ` +
    ` WHERE ((l.status='Active' AND ISNULL(l.updatedAt, l.createdAt) > ${since}) ` +
    `     OR (l.status<>'Active' AND l.updatedAt > ${since})) AND ${inRun('l.emp_id')}) + ` +
    // an increment matters when it is applied, revoked, merged or un-merged -
    // generating the sheet or typing a draft amount changes nothing in payroll
    `(SELECT COUNT(*) FROM dbo.payroll_increment i ` +
    ` WHERE ISNULL(i.updatedAt, i.appliedAt) > ${since} AND i.effectiveMonth <= ${esc(runMonth)} ` +
    ` AND ${inRun('i.emp_id')}) AS n`
  );
  return Number(rows?.[0]?.n || 0);
};

/* Increments that were applied and then revoked. REVOKE stamps updatedAt and
 * typing a draft amount does not, so these are the ones payroll has dropped until
 * someone presses Apply again - exactly what surprised Nadee after a recalculate. */
export const countRevokedIncrements = async (runMonth) => {
  const rows = await execSQL(
    `SELECT COUNT(*) AS n FROM dbo.payroll_increment ` +
    `WHERE effectiveMonth=${esc(runMonth)} AND status='Draft' AND incrementAmount<>0 AND updatedAt IS NOT NULL`
  );
  return Number(rows?.[0]?.n || 0);
};

export const BULK_FIELDS = [
  { key: 'noPayDays',           label: 'No Pay Days' },
  { key: 'noPay',               label: 'No Pay Amount' },
  { key: 'increment',           label: 'Increment' },
  { key: 'salaryAdjustment',    label: 'Salary Adjustment' },
  { key: 'lateDays',            label: 'Late Days' },
  { key: 'otherAllowance',      label: 'Allowances' },
  { key: 'advanceDeduction',    label: 'Advance' },
  { key: 'festivalAdvance',     label: 'Festival Advance' },
  { key: 'loanDeduction',       label: 'Loan / Insurance' },
  { key: 'insuranceDeduction',  label: 'Insurance' },
  { key: 'otherDeduction',      label: 'Other Deductions' },
  { key: 'attendanceAllowance', label: 'Attendance Allowance' },
];

const SPLIT_LINES = /\r?\n/;
const BOM_RE      = /^\uFEFF/;
const TRAIL_ZERO  = /\.0$/;

/* Splits a CSV line, honouring quoted fields that contain commas. */
const splitCsvLine = (line) => {
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim().replace(BOM_RE, ''));
};

/* Reads an exported sheet back in and works out what changed.
 * Returns { updates, notFound, unchanged } without touching the database,
 * so the caller can show the person what is about to happen. */
export const parseBulkCsv = (text, rows) => {
  const lines = String(text).split(SPLIT_LINES).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { updates: [], notFound: [], unchanged: 0, error: 'The file has no rows.' };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idCol  = header.findIndex((h) => h === 'emp id' || h === 'emp_id' || h === 'id');
  if (idCol === -1) return { updates: [], notFound: [], unchanged: 0, error: 'No "Emp ID" column found.' };

  const colFor = {};
  BULK_FIELDS.forEach((f) => {
    const i = header.findIndex((h) => h === f.label.toLowerCase());
    if (i !== -1) colFor[f.key] = i;
  });
  if (Object.keys(colFor).length === 0) {
    return { updates: [], notFound: [], unchanged: 0, error: 'None of the editable columns were found.' };
  }

  const byEmp = {};
  rows.forEach((r) => { byEmp[String(r.emp_id)] = r; });

  const updates = [], notFound = [];
  let unchanged = 0;

  lines.slice(1).forEach((line) => {
    const cells = splitCsvLine(line);
    const empId = (cells[idCol] || '').replace(TRAIL_ZERO, '');
    if (!empId) return;
    const row = byEmp[empId];
    if (!row) { notFound.push(empId); return; }

    const changed = {};
    Object.entries(colFor).forEach(([key, i]) => {
      const raw = (cells[i] ?? '').replace(/,/g, '').trim();
      if (raw === '') return;
      const val = Number(raw);
      if (!Number.isFinite(val)) return;
      if (Math.abs(val - (Number(row[key]) || 0)) > 0.001) changed[key] = val;
    });

    if (Object.keys(changed).length === 0) { unchanged += 1; return; }
    updates.push({ row, changed });
  });

  return { updates, notFound, unchanged, error: null };
};

/* Applies parsed changes: recomputes each row through the engine and saves
 * them in batches, marking the touched fields so a later recalculate keeps them. */
export const applyBulkUpdates = async (updates, slabs, rates, batchSize = 20) => {
  const merged = updates.map(({ row, changed }) => {
    const touched = new Set(String(row.editedFields || '').split(',').filter(Boolean));
    Object.keys(changed).forEach((k) => touched.add(k));
    const next = { ...row, ...changed, editedFields: [...touched].join(',') };
    return { ...next, ...recomputeDetailRow(next, slabs, rates) };
  });

  for (let i = 0; i < merged.length; i += batchSize) {
    const stmts = merged.slice(i, i + batchSize).map(
      (r) => `EXEC ${DETAIL_SP} @action='UPDATE',@id=${num(r.id)},${detailValues(r)}`
    );
    await execSQL(stmts.join(String.fromCharCode(10)));
  }
  return merged;
};
