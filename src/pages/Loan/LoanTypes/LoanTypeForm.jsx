import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";

const deductionComponents = ["Loan Installment", "Salary Advance Deduction", "NOPAY Deduction"];

export default function LoanTypeForm({ closeForm, initialData, onSave }) {
  const [form, setForm] = useState({
    name:              initialData?.name              ?? "",
    interestRate:      initialData?.interestRate      ?? 0,
    maxAmount:         initialData?.maxAmount         ?? "",
    installmentMethod: initialData?.installmentMethod ?? "Equal Monthly",
    linkedComponent:   initialData?.linkedComponent   ?? "",
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Loan Type" : "Create Loan Type"}</h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="loanName">Loan Name</CustomLabel>
            <CustomInput id="loanName" value={form.name} onChange={set("name")} placeholder="e.g. Staff Loan" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <option value="Equal Monthly">Equal Monthly</option>
              <option value="Lump Sum">Lump Sum</option>
              <option value="Custom">Custom</option>
            </CustomSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="linkedComponent">Deduction Component Link</CustomLabel>
            <CustomSelect id="linkedComponent" value={form.linkedComponent} onChange={set("linkedComponent")}>
              <option value="">Select Component</option>
              {deductionComponents.map((c) => <option key={c} value={c}>{c}</option>)}
            </CustomSelect>
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
