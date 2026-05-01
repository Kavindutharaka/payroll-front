import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import LeaveTypeForm from "./LeaveTypeForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from "../../../services/leaveTypeService";

const boolBadge = (v, trueColor = "success", falseColor = "gray") =>
  <StatusBadge color={v ? trueColor : falseColor} className="w-fit text-xs">{v ? "Yes" : "No"}</StatusBadge>;

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editData, setEditData]     = useState(null);

  const load = async () => {
    setLoading(true);
    try { setLeaveTypes(Array.isArray(await fetchLeaveTypes()) ? await fetchLeaveTypes() : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updateLeaveType(editData.id, form);
      else          await createLeaveType(form);
      setShowForm(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave type?")) return;
    try { await deleteLeaveType(id); load(); } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leave Types</h1>
            <p className="mt-1 text-sm text-gray-500">Configure leave categories, limits and salary impact</p>
          </div>
          <CustomButton color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Leave Type
          </CustomButton>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>#</CustomTableHeadCell>
                  <CustomTableHeadCell>Leave Name</CustomTableHeadCell>
                  <CustomTableHeadCell>Annual Limit</CustomTableHeadCell>
                  <CustomTableHeadCell>Carry Forward</CustomTableHeadCell>
                  <CustomTableHeadCell>Paid</CustomTableHeadCell>
                  <CustomTableHeadCell>Affects Salary</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : leaveTypes.map((lt, idx) => (
                  <CustomTableRow key={lt.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{idx + 1}</CustomTableCell>
                    <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{lt.name}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">
                      {lt.annualLimit === 0 ? <span className="text-gray-400">Unlimited</span> : `${lt.annualLimit} days`}
                    </CustomTableCell>
                    <CustomTableCell>{boolBadge(lt.carryForward)}</CustomTableCell>
                    <CustomTableCell>{boolBadge(lt.paid, "success", "failure")}</CustomTableCell>
                    <CustomTableCell>{boolBadge(lt.affectsSalary, "warning", "gray")}</CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(lt); setShowForm(true); }}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(lt.id)}>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {!loading && leaveTypes.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">No leave types found.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && (
        <LeaveTypeForm closeForm={() => { setShowForm(false); setEditData(null); }} initialData={editData} onSave={handleSave} />
      )}
    </Layout>
  );
}
