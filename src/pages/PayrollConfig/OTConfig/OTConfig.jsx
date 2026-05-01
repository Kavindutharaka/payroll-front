import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import OTForm from "./OTForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchOTConfigs, createOTConfig, updateOTConfig, deleteOTConfig } from "../../../services/otConfigService";

export default function OTConfig() {
  const [otTypes, setOtTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setOtTypes(Array.isArray(await fetchOTConfigs()) ? await fetchOTConfigs() : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updateOTConfig(editData.id, form);
      else          await createOTConfig(form);
      setShowForm(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this OT type?")) return;
    try { await deleteOTConfig(id); load(); } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">OT Configuration</h1>
            <p className="mt-1 text-sm text-gray-500">Define overtime types, multipliers and base formulas</p>
          </div>
          <CustomButton color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create OT Type
          </CustomButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>OT Name</CustomTableHeadCell>
                  <CustomTableHeadCell>Multiplier</CustomTableHeadCell>
                  <CustomTableHeadCell>Base Formula</CustomTableHeadCell>
                  <CustomTableHeadCell>Hour Division</CustomTableHeadCell>
                  <CustomTableHeadCell>Rate Formula</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={6} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : otTypes.map((ot) => (
                  <CustomTableRow key={ot.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
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
                        <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(ot); setShowForm(true); }}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(ot.id)}>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {!loading && otTypes.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={6} className="py-8 text-center text-sm text-gray-400">No OT types configured.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
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
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}
