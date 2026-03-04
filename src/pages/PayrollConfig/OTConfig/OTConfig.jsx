import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import OTForm from "./OTForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const otTypes = [
  { id: 1, name: "Single OT",  multiplier: 1.5, baseFormula: "Basic Salary", hourDivision: 240, status: "Active" },
  { id: 2, name: "Double OT",  multiplier: 2.0, baseFormula: "Basic Salary", hourDivision: 240, status: "Active" },
  { id: 3, name: "Holiday OT", multiplier: 2.5, baseFormula: "Gross Salary", hourDivision: 240, status: "Active" },
];

export default function OTConfig() {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const handleEdit = (ot) => { setEditData(ot); setShowForm(true); };
  const handleAdd  = ()   => { setEditData(null); setShowForm(true); };

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">OT Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">Define overtime types, multipliers and base formulas</p>
          </div>
          <CustomButton color="purple" onClick={handleAdd}>
            <HiPlus className="mr-2 h-4 w-4" /> Create OT Type
          </CustomButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>#</CustomTableHeadCell>
                  <CustomTableHeadCell>OT Name</CustomTableHeadCell>
                  <CustomTableHeadCell>Multiplier</CustomTableHeadCell>
                  <CustomTableHeadCell>Base Formula</CustomTableHeadCell>
                  <CustomTableHeadCell>Hour Division</CustomTableHeadCell>
                  <CustomTableHeadCell>Rate Formula</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {otTypes.map((ot) => (
                  <CustomTableRow key={ot.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{ot.id}</CustomTableCell>
                    <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{ot.name}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="purple" className="w-fit font-mono text-sm">×{ot.multiplier}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{ot.baseFormula}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">÷ {ot.hourDivision}</CustomTableCell>
                    <CustomTableCell className="font-mono text-xs text-gray-500">
                      ({ot.baseFormula} / {ot.hourDivision}) × {ot.multiplier} × hours
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => handleEdit(ot)}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>

          {/* Formula explanation */}
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">OT Rate Formula</p>
            <p className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-300">
              OT Pay = (Base Salary / Hour Division) × Multiplier × OT Hours
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <OTForm
          closeForm={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </Layout>
  );
}
