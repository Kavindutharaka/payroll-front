import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiArchive, HiSearch } from "react-icons/hi";
import ComponentForm from "./ComponentForm";
import { CustomInput, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const components = [
  { id: 1, name: "Transport Allowance", type: "Allowance", calcType: "Fixed Amount",        defaultValue: 5000,  taxable: false, epfApplicable: false, etfApplicable: false, mandatory: true,  status: "Active" },
  { id: 2, name: "Mobile Allowance",    type: "Allowance", calcType: "Fixed Amount",        defaultValue: 2000,  taxable: false, epfApplicable: false, etfApplicable: false, mandatory: false, status: "Active" },
  { id: 3, name: "Attendance Bonus",    type: "Allowance", calcType: "Percentage of Basic", defaultValue: 5,     taxable: true,  epfApplicable: true,  etfApplicable: true,  mandatory: false, status: "Active" },
  { id: 4, name: "Risk Allowance",      type: "Allowance", calcType: "Percentage of Basic", defaultValue: 10,    taxable: true,  epfApplicable: true,  etfApplicable: true,  mandatory: false, status: "Active" },
  { id: 5, name: "Research Allowance",  type: "Allowance", calcType: "Fixed Amount",        defaultValue: 15000, taxable: true,  epfApplicable: false, etfApplicable: false, mandatory: false, status: "Active" },
  { id: 6, name: "NOPAY Deduction",     type: "Deduction", calcType: "Formula Based",       defaultValue: 0,     taxable: false, epfApplicable: false, etfApplicable: false, mandatory: true,  status: "Active" },
  { id: 7, name: "Mobile Deduction",    type: "Deduction", calcType: "Fixed Amount",        defaultValue: 1500,  taxable: false, epfApplicable: false, etfApplicable: false, mandatory: false, status: "Active" },
];

const typeColor  = { Allowance: "success", Deduction: "failure" };
const boolBadge  = (v) => <StatusBadge color={v ? "success" : "gray"} className="w-fit text-xs">{v ? "Yes" : "No"}</StatusBadge>;

export default function SalaryComponents() {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch]     = useState("");

  const filtered = components.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (c) => { setEditData(c); setShowForm(true); };
  const handleAdd  = ()   => { setEditData(null); setShowForm(true); };

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Salary Components</h1>
            <p className="mt-1 text-sm text-gray-500">Define dynamic allowances and deductions — no coding needed</p>
          </div>
          <CustomButton color="purple" onClick={handleAdd}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Component
          </CustomButton>
        </div>

        <div className="flex items-center gap-3">
          <CustomInput icon={HiSearch} placeholder="Search components..." sizing="sm" className="w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>#</CustomTableHeadCell>
                  <CustomTableHeadCell>Component Name</CustomTableHeadCell>
                  <CustomTableHeadCell>Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Calculation</CustomTableHeadCell>
                  <CustomTableHeadCell>Default Value</CustomTableHeadCell>
                  <CustomTableHeadCell>Taxable</CustomTableHeadCell>
                  <CustomTableHeadCell>EPF</CustomTableHeadCell>
                  <CustomTableHeadCell>ETF</CustomTableHeadCell>
                  <CustomTableHeadCell>Mandatory</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((c) => (
                  <CustomTableRow key={c.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{c.id}</CustomTableCell>
                    <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</CustomTableCell>
                    <CustomTableCell><StatusBadge color={typeColor[c.type]} className="w-fit text-xs">{c.type}</StatusBadge></CustomTableCell>
                    <CustomTableCell className="text-xs text-gray-500">{c.calcType}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">
                      {c.calcType === "Fixed Amount" ? `Rs. ${c.defaultValue.toLocaleString()}`
                        : c.calcType === "Formula Based" ? "Formula"
                        : `${c.defaultValue}%`}
                    </CustomTableCell>
                    <CustomTableCell>{boolBadge(c.taxable)}</CustomTableCell>
                    <CustomTableCell>{boolBadge(c.epfApplicable)}</CustomTableCell>
                    <CustomTableCell>{boolBadge(c.etfApplicable)}</CustomTableCell>
                    <CustomTableCell>{boolBadge(c.mandatory)}</CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => handleEdit(c)}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="warning" outline pill title="Archive">
                          <HiArchive className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>
          <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <span className="text-sm text-gray-500">
              {filtered.length} component{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {showForm && (
        <ComponentForm
          closeForm={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </Layout>
  );
}
