import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { Progress } from "flowbite-react";
import { HiPlus, HiEye, HiX } from "react-icons/hi";
import EmployeeLoanForm from "./EmployeeLoanForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const loans = [
  {
    id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",   loanType: "Staff Loan",
    principal: 200000, interestRate: 0, totalPayable: 200000,
    monthlyInstallment: 10000, remaining: 150000, startDate: "2025-09-01", status: "Active",
  },
  {
    id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   loanType: "Vehicle Loan",
    principal: 500000, interestRate: 8, totalPayable: 580000,
    monthlyInstallment: 16111, remaining: 483333, startDate: "2025-06-01", status: "Active",
  },
  {
    id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera", loanType: "Education Loan",
    principal: 150000, interestRate: 5, totalPayable: 157500,
    monthlyInstallment: 13125, remaining: 0, startDate: "2024-01-01", status: "Closed",
  },
  {
    id: 4, emp_id: "EMP-004", name: "Ms. Nadia Fernando",  loanType: "Festival Advance",
    principal: 30000, interestRate: 0, totalPayable: 30000,
    monthlyInstallment: 5000, remaining: 20000, startDate: "2026-01-01", status: "Active",
  },
];

const statusColor = { Active: "warning", Closed: "success" };

export default function EmployeeLoan() {
  const [showForm, setShowForm] = useState(false);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Loans</h1>
            <p className="mt-1 text-sm text-gray-500">Grant loans, track installments and manage balances</p>
          </div>
          <CustomButton color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Grant Loan
          </CustomButton>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Active Loans",      value: loans.filter((l) => l.status === "Active").length,                                        color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Total Outstanding", value: `Rs. ${loans.filter(l=>l.status==="Active").reduce((s,l)=>s+l.remaining,0).toLocaleString()}`, color: "text-red-600",    bg: "bg-red-50"    },
            { label: "Monthly Recovery",  value: `Rs. ${loans.filter(l=>l.status==="Active").reduce((s,l)=>s+l.monthlyInstallment,0).toLocaleString()}`, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Loan Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Principal</CustomTableHeadCell>
                  <CustomTableHeadCell>Interest</CustomTableHeadCell>
                  <CustomTableHeadCell>Total Payable</CustomTableHeadCell>
                  <CustomTableHeadCell>Monthly</CustomTableHeadCell>
                  <CustomTableHeadCell>Progress</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loans.map((l) => {
                  const paidPct = Math.round(((l.totalPayable - l.remaining) / l.totalPayable) * 100);
                  return (
                    <CustomTableRow key={l.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      <CustomTableCell>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{l.name}</p>
                        <p className="font-mono text-xs text-purple-500">{l.emp_id}</p>
                      </CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{l.loanType}</CustomTableCell>
                      <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Rs. {l.principal.toLocaleString()}
                      </CustomTableCell>
                      <CustomTableCell>
                        <StatusBadge color={l.interestRate === 0 ? "success" : "warning"} className="w-fit text-xs">
                          {l.interestRate}%
                        </StatusBadge>
                      </CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">
                        Rs. {l.totalPayable.toLocaleString()}
                      </CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">
                        Rs. {l.monthlyInstallment.toLocaleString()}
                      </CustomTableCell>
                      <CustomTableCell className="min-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <Progress progress={paidPct} size="sm" color="purple" />
                          <p className="text-xs text-gray-400">{paidPct}% paid</p>
                        </div>
                      </CustomTableCell>
                      <CustomTableCell>
                        <StatusBadge color={statusColor[l.status]} className="w-fit text-xs">{l.status}</StatusBadge>
                      </CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-2">
                          <CustomButton size="xs" color="blue" outline pill title="View Schedule">
                            <HiEye className="h-3.5 w-3.5" />
                          </CustomButton>
                          {l.status === "Active" && (
                            <CustomButton size="xs" color="failure" outline pill title="Close Loan">
                              <HiX className="h-3.5 w-3.5" />
                            </CustomButton>
                          )}
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  );
                })}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>

      {showForm && <EmployeeLoanForm closeForm={() => setShowForm(false)} />}
    </Layout>
  );
}
