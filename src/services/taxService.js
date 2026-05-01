import { execSQL, esc, num } from './api';

const MODE_TABLE = 'dbo.payroll_tax_mode';
const MODE_SP    = 'dbo.payroll_tax_mode_sp';
const SLAB_TABLE = 'dbo.payroll_tax_slab';
const SLAB_SP    = 'dbo.payroll_tax_slab_sp';

// Tax Modes
export const fetchTaxModes = () =>
  execSQL(`SELECT * FROM ${MODE_TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createTaxMode = (d) =>
  execSQL(`EXEC ${MODE_SP} @action='INSERT',@name=${esc(d.name)},@effectiveDate=${esc(d.effectiveDate)}`);

export const updateTaxMode = (id, d) =>
  execSQL(`EXEC ${MODE_SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@effectiveDate=${esc(d.effectiveDate)}`);

export const deleteTaxMode = (id) =>
  execSQL(`EXEC ${MODE_SP} @action='DELETE',@id=${id}`);

// Tax Slabs
export const fetchTaxSlabs = (modeName) =>
  execSQL(`SELECT * FROM ${SLAB_TABLE} WHERE modeName = ${esc(modeName)} AND status != 'Deleted' ORDER BY fromAmount ASC`);

export const createTaxSlab = (d) =>
  execSQL(
    `EXEC ${SLAB_SP} @action='INSERT',@taxModeId=${num(d.taxModeId)},@modeName=${esc(d.modeName)},` +
    `@fromAmount=${num(d.fromAmount)},@toAmount=${num(d.toAmount)},` +
    `@rate=${num(d.rate)},@effectiveDate=${esc(d.effectiveDate)}`
  );

export const updateTaxSlab = (id, d) =>
  execSQL(
    `EXEC ${SLAB_SP} @action='UPDATE',@id=${id},@fromAmount=${num(d.fromAmount)},` +
    `@toAmount=${num(d.toAmount)},@rate=${num(d.rate)},@effectiveDate=${esc(d.effectiveDate)}`
  );

export const deleteTaxSlab = (id) =>
  execSQL(`EXEC ${SLAB_SP} @action='DELETE',@id=${id}`);
