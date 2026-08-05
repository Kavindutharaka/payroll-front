import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_employee';
const SP    = 'dbo.payroll_employee_sp';

export const fetchEmployees = () =>
  execSQL(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id DESC`);

// Currently-employed staff only — use for new transactions (loans, leave, bank accounts)
// so resigned employees can't be selected. The full list above still shows everyone.
export const fetchActiveEmployees = () =>
  execSQL(
    `SELECT * FROM ${TABLE} WHERE status = 'Active' ` +
    `AND (dateOfResignation IS NULL OR dateOfResignation > GETDATE()) ORDER BY emp_id ASC`
  );

export const createEmployee = (e) =>
  execSQL(
    `EXEC ${SP} @action='INSERT',` +
    `@emp_id=${esc(e.emp_id)},@initial=${esc(e.initial)},@firstName=${esc(e.firstName)},` +
    `@midName=${esc(e.midName)},@surName=${esc(e.surName)},@nic=${esc(e.nic)},` +
    `@dob=${esc(e.dob)},@address=${esc(e.address)},@title=${esc(e.title)},` +
    `@designation=${esc(e.designation)},@dateOfJoining=${esc(e.dateOfJoining)},` +
    `@dateOfResignation=${esc(e.dateOfResignation)},` +
    `@category=${esc(e.category)},@employmentType=${esc(e.employmentType)},` +
    `@position=${esc(e.position)},@level=${esc(e.level)},` +
    `@contactNo=${esc(e.contactNo)},@emergencyContactNo=${esc(e.emergencyContactNo)},` +
    `@basicSalary=${num(e.basicSalary)},` +
    `@taxMode=${esc(e.taxMode)},@epfEtf=${bit(e.epfEtf)},@epfEtfName=${esc(e.epfEtfName)},` +
    `@accountName=${esc(e.accountName)},@bank=${esc(e.bank)},` +
    `@branch=${esc(e.branch)},@accountNum=${esc(e.accountNum)},` +
    `@bankCode=${esc(e.bankCode)},@branchCode=${esc(e.branchCode)}`
  );

export const updateEmployee = (id, e) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},` +
    `@emp_id=${esc(e.emp_id)},@initial=${esc(e.initial)},@firstName=${esc(e.firstName)},` +
    `@midName=${esc(e.midName)},@surName=${esc(e.surName)},@nic=${esc(e.nic)},` +
    `@dob=${esc(e.dob)},@address=${esc(e.address)},@title=${esc(e.title)},` +
    `@designation=${esc(e.designation)},@dateOfJoining=${esc(e.dateOfJoining)},` +
    `@dateOfResignation=${esc(e.dateOfResignation)},` +
    `@category=${esc(e.category)},@employmentType=${esc(e.employmentType)},` +
    `@position=${esc(e.position)},@level=${esc(e.level)},` +
    `@contactNo=${esc(e.contactNo)},@emergencyContactNo=${esc(e.emergencyContactNo)},` +
    `@basicSalary=${num(e.basicSalary)},` +
    `@taxMode=${esc(e.taxMode)},@epfEtf=${bit(e.epfEtf)},@epfEtfName=${esc(e.epfEtfName)},` +
    `@accountName=${esc(e.accountName)},@bank=${esc(e.bank)},` +
    `@branch=${esc(e.branch)},@accountNum=${esc(e.accountNum)},` +
    `@bankCode=${esc(e.bankCode)},@branchCode=${esc(e.branchCode)}`
  );

export const deleteEmployee = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
