import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_salary_component';
const SP    = 'dbo.payroll_salary_component_sp';

export const fetchSalaryComponents = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createSalaryComponent = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@type=${esc(d.type)},` +
    `@calcType=${esc(d.calcType)},@defaultValue=${num(d.defaultValue)},@formula=${esc(d.formula)},` +
    `@effectiveDate=${esc(d.effectiveDate)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)},@mandatory=${bit(d.mandatory)}`
  );

export const updateSalaryComponent = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@type=${esc(d.type)},` +
    `@calcType=${esc(d.calcType)},@defaultValue=${num(d.defaultValue)},@formula=${esc(d.formula)},` +
    `@effectiveDate=${esc(d.effectiveDate)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)},@mandatory=${bit(d.mandatory)}`
  );

export const archiveSalaryComponent = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
