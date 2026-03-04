import { useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import Layout from "../../components/Layout";import {
  HiChartBar, HiDocumentText, HiCurrencyDollar, HiBriefcase,
  HiCalendar, HiAdjustments, HiDownload, HiEye,
} from "react-icons/hi";
import { CustomSelect, CustomButton } from "../../components/FormFields";

const reportTypes = [
  {
    id: "payroll-summary",
    name: "Payroll Summary",
    description: "Monthly payroll totals broken down by employee and category",
    icon: HiChartBar,
    color: "bg-purple-100 text-purple-600",
    badge: "purple",
  },
  {
    id: "tax-report",
    name: "Tax Report",
    description: "PAYE tax deductions per employee with slab-wise breakdown",
    icon: HiDocumentText,
    color: "bg-red-100 text-red-600",
    badge: "failure",
  },
  {
    id: "epf-etf-report",
    name: "EPF / ETF Report",
    description: "Employee and employer contributions for EPF and ETF",
    icon: HiCurrencyDollar,
    color: "bg-green-100 text-green-600",
    badge: "success",
  },
  {
    id: "loan-report",
    name: "Loan Report",
    description: "Active loans, monthly recovery and outstanding balances",
    icon: HiBriefcase,
    color: "bg-orange-100 text-orange-600",
    badge: "warning",
  },
  {
    id: "leave-report",
    name: "Leave Report",
    description: "Leave utilization, pending approvals and no-pay deductions",
    icon: HiCalendar,
    color: "bg-blue-100 text-blue-600",
    badge: "indigo",
  },
  {
    id: "custom-report",
    name: "Custom Report Builder",
    description: "Build custom reports by selecting fields, filters and date ranges",
    icon: HiAdjustments,
    color: "bg-indigo-100 text-indigo-600",
    badge: "indigo",
  },
];

// Mock summary data for each report type
const payrollSummary = [
  { month: "March 2026",    employees: 24, totalGross: 1350000, totalNet: 1245000, status: "Draft" },
  { month: "February 2026", employees: 24, totalGross: 1320000, totalNet: 1220000, status: "Paid"  },
  { month: "January 2026",  employees: 24, totalGross: 1295000, totalNet: 1198500, status: "Paid"  },
];

const statusColor = { Draft: "warning", Paid: "success", Approved: "indigo" };

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [month, setMonth]                   = useState("2026-03");

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports</h1>
            <p className="mt-1 text-sm text-gray-500">Generate, view and download payroll reports</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r.id === selectedReport ? null : r.id)}
                className={`cursor-pointer rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
                  selectedReport === r.id
                    ? "border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${r.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.name}</p>
                      {selectedReport === r.id && <StatusBadge color="purple" className="text-xs">Selected</StatusBadge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{r.description}</p>
                    <div className="mt-3 flex gap-2">
                      <CustomButton size="xs" color="purple" outline>
                        <HiEye className="mr-1 h-3.5 w-3.5" /> View
                      </CustomButton>
                      <CustomButton size="xs" color="gray" outline>
                        <HiDownload className="mr-1 h-3.5 w-3.5" /> Export
                      </CustomButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Report Preview */}
        {selectedReport === "payroll-summary" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">Payroll Summary Report</p>
              <CustomButton color="purple" size="sm">
                <HiDownload className="mr-2 h-4 w-4" /> Export CSV
              </CustomButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">
                  <tr>
                    {["Month", "Employees", "Total Gross", "Total Net", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payrollSummary.map((p) => (
                    <tr key={p.month} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{p.month}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{p.employees}</td>
                      <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-200">Rs. {p.totalGross.toLocaleString()}</td>
                      <td className="px-5 py-3 font-bold text-green-600">Rs. {p.totalNet.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <StatusBadge color={statusColor[p.status]} className="w-fit text-xs">{p.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReport === "custom-report" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-4 font-semibold text-gray-800 dark:text-white">Custom Report Builder</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Report Type</label>
                <CustomSelect>
                  <option>Payroll</option>
                  <option>Leave</option>
                  <option>Loan</option>
                  <option>EPF/ETF</option>
                </CustomSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Group By</label>
                <CustomSelect>
                  <option>Employee</option>
                  <option>Category</option>
                  <option>Month</option>
                </CustomSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Category Filter</label>
                <CustomSelect>
                  <option>All</option>
                  <option>Academic</option>
                  <option>Non-Academic</option>
                </CustomSelect>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <CustomButton color="purple">
                <HiEye className="mr-2 h-4 w-4" /> Generate Report
              </CustomButton>
              <CustomButton color="gray" outline>
                <HiDownload className="mr-2 h-4 w-4" /> Export
              </CustomButton>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
