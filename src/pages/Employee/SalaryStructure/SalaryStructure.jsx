import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiSearch, HiCurrencyDollar, HiPencil, HiPlus, HiTrash } from "react-icons/hi";
import AssignComponentForm from "./AssignComponentForm";
import { CustomInput, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchEmployees } from "../../../services/employeeService";
import { fetchStructureByEmployee, createStructureItem, updateStructureItem, deleteStructureItem } from "../../../services/salaryStructureService";

const typeColor = { Allowance: "success", Deduction: "failure", "Employer Contribution": "indigo" };

export default function SalaryStructure() {
  const [employees, setEmployees]   = useState([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);
  const [components, setComponents] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [editData, setEditData]     = useState(null);
  const [loadingEmps, setLoadingEmps]   = useState(false);
  const [loadingComps, setLoadingComps] = useState(false);

  useEffect(() => {
    setLoadingEmps(true);
    fetchEmployees()
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoadingEmps(false));
  }, []);

  const loadComponents = async (emp) => {
    setLoadingComps(true);
    try { setComponents(Array.isArray(await fetchStructureByEmployee(emp.emp_id)) ? await fetchStructureByEmployee(emp.emp_id) : []); }
    catch (err) { console.error(err); }
    finally { setLoadingComps(false); }
  };

  const selectEmployee = (emp) => { setSelected(emp); setShowForm(false); setEditData(null); loadComponents(emp); };

  const closeForm = () => { setShowForm(false); setEditData(null); };

  const handleSave = async (data) => {
    try {
      if (editData) await updateStructureItem(editData.id, data);
      else          await createStructureItem(data);
      closeForm();
      loadComponents(selected);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this component?")) return;
    try { await deleteStructureItem(id); loadComponents(selected); } catch (err) { console.error(err); }
  };

  const filtered = employees.filter((e) =>
    `${e.firstName} ${e.surName}`.toLowerCase().includes(search.toLowerCase()) ||
    e.emp_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Salary Structure</h1>
            <p className="mt-1 text-sm text-gray-500">Assign allowances, deductions and loan deductions per employee</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Employee Picker */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">Select Employee</p>
              <CustomInput icon={HiSearch} placeholder="Search..." sizing="sm" className="mt-2"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {loadingEmps ? (
                <li className="px-4 py-6 text-center text-sm text-gray-400">Loading…</li>
              ) : filtered.map((emp) => (
                <li key={emp.id} onClick={() => selectEmployee(emp)}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selected?.id === emp.id ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {emp.initial} {emp.firstName} {emp.surName}
                  </p>
                  <span className="font-mono text-xs text-purple-500">{emp.emp_id}</span>
                  <p className="mt-1 text-xs text-gray-500">Basic: Rs. {Number(emp.basicSalary).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Component Panel */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {!selected ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-gray-400">
                <HiCurrencyDollar className="h-10 w-10" />
                <p className="text-sm">Select an employee to manage salary structure</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {selected.initial} {selected.firstName} {selected.surName}
                    </p>
                    <p className="text-xs text-gray-500">{selected.emp_id} · Basic: Rs. {Number(selected.basicSalary).toLocaleString()}</p>
                  </div>
                  <CustomButton color="purple" size="sm" onClick={() => { setEditData(null); setShowForm(true); }}>
                    <HiPlus className="mr-1.5 h-4 w-4" /> Assign Component
                  </CustomButton>
                </div>
                <div className="overflow-x-auto">
                  <CustomTable>
                    <CustomTableHead>
                      <CustomTableRow>
                        <CustomTableHeadCell>Component</CustomTableHeadCell>
                        <CustomTableHeadCell>Type</CustomTableHeadCell>
                        <CustomTableHeadCell>Calculation</CustomTableHeadCell>
                        <CustomTableHeadCell>Value</CustomTableHeadCell>
                        <CustomTableHeadCell>Taxable</CustomTableHeadCell>
                        <CustomTableHeadCell>EPF</CustomTableHeadCell>
                        <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                      </CustomTableRow>
                    </CustomTableHead>
                    <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {loadingComps ? (
                        <CustomTableRow><CustomTableCell colSpan={7} className="py-6 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                      ) : components.length === 0 ? (
                        <CustomTableRow><CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">No components assigned yet.</CustomTableCell></CustomTableRow>
                      ) : components.map((c) => (
                        <CustomTableRow key={c.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                          <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.componentName}</CustomTableCell>
                          <CustomTableCell><StatusBadge color={typeColor[c.type]} className="w-fit text-xs">{c.type}</StatusBadge></CustomTableCell>
                          <CustomTableCell className="text-xs text-gray-500">{c.calcType}</CustomTableCell>
                          <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {c.calcType === "Fixed Amount" ? `Rs. ${Number(c.value).toLocaleString()}` : `${c.value}%`}
                          </CustomTableCell>
                          <CustomTableCell><StatusBadge color={c.taxable ? "warning" : "gray"} className="w-fit text-xs">{c.taxable ? "Yes" : "No"}</StatusBadge></CustomTableCell>
                          <CustomTableCell><StatusBadge color={c.epfApplicable ? "success" : "gray"} className="w-fit text-xs">{c.epfApplicable ? "Yes" : "No"}</StatusBadge></CustomTableCell>
                          <CustomTableCell>
                            <div className="flex justify-center gap-2">
                              <CustomButton size="xs" color="blue" outline pill
                                onClick={() => { setEditData(c); setShowForm(true); }}>
                                <HiPencil className="h-3.5 w-3.5" />
                              </CustomButton>
                              <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(c.id)}>
                                <HiTrash className="h-3.5 w-3.5" />
                              </CustomButton>
                            </div>
                          </CustomTableCell>
                        </CustomTableRow>
                      ))}
                    </CustomTableBody>
                  </CustomTable>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <AssignComponentForm
          employee={selected}
          closeForm={closeForm}
          initialData={editData}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
