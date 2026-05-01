import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const initials  = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Rev."];
const positions = [
  { id: 1, name: "Software Engineer" }, { id: 2, name: "Product Manager" },
  { id: 3, name: "HR Manager" },        { id: 4, name: "Lecturer" },
  { id: 5, name: "Instructor" },        { id: 6, name: "Business Analyst" },
];
const levels = [
  { id: 1, name: "Junior" }, { id: 2, name: "Mid-Level" },
  { id: 3, name: "Senior" }, { id: 4, name: "Lead" }, { id: 5, name: "Manager" },
];
const taxModes = ["No Tax", "Mode 1", "Mode 2", "Custom Mode"];

export default function EmployeeForm({ closeForm, initialData }) {
  const isEdit = !!initialData;
  const [epfEtf, setEpfEtf] = useState(initialData?.epfEtf ?? true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isEdit ? "Edit Employee" : "Add Employee"}
            </h3>
            <p className="text-sm text-purple-200">
              {isEdit ? `Editing ${initialData.emp_id}` : "Fill in the details to register a new employee"}
            </p>
          </div>
          <button
            type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-col gap-6 px-6 py-6">

          {/* Personal Information */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">
              Personal Information
            </h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="initial">Initial</CustomLabel>
                  <CustomSelect id="initial" defaultValue={initialData?.initial ?? ""} required>
                    <option value="">Select</option>
                    {initials.map((i) => <option key={i} value={i}>{i}</option>)}
                  </CustomSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="firstName">First Name</CustomLabel>
                  <CustomInput id="firstName" defaultValue={initialData?.firstName} placeholder="First name" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="midName">Middle Name</CustomLabel>
                  <CustomInput id="midName" defaultValue={initialData?.midName} placeholder="Middle name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="surName">Surname</CustomLabel>
                  <CustomInput id="surName" defaultValue={initialData?.surName} placeholder="Surname" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="nic">NIC</CustomLabel>
                  <CustomInput id="nic" defaultValue={initialData?.nic} placeholder="e.g. 123456789V" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dob">Date of Birth</CustomLabel>
                  <CustomInput id="dob" type="date" defaultValue={initialData?.dob} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="address">Address</CustomLabel>
                  <CustomInput id="address" defaultValue={initialData?.address} placeholder="Residential address" required />
                </div>
              </div>
            </div>
          </section>

          {/* Employment Details */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">
              Employment Details
            </h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="empId">Employee ID</CustomLabel>
                  <CustomInput id="empId" defaultValue={initialData?.emp_id} placeholder="e.g. EMP-001" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="title">Title / Job Title</CustomLabel>
                  <CustomInput id="title" defaultValue={initialData?.title} placeholder="e.g. Software Engineer" required />
                </div>
              </div>
              {/* Designation — hidden, reserved for future use */}
              <div className="hidden">
                <CustomInput id="designation" defaultValue={initialData?.designation} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dateOfJoining">Date of Joining</CustomLabel>
                  <CustomInput id="dateOfJoining" type="date" defaultValue={initialData?.dateOfJoining} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="employmentType">Employment Type</CustomLabel>
                  <CustomSelect id="employmentType" defaultValue={initialData?.employmentType ?? ""} required>
                    <option value="">Select Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Temporary">Temporary</option>
                  </CustomSelect>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="category">Category</CustomLabel>
                  <CustomSelect id="category" defaultValue={initialData?.category ?? ""} required>
                    <option value="">Select Category</option>
                    <optgroup label="Main School — Academic">
                      <option value="Main - Upper School">Upper School</option>
                      <option value="Main - Junior School">Junior School</option>
                      <option value="Main - Elementary School">Elementary School</option>
                    </optgroup>
                    <optgroup label="Main School — Non-Academic">
                      <option value="Main - Administrative Staff">Administrative Staff</option>
                      <option value="Main - Support Staff">Support Staff</option>
                    </optgroup>
                    <optgroup label="Battaramulla School">
                      <option value="Battaramulla - Academic Staff">Academic Staff</option>
                      <option value="Battaramulla - Administrative Staff">Administrative Staff</option>
                      <option value="Battaramulla - Support Staff">Support Staff</option>
                    </optgroup>
                  </CustomSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="level">Level</CustomLabel>
                  <CustomSelect id="level" defaultValue={initialData?.level ?? ""} required>
                    <option value="">Select Level</option>
                    {levels.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </CustomSelect>
                </div>
              </div>
              {/* Position — hidden, reserved for future use */}
              <div className="hidden">
                <CustomSelect id="position" defaultValue={initialData?.position ?? ""}>
                  <option value="">Select Position</option>
                  {positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </CustomSelect>
              </div>
            </div>
          </section>

          {/* Salary & Tax */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">
              Salary & Tax
            </h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="basicSalary">Basic Salary (Rs.)</CustomLabel>
                  <CustomInput id="basicSalary" type="number" defaultValue={initialData?.basicSalary} placeholder="e.g. 75000" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="taxMode">Tax Mode</CustomLabel>
                  <CustomSelect id="taxMode" defaultValue={initialData?.taxMode ?? ""} required>
                    <option value="">Select Tax Mode</option>
                    {taxModes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </CustomSelect>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">EPF / ETF Eligibility</p>
                  <p className="text-xs text-gray-400">Toggle to enable or disable EPF/ETF for this employee</p>
                </div>
                <CustomToggle checked={epfEtf} onChange={setEpfEtf} color="purple" />
              </div>
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">
              Bank Details
            </h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="bank">Bank</CustomLabel>
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
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{isEdit ? "Update Employee" : "Save Employee"}</CustomButton>
          </div>

        </form>
      </div>
    </div>
  );
}
