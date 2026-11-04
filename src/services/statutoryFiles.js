/* ------------------------------------------------------------------
 * EPF and ETF upload text files.
 *
 * Nadee used to paste the e-statement into the fund's Excel generators
 * (EPF xxxx.xlsm, ETF Contribution File Generator xxxx.xlsm) and press their
 * button. These builders write the same files directly. Every rule below is
 * taken from the macros inside those workbooks, so the output matches what
 * the button produced:
 *
 * EPF - one fixed-width line per member, 15 fields. Each field is the cell
 *   as Excel displays it, padded to the column's width: numbers to the right,
 *   text to the left. An empty cell writes nothing at all. Lines end CRLF and
 *   the last line has no line ending.
 *
 * ETF - Sampath Bank's layout: a "D" record per member, then one "H" header
 *   record at the end with the totals. Every record ends CRLF.
 * ------------------------------------------------------------------ */

const CRLF = '\r\n';

// VBA IsNumeric for the values that occur here: plain or decimal numbers
const isNumeric = (s) => /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s);

// pad to width; a value wider than its column is cut (the macro would stop with an error)
const padRight = (s, w) => (s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padLeft  = (s, w) => (s.length >= w ? s.slice(-w) : ' '.repeat(w - s.length) + s);
const zeroPad  = (n, w) => String(Math.round(Number(n) || 0)).padStart(w, '0');

// the workbook formats these columns as 0.00
const twoDp = (v) => (v === null || v === undefined || v === '' ? '' : (Number(v) || 0).toFixed(2));
const plain = (v) => (v === null || v === undefined ? '' : String(v).trim());

/* EPF columns in the order of the fund's sheet, with the widths the macro sets
 * and how each one is displayed there. */
const EPF_LAYOUT = [
  ['nicNumber',            20, plain],
  ['surname',              40, plain],
  ['initials',             20, plain],
  ['memberNumber',          6, plain],
  ['totalContribution',    10, twoDp],
  ['employerContribution', 10, twoDp],
  ['memberContribution',   10, twoDp],
  ['totalEarnings',        12, twoDp],
  ['memberStatus',          1, plain],
  ['zone',                  1, plain],
  ['employerNumber',        6, plain],
  ['contributionPeriod',    6, plain],
  ['dataSubmissionNumber',  2, plain],
  ['daysWorked',            5, twoDp],
  ['occupationGrade',       3, plain],
];

export const buildEpfText = (rows) =>
  (rows || [])
    .filter((r) => plain(r.nicNumber) !== '')
    .map((r) =>
      EPF_LAYOUT.map(([key, width, show]) => {
        const text = show(r[key]);
        if (text === '') return '';                     // an empty cell writes nothing
        return isNumeric(text) ? padLeft(text, width) : padRight(text, width);
      }).join(''))
    .join(CRLF);

// 2026/09/01 or 2026-09 -> 202609
const yyyymm = (v) => String(v || '').replace(/[^0-9]/g, '').slice(0, 6);

/* ETF: D + employer no.(8, right) + member no.(6, zero-filled) + initials(20)
 *      + surname(30) + NIC(12, right) + period from + period to
 *      + contribution in cents (9, zero-filled)
 * H + employer no.(8) + from + to + member count(6) + total in cents(14)
 *   + lines on the 1st page of Form II (2) - the macro asks for that number. */
export const buildEtfText = (rows, form2Lines) => {
  const list = (rows || []).filter((r) => plain(r.nicNumber) !== '');
  if (!list.length) return '';
  const lines = list.map((r) =>
    'D' +
    padLeft(plain(r.employerNumber), 8) +
    zeroPad(String(r.memberNumber).replace(/[^0-9]/g, ''), 6) +
    padRight(plain(r.initials), 20) +
    padRight(plain(r.surname), 30) +
    padLeft(plain(r.nicNumber).toUpperCase(), 12) +
    yyyymm(r.periodFrom) + yyyymm(r.periodTo) +
    zeroPad((Number(r.totalContribution) || 0) * 100, 9));
  const first = list[0];
  const totalCents = list.reduce((a, r) => a + Math.round((Number(r.totalContribution) || 0) * 100), 0);
  const header =
    'H' +
    padLeft(plain(first.employerNumber), 8) +
    yyyymm(first.periodFrom) + yyyymm(first.periodTo) +
    zeroPad(list.length, 6) +
    zeroPad(totalCents, 14) +
    zeroPad(form2Lines, 2);
  return [...lines, header].map((l) => l + CRLF).join('');
};

// save a text file as-is: no byte-order mark, line endings untouched
export const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
