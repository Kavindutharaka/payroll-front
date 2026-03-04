import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomButton } from "../../../components/FormFields";

export default function TaxModeForm({ closeForm, initialData }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {initialData ? "Edit Tax Mode" : "Create Tax Mode"}
          </h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="modeName">Tax Mode Name</CustomLabel>
            <CustomInput id="modeName" defaultValue={initialData?.name} placeholder="e.g. Mode 1" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="effectiveDate">Effective Date</CustomLabel>
            <CustomInput id="effectiveDate" type="date" defaultValue={initialData?.effectiveDate} required />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Create Mode"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
