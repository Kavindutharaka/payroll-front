import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_bank_account';
const SP    = 'dbo.payroll_bank_account_sp';

// Joined to the employee so the list can show who each account belongs to.
export const fetchBankAccounts = () =>
  execSQL(`
    SELECT b.*,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ' ' + ISNULL(e.firstName,'') + ' ' + ISNULL(e.surName,''))) AS empName
    FROM ${TABLE} b
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = b.emp_id
    WHERE b.status != 'Deleted'
    ORDER BY CAST(b.emp_id AS INT), b.priority ASC
  `);

const values = (d) =>
  `@accountName=${esc(d.accountName)},@bank=${esc(d.bank)},@branch=${esc(d.branch)},` +
  `@accountNum=${esc(d.accountNum)},@bankCode=${esc(d.bankCode)},@branchCode=${esc(d.branchCode)},` +
  `@splitType=${esc(d.splitType)},@splitValue=${num(d.splitValue)},@isDefault=${bit(d.isDefault)}`;

export const createBankAccount = (d) =>
  execSQL(`EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},${values(d)}`);

export const updateBankAccount = (id, d) =>
  execSQL(`EXEC ${SP} @action='UPDATE',@id=${id},${values(d)}`);

export const deleteBankAccount = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);

/* Sampath bulk salary transfer file.
 * Column order and headers copied from the client's own
 * "SALARY FORMAT - June '2026.xls": NAME / ACCOUNT NO. / BANK / BRANCH / AMOUNT / ID
 * Only bank-paid staff appear — cash and cheque are handled separately.
 * AMOUNT is net pay plus the attendance allowance, which the client works
 * out separately for support staff and pays in the same transfer. */
export const fetchSalaryPaymentFile = (runMonth) =>
  execSQL(`
    SELECT ISNULL(${pick('accountName', 'accountName')}, d.empName) AS name,
           ${pick('accountNum', 'accountNum')}   AS accountNo,
           ${pick('bankCode', 'bankCode')}       AS bank,
           ${pick('branchCode', 'branchCode')}   AS branch,
           (d.netPay + ISNULL(d.attendanceAllowance, 0)) AS amount,
           d.emp_id                         AS id
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    LEFT JOIN ${TABLE} b ON b.emp_id = d.emp_id AND b.isDefault = 1 AND b.status <> 'Deleted'
    WHERE r.runMonth = ${esc(runMonth)} AND r.status <> 'Deleted' AND d.netPay > 0
      AND ISNULL(e.paymentMode, 'Bank') = 'Bank'
    ORDER BY CAST(d.emp_id AS INT)
  `);

/* Bank details are kept up to date in Employee Master - new starters and changed
 * accounts (1386-1398, 771) exist only there - so that is read first, as a whole
 * set, and the Bank Accounts table is only the fallback for anyone without them. */
const HAS_EM = `NULLIF(LTRIM(RTRIM(e.accountNum)), '') IS NOT NULL`;
const pick = (em, ba) => `CASE WHEN ${HAS_EM} THEN e.${em} ELSE b.${ba} END`;

/* The same people and amounts as the payment file, with the bank and branch
 * written out. The payment file itself has to stay exactly in Sampath's upload
 * layout, so the names Nadee checks against live in this separate report. */
export const fetchBankDetailsReport = (runMonth) =>
  execSQL(`
    SELECT d.emp_id,
           ${pick('accountName', 'accountName')} AS accountName,
           ${pick('bank', 'bank')}               AS bank,
           ${pick('bankCode', 'bankCode')}       AS bankCode,
           ${pick('branch', 'branch')}           AS branch,
           ${pick('branchCode', 'branchCode')}   AS branchCode,
           ${pick('accountNum', 'accountNum')}   AS accountNo,
           (d.netPay + ISNULL(d.attendanceAllowance, 0)) AS amount
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = d.emp_id
    LEFT JOIN ${TABLE} b ON b.emp_id = d.emp_id AND b.isDefault = 1 AND b.status <> 'Deleted'
    WHERE r.runMonth = ${esc(runMonth)} AND r.status <> 'Deleted' AND d.netPay > 0
      AND ISNULL(e.paymentMode, 'Bank') = 'Bank'
    ORDER BY CAST(d.emp_id AS INT)
  `);

/* Staff paid outside the bank run — cash, or a cheque held pending clearance.
 * Takes a month or a report range; over a range each person's amounts add up. */
// `mode` narrows it to Cash or Cheque - Nadee files the two separately
export const fetchNonBankPayments = (period, mode) => {
  const r = typeof period === 'string' ? { fromMonth: period, toMonth: period } : period;
  return execSQL(`
    SELECT x.emp_id,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ISNULL(e.initials,'') + ' ' + ISNULL(e.surName,''))) AS empName,
           x.category,
           ISNULL(e.paymentMode, 'Bank')  AS paymentMode,
           CONVERT(varchar(10), e.dateOfResignation, 120) AS dateOfResignation,
           x.netPay, x.attendanceAllowance,
           (x.netPay + x.attendanceAllowance) AS totalPaid
    FROM (SELECT d.emp_id, MAX(d.category) AS category, SUM(d.netPay) AS netPay,
                 SUM(ISNULL(d.attendanceAllowance,0)) AS attendanceAllowance
          FROM dbo.payroll_run_detail d
          INNER JOIN dbo.payroll_run rr ON rr.id = d.runId AND rr.status <> 'Deleted'
          WHERE rr.runMonth BETWEEN ${esc(r.fromMonth)} AND ${esc(r.toMonth)}
          GROUP BY d.emp_id HAVING SUM(d.netPay) > 0) x
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = x.emp_id
    WHERE ISNULL(e.paymentMode, 'Bank') <> 'Bank'
      ${mode ? `AND e.paymentMode = ${esc(mode)}` : ''}
    ORDER BY ISNULL(e.paymentMode,'Bank'), CAST(x.emp_id AS INT)
  `);
};