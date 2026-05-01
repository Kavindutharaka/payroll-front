import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_bank_account';
const SP    = 'dbo.payroll_bank_account_sp';

export const fetchBankAccounts = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY emp_id, priority ASC`);

export const createBankAccount = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@bank=${esc(d.bank)},` +
    `@branch=${esc(d.branch)},@accountNum=${esc(d.accountNum)},@splitType=${esc(d.splitType)},` +
    `@splitValue=${num(d.splitValue)},@isDefault=${bit(d.isDefault)}`
  );

export const updateBankAccount = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@bank=${esc(d.bank)},` +
    `@branch=${esc(d.branch)},@accountNum=${esc(d.accountNum)},@splitType=${esc(d.splitType)},` +
    `@splitValue=${num(d.splitValue)},@isDefault=${bit(d.isDefault)}`
  );

export const deleteBankAccount = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
