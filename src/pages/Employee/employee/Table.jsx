import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import EmployeeForm from "./EmployeeForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from "../../../services/employeeService";

const categoryColor = {
  "Main - Upper School":               "indigo",
  "Main - Junior School":              "indigo",
  "Main - Elementary School":          "indigo",
  "Main - Administrative Staff":       "purple",
  "Main - Support Staff":              "purple",
  "Battaramulla - Academic Staff":     "blue",
  "Battaramulla - Administrative Staff": "cyan",
  "Battaramulla - Support Staff":      "cyan",
};
const typeColor   = { Permanent: "success", Temporary: "warning" };
const statusColor = { Active: "success", Inactive: "failure" };

export function EmployeeTable() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("all");

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

  const handleSave = async (formData) => {
    try {
      if (editData) {
        await updateEmployee(editData.id, formData);
      } else {
        await createEmployee(formData);
      }
      setOpenModal(false);
      setEditData(null);
      load();
    } catch (err) {
      console.error("Save failed:", err);
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
    const name = `${e.firstName} ${e.surName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || e.emp_id?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
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
        <CustomSelect value={filterCat} onChange={(e) => setFilterCat(e.target.value)} sizing="sm">
          <option value="all">All Categories</option>
          <optgroup label="Main School — Academic">
            <option value="Main - Upper School">Upper School</option>
            <option value="Main - Junior School">Junior School</option>
            <option value="Main - Elementary School">Elementary School</option>
          </optgroup>
          <optgroup label="Main School — Non-Academic">
            <option value="Main - Administrative Staff">Administrative Staff</option>
            <option value="Main - Support Staff">Support Staff</option>
          </optgroup>
          <optgroup label="Battaramulla School">
            <option value="Battaramulla - Academic Staff">Academic Staff</option>
            <option value="Battaramulla - Administrative Staff">Administrative Staff</option>
            <option value="Battaramulla - Support Staff">Support Staff</option>
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
                <CustomTableHeadCell>NIC</CustomTableHeadCell>
                <CustomTableHeadCell>Category</CustomTableHeadCell>
                <CustomTableHeadCell>Type</CustomTableHeadCell>
                <CustomTableHeadCell>Basic Salary</CustomTableHeadCell>
                <CustomTableHeadCell>Level</CustomTableHeadCell>
                <CustomTableHeadCell>EPF/ETF</CustomTableHeadCell>
                <CustomTableHeadCell>Status</CustomTableHeadCell>
                <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
              </CustomTableRow>
            </CustomTableHead>
            <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <CustomTableRow>
                  <CustomTableCell colSpan={11} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell>
                </CustomTableRow>
              ) : filtered.map((emp, idx) => (
                <CustomTableRow key={emp.id}
                  className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <CustomTableCell className="text-sm text-gray-400">{idx + 1}</CustomTableCell>
                  <CustomTableCell className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">{emp.emp_id}</CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                    {emp.initial} {emp.firstName} {emp.midName} {emp.surName}
                  </CustomTableCell>
                  <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{emp.nic}</CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={categoryColor[emp.category] ?? "gray"} className="w-fit text-xs">{emp.category}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={typeColor[emp.employmentType] ?? "gray"} className="w-fit text-xs">{emp.employmentType}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Rs. {Number(emp.basicSalary).toLocaleString()}
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color="indigo" className="w-fit text-xs">{emp.level}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={emp.epfEtf ? "success" : "gray"} className="w-fit text-xs">
                      {emp.epfEtf ? "Eligible" : "N/A"}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={statusColor[emp.status] ?? "gray"} className="w-fit text-xs">{emp.status}</StatusBadge>
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
                  <CustomTableCell colSpan={11} className="py-8 text-center text-sm text-gray-400">No employees found.</CustomTableCell>
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
          closeForm={() => { setOpenModal(false); setEditData(null); }}
          initialData={editData}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
