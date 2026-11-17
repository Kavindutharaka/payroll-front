import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { StatusBadge } from "../../components/StatusBadge";
import {
  HiUsers, HiCurrencyDollar, HiDocumentText, HiClock, HiBriefcase, HiPlay, HiChartBar,
  HiCheck, HiArrowRight, HiExclamation, HiCalendar, HiTrendingUp, HiTrendingDown, HiCheckCircle,
} from "react-icons/hi";
import { fetchDashboardStats, fetchRunSummary } from "../../services/reportService";
import { useAuth } from "../../auth/AuthContext";
import { canOpen } from "../../auth/access";

const statusColor = { Draft: "warning", Approved: "indigo", Paid: "success" };
const money = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
const monthLabel = (m, style = "long") => {
  if (!m) return "";
  const [y, mm] = String(m).split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: style, year: "numeric" });
};
const nextMonth = (m) => {
  const [y, mm] = String(m).split("-").map(Number);
  const d = new Date(y, mm, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const STEPS = ["Draft", "Approved", "Paid"];

function Skeleton({ className = "", style }) {
  return <span className={`skeleton block ${className}`} style={style} aria-hidden="true" />;
}

function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const [stats, setStats]   = useState(null);
  const [runs, setRuns]     = useState([]);
  const [loading, setLoad]  = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchDashboardStats(), fetchRunSummary(7)])
      .then(([s, r]) => {
        if (!live) return;
        setStats((Array.isArray(s) ? s[0] : s) || null);
        setRuns(Array.isArray(r) ? r : []);
      })
      .catch((e) => { console.error(e); if (live) setFailed(true); })
      .finally(() => live && setLoad(false));
    return () => { live = false; };
  }, []);

  const latest = runs[0] ?? null;
  const previous = runs[1] ?? null;
  // the month being worked on: the latest run until it's paid, then the month after it
  const workMonth = !latest ? thisMonth() : latest.status === "Paid" ? nextMonth(latest.runMonth) : latest.runMonth;
  const workRun = latest && latest.runMonth === workMonth ? latest : null;
  const stepIndex = workRun ? STEPS.indexOf(workRun.status) : -1;

  const change = latest && previous && Number(previous.totalNet)
    ? ((Number(latest.totalNet) - Number(previous.totalNet)) / Number(previous.totalNet)) * 100 : null;

  const firstName = String(user?.displayName || user?.username || "").trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const kpis = [
    {
      label: "Active employees", icon: HiUsers, tone: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
      value: money(stats?.activeEmployees),
      sub: stats ? `${money(stats.resignedEmployees)} resigned, not paid` : "",
      href: "/emp/manage",
    },
    {
      label: "Net payroll", icon: HiCurrencyDollar, tone: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300",
      value: latest ? `Rs. ${money(latest.totalNet)}` : "—",
      sub: latest ? monthLabel(latest.runMonth) : "No payroll run yet",
      delta: change,
      href: "/reports?r=payroll-summary",
    },
    {
      label: "EPF / ETF", icon: HiDocumentText, tone: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
      value: latest ? `Rs. ${money(Number(latest.totalEpfEmployee) + Number(latest.totalEpfEmployer) + Number(latest.totalEtf))}` : "—",
      sub: latest ? `Employee + employer · ${monthLabel(latest.runMonth, "short")}` : "No payroll run yet",
      href: "/reports?r=epf-etf-report",
    },
    {
      label: "Loans outstanding", icon: HiBriefcase, tone: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
      value: stats ? `Rs. ${money(stats.loanOutstanding)}` : "—",
      sub: stats ? `${money(stats.activeLoans)} active loan${Number(stats.activeLoans) === 1 ? "" : "s"}` : "",
      href: "/loan/employee",
    },
  ];

  // things that need someone's attention, most pressing first
  const attention = [];
  if (stats && Number(stats.pendingLeave) > 0) attention.push({
    icon: HiClock, tone: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300",
    text: `${money(stats.pendingLeave)} leave request${Number(stats.pendingLeave) === 1 ? "" : "s"} waiting for approval`,
    href: "/leave/tracking", cta: "Review",
  });
  if (stats && Number(stats.contractsDue) > 0) attention.push({
    icon: HiCalendar, tone: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300",
    text: `${money(stats.contractsDue)} contract${Number(stats.contractsDue) === 1 ? "" : "s"} ended or ending within 30 days`,
    href: "/reports?r=contract-staff", cta: "See who",
  });
  if (!loading && !failed && !workRun) attention.push({
    icon: HiPlay, tone: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300",
    text: `${monthLabel(workMonth)} payroll hasn't been started`,
    href: "/payroll/run", cta: "Start",
  });
  const shownAttention = attention.filter((a) => canOpen(can, a.href.split("?")[0]));

  const trend = [...runs].slice(0, 6).reverse();
  const peak = Math.max(1, ...trend.map((r) => Number(r.totalNet) || 0));

  const actions = [
    { label: "Run payroll",     href: "/payroll/run",     icon: HiPlay },
    { label: "Payslips",        href: "/payroll/payslip", icon: HiDocumentText },
    { label: "Employees",       href: "/emp/manage",      icon: HiUsers },
    { label: "Record leave",    href: "/leave/tracking",  icon: HiClock },
    { label: "Loans & advances",href: "/loan/employee",   icon: HiBriefcase },
    { label: "Reports",         href: "/reports",         icon: HiChartBar },
  ].filter((a) => canOpen(can, a.href));

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-gray-800 dark:text-white">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </h1>
          </div>
        </div>

        {failed && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <HiExclamation className="h-5 w-5 flex-shrink-0" /> The figures couldn't be loaded. Refresh the page to try again.
          </div>
        )}

        {/* This month's payroll */}
        {canOpen(can, "/payroll/run") && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current payroll</p>
                {loading ? <Skeleton className="mt-2 h-6 w-48" /> : (
                  <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
                    {monthLabel(workMonth)}
                    {workRun && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">· {money(workRun.employeeCount)} employees · Rs. {money(workRun.totalNet)} net</span>}
                  </p>
                )}
              </div>

              <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Payroll progress">
                {STEPS.map((step, i) => {
                  const done = stepIndex > i || (stepIndex === i && step === "Paid");
                  const current = stepIndex === i && !done;
                  return (
                    <li key={step} className="flex items-center gap-1.5 sm:gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        done ? "bg-green-600 text-white"
                          : current ? "bg-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-900/50"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {done ? <HiCheck className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className={`text-sm ${current ? "font-semibold text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{step}</span>
                      {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-4 bg-gray-200 dark:bg-gray-600 sm:mx-1 sm:w-8" />}
                    </li>
                  );
                })}
              </ol>

              <Link to="/payroll/run"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40">
                {!workRun ? "Start payroll" : workRun.status === "Draft" ? "Continue payroll" : "Open payroll"}
                <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        )}

        {/* Headline figures */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            const body = (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{k.label}</p>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.tone}`}><Icon className="h-5 w-5" /></span>
                </div>
                {loading ? <Skeleton className="mt-3 h-7 w-32" /> : (
                  <p className="mt-3 truncate text-2xl font-bold tabular-nums text-gray-800 dark:text-white">{k.value}</p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {loading ? <Skeleton className="h-3 w-24" /> : <span className="truncate">{k.sub}</span>}
                  {!loading && k.delta != null && Number.isFinite(k.delta) && (
                    <span className={`inline-flex items-center gap-0.5 font-medium ${k.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      title="Change from the month before">
                      {k.delta >= 0 ? <HiTrendingUp className="h-3.5 w-3.5" /> : <HiTrendingDown className="h-3.5 w-3.5" />}
                      {Math.abs(k.delta).toFixed(1)}%
                    </span>
                  )}
                </div>
              </>
            );
            return canOpen(can, k.href.split("?")[0]) ? (
              <Link key={k.label} to={k.href}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:border-gray-700 dark:bg-gray-800">
                {body}
              </Link>
            ) : (
              <Card key={k.label} className="p-5">{body}</Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Net pay, month by month */}
          <Card className="p-6 lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">Net pay by month</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">The last {trend.length || 6} payrolls</p>
              </div>
              {canOpen(can, "/reports") && (
                <Link to="/reports?r=payroll-summary" className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400">
                  Payroll summary
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex h-44 items-end gap-4">
                {[60, 75, 70, 85, 80, 90].map((h, i) => <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />)}
              </div>
            ) : trend.length === 0 ? (
              <p className="flex h-44 items-center justify-center text-sm text-gray-400">No payroll has been run yet.</p>
            ) : (
              <div className="flex h-52 items-end gap-3 sm:gap-5" role="list">
                {trend.map((r) => {
                  const h = Math.max(4, (Number(r.totalNet) / peak) * 100);
                  return (
                    <div key={r.id} role="listitem" className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                      aria-label={`${monthLabel(r.runMonth)}: Rs. ${money(r.totalNet)}, ${r.status}`}>
                      <span className="text-[11px] font-medium tabular-nums text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-300">
                        {money(r.totalNet)}
                      </span>
                      <div className={`w-full max-w-[3.5rem] rounded-t-md transition-colors ${
                        r.status === "Paid" ? "bg-purple-500 group-hover:bg-purple-600" : "bg-purple-200 group-hover:bg-purple-300 dark:bg-purple-800 dark:group-hover:bg-purple-700"}`}
                        style={{ height: `${h}%` }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{monthLabel(r.runMonth, "short")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && trend.length > 0 && (
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-purple-500" /> Paid</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-purple-200 dark:bg-purple-800" /> Draft / approved</span>
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Needs attention */}
            <Card className="p-6">
              <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">Needs attention</h2>
              {loading ? (
                <div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
              ) : shownAttention.length === 0 ? (
                <p className="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                  <HiCheckCircle className="h-5 w-5 text-green-500" /> Nothing waiting. All caught up.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {shownAttention.map((a) => {
                    const Icon = a.icon;
                    return (
                      <li key={a.text}>
                        <Link to={a.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/60">
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${a.tone}`}><Icon className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-200">{a.text}</span>
                          <span className="text-xs font-medium text-purple-600 group-hover:underline dark:text-purple-400">{a.cta}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Shortcuts */}
            {actions.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">Go to</h2>
                <div className="grid grid-cols-2 gap-2">
                  {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Link key={a.label} to={a.href}
                        className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-purple-700 dark:hover:bg-purple-900/20 dark:hover:text-purple-200">
                        <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        {a.label}
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Recent payrolls */}
        {runs.length > 0 && (
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Recent payrolls</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Month</th>
                    <th className="px-6 py-3 text-right font-semibold">Employees</th>
                    <th className="px-6 py-3 text-right font-semibold">Gross</th>
                    <th className="px-6 py-3 text-right font-semibold">Deductions</th>
                    <th className="px-6 py-3 text-right font-semibold">Net</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {runs.slice(0, 6).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-800 dark:text-gray-100">{monthLabel(p.runMonth)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{money(p.employeeCount)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{money(p.totalGross)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{money(p.totalDeductions)}</td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums text-gray-800 dark:text-white">{money(p.totalNet)}</td>
                      <td className="px-6 py-3"><StatusBadge color={statusColor[p.status] ?? "gray"}>{p.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
