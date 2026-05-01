import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomButton } from "../../../components/FormFields";

export default function TaxSlabForm({ mode, modeId, closeForm, initialData, onSave }) {
  const [form, setForm] = useState({
    fromAmount:    initialData?.fromAmount    ?? initialData?.from ?? "",
    toAmount:      initialData?.toAmount      ?? initialData?.to   ?? "",
    rate:          initialData?.rate          ?? "",
    effectiveDate: initialData?.effectiveDate ?? "",
  });

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, modeName: mode, taxModeId: modeId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {initialData ? "Edit Tax Slab" : "Add Tax Slab"}
            </h3>
            <p className="text-sm text-purple-200">Mode: {mode}</p>
          </div>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="slabFrom">From (Rs.)</CustomLabel>
              <CustomInput id="slabFrom" type="number" value={form.fromAmount} onChange={set("fromAmount")} placeholder="e.g. 0" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="slabTo">To (Rs.)</CustomLabel>
              <CustomInput id="slabTo" type="number" value={form.toAmount} onChange={set("toAmount")} placeholder="e.g. 100000" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="rate">Tax Rate (%)</CustomLabel>
              <CustomInput id="rate" type="number" value={form.rate} onChange={set("rate")} placeholder="e.g. 6" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="effectiveDate">Effective Date</CustomLabel>
              <CustomInput id="effectiveDate" type="date" value={form.effectiveDate} onChange={set("effectiveDate")} required />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Add Slab"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
