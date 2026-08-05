import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import Layout from "../../components/Layout";
import {
  HiChartBar, HiDocumentText, HiCurrencyDollar, HiBriefcase,
  HiCalendar, HiDownload, HiEye, HiExclamation, HiTable,
} from "react-icons/hi";
import { CustomButton } from "../../components/FormFields";
import {
  fetchPayrollSummaryReport, fetchPayrollDetailReport, fetchTaxReport,
  fetchEpfEtfReport, fetchLoanReport, fetchLeaveReport, downloadCSV,
} from "../../services/reportService";

const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const statusColor = { Draft: "warning", Paid: "success", Approved: "indigo", Active: "success", Closed: "gray", Pending: "warning", Rejected: "failure" };

/* Each report declares how to load itself and which columns to show —
 * the same definition drives the on-screen table and the CSV export. */
const REPORTS = [
  {
    id: "payroll-summary",
    name: "Payroll Summary",
    description: "Monthly payroll totals across all runs",
    icon: HiChartBar, color: "bg-purple-100 text-purple-600",
    needsMonth: false,
    load: () => fetchPayrollSummaryReport(),
    columns: [
      { key: "runMonth", label: "Month", render: (r) => monthLabel(r.runMonth) },
      { key: "employeeCount", label: "Employees" },
      { key: "totalGross", label: "Total Gross", money: true },
      { key: "totalDeductions", label: "Deductions", money: true },
      { key: "totalNet", label: "Total Net", money: true, strong: true },
      { key: "status", label: "Status", badge: true },
    ],
  },
  {
    id: "payroll-detail",
    name: "Payroll Detail",
    description: "Full per-employee breakdown for a selected month",
    icon: HiTable, color: "bg-cyan-100 text-cyan-600",
    needsMonth: true,
    load: (m) => fetchPayrollDetailReport(m),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "basicSalary", label: "Basic", money: true },
      { key: "noPay", label: "No Pay", money: true },
      { key: "grossPay", label: "Gross", money: true },
      { key: "paye", label: "PAYE", money: true },
      { key: "epfEmployee", label: "EPF 8%", money: true },
      { key: "totalDeductions", label: "Deductions", money: true },
      { key: "netPay", label: "Net Pay", money: true, strong: true },
    ],
  },
  {
    id: "tax-report",
    name: "Tax Report",
    description: "PAYE deducted per employee for a month",
    icon: HiDocumentText, color: "bg-red-100 text-red-600",
    needsMonth: true,
    load: (m) => fetchTaxReport(m),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "category", label: "Category" },
      { key: "grossPay", label: "Gross Pay", money: true },
      { key: "paye", label: "PAYE", money: true, strong: true },
    ],
  },
  {
    id: "epf-etf-report",
    name: "EPF / ETF Report",
    description: "Employee and employer contributions for a month",
    icon: HiCurrencyDollar, color: "bg-green-100 text-green-600",
    needsMonth: true,
    load: (m) => fetchEpfEtfReport(m),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "basicSalary", label: "Basic", money: true },
      { key: "budgetaryAllowance", label: "Budgetary", money: true },
      { key: "epfEmployee", label: "EPF 8% (Ee)", money: true },
      { key: "epfEmployer", label: "EPF 12% (Er)", money: true },
      { key: "etf", label: "ETF 3%", money: true },
    ],
  },
  {
    id: "loan-report",
    name: "Loan Report",
    description: "Loans, monthly recovery and outstanding balances",
    icon: HiBriefcase, color: "bg-orange-100 text-orange-600",
    needsMonth: false,
    load: () => fetchLoanReport(),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "loanType", label: "Loan Type" },
      { key: "principal", label: "Principal", money: true },
      { key: "monthlyInstallment", label: "Monthly", money: true },
      { key: "remaining", label: "Outstanding", money: true, strong: true },
      { key: "status", label: "Status", badge: true },
    ],
  },
  {
    id: "leave-report",
    name: "Leave Report",
    description: "Leave applications, approvals and days taken",
    icon: HiCalendar, color: "bg-blue-100 text-blue-600",
    needsMonth: false,
    load: () => fetchLeaveReport(),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "leaveType", label: "Leave Type" },
      { key: "dateFrom", label: "From" },
      { key: "dateTo", label: "To" },
      { key: "days", label: "Days" },
      { key: "status", label: "Status", badge: true },
    ],
  },
];

export default function Reports() {
  const [selectedId, setSelectedId] = useState(null);
  const [month, setMonth]           = useState(thisMonth);
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const report = REPORTS.find((r) => r.id === selectedId) ?? null;

  const runReport = useCallback(async (rep, m) => {
    if (!rep) return;
    setLoading(true); setError(""); setRows([]);
    try {
      const data = await rep.load(m);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Could not load this report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (report) runReport(report, month); }, [report, month, runReport]);

  const handleExport = () => {
    if (!report || rows.length === 0) return;
    const cols = report.columns.map((c) => ({ key: c.key, label: c.label }));
    const suffix = report.needsMonth ? `-${month}` : "";
    downloadCSV(`${report.id}${suffix}.csv`, rows, cols);
  };

  const totalsFor = (col) =>
    rows.reduce((a, r) => a + Number(r[col] || 0), 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports</h1>
            <p className="mt-1 text-sm text-gray-500">Generate, view and export payroll reports</p>
          </div>
          {report?.needsMonth && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
          )}
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const active = selectedId === r.id;
            return (
              <div key={r.id}
                onClick={() => setSelectedId(active ? null : r.id)}
                className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
                  active ? "border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20"
                         : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${r.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.name}</p>
                      {active && <StatusBadge color="purple" className="text-xs">Viewing</StatusBadge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{r.description}</p>
                    <div className="mt-3">
                      <CustomButton size="xs" color="purple" outline
                        onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>
                        <HiEye className="mr-1 h-3.5 w-3.5" /> View
                      </CustomButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Preview */}
        {report && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{report.name}</p>
                {report.needsMonth && <p className="text-xs text-gray-500">{monthLabel(month)}</p>}
              </div>
              <CustomButton color="purple" size="sm" disabled={rows.length === 0} onClick={handleExport}>
                <HiDownload className="mr-2 h-4 w-4" /> Export CSV
              </CustomButton>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">
                  <tr>
                    {report.columns.map((c) => <th key={c.key} className="whitespace-nowrap px-5 py-3">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={report.columns.length} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={report.columns.length} className="px-5 py-10 text-center text-gray-400">
                      {report.needsMonth
                        ? `No data for ${monthLabel(month)} — run the payroll for this month first.`
                        : "No records yet."}
                    </td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={`${r.emp_id ?? r.runMonth ?? i}-${i}`} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      {report.columns.map((c) => (
                        <td key={c.key} className={`whitespace-nowrap px-5 py-3 ${
                          c.strong ? "font-bold text-green-600" : "text-gray-700 dark:text-gray-300"}`}>
                          {c.badge ? (
                            <StatusBadge color={statusColor[r[c.key]] ?? "gray"} className="w-fit text-xs">{r[c.key]}</StatusBadge>
                          ) : c.render ? c.render(r)
                            : c.money ? `Rs. ${money(r[c.key])}`
                            : (r[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && report.columns.some((c) => c.money) && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm font-semibold dark:border-gray-600 dark:bg-gray-900/50">
                    <tr>
                      {report.columns.map((c, idx) => (
                        <td key={c.key} className="whitespace-nowrap px-5 py-3 text-gray-700 dark:text-gray-200">
                          {idx === 0 ? "TOTAL" : c.money ? `Rs. ${money(totalsFor(c.key))}` : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {rows.length > 0 && (
              <div className="border-t border-gray-200 px-5 py-3 text-xs text-gray-400 dark:border-gray-700">
                {rows.length} record{rows.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}

        {!report && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-800">
            Select a report above to view it.
          </div>
        )}
      </div>
    </Layout>
  );
}
