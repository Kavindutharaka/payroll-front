import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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

// Reports
import Reports from './pages/Reports/Reports';

function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Employee */}
        <Route path="/emp/manage" element={<Employee />} />
        <Route path="/emp/salary-structure" element={<SalaryStructure />} />
        <Route path="/emp/pos" element={<Position />} />
        <Route path="/emp/lvl" element={<Level />} />

        {/* Payroll Config */}
        <Route path="/config/components" element={<SalaryComponents />} />
        <Route path="/config/tax" element={<TaxConfig />} />
        <Route path="/config/epf-etf" element={<EPFETFConfig />} />
        <Route path="/config/ot" element={<OTConfig />} />

        {/* Leave */}
        <Route path="/leave/types" element={<LeaveTypes />} />
        <Route path="/leave/tracking" element={<LeaveTracking />} />

        {/* Loan */}
        <Route path="/loan/types" element={<LoanTypes />} />
        <Route path="/loan/employee" element={<EmployeeLoan />} />

        {/* Payment */}
        <Route path="/payment/banks" element={<BankAccounts />} />
        <Route path="/payment/standing-orders" element={<StandingOrders />} />

        {/* Payroll Processing */}
        <Route path="/payroll/run" element={<RunPayroll />} />
        <Route path="/payroll/payslip" element={<Payslip />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Router>
  );
}

export default App;
