import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";
import { fetchSalaryComponents } from "../../../services/salaryComponentService";

const calcTypes = ["Fixed Amount", "Percentage of Basic", "Percentage of Gross", "Formula Based"];

export default function AssignComponentForm({ employee, closeForm, onSave, initialData }) {
  const isEdit = !!initialData;
  const [available, setAvailable] = useState([]);
  const [form, setForm] = useState({
    componentName: initialData?.componentName ?? "",
    type:          initialData?.type          ?? "Allowance",
    calcType:      initialData?.calcType      ?? "Fixed Amount",
    value:         initialData?.value         ?? "",
    effectiveFrom: initialData?.effectiveFrom?.slice?.(0, 10) ?? "",
  });
  const [taxable, setTaxable] = useState(!!initialData?.taxable);
  const [epf, setEpf]         = useState(!!initialData?.epfApplicable);
  const [etf, setEtf]         = useState(!!initialData?.etfApplicable);

  useEffect(() => {
    fetchSalaryComponents()
      .then((d) => setAvailable(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  // Picking a component from the master list pre-fills its configured rules
  const pickComponent = (e) => {
    const name = e.target.value;
    const match = available.find((c) => c.name === name);
    setForm((p) => ({
      ...p,
      componentName: name,
      type:     match?.type     ?? p.type,
      calcType: match?.calcType ?? p.calcType,
    }));
    if (match) {
      setTaxable(!!match.taxable);
      setEpf(!!match.epfApplicable);
      setEtf(!!match.etfApplicable);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, emp_id: employee.emp_id, taxable, epfApplicable: epf, etfApplicable: etf });
  };

  const empName = `${employee?.initial ?? ""} ${employee?.firstName ?? ""} ${employee?.surName ?? ""}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isEdit ? "Edit Salary Component" : "Assign Salary Component"}
            </h3>
            <p className="text-sm text-purple-200">{empName}</p>
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
              <CustomSelect id="component" value={form.componentName} onChange={pickComponent} required>
                <option value="">Select Component</option>
                {available.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                {/* keep an existing value selectable even if it was archived from the master list */}
                {form.componentName && !available.some((c) => c.name === form.componentName) && (
                  <option value={form.componentName}>{form.componentName}</option>
                )}
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="compType">Type</CustomLabel>
              <CustomSelect id="compType" value={form.type} onChange={set("type")} required>
                <option value="Allowance">Allowance</option>
                <option value="Deduction">Deduction</option>
                <option value="Employer Contribution">Employer Contribution</option>
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
              <CustomInput id="value" type="number" step="0.01" value={form.value} onChange={set("value")}
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
            <CustomButton color="purple" type="submit">{isEdit ? "Update Component" : "Assign Component"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
