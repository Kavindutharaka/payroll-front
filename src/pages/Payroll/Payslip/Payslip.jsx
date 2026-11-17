import { useState, useEffect, useCallback } from "react";
import Layout from "../../../components/Layout";
import { HiDocumentText, HiPrinter, HiSearch, HiExclamation } from "react-icons/hi";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton, CustomInput } from "../../../components/FormFields";
import { StatusBadge } from "../../../components/StatusBadge";
import { fetchRunByMonth, fetchRunDetailsByMonth } from "../../../services/payrollRunService";

/* Shown at the top of every payslip. Change here to update all payslips. */
const SCHOOL_NAME    = "Asian International School";
const SCHOOL_ADDRESS = "4/97, Thalakotuwa Gardens, Colombo 5 - Tel 2512182";
const SCHOOL_LOGO    = "/ais-logo.jpg";

const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "Ms.S.R. Fernando" — salutation and initials run together, then the surname.
// The J/T-style codes are EPF category codes, not designations, so they are
// kept off this line; Designation is its own row underneath.
export const displayName = (r) => {
  const salutation = [r.initial, r.initials].filter(Boolean).join("").replace(/\s+/g, "");
  return [salutation, r.surName].filter(Boolean).join(" ").trim() || r.empName || "";
};
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1, 1)
    .toLocaleString(undefined, { month: "long", year: "numeric" });
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/* The client's payslip is a single running statement, in this exact order:
 *   Basic Salary / Budgetary Allowance / Increment / Allowance / NoPay( n ) Days
 *   Gross Pay
 *   EPF 8% / Stamp Duty / PAYE / Loan-Insurance / Festival Advance / Advance
 *   Total Deductions
 *   Net Pay
 *   EPF 12% / ETF 3%   (employer cost, shown below the net)
 * Zero rows are printed too - their format always shows the full list. */
const buildStatement = (r) => {
  const n = (v) => Number(v || 0);
  const earnings = [
    { label: "Basic Salary",        amount: n(r.basicSalary) },
    { label: "Budgetary Allowance", amount: n(r.budgetaryAllowance) },
    { label: "Increment",           amount: n(r.increment) },
    // only when there is one - most months there is no adjustment
    ...(n(r.salaryAdjustment) !== 0 ? [{ label: "Salary Adjustment", amount: n(r.salaryAdjustment) }] : []),
    ...(n(r.formTeacherAllowance) > 0
      ? [{ label: n(r.lateDays) > 0
             ? `Class Teacher Allowance (${n(r.lateDays)} days late)`
             : "Class Teacher Allowance",
           amount: n(r.formTeacherAllowance) - n(r.formTeacherDeduction) }]
      : []),
    { label: "Allowance",           amount: n(r.otherAllowance) },
    { label: `NoPay( ${n(r.noPayDays).toFixed(1)} ) Days`, amount: n(r.noPay) },
  ];
  const deductions = [
    { label: "EPF 8%",           amount: n(r.epfEmployee) },
    { label: "Stamp Duty",       amount: n(r.stampDuty) },
    { label: "PAYE",             amount: n(r.paye) },
    { label: "Loan / Insurance", amount: n(r.loanDeduction) + n(r.insuranceDeduction) },
    { label: "Festival Advance", amount: n(r.festivalAdvance) },
    { label: "Advance",          amount: n(r.advanceDeduction) },
  ];
  // Anything that doesn't fit the six standard lines still has to be shown,
  // otherwise the deductions wouldn't add up to the total.
  if (n(r.otherDeduction) > 0) {
    deductions.push({ label: "Other Deductions", amount: n(r.otherDeduction) });
  }
  return { earnings, deductions };
};


/* One payslip, rendered the same whether it is the on-screen preview or one of
 * four squeezed onto an A4 sheet. `compact` only shrinks the type and padding —
 * every line stays, so the printed copy is not a different document. */
function SlipCard({ r, month, compact = false }) {
  const slip = buildStatement(r);
  return (
      <div className={`bg-white text-gray-900 ${compact ? "slip-compact p-2" : "border border-gray-300 p-6 shadow-sm"}`}>

        {/* Letterhead */}
        <div className="flex items-start gap-4 border-b-2 border-gray-800 pb-3">
          <img src={SCHOOL_LOGO} alt="" className="h-16 w-16 flex-shrink-0 object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="leading-tight">
            <p className="text-lg font-bold">{SCHOOL_NAME}</p>
            <p className="text-xs text-gray-600">{SCHOOL_ADDRESS}</p>
          </div>
        </div>

        {/* Who / which month */}
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex">
            <span className="w-48">Salary for the Month of</span>
            <span className="font-semibold">{monthLabel(r.runMonth || month)}</span>
          </div>
          <div className="flex">
            <span className="w-48">Emp. No</span>
            <span className="font-semibold">{r.emp_id}</span>
          </div>
          <div className="flex">
            <span className="w-48">Name</span>
            <span className="font-semibold">{displayName(r)}</span>
          </div>
          <div className="flex">
            <span className="w-48">Designation</span>
            {/* Employee Master holds the real job title for all staff; the separate
                designation field was filled for only four, which is why this line
                printed blank. Same value in both places now. */}
            <span className="font-semibold">{r.jobTitle || r.designation || ""}</span>
          </div>
        </div>

        {/* Statement */}
        <div className="mt-4 border-t border-gray-300 pt-2 text-sm">
          {slip.earnings.map((e) => (
            <div key={e.label}>
              <div className="flex justify-between py-0.5">
                <span>{e.label}</span>
                <span className="font-mono">{money(e.amount)}</span>
              </div>
              {/* how the allowance total was made up — reference only */}
              {e.label === "Allowance" && r.allowanceBreakdown && (
                <p className="pl-3 text-[10px] leading-snug text-gray-500">
                  {r.allowanceBreakdown}
                </p>
              )}
            </div>
          ))}

          <div className="my-1 flex justify-between border-y border-gray-300 py-1 font-bold">
            <span>Gross Pay</span>
            <span className="font-mono">{money(r.grossPay)}</span>
          </div>

          {slip.deductions.map((d) => (
            <div key={d.label} className="flex justify-between py-0.5">
              <span className="pl-3">{d.label}</span>
              <span className="font-mono">{money(d.amount)}</span>
            </div>
          ))}

          <div className="my-1 flex justify-between border-t border-gray-300 pt-1 font-semibold">
            <span>Total Deductions</span>
            <span className="font-mono">{money(r.totalDeductions)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-base font-bold">Net Pay</span>
            <span className="border-2 border-gray-800 px-3 py-1 font-mono text-base font-bold">
              {money(r.netPay)}
            </span>
          </div>

          {/* Employer cost - printed below the net, never deducted */}
          <div className="mt-4 space-y-0.5 border-t border-gray-300 pt-2">
            <div className="flex justify-between">
              <span>EPF 12%</span>
              <span className="font-mono">{money(r.epfEmployer)}</span>
            </div>
            <div className="flex justify-between">
              <span>ETF 3%</span>
              <span className="font-mono">{money(r.etf)}</span>
            </div>
          </div>
        </div>

        {/* Room at the foot of every slip for the authorising signature and the
            school's seal, which Nadee stamps on each one. */}
        <div className="slip-sign mt-8 grid grid-cols-2 items-end gap-6 text-xs text-gray-600">
          <div>
            <div className="h-12" />
            <div className="border-t border-dotted border-gray-500 pt-1 text-center">Authorised Signature</div>
          </div>
          <div className="slip-seal flex h-24 items-end justify-center rounded border border-dashed border-gray-400 pb-1">
            Seal
          </div>
        </div>
      </div>
  );
}

export default function Payslip() {
  const [month, setMonth]       = useState(thisMonth);
  const [run, setRun]           = useState(null);
  const [rows, setRows]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [fromId, setFromId]     = useState("");
  const [toId, setToId]         = useState("");
  const [batch, setBatch]       = useState([]);   // slips queued for the printer

  const load = useCallback(async (m) => {
    setLoading(true); setError(""); setSelected(null);
    try {
      const [head, details] = await Promise.all([fetchRunByMonth(m), fetchRunDetailsByMonth(m)]);
      setRun(Array.isArray(head) ? head[0] ?? null : head ?? null);
      setRows(Array.isArray(details) ? details : []);
    } catch (e) {
      console.error(e);
      setError("Could not load payslips for this month.");
      setRun(null); setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  /* 110 pages went to the printer when every slip was one sheet. Two employees
   * share an A4, each printed twice — the original and the office copy — so a
   * sheet carries four slips in a 2x2 grid. The range keeps a run to a
   * manageable batch: 300-350, then 351-400, and so on. */
  const printBatch = (list) => {
    if (list.length === 0) return;
    setBatch(list);
    // let React paint the batch before the print dialog freezes the page
    setTimeout(() => { window.print(); setTimeout(() => setBatch([]), 0); }, 60);
  };

  const inRange = () => {
    const lo = Number(fromId), hi = Number(toId);
    return rows.filter((r) => {
      const id = Number(r.emp_id);
      if (!Number.isFinite(id)) return false;
      if (Number.isFinite(lo) && fromId !== "" && id < lo) return false;
      if (Number.isFinite(hi) && toId !== "" && id > hi) return false;
      return true;
    });
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.empName || "").toLowerCase().includes(q)
      || displayName(r).toLowerCase().includes(q) || String(r.emp_id).includes(q);
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Payslips</h1>
            <p className="mt-1 text-sm text-gray-500">Preview and print employee payslips from a calculated payroll run</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            {run && <StatusBadge color={run.status === "Paid" ? "success" : run.status === "Approved" ? "indigo" : "warning"}
              className="px-3 py-1.5 text-sm font-semibold">{run.status}</StatusBadge>}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            No payroll has been calculated for {monthLabel(month)} yet. Run the payroll first from
            <span className="font-semibold"> Payroll Processing → Run Payroll</span>.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* List */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm print:hidden dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">Employee Payslips</p>
              <CustomInput icon={HiSearch} placeholder="Search name or ID..." sizing="sm" className="mt-2"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <CustomTable hoverable>
                <CustomTableHead>
                  <CustomTableRow>
                    <CustomTableHeadCell>Employee</CustomTableHeadCell>
                    <CustomTableHeadCell>Net Pay</CustomTableHeadCell>
                  </CustomTableRow>
                </CustomTableHead>
                <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <CustomTableRow><CustomTableCell colSpan={2} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                  ) : filtered.length === 0 ? (
                    <CustomTableRow><CustomTableCell colSpan={2} className="py-8 text-center text-sm text-gray-400">No payslips found.</CustomTableCell></CustomTableRow>
                  ) : filtered.map((p) => (
                    <CustomTableRow key={p.id}
                      className={`cursor-pointer hover:bg-purple-50 dark:hover:bg-gray-700 ${selected?.id === p.id ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}
                      onClick={() => setSelected(p)}>
                      <CustomTableCell>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{displayName(p)}</p>
                        <p className="font-mono text-xs text-purple-500">{p.emp_id}</p>
                      </CustomTableCell>
                      <CustomTableCell className="whitespace-nowrap text-sm font-semibold text-green-600">
                        Rs. {money(p.netPay)}
                      </CustomTableCell>
                    </CustomTableRow>
                  ))}
                </CustomTableBody>
              </CustomTable>
            </div>
            {filtered.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700">
                {filtered.length} payslip{filtered.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm print:hidden dark:border-gray-700 dark:bg-gray-800">
                <HiDocumentText className="h-10 w-10" />
                <p className="text-sm">Select an employee to preview their payslip</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-end justify-end gap-2 print:hidden">
                  <div className="mr-auto flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="fromId" className="text-xs font-medium text-gray-500">Emp ID from</label>
                      <input id="fromId" type="number" value={fromId} onChange={(e) => setFromId(e.target.value)}
                        placeholder="300"
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="toId" className="text-xs font-medium text-gray-500">to</label>
                      <input id="toId" type="number" value={toId} onChange={(e) => setToId(e.target.value)}
                        placeholder="350"
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                    </div>
                    <CustomButton perm="payslips.print" color="gray" outline size="sm"
                      disabled={inRange().length === 0}
                      onClick={() => printBatch(inRange())}>
                      <HiPrinter className="mr-2 h-4 w-4" /> Print range ({inRange().length})
                    </CustomButton>
                    <CustomButton perm="payslips.print" color="gray" outline size="sm"
                      disabled={rows.length === 0}
                      onClick={() => printBatch(rows)}>
                      <HiPrinter className="mr-2 h-4 w-4" /> Print all ({rows.length})
                    </CustomButton>
                  </div>
                  <CustomButton perm="payslips.print" color="purple" size="sm" onClick={() => window.print()}>
                    <HiPrinter className="mr-2 h-4 w-4" /> Print this one
                  </CustomButton>
                </div>

                <div id="payslip-print" className="mx-auto max-w-2xl">
                  <SlipCard r={selected} month={month} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Queued slips. Off-screen until the print dialog opens, then this is all
          that goes on the page — two employees per sheet, each with a copy. */}
      {batch.length > 0 && (
        <div id="payslip-batch">
          {Array.from({ length: Math.ceil(batch.length / 2) }, (_, page) => (
            <div key={page} className="slip-sheet">
              {batch.slice(page * 2, page * 2 + 2).map((r) => (
                <div key={r.emp_id} className="contents">
                  <div className="slip-cell"><SlipCard r={r} month={month} compact /></div>
                  <div className="slip-cell">
                    <p className="slip-copy">Copy</p>
                    <SlipCard r={r} month={month} compact />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          body * { visibility: hidden; }
          #payslip-batch, #payslip-batch * { visibility: visible; }
          #payslip-batch { position: absolute; left: 0; top: 0; width: 100%; }
          .slip-sheet {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: 139mm;
            gap: 4mm;
            page-break-after: always;
          }
          .slip-sheet:last-child { page-break-after: auto; }
          .slip-cell { position: relative; border: 1px dashed #999; padding: 2mm; overflow: hidden; }
          /* the slip fills its cell so the signature and seal sit at the bottom */
          .slip-cell > .slip-compact { min-height: 100%; display: flex; flex-direction: column; }
          .slip-compact .slip-sign { margin-top: auto !important; padding-top: 2mm; }
          .slip-compact .slip-sign .h-12 { height: 8mm !important; }
          .slip-compact .slip-seal { height: 20mm !important; }

          /* Only the outer text used to shrink - the logo, the school name and
             every line inside kept their screen sizes, so the bottom of each slip
             fell out of its cell. On a quarter of an A4 everything comes down
             together: 10px throughout, 12px for the school name. */
          .slip-compact, .slip-compact * { font-size: 10px !important; line-height: 1.3 !important; }
          .slip-compact .text-lg   { font-size: 12px !important; }
          .slip-compact .text-base { font-size: 11px !important; }
          .slip-compact img        { height: 9mm !important; width: 9mm !important; }
          .slip-compact .w-48      { width: 34mm !important; }
          .slip-compact .pb-3      { padding-bottom: 1.5mm !important; }
          .slip-compact .mt-3, .slip-compact .mt-4 { margin-top: 1.5mm !important; }
          .slip-compact .mt-2      { margin-top: 1mm !important; }
          .slip-compact .pt-2      { padding-top: 1mm !important; }
          .slip-compact .py-0\\.5  { padding-top: 0 !important; padding-bottom: 0 !important; }
          .slip-compact .py-1      { padding-top: 0.5mm !important; padding-bottom: 0.5mm !important; }
          .slip-compact .space-y-1 > * + *, .slip-compact .space-y-0\\.5 > * + * { margin-top: 0 !important; }
          /* the copy marker sits in the corner instead of pushing the slip down */
          .slip-copy { position: absolute; top: 1mm; right: 2.5mm; font-size: 7px; letter-spacing: 0.15em;
                       text-transform: uppercase; color: #6b7280; }

          /* a single preview still prints on its own when no batch is queued */
          #payslip-batch:empty ~ * { visibility: hidden; }
        }
        @media print {
          body:not(:has(#payslip-batch)) #payslip-print,
          body:not(:has(#payslip-batch)) #payslip-print * { visibility: visible; }
          body:not(:has(#payslip-batch)) #payslip-print {
            position: absolute; left: 0; top: 0; width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
