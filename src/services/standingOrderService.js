import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_standing_order';
const SP    = 'dbo.payroll_standing_order_sp';

export const fetchStandingOrders = () =>
  execSQL(`
    SELECT o.*,
           LTRIM(RTRIM(ISNULL(e.initial,'') + ' ' + ISNULL(e.firstName,'') + ' ' + ISNULL(e.surName,''))) AS empName
    FROM ${TABLE} o
    LEFT JOIN dbo.payroll_employee e ON e.emp_id = o.emp_id
    WHERE o.status != 'Deleted'
    ORDER BY o.id DESC
  `);

export const createStandingOrder = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@description=${esc(d.description)},` +
    `@type=${esc(d.type)},@amount=${num(d.amount)},@effectiveFrom=${esc(d.effectiveFrom)}`
  );

export const updateStandingOrder = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@description=${esc(d.description)},` +
    `@type=${esc(d.type)},@amount=${num(d.amount)},@effectiveFrom=${esc(d.effectiveFrom)}`
  );

export const deleteStandingOrder = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
