import { execSQL, esc, num, bit } from './api';

const TABLE = 'dbo.payroll_employee';
const SP    = 'dbo.payroll_employee_sp';

// Includes a read-only pay summary pulled from the salary structure:
// budgetary allowance (part of the EPF base) and other fixed allowances.
export const fetchEmployees = () =>
  execSQL(`
    SELECT e.*,
           ISNULL(s.budgetary, 0) AS budgetaryAllowance,
           ISNULL(s.other, 0)     AS fixedAllowance,
           (ISNULL(e.basicSalary,0) + ISNULL(s.budgetary,0) + ISNULL(s.other,0)) AS totalPackage
    FROM ${TABLE} e
    OUTER APPLY (
      SELECT
        SUM(CASE WHEN LOWER(componentName) LIKE '%budgetary%' THEN value ELSE 0 END) AS budgetary,
        SUM(CASE WHEN LOWER(componentName) LIKE '%budgetary%' THEN 0 ELSE value END) AS other
      FROM dbo.payroll_salary_structure
      WHERE emp_id = e.emp_id AND status <> 'Deleted' AND type = 'Allowance'
    ) s
    WHERE e.status != 'Deleted'
    ORDER BY CAST(e.emp_id AS INT)
  `);

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
    `@emp_id=${esc(e.emp_id)},@initial=${esc(e.initial)},@initials=${esc(e.initials)},` +
    `@firstName=${esc(e.firstName)},` +
    `@midName=${esc(e.midName)},@surName=${esc(e.surName)},@nic=${esc(e.nic)},` +
    `@dob=${esc(e.dob)},@address=${esc(e.address)},@title=${esc(e.title)},` +
    `@designation=${esc(e.designation)},@dateOfJoining=${esc(e.dateOfJoining)},` +
    `@dateOfResignation=${esc(e.dateOfResignation)},` +
    `@category=${esc(e.category)},@employmentType=${esc(e.employmentType)},` +
    `@position=${esc(e.position)},@level=${esc(e.level)},` +
    `@contactNo=${esc(e.contactNo)},@emergencyContactNo=${esc(e.emergencyContactNo)},` +
    `@basicSalary=${num(e.basicSalary)},` +
    `@taxMode=${esc(e.taxMode)},@epfEtf=${bit(e.epfEtf)},@epfEtfName=${esc(e.epfEtfName)},` +
    `@paymentMode=${esc(e.paymentMode)},@tin=${esc(e.tin)},@tinName=${esc(e.tinName)},@newNic=${esc(e.newNic)},@remarks=${esc(e.remarks)},@fullName=${esc(e.fullName)},@contractStartDate=${esc(e.employmentType === 'Permanent Staff on Contract' ? e.contractStartDate : null)},@contractEndDate=${esc(e.employmentType === 'Permanent Staff on Contract' ? e.contractEndDate : null)},` +
    `@accountName=${esc(e.accountName)},@bank=${esc(e.bank)},` +
    `@branch=${esc(e.branch)},@accountNum=${esc(e.accountNum)},` +
    `@bankCode=${esc(e.bankCode)},@branchCode=${esc(e.branchCode)}`
  );

export const updateEmployee = (id, e) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},` +
    `@emp_id=${esc(e.emp_id)},@initial=${esc(e.initial)},@initials=${esc(e.initials)},` +
    `@firstName=${esc(e.firstName)},` +
    `@midName=${esc(e.midName)},@surName=${esc(e.surName)},@nic=${esc(e.nic)},` +
    `@dob=${esc(e.dob)},@address=${esc(e.address)},@title=${esc(e.title)},` +
    `@designation=${esc(e.designation)},@dateOfJoining=${esc(e.dateOfJoining)},` +
    `@dateOfResignation=${esc(e.dateOfResignation)},` +
    `@category=${esc(e.category)},@employmentType=${esc(e.employmentType)},` +
    `@position=${esc(e.position)},@level=${esc(e.level)},` +
    `@contactNo=${esc(e.contactNo)},@emergencyContactNo=${esc(e.emergencyContactNo)},` +
    `@basicSalary=${num(e.basicSalary)},` +
    `@taxMode=${esc(e.taxMode)},@epfEtf=${bit(e.epfEtf)},@epfEtfName=${esc(e.epfEtfName)},` +
    `@paymentMode=${esc(e.paymentMode)},@tin=${esc(e.tin)},@tinName=${esc(e.tinName)},@newNic=${esc(e.newNic)},@remarks=${esc(e.remarks)},@fullName=${esc(e.fullName)},@contractStartDate=${esc(e.employmentType === 'Permanent Staff on Contract' ? e.contractStartDate : null)},@contractEndDate=${esc(e.employmentType === 'Permanent Staff on Contract' ? e.contractEndDate : null)},` +
    `@accountName=${esc(e.accountName)},@bank=${esc(e.bank)},` +
    `@branch=${esc(e.branch)},@accountNum=${esc(e.accountNum)},` +
    `@bankCode=${esc(e.bankCode)},@branchCode=${esc(e.branchCode)}`
  );

export const deleteEmployee = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
