import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const availableComponents = [
  "Transport Allowance", "Mobile Allowance", "Attendance Bonus", "Risk Allowance",
  "Research Allowance", "Housing Allowance", "Meal Allowance", "Medical Allowance",
  "NOPAY Deduction", "Salary Advance Deduction", "Loan Installment", "EPF Deduction",
];

const calcTypes = [
  "Fixed Amount",
  "Percentage of Basic",
  "Percentage of Gross",
  "Formula Based",
];

export default function AssignComponentForm({ employee, closeForm }) {
  const [calcType, setCalcType] = useState("Fixed Amount");
  const [taxable, setTaxable]   = useState(false);
  const [epf, setEpf]           = useState(false);
  const [etf, setEtf]           = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        {/* Header */}
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

        <form className="flex flex-col gap-5 px-6 py-6">

          {/* Component + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="component">Component</CustomLabel>
              <CustomSelect id="component" required>
                <option value="">Select Component</option>
                {availableComponents.map((c) => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="compType">Type</CustomLabel>
              <CustomSelect id="compType" required>
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
              </CustomSelect>
            </div>
          </div>

          {/* Calculation Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="calcType">Calculation Type</CustomLabel>
              <CustomSelect id="calcType" value={calcType} onChange={(e) => setCalcType(e.target.value)}>
                {calcTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="value">{calcType === "Fixed Amount" ? "Amount (Rs.)" : "Value (%)"}</CustomLabel>
              <CustomInput
                id="value"
                type="number"
                placeholder={calcType === "Fixed Amount" ? "e.g. 5000" : "e.g. 5"}
                disabled={calcType === "Formula Based"}
                required={calcType !== "Formula Based"}
              />
            </div>
          </div>

          {/* Effective From */}
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="effectiveFrom">Effective From</CustomLabel>
            <CustomInput id="effectiveFrom" type="date" required />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <CustomLabel>Taxable</CustomLabel>
              <CustomToggle checked={taxable} onChange={setTaxable} color="purple" />
            </div>
            <div className="flex items-center justify-between">
              <CustomLabel>EPF Applicable</CustomLabel>
              <CustomToggle checked={epf} onChange={setEpf} color="purple" />
            </div>
            <div className="flex items-center justify-between">
              <CustomLabel>ETF Applicable</CustomLabel>
              <CustomToggle checked={etf} onChange={setEtf} color="purple" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">Assign Component</CustomButton>
          </div>

        </form>
      </div>
    </div>
  );
}
