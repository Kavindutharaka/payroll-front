import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import TaxModeForm from "./TaxModeForm";
import TaxSlabForm from "./TaxSlabForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const taxModes = [
  { id: 1, name: "No Tax",      slabs: 0, effectiveDate: "2024-01-01", status: "Active" },
  { id: 2, name: "Mode 1",      slabs: 4, effectiveDate: "2024-01-01", status: "Active" },
  { id: 3, name: "Mode 2",      slabs: 5, effectiveDate: "2024-01-01", status: "Active" },
  { id: 4, name: "Custom Mode", slabs: 3, effectiveDate: "2025-04-01", status: "Active" },
];

const taxSlabs = {
  "Mode 1": [
    { id: 1, from: 0,       to: 100000,  rate: 0,  effectiveDate: "2024-01-01" },
    { id: 2, from: 100001,  to: 141667,  rate: 6,  effectiveDate: "2024-01-01" },
    { id: 3, from: 141668,  to: 183333,  rate: 12, effectiveDate: "2024-01-01" },
    { id: 4, from: 183334,  to: 999999,  rate: 18, effectiveDate: "2024-01-01" },
  ],
  "Mode 2": [
    { id: 1, from: 0,       to: 83333,   rate: 0,  effectiveDate: "2024-01-01" },
    { id: 2, from: 83334,   to: 116667,  rate: 6,  effectiveDate: "2024-01-01" },
    { id: 3, from: 116668,  to: 150000,  rate: 12, effectiveDate: "2024-01-01" },
    { id: 4, from: 150001,  to: 200000,  rate: 18, effectiveDate: "2024-01-01" },
    { id: 5, from: 200001,  to: 999999,  rate: 24, effectiveDate: "2024-01-01" },
  ],
};

export default function TaxConfig() {
  const [showModeForm, setShowModeForm]   = useState(false);
  const [showSlabForm, setShowSlabForm]   = useState(false);
  const [selectedMode, setSelectedMode]   = useState("Mode 1");

  const slabs = taxSlabs[selectedMode] ?? [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tax Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">Manage tax modes and slab-based tax rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Tax Modes Panel */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">Tax Modes</p>
              <CustomButton color="purple" size="sm" onClick={() => setShowModeForm(true)}>
                <HiPlus className="mr-1.5 h-4 w-4" /> Create Mode
              </CustomButton>
            </div>
            <div className="overflow-x-auto">
              <CustomTable hoverable>
                <CustomTableHead>
                  <CustomTableRow>
                    <CustomTableHeadCell>Mode Name</CustomTableHeadCell>
                    <CustomTableHeadCell>Slabs</CustomTableHeadCell>
                    <CustomTableHeadCell>Effective</CustomTableHeadCell>
                    <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                  </CustomTableRow>
                </CustomTableHead>
                <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {taxModes.map((m) => (
                    <CustomTableRow
                      key={m.id}
                      className={`cursor-pointer hover:bg-purple-50 dark:hover:bg-gray-700 ${selectedMode === m.name ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}
                      onClick={() => setSelectedMode(m.name)}
                    >
                      <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-600">{m.slabs} slabs</CustomTableCell>
                      <CustomTableCell className="text-xs text-gray-500">{m.effectiveDate}</CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-2">
                          <CustomButton size="xs" color="blue" outline pill><HiPencil className="h-3.5 w-3.5" /></CustomButton>
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  ))}
                </CustomTableBody>
              </CustomTable>
            </div>
          </div>

          {/* Tax Slabs Panel */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">
                Slabs — <span className="text-purple-500">{selectedMode}</span>
              </p>
              <CustomButton color="purple" size="sm" onClick={() => setShowSlabForm(true)}>
                <HiPlus className="mr-1.5 h-4 w-4" /> Add Slab
              </CustomButton>
            </div>
            {slabs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                No slabs for this mode. Click "Add Slab" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <CustomTable hoverable>
                  <CustomTableHead>
                    <CustomTableRow>
                      <CustomTableHeadCell>From (Rs.)</CustomTableHeadCell>
                      <CustomTableHeadCell>To (Rs.)</CustomTableHeadCell>
                      <CustomTableHeadCell>Rate (%)</CustomTableHeadCell>
                      <CustomTableHeadCell>Effective</CustomTableHeadCell>
                      <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                    </CustomTableRow>
                  </CustomTableHead>
                  <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {slabs.map((s) => (
                      <CustomTableRow key={s.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                        <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">{s.from.toLocaleString()}</CustomTableCell>
                        <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">{s.to.toLocaleString()}</CustomTableCell>
                        <CustomTableCell>
                          <StatusBadge color={s.rate === 0 ? "gray" : "warning"} className="w-fit text-xs font-semibold">
                            {s.rate}%
                          </StatusBadge>
                        </CustomTableCell>
                        <CustomTableCell className="text-xs text-gray-500">{s.effectiveDate}</CustomTableCell>
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
            )}
          </div>
        </div>
      </div>

      {showModeForm && <TaxModeForm closeForm={() => setShowModeForm(false)} />}
      {showSlabForm && <TaxSlabForm mode={selectedMode} closeForm={() => setShowSlabForm(false)} />}
    </Layout>
  );
}
