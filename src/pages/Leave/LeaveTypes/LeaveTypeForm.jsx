import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomButton, CustomToggle } from "../../../components/FormFields";

export default function LeaveTypeForm({ closeForm, initialData, onSave }) {
  const [form, setForm]           = useState({ name: initialData?.name ?? "", annualLimit: initialData?.annualLimit ?? 0 });
  const [paid, setPaid]           = useState(initialData?.paid ?? true);
  const [carryForward, setCF]     = useState(initialData?.carryForward ?? false);
  const [affectsSalary, setAS]    = useState(initialData?.affectsSalary ?? false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, paid, carryForward, affectsSalary });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Leave Type" : "Create Leave Type"}</h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="leaveName">Leave Name</CustomLabel>
            <CustomInput id="leaveName" value={form.name} onChange={set("name")} placeholder="e.g. Annual Leave" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="annualLimit">Annual Limit (days)</CustomLabel>
            <CustomInput id="annualLimit" type="number" min={0} value={form.annualLimit}
              onChange={set("annualLimit")} placeholder="0 = unlimited" required />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
            {[
              { label: "Paid Leave",     val: paid,          set: setPaid },
              { label: "Carry Forward",  val: carryForward,  set: setCF   },
              { label: "Affects Salary", val: affectsSalary, set: setAS   },
            ].map(({ label, val, set: s }) => (
              <div key={label} className="flex items-center justify-between">
                <CustomLabel>{label}</CustomLabel>
                <CustomToggle checked={val} onChange={s} color="purple" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Create"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
