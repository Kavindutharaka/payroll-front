import { useState } from "react";
import { HiX, HiTag } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomTextarea, CustomButton } from "../../../components/FormFields";

export default function PositionForm({ closeForm, initialData, onSave }) {
  const [form, setForm] = useState({
    name:        initialData?.name        ?? "",
    description: initialData?.description ?? "",
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{initialData ? "Edit Position" : "Add Position"}</h3>
            <p className="text-sm text-purple-200">Fill in the details to {initialData ? "update" : "create"} a position</p>
          </div>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="posName">Position</CustomLabel>
            <CustomInput id="posName" icon={HiTag} value={form.name} onChange={set("name")}
              placeholder="e.g. Software Engineer, Product Manager…" required />
            <p className="text-xs text-gray-400">Enter a short, unique name for this position.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="posDesc">Description</CustomLabel>
            <CustomTextarea id="posDesc" value={form.description} onChange={set("description")}
              placeholder="Briefly describe this position's responsibilities…" rows={3} />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update Position" : "Save Position"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
