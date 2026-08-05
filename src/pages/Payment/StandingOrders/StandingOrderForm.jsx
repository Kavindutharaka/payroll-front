import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { fetchActiveEmployees } from "../../../services/employeeService";

export default function StandingOrderForm({ closeForm, initialData, onSave }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    emp_id:        initialData?.emp_id        ?? "",
    description:   initialData?.description   ?? "",
    type:          initialData?.type          ?? "Fixed",
    amount:        initialData?.amount        ?? "",
    effectiveFrom: initialData?.effectiveFrom ?? "",
  });

  useEffect(() => {
    fetchActiveEmployees().then((d) => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Standing Order" : "Create Standing Order"}</h3>
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
            <CustomLabel htmlFor="description">Description</CustomLabel>
            <CustomInput id="description" value={form.description} onChange={set("description")} placeholder="e.g. Housing Loan - BOC" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="soType">Type</CustomLabel>
              <CustomSelect id="soType" value={form.type} onChange={set("type")}>
                <option value="Fixed">Fixed Amount</option>
                <option value="Percentage">Percentage (%)</option>
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="amount">{form.type === "Fixed" ? "Amount (Rs.)" : "Percentage (%)"}</CustomLabel>
              <CustomInput id="amount" type="number" value={form.amount} onChange={set("amount")}
                placeholder={form.type === "Fixed" ? "e.g. 5000" : "e.g. 10"} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="effectiveFrom">Effective From</CustomLabel>
            <CustomInput id="effectiveFrom" type="date" value={form.effectiveFrom} onChange={set("effectiveFrom")} required />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Create Order"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
