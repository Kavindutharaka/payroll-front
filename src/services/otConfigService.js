import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_ot_config';
const SP    = 'dbo.payroll_ot_config_sp';

export const fetchOTConfigs = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createOTConfig = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@multiplier=${num(d.multiplier)},` +
    `@hourDivision=${num(d.hourDivision)},@baseFormula=${esc(d.baseFormula)}`
  );

export const updateOTConfig = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@multiplier=${num(d.multiplier)},` +
    `@hourDivision=${num(d.hourDivision)},@baseFormula=${esc(d.baseFormula)}`
  );

export const deleteOTConfig = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
