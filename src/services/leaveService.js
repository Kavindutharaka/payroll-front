import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_leave';
const SP    = 'dbo.payroll_leave_sp';

export const fetchLeaves = () =>
  execSQL(`SELECT * FROM ${TABLE} ORDER BY id DESC`);

export const createLeave = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@leaveType=${esc(d.leaveType)},` +
    `@dateFrom=${esc(d.dateFrom)},@dateTo=${esc(d.dateTo)},@days=${num(d.days)},@reason=${esc(d.reason)}`
  );

export const updateLeaveStatus = (id, status) =>
  execSQL(`EXEC ${SP} @action='STATUS',@id=${id},@status=${esc(status)}`);

export const deleteLeave = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
