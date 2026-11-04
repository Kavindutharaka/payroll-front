import { execSQL, execAtomic, esc, num } from './api';
import { assessmentYear, bonusLeaveCycle, bonusLateCycle } from './bonusTax';

const INC_SP   = 'dbo.payroll_increment_sp';
const BONUS_SP = 'dbo.payroll_bonus_sp';

/* ===================== INCREMENTS =====================
 * The client's flow, from the 6 August meeting: in the increment month the
 * rise is shown as its own line on the payslip; from the following month it
 * is simply part of basic salary. So an increment has two steps:
 *
 *   Draft   — amounts being typed in
 *   Applied — payroll for that month picks it up as an "Increment" line,
 *             basic salary is untouched
 *   Merged  — folded into basic salary, done once that month is paid
 * ====================================================== */

/* Budgetary allowance rides along so the sheet reads the way Nadee's figures
 * do - basic plus budgetary is the salary everyone quotes. It is read from the
 * salary structure for display only; the increment itself still only moves basic. */
export const fetchIncrements = (month) =>
  execSQL(`
    SELECT i.*,
           -- shown the payslip way; the name stored when the sheet was generated used the first name
           ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(e.initial,'') + ISNULL(e.initials,'') + ' ' + ISNULL(e.surName,''))), ''), i.empName) AS displayName,
           ISNULL((SELECT SUM(s.value) FROM dbo.payroll_salary_structure s
                   WHERE s.emp_id = i.emp_id AND s.status <> 'Deleted' AND s.type = 'Allowance'
                     AND s.componentName LIKE '%budgetary%'), 0) AS budgetaryAllowance
    FROM dbo.payroll_increment i
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = i.emp_id
    WHERE i.effectiveMonth = ${esc(month)}
    ORDER BY CAST(i.emp_id AS INT)
  `);

export const updateIncrement = (id, amount) =>
  execSQL(`EXEC ${INC_SP} @action='UPDATE',@id=${num(id)},@incrementAmount=${num(amount)}`);

export const applyIncrements = (month) =>
  execSQL(`EXEC ${INC_SP} @action='APPLY',@effectiveMonth=${esc(month)}`);

// Folds the applied increments into basic salary — run once the increment
// month has been paid, so the following month starts from the new basic.
export const mergeIncrementsIntoBasic = (month) =>
  execSQL(`EXEC ${INC_SP} @action='MERGE',@effectiveMonth=${esc(month)}`);

/* Taking a step back. Both return one row - affected, skipped, blocked - so the
 * screen can say exactly what happened.
 *   REVOKE  - Applied back to Draft, amounts kept, and the zero rows APPLY
 *             cleared away are put back so the sheet is whole again. Refused
 *             once that month's payroll is marked Paid.
 *   UNMERGE - Merged back to Applied, basic salary returned to its old figure
 *             for anyone whose basic has not been edited since. Refused once a
 *             later month has been paid on the new basic. */
export const revokeIncrements = (month) =>
  execSQL(`EXEC ${INC_SP} @action='REVOKE',@effectiveMonth=${esc(month)}`);

export const undoIncrementMerge = (month) =>
  execSQL(`EXEC ${INC_SP} @action='UNMERGE',@effectiveMonth=${esc(month)}`);

// Increments that should appear as their own line in a given payroll month.
export const fetchIncrementsForMonth = (month) =>
  execSQL(`EXEC dbo.payroll_increment_for_month_sp @runMonth=${esc(month)}`);

/* A regenerated sheet is sent as one all-or-nothing request, but the API answers
 * "OK" even when a statement after the first fails (everything is then rolled
 * back), so success is judged by what the sheet holds afterwards: the right
 * number of draft rows adding up to the right total. One retry, then an error -
 * otherwise a December sheet could silently keep its pre-increment basics. */
const regenerate = async (statements, check, rows, total) => {
  const holds = async () => {
    const r = await execSQL(check);
    return Number(r?.[0]?.n) === rows && Math.round(Number(r?.[0]?.total) || 0) === Math.round(total);
  };
  const attempt = async () => { try { await execAtomic(statements); } catch (e) { console.error(e); } };
  await attempt();
  if (await holds()) return;
  await attempt();
  if (!(await holds())) throw new Error('The sheet was not saved');
};

// Replaces the draft with a row for every active employee at their current
// basic - the old draft is cleared in the same request, so a dropped connection
// leaves the sheet as it was rather than half generated.
export const regenerateIncrementSheet = (month, employees) => regenerate(
  [
    `EXEC ${INC_SP} @action='CLEAR',@effectiveMonth=${esc(month)}`,
    ...employees.map((e) => {
      const basic = Number(e.basicSalary) || 0;
      return `EXEC ${INC_SP} @action='INSERT',@effectiveMonth=${esc(month)},` +
             `@emp_id=${esc(e.emp_id)},@empName=${esc(e.empName)},@category=${esc(e.category)},` +
             `@currentBasic=${basic},@incrementAmount=0,@newBasic=${basic}`;
    }),
  ],
  `SELECT COUNT(*) AS n, SUM(currentBasic) AS total FROM dbo.payroll_increment ` +
  `WHERE effectiveMonth=${esc(month)} AND status='Draft'`,
  employees.length,
  employees.reduce((a, e) => a + (Number(e.basicSalary) || 0), 0));

/* ======================= BONUS ========================
 * Client rule: one month's salary = Basic + Budgetary Allowance,
 * normally paid in December. Amounts stay editable per employee.
 * ====================================================== */

export const fetchBonuses = (month) =>
  execSQL(`
    SELECT b.*,
           ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(e.initial,'') + ISNULL(e.initials,'') + ' ' + ISNULL(e.surName,''))), ''), b.empName) AS displayName
    FROM dbo.payroll_bonus b
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = b.emp_id
    WHERE b.bonusMonth = ${esc(month)}
    ORDER BY CAST(b.emp_id AS INT)
  `);

/* What Tax Table 02 needs for each person on the sheet (see bonusTax.js):
 * monthly pay and PAYE already in the system this year of assessment, their
 * latest month (for months not in the system and months still to come), and
 * any bonus already finalised earlier in the same year. */
export const fetchBonusTaxInputs = (month) => {
  const ya = assessmentYear(month);
  return execSQL(`
    SELECT b.id, b.emp_id,
           ISNULL(p.months, 0) AS paidMonths, ISNULL(p.gross, 0) AS paidGross, ISNULL(p.paye, 0) AS paidPaye,
           l.grossPay AS latestGross, l.paye AS latestPaye,
           ISNULL(x.amount, 0) AS earlierAmount, ISNULL(x.paye, 0) AS earlierPaye,
           CONVERT(varchar(7), e.dateOfJoining, 120) AS joinedMonth
    FROM dbo.payroll_bonus b
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = b.emp_id
    LEFT JOIN (SELECT d.emp_id, COUNT(DISTINCT r.runMonth) AS months,
                      SUM(d.grossPay) AS gross, SUM(d.paye) AS paye
               FROM dbo.payroll_run_detail d
               INNER JOIN dbo.payroll_run r ON r.id = d.runId AND r.status <> 'Deleted'
               WHERE r.runMonth BETWEEN ${esc(ya.start)} AND ${esc(month)}
               GROUP BY d.emp_id) p ON p.emp_id = b.emp_id
    LEFT JOIN (SELECT emp_id, grossPay, paye FROM (
                 SELECT d.emp_id, d.grossPay, d.paye,
                        ROW_NUMBER() OVER (PARTITION BY d.emp_id ORDER BY r.runMonth DESC) AS rn
                 FROM dbo.payroll_run_detail d
                 INNER JOIN dbo.payroll_run r ON r.id = d.runId AND r.status <> 'Deleted'
                 WHERE r.runMonth <= ${esc(month)}) z WHERE rn = 1) l ON l.emp_id = b.emp_id
    LEFT JOIN (SELECT emp_id, SUM(bonusAmount) AS amount, SUM(ISNULL(paye, 0)) AS paye
               FROM dbo.payroll_bonus
               WHERE status = 'Finalised' AND bonusMonth BETWEEN ${esc(ya.start)} AND ${esc(ya.end)}
                 AND bonusMonth <> ${esc(month)}
               GROUP BY emp_id) x ON x.emp_id = b.emp_id
    WHERE b.bonusMonth = ${esc(month)}
  `);
};

/* Leave taken in the bonus leave cycle, from the leave records, maternity leave
 * left out. (Nothing has been recorded in the system yet, so this starts at
 * zero and Nadee types the days she has.) */
export const fetchBonusLeave = (month) => {
  const c = bonusLeaveCycle(month);
  return execSQL(`
    SELECT emp_id, SUM(days) AS days
    FROM dbo.payroll_leave
    WHERE status = 'Approved' AND leaveType NOT LIKE '%maternity%'
      AND dateFrom BETWEEN ${esc(c.from)} AND ${esc(c.to)}
    GROUP BY emp_id
  `);
};

// leave days and the bonus they lead to, saved together
export const saveBonusLeave = (id, leaveDays, bonusAmount) =>
  execSQL(`EXEC ${BONUS_SP} @action='LEAVE',@id=${num(id)},@leaveDays=${num(leaveDays)},@bonusAmount=${num(bonusAmount)}`);

/* Late days typed into the payroll each month, added up over the late-attendance
 * year (see bonusLateCycle): both totals come back, to June and to August, and
 * the sheet takes the one that fits the person's category. Only months that are
 * in the system count - earlier ones Nadee types. */
export const fetchBonusLate = (month) => {
  const t = bonusLateCycle(month, '');                  // Sep .. Jun
  const a = bonusLateCycle(month, 'Administrative');    // Sep .. Aug
  return execSQL(`
    SELECT d.emp_id,
           SUM(CASE WHEN r.runMonth <= ${esc(t.to)} THEN ISNULL(d.lateDays, 0) ELSE 0 END) AS toJune,
           SUM(ISNULL(d.lateDays, 0)) AS toAugust
    FROM dbo.payroll_run_detail d
    INNER JOIN dbo.payroll_run r ON r.id = d.runId AND r.status <> 'Deleted'
    WHERE r.runMonth BETWEEN ${esc(a.from)} AND ${esc(a.to)}
    GROUP BY d.emp_id
  `);
};

export const saveBonusLate = (id, lateDays, bonusAmount) =>
  execSQL(`EXEC ${BONUS_SP} @action='LATE',@id=${num(id)},@lateDays=${num(lateDays)},@bonusAmount=${num(bonusAmount)}`);

// stores the worked-out PAYE on each draft row, just before the sheet is finalised
export const saveBonusPaye = async (items, batchSize = 40) => {
  for (let i = 0; i < items.length; i += batchSize) {
    await execSQL(items.slice(i, i + batchSize)
      .map((x) => `EXEC ${BONUS_SP} @action='PAYE',@id=${num(x.id)},@paye=${num(x.paye)}`).join('\n'));
  }
};

export const updateBonus = (id, amount) =>
  execSQL(`EXEC ${BONUS_SP} @action='UPDATE',@id=${num(id)},@bonusAmount=${num(amount)}`);

export const finaliseBonuses = (month) =>
  execSQL(`EXEC ${BONUS_SP} @action='FINALISE',@bonusMonth=${esc(month)}`);

// clears the draft and writes the new one together, as with the increment sheet
export const regenerateBonusSheet = (month, rows) => regenerate(
  [
    `EXEC ${BONUS_SP} @action='CLEAR',@bonusMonth=${esc(month)}`,
    ...rows.map((r) =>
      `EXEC ${BONUS_SP} @action='INSERT',@bonusMonth=${esc(month)},` +
      `@emp_id=${esc(r.emp_id)},@empName=${esc(r.empName)},@category=${esc(r.category)},` +
      `@basicSalary=${num(r.basicSalary)},@budgetaryAllowance=${num(r.budgetaryAllowance)},` +
      `@bonusAmount=${num(r.bonusAmount)},@leaveDays=${num(r.leaveDays ?? 0)},@lateDays=${num(r.lateDays ?? 0)}`
    ),
  ],
  `SELECT COUNT(*) AS n, SUM(bonusAmount) AS total FROM dbo.payroll_bonus ` +
  `WHERE bonusMonth=${esc(month)} AND status='Draft'`,
  rows.length,
  rows.reduce((a, r) => a + (Number(r.bonusAmount) || 0), 0));
