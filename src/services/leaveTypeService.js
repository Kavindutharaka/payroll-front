import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_leave_type';
const SP    = 'dbo.payroll_leave_type_sp';

export const fetchLeaveTypes = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createLeaveType = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@annualLimit=${num(d.annualLimit)},` +
    `@paid=${bit(d.paid)},@carryForward=${bit(d.carryForward)},@affectsSalary=${bit(d.affectsSalary)}`
  );

export const updateLeaveType = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@annualLimit=${num(d.annualLimit)},` +
    `@paid=${bit(d.paid)},@carryForward=${bit(d.carryForward)},@affectsSalary=${bit(d.affectsSalary)}`
  );

export const deleteLeaveType = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
