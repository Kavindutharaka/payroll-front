import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { StatusBadge } from "../../components/StatusBadge";
import Layout from "../../components/Layout";
import {
  HiChartBar, HiDocumentText, HiCurrencyDollar, HiBriefcase,
  HiCalendar, HiDownload, HiExclamation, HiTable, HiPrinter, HiSearch, HiX, HiArrowLeft,
} from "react-icons/hi";
import { CustomButton, CustomInput } from "../../components/FormFields";
import { LoadingLine } from "../../components/CustomTable";
import {
  fetchPayrollSummaryReport, fetchPayrollDetailReport, fetchTaxReport,
  fetchEpfEtfReport, fetchLoanReport, fetchLeaveReport, downloadCSV,
  fetchEpfStatement, fetchEtfStatement, fetchStampDutyStatement,
  fetchPayeStatement, fetchMonthComparison, fetchAllowanceBreakdown,
  fetchCategoryAllowanceReport, fetchContractRenewalReport, fetchDeductionReport, rangeOf, monthsInRange,
  fetchContractStaffReport, fetchEmployeeListReport, fetchPayrollPrintSheet,
} from "../../services/reportService";
import { fetchSalaryPaymentFile, fetchNonBankPayments, fetchBankDetailsReport } from "../../services/bankAccountService";
import { buildEpfText, buildEtfText, downloadText } from "../../services/statutoryFiles";
import { downloadXlsx } from "../../services/xlsx";
import { promptDialog } from "../../ui/feedback";
import { useCan } from "../../auth/AuthContext";

const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Paper for printed reports: a report can name its own (`print`); otherwise the
// usual A4 landscape, and legal landscape once there are too many columns for A4.
const PRINT_PAGE  = "A4 landscape";
// Nadee's list (19 Oct): these six on legal paper, every other report on A4
const LEGAL = "legal landscape";
const shortMonth = (m) => {
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
};
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
// first and last day of the current month, as YYYY-MM-DD
const monthBounds = () => {
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const p = (n) => String(n).padStart(2, "0");
  return [`${y}-${p(m + 1)}-01`, `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}`];
};
const statusColor = { Permanent: "success", Temporary: "warning", Intern: "indigo", "Independent Contractor": "purple", Bank: "indigo", Cash: "warning", Cheque: "purple", Draft: "warning", Paid: "success", Approved: "indigo", Active: "warning", Upcoming: "indigo", Completed: "success", Closed: "gray", Pending: "warning", Rejected: "failure", "Contract renewal": "warning", "Mandatory retirement": "failure" };

// days to a contract's end, as the renewal report shows it
const daysLeft = (r) => {
  const n = r.daysRemaining;
  if (n === null || n === undefined) return r._subtotal ? "" : "No end date";
  if (n < 0) return `Expired ${-n} day${n === -1 ? "" : "s"} ago`;
  return n === 0 ? "Ends today" : `${n} day${n === 1 ? "" : "s"}`;
};

/* Each report declares how to load itself and which columns to show —
 * the same definition drives the on-screen table and the CSV export.
 * `range` says what the From-To dates do:
 *   "sum"    - every month in the range, each person's figures added up
 *   "single" - a one-month file (fund uploads, the bank file); a longer range is refused
 *   "filter" - records dated inside the range
 *   false    - a picture of today (current structures, ages); no dates apply
 * Column flags: `money` amounts, `num` other figures (both right-aligned in print),
 * `text` keeps a number-like value as text in the CSV, `wrap` lets a long cell
 * wrap on screen, and `tone(row)` gives a cell its colour. */
const REPORTS = [
  {
    id: "payroll-summary",
    name: "Payroll Summary",
    description: "Monthly payroll totals across all runs",
    icon: HiChartBar, color: "bg-purple-100 text-purple-600",
    range: "filter",
    load: (r) => fetchPayrollSummaryReport(r),
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
    description: "Full per-employee breakdown for a selected month, every earning and deduction",
    icon: HiTable, color: "bg-cyan-100 text-cyan-600",
    range: "sum",
    load: (r) => fetchPayrollDetailReport(r),
    print: LEGAL,
    printFont: 9,   // 295 mm wide on legal - still 30 mm from each paper edge
    excel: true,   // the auditors' soft copy - one sheet per month
    // Every deduction gets its own column. Showing only the total meant an
    // Insurance or Festival Advance line could not be checked against anything.
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "basicSalary", label: "Basic", money: true },
      { key: "budgetaryAllowance", label: "Budgetary", money: true },
      { key: "increment", label: "Increment", money: true },
      { key: "salaryAdjustment", label: "Salary Adj.", money: true },
      { key: "formTeacherAllowance", label: "Class Teacher", money: true },
      { key: "lateDays", label: "Late Days", num: true },
      { key: "otherAllowance", label: "Allowances", money: true },
      { key: "noPay", label: "No Pay", money: true },
      { key: "grossPay", label: "Gross", money: true },
      { key: "stampDuty", label: "Stamp Duty", money: true },
      { key: "paye", label: "PAYE", money: true },
      { key: "epfEmployee", label: "EPF 8%", money: true },
      { key: "epfEmployer", label: "EPF 12%", money: true },
      { key: "etf", label: "ETF 3%", money: true },
      { key: "loanDeduction", label: "Loan", money: true },
      { key: "insuranceDeduction", label: "Insurance", money: true },
      { key: "festivalAdvance", label: "Festival Adv.", money: true },
      { key: "advanceDeduction", label: "Advance", money: true },
      { key: "otherDeduction", label: "Other Ded.", money: true },
      { key: "totalDeductions", label: "Total Deductions", money: true },
      { key: "netPay", label: "Net Pay", money: true, strong: true },
      { key: "attendanceAllowance", label: "Attend. Allow.", money: true },
    ],
  },
  {
    // the second payroll option from the 20/10 meeting: only the columns Nadee
    // prints (Adjustments-3, item 8), on legal paper
    id: "payroll-print-sheet",
    name: "Payroll Detail — Print Sheet",
    description: "The customised payroll report: Nadee's 18 columns, for printing on legal paper",
    icon: HiTable, color: "bg-cyan-100 text-cyan-600",
    range: "sum",
    load: (r) => fetchPayrollPrintSheet(r),
    print: LEGAL,
    // 18 columns leave room on legal, so larger type and narrow margins (5 Nov)
    printFont: 12, printMargin: "5mm",
    excel: true,
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee Name" },
      { key: "basicSalary", label: "Basic", money: true },
      { key: "budgetaryAllowance", label: "Budg. Allow.", money: true },
      { key: "noPay", label: "No Pay", money: true },
      { key: "allowances", label: "Allowances", money: true },
      { key: "grossPay", label: "Gross", money: true },
      { key: "stampDuty", label: "Stamp Duty", money: true },
      { key: "paye", label: "PAYE", money: true },
      { key: "loanDeduction", label: "Loan", money: true },
      { key: "insuranceDeduction", label: "Insurance", money: true },
      { key: "festivalAdvance", label: "Festival Adv.", money: true },
      { key: "advanceDeduction", label: "Salary Adv.", money: true },
      { key: "epfEmployee", label: "EPF 8%", money: true },
      { key: "totalDeductions", label: "Total Deductions", money: true },
      { key: "netPay", label: "Net Pay", money: true, strong: true },
      { key: "epfEmployer", label: "EPF 12%", money: true },
      { key: "etf", label: "ETF 3%", money: true },
    ],
  },
  {
    id: "tax-report",
    name: "Tax Report",
    description: "PAYE per employee — one row each, months across for a longer period",
    icon: HiDocumentText, color: "bg-red-100 text-red-600",
    range: "sum",
    load: (r) => fetchTaxReport(r),
    print: LEGAL,
    // one month: Gross and PAYE. Several: each month's Gross and PAYE, then totals.
    columns: (r) => {
      const months = monthsInRange(r);
      const perMonth = months.length > 1
        ? months.flatMap((m) => {
            const k = m.replace("-", ""), label = shortMonth(m);
            return [
              { key: `g_${k}`, label: `${label} Gross`, money: true },
              { key: `p_${k}`, label: `${label} PAYE`, money: true },
            ];
          })
        : [];
      return [
        { key: "emp_id", label: "EPF No" },
        { key: "empName", label: "Name (as per TIN)" },
        { key: "tin", label: "TIN No", text: true },
        { key: "nic", label: "NIC", text: true },
        { key: "newNic", label: "New ID", text: true },
        ...perMonth,
        { key: "grossPay", label: months.length > 1 ? "Total Gross" : "Gross", money: true },
        { key: "paye", label: months.length > 1 ? "Total PAYE" : "PAYE", money: true, strong: true },
      ];
    },
  },
  {
    id: "epf-etf-report",
    name: "EPF / ETF Report",
    description: "Employee and employer contributions for a month",
    icon: HiCurrencyDollar, color: "bg-green-100 text-green-600",
    range: "sum",
    load: (r) => fetchEpfEtfReport(r),
    print: LEGAL,
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "basicSalary", label: "Basic", money: true },
      { key: "budgetaryAllowance", label: "Budgetary", money: true },
      { key: "increment", label: "Increment", money: true },
      { key: "salaryAdjustment", label: "Salary Adj.", money: true },
      { key: "noPay", label: "No Pay", money: true },
      { key: "totalEarnings", label: "Total Earnings", money: true, strong: true },
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
    range: "filter",
    load: (r) => fetchLoanReport(r),
    // recovered, outstanding and status as at the To date, from each loan's schedule
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "loanType", label: "Loan Type" },
      { key: "months", label: "Month(s)" },
      { key: "principal", label: "Principal", money: true },
      { key: "monthlyInstallment", label: "Monthly", money: true },
      { key: "monthlyInterest", label: "Monthly Interest", money: true },
      { key: "recovered", label: "Recovered", money: true },
      { key: "remaining", label: "Outstanding", money: true, strong: true },
      { key: "status", label: "Status", badge: true },
    ],
  },
  {
    id: "leave-report",
    name: "Leave Report",
    description: "Leave applications, approvals and days taken",
    icon: HiCalendar, color: "bg-blue-100 text-blue-600",
    range: "filter",
    load: (r) => fetchLeaveReport(r),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "leaveType", label: "Leave Type" },
      { key: "dateFrom", label: "From" },
      { key: "dateTo", label: "To" },
      { key: "days", label: "Days", num: true },
      { key: "status", label: "Status", badge: true },
    ],
  },

  /* ---- statutory statements ---- */
  {
    id: "epf-statement",
    name: "EPF E-Statement",
    description: "EPF upload file — matches the fund's 15-column format",
    icon: HiDocumentText, color: "bg-emerald-100 text-emerald-600",
    range: "single",
    load: (r) => fetchEpfStatement(r.fromMonth),
    print: LEGAL,
    textFile: "epf",   // the fixed-width file the fund's EPF generator wrote
    columns: [
      { key: "nicNumber", label: "NIC Number", text: true },
      { key: "surname", label: "Surname" },
      { key: "initials", label: "initials" },
      { key: "memberNumber", label: "Member Number", text: true },
      { key: "totalContribution", label: "Total Contribution", money: true },
      { key: "employerContribution", label: "Employer's Contribution", money: true },
      { key: "memberContribution", label: "Member's Contribution", money: true },
      { key: "totalEarnings", label: "Total Earnings", money: true },
      { key: "memberStatus", label: "Member Status E=Extg. N=New V=Vacated" },
      { key: "zone", label: "Zone" },
      { key: "employerNumber", label: "Employer Number" },
      { key: "contributionPeriod", label: "Contribution Period (YYYYMM)" },
      { key: "dataSubmissionNumber", label: "Data Submission Number" },
      { key: "daysWorked", label: "No.of days worked" },
      { key: "occupationGrade", label: "Occupation Classification Grade" },
    ],
  },
  {
    id: "etf-statement",
    name: "ETF E-Statement",
    description: "ETF upload file — matches the fund's 8-column generator format",
    icon: HiDocumentText, color: "bg-teal-100 text-teal-600",
    range: "single",
    load: (r) => fetchEtfStatement(r.fromMonth),
    print: LEGAL,
    textFile: "etf",   // Sampath's ETF contribution file
    columns: [
      { key: "nicNumber", label: "NIC/Passport Number", text: true },
      { key: "surname", label: "Surname" },
      { key: "initials", label: "Initials" },
      { key: "memberNumber", label: "Member Number", text: true },
      { key: "totalContribution", label: "Total Contribution", money: true },
      { key: "employerNumber", label: "Employer Number" },
      { key: "periodFrom", label: "Contribution From Period (YYYY/MM/DD)", text: true },
      { key: "periodTo", label: "Contribution To Period (YYYY/MM/DD)", text: true },
    ],
  },
  {
    id: "paye-statement",
    name: "PAYE Statement",
    description: "PAYE tax deducted per employee for filing",
    icon: HiDocumentText, color: "bg-rose-100 text-rose-600",
    range: "sum",
    load: (r) => fetchPayeStatement(r),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Name (as per TIN)" },
      { key: "tin", label: "TIN No", text: true },
      { key: "nic", label: "NIC", text: true },
      { key: "newNic", label: "New ID", text: true },
      { key: "grossPay", label: "Gross Pay", money: true },
      { key: "paye", label: "PAYE", money: true, strong: true },
    ],
  },
  {
    id: "stamp-duty",
    name: "Stamp Duty Statement",
    description: "Stamp duty collected for the month",
    icon: HiDocumentText, color: "bg-amber-100 text-amber-600",
    range: "sum",
    load: (r) => fetchStampDutyStatement(r),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "grossPay", label: "Gross Pay", money: true },
      { key: "stampDuty", label: "Stamp Duty", money: true, strong: true },
    ],
  },

  /* ---- analysis ---- */
  {
    id: "month-comparison",
    name: "Month Comparison",
    description: "Employees whose gross changed from the previous month, and why",
    icon: HiChartBar, color: "bg-violet-100 text-violet-600",
    range: "single",
    load: (r) => fetchMonthComparison(r.fromMonth),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "prevGross", label: "Previous Gross", money: true },
      { key: "currGross", label: "Current Gross", money: true },
      { key: "difference", label: "Difference", money: true,
        tone: (r) => (r._subtotal ? "" : r.difference < 0 ? "font-bold text-red-600" : "font-bold text-green-600") },
      { key: "reason", label: "Reason for the difference", wrap: true,
        tone: (r) => (/(New —|Not in the|Resigned)/.test(r.reason || "") ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900") },
    ],
  },
  {
    id: "allowance-breakdown",
    name: "Allowance Analysis",
    description: "Totals per allowance type (Club & Societies, Sports, Form Teacher…)",
    icon: HiCurrencyDollar, color: "bg-lime-100 text-lime-600",
    range: false,
    load: () => fetchAllowanceBreakdown(),
    columns: [
      { key: "componentName", label: "Allowance" },
      { key: "employeeCount", label: "Employees" },
      { key: "averageAmount", label: "Average", money: true },
      { key: "totalAmount", label: "Total", money: true, strong: true },
    ],
  },
  {
    id: "category-allowance",
    name: "Category Allowance Sheet",
    description: "Allowance details per employee for a month — Nadee's sheet layout",
    icon: HiChartBar, color: "bg-sky-100 text-sky-600",
    range: "single",
    load: (r) => fetchCategoryAllowanceReport(r.fromMonth),
    print: LEGAL,
    columns: [
      { key: "emp_id", label: "ID" },
      { key: "empName", label: "Title" },
      { key: "basicSalary", label: "Basic Salary", money: true },
      { key: "budgetaryAllowance", label: "Budgetary Allow", money: true },
      { key: "travelling", label: "Travelling", money: true },
      { key: "classTeacher", label: "Class Teacher Allow", money: true },
      { key: "other", label: "Other Allow", money: true },
      { key: "increase", label: "Increase in Allow", money: true },
      { key: "bmulla", label: "B'Mulla Allow", money: true },
      { key: "sports", label: "Sports Teacher Allow", money: true },
      { key: "clubs", label: "Clubs & Socie Allow", money: true },
      { key: "shuttle", label: "Shuttle Service", money: true },
      { key: "tp", label: "T.P. Allow", money: true },
      { key: "allowanceTotal", label: "Allowance Total", money: true },
      { key: "grossSalary", label: "Gross Salary", money: true, strong: true },
    ],
  },
  {
    id: "contract-staff",
    name: "Permanent Staff on Contract",
    description: "Staff kept on after 55 under a contract — days left to each contract's end, for renewals",
    icon: HiCalendar, color: "bg-indigo-100 text-indigo-600",
    range: false,
    load: () => fetchContractStaffReport(),
    columns: [
      { key: "emp_id", label: "Employee ID" },
      { key: "empName", label: "Name" },
      { key: "dob", label: "D.O.B" },
      { key: "age", label: "Age", num: true },
      { key: "contractStartDate", label: "Contract Start Date" },
      { key: "contractEndDate", label: "Contract End Date" },
      { key: "daysRemaining", label: "Days Remaining", render: daysLeft,
        // expired red, a month or less to go amber
        tone: (r) => (r.daysRemaining === null || r.daysRemaining === undefined ? "text-gray-400"
          : r.daysRemaining < 0 ? "font-bold text-red-600"
          : r.daysRemaining <= 30 ? "font-bold text-amber-600" : "") },
    ],
  },
  {
    id: "employee-list",
    name: "Employee List",
    description: "All current staff, grouped by category",
    icon: HiTable, color: "bg-slate-100 text-slate-600",
    range: false,
    load: () => fetchEmployeeListReport(),
    columns: [
      { key: "emp_id", label: "EPF No" },
      { key: "empName", label: "Name" },
      { key: "designation", label: "Designation" },
      { key: "employmentType", label: "Employment Type" },
      { key: "dateOfJoining", label: "Date Joined" },
      { key: "nic", label: "NIC", text: true },
    ],
  },
  {
    id: "contract-renewal",
    name: "Contract Renewals",
    description: "Staff 55+ by the To date — contract renewal at 55, mandatory retirement at 60",
    icon: HiCalendar, color: "bg-fuchsia-100 text-fuchsia-600",
    range: "filter",
    load: (r) => fetchContractRenewalReport(r.to),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "category", label: "Category" },
      { key: "dob", label: "Date of Birth" },
      { key: "age", label: "Age at To date", strong: true },
      { key: "action", label: "Action", badge: true },
      { key: "reaches60", label: "Reaches 60 on" },
      { key: "dateOfJoining", label: "Joined" },
    ],
  },
  ...[
    ["cash",   "Cash",   "Cash Payments",   "Staff paid in cash for the period"],
    ["cheque", "Cheque", "Cheque Payments", "Staff paid by cheque for the period"],
  ].map(([id, mode, name, description]) => ({
    id: `${id}-payments`,
    name, description,
    icon: HiCurrencyDollar, color: "bg-amber-100 text-amber-600",
    range: "sum",
    load: (r) => fetchNonBankPayments(r, mode),
    columns: [
      { key: "emp_id", label: "Emp ID" },
      { key: "empName", label: "Employee" },
      { key: "dateOfResignation", label: "Resigned" },
      { key: "netPay", label: "Net Pay", money: true },
      { key: "attendanceAllowance", label: "Attend. Allow", money: true },
      { key: "totalPaid", label: "Total Paid", money: true, strong: true },
    ],
  })),
  ...[
    ["insurance", "Insurance Deductions",       "Everyone with an insurance premium deducted this month"],
    ["advance",   "Salary Advance Deductions",  "Salary advances recovered this month"],
    ["festival",  "Festival Advance Deductions","Festival advance installments recovered this month"],
    ["loan",      "Loan Deductions",            "Loan installments recovered this month"],
    ["other",     "Other Deductions",           "Anything recovered outside the named deductions"],
  ].map(([kind, name, description]) => ({
    id: `deduction-${kind}`,
    name, description,
    icon: HiDocumentText, color: "bg-rose-100 text-rose-600",
    range: "sum",
    load: (r) => fetchDeductionReport(kind, r),
    columns: [
      { key: "emp_id", label: "EPF No" },
      { key: "empName", label: "Employee" },
      ...(kind === "loan" ? [
        { key: "capital", label: "Capital", money: true },
        { key: "interest", label: "Interest", money: true },
      ] : []),
      { key: "amount", label: kind === "loan" ? "Total Deduction" : "Deduction", money: true, strong: true },
    ],
  })),
  {
    id: "bank-payment-file",
    name: "Bank Payment File",
    description: "Sampath bulk salary transfer — matches their SALARY FORMAT sheet",
    icon: HiBriefcase, color: "bg-indigo-100 text-indigo-600",
    range: "single",
    load: (r) => fetchSalaryPaymentFile(r.fromMonth),
    print: "A4 portrait",
    columns: [
      { key: "name", label: "NAME" },
      { key: "accountNo", label: "ACCOUNT NO.", text: true },
      { key: "bank", label: "BANK", text: true },
      { key: "branch", label: "BRANCH", text: true },
      { key: "amount", label: "AMOUNT", money: true, strong: true },
      { key: "id", label: "ID" },
    ],
  },
  {
    id: "bank-details",
    name: "Bank Details",
    description: "The bank transfer with bank and branch names — for checking, not for upload",
    icon: HiBriefcase, color: "bg-indigo-100 text-indigo-600",
    range: "single",
    load: (r) => fetchBankDetailsReport(r.fromMonth),
    columns: [
      { key: "emp_id", label: "EPF No" },
      { key: "accountName", label: "Account Name" },
      { key: "bank", label: "Bank" },
      { key: "bankCode", label: "Bank Code", text: true },
      { key: "branch", label: "Branch" },
      { key: "branchCode", label: "Branch Code", text: true },
      { key: "accountNo", label: "Account No", text: true },
      { key: "amount", label: "Amount", money: true, strong: true },
    ],
  },
];

/* The list on the left, in the order people look for things */
const GROUPS = [
  ["Payroll", ["payroll-summary", "payroll-detail", "payroll-print-sheet", "month-comparison", "allowance-breakdown", "category-allowance"]],
  ["Tax & statutory", ["tax-report", "paye-statement", "epf-etf-report", "epf-statement", "etf-statement", "stamp-duty"]],
  ["Bank & payments", ["bank-payment-file", "bank-details", "cash-payments", "cheque-payments"]],
  ["Deductions & loans", ["deduction-insurance", "deduction-advance", "deduction-festival", "deduction-loan", "deduction-other", "loan-report"]],
  ["Staff", ["employee-list", "leave-report", "contract-staff", "contract-renewal"]],
];
const BY_ID = Object.fromEntries(REPORTS.map((r) => [r.id, r]));
// anything not placed above still shows, at the end
const PLACED = new Set(GROUPS.flatMap(([, ids]) => ids));
const LIST = [...GROUPS, ["Other", REPORTS.filter((r) => !PLACED.has(r.id)).map((r) => r.id)]]
  .map(([label, ids]) => [label, ids.map((id) => BY_ID[id]).filter(Boolean)])
  .filter(([, items]) => items.length);

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/* One-click periods: this month, last month, and the tax year (April to March) */
const PRESETS = [
  ["This month", () => monthBounds()],
  ["Last month", () => { const d = new Date(); return [ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), ymd(new Date(d.getFullYear(), d.getMonth(), 0))]; }],
  ["Tax year", () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return [`${y}-04-01`, `${y + 1}-03-31`]; }],
];

export default function Reports() {
  const canExport = useCan()("reports.export");
  // the open report is part of the address (?r=...), so a refresh or Back keeps it
  const [params, setParams] = useSearchParams();
  const selectedId = BY_ID[params.get("r")] ? params.get("r") : null;
  const setSelectedId = useCallback((id) => setParams(id ? { r: id } : {}, { replace: true }), [setParams]);
  const [search, setSearch] = useState("");

  // phone / tablet: the list gives way to the detail - start it at the top
  useEffect(() => { if (window.innerWidth < 1024) window.scrollTo(0, 0); }, [selectedId]);
  const tableRef = useRef(null);
  const shownGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return LIST;
    return LIST.map(([label, items]) => [label, items.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(term))])
      .filter(([, items]) => items.length);
  }, [search]);
  const [from, setFrom]             = useState(() => monthBounds()[0]);
  const [to, setTo]                 = useState(() => monthBounds()[1]);
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [hasRun, setHasRun]         = useState(true);   // is there any payroll in the range?
  const [page, setPage]             = useState(1);

  const report = REPORTS.find((r) => r.id === selectedId) ?? null;

  const range       = useMemo(() => rangeOf(from, to), [from, to]);
  const invalid     = !from || !to || from > to;
  const spansMonths = range.fromMonth !== range.toMonth;
  const rangeLabel  = spansMonths
    ? `${monthLabel(range.fromMonth)} – ${monthLabel(range.toMonth)}`
    : monthLabel(range.fromMonth);
  // a one-month upload file over several months would be rejected by the fund or the bank
  const blocked = Boolean(report?.range) && (invalid || (report.range === "single" && spansMonths));

  // most reports have fixed columns; the tax report grows a pair per month
  const columns = !report ? []
    : typeof report.columns === "function" ? report.columns(range) : report.columns;

  // 229 rows on one page was too long to work with - 50 a page, while the TOTAL
  // row and the CSV export still cover every row
  const PER_PAGE  = 50;
  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current   = Math.min(page, pageCount);
  const visible   = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  useEffect(() => { setPage(1); }, [selectedId, from, to]);
  useEffect(() => { tableRef.current?.scrollTo?.({ top: 0 }); }, [selectedId, from, to, page]);

  const runReport = useCallback(async (rep, m) => {
    if (!rep) return;
    setLoading(true); setError(""); setRows([]);
    try {
      const data = await rep.load(m);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      if (!list.length && rep.range && rep.range !== "filter") {
        const runs = await fetchPayrollSummaryReport(m).catch(() => []);
        setHasRun(Array.isArray(runs) && runs.length > 0);
      } else setHasRun(true);
    } catch (e) {
      console.error(e);
      setError("Could not load this report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!report) return;
    if (blocked) { setRows([]); setError(""); return; }
    runReport(report, range);
  }, [report, range, blocked, runReport]);

  const handleExport = () => {
    if (!report || rows.length === 0) return;
    // keep `text` - without it account numbers, NICs and branch codes reach Excel
    // as numbers and come out as 1.0045E+11 or lose their leading zeros
    const cols = columns.map((c) => ({ key: c.key, label: c.label, text: c.text }));
    const suffix = !report.range ? "" : spansMonths ? `-${range.fromMonth}_${range.toMonth}` : `-${range.fromMonth}`;
    downloadCSV(`${report.id}${suffix}.csv`, rows, cols);
  };

  const emptyMessage =
    !report?.range ? "No records yet."
    : invalid ? "The From date must be on or before the To date."
    : report.range === "single" && spansMonths
      ? "This is a one-month file — choose From and To dates inside the same month."
    : report.range === "filter" || hasRun
      ? `Nothing to show for ${rangeLabel} — the payroll has no entries for this report.`
    : `No payroll for ${rangeLabel} — run the payroll for this period first.`;

  /* The upload text file, written the way the fund's Excel generator wrote it.
   * The ETF one asks, as the generator did, for the number of lines on the
   * first page of Form II - it goes into the header record. */
  const handleTextFile = async () => {
    if (!report?.textFile || rows.length === 0) return;
    const ym = range.fromMonth.replace("-", "");
    if (report.textFile === "epf") { downloadText(`EPF_${ym}.txt`, buildEpfText(rows)); return; }
    const ans = await promptDialog({
      title: "ETF upload file",
      message: "How many lines are on the first page of Form II?",
      label: "Lines on page 1 (1 – 99)",
      inputMode: "numeric",
      confirmLabel: "Create file",
      validate: (v) => {
        const x = Number(String(v).trim());
        return Number.isInteger(x) && x >= 1 && x <= 99 ? null : "Enter a whole number from 1 to 99.";
      },
    });
    if (ans === null) return;
    const n = Number(String(ans).trim());
    setError("");
    downloadText(`ETF_${ym}.txt`, buildEtfText(rows, n));
  };

  /* The auditors' soft copy: an Excel workbook with the report for each month of
   * the range on its own sheet, totals at the foot, then a summary sheet. Built
   * from the same report definition as the screen, so the figures match. */
  const [exporting, setExporting] = useState(false);
  const handleExcel = async () => {
    if (!report?.excel || exporting) return;
    setExporting(true); setError("");
    try {
      const printed = new Date().toLocaleDateString("en-GB");
      const summary = [];
      const sheets = [];
      for (const m of monthsInRange(range)) {
        const one = rangeOf(`${m}-01`, `${m}-28`);
        const data = (await report.load(one)) || [];
        const cols = typeof report.columns === "function" ? report.columns(one) : report.columns;
        const list = data.filter((r) => !r._subtotal);
        const total = (k) => list.reduce((a, r) => a + Number(r[k] || 0), 0);
        sheets.push({
          name: shortMonth(m),
          freeze: 4,
          widths: cols.map((c) => (c.key === "empName" ? 32 : c.money ? 13 : 10)),
          rows: [
            [{ v: `${report.name} — ${monthLabel(m)}`, size: 14 }],
            [`Asian International School · exported ${printed} · amounts in Rs. · ${list.length} employees`],
            [],
            cols.map((c) => ({ v: c.label, bold: true })),
            ...list.map((r) => cols.map((c) => (c.money ? { v: Number(r[c.key] || 0), money: true }
              : c.num ? Number(r[c.key] || 0) : r[c.key] ?? ""))),
            cols.map((c, i) => (i === 0 ? { v: "TOTAL", bold: true } : c.money ? { v: total(c.key), money: true, bold: true } : "")),
          ],
        });
        summary.push([shortMonth(m), list.length, ...["grossPay", "totalDeductions", "netPay"].map((k) => ({ v: total(k), money: true }))]);
      }
      if (!sheets.some((s) => s.rows.length > 5)) { setError(`No payroll to export for ${rangeLabel}.`); return; }
      sheets.unshift({
        name: "Summary",
        widths: [14, 12, 16, 16, 16],
        rows: [
          [{ v: `${report.name} — ${rangeLabel}`, size: 14 }],
          [`Asian International School · exported ${printed} · amounts in Rs. · one sheet per month follows`],
          [],
          ["Month", "Employees", "Gross", "Deductions", "Net Pay"].map((v) => ({ v, bold: true })),
          ...summary,
        ],
      });
      const suffix = spansMonths ? `${range.fromMonth}_${range.toMonth}` : range.fromMonth;
      downloadXlsx(`${report.id}-${suffix}.xlsx`, sheets);
    } catch (e) {
      console.error(e);
      setError("Could not build the Excel file.");
    } finally {
      setExporting(false);
    }
  };

  /* A printed heading of two or three short words goes on two lines -
   * "Total / Deductions", "Class / Teacher" - so the column is as wide as its
   * figures rather than its heading. Longer headings wrap as they need to. */
  const printLabel = (label) => {
    const words = String(label).split(" ");
    if (words.length < 2 || words.length > 3 || label.length <= 7) return label;
    const cut = words.length === 3 ? (words[0].length + words[1].length <= words[2].length + 3 ? 2 : 1) : 1;
    return <>{words.slice(0, cut).join(" ")}<br />{words.slice(cut).join(" ")}</>;
  };

  // one cell as printed - amounts without "Rs.", which the heading states once
  const cellText = (r, c) =>
    c.render ? c.render(r) : c.money ? money(r[c.key]) : (r[c.key] ?? (r._subtotal ? "" : "—"));

  const totalsFor = (col) =>
    rows.reduce((a, r) => (r._subtotal ? a : a + Number(r[col] || 0)), 0);
  const recordCount = rows.filter((r) => !r._subtotal).length;
  const paper = report?.print || PRINT_PAGE;
  const printPx = report?.printFont ?? (columns.length > 20 ? 8.5 : 9);
  const printMargin = report?.printMargin || "8mm";

  /* A PDF of the report, laid out like the printout - same paper, columns, totals.
   * For the soft copies that used to go through Print, Save as PDF. */
  /* The same split for a PDF heading, as a line break the PDF table understands */
  const pdfLabel = (label) => {
    const words = String(label).split(" ");
    if (words.length < 2 || words.length > 3 || label.length <= 7) return label;
    const cut = words.length === 3 ? (words[0].length + words[1].length <= words[2].length + 3 ? 2 : 1) : 1;
    return `${words.slice(0, cut).join(" ")}\n${words.slice(cut).join(" ")}`;
  };

  /* A PDF of the report, on the report's own paper, with totals and page numbers.
   * The table is as wide as its columns and centred, with at least PDF_SAFE mm left
   * clear down each side: the first PDFs ran edge to edge, and Nadee's printer cut
   * off the Emp ID and Attend. Allow. columns (printout of 5 Nov). Within that, the
   * type is as large as will fit, so a sheet with fewer columns prints bigger. */
  const PDF_SAFE = 15;
  const handlePdf = async () => {
    if (!report || rows.length === 0) return;
    // fetched only when asked for - it would add 140 KB to every page load otherwise
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const [size, orientation] = paper.split(" ");
    const newDoc = () => new jsPDF({ orientation, unit: "mm", format: size.toLowerCase(), compress: true });
    const doc = newDoc();
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const vMargin = 8;
    const meta = `${report.range ? `${rangeLabel} · ` : ""}Asian International School · printed ${new Date().toLocaleDateString("en-GB")}` +
      (columns.some((c) => c.money) ? " · amounts in Rs." : "");
    const asText = (v) => (v === null || v === undefined ? "" : typeof v === "object" ? "" : String(v));
    const head = [columns.map((c) => pdfLabel(c.label))];
    const body = rows.map((r) => columns.map((c) => asText(cellText(r, c))));
    const subRows = new Set(rows.map((r, i) => (r._subtotal ? i : -1)).filter((i) => i >= 0));
    if (columns.some((c) => c.money)) {
      body.push(columns.map((c, i) => (i === 0 ? "TOTAL" : c.money ? money(totalsFor(c.key)) : "")));
    }
    const right = Object.fromEntries(columns.map((c, i) => [i, { halign: c.money || c.num ? "right" : "left" }]));
    const options = (fontSize) => ({
      styles: { fontSize, cellPadding: { top: 0.6, bottom: 0.6, left: 0.8, right: 0.8 }, lineWidth: 0.1, lineColor: 150, textColor: 0, overflow: "linebreak" },
      headStyles: { fillColor: [238, 238, 238], textColor: 0, fontStyle: "bold", valign: "bottom" },
      columnStyles: right,
    });

    // measure on a scratch page with the widest entry of each column (and the
    // headings and totals) - laying out every row at every size would be slow
    const sample = [body[body.length - 1], ...columns.map((_, i) =>
      body.reduce((best, r) => (String(r[i]).length > String(best[i]).length ? r : best), body[0]))];
    const widthAt = (fontSize) => {
      const scratch = newDoc();
      autoTable(scratch, { head, body: sample, tableWidth: "wrap", margin: 0, ...options(fontSize) });
      return scratch.lastAutoTable.columns.reduce((a, c) => a + c.width, 0);
    };
    const room = pageW - 2 * PDF_SAFE;
    let fontSize = 5.5;
    for (let f = 11; f >= 5.5; f -= 0.25) { if (widthAt(f) <= room) { fontSize = f; break; } }
    const tableW = Math.min(widthAt(fontSize), room);
    const left = Math.max(PDF_SAFE, (pageW - tableW) / 2);

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(report.name, left, vMargin + 4);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(meta, left, vMargin + 9);
    autoTable(doc, {
      head, body,
      startY: vMargin + 12,
      margin: { left, right: pageW - left - tableW, top: vMargin, bottom: vMargin },
      tableWidth: tableW,
      ...options(fontSize),
      showHead: "everyPage",
      didParseCell: (d) => {
        if (d.section !== "body") return;
        if (d.row.index === rows.length) { d.cell.styles.fontStyle = "bold"; d.cell.styles.fillColor = [232, 232, 232]; }
        else if (subRows.has(d.row.index)) { d.cell.styles.fontStyle = "bold"; d.cell.styles.fillColor = [245, 245, 245]; }
      },
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i += 1) {
      doc.setPage(i); doc.setFontSize(7);
      doc.text(`${recordCount} record${recordCount !== 1 ? "s" : ""} · page ${i} of ${pages}`, left + tableW, pageH - 4, { align: "right" });
    }
    const suffix = !report.range ? "" : spansMonths ? `-${range.fromMonth}_${range.toMonth}` : `-${range.fromMonth}`;
    doc.save(`${report.id}${suffix}.pdf`);
  };

  return (
    <Layout>
      {!canExport && (
        <p className="hidden p-8 text-sm text-gray-700 print:block">Printing reports isn't part of your role. Ask the payroll administrator if you need a printed copy.</p>
      )}
      <div className={`flex flex-col gap-4 lg:h-[calc(100vh-3rem)] ${canExport ? "" : "print:hidden"}`}>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports</h1>
          <p className="mt-1 hidden text-sm text-gray-500 dark:text-gray-400 sm:block">Pick a report from the list. It opens alongside, with its period, totals and exports.</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">

          {/* Report list */}
          <aside className={`${report ? "hidden lg:flex" : "flex"} min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`} aria-label="Reports">
            <div className="border-b border-gray-100 p-3 dark:border-gray-700">
              <label className="relative block">
                <span className="sr-only">Find a report</span>
                <HiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a report"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </label>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {shownGroups.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400">No report matches “{search.trim()}”.</p>
              ) : shownGroups.map(([label, items]) => (
                <div key={label} className="mb-2 last:mb-0">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
                  {items.map((r) => {
                    const Icon = r.icon;
                    const active = selectedId === r.id;
                    return (
                      <button key={r.id} type="button" onClick={() => setSelectedId(r.id)} aria-current={active ? "page" : undefined}
                        title={r.description}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
                          active ? "bg-purple-50 font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                                 : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${r.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          {/* The open report */}
          {!report ? (
            <section className="hidden min-h-[20rem] flex-col items-center justify-center rounded-xl border border-dashed lg:flex border-gray-300 bg-white px-6 text-center dark:border-gray-600 dark:bg-gray-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                <HiChartBar className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100">Choose a report</p>
              <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                {REPORTS.length} reports, grouped by what they’re for. They open on the current month; change the period once one is open.
              </p>
            </section>
          ) : (
            <section className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {/* title, period and exports */}
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => setSelectedId(null)}
                      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 lg:hidden">
                      <HiArrowLeft className="h-4 w-4" /> All reports
                    </button>
                    <h2 className="font-semibold text-gray-800 dark:text-white">{report.name}</h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{report.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report.textFile && (
                      <CustomButton perm="reports.export" color="gray" outline size="sm" disabled={rows.length === 0 || loading} onClick={handleTextFile}>
                        <HiDocumentText className="mr-2 h-4 w-4" /> Text File
                      </CustomButton>
                    )}
                    {report.excel && (
                      <CustomButton perm="reports.export" color="gray" outline size="sm" disabled={rows.length === 0 || exporting || blocked || loading}
                        onClick={handleExcel} title="One Excel sheet per month of the range, for the auditors">
                        <HiTable className="mr-2 h-4 w-4" /> {exporting ? "Building…" : "Excel (by month)"}
                      </CustomButton>
                    )}
                    <CustomButton perm="reports.export" color="gray" outline size="sm" disabled={rows.length === 0 || loading} onClick={() => window.print()}>
                      <HiPrinter className="mr-2 h-4 w-4" /> Print
                    </CustomButton>
                    <CustomButton perm="reports.export" color="gray" outline size="sm" disabled={rows.length === 0 || loading} onClick={handlePdf}>
                      <HiDocumentText className="mr-2 h-4 w-4" /> PDF
                    </CustomButton>
                    <CustomButton perm="reports.export" color="purple" size="sm" disabled={rows.length === 0 || loading} onClick={handleExport}>
                      <HiDownload className="mr-2 h-4 w-4" /> CSV
                    </CustomButton>
                  </div>
                </div>

                {report.range ? (
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    <div className="w-[calc(50%-0.5rem)] sm:w-40">
                      <p className="mb-1 text-xs text-gray-500">From</p>
                      <CustomInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="w-[calc(50%-0.5rem)] sm:w-40">
                      <p className="mb-1 text-xs text-gray-500">To</p>
                      <CustomInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pb-1.5">
                      {PRESETS.filter(([label]) => !(report.range === "single" && label === "Tax year")).map(([label, get]) => {
                        const [f, t] = get();
                        const on = f === from && t === to;
                        return (
                          <button key={label} type="button" onClick={() => { setFrom(f); setTo(t); }} aria-pressed={on}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on
                              ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
                              : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="pb-2 text-xs text-gray-500 dark:text-gray-400">
                      Showing <span className="font-medium text-gray-700 dark:text-gray-200">{rangeLabel}</span>
                      {report.range === "single" ? " · one-month file" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">As of today. This report has no period.</p>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <HiExclamation className="h-5 w-5 flex-shrink-0" /> {error}
                    <button type="button" onClick={() => setError("")} className="ml-auto rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40" aria-label="Dismiss">
                      <HiX className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* the figures scroll here; the headings and the total stay put */}
              <div ref={tableRef} className="min-h-[16rem] flex-1 overflow-auto overscroll-contain">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 shadow-[inset_0_-1px_0_rgb(229,231,235)] dark:bg-gray-900 dark:text-gray-400 dark:shadow-[inset_0_-1px_0_rgb(55,65,81)]">
                    <tr>
                      {columns.map((c) => <th key={c.key} className={`whitespace-nowrap px-5 py-3 ${c.money || c.num ? "text-right" : ""}`}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading ? (
                      <tr><td colSpan={columns.length} className="py-12 text-sm text-gray-400"><div className="table-message"><LoadingLine label={`Loading ${report.name}…`} /></div></td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={columns.length} className="py-12 text-sm text-gray-400"><div className="table-message">{emptyMessage}</div></td></tr>
                    ) : visible.map((r, i) => (
                      <tr key={`${r.emp_id ?? r.runMonth ?? i}-${i}`}
                        className={r._subtotal ? "bg-gray-50 font-semibold dark:bg-gray-900/40" : "hover:bg-purple-50 dark:hover:bg-gray-700"}>
                        {columns.map((c) => (
                          <td key={c.key} className={`${c.wrap ? "min-w-[18rem] whitespace-normal" : "whitespace-nowrap"} px-5 py-2.5 ${c.money || c.num ? "text-right tabular-nums" : ""} ${
                            c.tone && !r._subtotal ? (c.tone(r) || "text-gray-700 dark:text-gray-300")
                              : c.strong ? "font-bold text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                            {c.badge && !r._subtotal ? (
                              <StatusBadge color={statusColor[r[c.key]] ?? "gray"} className="w-fit text-xs">{r[c.key]}</StatusBadge>
                            ) : c.render ? c.render(r)
                              : c.money ? money(r[c.key])
                              : (r[c.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {!loading && rows.length > 0 && columns.some((c) => c.money) && (
                    <tfoot className="sticky bottom-0 z-10 bg-gray-50 text-sm font-semibold shadow-[inset_0_1px_0_rgb(209,213,219)] dark:bg-gray-900 dark:shadow-[inset_0_1px_0_rgb(75,85,99)]">
                      <tr>
                        {columns.map((c, idx) => (
                          <td key={c.key} className={`whitespace-nowrap px-5 py-3 text-gray-800 dark:text-gray-100 ${c.money ? "text-right tabular-nums" : ""}`}>
                            {idx === 0 ? "TOTAL" : c.money ? money(totalsFor(c.key)) : ""}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-2.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <span>
                  {loading ? "Loading…" : rows.length === 0 ? "No records"
                    : pageCount > 1
                      ? `Rows ${(current - 1) * PER_PAGE + 1}–${Math.min(current * PER_PAGE, rows.length)} of ${rows.length} · ${recordCount} records`
                      : `${recordCount} record${recordCount !== 1 ? "s" : ""}`}
                  {!loading && rows.length > 0 && columns.some((c) => c.money) ? " · amounts in Rs. · the total covers every page" : ""}
                </span>
                {pageCount > 1 && !loading && (
                  <div className="flex items-center gap-2">
                    <CustomButton size="xs" color="gray" outline disabled={current <= 1}
                      onClick={() => setPage(current - 1)}>Previous</CustomButton>
                    <span>Page {current} of {pageCount}</span>
                    <CustomButton size="xs" color="gray" outline disabled={current >= pageCount}
                      onClick={() => setPage(current + 1)}>Next</CustomButton>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* The printed copy: all rows on plain paper, with the title, period and
            totals. Hidden on screen; the only thing that prints from this page. */}
        {report && rows.length > 0 && (
          <div id="report-print" className="report-print-only">
           {/* The sheet is as wide as its columns and centred on the paper. Stretched
               edge to edge, any printer offset cut off the first column - the EPF
               numbers on Nadee's legal printout of 20 October - and the spare width
               opened a wide gap after the names. */}
           <div className="print-sheet">
            <h2>{report.name}</h2>
            <p className="report-print-meta">
              {report.range ? `${rangeLabel} · ` : ""}Asian International School · printed {new Date().toLocaleDateString("en-GB")}
              {columns.some((c) => c.money) ? " · amounts in Rs." : ""}
            </p>
            <table>
              <thead>
                <tr>{columns.map((c) => <th key={c.key} className={c.money || c.num ? "num" : ""}>{printLabel(c.label)}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`p-${i}`} className={r._subtotal ? "sub" : ""}>
                    {columns.map((c) => <td key={c.key} className={`${c.money || c.num ? "num" : ""} ${c.wrap ? "wrap" : ""}`}>{cellText(r, c)}</td>)}
                  </tr>
                ))}
              </tbody>
              {/* A <tfoot> is repeated by the browser at the foot of every printed
                  page, which put the grand total on page 1 of 9. As an ordinary last
                  row it prints once, at the end. */}
              {columns.some((c) => c.money) && (
                <tbody>
                  <tr className="grand">
                    {columns.map((c, idx) => (
                      <td key={c.key} className={c.money ? "num" : ""}>
                        {idx === 0 ? "TOTAL" : c.money ? money(totalsFor(c.key)) : ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              )}
            </table>
            <p className="report-print-meta">{recordCount} record{recordCount !== 1 ? "s" : ""}</p>
           </div>
          </div>
        )}

        <style>{`
          .report-print-only { display: none; }
          @media print {
            @page { size: ${paper}; margin: ${printMargin}; }
            body * { visibility: hidden; }
            .report-print-only, .report-print-only * { visibility: visible; }
            .report-print-only { display: block; position: absolute; left: 0; top: 0; width: 100%;
                                 color: #000; font-size: ${printPx}px; }
            .report-print-only .print-sheet { display: table; margin: 0 auto; }   /* as wide as the table, centred */
            .report-print-only h2 { font-size: 13px; font-weight: 700; margin: 0 0 2px; }
            .report-print-only .report-print-meta { font-size: 8px; color: #444; margin: 0 0 6px; }
            .report-print-only table { border-collapse: collapse; }
            .report-print-only th, .report-print-only td { border: 1px solid #999; padding: 1px 2px; text-align: left; }
            .report-print-only td.wrap { min-width: 60mm; }
            .report-print-only .num { white-space: nowrap; }
            .report-print-only th { white-space: normal; vertical-align: bottom; }   /* long headings wrap */
            .report-print-only th { background: #eee; font-weight: 700; }
            .report-print-only .num { text-align: right; }
            .report-print-only tr.grand td { font-weight: 700; background: #e8e8e8; border-top: 2px solid #333; }
            .report-print-only tr.sub td { font-weight: 700; background: #f5f5f5; }
            .report-print-only thead { display: table-header-group; }   /* headings repeat on every page */
            .report-print-only tr { page-break-inside: avoid; }
          }
        `}</style>

      </div>
    </Layout>
  );
}
