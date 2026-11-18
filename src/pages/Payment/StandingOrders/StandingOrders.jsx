import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus } from "react-icons/hi";
import StandingOrderForm from "./StandingOrderForm";
import DataTable, { RowActions } from "../../../ui/DataTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchStandingOrders, createStandingOrder, updateStandingOrder, deleteStandingOrder } from "../../../services/standingOrderService";
import { notify, confirmDialog } from "../../../ui/feedback";

export default function StandingOrders() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const data = await fetchStandingOrders(); setOrders(Array.isArray(data) ? data : []); }
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
    if (!(await confirmDialog({ title: "Delete this standing order?", message: "It will no longer be deducted from payroll.", confirmLabel: "Delete standing order", tone: "danger" }))) return;
    try { await deleteStandingOrder(id); notify.success("Standing order deleted."); load(); } catch (err) { console.error(err); notify.error(err.userMessage || "That didn't work. Please try again."); }
  };

  const columns = [
    { key: "employee", label: "Employee", always: true, card: "title",
      render: (so) => (
        <div className="min-w-[11rem]">
          <div className="font-medium text-gray-800 dark:text-gray-100">{so.empName || "—"}</div>
          <div className="font-mono text-xs text-purple-600 dark:text-purple-400">EPF {so.emp_id}</div>
        </div>
      ) },
    { key: "description", label: "Description", card: "subtitle", render: (so) => so.description || "—" },
    { key: "amount", label: "Amount / Rate", align: "right", card: true,
      render: (so) => <span className="font-semibold">{so.type === "Fixed" ? `Rs. ${Number(so.amount).toLocaleString()}` : `${so.amount}%`}</span> },
    { key: "type", label: "Type",
      render: (so) => <StatusBadge color={so.type === "Fixed" ? "indigo" : "purple"} className="w-fit text-xs">{so.type}</StatusBadge> },
    { key: "from", label: "Effective From", card: true, render: (so) => (so.effectiveFrom ? String(so.effectiveFrom).slice(0, 10) : "—") },
    { key: "status", label: "Status", card: "badge",
      render: (so) => <StatusBadge color={so.status === "Active" ? "success" : "gray"} className="w-fit text-xs">{so.status}</StatusBadge> },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Standing Orders</h1>
            <p className="mt-1 text-sm text-gray-500">Configure recurring fixed or percentage-based salary transfers</p>
          </div>
          <CustomButton perm="payment.edit" color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Standing Order
          </CustomButton>
        </div>
        <DataTable
          id="standingOrders"
          columns={columns}
          rows={orders}
          loading={loading}
          empty="No standing orders yet."
          actions={(so, { inPanel } = {}) => (
            <RowActions inPanel={inPanel} editPerm="payment.edit" deletePerm="payment.delete"
              onEdit={() => { setEditData(so); setShowForm(true); }} onDelete={() => handleDelete(so.id)} />
          )}
          detail={{
            title: (so) => so.empName || `EPF ${so.emp_id}`,
            subtitle: (so) => `EPF ${so.emp_id}`,
          }}
          footer={<span><span className="font-semibold text-gray-700 dark:text-white">{orders.length}</span> standing orders</span>}
        />
      </div>
      {showForm && <StandingOrderForm closeForm={() => { setShowForm(false); setEditData(null); }} initialData={editData} onSave={handleSave} />}
    </Layout>
  );
}
