import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_loan_type';
const SP    = 'dbo.payroll_loan_type_sp';

export const fetchLoanTypes = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id ASC`);

export const createLoanType = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@name=${esc(d.name)},@interestRate=${num(d.interestRate)},` +
    `@maxAmount=${num(d.maxAmount)},@installmentMethod=${esc(d.installmentMethod)},` +
    `@linkedComponent=${esc(d.linkedComponent)}`
  );

export const updateLoanType = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@name=${esc(d.name)},@interestRate=${num(d.interestRate)},` +
    `@maxAmount=${num(d.maxAmount)},@installmentMethod=${esc(d.installmentMethod)},` +
    `@linkedComponent=${esc(d.linkedComponent)}`
  );

export const deleteLoanType = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
