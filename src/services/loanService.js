import { execSQL, esc, num } from './api';

const TABLE = 'dbo.payroll_loan';
const SP    = 'dbo.payroll_loan_sp';

export const fetchLoans = () =>
  execSQL(`SELECT * FROM ${TABLE} ORDER BY id DESC`);

export const createLoan = (d) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',@emp_id=${esc(d.emp_id)},@loanTypeId=${num(d.loanTypeId)},` +
    `@loanType=${esc(d.loanType)},@principal=${num(d.principal)},@interestRate=${num(d.interestRate)},` +
    `@totalPayable=${num(d.totalPayable)},@installments=${num(d.installments)},` +
    `@monthlyInstallment=${num(d.monthlyInstallment)},@remaining=${num(d.totalPayable)},` +
    `@startDate=${esc(d.startDate)}`
  );

export const closeLoan = (id) =>
  execSQL(`EXEC ${SP} @action='CLOSE',@id=${id}`);
