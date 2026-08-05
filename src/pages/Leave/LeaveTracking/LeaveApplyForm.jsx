import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomTextarea, CustomButton } from "../../../components/FormFields";
import { fetchActiveEmployees } from "../../../services/employeeService";
import { fetchLeaveTypes } from "../../../services/leaveTypeService";

export default function LeaveApplyForm({ closeForm, onSave }) {
  const [employees, setEmployees]   = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [form, setForm] = useState({ emp_id: "", leaveType: "", dateFrom: "", dateTo: "", reason: "" });

  useEffect(() => {
    fetchActiveEmployees().then((d)  => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
    fetchLeaveTypes().then((d) => setLeaveTypes(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const from = new Date(form.dateFrom);
    const to   = new Date(form.dateTo);
    const days = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);
    onSave({ ...form, days });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Apply Leave</h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="employee">Employee</CustomLabel>
            <CustomSelect id="employee" value={form.emp_id} onChange={set("emp_id")} required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.emp_id} value={e.emp_id}>{e.initial} {e.firstName} {e.surName} ({e.emp_id})</option>
              ))}
            </CustomSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="leaveType">Leave Type</CustomLabel>
            <CustomSelect id="leaveType" value={form.leaveType} onChange={set("leaveType")} required>
              <option value="">Select Leave Type</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </CustomSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="dateFrom">From</CustomLabel>
              <CustomInput id="dateFrom" type="date" value={form.dateFrom} onChange={set("dateFrom")} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="dateTo">To</CustomLabel>
              <CustomInput id="dateTo" type="date" value={form.dateTo} onChange={set("dateTo")} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="reason">Reason (optional)</CustomLabel>
            <CustomTextarea id="reason" rows={3} value={form.reason} onChange={set("reason")} placeholder="Brief reason for leave..." />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">Submit Request</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
