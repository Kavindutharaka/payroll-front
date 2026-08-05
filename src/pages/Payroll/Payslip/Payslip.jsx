import { useState, useEffect, useCallback } from "react";
import Layout from "../../../components/Layout";
import { HiDocumentText, HiPrinter, HiSearch, HiExclamation } from "react-icons/hi";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton, CustomInput } from "../../../components/FormFields";
import { StatusBadge } from "../../../components/StatusBadge";
import { fetchRunByMonth, fetchRunDetailsByMonth } from "../../../services/payrollRunService";

const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/* Build the payslip line items from a stored payroll run row.
 * Zero-value lines are hidden so a simple payslip stays simple. */
const buildLines = (r) => {
  const earnings = [{ label: "Basic Salary", amount: Number(r.basicSalary || 0) }];
  if (Number(r.budgetaryAllowance) > 0) earnings.push({ label: "Budgetary Allowance", amount: Number(r.budgetaryAllowance) });
  if (Number(r.otherAllowance) > 0)     earnings.push({ label: "Allowances",          amount: Number(r.otherAllowance) });
  if (Number(r.noPay) > 0)              earnings.push({ label: "No Pay",              amount: -Number(r.noPay) });

  const deductions = [];
  if (Number(r.epfEmployee) > 0)        deductions.push({ label: "EPF (8%) – Employee", amount: Number(r.epfEmployee) });
  if (Number(r.paye) > 0)               deductions.push({ label: "PAYE Tax",            amount: Number(r.paye) });
  if (Number(r.stampDuty) > 0)          deductions.push({ label: "Stamp Duty",          amount: Number(r.stampDuty) });
  if (Number(r.loanDeduction) > 0)      deductions.push({ label: "Loan Installment",    amount: Number(r.loanDeduction) });
  if (Number(r.advanceDeduction) > 0)   deductions.push({ label: "Salary Advance",      amount: Number(r.advanceDeduction) });
  if (Number(r.insuranceDeduction) > 0) deductions.push({ label: "Insurance",           amount: Number(r.insuranceDeduction) });
  if (Number(r.otherDeduction) > 0)     deductions.push({ label: "Other Deductions",    amount: Number(r.otherDeduction) });

  return { earnings, deductions };
};

export default function Payslip() {
  const [month, setMonth]       = useState(thisMonth);
  const [run, setRun]           = useState(null);
  const [rows, setRows]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

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

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.empName || "").toLowerCase().includes(q) || String(r.emp_id).includes(q);
  });

  const lines = selected ? buildLines(selected) : null;

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
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.empName}</p>
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
                <div className="mb-3 flex justify-end print:hidden">
                  <CustomButton color="purple" size="sm" onClick={() => window.print()}>
                    <HiPrinter className="mr-2 h-4 w-4" /> Print / Save as PDF
                  </CustomButton>
                </div>

                <div id="payslip-print" className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="rounded-t-xl bg-purple-600 px-6 py-5 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-bold">PAYSLIP</p>
                        <p className="text-purple-200">{monthLabel(selected.runMonth || month)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{selected.empName}</p>
                        <p className="font-mono text-sm text-purple-200">{selected.emp_id}</p>
                        {selected.category && <p className="text-xs text-purple-200">{selected.category}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {/* Earnings */}
                    <div className="p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-600">Earnings</p>
                      <div className="flex flex-col gap-2">
                        {lines.earnings.map((e) => (
                          <div key={e.label} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{e.label}</span>
                            <span className={`font-medium ${e.amount < 0 ? "text-red-500" : "text-gray-800 dark:text-gray-200"}`}>
                              {e.amount < 0 ? "− " : ""}Rs. {money(Math.abs(e.amount))}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold dark:border-gray-600">
                          <span className="text-gray-800 dark:text-gray-100">Gross Salary</span>
                          <span className="text-green-600">Rs. {money(selected.grossPay)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-500">Deductions</p>
                      <div className="flex flex-col gap-2">
                        {lines.deductions.length === 0 && (
                          <p className="text-sm text-gray-400">No deductions this month.</p>
                        )}
                        {lines.deductions.map((d) => (
                          <div key={d.label} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{d.label}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">Rs. {money(d.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold dark:border-gray-600">
                          <span className="text-gray-800 dark:text-gray-100">Total Deductions</span>
                          <span className="text-red-500">Rs. {money(selected.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employer contributions — shown for information, never deducted */}
                  <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                      Employer Contributions <span className="font-normal normal-case tracking-normal text-gray-400">(not deducted from salary)</span>
                    </p>
                    <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">EPF 12%: <span className="font-medium text-gray-800 dark:text-gray-200">Rs. {money(selected.epfEmployer)}</span></span>
                      <span className="text-gray-600 dark:text-gray-300">ETF 3%: <span className="font-medium text-gray-800 dark:text-gray-200">Rs. {money(selected.etf)}</span></span>
                    </div>
                  </div>

                  {/* Net */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl bg-gray-50 px-6 py-4 dark:bg-gray-900/50">
                    <p className="text-xs text-gray-500">
                      This is a computer-generated payslip and does not require a signature.
                    </p>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Net Salary</p>
                      <p className="text-2xl font-bold text-green-600">Rs. {money(selected.netPay)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Only the payslip itself goes on the page when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #payslip-print, #payslip-print * { visibility: visible; }
          #payslip-print {
            position: absolute; left: 0; top: 0; width: 100%;
            border: none; box-shadow: none;
          }
        }
      `}</style>
    </Layout>
  );
}
