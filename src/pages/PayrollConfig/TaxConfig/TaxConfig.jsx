import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import TaxModeForm from "./TaxModeForm";
import TaxSlabForm from "./TaxSlabForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import {
  fetchTaxModes, createTaxMode, updateTaxMode, deleteTaxMode,
  fetchTaxSlabs, createTaxSlab, updateTaxSlab, deleteTaxSlab,
} from "../../../services/taxService";

export default function TaxConfig() {
  const [modes, setModes]               = useState([]);
  const [slabs, setSlabs]               = useState([]);
  const [loadingModes, setLoadingModes] = useState(false);
  const [loadingSlabs, setLoadingSlabs] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [showModeForm, setShowModeForm] = useState(false);
  const [showSlabForm, setShowSlabForm] = useState(false);
  const [editMode, setEditMode]         = useState(null);
  const [editSlab, setEditSlab]         = useState(null);

  const loadModes = async () => {
    setLoadingModes(true);
    try {
      const data = await fetchTaxModes();
      const list = Array.isArray(data) ? data : [];
      setModes(list);
      if (!selectedMode && list.length > 0) setSelectedMode(list[0]);
    } catch (err) { console.error(err); }
    finally { setLoadingModes(false); }
  };

  const loadSlabs = async (mode) => {
    if (!mode) return;
    setLoadingSlabs(true);
    try {
      const data = await fetchTaxSlabs(mode.name);
      setSlabs(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoadingSlabs(false); }
  };

  useEffect(() => { loadModes(); }, []);
  useEffect(() => { loadSlabs(selectedMode); }, [selectedMode]);

  const handleSaveMode = async (form) => {
    try {
      if (editMode) await updateTaxMode(editMode.id, form);
      else          await createTaxMode(form);
      setShowModeForm(false); setEditMode(null); loadModes();
    } catch (err) { console.error(err); }
  };

  const handleDeleteMode = async (id) => {
    if (!window.confirm("Delete this tax mode?")) return;
    try { await deleteTaxMode(id); loadModes(); } catch (err) { console.error(err); }
  };

  const handleSaveSlab = async (form) => {
    try {
      if (editSlab) await updateTaxSlab(editSlab.id, form);
      else          await createTaxSlab(form);
      setShowSlabForm(false); setEditSlab(null); loadSlabs(selectedMode);
    } catch (err) { console.error(err); }
  };

  const handleDeleteSlab = async (id) => {
    if (!window.confirm("Delete this tax slab?")) return;
    try { await deleteTaxSlab(id); loadSlabs(selectedMode); } catch (err) { console.error(err); }
  };

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
              <CustomButton color="purple" size="sm" onClick={() => { setEditMode(null); setShowModeForm(true); }}>
                <HiPlus className="mr-1.5 h-4 w-4" /> Create Mode
              </CustomButton>
            </div>
            <div className="overflow-x-auto">
              <CustomTable hoverable>
                <CustomTableHead>
                  <CustomTableRow>
                    <CustomTableHeadCell>Mode Name</CustomTableHeadCell>
                    <CustomTableHeadCell>Effective</CustomTableHeadCell>
                    <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                  </CustomTableRow>
                </CustomTableHead>
                <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loadingModes ? (
                    <CustomTableRow><CustomTableCell colSpan={3} className="py-6 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                  ) : modes.map((m) => (
                    <CustomTableRow
                      key={m.id}
                      className={`cursor-pointer hover:bg-purple-50 dark:hover:bg-gray-700 ${selectedMode?.id === m.id ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}
                      onClick={() => setSelectedMode(m)}
                    >
                      <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</CustomTableCell>
                      <CustomTableCell className="text-xs text-gray-500">{m.effectiveDate}</CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-2">
                          <CustomButton size="xs" color="blue" outline pill onClick={(e) => { e.stopPropagation(); setEditMode(m); setShowModeForm(true); }}>
                            <HiPencil className="h-3.5 w-3.5" />
                          </CustomButton>
                          <CustomButton size="xs" color="failure" outline pill onClick={(e) => { e.stopPropagation(); handleDeleteMode(m.id); }}>
                            <HiTrash className="h-3.5 w-3.5" />
                          </CustomButton>
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  ))}
                  {!loadingModes && modes.length === 0 && (
                    <CustomTableRow><CustomTableCell colSpan={3} className="py-6 text-center text-sm text-gray-400">No tax modes found.</CustomTableCell></CustomTableRow>
                  )}
                </CustomTableBody>
              </CustomTable>
            </div>
          </div>

          {/* Tax Slabs Panel */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <p className="font-semibold text-gray-800 dark:text-white">
                Slabs — <span className="text-purple-500">{selectedMode?.name ?? "—"}</span>
              </p>
              <CustomButton color="purple" size="sm" disabled={!selectedMode} onClick={() => { setEditSlab(null); setShowSlabForm(true); }}>
                <HiPlus className="mr-1.5 h-4 w-4" /> Add Slab
              </CustomButton>
            </div>
            {!selectedMode ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">Select a tax mode to view slabs.</div>
            ) : loadingSlabs ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">Loading…</div>
            ) : slabs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">No slabs for this mode. Click "Add Slab" to create one.</div>
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
                        <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">{Number(s.fromAmount).toLocaleString()}</CustomTableCell>
                        <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">{Number(s.toAmount).toLocaleString()}</CustomTableCell>
                        <CustomTableCell>
                          <StatusBadge color={Number(s.rate) === 0 ? "gray" : "warning"} className="w-fit text-xs font-semibold">
                            {s.rate}%
                          </StatusBadge>
                        </CustomTableCell>
                        <CustomTableCell className="text-xs text-gray-500">{s.effectiveDate}</CustomTableCell>
                        <CustomTableCell>
                          <div className="flex justify-center gap-2">
                            <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditSlab(s); setShowSlabForm(true); }}>
                              <HiPencil className="h-3.5 w-3.5" />
                            </CustomButton>
                            <CustomButton size="xs" color="failure" outline pill onClick={() => handleDeleteSlab(s.id)}>
                              <HiTrash className="h-3.5 w-3.5" />
                            </CustomButton>
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

      {showModeForm && (
        <TaxModeForm
          closeForm={() => { setShowModeForm(false); setEditMode(null); }}
          initialData={editMode}
          onSave={handleSaveMode}
        />
      )}
      {showSlabForm && selectedMode && (
        <TaxSlabForm
          mode={selectedMode.name}
          modeId={selectedMode.id}
          closeForm={() => { setShowSlabForm(false); setEditSlab(null); }}
          initialData={editSlab}
          onSave={handleSaveSlab}
        />
      )}
    </Layout>
  );
}
