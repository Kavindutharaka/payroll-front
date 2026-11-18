import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import { displayName } from "../../Payroll/Payslip/Payslip";
import EmployeeForm from "./EmployeeForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import DataTable from "../../../ui/DataTable";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, forgetEmployeeChoices } from "../../../services/employeeService";
import { notify, confirmDialog } from "../../../ui/feedback";

const categoryColor = {
  "Main - Upper School":               "indigo",
  "Main - Junior School":              "indigo",
  "Main - Elementary School":          "indigo",
  "Main - Non-Academic Staff":         "purple",
  "Main - Administrative Staff":       "purple",
  "Main - Support Staff":              "purple",
  "Battaramulla - Academic Staff":     "blue",
  "Battaramulla - Administrative Staff": "cyan",
  "Battaramulla - Support Staff":      "cyan",
};
const typeColor   = { Permanent: "success", "Permanent Staff on Contract": "indigo", Temporary: "warning" };
const statusColor = { Active: "success", Resigned: "failure", Notice: "warning", Inactive: "failure" };

// Resignation is driven entirely by the date — entering one marks the
// employee resigned and drops them out of payroll. A future date means
// they are still working out their notice period.
const displayStatus = (emp) => {
  if (!emp.dateOfResignation) return "Active";
  const resign = new Date(emp.dateOfResignation);
  if (isNaN(resign)) return "Active";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return resign <= today ? "Resigned" : "Notice";
};

export function EmployeeTable() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* A failed save used to go to the console only, and a slow one showed nothing
   * at all, so "Update Employee" looked dead (Nadee, 30 Oct). The form now shows
   * "Saving…" and any error, and a second click cannot send it twice. */
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async (formData) => {
    if (saving) return;
    setSaving(true); setSaveError("");
    try {
      if (editData) {
        await updateEmployee(editData.id, formData);
      } else {
        await createEmployee(formData);
      }
      forgetEmployeeChoices();
      setOpenModal(false);
      setEditData(null);
      load();
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError("The employee could not be saved — nothing was changed. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog({ title: "Delete this employee?", message: "They will be taken off the employee list. Payroll already run for them is kept.", confirmLabel: "Delete employee", tone: "danger" }))) return;
    try {
      await deleteEmployee(id); notify.success("Employee deleted.");
      load();
    } catch (err) {
      console.error("Delete failed:", err);
      notify.error(err.userMessage || "The employee could not be deleted.");
    }
  };

  const handleEdit = (emp) => { setEditData(emp); setOpenModal(true); };
  const handleAdd  = ()    => { setEditData(null); setOpenModal(true); };

  const filtered = employees.filter((e) => {
    // a number is an EPF number and is matched whole; words search both name forms
    const q = search.trim().toLowerCase();
    const name = `${displayName(e)} ${e.firstName ?? ""} ${e.surName ?? ""}`.toLowerCase();
    const matchSearch = !q || (/^\d+$/.test(q) ? String(e.emp_id) === q : name.includes(q));
    const matchCat = filterCat === "all" || e.category === filterCat;
    const st = displayStatus(e);
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "active" ? st === "Active" || st === "Notice" :
      st === "Resigned";
    return matchSearch && matchCat && matchStatus;
  });

  const money = (v) => Number(v || 0).toLocaleString();
  const day = (v) => (v ? String(v).slice(0, 10) : "—");
  const columns = [
    { key: "employee", label: "Employee", always: true, card: "title",
      render: (e) => (
        <div className="min-w-[12rem]">
          <div className="font-medium text-gray-800 dark:text-gray-100">{displayName(e)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono text-purple-600 dark:text-purple-400">EPF {e.emp_id}</span>
            {e.designation || e.title ? <> · {e.designation || e.title}</> : null}
          </div>
        </div>
      ) },
    { key: "initials", label: "Initials", render: (e) => <span className="font-mono">{e.initials || "—"}</span> },
    { key: "nic", label: "NIC", render: (e) => e.nic || "—" },
    { key: "category", label: "Category", card: "subtitle",
      render: (e) => e.category ? <StatusBadge color={categoryColor[e.category] ?? "gray"}>{e.category}</StatusBadge> : "—" },
    { key: "type", label: "Type",
      render: (e) => e.employmentType ? <StatusBadge color={typeColor[e.employmentType] ?? "gray"}>{e.employmentType}</StatusBadge> : "—" },
    { key: "basic", label: "Basic Salary", align: "right", card: true, render: (e) => money(e.basicSalary) },
    { key: "budgetary", label: "Budgetary", align: "right", render: (e) => (Number(e.budgetaryAllowance) ? money(e.budgetaryAllowance) : "—") },
    { key: "allowances", label: "Allowances", align: "right", render: (e) => (Number(e.fixedAllowance) ? money(e.fixedAllowance) : "—") },
    { key: "total", label: "Total Package", align: "right", card: true,
      render: (e) => <span className="font-semibold text-green-600 dark:text-green-400">{money(e.totalPackage)}</span> },
    { key: "contact", label: "Contact No", render: (e) => e.contactNo || "—" },
    { key: "epfEtf", label: "EPF/ETF",
      render: (e) => <StatusBadge color={e.epfEtf ? "success" : "gray"}>{e.epfEtf ? "Eligible" : "N/A"}</StatusBadge> },
    { key: "status", label: "Status", card: "badge",
      render: (e) => { const st = displayStatus(e); return <StatusBadge color={statusColor[st] ?? "gray"}>{st}</StatusBadge>; } },
  ];

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employees</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click anyone to see their full record</p>
        </div>
        <CustomButton perm="employees.edit" onClick={handleAdd} color="purple">
          <HiPlus className="mr-2 h-4 w-4" /> Add Employee
        </CustomButton>
      </div>

      <DataTable
        id="employees"
        columns={columns}
        rows={filtered}
        loading={loading}
        empty={employees.length ? "No one matches these filters." : "No employees yet."}
        toolbar={(
          <>
            <CustomInput icon={HiSearch} placeholder="Search by name or EPF no." value={search}
              onChange={(e) => setSearch(e.target.value)} sizing="sm" className="w-full sm:w-64" />
            <CustomSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sizing="sm">
              <option value="all">All Employees</option>
              <option value="active">Active Only</option>
              <option value="resigned">Resigned Only</option>
            </CustomSelect>
            <CustomSelect value={filterCat} onChange={(e) => setFilterCat(e.target.value)} sizing="sm">
              <option value="all">All Categories</option>
              <optgroup label="Main School — Academic">
                <option value="Main - Upper School">Main — Upper School</option>
                <option value="Main - Junior School">Main — Junior School</option>
                <option value="Main - Elementary School">Main — Elementary School</option>
              </optgroup>
              <optgroup label="Main School">
                <option value="Main - Non-Academic Staff">Main — Non-Academic Staff</option>
                <option value="Main - Administrative Staff">Main — Administrative Staff</option>
                <option value="Main - Support Staff">Main — Support Staff</option>
              </optgroup>
              <optgroup label="Battaramulla School">
                <option value="Battaramulla - Academic Staff">Battaramulla — Academic Staff</option>
                <option value="Battaramulla - Administrative Staff">Battaramulla — Administrative Staff</option>
                <option value="Battaramulla - Support Staff">Battaramulla — Support Staff</option>
              </optgroup>
            </CustomSelect>
          </>
        )}
        actions={(emp, { inPanel } = {}) => (
          <>
            <CustomButton perm="employees.edit" size="xs" color="blue" outline pill={!inPanel} onClick={() => handleEdit(emp)}
              title="Edit">
              <HiPencil className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Edit</span>}
            </CustomButton>
            <CustomButton perm="employees.delete" size="xs" color="failure" outline pill={!inPanel} onClick={() => handleDelete(emp.id)}
              title="Delete">
              <HiTrash className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Delete</span>}
            </CustomButton>
          </>
        )}
        detail={{
          title: (e) => displayName(e),
          subtitle: (e) => `EPF ${e.emp_id}${e.designation || e.title ? ` · ${e.designation || e.title}` : ""}`,
          extra: [
            { label: "Date joined", render: (e) => day(e.dateOfJoining) },
            { label: "Date of birth", render: (e) => day(e.dob) },
            { label: "Resignation date", render: (e) => day(e.dateOfResignation) },
            { label: "Contract", render: (e) => (e.contractStartDate || e.contractEndDate ? `${day(e.contractStartDate)} to ${day(e.contractEndDate)}` : "—") },
            { label: "Payment mode", render: (e) => e.paymentMode || "Bank" },
            { label: "Bank", render: (e) => [e.bank, e.branch].filter(Boolean).join(", ") || "—" },
            { label: "Account no.", render: (e) => e.accountNum || "—" },
            { label: "TIN", render: (e) => e.tin || "—" },
            { label: "Emergency contact", render: (e) => e.emergencyContactNo || "—" },
            { label: "Address", render: (e) => e.address || "—" },
          ],
        }}
        footer={(
          <span>
            Showing <span className="font-semibold text-gray-700 dark:text-white">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-white">{employees.length}</span> employees
          </span>
        )}
      />

      {openModal && (
        <EmployeeForm
          closeForm={() => { setOpenModal(false); setEditData(null); setSaveError(""); }}
          initialData={editData}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      )}
    </div>
  );
}
