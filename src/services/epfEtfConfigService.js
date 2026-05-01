import { execSQL, num, bit, esc } from './api';

const TABLE = 'dbo.payroll_epfetf_config';
const SP    = 'dbo.payroll_epfetf_config_sp';

export const fetchEPFETFConfig = () =>
  execSQL(`SELECT TOP 1 * FROM ${TABLE} ORDER BY id DESC`);

export const saveEPFETFConfig = (d) =>
  execSQL(
    `EXEC ${SP} @action='UPSERT',` +
    `@employeeContribution=${num(d.employeeContribution)},` +
    `@employerContributionEPF=${num(d.employerContributionEPF)},` +
    `@employerContributionETF=${num(d.employerContributionETF)},` +
    `@appliesTo=${esc(d.appliesTo)},@enabled=${bit(d.enabled)}`
  );
