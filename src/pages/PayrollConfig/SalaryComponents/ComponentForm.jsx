import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const calcTypes = ["Fixed Amount", "Percentage of Basic", "Percentage of Gross", "Formula Based"];

export default function ComponentForm({ closeForm, initialData }) {
  const isEdit = !!initialData;
  const [calcType, setCalcType]   = useState(initialData?.calcType ?? "Fixed Amount");
  const [taxable, setTaxable]     = useState(initialData?.taxable ?? false);
  const [epf, setEpf]             = useState(initialData?.epfApplicable ?? false);
  const [etf, setEtf]             = useState(initialData?.etfApplicable ?? false);
  const [mandatory, setMandatory] = useState(initialData?.mandatory ?? false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isEdit ? "Edit Component" : "Create Salary Component"}
            </h3>
            <p className="text-sm text-purple-200">Define a new dynamic payroll component</p>
          </div>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-col gap-5 px-6 py-6">

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="name">Component Name</CustomLabel>
              <CustomInput id="name" defaultValue={initialData?.name} placeholder="e.g. Mobile Allowance" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="type">Type</CustomLabel>
              <CustomSelect id="type" defaultValue={initialData?.type ?? "Allowance"} required>
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
              </CustomSelect>
            </div>
          </div>

          {/* Calc Type + Default Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="calcType">Calculation Type</CustomLabel>
              <CustomSelect id="calcType" value={calcType} onChange={(e) => setCalcType(e.target.value)}>
                {calcTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="defaultValue">{calcType === "Fixed Amount" ? "Default Amount (Rs.)" : calcType === "Formula Based" ? "Formula" : "Default %"}</CustomLabel>
              {calcType === "Formula Based" ? (
                <CustomInput id="defaultValue" placeholder="e.g. (basic / 240) * hours" />
              ) : (
                <CustomInput id="defaultValue" type="number"
                  defaultValue={initialData?.defaultValue}
                  placeholder={calcType === "Fixed Amount" ? "e.g. 5000" : "e.g. 5"} required />
              )}
            </div>
          </div>

          {/* Effective Date */}
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="effectiveDate">Effective Date</CustomLabel>
            <CustomInput id="effectiveDate" type="date" required />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Rules</p>
            {[
              { label: "Taxable",     val: taxable,   set: setTaxable },
              { label: "EPF Applicable", val: epf,    set: setEpf },
              { label: "ETF Applicable", val: etf,    set: setEtf },
              { label: "Mandatory",   val: mandatory, set: setMandatory },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center justify-between">
                <CustomLabel>{label}</CustomLabel>
                <CustomToggle checked={val} onChange={set} color="purple" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{isEdit ? "Update" : "Create Component"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
