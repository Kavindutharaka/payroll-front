import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_leave';
const SP    = 'dbo.payroll_leave_sp';

// with the employee's name, so the list reads by person rather than by number
export const fetchLeaves = () =>
  execSQL(`
    SELECT l.*,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ' ' + ISNULL(e.firstName,'') + ' ' + ISNULL(e.surName,''))) AS empName
    FROM ${TABLE} l
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = l.emp_id
    ORDER BY l.id DESC
  `);

export const createLeave = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@leaveType=${esc(d.leaveType)},` +
    `@dateFrom=${esc(d.dateFrom)},@dateTo=${esc(d.dateTo)},@days=${num(d.days)},@reason=${esc(d.reason)}`
  );

export const updateLeaveStatus = (id, status) =>
  execSQL(`EXEC ${SP} @action='STATUS',@id=${id},@status=${esc(status)}`);

export const deleteLeave = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);

/* Approved no-pay leave days falling in a given month, per employee.
 * Used to pre-fill the No Pay column when payroll is calculated —
 * the figure stays editable afterwards. */
export const fetchNoPayDaysForMonth = (runMonth) =>
  execSQL(`
    SELECT lv.emp_id, SUM(ISNULL(lv.days, 0)) AS noPayDays
    FROM dbo.payroll_leave lv
    INNER JOIN dbo.payroll_leave_type lt ON lt.name = lv.leaveType AND lt.status <> 'Deleted'
    WHERE lv.status = 'Approved'
      AND lt.affectsSalary = 1
      AND CONVERT(varchar(7), lv.dateFrom, 120) = ${esc(runMonth)}
    GROUP BY lv.emp_id
  `);
