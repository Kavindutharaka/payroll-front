import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiSearch, HiCurrencyDollar, HiPencil, HiPlus, HiTrash, HiArrowLeft } from "react-icons/hi";
import { displayName } from "../../Payroll/Payslip/Payslip";
import AssignComponentForm from "./AssignComponentForm";
import { CustomInput, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchEmployees } from "../../../services/employeeService";
import { fetchStructureByEmployee, createStructureItem, updateStructureItem, deleteStructureItem, paidMonthsText } from "../../../services/salaryStructureService";
import { notify, confirmDialog } from "../../../ui/feedback";

const typeColor = { Allowance: "success", Deduction: "failure", "Employer Contribution": "indigo" };
const shortDate = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export default function SalaryStructure() {
  const [employees, setEmployees]   = useState([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);

  // phone / tablet: the list gives way to the detail - start it at the top
  useEffect(() => { if (window.innerWidth < 1024) window.scrollTo(0, 0); }, [selected?.id]);
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

  const handleDelete = async (c) => {
    const amount = Number(c.value || 0).toLocaleString();
    if (!(await confirmDialog({
      title: `Remove ${c.componentName}?`,
      message: `${c.type}, Rs. ${amount}. This can't be undone, and the next payroll calculation will leave it out.`,
      confirmLabel: "Remove", tone: "danger",
    }))) return;
    try { await deleteStructureItem(c.id); notify.success(`${c.componentName} removed.`); loadComponents(selected); } catch (err) { console.error(err); notify.error(err.userMessage || "Could not remove it."); }
  };

  // typing 369 means employee 369 only - not 1369 as well, which is how the
  // wrong person's structure got opened
  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    if (/^\d+$/.test(q)) return String(e.emp_id) === q;
    return `${displayName(e)} ${e.firstName ?? ""} ${e.surName ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Salary Structure</h1>
            <p className="mt-1 text-sm text-gray-500">Assign allowances, deductions and loan deductions per employee</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {/* Employee Picker */}
          <div className={`${selected ? "hidden lg:block" : ""} rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-white">Select Employee</p>
              <CustomInput icon={HiSearch} placeholder="Search..." sizing="sm" className="mt-2"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <ul className="divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700 lg:max-h-[calc(100vh-15rem)]">
              {loadingEmps ? (
                <li className="px-4 py-6 text-center text-sm text-gray-400">Loading…</li>
              ) : filtered.map((emp) => (
                <li key={emp.id} onClick={() => selectEmployee(emp)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectEmployee(emp); } }}
                  aria-current={selected?.id === emp.id ? "true" : undefined}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selected?.id === emp.id ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {displayName(emp)}
                  </p>
                  <span className="font-mono text-xs text-purple-500">{emp.emp_id}</span>
                  <p className="mt-1 text-xs text-gray-500">Basic: Rs. {Number(emp.basicSalary).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Component Panel */}
          <div className={`${selected ? "" : "hidden lg:block"} lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
            {!selected ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-gray-400">
                <HiCurrencyDollar className="h-10 w-10" />
                <p className="text-sm">Select an employee to manage salary structure</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <div className="min-w-0">
                    <button type="button" onClick={() => setSelected(null)}
                      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 lg:hidden">
                      <HiArrowLeft className="h-4 w-4" /> All employees
                    </button>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {displayName(selected)}
                    </p>
                    <p className="text-xs text-gray-500">{selected.emp_id} · Basic: Rs. {Number(selected.basicSalary).toLocaleString()}</p>
                  </div>
                  <CustomButton perm="salaryStructure.edit" color="purple" size="sm" onClick={() => { setEditData(null); setShowForm(true); }}>
                    <HiPlus className="mr-1.5 h-4 w-4" /> Assign Component
                  </CustomButton>
                </div>
                <div className="table-viewport">
                  <CustomTable>
                    <CustomTableHead>
                      <CustomTableRow>
                        <CustomTableHeadCell>Component</CustomTableHeadCell>
                        <CustomTableHeadCell>Type</CustomTableHeadCell>
                        <CustomTableHeadCell>Calculation</CustomTableHeadCell>
                        <CustomTableHeadCell>Value</CustomTableHeadCell>
                        <CustomTableHeadCell>Effective</CustomTableHeadCell>
                        <CustomTableHeadCell>Taxable</CustomTableHeadCell>
                        <CustomTableHeadCell>EPF</CustomTableHeadCell>
                        <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                      </CustomTableRow>
                    </CustomTableHead>
                    <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {loadingComps ? (
                        <CustomTableRow><CustomTableCell colSpan={8} className="py-6 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                      ) : components.length === 0 ? (
                        <CustomTableRow><CustomTableCell colSpan={8} className="py-8 text-center text-sm text-gray-400">No components assigned yet.</CustomTableCell></CustomTableRow>
                      ) : components.map((c) => (
                        <CustomTableRow key={c.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                          <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.componentName}</CustomTableCell>
                          <CustomTableCell><StatusBadge color={typeColor[c.type]} className="w-fit text-xs">{c.type}</StatusBadge></CustomTableCell>
                          <CustomTableCell className="text-xs text-gray-500">{c.calcType}</CustomTableCell>
                          <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {c.calcType === "Fixed Amount" ? `Rs. ${Number(c.value).toLocaleString()}` : `${c.value}%`}
                          </CustomTableCell>
                          <CustomTableCell className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                            {c.effectiveTo
                              ? <>{shortDate(c.effectiveFrom)} – {shortDate(c.effectiveTo)}
                                  <p className="text-purple-600 dark:text-purple-300">{paidMonthsText(c.effectiveFrom, c.effectiveTo)}</p></>
                              : c.effectiveFrom ? `from ${shortDate(c.effectiveFrom)}` : "—"}
                          </CustomTableCell>
                          <CustomTableCell><StatusBadge color={c.taxable ? "warning" : "gray"} className="w-fit text-xs">{c.taxable ? "Yes" : "No"}</StatusBadge></CustomTableCell>
                          <CustomTableCell><StatusBadge color={c.epfApplicable ? "success" : "gray"} className="w-fit text-xs">{c.epfApplicable ? "Yes" : "No"}</StatusBadge></CustomTableCell>
                          <CustomTableCell>
                            <div className="flex justify-center gap-2">
                              <CustomButton perm="salaryStructure.edit" size="xs" color="blue" outline pill
                                onClick={() => { setEditData(c); setShowForm(true); }}>
                                <HiPencil className="h-3.5 w-3.5" />
                              </CustomButton>
                              <CustomButton perm="salaryStructure.edit" size="xs" color="failure" outline pill onClick={() => handleDelete(c)}>
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
