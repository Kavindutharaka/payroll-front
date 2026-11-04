import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_loan';
const SP    = 'dbo.payroll_loan_sp';

// The loan type says which payslip deduction line its installments belong on,
// so it travels with the loan rather than being guessed from the type's name.
// Named the way the payslip names people, and in EPF number order.
export const fetchLoans = () =>
  execSQL(
    `SELECT l.*, lt.linkedComponent, lt.installmentMethod, ` +
    `LTRIM(RTRIM(ISNULL(e.initial,'') + ISNULL(e.initials,'') + ' ' + ISNULL(e.surName,''))) AS empName ` +
    `FROM ${TABLE} l ` +
    `LEFT JOIN dbo.payroll_loan_type lt ON lt.id = l.loanTypeId ` +
    `LEFT JOIN dbo.payroll_employee e ON e.emp_id = l.emp_id ` +
    `ORDER BY CAST(l.emp_id AS INT), l.id`
  );

/* What a loan takes in one payroll month. The monthly figure is rounded down
 * and the last installment takes whatever is left, so exactly the amount payable
 * is recovered: 22,940 over 12 is eleven of 1,911 and a final 1,919, where
 * rounding to the nearest took 1,912 twelve times - 22,944.
 * Counted from the start date, so a loan takes nothing before it starts and
 * stops on its own after the last installment. */
export const installmentFor = (loan, runMonth) => {
  const monthly = Number(loan.monthlyInstallment || 0);
  const count   = Number(loan.installments || 0);
  const start   = /^(\d{4})-(\d{2})/.exec(String(loan.startDate || ""));
  const run     = /^(\d{4})-(\d{2})/.exec(String(runMonth || ""));
  if (!start || !run || count <= 0) return monthly;   // nothing to count from
  const n = (run[1] - start[1]) * 12 + (run[2] - start[2]) + 1;   // 1 = the start month
  if (n < 1 || n > count) return 0;
  if (n < count) return monthly;
  return Math.max(0, Number(loan.totalPayable || 0) - monthly * (count - 1));
};

const pad = (n) => String(n).padStart(2, '0');
const monthIndex = (ym) => { const [y, m] = String(ym).split('-').map(Number); return y * 12 + (m - 1); };
const monthOf = (i) => `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
const monthName = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
};

// the payroll months a loan is recovered in: "Oct 2026", or "May 2026 – Feb 2027"
export const loanMonths = (loan) => {
  const start = /^(\d{4})-(\d{2})/.exec(String(loan.startDate || ''));
  const count = Number(loan.installments || 0);
  if (!start || count <= 0) return '';
  const first = `${start[1]}-${start[2]}`;
  const last  = monthOf(monthIndex(first) + count - 1);
  return count === 1 ? monthName(first) : `${monthName(first)} – ${monthName(last)}`;
};

// flat rate: the interest in total payable, spread evenly over the installments
export const monthlyInterestOf = (loan) => {
  const n = Number(loan.installments || 0);
  return n > 0 ? Math.round((Number(loan.totalPayable || 0) - Number(loan.principal || 0)) / n) : 0;
};

/* Where a loan stands on a date, worked out from its installment schedule. The
 * stored balance is never reduced when a payroll is paid, so every loan read 0%
 * paid and Active for ever - De Mel's one-installment loan of September was
 * still an "active repayment" in October, while the Loan Deductions report
 * rightly had nothing for it. A month counts as recovered once it has ended by
 * the date given; the installments are the ones the payroll takes (installmentFor).
 *   state: Closed (closed by hand) | Completed | Upcoming (starts later) | Active */
export const loanStanding = (loan, asOf) => {
  const total = Number(loan.totalPayable || 0);
  const count = Number(loan.installments || 0);
  const start = /^(\d{4})-(\d{2})/.exec(String(loan.startDate || ''));
  const [y, m, d] = String(asOf).slice(0, 10).split('-').map(Number);
  const asOfMonth = y * 12 + (m - 1);
  const ended = d >= new Date(y, m, 0).getDate() ? asOfMonth : asOfMonth - 1;   // last month that has ended
  let recovered = 0, state = 'Active';
  if (start && count > 0) {
    const first = Number(start[1]) * 12 + (Number(start[2]) - 1);
    const done  = Math.max(0, Math.min(count, ended - first + 1));
    for (let i = 0; i < done; i += 1) recovered += installmentFor(loan, monthOf(first + i));
    // a monthly figure raised later (a settlement) reads back into past months; never past the total
    recovered = Math.min(recovered, total);
    if (done >= count) state = 'Completed';
    else if (first > asOfMonth) state = 'Upcoming';
  }
  if (loan.status === 'Closed') state = 'Closed';
  const outstanding = state === 'Closed' ? 0 : Math.max(0, total - recovered);
  return { recovered, outstanding, state, paidPct: total > 0 ? Math.round((recovered / total) * 100) : 0 };
};

export const createLoan = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@loanTypeId=${num(d.loanTypeId)},` +
    `@loanType=${esc(d.loanType)},@principal=${num(d.principal)},@interestRate=${num(d.interestRate)},` +
    `@totalPayable=${num(d.totalPayable)},@installments=${num(d.installments)},` +
    `@monthlyInstallment=${num(d.monthlyInstallment)},@remaining=${num(d.totalPayable)},` +
    `@startDate=${esc(d.startDate)}`
  );

// Editing a live loan: the employee is fixed (change that and it is a different
// loan), but every figure can move - a resignation settles the balance early.
export const updateLoan = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${num(id)},@loanTypeId=${num(d.loanTypeId)},` +
    `@loanType=${esc(d.loanType)},@principal=${num(d.principal)},@interestRate=${num(d.interestRate)},` +
    `@totalPayable=${num(d.totalPayable)},@installments=${num(d.installments)},` +
    `@monthlyInstallment=${num(d.monthlyInstallment)},@remaining=${num(d.remaining)},` +
    `@startDate=${esc(d.startDate)}`
  );

export const closeLoan = (id) =>
  execSQL(`EXEC ${SP} @action='CLOSE',@id=${id}`);
