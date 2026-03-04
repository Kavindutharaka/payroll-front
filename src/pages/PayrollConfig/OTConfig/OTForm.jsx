import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";

export default function OTForm({ closeForm, initialData }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {initialData ? "Edit OT Type" : "Create OT Type"}
          </h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="otName">OT Type Name</CustomLabel>
            <CustomInput id="otName" defaultValue={initialData?.name} placeholder="e.g. Double OT" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="multiplier">Multiplier</CustomLabel>
              <CustomInput id="multiplier" type="number" step="0.5" min="1"
                defaultValue={initialData?.multiplier} placeholder="e.g. 1.5" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="hourDivision">Hour Division</CustomLabel>
              <CustomInput id="hourDivision" type="number"
                defaultValue={initialData?.hourDivision ?? 240} placeholder="e.g. 240" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="baseFormula">Base Salary Formula</CustomLabel>
            <CustomSelect id="baseFormula" defaultValue={initialData?.baseFormula ?? "Basic Salary"}>
              <option value="Basic Salary">Basic Salary</option>
              <option value="Gross Salary">Gross Salary</option>
            </CustomSelect>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Create OT Type"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
