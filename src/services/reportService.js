import { execSQL, esc } from './api';

/* ------------------------------------------------------------------
 * Aggregate queries behind the Dashboard and Reports pages.
 * The API returns only the first result set, so anything that needs
 * several numbers at once is written as one row of scalar subqueries.
 * ------------------------------------------------------------------ */

export const fetchDashboardStats = () =>
  execSQL(`
    SELECT
      (SELECT COUNT(*) FROM dbo.payroll_employee WHERE status = 'Active')                       AS activeEmployees,
      (SELECT COUNT(*) FROM dbo.payroll_employee WHERE status = 'Resigned')                     AS resignedEmployees,
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

export const fetchPayrollSummaryReport = () =>
  execSQL(`
    SELECT runMonth, status, employeeCount, totalGross, totalDeductions,
           totalEpfEmployee, totalEpfEmployer, totalEtf, totalNet
    FROM dbo.payroll_run
    WHERE status <> 'Deleted'
    ORDER BY runMonth DESC
  `);

export const fetchTaxReport = (month) =>
  execSQL(`
    SELECT emp_id, empName, category, grossPay, paye
    FROM dbo.payroll_run_detail
    WHERE runMonth = ${esc(month)} AND paye > 0
    ORDER BY paye DESC
  `);

export const fetchEpfEtfReport = (month) =>
  execSQL(`
    SELECT emp_id, empName, basicSalary, budgetaryAllowance,
           epfEmployee, epfEmployer, etf
    FROM dbo.payroll_run_detail
    WHERE runMonth = ${esc(month)} AND (epfEmployee > 0 OR epfEmployer > 0)
    ORDER BY CAST(emp_id AS INT)
  `);

export const fetchLoanReport = () =>
  execSQL(`
    SELECT l.emp_id,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ' ' + ISNULL(e.firstName,'') + ' ' + ISNULL(e.surName,''))) AS empName,
           l.loanType, l.principal, l.interestRate, l.totalPayable,
           l.installments, l.monthlyInstallment, l.remaining, l.status,
           CONVERT(varchar(10), l.startDate, 120) AS startDate
    FROM dbo.payroll_loan l
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = l.emp_id
    ORDER BY l.status, l.id DESC
  `);

export const fetchLeaveReport = () =>
  execSQL(`
    SELECT lv.emp_id,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ' ' + ISNULL(e.firstName,'') + ' ' + ISNULL(e.surName,''))) AS empName,
           lv.leaveType, lv.days, lv.status,
           CONVERT(varchar(10), lv.dateFrom, 120) AS dateFrom,
           CONVERT(varchar(10), lv.dateTo,   120) AS dateTo,
           lv.reason
    FROM dbo.payroll_leave lv
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = lv.emp_id
    ORDER BY lv.id DESC
  `);

export const fetchPayrollDetailReport = (month) =>
  execSQL(`
    SELECT emp_id, empName, category, basicSalary, noPay, budgetaryAllowance,
           otherAllowance, grossPay, stampDuty, paye, loanDeduction,
           advanceDeduction, insuranceDeduction, otherDeduction,
           epfEmployee, epfEmployer, etf, totalDeductions, netPay
    FROM dbo.payroll_run_detail
    WHERE runMonth = ${esc(month)}
    ORDER BY CAST(emp_id AS INT)
  `);

/* ---------------- CSV export (client-side, no backend needed) ---------------- */

export const toCSV = (rows, columns) => {
  if (!rows?.length) return '';
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => escape(c.label)).join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c.key])).join(',')).join('\n');
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
