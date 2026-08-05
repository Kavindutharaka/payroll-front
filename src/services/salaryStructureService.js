import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_salary_structure';
const SP    = 'dbo.payroll_salary_structure_sp';

export const fetchStructureByEmployee = (emp_id) =>
  execSQL(`SELECT * FROM ${TABLE} WHERE emp_id = ${esc(emp_id)} AND status != 'Deleted' ORDER BY id ASC`);

// Every employee's structure in one call — used by the payroll run so it
// doesn't fire one request per employee.
export const fetchAllStructures = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY emp_id, id`);

export const createStructureItem = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@componentName=${esc(d.componentName)},` +
    `@type=${esc(d.type)},@calcType=${esc(d.calcType)},@value=${num(d.value)},` +
    `@effectiveFrom=${esc(d.effectiveFrom)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)}`
  );

export const updateStructureItem = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@componentName=${esc(d.componentName)},` +
    `@type=${esc(d.type)},@calcType=${esc(d.calcType)},@value=${num(d.value)},` +
    `@effectiveFrom=${esc(d.effectiveFrom)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)}`
  );

export const deleteStructureItem = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
