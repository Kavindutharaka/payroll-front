import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiCheck, HiX, HiSearch } from "react-icons/hi";
import LeaveApplyForm from "./LeaveApplyForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const leaveRecords = [
  { id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",   type: "Annual Leave",  from: "2026-03-10", to: "2026-03-12", days: 3, status: "Pending",  noPayDeducted: false },
  { id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   type: "Sick Leave",    from: "2026-03-05", to: "2026-03-05", days: 1, status: "Approved", noPayDeducted: false },
  { id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera", type: "No-Pay Leave",  from: "2026-02-20", to: "2026-02-21", days: 2, status: "Approved", noPayDeducted: true  },
  { id: 4, emp_id: "EMP-004", name: "Ms. Nadia Fernando",  type: "Casual Leave",  from: "2026-03-18", to: "2026-03-18", days: 1, status: "Pending",  noPayDeducted: false },
  { id: 5, emp_id: "EMP-001", name: "Mr. John A. Smith",   type: "Annual Leave",  from: "2026-02-01", to: "2026-02-03", days: 3, status: "Rejected", noPayDeducted: false },
];

const statusColor = { Pending: "warning", Approved: "success", Rejected: "failure" };

export default function LeaveTracking() {
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("all");

  const filtered = leaveRecords.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.emp_id.toLowerCase().includes(search.toLowerCase());
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <CustomInput icon={HiSearch} placeholder="Search employee..." sizing="sm" className="w-64"
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
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Leave Type</CustomTableHeadCell>
                  <CustomTableHeadCell>From</CustomTableHeadCell>
                  <CustomTableHeadCell>To</CustomTableHeadCell>
                  <CustomTableHeadCell>Days</CustomTableHeadCell>
                  <CustomTableHeadCell>No-Pay Deducted</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((r) => (
                  <CustomTableRow key={r.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{r.id}</CustomTableCell>
                    <CustomTableCell>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.name}</p>
                      <p className="font-mono text-xs text-purple-500">{r.emp_id}</p>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.type}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.from}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{r.to}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="indigo" className="w-fit text-xs">{r.days} day{r.days > 1 ? "s" : ""}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={r.noPayDeducted ? "failure" : "gray"} className="w-fit text-xs">
                        {r.noPayDeducted ? "Yes" : "No"}
                      </StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={statusColor[r.status]} className="w-fit text-xs">{r.status}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      {r.status === "Pending" ? (
                        <div className="flex justify-center gap-2">
                          <CustomButton size="xs" color="success" pill title="Approve">
                            <HiCheck className="h-3.5 w-3.5" />
                          </CustomButton>
                          <CustomButton size="xs" color="failure" pill title="Reject">
                            <HiX className="h-3.5 w-3.5" />
                          </CustomButton>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-gray-400">—</p>
                      )}
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {filtered.length === 0 && (
                  <CustomTableRow>
                    <CustomTableCell colSpan={9} className="py-8 text-center text-sm text-gray-400">
                      No leave records found.
                    </CustomTableCell>
                  </CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>

      {showForm && <LeaveApplyForm closeForm={() => setShowForm(false)} />}
    </Layout>
  );
}
