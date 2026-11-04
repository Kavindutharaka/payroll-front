/* ------------------------------------------------------------------
 * PAYE (APIT) on a bonus - Inland Revenue Tax Table No. 02, "Tax Deductions
 * on Lump-sum Payments", as in the guideline Nadee shared.
 *
 * The year of assessment (Y/A) runs April to March. For the lump sum:
 *   A = monthly pay already paid in the Y/A, up to and including this month
 *   B = monthly pay still to come in the Y/A, after this month
 *   C = lump sums paid in the Y/A, including this one
 *   D = A + B + C  (estimated gross aggregate remuneration, EGAR)
 * and the tax on this payment is
 *   D x rate - (constant + monthly tax on A + monthly tax on B
 *               + tax already taken from earlier lump sums in the Y/A)
 * where the monthly tax is the Table 01 PAYE the payroll already works out.
 *
 * Pay for months that are not in the system (before it went live) and for
 * the months still to come is taken from the latest month we do have - the
 * guideline does the same, treating the current monthly pay as unchanged.
 * ------------------------------------------------------------------ */

// [D up to, rate %, constant] - Table 02 for Y/A 2025/2026, which Nadee confirmed
// still applies for 2026/2027
export const TAX_TABLE_02 = [
  [1800000,  0,       0],
  [2800000,  6,  108000],
  [3300000, 18,  444000],
  [3800000, 24,  642000],
  [4300000, 30,  870000],
  [Infinity, 36, 1128000],
];

/* Leave deduction on the bonus (school circular). Leave is counted from
 * 1 November of the previous year to 31 October of the bonus year, maternity
 * leave excluded. Administrative staff have a higher allowance.
 * [days up to, % taken off the bonus] */
const LEAVE_BANDS = {
  admin: [[18, 0], [21, 10], [24, 15], [28, 25]],
  staff: [[14, 0], [18, 10], [22, 15], [28, 25]],   // teachers and non-academic staff
};

export const bonusLeaveCycle = (month) => {
  const y = Number(String(month).slice(0, 4));
  return { from: `${y - 1}-11-01`, to: `${y}-10-31` };
};

/* pct: the deduction, or null when the rule does not say - over 28 days, or no
 * category to tell which table applies. Those are left for Nadee to decide. */
export const leaveDeduction = (days, category) => {
  if (!category) return { pct: null, reason: 'No category - which table applies is not confirmed' };
  const table = /administrative/i.test(category) ? LEAVE_BANDS.admin : LEAVE_BANDS.staff;
  const d = Number(days) || 0;
  const band = table.find(([upTo]) => d <= upTo);
  if (!band) return { pct: null, reason: 'Over 28 days - the rule for this is not confirmed' };
  return { pct: band[1], reason: null };
};

/* Late attendance (memo of 9 September 2026). 18 late days a year are allowed
 * (2 a month, 1 in April and December); up to 16 more takes 20% off the annual
 * bonus and anything beyond that 50%. Counted September to June for tutorial
 * staff and September to August for administrative staff, and applied for the
 * first time to the bonus paid in December 2027 - so a 2026 bonus is untouched. */
export const LATE_RULE_FROM = '2027-12';
const LATE_ALLOWED = 18, LATE_20PCT_UPTO = 18 + 16;

// late days for the December 2027 bonus are those from September 2026 onwards
export const bonusLateCycle = (month, category) => {
  const y = Number(String(month).slice(0, 4));
  return { from: `${y - 1}-09`, to: /administrative/i.test(category || '') ? `${y}-08` : `${y}-06` };
};

export const lateDeduction = (days, month) => {
  if (String(month) < LATE_RULE_FROM) return { pct: 0, reason: 'Late attendance applies from the December 2027 bonus' };
  const d = Number(days) || 0;
  return { pct: d <= LATE_ALLOWED ? 0 : d <= LATE_20PCT_UPTO ? 20 : 50, reason: null };
};

// 2026-12 -> { start: '2026-04', monthsTo: 9 } (months from April to this month, inclusive)
export const assessmentYear = (month) => {
  const [y, m] = String(month).split('-').map(Number);
  const startYear = m >= 4 ? y : y - 1;
  return {
    start: `${startYear}-04`,
    end: `${startYear + 1}-03`,
    monthsTo: (y - startYear) * 12 + (m - 4) + 1,
  };
};

/* paid:    { months, gross, paye } - payroll months already in the system, this Y/A up to this month
 * latest:  { gross, paye }         - the employee's latest month, used for missing and future months
 * earlier: { amount, paye }        - finalised lump sums earlier in the same Y/A
 * joined:  'YYYY-MM'               - nothing is estimated for months before someone joined */
export const bonusPaye = ({ month, bonus, paid = {}, latest = {}, earlier = {}, joined = null }) => {
  const ya = assessmentYear(month);
  let nA = ya.monthsTo;
  if (joined && joined > ya.start) {
    const [y, m] = String(month).split('-').map(Number);
    const [jy, jm] = String(joined).split('-').map(Number);
    nA = Math.max(0, (y - jy) * 12 + (m - jm) + 1);
  }
  const nB = 12 - ya.monthsTo;
  const found   = Math.min(Number(paid.months) || 0, nA);
  const missing = nA - found;
  const g = Number(latest.gross) || 0;
  const t = Number(latest.paye) || 0;

  const A    = (Number(paid.gross) || 0) + missing * g;
  const taxA = (Number(paid.paye) || 0) + missing * t;
  const B    = nB * g;
  const taxB = nB * t;
  const C    = (Number(earlier.amount) || 0) + (Number(bonus) || 0);
  const D    = A + B + C;

  const [, rate, constant] = TAX_TABLE_02.find(([upTo]) => D <= upTo);
  const tax = rate === 0 ? 0
    : Math.max(0, Math.round((D * rate) / 100 - (constant + taxA + taxB + (Number(earlier.paye) || 0))));

  return { paye: tax, A, B, C, D, rate, taxA, taxB, estimatedMonths: missing, futureMonths: nB };
};
