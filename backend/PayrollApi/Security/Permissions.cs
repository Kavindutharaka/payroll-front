namespace PayrollApi.Security;

public sealed record PermAction(string Key, string Label, string Hint);

/// <summary>One part of the system a role can be given. <see cref="Reads"/> are the tables a
/// person with any access to this part may read - the screens behind it need them.</summary>
public sealed record PermModule(string Key, string Label, string Group, PermAction[] Actions, string[] Reads);

/// <summary>The single list of everything that can be granted. The role editor in the app is
/// drawn from this, and every database request is checked against it.</summary>
public static class Permissions
{
    private static PermAction View(string hint = "Open this section and see its records") => new("view", "View", hint);

    public static readonly PermModule[] Modules =
    [
        new("dashboard", "Dashboard", "General", [View("Headline figures on the home page")],
            ["employee", "leave", "loan", "loan_type", "run", "run_detail", "salary_component", "salary_structure"]),

        new("employees", "Employees", "Master data",
            [View(), new("edit", "Add & edit", "Add employees and change their details"), new("delete", "Delete", "Remove an employee record")],
            ["employee", "increment", "loan", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_structure", "salary_component", "tax_mode", "tax_slab"]),
        new("salaryStructure", "Salary structure", "Master data",
            [View(), new("edit", "Change", "Assign, change and remove salary components")],
            ["employee", "increment", "loan", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_component", "salary_structure"]),
        new("positions", "Positions & levels", "Master data",
            [View(), new("edit", "Add & edit", "Add and rename positions and levels"), new("delete", "Delete", "Remove a position or level")],
            ["position", "level"]),
        new("payrollConfig", "Payroll configuration", "Master data",
            [View("Salary components, tax, EPF/ETF and OT settings"), new("edit", "Change", "Change rates, slabs and components"), new("delete", "Delete", "Remove a component, tax mode, slab or OT type")],
            ["salary_component", "tax_mode", "tax_slab", "epfetf_config", "ot_config"]),

        new("leave", "Leave", "Operations",
            [View(), new("apply", "Record leave", "Enter leave for employees"), new("approve", "Approve", "Approve, reject or remove leave"), new("configure", "Leave types", "Add and change leave types")],
            ["employee", "leave", "leave_type", "salary_structure"]),
        new("loans", "Loans & advances", "Operations",
            [View(), new("edit", "Add & edit", "Give loans and advances, change installments"), new("close", "Close", "Close or remove a loan"), new("configure", "Loan types", "Add and change loan types")],
            ["employee", "increment", "loan", "loan_type", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_structure", "salary_component"]),
        new("payment", "Bank accounts & standing orders", "Operations",
            [View(), new("edit", "Add & edit", "Add and change bank accounts and standing orders"), new("delete", "Delete", "Remove a bank account or standing order")],
            ["bank_account", "standing_order", "employee", "run", "run_detail", "salary_structure"]),

        new("payroll", "Run payroll", "Payroll",
            [View("Open the payroll sheet for a month"), new("calculate", "Calculate & edit", "Calculate the payroll and adjust figures"), new("approve", "Approve & mark paid", "Change the payroll status")],
            ["bonus", "employee", "epfetf_config", "increment", "increment_for_month_sp", "leave", "leave_type", "loan", "loan_type", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_component", "salary_structure", "tax_mode", "tax_slab", "ot_config", "standing_order", "bank_account"]),
        new("payslips", "Payslips", "Payroll",
            [View(), new("print", "Print", "Print and download payslips")],
            ["employee", "increment", "loan", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_structure"]),
        new("increment", "Increment sheet", "Payroll",
            [View(), new("edit", "Edit", "Generate the sheet and type increments"), new("apply", "Apply & merge", "Apply increments and merge them into basic salary")],
            ["bonus", "employee", "increment", "increment_for_month_sp", "leave", "loan", "loan_type", "run", "run_detail", "salary_component", "salary_structure", "period_employees_sp"]),
        new("bonus", "Bonus sheet", "Payroll",
            [View(), new("edit", "Edit", "Generate the sheet, enter leave, late days and PAYE"), new("finalise", "Finalise", "Lock the bonus sheet")],
            ["bonus", "employee", "increment", "increment_for_month_sp", "leave", "loan", "loan_type", "period_employees_sp", "run", "run_detail", "run_snapshot", "salary_component", "salary_structure", "tax_mode", "tax_slab"]),

        new("reports", "Reports", "Reports & files",
            [View("Open reports on screen"), new("export", "Print & export", "Print, PDF, Excel, CSV and bank / EPF / ETF files")],
            ["bank_account", "employee", "leave", "loan", "loan_type", "run", "run_detail", "salary_component", "salary_structure", "standing_order", "increment", "bonus", "tax_mode", "tax_slab", "epfetf_config", "period_employees_sp"]),
        new("documents", "Payroll files", "Reports & files",
            [View("See and open stored files"), new("upload", "Upload", "Add files and edit their details"), new("remove", "Remove", "Take files off the list")],
            ["document"]),

        new("users", "Users & roles", "Administration",
            [new("manage", "Manage", "Add users, reset passwords and set what each role can do")],
            []),
    ];

    public static readonly HashSet<string> AllKeys =
        Modules.SelectMany(m => m.Actions.Select(a => $"{m.Key}.{a.Key}")).ToHashSet(StringComparer.Ordinal);

    /// <summary>Stored procedures that only return data.</summary>
    public static readonly HashSet<string> ReadProcedures = new(StringComparer.OrdinalIgnoreCase)
    {
        "payroll_period_employees_sp", "payroll_increment_for_month_sp",
    };

    /// <summary>The permission needed to change a table, or to run a procedure with an action.</summary>
    public static string? RequiredForWrite(string obj, string? action)
    {
        var a = (action ?? "").ToUpperInvariant();
        bool Is(params string[] xs) => xs.Contains(a);
        return obj.ToLowerInvariant() switch
        {
            "payroll_employee_sp" => Is("DELETE") ? "employees.delete" : "employees.edit",
            "payroll_salary_structure_sp" => "salaryStructure.edit",
            "payroll_position_sp" or "payroll_level_sp" => Is("DELETE") ? "positions.delete" : "positions.edit",
            "payroll_salary_component_sp" or "payroll_tax_mode_sp" or "payroll_tax_slab_sp"
                or "payroll_epfetf_config_sp" or "payroll_ot_config_sp" => Is("DELETE", "ARCHIVE") ? "payrollConfig.delete" : "payrollConfig.edit",
            "payroll_leave_type_sp" => "leave.configure",
            "payroll_leave_sp" => Is("STATUS", "DELETE") ? "leave.approve" : "leave.apply",
            "payroll_loan_type_sp" => "loans.configure",
            "payroll_loan_sp" => Is("CLOSE", "DELETE") ? "loans.close" : "loans.edit",
            "payroll_bank_account_sp" or "payroll_standing_order_sp" => Is("DELETE") ? "payment.delete" : "payment.edit",
            // OPEN only makes sure the month has a (Draft) header - opening the sheet to look at it
            "payroll_run_sp" => Is("STATUS") ? "payroll.approve" : Is("OPEN") ? "payroll.view" : "payroll.calculate",
            "payroll_run_detail_sp" or "payroll_run_detail" or "payroll_run_snapshot" => "payroll.calculate",
            "payroll_increment_sp" => Is("APPLY", "MERGE", "REVOKE", "UNMERGE") ? "increment.apply" : "increment.edit",
            "payroll_bonus_sp" => Is("FINALISE") ? "bonus.finalise" : "bonus.edit",
            "payroll_document_sp" => Is("HIDE") ? "documents.remove" : "documents.upload",
            _ => null, // anything else: administrators only
        };
    }

    /// <summary>Can someone with these permissions read this table / read-only procedure?</summary>
    public static bool CanRead(string obj, IReadOnlySet<string> perms)
    {
        var shortName = obj.StartsWith("payroll_", StringComparison.OrdinalIgnoreCase) ? obj[8..] : obj;
        foreach (var m in Modules)
        {
            if (!m.Reads.Contains(shortName, StringComparer.OrdinalIgnoreCase)) continue;
            if (m.Actions.Any(a => perms.Contains($"{m.Key}.{a.Key}"))) return true;
        }
        return false;
    }

    public static string Label(string key)
    {
        var p = key.Split('.');
        var m = Modules.FirstOrDefault(x => x.Key == p[0]);
        var a = m?.Actions.FirstOrDefault(x => x.Key == (p.Length > 1 ? p[1] : ""));
        return m is null || a is null ? key : $"{m.Label} - {a.Label}";
    }
}
