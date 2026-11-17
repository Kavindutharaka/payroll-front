import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ROUTE_PERMS, canOpen } from './auth/access';
import FeedbackHost from './ui/FeedbackHost';
import Login from './pages/Auth/Login';
import ForcedPasswordChange from './pages/Auth/ChangePassword';
import UsersRoles from './pages/Admin/UsersRoles';
import NoAccess from './pages/Auth/NoAccess';

// Employee
import Employee from './pages/Employee/employee/Employee';
import Level from './pages/Employee/level/Level';
import Position from './pages/Employee/position/Position';
import SalaryStructure from './pages/Employee/SalaryStructure/SalaryStructure';

// Dashboard
import Dashboard from './pages/Dashboard/Dashboard';

// Payroll Config
import SalaryComponents from './pages/PayrollConfig/SalaryComponents/SalaryComponents';
import TaxConfig from './pages/PayrollConfig/TaxConfig/TaxConfig';
import EPFETFConfig from './pages/PayrollConfig/EPFETFConfig/EPFETFConfig';
import OTConfig from './pages/PayrollConfig/OTConfig/OTConfig';

// Leave
import LeaveTypes from './pages/Leave/LeaveTypes/LeaveTypes';
import LeaveTracking from './pages/Leave/LeaveTracking/LeaveTracking';

// Loan
import LoanTypes from './pages/Loan/LoanTypes/LoanTypes';
import EmployeeLoan from './pages/Loan/EmployeeLoan/EmployeeLoan';

// Payment
import BankAccounts from './pages/Payment/BankAccounts/BankAccounts';
import StandingOrders from './pages/Payment/StandingOrders/StandingOrders';

// Payroll Processing
import RunPayroll from './pages/Payroll/RunPayroll/RunPayroll';
import Payslip from './pages/Payroll/Payslip/Payslip';
import IncrementSheet from './pages/Payroll/Increment/IncrementSheet';
import BonusSheet from './pages/Payroll/Bonus/BonusSheet';

// Reports
import Reports from './pages/Reports/Reports';
import Documents from './pages/Documents/Documents';

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
  ["/", <Dashboard />],
  ["/emp/manage", <Employee />],
  ["/emp/salary-structure", <SalaryStructure />],
  ["/emp/pos", <Position />],
  ["/emp/lvl", <Level />],
  ["/config/components", <SalaryComponents />],
  ["/config/tax", <TaxConfig />],
  ["/config/epf-etf", <EPFETFConfig />],
  ["/config/ot", <OTConfig />],
  ["/leave/types", <LeaveTypes />],
  ["/leave/tracking", <LeaveTracking />],
  ["/loan/types", <LoanTypes />],
  ["/loan/employee", <EmployeeLoan />],
  ["/payment/banks", <BankAccounts />],
  ["/payment/standing-orders", <StandingOrders />],
  ["/payroll/run", <RunPayroll />],
  ["/payroll/payslip", <Payslip />],
  ["/payroll/increment", <IncrementSheet />],
  ["/payroll/bonus", <BonusSheet />],
  ["/reports", <Reports />],
  ["/documents", <Documents />],
  ["/admin/users", <UsersRoles />],
];

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
    <Routes>
      {ROUTES.map(([path, element]) => (
        <Route key={path} path={path} element={<Guard path={path}>{element}</Guard>} />
      ))}
      <Route path="*" element={<NoAccess missing />} />
    </Routes>
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
