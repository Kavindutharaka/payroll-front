import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import StandingOrderForm from "./StandingOrderForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchStandingOrders, createStandingOrder, updateStandingOrder, deleteStandingOrder } from "../../../services/standingOrderService";

export default function StandingOrders() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setOrders(Array.isArray(await fetchStandingOrders()) ? await fetchStandingOrders() : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updateStandingOrder(editData.id, form);
      else          await createStandingOrder(form);
      setShowForm(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this standing order?")) return;
    try { await deleteStandingOrder(id); load(); } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Standing Orders</h1>
            <p className="mt-1 text-sm text-gray-500">Configure recurring fixed or percentage-based salary transfers</p>
          </div>
          <CustomButton color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Standing Order
          </CustomButton>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee ID</CustomTableHeadCell>
                  <CustomTableHeadCell>Description</CustomTableHeadCell>
                  <CustomTableHeadCell>Amount / Rate</CustomTableHeadCell>
                  <CustomTableHeadCell>Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Effective From</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : orders.map((so) => (
                  <CustomTableRow key={so.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="font-mono text-sm text-purple-500">{so.emp_id}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{so.description}</CustomTableCell>
                    <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {so.type === "Fixed" ? `Rs. ${Number(so.amount).toLocaleString()}` : `${so.amount}%`}
                    </CustomTableCell>
                    <CustomTableCell><StatusBadge color={so.type === "Fixed" ? "indigo" : "purple"} className="w-fit text-xs">{so.type}</StatusBadge></CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-500">{so.effectiveFrom}</CustomTableCell>
                    <CustomTableCell><StatusBadge color="success" className="w-fit text-xs">{so.status}</StatusBadge></CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(so); setShowForm(true); }}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(so.id)}>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {!loading && orders.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">No standing orders found.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && <StandingOrderForm closeForm={() => { setShowForm(false); setEditData(null); }} initialData={editData} onSave={handleSave} />}
    </Layout>
  );
}
