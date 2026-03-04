import { useState } from "react";
import Layout from "../../../components/Layout";import { HiDocumentText, HiMail, HiDownload } from "react-icons/hi";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const payslipList = [
  { id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",   month: "March 2026",    netSalary: 85200,  status: "Generated" },
  { id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   month: "March 2026",    netSalary: 93389,  status: "Generated" },
  { id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera", month: "March 2026",    netSalary: 138000, status: "Generated" },
  { id: 4, emp_id: "EMP-004", name: "Ms. Nadia Fernando",  month: "March 2026",    netSalary: 40000,  status: "Generated" },
];

const payslipDetail = {
  "EMP-001": {
    earnings: [
      { label: "Basic Salary",       amount: 85000 },
      { label: "Transport Allowance", amount: 5000  },
      { label: "Mobile Allowance",    amount: 2000  },
    ],
    deductions: [
      { label: "EPF (8%)",            amount: 7360  },
      { label: "No-Pay Deduction",    amount: 0     },
    ],
    epfSummary: { ee: 7360, er: 11040, etf: 2550 },
    loanBalance: 150000,
    gross: 92000,
    totalDeductions: 6800,
    net: 85200,
  },
};

export default function Payslip() {
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [month, setMonth]             = useState("2026-03");

  const detail = selectedEmp ? payslipDetail[selectedEmp.emp_id] : null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Payslips</h1>
            <p className="mt-1 text-sm text-gray-500">Generate, preview and email employee payslips</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            <CustomButton color="purple" outline>
              <HiDownload className="mr-2 h-4 w-4" /> Download All
            </CustomButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Payslip List */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">Employee Payslips</p>
            </div>
            <div className="overflow-x-auto">
              <CustomTable hoverable>
                <CustomTableHead>
                  <CustomTableRow>
                    <CustomTableHeadCell>Employee</CustomTableHeadCell>
                    <CustomTableHeadCell>Net Pay</CustomTableHeadCell>
                    <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                  </CustomTableRow>
                </CustomTableHead>
                <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payslipList.map((p) => (
                    <CustomTableRow
                      key={p.id}
                      className={`cursor-pointer hover:bg-purple-50 dark:hover:bg-gray-700 ${selectedEmp?.id === p.id ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}
                      onClick={() => setSelectedEmp(p)}
                    >
                      <CustomTableCell>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        <p className="font-mono text-xs text-purple-500">{p.emp_id}</p>
                      </CustomTableCell>
                      <CustomTableCell className="text-sm font-semibold text-green-600">
                        Rs. {p.netSalary.toLocaleString()}
                      </CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-1">
                          <CustomButton size="xs" color="blue" outline pill title="Download PDF">
                            <HiDocumentText className="h-3.5 w-3.5" />
                          </CustomButton>
                          <CustomButton size="xs" color="purple" outline pill title="Email">
                            <HiMail className="h-3.5 w-3.5" />
                          </CustomButton>
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  ))}
                </CustomTableBody>
              </CustomTable>
            </div>
          </div>

          {/* Payslip Preview */}
          <div className="lg:col-span-2">
            {!selectedEmp ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <HiDocumentText className="h-10 w-10" />
                <p className="text-sm">Select an employee to preview payslip</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">

                {/* Payslip Header */}
                <div className="rounded-t-xl bg-purple-600 px-6 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold">PAYSLIP</p>
                      <p className="text-purple-200">{selectedEmp.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{selectedEmp.name}</p>
                      <p className="font-mono text-sm text-purple-200">{selectedEmp.emp_id}</p>
                    </div>
                  </div>
                </div>

                {detail ? (
                  <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">

                    {/* Earnings */}
                    <div className="p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-600">Earnings</p>
                      <div className="flex flex-col gap-2">
                        {detail.earnings.map((e) => (
                          <div key={e.label} className="flex justify-between text-sm">
                            <span className="text-gray-600">{e.label}</span>
                            <span className="font-medium text-gray-800">Rs. {e.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                          <span>Gross Salary</span>
                          <span className="text-green-600">Rs. {detail.gross.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="p-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-500">Deductions</p>
                      <div className="flex flex-col gap-2">
                        {detail.deductions.map((d) => (
                          <div key={d.label} className="flex justify-between text-sm">
                            <span className="text-gray-600">{d.label}</span>
                            <span className="font-medium text-gray-800">Rs. {d.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                          <span>Total Deductions</span>
                          <span className="text-red-500">Rs. {detail.totalDeductions.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-400">Payslip detail not available for preview.</div>
                )}

                {/* Net Salary Banner */}
                <div className="flex items-center justify-between rounded-b-xl bg-gray-50 px-6 py-4 dark:bg-gray-900/50">
                  <div className="flex flex-col gap-1">
                    {detail && (
                      <p className="text-xs text-gray-500">
                        EPF: Rs. {detail.epfSummary.ee.toLocaleString()} (Ee) + Rs. {detail.epfSummary.er.toLocaleString()} (Er) | ETF: Rs. {detail.epfSummary.etf.toLocaleString()}
                      </p>
                    )}
                    {detail && <p className="text-xs text-gray-500">Loan Balance: Rs. {detail.loanBalance.toLocaleString()}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Net Salary</p>
                    <p className="text-2xl font-bold text-green-600">Rs. {selectedEmp.netSalary.toLocaleString()}</p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
