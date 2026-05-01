import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiCheck, HiX, HiSearch } from "react-icons/hi";
import LeaveApplyForm from "./LeaveApplyForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
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
    try { setRecords(Array.isArray(await fetchLeaves()) ? await fetchLeaves() : []); }
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
    const name = `${r.emp_id}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leave Tracking</h1>
            <p className="mt-1 text-sm text-gray-500">Apply, approve and track employee leave requests</p>
          </div>
          <CustomButton color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Apply Leave
          </CustomButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CustomInput icon={HiSearch} placeholder="Search by emp ID..." sizing="sm" className="w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <CustomSelect sizing="sm" value={filterStatus} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </CustomSelect>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>#</CustomTableHeadCell>
                  <CustomTableHeadCell>Employee ID</CustomTableHeadCell>
                  <CustomTableHeadCell>Leave Type</CustomTableHeadCell>
                  <CustomTableHeadCell>From</CustomTableHeadCell>
                  <CustomTableHeadCell>To</CustomTableHeadCell>
                  <CustomTableHeadCell>Days</CustomTableHeadCell>
                  <CustomTableHeadCell>No-Pay</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={9} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.map((r, idx) => (
                  <CustomTableRow key={r.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{idx + 1}</CustomTableCell>
                    <CustomTableCell className="font-mono text-sm text-purple-500">{r.emp_id}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.leaveType}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.dateFrom}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.dateTo}</CustomTableCell>
                    <CustomTableCell><StatusBadge color="indigo" className="w-fit text-xs">{r.days} day{r.days > 1 ? "s" : ""}</StatusBadge></CustomTableCell>
                    <CustomTableCell><StatusBadge color={r.noPayDeducted ? "failure" : "gray"} className="w-fit text-xs">{r.noPayDeducted ? "Yes" : "No"}</StatusBadge></CustomTableCell>
                    <CustomTableCell><StatusBadge color={statusColor[r.status]} className="w-fit text-xs">{r.status}</StatusBadge></CustomTableCell>
                    <CustomTableCell>
                      {r.status === "Pending" ? (
                        <div className="flex justify-center gap-2">
                          <CustomButton size="xs" color="success" pill title="Approve" onClick={() => handleStatus(r.id, "Approved")}>
                            <HiCheck className="h-3.5 w-3.5" />
                          </CustomButton>
                          <CustomButton size="xs" color="failure" pill title="Reject" onClick={() => handleStatus(r.id, "Rejected")}>
                            <HiX className="h-3.5 w-3.5" />
                          </CustomButton>
                        </div>
                      ) : <p className="text-center text-xs text-gray-400">—</p>}
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={9} className="py-8 text-center text-sm text-gray-400">No leave records found.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && <LeaveApplyForm closeForm={() => setShowForm(false)} onSave={handleSave} />}
    </Layout>
  );
}
