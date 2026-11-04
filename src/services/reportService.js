import { execSQL, esc } from './api';
import { loanStanding, loanMonths } from './loanService';

/* ------------------------------------------------------------------
 * Aggregate queries behind the Dashboard and Reports pages.
 * The API returns only the first result set, so anything that needs
 * several numbers at once is written as one row of scalar subqueries.
 * ------------------------------------------------------------------ */

// "Resigned" is derived from the resignation date, the same rule the
// employee list uses — the status column only marks soft-deletes.
/* One name everywhere. The payslip shows "Mrs.S.R Fernando"; the reports used to
 * print the full first name, so the same person read differently on a payslip and
 * on an EPF statement. Built from the employee master at read time so runs
 * calculated before this still come out in the new format. */
const NAME_SQL = (a) =>
  `LTRIM(RTRIM(ISNULL(${a}.initial,'') + ISNULL(${a}.initials,'') + ' ' + ISNULL(${a}.surName,'')))`;

/* The name the tax office knows. The Tax report and PAYE statement go to the
 * tax office, which has no titles and no dots: "S R Fernando", not
 * "Mrs.S.R Fernando". A TIN reference name, where someone registered under a
 * different name, is used exactly as typed. Every other report keeps NAME_SQL. */
const TIN_NAME_SQL = (a) => {
  // dots become spaces, then runs of spaces fold to one - over the whole name,
  // since a few surnames were keyed with a double space as well
  const squeeze = (s) => `REPLACE(REPLACE(REPLACE(${s}, '   ', ' '), '  ', ' '), '  ', ' ')`;
  const built = squeeze(`LTRIM(RTRIM(REPLACE(ISNULL(${a}.initials,''), '.', ' ') + ' ' + ISNULL(${a}.surName,'')))`);
  return `ISNULL(NULLIF(LTRIM(RTRIM(${a}.tinName)), ''), ${built})`;
};

/* Every report runs over a From-To range now, not a single month. A payroll run
 * is a whole month, so a range takes in each month it touches - 1 April to
 * 31 March is the tax year, 1 to 30 September is just September. */
export const rangeOf = (from, to) => ({
  from, to,
  fromMonth: String(from || '').slice(0, 7),
  toMonth:   String(to || '').slice(0, 7),
});

/* Run rows inside a range, from runs that have not been retired. The month is
 * taken from the run, not from each row: September's rows were once saved
 * labelled August, and filtering on the row label counted them into August
 * and left September empty. */
const RUN_ROWS = (r) =>
  `SELECT d.* FROM dbo.payroll_run_detail d ` +
  `INNER JOIN dbo.payroll_run rr ON rr.id = d.runId AND rr.status <> 'Deleted' ` +
  `WHERE rr.runMonth BETWEEN ${esc(r.fromMonth)} AND ${esc(r.toMonth)}`;

export const fetchDashboardStats = () =>
  execSQL(`
    SELECT
      (SELECT COUNT(*) FROM dbo.payroll_employee
        WHERE status <> 'Deleted'
          AND (dateOfResignation IS NULL OR dateOfResignation > GETDATE()))                     AS activeEmployees,
      (SELECT COUNT(*) FROM dbo.payroll_employee
        WHERE status <> 'Deleted'
          AND dateOfResignation IS NOT NULL AND dateOfResignation <= GETDATE())                 AS resignedEmployees,
      (SELECT COUNT(*) FROM dbo.payroll_leave    WHERE status = 'Pending')                      AS pendingLeave,
      (SELECT COUNT(*) FROM dbo.payroll_loan     WHERE status = 'Active')                       AS activeLoans,
      (SELECT ISNULL(SUM(remaining), 0) FROM dbo.payroll_loan WHERE status = 'Active')          AS loanOutstanding,
      (SELECT COUNT(*) FROM dbo.payroll_salary_component WHERE status <> 'Deleted')             AS componentCount
  `);

export const fetchRunSummary = (limit = 6) =>
  execSQL(`
    SELECT TOP ${Number(limit)} id, runMonth, status, employeeCount,
           totalGross, totalDeductions, totalEpfEmployee, totalEpfEmployer,
           totalEtf, totalNet, calculatedAt
    FROM dbo.payroll_run
    WHERE status <> 'Deleted'
    ORDER BY runMonth DESC
  `);

export const fetchPayrollSummaryReport = (r) =>
  execSQL(`
    SELECT runMonth, status, employeeCount, totalGross, totalDeductions,
           totalEpfEmployee, totalEpfEmployer, totalEtf, totalNet
    FROM dbo.payroll_run
    WHERE status <> 'Deleted'
      AND runMonth BETWEEN ${esc(r.fromMonth)} AND ${esc(r.toMonth)}
    ORDER BY runMonth DESC
  `);

/* Some staff are registered for tax under a different name from the one on their
 * EPF and bank - a maiden name, or the name on a newer NIC. The TIN reference
 * name holds that, and only this report uses it; everywhere else the EPF number
 * and the usual name stay the key. Blank falls back to the usual name. */
/* Some staff are registered for tax under a different name from the one on their
 * EPF and bank - a maiden name, or the name on a newer NIC. The TIN reference
 * name holds that, and only this report and the PAYE statement use it.
 *
 * Over several months the tax office wants one line per person with the months
 * running across - September gross and PAYE, then October, and so on - and the
 * totals at the end, not the same person repeated down the page. */
export const fetchTaxReport = async (r) => {
  const rows = await execSQL(`
    SELECT x.emp_id, x.runMonth, ${TIN_NAME_SQL('e')} AS empName, e.tin, e.nic, e.newNic,
           x.grossPay, x.paye
    FROM (SELECT d.emp_id, rr.runMonth, SUM(d.grossPay) AS grossPay, SUM(d.paye) AS paye
          FROM dbo.payroll_run_detail d
          INNER JOIN dbo.payroll_run rr ON rr.id = d.runId AND rr.status <> 'Deleted'
          WHERE rr.runMonth BETWEEN ${esc(r.fromMonth)} AND ${esc(r.toMonth)}
          GROUP BY d.emp_id, rr.runMonth) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT), x.runMonth
  `);
  const byEmp = new Map();
  (Array.isArray(rows) ? rows : []).forEach((d) => {
    const key = String(d.emp_id);
    if (!byEmp.has(key)) {
      byEmp.set(key, { emp_id: d.emp_id, empName: d.empName, tin: d.tin, nic: d.nic, newNic: d.newNic, grossPay: 0, paye: 0 });
    }
    const o = byEmp.get(key);
    const m = String(d.runMonth).replace('-', '');
    o[`g_${m}`] = Number(d.grossPay) || 0;
    o[`p_${m}`] = Number(d.paye) || 0;
    o.grossPay += Number(d.grossPay) || 0;
    o.paye     += Number(d.paye) || 0;
  });
  // only people who paid tax somewhere in the period
  return [...byEmp.values()].filter((o) => o.paye > 0);
};

// the YYYY-MM months a range covers, oldest first
export const monthsInRange = (r) => {
  const out = [];
  let [y, m] = String(r.fromMonth).split('-').map(Number);
  const [ty, tm] = String(r.toMonth).split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
};

export const fetchEpfEtfReport = (r) =>
  execSQL(`
    SELECT x.emp_id, ${NAME_SQL('e')} AS empName, x.basicSalary, x.budgetaryAllowance, x.increment, x.salaryAdjustment, x.noPay,
           -- what the fund is contributed on: basic and budgetary, less any no-pay
           (x.basicSalary - x.noPay + x.budgetaryAllowance + x.increment + x.salaryAdjustment) AS totalEarnings,
           x.epfEmployee, x.epfEmployer, x.etf
    FROM (SELECT emp_id,
                 SUM(ISNULL(basicSalary,0)) AS basicSalary, SUM(ISNULL(budgetaryAllowance,0)) AS budgetaryAllowance,
                 SUM(ISNULL(noPay,0)) AS noPay, SUM(ISNULL(increment,0)) AS increment,
                 SUM(ISNULL(salaryAdjustment,0)) AS salaryAdjustment,
                 SUM(epfEmployee) AS epfEmployee, SUM(epfEmployer) AS epfEmployer, SUM(etf) AS etf
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id
          HAVING SUM(epfEmployee) > 0 OR SUM(epfEmployer) > 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);

/* Loans that had started by the end of the range, grouped by loan type with a
 * subtotal row under each group - festival advances, personal loans, insurance.
 * Recovered, outstanding and status are as at the To date, from each loan's
 * installment schedule (loanStanding): the stored balance is never reduced, which
 * is why a loan recovered in full in September still read "Active" in October. */
const STATE_ORDER = { Active: 0, Upcoming: 1, Completed: 2, Closed: 3 };

export const fetchLoanReport = async (r) => {
  const rows = await execSQL(`
    SELECT l.emp_id,
           ${NAME_SQL('e')} AS empName,
           l.loanType, l.principal, l.interestRate, l.totalPayable,
           l.installments, l.monthlyInstallment, l.remaining, l.status,
           CONVERT(varchar(10), l.startDate, 120) AS startDate
    FROM dbo.payroll_loan l
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = l.emp_id
    WHERE l.startDate IS NULL OR l.startDate <= ${esc(r.to)}
  `);
  const list = (Array.isArray(rows) ? rows : []).map((l) => {
    const st = loanStanding(l, r.to);
    return { ...l, months: loanMonths(l), recovered: st.recovered, remaining: st.outstanding, status: st.state };
  }).sort((a, b) =>
    String(a.loanType || '').localeCompare(String(b.loanType || '')) ||
    (STATE_ORDER[a.status] - STATE_ORDER[b.status]) ||
    (Number(a.emp_id) - Number(b.emp_id)));
  const out = [];
  let group = null;
  const close = () => {
    if (!group) return;
    out.push({ _subtotal: true, emp_id: '', empName: `${group.type} — ${group.n} loan${group.n === 1 ? '' : 's'}, ${group.active} still recovering`,
               loanType: '', principal: group.principal, monthlyInstallment: group.monthly,
               recovered: group.recovered, remaining: group.remaining, status: '' });
  };
  list.forEach((l) => {
    const type = l.loanType || 'Other';
    if (!group || group.type !== type) { close(); group = { type, n: 0, active: 0, principal: 0, monthly: 0, recovered: 0, remaining: 0 }; }
    group.n += 1;
    if (l.status === 'Active' || l.status === 'Upcoming') group.active += 1;
    group.principal += Number(l.principal) || 0;
    group.monthly   += Number(l.monthlyInstallment) || 0;
    group.recovered += Number(l.recovered) || 0;
    group.remaining += Number(l.remaining) || 0;
    out.push(l);
  });
  close();
  return out;
};

// leave that overlaps the range at all
export const fetchLeaveReport = (r) =>
  execSQL(`
    SELECT lv.emp_id,
           ${NAME_SQL('e')} AS empName,
           lv.leaveType, lv.days, lv.status,
           CONVERT(varchar(10), lv.dateFrom, 120) AS dateFrom,
           CONVERT(varchar(10), lv.dateTo,   120) AS dateTo,
           lv.reason
    FROM dbo.payroll_leave lv
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = lv.emp_id
    WHERE lv.dateFrom <= ${esc(r.to)} AND lv.dateTo >= ${esc(r.from)}
    ORDER BY CAST(lv.emp_id AS INT), lv.id DESC
  `);

// over several months each figure is the employee's total for the range
export const fetchPayrollDetailReport = (r) =>
  execSQL(`
    SELECT x.*, ${NAME_SQL('e')} AS empName
    FROM (SELECT emp_id, MAX(category) AS category,
                 SUM(ISNULL(basicSalary,0)) AS basicSalary,
                 SUM(ISNULL(noPay,0)) AS noPay,
                 SUM(ISNULL(noPayDays,0)) AS noPayDays,
                 SUM(ISNULL(budgetaryAllowance,0)) AS budgetaryAllowance,
                 SUM(ISNULL(increment,0)) AS increment,
                 SUM(ISNULL(otherAllowance,0)) AS otherAllowance,
                 -- what was actually paid: the allowance less the late-days cut
                 SUM(ISNULL(formTeacherAllowance,0) - ISNULL(formTeacherDeduction,0)) AS formTeacherAllowance,
                 SUM(ISNULL(lateDays,0)) AS lateDays,
                 SUM(ISNULL(salaryAdjustment,0)) AS salaryAdjustment,
                 SUM(ISNULL(grossPay,0)) AS grossPay,
                 SUM(ISNULL(stampDuty,0)) AS stampDuty,
                 SUM(ISNULL(paye,0)) AS paye,
                 SUM(ISNULL(loanDeduction,0)) AS loanDeduction,
                 SUM(ISNULL(advanceDeduction,0)) AS advanceDeduction,
                 SUM(ISNULL(festivalAdvance,0)) AS festivalAdvance,
                 SUM(ISNULL(insuranceDeduction,0)) AS insuranceDeduction,
                 SUM(ISNULL(otherDeduction,0)) AS otherDeduction,
                 SUM(ISNULL(epfEmployee,0)) AS epfEmployee,
                 SUM(ISNULL(epfEmployer,0)) AS epfEmployer,
                 SUM(ISNULL(etf,0)) AS etf,
                 SUM(ISNULL(totalDeductions,0)) AS totalDeductions,
                 SUM(ISNULL(netPay,0)) AS netPay,
                 SUM(ISNULL(attendanceAllowance,0)) AS attendanceAllowance
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);

/* The shorter payroll sheet Nadee prints (Adjustments-3, item 8): her 18 columns.
 * Allowances is everything in gross besides basic and budgetary - class teacher,
 * the named allowances, an increment line, a salary adjustment - so each row reads
 * Basic + Budg. Allow. + Allowances − No Pay = Gross. Total deductions is the
 * payroll's own total, so Net Pay is exactly what was paid. */
export const fetchPayrollPrintSheet = async (r) => {
  const rows = await fetchPayrollDetailReport(r);
  return (Array.isArray(rows) ? rows : []).map((d) => ({
    ...d,
    allowances: Number(d.grossPay || 0) - Number(d.basicSalary || 0)
      - Number(d.budgetaryAllowance || 0) + Number(d.noPay || 0),
  }));
};

/* ---- Statutory statements ----------------------------------------
 * These match the client's own upload files column-for-column:
 *   EPF June 2026.xlsm                      (15 columns)
 *   ETF Contribution File Generator .xlsm   (8 columns)
 * Employer constants come from their files: EPF employer 22016 / zone A,
 * ETF employer "A 022016". Days worked is 30 less any no-pay days.
 * NIC is the fund-registered one — some staff have since been issued a new
 * NIC, but the funds still transfer against the number they hold. EPF and ETF
 * are registered separately and differ for a handful of members, so each
 * statement uses its own fund's details.
 * ------------------------------------------------------------------ */

export const EPF_EMPLOYER_NO = '22016';
export const EPF_ZONE        = 'A';
export const ETF_EMPLOYER_NO = 'A 022016';

// EPF upload format. Surname and initials are the EPF-registered ones,
// kept as separate columns exactly as the fund expects them.
export const fetchEpfStatement = (month) => {
  const period = String(month).replace('-', '');            // 2026-06 -> 202606
  return execSQL(`
    SELECT ISNULL(e.epfNic, e.nic)                 AS nicNumber,
           ISNULL(e.epfSurname, e.surName)         AS surname,
           ISNULL(e.epfInitials, e.initials)       AS initials,
           d.emp_id                                AS memberNumber,
           (d.epfEmployee + d.epfEmployer)         AS totalContribution,
           d.epfEmployer                           AS employerContribution,
           d.epfEmployee                           AS memberContribution,
           (ISNULL(d.basicSalary,0) - ISNULL(d.noPay,0)
              + ISNULL(d.budgetaryAllowance,0) + ISNULL(d.increment,0) + ISNULL(d.salaryAdjustment,0)) AS totalEarnings,
           -- N in the month someone joins, V in the month they leave, E otherwise
           CASE WHEN e.dateOfResignation >= ${esc(month + '-01')}
                 AND e.dateOfResignation <  DATEADD(MONTH, 1, ${esc(month + '-01')}) THEN 'V'
                WHEN e.dateOfJoining     >= ${esc(month + '-01')}
                 AND e.dateOfJoining     <  DATEADD(MONTH, 1, ${esc(month + '-01')}) THEN 'N'
                ELSE 'E' END                       AS memberStatus,
           '${EPF_ZONE}'                           AS zone,
           '${EPF_EMPLOYER_NO}'                    AS employerNumber,
           '${period}'                             AS contributionPeriod,
           1                                       AS dataSubmissionNumber,
           (30 - ISNULL(d.noPayDays, 0))           AS daysWorked,
           e.occupationGrade                       AS occupationGrade
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    WHERE r.runMonth = ${esc(month)} AND r.status <> 'Deleted' AND d.epfEmployee > 0
    ORDER BY CAST(d.emp_id AS INT)
  `);
};

// ETF upload format. Member number is zero-padded to 6 digits and the
// contribution period is the first and last day of the month.
export const fetchEtfStatement = (month) => {
  const [y, m] = String(month).split('-').map(Number);
  const from = `${y}/${String(m).padStart(2, '0')}/01`;
  const last = new Date(y, m, 0).getDate();
  const to   = `${y}/${String(m).padStart(2, '0')}/${String(last).padStart(2, '0')}`;
  return execSQL(`
    SELECT ISNULL(e.etfNic, ISNULL(e.epfNic, e.nic))            AS nicNumber,
           ISNULL(e.etfSurname, ISNULL(e.epfSurname, e.surName))  AS surname,
           ISNULL(e.etfInitials, ISNULL(e.epfInitials, e.initials)) AS initials,
           RIGHT('000000' + CAST(d.emp_id AS VARCHAR(10)), 6) AS memberNumber,
           d.etf                             AS totalContribution,
           '${ETF_EMPLOYER_NO}'              AS employerNumber,
           '${from}'                         AS periodFrom,
           '${to}'                           AS periodTo
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    WHERE r.runMonth = ${esc(month)} AND r.status <> 'Deleted' AND d.etf > 0
    ORDER BY CAST(d.emp_id AS INT)
  `);
};

export const fetchStampDutyStatement = (r) =>
  execSQL(`
    SELECT x.emp_id, ${NAME_SQL('e')} AS empName, x.category, x.grossPay, x.stampDuty
    FROM (SELECT emp_id, MAX(category) AS category, SUM(grossPay) AS grossPay, SUM(stampDuty) AS stampDuty
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id HAVING SUM(stampDuty) > 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);

export const fetchPayeStatement = (r) =>
  execSQL(`
    SELECT x.emp_id, ${TIN_NAME_SQL('e')} AS empName, e.tin, e.nic, e.newNic, x.category, x.grossPay, x.paye
    FROM (SELECT emp_id, MAX(category) AS category, SUM(grossPay) AS grossPay, SUM(paye) AS paye
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id HAVING SUM(paye) > 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);

/* ---- Analysis ---- */

// Current month vs the month before, per employee.
/* Nadee reconciles each deduction against its own schedule — insurance against
 * the insurer's list, festival advances against the advance register — so one
 * combined column was no use. Each kind gets its own report, listing only the
 * people who actually had it. */
const DEDUCTION_KINDS = {
  insurance: { column: 'insuranceDeduction', label: 'Insurance' },
  advance:   { column: 'advanceDeduction',   label: 'Salary Advance' },
  festival:  { column: 'festivalAdvance',    label: 'Festival Advance' },
  loan:      { column: 'loanDeduction',      label: 'Loan' },
  other:     { column: 'otherDeduction',     label: 'Other Deductions' },
};

export const fetchDeductionReport = (kind, r) => {
  const spec = DEDUCTION_KINDS[kind];
  if (!spec) return Promise.resolve([]);
  if (kind === 'loan') return fetchLoanDeductionReport(r);
  // just who and how much - Nadee checks these against the insurer's list and
  // the advance register, where gross and net only get in the way
  return execSQL(`
    SELECT x.emp_id, ${NAME_SQL('e')} AS empName, x.amount
    FROM (SELECT emp_id, SUM(ISNULL(${spec.column}, 0)) AS amount
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id
          HAVING SUM(ISNULL(${spec.column}, 0)) <> 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);
};

/* Only the people whose gross moved. With everyone listed the handful of real
 * changes were lost among two hundred rows of zero. */
/* Loan installments split into what repays the loan and what is interest. A loan
 * is flat-rate - total payable is principal plus interest, spread evenly - so each
 * rupee recovered is principal / total payable capital and the rest interest. The
 * ratio is taken over the person's own loans (the ones that land on the Loan line,
 * not festival advances, salary advances or insurance). */
const fetchLoanDeductionReport = (r) =>
  execSQL(`
    SELECT x.emp_id, ${NAME_SQL('e')} AS empName,
           ROUND(x.amount * ISNULL(k.ratio, 1), 0)                 AS capital,
           x.amount - ROUND(x.amount * ISNULL(k.ratio, 1), 0)      AS interest,
           x.amount
    FROM (SELECT emp_id, SUM(ISNULL(loanDeduction, 0)) AS amount
          FROM (${RUN_ROWS(r)}) d GROUP BY emp_id
          HAVING SUM(ISNULL(loanDeduction, 0)) <> 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    LEFT JOIN (SELECT l.emp_id,
                      SUM(l.principal) / NULLIF(SUM(l.totalPayable), 0) AS ratio
               FROM dbo.payroll_loan l
               LEFT JOIN dbo.payroll_loan_type lt ON lt.id = l.loanTypeId
               WHERE ISNULL(lt.linkedComponent, '') NOT LIKE '%festival%'
                 AND ISNULL(lt.linkedComponent, '') NOT LIKE '%advance%'
                 AND ISNULL(lt.linkedComponent, '') NOT LIKE '%insurance%'
               GROUP BY l.emp_id) k ON k.emp_id = x.emp_id
    ORDER BY CAST(x.emp_id AS INT)
  `);

/* Each change in gross with its reason spelt out, so Nadee does not have to open
 * two payrolls side by side: "Basic +5,000 · Club & Societies allowance +2,300 ·
 * No pay 0 → 2 days −4,833". Gross is basic + budgetary + increment + salary
 * adjustment + class teacher + allowances − no pay, so those are compared one by
 * one, and the allowances by name from each month's breakdown line. Anything
 * left unexplained is shown as "Other" so the reasons always add up. */
/* Allowances by name from a breakdown line. Keyed loosely - "Allowance" was
 * renamed "Other allowance" on 24 September, and compared by exact name the
 * same 3,000 showed as −3,000 and +3,000. `names` keeps a label for each key. */
const allowanceKey = (name) => name.toLowerCase().replace(/\s*allowance$/, '').trim() || 'other';
const breakdownByName = (text, names = {}) => {
  const out = {};
  String(text || '').split('·').forEach((part) => {
    const m = /^(.*?)\s+([\d,]+(?:\.\d+)?)\s*$/.exec(part.trim());
    if (!m) return;
    const k = allowanceKey(m[1]);
    names[k] = /^allowance$/i.test(m[1]) ? 'Other allowance' : m[1];
    out[k] = (out[k] || 0) + (Number(m[2].replace(/,/g, '')) || 0);
  });
  return out;
};
const signed = (n) => `${n > 0 ? '+' : '−'}${Math.abs(Math.round(n)).toLocaleString()}`;
const shortMonthName = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
};

const comparisonReason = (c, p, month, prev) => {
  if (!p) return `New — not in the ${shortMonthName(prev)} payroll`;
  if (!c) return `Not in the ${shortMonthName(month)} payroll`;
  const parts = [];
  let explained = 0;
  const add = (label, d) => { if (Math.round(d) !== 0) { parts.push(`${label} ${signed(d)}`); explained += d; } };
  add('Basic', c.basicSalary - p.basicSalary);
  add('Budgetary', c.budgetaryAllowance - p.budgetaryAllowance);
  add('Increment', c.increment - p.increment);
  add('Salary adj.', c.salaryAdjustment - p.salaryAdjustment);
  add('Class teacher', c.formTeacher - p.formTeacher);
  const names = {};
  const pn = breakdownByName(p.allowanceBreakdown, names), cn = breakdownByName(c.allowanceBreakdown, names);
  [...new Set([...Object.keys(pn), ...Object.keys(cn)])].sort()
    .forEach((k) => add(names[k], (cn[k] || 0) - (pn[k] || 0)));
  const sum = (o) => Object.values(o).reduce((a, v) => a + v, 0);
  add('Allowances not itemised', (c.otherAllowance - sum(cn)) - (p.otherAllowance - sum(pn)));
  const noPay = -(c.noPay - p.noPay);   // more no pay, less gross
  if (Math.round(noPay) !== 0) {
    parts.push(`No pay ${Number(p.noPayDays) || 0} → ${Number(c.noPayDays) || 0} days ${signed(noPay)}`);
    explained += noPay;
  }
  const rest = (c.grossPay - p.grossPay) - explained;
  if (Math.abs(rest) >= 1) parts.push(`Other ${signed(rest)}`);
  return parts.join(' · ');
};

export const fetchMonthComparison = async (month) => {
  const [y, m] = String(month).split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const rows = await execSQL(`
    SELECT d.emp_id, rr.runMonth, ${NAME_SQL('e')} AS empName, d.empName AS savedName,
           ISNULL(d.basicSalary,0) AS basicSalary, ISNULL(d.budgetaryAllowance,0) AS budgetaryAllowance,
           ISNULL(d.increment,0) AS increment, ISNULL(d.salaryAdjustment,0) AS salaryAdjustment,
           ISNULL(d.formTeacherAllowance,0) - ISNULL(d.formTeacherDeduction,0) AS formTeacher,
           ISNULL(d.otherAllowance,0) AS otherAllowance, ISNULL(d.noPay,0) AS noPay,
           ISNULL(d.noPayDays,0) AS noPayDays, ISNULL(d.grossPay,0) AS grossPay, d.allowanceBreakdown
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run rr ON rr.id = d.runId AND rr.status <> 'Deleted'
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    WHERE rr.runMonth IN (${esc(month)}, ${esc(prev)})
  `);
  const byEmp = new Map();
  (Array.isArray(rows) ? rows : []).forEach((d) => {
    const k = String(d.emp_id);
    if (!byEmp.has(k)) byEmp.set(k, { emp_id: d.emp_id, empName: d.empName || d.savedName });
    byEmp.get(k)[d.runMonth === month ? 'c' : 'p'] = d;
  });
  return [...byEmp.values()]
    .map(({ emp_id, empName, c, p }) => ({
      emp_id, empName,
      prevGross: p ? Number(p.grossPay) : 0,
      currGross: c ? Number(c.grossPay) : 0,
      difference: (c ? Number(c.grossPay) : 0) - (p ? Number(p.grossPay) : 0),
      reason: comparisonReason(c, p, month, prev),
    }))
    .filter((x) => Math.round(x.difference) !== 0)
    .sort((a, b) => Number(a.emp_id) - Number(b.emp_id));
};

// Per-employee allowance breakdown by component (Club & Societies, Sports, Form Teacher…).
export const fetchAllowanceBreakdown = () =>
  execSQL(`
    SELECT s.componentName,
           COUNT(*)              AS employeeCount,
           SUM(s.value)          AS totalAmount,
           AVG(s.value)          AS averageAmount
    FROM dbo.payroll_salary_structure s
    WHERE s.status <> 'Deleted' AND s.type = 'Allowance'
      -- an allowance whose period has ended is no longer being paid
      AND (s.effectiveTo IS NULL OR s.effectiveTo >= CAST(GETDATE() AS date))
    GROUP BY s.componentName
    ORDER BY SUM(s.value) DESC
  `);

/* Nadee's monthly "Allowance Details" sheet: one row per person, a column per
 * allowance, then the allowance total and the gross (basic + budgetary +
 * allowances). Read from that month's payroll run so it shows what was paid.
 * Budgetary and class-teacher allowance are stored as their own figures; the
 * rest come from the run's breakdown line ("Sports allowance 4,400 · ...").
 * Anything the breakdown does not name lands in Other, so every row still adds
 * up to exactly what the payroll paid. */
const ALLOWANCE_COLUMN = [
  [/increase/i,            'increase'],
  [/travel/i,              'travelling'],
  [/battaramulla|b'?mulla/i,'bmulla'],
  [/sport/i,               'sports'],
  [/club/i,                'clubs'],
  [/shuttle/i,             'shuttle'],
  [/t\.?\s*p\.?\s*allow/i, 'tp'],
];
export const ALLOWANCE_KEYS = ['travelling', 'classTeacher', 'other', 'increase', 'bmulla', 'sports', 'clubs', 'shuttle', 'tp'];

export const fetchCategoryAllowanceReport = async (month) => {
  const rows = await execSQL(`
    SELECT d.emp_id, ${NAME_SQL('e')} AS empName,
           ISNULL(d.basicSalary,0) AS basicSalary, ISNULL(d.budgetaryAllowance,0) AS budgetaryAllowance,
           ISNULL(d.formTeacherAllowance,0) - ISNULL(d.formTeacherDeduction,0) AS formTeacher,
           ISNULL(d.otherAllowance,0) AS otherTotal,
           d.allowanceBreakdown
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    WHERE r.runMonth = ${esc(month)} AND r.status <> 'Deleted'
    ORDER BY CAST(d.emp_id AS INT)
  `);
  return (Array.isArray(rows) ? rows : []).map((d) => {
    const out = Object.fromEntries(ALLOWANCE_KEYS.map((k) => [k, 0]));
    out.classTeacher = Number(d.formTeacher) || 0;
    let named = 0;
    String(d.allowanceBreakdown || '').split('·').forEach((part) => {
      const m = /^(.*?)\s+([\d,]+(?:\.\d+)?)\s*$/.exec(part.trim());
      if (!m) return;
      const amount = Number(m[2].replace(/,/g, '')) || 0;
      const hit = ALLOWANCE_COLUMN.find(([re]) => re.test(m[1]));
      if (!hit) return;                 // "Other allowance" and the unnamed fall through
      out[hit[1]] += amount;
      named += amount;
    });
    out.other = Math.max(0, (Number(d.otherTotal) || 0) - named);
    const allowanceTotal = ALLOWANCE_KEYS.reduce((a, k) => a + out[k], 0);
    return {
      emp_id: d.emp_id, empName: d.empName,
      basicSalary: d.basicSalary, budgetaryAllowance: d.budgetaryAllowance,
      ...out, allowanceTotal,
      grossSalary: Number(d.basicSalary) + Number(d.budgetaryAllowance) + allowanceTotal,
    };
  });
};

/* Contract staff with their age, for the start-of-year renewal review.
 * The client asked for this so contracts can be checked against age. */
/* Age as at the end of the period chosen. 55 is when a contract has to be
 * renewed and 60 is mandatory retirement, so everyone 55 or over by that date is
 * listed with which of the two applies and the day they reach 60. Every
 * employment type is included - all current staff are recorded as Permanent. */
export const fetchContractRenewalReport = (asOf) => {
  const at = esc(asOf);
  const age = `(DATEDIFF(YEAR, e.dob, ${at})
             - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, e.dob, ${at}), e.dob) > ${at} THEN 1 ELSE 0 END)`;
  return execSQL(`
    SELECT e.emp_id, ${NAME_SQL('e')} AS empName, e.category, e.employmentType,
           CONVERT(varchar(10), e.dob, 120)                   AS dob,
           ${age}                                             AS age,
           CASE WHEN ${age} >= 60 THEN 'Mandatory retirement' ELSE 'Contract renewal' END AS action,
           CONVERT(varchar(10), DATEADD(YEAR, 60, e.dob), 120) AS reaches60,
           CONVERT(varchar(10), e.dateOfJoining, 120)          AS dateOfJoining
    FROM dbo.payroll_employee e
    WHERE e.status <> 'Deleted' AND e.dob IS NOT NULL
      AND (e.dateOfResignation IS NULL OR e.dateOfResignation > ${at})
      AND ${age} >= 55
    ORDER BY ${age} DESC, CAST(e.emp_id AS INT)
  `);
};

/* Permanent staff kept on under a contract (usually past 55), for watching
 * renewals: age today, the contract dates and the days left until it ends.
 * Soonest to end first; no end date entered goes last. */
export const fetchContractStaffReport = () =>
  execSQL(`
    SELECT e.emp_id, ${NAME_SQL('e')} AS empName,
           CONVERT(varchar(10), e.dob, 120) AS dob,
           DATEDIFF(YEAR, e.dob, GETDATE())
             - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, e.dob, GETDATE()), e.dob) > GETDATE() THEN 1 ELSE 0 END AS age,
           CONVERT(varchar(10), e.contractStartDate, 120) AS contractStartDate,
           CONVERT(varchar(10), e.contractEndDate, 120)   AS contractEndDate,
           DATEDIFF(DAY, CAST(GETDATE() AS date), e.contractEndDate) AS daysRemaining
    FROM dbo.payroll_employee e
    WHERE e.status <> 'Deleted' AND e.employmentType = 'Permanent Staff on Contract'
      AND (e.dateOfResignation IS NULL OR e.dateOfResignation > GETDATE())
    ORDER BY CASE WHEN e.contractEndDate IS NULL THEN 1 ELSE 0 END, e.contractEndDate, CAST(e.emp_id AS INT)
  `);

/* Everyone currently employed, one block per category with a heading row that
 * gives the category and its head count. */
export const fetchEmployeeListReport = async () => {
  const rows = await execSQL(`
    SELECT e.emp_id, ${NAME_SQL('e')} AS empName,
           ISNULL(NULLIF(e.designation,''), e.title) AS designation,
           e.employmentType, CONVERT(varchar(10), e.dateOfJoining, 120) AS dateOfJoining,
           e.nic, ISNULL(NULLIF(e.category,''), 'No category') AS category
    FROM dbo.payroll_employee e
    WHERE e.status <> 'Deleted'
      AND (e.dateOfResignation IS NULL OR e.dateOfResignation > GETDATE())
    ORDER BY CASE WHEN NULLIF(e.category,'') IS NULL THEN 1 ELSE 0 END, e.category,
             TRY_CAST(e.emp_id AS INT), e.emp_id
  `);
  const out = [];
  const list = Array.isArray(rows) ? rows : [];
  list.forEach((x, i) => {
    if (i === 0 || list[i - 1].category !== x.category) {
      const n = list.filter((y) => y.category === x.category).length;
      out.push({ _subtotal: true, emp_id: '', empName: `${x.category.replace(' - ', ' — ')} — ${n} employee${n === 1 ? '' : 's'}` });
    }
    out.push(x);
  });
  return out;
};

/* ---------------- CSV export (client-side, no backend needed) ---------------- */

export const toCSV = (rows, columns) => {
  if (!rows?.length) return '';
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  /* Branch code 005 and account numbers with a leading zero are identifiers, not
   * quantities — Excel drops the zero the moment they look numeric. ="005" is the
   * one form Excel reliably keeps as text. */
  const cell = (c, v) => {
    if (!c.text) return escape(v);
    const t = v === null || v === undefined ? '' : String(v);
    return t === '' ? '' : `="${t.replace(/"/g, '""')}"`;
  };
  const head = cols.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => cols.map((c) => cell(c, r[c.key])).join(',')).join('\n');
  return `${head}\n${body}`;
};

export const downloadCSV = (filename, rows, columns) => {
  const csv = toCSV(rows, columns);
  if (!csv) return false;
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};
