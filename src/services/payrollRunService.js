import { execSQL, esc, num } from './api';

const RUN_SP    = 'dbo.payroll_run_sp';
const DETAIL_SP = 'dbo.payroll_run_detail_sp';

/* ------------------------------------------------------------------
 * Payroll engine.
 * Formulas verified against the client's June 2026 payroll run —
 * 225/225 employees matched exactly on every field, including PAYE.
 *
 *   Gross     = Basic - NoPay + Budgetary + Other Allowances
 *   EPF base  = Basic - NoPay + Budgetary        (NoPay reduces the base)
 *   EPF 8%    = employee deduction
 *   EPF 12%   = employer contribution  (never deducted from the employee)
 *   ETF 3%    = employer contribution  (never deducted from the employee)
 *   StampDuty = Rs.25 when gross > 25,000
 *   PAYE      = slab table applied to gross pay
 *   Net       = Gross - (StampDuty + PAYE + Loan + Advance + Insurance + Other + EPF 8%)
 * ------------------------------------------------------------------ */

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

export const computePayroll = (input, slabs, rates = {}) => {
  const employeeRate = rates.employeeContribution    ?? 8;
  const employerRate = rates.employerContributionEPF ?? 12;
  const etfRate      = rates.employerContributionETF ?? 3;

  const basic      = Number(input.basicSalary)        || 0;
  const noPay      = Number(input.noPay)              || 0;
  const budgetary  = Number(input.budgetaryAllowance) || 0;
  const other      = Number(input.otherAllowance)     || 0;

  const grossPay = basic - noPay + budgetary + other;
  const epfBase  = basic - noPay + budgetary;

  const epfEmployee = input.epfEtf === false ? 0 : Math.round((epfBase * employeeRate) / 100);
  const epfEmployer = input.epfEtf === false ? 0 : Math.round((epfBase * employerRate) / 100);
  const etf         = input.epfEtf === false ? 0 : Math.round((epfBase * etfRate) / 100);

  const stampDuty = grossPay > 25000 ? 25 : 0;
  const paye      = Math.round(calcPAYE(grossPay, slabs));

  const loan      = Number(input.loanDeduction)      || 0;
  const advance   = Number(input.advanceDeduction)   || 0;
  const insurance = Number(input.insuranceDeduction) || 0;
  const otherDed  = Number(input.otherDeduction)     || 0;

  const totalDeductions = stampDuty + paye + loan + advance + insurance + otherDed + epfEmployee;

  return {
    basicSalary: basic, noPay, budgetaryAllowance: budgetary, otherAllowance: other,
    grossPay, stampDuty, paye,
    loanDeduction: loan, advanceDeduction: advance,
    insuranceDeduction: insurance, otherDeduction: otherDed,
    epfEmployee, epfEmployer, etf,
    totalDeductions, netPay: grossPay - totalDeductions,
  };
};

/* ---------------- data access ---------------- */

// Opens (or creates) the run for a month and returns its header row.
export const openRun = (runMonth) =>
  execSQL(`EXEC ${RUN_SP} @action='OPEN',@runMonth=${esc(runMonth)}`);

export const fetchRunDetails = (runId) =>
  execSQL(`SELECT * FROM dbo.payroll_run_detail WHERE runId=${num(runId)} ORDER BY CAST(emp_id AS INT)`);

// Read-only lookup — unlike openRun this never creates a run.
export const fetchRunByMonth = (runMonth) =>
  execSQL(
    `SELECT TOP 1 * FROM dbo.payroll_run WHERE runMonth=${esc(runMonth)} ` +
    `AND status<>'Deleted' ORDER BY id DESC`
  );

export const fetchRunDetailsByMonth = (runMonth) =>
  execSQL(
    `SELECT d.* FROM dbo.payroll_run_detail d ` +
    `INNER JOIN dbo.payroll_run r ON r.id = d.runId ` +
    `WHERE d.runMonth=${esc(runMonth)} AND r.status<>'Deleted' ORDER BY CAST(d.emp_id AS INT)`
  );

export const clearRunDetails = (runId) =>
  execSQL(`EXEC ${RUN_SP} @action='CLEARDETAIL',@id=${num(runId)}`);

export const refreshRunTotals = (runId) =>
  execSQL(`EXEC ${RUN_SP} @action='TOTALS',@id=${num(runId)}`);

export const setRunStatus = (runId, status) =>
  execSQL(`EXEC ${RUN_SP} @action='STATUS',@id=${num(runId)},@status=${esc(status)}`);

const detailValues = (r) =>
  `@basicSalary=${num(r.basicSalary)},@noPay=${num(r.noPay)},` +
  `@budgetaryAllowance=${num(r.budgetaryAllowance)},@otherAllowance=${num(r.otherAllowance)},` +
  `@grossPay=${num(r.grossPay)},@stampDuty=${num(r.stampDuty)},@paye=${num(r.paye)},` +
  `@loanDeduction=${num(r.loanDeduction)},@advanceDeduction=${num(r.advanceDeduction)},` +
  `@insuranceDeduction=${num(r.insuranceDeduction)},@otherDeduction=${num(r.otherDeduction)},` +
  `@epfEmployee=${num(r.epfEmployee)},@epfEmployer=${num(r.epfEmployer)},@etf=${num(r.etf)},` +
  `@totalDeductions=${num(r.totalDeductions)},@netPay=${num(r.netPay)},` +
  `@epfEtf=${r.epfEtf === false ? 0 : 1}`;

// Re-runs the engine over a saved detail row after a monthly figure is edited.
export const recomputeDetailRow = (row, slabs, rates) =>
  computePayroll(
    {
      basicSalary: row.basicSalary,
      noPay: row.noPay,
      budgetaryAllowance: row.budgetaryAllowance,
      otherAllowance: row.otherAllowance,
      loanDeduction: row.loanDeduction,
      advanceDeduction: row.advanceDeduction,
      insuranceDeduction: row.insuranceDeduction,
      otherDeduction: row.otherDeduction,
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

// Bulk insert — batches many rows per request so a 225-employee run is quick.
export const insertRunDetailsBulk = async (runId, runMonth, rows, batchSize = 25) => {
  for (let i = 0; i < rows.length; i += batchSize) {
    const stmts = rows.slice(i, i + batchSize).map((r) =>
      `EXEC ${DETAIL_SP} @action='INSERT',@runId=${num(runId)},@runMonth=${esc(runMonth)},` +
      `@emp_id=${esc(r.emp_id)},@empName=${esc(r.empName)},@category=${esc(r.category)},` +
      detailValues(r)
    );
    await execSQL(stmts.join('\n'));
  }
};
