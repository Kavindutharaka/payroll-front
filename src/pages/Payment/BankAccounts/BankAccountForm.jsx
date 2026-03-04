import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const employees = [
  { id: "EMP-001", name: "Mr. John A. Smith"   },
  { id: "EMP-002", name: "Ms. Sarah Johnson"   },
  { id: "EMP-003", name: "Dr. James R. Perera" },
  { id: "EMP-004", name: "Ms. Nadia Fernando"  },
];

export default function BankAccountForm({ closeForm, initialData }) {
  const [isDefault, setIsDefault] = useState(initialData?.isDefault ?? false);
  const [splitType, setSplitType] = useState("Percentage");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {initialData ? "Edit Bank Account" : "Add Bank Account"}
          </h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="employee">Employee</CustomLabel>
            <CustomSelect id="employee" required>
              <option value="">Select Employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
            </CustomSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="bank">Bank Name</CustomLabel>
              <CustomInput id="bank" defaultValue={initialData?.bank} placeholder="e.g. Bank of Ceylon" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="branch">Branch</CustomLabel>
              <CustomInput id="branch" defaultValue={initialData?.branch} placeholder="e.g. Colombo 03" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="accountNum">Account Number</CustomLabel>
            <CustomInput id="accountNum" defaultValue={initialData?.accountNum} placeholder="e.g. 1234567890" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="splitType">Split Type</CustomLabel>
              <CustomSelect id="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value)}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (Rs.)</option>
              </CustomSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="splitValue">{splitType === "Percentage" ? "Percentage (%)" : "Amount (Rs.)"}</CustomLabel>
              <CustomInput id="splitValue" type="number" placeholder={splitType === "Percentage" ? "e.g. 100" : "e.g. 50000"} required />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
            <CustomLabel>Set as Default Account</CustomLabel>
            <CustomToggle checked={isDefault} onChange={setIsDefault} color="purple" />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{initialData ? "Update" : "Add Account"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
