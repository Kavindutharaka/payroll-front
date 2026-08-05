import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import {
  HiUsers, HiCurrencyDollar, HiDocumentText, HiClock,
  HiBriefcase, HiPlay, HiChartBar, HiUserRemove,
} from "react-icons/hi";
import { fetchDashboardStats, fetchRunSummary } from "../../services/reportService";

const statusColor = { Draft: "warning", Approved: "indigo", Paid: "success" };
const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [runs, setRuns]     = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchRunSummary(6)])
      .then(([s, r]) => {
        setStats((Array.isArray(s) ? s[0] : s) || null);
        setRuns(Array.isArray(r) ? r : []);
      })
      .catch(console.error)
      .finally(() => setLoad(false));
  }, []);

  const latest = runs[0] ?? null;

  const kpis = [
    {
      label: "Active Employees", icon: HiUsers, color: "bg-purple-100 text-purple-600",
      value: loading ? "…" : money(stats?.activeEmployees),
      sub: stats ? `${money(stats.resignedEmployees)} resigned` : "",
    },
    {
      label: "Latest Payroll", icon: HiCurrencyDollar, color: "bg-green-100 text-green-600",
      value: loading ? "…" : latest ? `Rs. ${money(latest.totalNet)}` : "—",
      sub: latest ? `${monthLabel(latest.runMonth)} · net payable` : "No payroll run yet",
    },
    {
      label: "EPF / ETF", icon: HiDocumentText, color: "bg-blue-100 text-blue-600",
      value: loading ? "…" : latest
        ? `Rs. ${money(Number(latest.totalEpfEmployee) + Number(latest.totalEpfEmployer) + Number(latest.totalEtf))}`
        : "—",
      sub: latest ? "Employee + employer" : "No payroll run yet",
    },
    {
      label: "Pending Leave", icon: HiClock, color: "bg-yellow-100 text-yellow-600",
      value: loading ? "…" : money(stats?.pendingLeave),
      sub: "Awaiting approval",
    },
    {
      label: "Active Loans", icon: HiBriefcase, color: "bg-red-100 text-red-600",
      value: loading ? "…" : money(stats?.activeLoans),
      sub: stats ? `Rs. ${money(stats.loanOutstanding)} outstanding` : "",
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Payroll overview and quick actions</p>
          </div>
          {latest && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{monthLabel(latest.runMonth)}</span>
              <StatusBadge color={statusColor[latest.status] ?? "gray"} className="px-3 py-1.5 text-sm font-medium">
                {latest.status}
              </StatusBadge>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 truncate text-2xl font-bold text-gray-800 dark:text-white">{kpi.value}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{kpi.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Payroll history */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Recent Payroll History</h2>
              <HiChartBar className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex flex-col gap-3">
              {loading ? (
                <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
              ) : runs.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  No payroll has been run yet. Start from <span className="font-semibold">Run Payroll</span>.
                </p>
              ) : runs.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{monthLabel(p.runMonth)}</p>
                    <p className="text-xs text-gray-400">{money(p.employeeCount)} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Rs. {money(p.totalNet)}</p>
                    <StatusBadge color={statusColor[p.status] ?? "gray"} className="mt-1 text-xs">{p.status}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Add Employee",     href: "/emp/manage",        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",  icon: HiUsers },
                { label: "Run Payroll",      href: "/payroll/run",       color: "bg-green-50 text-green-600 hover:bg-green-100",     icon: HiPlay },
                { label: "Apply Leave",      href: "/leave/tracking",    color: "bg-blue-50 text-blue-600 hover:bg-blue-100",        icon: HiClock },
                { label: "Grant Loan",       href: "/loan/employee",     color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",  icon: HiBriefcase },
                { label: "Salary Components",href: "/config/components", color: "bg-pink-50 text-pink-600 hover:bg-pink-100",        icon: HiDocumentText },
                { label: "View Reports",     href: "/reports",           color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",  icon: HiChartBar },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <a key={a.label} href={a.href}
                    className={`flex items-center gap-3 rounded-lg p-4 text-sm font-medium transition-colors ${a.color}`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {a.label}
                  </a>
                );
              })}
            </div>
            {stats?.resignedEmployees > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <HiUserRemove className="h-4 w-4 flex-shrink-0" />
                {money(stats.resignedEmployees)} resigned employee{stats.resignedEmployees !== 1 ? "s" : ""} are excluded from payroll runs.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
