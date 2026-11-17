/* Which permission opens which screen. The keys match backend/PayrollApi/Security/Permissions.cs,
 * where every database request is checked again - hiding a screen here is for tidiness, the
 * server is what actually enforces it. */
export const ROUTE_PERMS = {
  "/":                     "dashboard.view",
  "/emp/manage":           "employees.view",
  "/emp/salary-structure": "salaryStructure.view",
  "/emp/pos":              "positions.view",
  "/emp/lvl":              "positions.view",
  "/config/components":    "payrollConfig.view",
  "/config/tax":           "payrollConfig.view",
  "/config/epf-etf":       "payrollConfig.view",
  "/config/ot":            "payrollConfig.view",
  "/leave/types":          "leave.view",
  "/leave/tracking":       "leave.view",
  "/loan/types":           "loans.view",
  "/loan/employee":        "loans.view",
  "/payment/banks":        "payment.view",
  "/payment/standing-orders": "payment.view",
  "/payroll/run":          "payroll.view",
  "/payroll/payslip":      "payslips.view",
  "/payroll/increment":    "increment.view",
  "/payroll/bonus":        "bonus.view",
  "/reports":              "reports.view",
  "/documents":            "documents.view",
  "/admin/users":          "users.manage",
};

export const canOpen = (can, href) => {
  const perm = ROUTE_PERMS[href];
  return !perm || can(perm);
};
