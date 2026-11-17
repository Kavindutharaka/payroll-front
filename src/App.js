import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ROUTE_PERMS, canOpen } from './auth/access';
import FeedbackHost from './ui/FeedbackHost';
import Login from './pages/Auth/Login';
import ForcedPasswordChange from './pages/Auth/ChangePassword';
import Layout from './components/Layout';
import NoAccess from './pages/Auth/NoAccess';

/* Each screen is its own download, fetched the first time it's opened - the first
 * load only carries the sign-in and the shell. Once signed in, the rest are fetched
 * quietly in the background, so moving between screens is still instant. */
const SCREENS = {
  Dashboard:        () => import('./pages/Dashboard/Dashboard'),
  Employee:         () => import('./pages/Employee/employee/Employee'),
  SalaryStructure:  () => import('./pages/Employee/SalaryStructure/SalaryStructure'),
  Position:         () => import('./pages/Employee/position/Position'),
  Level:            () => import('./pages/Employee/level/Level'),
  SalaryComponents: () => import('./pages/PayrollConfig/SalaryComponents/SalaryComponents'),
  TaxConfig:        () => import('./pages/PayrollConfig/TaxConfig/TaxConfig'),
  EPFETFConfig:     () => import('./pages/PayrollConfig/EPFETFConfig/EPFETFConfig'),
  OTConfig:         () => import('./pages/PayrollConfig/OTConfig/OTConfig'),
  LeaveTypes:       () => import('./pages/Leave/LeaveTypes/LeaveTypes'),
  LeaveTracking:    () => import('./pages/Leave/LeaveTracking/LeaveTracking'),
  LoanTypes:        () => import('./pages/Loan/LoanTypes/LoanTypes'),
  EmployeeLoan:     () => import('./pages/Loan/EmployeeLoan/EmployeeLoan'),
  BankAccounts:     () => import('./pages/Payment/BankAccounts/BankAccounts'),
  StandingOrders:   () => import('./pages/Payment/StandingOrders/StandingOrders'),
  RunPayroll:       () => import('./pages/Payroll/RunPayroll/RunPayroll'),
  Payslip:          () => import('./pages/Payroll/Payslip/Payslip'),
  IncrementSheet:   () => import('./pages/Payroll/Increment/IncrementSheet'),
  BonusSheet:       () => import('./pages/Payroll/Bonus/BonusSheet'),
  Reports:          () => import('./pages/Reports/Reports'),
  Documents:        () => import('./pages/Documents/Documents'),
  UsersRoles:       () => import('./pages/Admin/UsersRoles'),
};
const L = Object.fromEntries(Object.entries(SCREENS).map(([k, load]) => [k, lazy(load)]));

/* A screen only opens for a role that includes its permission. */
function Guard({ path, children }) {
  const { can } = useAuth();
  const perm = ROUTE_PERMS[path];
  if (perm && !can(perm)) {
    if (path === "/") return <FirstAllowed />;
    return <NoAccess />;
  }
  return children;
}

/* Someone without the dashboard starts at the first screen they can open. */
function FirstAllowed() {
  const { can } = useAuth();
  const first = Object.keys(ROUTE_PERMS).find((href) => href !== "/" && canOpen(can, href));
  return first ? <Navigate to={first} replace /> : <NoAccess none />;
}

const ROUTES = [
  ["/", L.Dashboard, "Dashboard"],
  ["/emp/manage", L.Employee, "Employees"],
  ["/emp/salary-structure", L.SalaryStructure, "Salary Structure"],
  ["/emp/pos", L.Position, "Positions"],
  ["/emp/lvl", L.Level, "Levels"],
  ["/config/components", L.SalaryComponents, "Salary Components"],
  ["/config/tax", L.TaxConfig, "Tax Configuration"],
  ["/config/epf-etf", L.EPFETFConfig, "EPF / ETF"],
  ["/config/ot", L.OTConfig, "Overtime"],
  ["/leave/types", L.LeaveTypes, "Leave Types"],
  ["/leave/tracking", L.LeaveTracking, "Leave"],
  ["/loan/types", L.LoanTypes, "Loan Types"],
  ["/loan/employee", L.EmployeeLoan, "Loans & Advances"],
  ["/payment/banks", L.BankAccounts, "Bank Accounts"],
  ["/payment/standing-orders", L.StandingOrders, "Standing Orders"],
  ["/payroll/run", L.RunPayroll, "Run Payroll"],
  ["/payroll/payslip", L.Payslip, "Payslips"],
  ["/payroll/increment", L.IncrementSheet, "Increment Sheet"],
  ["/payroll/bonus", L.BonusSheet, "Bonus Sheet"],
  ["/reports", L.Reports, "Reports"],
  ["/documents", L.Documents, "Payroll Files"],
  ["/admin/users", L.UsersRoles, "Users & Roles"],
];
const TITLES = Object.fromEntries(ROUTES.map(([p, , t]) => [p, t]));

/* A new screen opens at the top, and the browser tab says which screen it is. */
function PageChrome() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = TITLES[pathname];
    document.title = t ? `${t} · AIS Payroll` : "AIS Payroll";
  }, [pathname]);
  return null;
}

/* Fetch every screen's code once the browser is idle after sign-in. */
function Prefetch() {
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
    const id = idle(() => Object.values(SCREENS).forEach((load) => load().catch(() => {})));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);
  return null;
}

/* While a screen's code arrives: the sidebar stays, with a quiet placeholder. */
function ScreenLoading() {
  return (
    <Layout>
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    </Layout>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#29166F]" />
    </div>
  );
}

function Gate() {
  const { status, user } = useAuth();
  if (status === "loading") return <Splash />;
  if (status !== "signedIn") return <Login />;
  if (user?.mustChangePassword) return <ForcedPasswordChange />;
  return (
    <>
      <PageChrome />
      <Prefetch />
      <Suspense fallback={<ScreenLoading />}>
        <Routes>
          {ROUTES.map(([path, Screen]) => (
            <Route key={path} path={path} element={<Guard path={path}><Screen /></Guard>} />
          ))}
          <Route path="*" element={<NoAccess missing />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Gate />
        <FeedbackHost />
      </AuthProvider>
    </Router>
  );
}

export default App;
