import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiCheck, HiX, HiSearch } from "react-icons/hi";
import LeaveApplyForm from "./LeaveApplyForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import DataTable from "../../../ui/DataTable";
import { fetchLeaves, createLeave, updateLeaveStatus } from "../../../services/leaveService";

const statusColor = { Pending: "warning", Approved: "success", Rejected: "failure" };

export default function LeaveTracking() {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const data = await fetchLeaves(); setRecords(Array.isArray(data) ? data : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    try { await createLeave(data); setShowForm(false); load(); }
    catch (err) { console.error(err); }
  };

  const handleStatus = async (id, status) => {
    try { await updateLeaveStatus(id, status); load(); }
    catch (err) { console.error(err); }
  };

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    // a number is an EPF number, matched whole; anything else searches the name
    const matchSearch = !q || (/^\d+$/.test(q) ? String(r.emp_id) === q : String(r.empName || "").toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const day = (v) => (v ? String(v).slice(0, 10) : "—");
  const columns = [
    { key: "employee", label: "Employee", always: true, card: "title",
      render: (r) => (
        <div className="min-w-[11rem]">
          <div className="font-medium text-gray-800 dark:text-gray-100">{r.empName || "—"}</div>
          <div className="font-mono text-xs text-purple-600 dark:text-purple-400">EPF {r.emp_id}</div>
        </div>
      ) },
    { key: "type", label: "Leave Type", card: "subtitle", render: (r) => r.leaveType || "—" },
    { key: "from", label: "From", card: true, render: (r) => day(r.dateFrom) },
    { key: "to", label: "To", card: true, render: (r) => day(r.dateTo) },
    { key: "days", label: "Days", align: "right", render: (r) => `${r.days} day${Number(r.days) === 1 ? "" : "s"}` },
    { key: "noPay", label: "No-Pay",
      render: (r) => <StatusBadge color={r.noPayDeducted ? "failure" : "gray"} className="w-fit text-xs">{r.noPayDeducted ? "Yes" : "No"}</StatusBadge> },
    { key: "status", label: "Status", card: "badge",
      render: (r) => <StatusBadge color={statusColor[r.status] ?? "gray"} className="w-fit text-xs">{r.status}</StatusBadge> },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leave Tracking</h1>
            <p className="mt-1 text-sm text-gray-500">Apply, approve and track employee leave requests</p>
          </div>
          <CustomButton perm="leave.apply" color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Apply Leave
          </CustomButton>
        </div>
        <DataTable
          id="leave"
          columns={columns}
          rows={filtered}
          loading={loading}
          empty={records.length ? "No leave matches this search." : "No leave records yet."}
          toolbar={(
            <>
              <CustomInput icon={HiSearch} placeholder="Search by EPF number or name" sizing="sm" className="w-full sm:w-64"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <CustomSelect sizing="sm" value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </CustomSelect>
            </>
          )}
          actions={(r, { inPanel } = {}) => (r.status === "Pending" ? (
            <>
              <CustomButton perm="leave.approve" size="xs" color="success" pill={!inPanel} title="Approve" onClick={() => handleStatus(r.id, "Approved")}>
                <HiCheck className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Approve</span>}
              </CustomButton>
              <CustomButton perm="leave.approve" size="xs" color="failure" pill={!inPanel} title="Reject" onClick={() => handleStatus(r.id, "Rejected")}>
                <HiX className="h-3.5 w-3.5" />{inPanel && <span className="ml-1.5">Reject</span>}
              </CustomButton>
            </>
          ) : null)}
          detail={{
            title: (r) => r.empName || `EPF ${r.emp_id}`,
            subtitle: (r) => `EPF ${r.emp_id} · ${r.leaveType || "Leave"}`,
            extra: [
              { label: "Reason", render: (r) => r.reason || "—" },
            ],
          }}
          footer={(
            <span>
              Showing <span className="font-semibold text-gray-700 dark:text-white">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-700 dark:text-white">{records.length}</span> leave records
            </span>
          )}
        />
      </div>
      {showForm && <LeaveApplyForm closeForm={() => setShowForm(false)} onSave={handleSave} />}
    </Layout>
  );
}
