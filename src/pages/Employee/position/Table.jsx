import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import PositionForm from "./PositionForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchPositions, createPosition, updatePosition, deletePosition } from "../../../services/positionService";

export function PositionTable() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData]   = useState(null);

  const load = async () => {
    setLoading(true);
    try { setPositions(Array.isArray(await fetchPositions()) ? await fetchPositions() : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updatePosition(editData.id, form);
      else          await createPosition(form);
      setOpenModal(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this position?")) return;
    try { await deletePosition(id); load(); } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Positions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and organize your employee positions</p>
        </div>
        <CustomButton onClick={() => { setEditData(null); setOpenModal(true); }} color="purple">
          <HiPlus className="mr-2 h-4 w-4" /> Add Position
        </CustomButton>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <CustomTable hoverable>
            <CustomTableHead>
              <CustomTableRow>
                <CustomTableHeadCell className="w-10">#</CustomTableHeadCell>
                <CustomTableHeadCell>Position Name</CustomTableHeadCell>
                <CustomTableHeadCell>Description</CustomTableHeadCell>
                <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
              </CustomTableRow>
            </CustomTableHead>
            <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <CustomTableRow><CustomTableCell colSpan={4} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
              ) : positions.map((pos, idx) => (
                <CustomTableRow key={pos.id} className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <CustomTableCell className="text-sm text-gray-400">{idx + 1}</CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color="purple" className="w-fit px-3 py-1 text-sm font-medium">{pos.name}</StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{pos.description}</CustomTableCell>
                  <CustomTableCell>
                    <div className="flex items-center justify-center gap-2">
                      <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(pos); setOpenModal(true); }}>
                        <HiPencil className="h-3.5 w-3.5" />
                      </CustomButton>
                      <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(pos.id)}>
                        <HiTrash className="h-3.5 w-3.5" />
                      </CustomButton>
                    </div>
                  </CustomTableCell>
                </CustomTableRow>
              ))}
              {!loading && positions.length === 0 && (
                <CustomTableRow><CustomTableCell colSpan={4} className="py-8 text-center text-sm text-gray-400">No positions found.</CustomTableCell></CustomTableRow>
              )}
            </CustomTableBody>
          </CustomTable>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-white">{positions.length}</span> entries
          </span>
          <span className="text-xs text-gray-400">Employee Position Management</span>
        </div>
      </div>

      {openModal && <PositionForm closeForm={() => { setOpenModal(false); setEditData(null); }} initialData={editData} onSave={handleSave} />}
    </div>
  );
}
