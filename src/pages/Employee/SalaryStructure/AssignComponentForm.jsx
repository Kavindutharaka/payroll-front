import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const availableComponents = [
  "Transport Allowance", "Mobile Allowance", "Attendance Bonus", "Risk Allowance",
  "Research Allowance", "Housing Allowance", "Meal Allowance", "Medical Allowance",
  "NOPAY Deduction", "Salary Advance Deduction", "Loan Installment", "EPF Deduction",
];
const calcTypes = ["Fixed Amount", "Percentage of Basic", "Percentage of Gross", "Formula Based"];

export default function AssignComponentForm({ employee, closeForm, onSave }) {
  const [form, setForm]   = useState({ componentName: "", type: "Allowance", calcType: "Fixed Amount", value: "", effectiveFrom: "" });
  const [taxable, setTaxable] = useState(false);
  const [epf, setEpf]         = useState(false);
  const [etf, setEtf]         = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, emp_id: employee.emp_id, taxable, epfApplicable: epf, etfApplicable: etf });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Assign Salary Component</h3>
            <p className="text-sm text-purple-200">{employee?.name}</p>
          </div>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="component">Component</CustomLabel>
              <CustomSelect id="component" value={form.componentName} onChange={set("componentName")} required>
                <option value="">Select Component</option>
                {availableComponents.map((c) => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="compType">Type</CustomLabel>
              <CustomSelect id="compType" value={form.type} onChange={set("type")} required>
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
              </CustomSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="calcType">Calculation Type</CustomLabel>
              <CustomSelect id="calcType" value={form.calcType} onChange={set("calcType")}>
                {calcTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="value">{form.calcType === "Fixed Amount" ? "Amount (Rs.)" : "Value (%)"}</CustomLabel>
              <CustomInput id="value" type="number" value={form.value} onChange={set("value")}
                placeholder={form.calcType === "Fixed Amount" ? "e.g. 5000" : "e.g. 5"}
                disabled={form.calcType === "Formula Based"}
                required={form.calcType !== "Formula Based"} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="effectiveFrom">Effective From</CustomLabel>
            <CustomInput id="effectiveFrom" type="date" value={form.effectiveFrom} onChange={set("effectiveFrom")} required />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
            {[
              { label: "Taxable", val: taxable, set: setTaxable },
              { label: "EPF Applicable", val: epf, set: setEpf },
              { label: "ETF Applicable", val: etf, set: setEtf },
            ].map(({ label, val, set: s }) => (
              <div key={label} className="flex items-center justify-between">
                <CustomLabel>{label}</CustomLabel>
                <CustomToggle checked={val} onChange={s} color="purple" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">Assign Component</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
