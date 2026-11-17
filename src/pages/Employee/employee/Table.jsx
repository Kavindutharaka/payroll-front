import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import { displayName } from "../../Payroll/Payslip/Payslip";
import EmployeeForm from "./EmployeeForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, forgetEmployeeChoices } from "../../../services/employeeService";

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
    if (!window.confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(id);
      load();
    } catch (err) {
      console.error("Delete failed:", err);
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

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employees</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and organize your employee records</p>
        </div>
        <CustomButton onClick={handleAdd} color="purple">
          <HiPlus className="mr-2 h-4 w-4" /> Add Employee
        </CustomButton>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CustomInput icon={HiSearch} placeholder="Search by name or ID..." value={search}
          onChange={(e) => setSearch(e.target.value)} sizing="sm" className="w-64" />
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
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <CustomTable hoverable>
            <CustomTableHead>
              <CustomTableRow>
                <CustomTableHeadCell className="w-10">#</CustomTableHeadCell>
                <CustomTableHeadCell>Emp ID</CustomTableHeadCell>
                <CustomTableHeadCell>Full Name</CustomTableHeadCell>
                <CustomTableHeadCell>Initials</CustomTableHeadCell>
                <CustomTableHeadCell>NIC</CustomTableHeadCell>
                <CustomTableHeadCell>Category</CustomTableHeadCell>
                <CustomTableHeadCell>Type</CustomTableHeadCell>
                <CustomTableHeadCell>Basic Salary</CustomTableHeadCell>
                <CustomTableHeadCell>Budgetary</CustomTableHeadCell>
                <CustomTableHeadCell>Allowances</CustomTableHeadCell>
                <CustomTableHeadCell>Total Package</CustomTableHeadCell>
                <CustomTableHeadCell>Contact No</CustomTableHeadCell>
                <CustomTableHeadCell>EPF/ETF</CustomTableHeadCell>
                <CustomTableHeadCell>Status</CustomTableHeadCell>
                <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
              </CustomTableRow>
            </CustomTableHead>
            <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <CustomTableRow>
                  <CustomTableCell colSpan={15} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell>
                </CustomTableRow>
              ) : filtered.map((emp, idx) => (
                <CustomTableRow key={emp.id}
                  className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <CustomTableCell className="text-sm text-gray-400">{idx + 1}</CustomTableCell>
                  <CustomTableCell className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">{emp.emp_id}</CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                    {displayName(emp)}
                  </CustomTableCell>
                  <CustomTableCell className="font-mono text-sm text-gray-500">{emp.initials || "—"}</CustomTableCell>
                  <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{emp.nic}</CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={categoryColor[emp.category] ?? "gray"} className="w-fit text-xs">{emp.category}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={typeColor[emp.employmentType] ?? "gray"} className="w-fit text-xs">{emp.employmentType}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {Number(emp.basicSalary || 0).toLocaleString()}
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {Number(emp.budgetaryAllowance) ? Number(emp.budgetaryAllowance).toLocaleString() : "—"}
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {Number(emp.fixedAllowance) ? Number(emp.fixedAllowance).toLocaleString() : "—"}
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm font-bold text-green-600">
                    Rs. {Number(emp.totalPackage || 0).toLocaleString()}
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {emp.contactNo || "—"}
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={emp.epfEtf ? "success" : "gray"} className="w-fit text-xs">
                      {emp.epfEtf ? "Eligible" : "N/A"}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    {(() => {
                      const st = displayStatus(emp);
                      return (
                        <StatusBadge color={statusColor[st] ?? "gray"} className="w-fit text-xs">
                          {st}
                        </StatusBadge>
                      );
                    })()}
                  </CustomTableCell>
                  <CustomTableCell>
                    <div className="flex items-center justify-center gap-2">
                      <CustomButton size="xs" color="blue" outline pill onClick={() => handleEdit(emp)}>
                        <HiPencil className="h-3.5 w-3.5" />
                      </CustomButton>
                      <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(emp.id)}>
                        <HiTrash className="h-3.5 w-3.5" />
                      </CustomButton>
                    </div>
                  </CustomTableCell>
                </CustomTableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <CustomTableRow>
                  <CustomTableCell colSpan={15} className="py-8 text-center text-sm text-gray-400">No employees found.</CustomTableCell>
                </CustomTableRow>
              )}
            </CustomTableBody>
          </CustomTable>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-white">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-white">{employees.length}</span> employees
          </span>
          <span className="text-xs text-gray-400">Employee Management</span>
        </div>
      </div>

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
