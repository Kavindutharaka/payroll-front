import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { fetchSalaryComponents } from "../../../services/salaryComponentService";


export default function LoanTypeForm({ closeForm, initialData, onSave }) {
  const [form, setForm] = useState({
    name:              initialData?.name              ?? "",
    interestRate:      initialData?.interestRate      ?? 0,
    maxAmount:         initialData?.maxAmount         ?? "",
    installmentMethod: initialData?.installmentMethod ?? "Equal Monthly",
    linkedComponent:   initialData?.linkedComponent   ?? "",
  });
  // Deduction lines come from Payroll Config → Salary Components, the same
  // master the Salary Structure screen uses. Create one there and it appears
  // here on its own — no code change, and the two lists cannot drift apart.
  const [deductions, setDeductions] = useState([]);
  useEffect(() => {
    fetchSalaryComponents()
      .then((d) => setDeductions((Array.isArray(d) ? d : []).filter((c) => c.type === "Deduction")))
      .catch(() => setDeductions([]));
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fb-fade fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="fb-pop relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Loan Type" : "Create Loan Type"}</h3>
          <button type="button" onClick={closeForm} data-modal-close aria-label="Close"
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="loanName">Loan Name</CustomLabel>
            <CustomInput id="loanName" value={form.name} onChange={set("name")} placeholder="e.g. Staff Loan" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="interestRate">Interest Rate (%)</CustomLabel>
              <CustomInput id="interestRate" type="number" step="0.5" min="0"
                value={form.interestRate} onChange={set("interestRate")} placeholder="0 = interest free" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="maxAmount">Max Amount (Rs.)</CustomLabel>
              <CustomInput id="maxAmount" type="number" value={form.maxAmount}
                onChange={set("maxAmount")} placeholder="e.g. 500000" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="installmentMethod">Installment Method</CustomLabel>
            <CustomSelect id="installmentMethod" value={form.installmentMethod} onChange={set("installmentMethod")}>
              {/* the three types were saved with a free-text note in this field;
                  keep it selectable so opening Edit does not quietly discard it */}
              {form.installmentMethod &&
                !["Equal Monthly", "Lump Sum", "Custom"].includes(form.installmentMethod) && (
                <option value={form.installmentMethod}>{form.installmentMethod}</option>
              )}
              <option value="Equal Monthly">Equal Monthly</option>
              <option value="Lump Sum">Lump Sum</option>
              <option value="Custom">Custom</option>
            </CustomSelect>
            <p className="text-xs text-gray-400">
              Only Equal Monthly is applied today — total payable divided by the number
              of installments.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="linkedComponent">Deduction Component Link</CustomLabel>
            <CustomSelect id="linkedComponent" value={form.linkedComponent} onChange={set("linkedComponent")}>
              <option value="">Select Component</option>
              {/* keep whatever was saved selectable, even if it is no longer a component */}
              {form.linkedComponent && !deductions.some((c) => c.name === form.linkedComponent) && (
                <option value={form.linkedComponent}>{form.linkedComponent}</option>
              )}
              {deductions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </CustomSelect>
            <p className="text-xs text-gray-400">
              Which payslip line the installments show on. Add a new one in
              Payroll Config → Salary Components with Type “Deduction”.
            </p>
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
