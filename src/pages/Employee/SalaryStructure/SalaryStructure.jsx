import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiSearch, HiCurrencyDollar, HiPencil, HiPlus, HiTrash } from "react-icons/hi";
import AssignComponentForm from "./AssignComponentForm";
import { CustomInput, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const employees = [
  { id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",    category: "Non-Academic", basicSalary: 85000 },
  { id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",    category: "Non-Academic", basicSalary: 95000 },
  { id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera",  category: "Academic",     basicSalary: 120000 },
  { id: 4, emp_id: "EMP-004", name: "Ms. Nadia Fernando",   category: "Academic",     basicSalary: 45000 },
];

// Per-employee assigned components (mock)
const assignedComponents = {
  "EMP-001": [
    { id: 1, name: "Transport Allowance",  type: "Allowance",  calcType: "Fixed",             value: 5000,  taxable: false, epf: false },
    { id: 2, name: "Mobile Allowance",     type: "Allowance",  calcType: "Fixed",             value: 2000,  taxable: false, epf: false },
    { id: 3, name: "Attendance Bonus",     type: "Allowance",  calcType: "Percentage of Basic", value: "5%",  taxable: true,  epf: true  },
    { id: 4, name: "NOPAY Deduction",      type: "Deduction",  calcType: "Formula Based",     value: "–",   taxable: false, epf: false },
  ],
  "EMP-002": [
    { id: 1, name: "Transport Allowance",  type: "Allowance",  calcType: "Fixed",             value: 5000,  taxable: false, epf: false },
    { id: 2, name: "Risk Allowance",       type: "Allowance",  calcType: "Percentage of Basic", value: "10%", taxable: true,  epf: true  },
  ],
  "EMP-003": [
    { id: 1, name: "Research Allowance",   type: "Allowance",  calcType: "Fixed",             value: 15000, taxable: true,  epf: false },
    { id: 2, name: "Mobile Allowance",     type: "Allowance",  calcType: "Fixed",             value: 3000,  taxable: false, epf: false },
  ],
  "EMP-004": [],
};

const categoryColor = { Academic: "indigo", "Non-Academic": "purple" };
const typeColor     = { Allowance: "success", Deduction: "failure" };

export default function SalaryStructure() {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);   // selected employee
  const [showForm, setShowForm]   = useState(false);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.emp_id.toLowerCase().includes(search.toLowerCase())
  );

  const components = selected ? (assignedComponents[selected.emp_id] ?? []) : [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        {/* Page Header */}
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
              <CustomInput
                icon={HiSearch}
                placeholder="Search..."
                sizing="sm"
                className="mt-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((emp) => (
                <li
                  key={emp.id}
                  onClick={() => { setSelected(emp); setShowForm(false); }}
                  className={`cursor-pointer px-4 py-3 transition-colors ${
                    selected?.id === emp.id
                      ? "bg-purple-50 dark:bg-purple-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{emp.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-purple-500">{emp.emp_id}</span>
                    <StatusBadge color={categoryColor[emp.category]} className="text-xs">{emp.category}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Basic: Rs. {emp.basicSalary.toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Component Detail Panel */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {!selected ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-gray-400">
                <HiCurrencyDollar className="h-10 w-10" />
                <p className="text-sm">Select an employee to manage salary structure</p>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{selected.name}</p>
                    <p className="text-xs text-gray-500">
                      {selected.emp_id} · Basic: Rs. {selected.basicSalary.toLocaleString()}
                    </p>
                  </div>
                  <CustomButton color="purple" size="sm" onClick={() => setShowForm(true)}>
                    <HiPlus className="mr-1.5 h-4 w-4" />
                    Assign Component
                  </CustomButton>
                </div>

                {/* Assigned Components Table */}
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
                      {components.length === 0 ? (
                        <CustomTableRow>
                          <CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">
                            No components assigned yet.
                          </CustomTableCell>
                        </CustomTableRow>
                      ) : components.map((c) => (
                        <CustomTableRow key={c.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                          <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</CustomTableCell>
                          <CustomTableCell>
                            <StatusBadge color={typeColor[c.type]} className="w-fit text-xs">{c.type}</StatusBadge>
                          </CustomTableCell>
                          <CustomTableCell className="text-xs text-gray-500">{c.calcType}</CustomTableCell>
                          <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {typeof c.value === "number" ? `Rs. ${c.value.toLocaleString()}` : c.value}
                          </CustomTableCell>
                          <CustomTableCell>
                            <StatusBadge color={c.taxable ? "warning" : "gray"} className="w-fit text-xs">
                              {c.taxable ? "Yes" : "No"}
                            </StatusBadge>
                          </CustomTableCell>
                          <CustomTableCell>
                            <StatusBadge color={c.epf ? "success" : "gray"} className="w-fit text-xs">
                              {c.epf ? "Yes" : "No"}
                            </StatusBadge>
                          </CustomTableCell>
                          <CustomTableCell>
                            <div className="flex justify-center gap-2">
                              <CustomButton size="xs" color="blue" outline pill><HiPencil className="h-3.5 w-3.5" /></CustomButton>
                              <CustomButton size="xs" color="failure" outline pill><HiTrash className="h-3.5 w-3.5" /></CustomButton>
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
          closeForm={() => setShowForm(false)}
        />
      )}
    </Layout>
  );
}
