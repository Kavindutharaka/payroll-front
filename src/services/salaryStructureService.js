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
    `@effectiveFrom=${esc(d.effectiveFrom)},@effectiveTo=${esc(d.effectiveTo)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)}`
  );

export const updateStructureItem = (id, d) =>
  execSQL(
    `EXEC ${SP} @action='UPDATE',@id=${id},@componentName=${esc(d.componentName)},` +
    `@type=${esc(d.type)},@calcType=${esc(d.calcType)},@value=${num(d.value)},` +
    `@effectiveFrom=${esc(d.effectiveFrom)},@effectiveTo=${esc(d.effectiveTo)},@taxable=${bit(d.taxable)},` +
    `@epfApplicable=${bit(d.epfApplicable)},@etfApplicable=${bit(d.etfApplicable)}`
  );

/* Which payroll months a component is paid in. Until now the payroll ignored the
 * Effective From date altogether - every active component was paid every month.
 *
 * Open-ended (no To date): paid every month from the month it starts, the way a
 *   regular allowance or a joiner's components work.
 * A set period (From and To): Nadee's allowances run on their own cycles - Club &
 *   Societies 16th to 15th, Sports 11th to 10th - so each cycle is paid in the month
 *   it closes. The cut-off is the day before the From day, or the month end for a
 *   period starting on the 1st:
 *     16 Sep - 15 Oct  ->  October
 *     11 Sep - 10 Dec  ->  October, November, December
 *     1 Oct  - 31 Dec  ->  October, November, December */
const pad = (n) => String(n).padStart(2, '0');
const day10 = (v) => (v ? String(v).slice(0, 10) : '');

export const componentPaysIn = (c, runMonth) => {
  const from = day10(c.effectiveFrom), to = day10(c.effectiveTo);
  const [y, m] = String(runMonth).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const monthEnd = `${runMonth}-${pad(last)}`;
  if (!to) return !from || from <= monthEnd;
  const fromDay = from ? Number(from.slice(8, 10)) : 1;
  const cut = fromDay <= 1 ? monthEnd : `${runMonth}-${pad(Math.min(fromDay - 1, last))}`;
  return (!from || cut >= from) && cut <= to;
};

const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
};

// "Paid in Oct 2026" / "Paid in Oct 2026 – Dec 2026" / "Paid every month from Oct 2026",
// shown under the dates so the effect of the rule above is visible before saving
export const paidMonthsText = (from, to) => {
  const f = day10(from), t = day10(to);
  if (!f) return '';
  if (!t) return `Paid every month from ${monthName(f.slice(0, 7))}`;
  if (t < f) return 'The end date is before the start date';
  const months = [];
  let [y, m] = f.slice(0, 7).split('-').map(Number);
  const end = t.slice(0, 7);
  for (let i = 0; i < 60; i += 1) {
    const ym = `${y}-${pad(m)}`;
    if (componentPaysIn({ effectiveFrom: f, effectiveTo: t }, ym)) months.push(ym);
    if (ym >= end) break;
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  if (!months.length) return 'Not paid in any month - the period closes before its first cut-off';
  return months.length === 1
    ? `Paid in ${monthName(months[0])}`
    : `Paid in ${monthName(months[0])} – ${monthName(months[months.length - 1])} (${months.length} months)`;
};

export const deleteStructureItem = (id) =>
  execSQL(`EXEC ${SP} @action='DELETE',@id=${id}`);
