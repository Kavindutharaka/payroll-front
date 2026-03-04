import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlay, HiRefresh, HiLockClosed, HiCheck } from "react-icons/hi";
import { CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const payrollData = [
  { id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",   category: "Non-Academic", basicSalary: 85000,  allowances: 7000,  deductions: 6800,  epfEe: 7360,  epfEr: 11040, etf: 2550, netSalary: 85200  },
  { id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   category: "Non-Academic", basicSalary: 95000,  allowances: 14500, deductions: 16111, epfEe: 8740,  epfEr: 13110, etf: 3040, netSalary: 93389  },
  { id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera", category: "Academic",     basicSalary: 120000, allowances: 18000, deductions: 0,     epfEe: 11040, epfEr: 16560, etf: 4200, netSalary: 138000 },
  { id: 4, emp_id: "EMP-004", name: "Ms. Nadia Fernando",  category: "Academic",     basicSalary: 45000,  allowances: 0,     deductions: 5000,  epfEe: 0,     epfEr: 0,     etf: 0,    netSalary: 40000  },
];

const totals = payrollData.reduce((acc, e) => ({
  gross:      acc.gross      + e.basicSalary + e.allowances,
  deductions: acc.deductions + e.deductions,
  epfEe:      acc.epfEe     + e.epfEe,
  epfEr:      acc.epfEr     + e.epfEr,
  etf:        acc.etf       + e.etf,
  net:        acc.net       + e.netSalary,
}), { gross: 0, deductions: 0, epfEe: 0, epfEr: 0, etf: 0, net: 0 });

const statusSteps = ["Draft", "Approved", "Paid"];

export default function RunPayroll() {
  const [month, setMonth]         = useState("2026-03");
  const [status, setStatus]       = useState("Draft");
  const [calculated, setCalculated] = useState(true);
  const [filterCat, setFilterCat] = useState("all");

  const stepIndex = statusSteps.indexOf(status);

  const filtered = payrollData.filter((e) =>
    filterCat === "all" || e.category === filterCat
  );

  const statusColor = { Draft: "warning", Approved: "indigo", Paid: "success" };

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Run Payroll</h1>
            <p className="mt-1 text-sm text-gray-500">Calculate, approve and lock monthly payroll</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            <CustomSelect sizing="sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">All</option>
              <option value="Academic">Academic</option>
              <option value="Non-Academic">Non-Academic</option>
            </CustomSelect>
            <StatusBadge color={statusColor[status]} className="px-3 py-1.5 text-sm font-semibold">{status}</StatusBadge>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            {statusSteps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  idx < stepIndex  ? "bg-green-500 text-white" :
                  idx === stepIndex ? "bg-purple-600 text-white" :
                  "bg-gray-200 text-gray-400"
                }`}>
                  {idx < stepIndex ? <HiCheck className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-sm font-medium ${idx === stepIndex ? "text-purple-600" : "text-gray-400"}`}>{step}</span>
                {idx < statusSteps.length - 1 && <div className={`h-0.5 w-12 ${idx < stepIndex ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <CustomButton color="purple" onClick={() => setCalculated(true)}>
            <HiPlay className="mr-2 h-4 w-4" /> Calculate
          </CustomButton>
          <CustomButton color="blue" outline onClick={() => setCalculated(true)}>
            <HiRefresh className="mr-2 h-4 w-4" /> Recalculate
          </CustomButton>
          {status === "Draft" && (
            <CustomButton color="indigo" onClick={() => setStatus("Approved")}>
              <HiCheck className="mr-2 h-4 w-4" /> Approve Payroll
            </CustomButton>
          )}
          {status === "Approved" && (
            <CustomButton color="success" onClick={() => setStatus("Paid")}>
              <HiLockClosed className="mr-2 h-4 w-4" /> Lock & Mark as Paid
            </CustomButton>
          )}
        </div>

        {/* Payroll Table */}
        {calculated && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
              <CustomTable hoverable>
                <CustomTableHead>
                  <CustomTableRow>
                    <CustomTableHeadCell>Employee</CustomTableHeadCell>
                    <CustomTableHeadCell>Basic Salary</CustomTableHeadCell>
                    <CustomTableHeadCell>Allowances</CustomTableHeadCell>
                    <CustomTableHeadCell>Gross</CustomTableHeadCell>
                    <CustomTableHeadCell>Deductions</CustomTableHeadCell>
                    <CustomTableHeadCell>EPF (Ee)</CustomTableHeadCell>
                    <CustomTableHeadCell>EPF (Er)</CustomTableHeadCell>
                    <CustomTableHeadCell>ETF</CustomTableHeadCell>
                    <CustomTableHeadCell className="text-green-600">Net Salary</CustomTableHeadCell>
                  </CustomTableRow>
                </CustomTableHead>
                <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((e) => (
                    <CustomTableRow key={e.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      <CustomTableCell>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          <StatusBadge color="indigo" className="text-xs">{e.emp_id}</StatusBadge>
                          <StatusBadge color="purple" className="text-xs">{e.category}</StatusBadge>
                        </div>
                      </CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700">{e.basicSalary.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-green-600">{e.allowances.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm font-semibold">{(e.basicSalary + e.allowances).toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-red-500">{e.deductions.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-orange-500">{e.epfEe.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-orange-400">{e.epfEr.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-orange-300">{e.etf.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm font-bold text-green-600">
                        Rs. {e.netSalary.toLocaleString()}
                      </CustomTableCell>
                    </CustomTableRow>
                  ))}
                </CustomTableBody>
              </CustomTable>
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50 sm:grid-cols-4">
              {[
                { label: "Total Gross",        value: totals.gross,      color: "text-gray-700" },
                { label: "Total Deductions",   value: totals.deductions, color: "text-red-600"  },
                { label: "Total EPF/ETF",      value: totals.epfEe + totals.epfEr + totals.etf, color: "text-orange-600" },
                { label: "Total Net Payable",  value: totals.net,        color: "text-green-600" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>Rs. {value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
