import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";
import { fetchEmployees } from "../../../services/employeeService";

export default function BankAccountForm({ closeForm, initialData, onSave }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    emp_id:     initialData?.emp_id     ?? "",
    bank:       initialData?.bank       ?? "",
    branch:     initialData?.branch     ?? "",
    accountNum: initialData?.accountNum ?? "",
    splitType:  initialData?.splitType  ?? "Percentage",
    splitValue: initialData?.splitValue ?? "",
  });
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);

  useEffect(() => {
    fetchEmployees().then((d) => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...form, isDefault }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Bank Account" : "Add Bank Account"}</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="bank">Bank Name</CustomLabel>
              <CustomInput id="bank" value={form.bank} onChange={set("bank")} placeholder="e.g. Bank of Ceylon" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="branch">Branch</CustomLabel>
              <CustomInput id="branch" value={form.branch} onChange={set("branch")} placeholder="e.g. Colombo 03" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="accountNum">Account Number</CustomLabel>
            <CustomInput id="accountNum" value={form.accountNum} onChange={set("accountNum")} placeholder="e.g. 1234567890" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="splitType">Split Type</CustomLabel>
              <CustomSelect id="splitType" value={form.splitType} onChange={set("splitType")}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (Rs.)</option>
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="splitValue">{form.splitType === "Percentage" ? "Percentage (%)" : "Amount (Rs.)"}</CustomLabel>
              <CustomInput id="splitValue" type="number" value={form.splitValue} onChange={set("splitValue")}
                placeholder={form.splitType === "Percentage" ? "e.g. 100" : "e.g. 50000"} required />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
            <CustomLabel>Set as Default Account</CustomLabel>
            <CustomToggle checked={isDefault} onChange={setIsDefault} color="purple" />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Add Account"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
