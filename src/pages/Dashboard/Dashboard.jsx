import { useState } from "react";
import Layout from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import {
  HiUsers,
  HiCurrencyDollar,
  HiDocumentText,
  HiClock,
  HiBriefcase,
  HiPlay,
  HiChartBar,
} from "react-icons/hi";
import { CustomSelect, CustomButton } from "../../components/FormFields";

const kpiData = [
  {
    label: "Total Employees",
    value: "24",
    sub: "+2 this month",
    icon: HiUsers,
    color: "bg-purple-100 text-purple-600",
    trend: "up",
  },
  {
    label: "Total Payroll",
    value: "Rs. 1,245,000",
    sub: "March 2026",
    icon: HiCurrencyDollar,
    color: "bg-green-100 text-green-600",
    trend: "up",
  },
  {
    label: "Total EPF / ETF",
    value: "Rs. 149,400",
    sub: "Employer + Employee",
    icon: HiDocumentText,
    color: "bg-blue-100 text-blue-600",
    trend: "neutral",
  },
  {
    label: "Pending Approvals",
    value: "3",
    sub: "Leave requests",
    icon: HiClock,
    color: "bg-yellow-100 text-yellow-600",
    trend: "down",
  },
  {
    label: "Active Loans",
    value: "7",
    sub: "Rs. 350,000 outstanding",
    icon: HiBriefcase,
    color: "bg-red-100 text-red-600",
    trend: "neutral",
  },
];

const recentPayrolls = [
  { month: "February 2026", employees: 24, total: "Rs. 1,220,000", status: "Paid" },
  { month: "January 2026",  employees: 24, total: "Rs. 1,198,500", status: "Paid" },
  { month: "December 2025", employees: 23, total: "Rs. 1,175,000", status: "Paid" },
];

const statusColor = { Draft: "warning", Approved: "indigo", Paid: "success" };

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [category, setCategory] = useState("all");

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Payroll overview and quick actions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Category filter */}
            <CustomSelect value={category} onChange={(e) => setCategory(e.target.value)} sizing="sm">
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="non-academic">Non-Academic</option>
            </CustomSelect>
            {/* Month selector */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            {/* Payroll status badge */}
            <StatusBadge color="warning" className="px-3 py-1.5 text-sm font-medium">
              Draft
            </StatusBadge>
            {/* Quick Payroll Run */}
            <CustomButton color="purple" size="sm">
              <HiPlay className="mr-2 h-4 w-4" />
              Quick Payroll Run
            </CustomButton>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-800 dark:text-white">{kpi.value}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{kpi.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Recent Payroll History */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                Recent Payroll History
              </h2>
              <HiChartBar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex flex-col gap-3">
              {recentPayrolls.map((p) => (
                <div
                  key={p.month}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{p.month}</p>
                    <p className="text-xs text-gray-400">{p.employees} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{p.total}</p>
                    <StatusBadge color={statusColor[p.status]} className="mt-1 text-xs">
                      {p.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Add Employee",       href: "/emp/manage",          color: "bg-purple-50 text-purple-600 hover:bg-purple-100", icon: HiUsers },
                { label: "Run Payroll",         href: "/payroll/run",         color: "bg-green-50 text-green-600 hover:bg-green-100",   icon: HiPlay },
                { label: "Apply Leave",         href: "/leave/tracking",      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",     icon: HiClock },
                { label: "Grant Loan",          href: "/loan/employee",       color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",icon: HiBriefcase },
                { label: "Salary Components",   href: "/config/components",   color: "bg-pink-50 text-pink-600 hover:bg-pink-100",     icon: HiDocumentText },
                { label: "View Reports",        href: "/reports",             color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",icon: HiChartBar },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    className={`flex items-center gap-3 rounded-lg p-4 text-sm font-medium transition-colors ${action.color}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {action.label}
                  </a>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
