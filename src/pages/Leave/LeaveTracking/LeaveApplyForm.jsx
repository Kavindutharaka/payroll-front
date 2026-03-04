import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomTextarea, CustomButton } from "../../../components/FormFields";

const employees = [
  { id: "EMP-001", name: "Mr. John A. Smith"   },
  { id: "EMP-002", name: "Ms. Sarah Johnson"   },
  { id: "EMP-003", name: "Dr. James R. Perera" },
  { id: "EMP-004", name: "Ms. Nadia Fernando"  },
];
const leaveTypes = ["Annual Leave", "Sick Leave", "Casual Leave", "No-Pay Leave", "Maternity Leave", "Study Leave"];

export default function LeaveApplyForm({ closeForm }) {
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
        <form className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="employee">Employee</CustomLabel>
            <CustomSelect id="employee" required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
              ))}
            </CustomSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="leaveType">Leave Type</CustomLabel>
            <CustomSelect id="leaveType" required>
              <option value="">Select Leave Type</option>
              {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </CustomSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="dateFrom">From</CustomLabel>
              <CustomInput id="dateFrom" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="dateTo">To</CustomLabel>
              <CustomInput id="dateTo" type="date" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="reason">Reason (optional)</CustomLabel>
            <CustomTextarea id="reason" rows={3} placeholder="Brief reason for leave..." />
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
