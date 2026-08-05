import { useState } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle } from "../../../components/FormFields";

const initials  = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Rev."];
const positions = [
  { id: 1, name: "Software Engineer" }, { id: 2, name: "Product Manager" },
  { id: 3, name: "HR Manager" },        { id: 4, name: "Lecturer" },
  { id: 5, name: "Instructor" },        { id: 6, name: "Business Analyst" },
];
const levels   = ["Junior", "Mid-Level", "Senior", "Lead", "Manager"];
const taxModes = ["No Tax", "Mode 1", "Mode 2", "Custom Mode"];

export default function EmployeeForm({ closeForm, initialData, onSave }) {
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    emp_id:             initialData?.emp_id             ?? "",
    initial:            initialData?.initial            ?? "",
    firstName:          initialData?.firstName          ?? "",
    midName:            initialData?.midName            ?? "",
    surName:            initialData?.surName            ?? "",
    nic:                initialData?.nic                ?? "",
    dob:                initialData?.dob                ?? "",
    address:            initialData?.address            ?? "",
    title:              initialData?.title              ?? "",
    designation:        initialData?.designation        ?? "",
    dateOfJoining:      initialData?.dateOfJoining      ?? "",
    dateOfResignation:  initialData?.dateOfResignation  ?? "",
    category:           initialData?.category           ?? "",
    employmentType:     initialData?.employmentType     ?? "",
    position:           initialData?.position           ?? "",
    level:              initialData?.level              ?? "",
    contactNo:          initialData?.contactNo          ?? "",
    emergencyContactNo: initialData?.emergencyContactNo ?? "",
    basicSalary:        initialData?.basicSalary        ?? "",
    taxMode:            initialData?.taxMode            ?? "",
    epfEtfName:         initialData?.epfEtfName         ?? "",
    accountName:        initialData?.accountName        ?? "",
    bank:               initialData?.bank               ?? "",
    branch:             initialData?.branch             ?? "",
    accountNum:         initialData?.accountNum         ?? "",
    bankCode:           initialData?.bankCode           ?? "",
    branchCode:         initialData?.branchCode         ?? "",
  });
  const [epfEtf, setEpfEtf] = useState(initialData?.epfEtf ?? true);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, epfEtf });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{isEdit ? "Edit Employee" : "Add Employee"}</h3>
            <p className="text-sm text-purple-200">
              {isEdit ? `Editing ${initialData.emp_id}` : "Fill in the details to register a new employee"}
            </p>
          </div>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-col gap-6 px-6 py-6" onSubmit={handleSubmit}>

          {/* Personal Information */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Personal Information</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="initial">Initial</CustomLabel>
                  <CustomSelect id="initial" value={form.initial} onChange={set("initial")} required>
                    <option value="">Select</option>
                    {initials.map((i) => <option key={i} value={i}>{i}</option>)}
                  </CustomSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="firstName">First Name</CustomLabel>
                  <CustomInput id="firstName" value={form.firstName} onChange={set("firstName")} placeholder="First name" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="midName">Middle Name</CustomLabel>
                  <CustomInput id="midName" value={form.midName} onChange={set("midName")} placeholder="Middle name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="surName">Surname</CustomLabel>
                  <CustomInput id="surName" value={form.surName} onChange={set("surName")} placeholder="Surname" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="nic">NIC / Passport No</CustomLabel>
                  <CustomInput id="nic" value={form.nic} onChange={set("nic")} placeholder="e.g. 123456789V or N1234567" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dob">Date of Birth</CustomLabel>
                  <CustomInput id="dob" type="date" value={form.dob} onChange={set("dob")} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="address">Address</CustomLabel>
                  <CustomInput id="address" value={form.address} onChange={set("address")} placeholder="Residential address" required />
                </div>
              </div>
            </div>
          </section>

          {/* Employment Details */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Employment Details</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="empId">Employee ID</CustomLabel>
                  <CustomInput id="empId" type="number" value={form.emp_id} onChange={set("emp_id")} placeholder="e.g. 001" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="title">Title / Job Title</CustomLabel>
                  <CustomInput id="title" value={form.title} onChange={set("title")} placeholder="e.g. Senior Lecturer" required />
                </div>
              </div>

              {/* Designation — hidden, reserved for future use */}
              <div className="hidden">
                <CustomInput id="designation" value={form.designation} onChange={set("designation")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dateOfJoining">Date of Joining</CustomLabel>
                  <CustomInput id="dateOfJoining" type="date" value={form.dateOfJoining} onChange={set("dateOfJoining")} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dateOfResignation">Date of Resignation</CustomLabel>
                  <CustomInput id="dateOfResignation" type="date" value={form.dateOfResignation} onChange={set("dateOfResignation")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="employmentType">Employment Type</CustomLabel>
                  <CustomSelect id="employmentType" value={form.employmentType} onChange={set("employmentType")} required>
                    <option value="">Select Type</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Independent Contractor">Independent Contractor</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Intern">Intern</option>
                  </CustomSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="contactNo">Contact No</CustomLabel>
                  <CustomInput id="contactNo" value={form.contactNo} onChange={set("contactNo")} placeholder="e.g. 0771234567" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="emergencyContactNo">Emergency Contact No</CustomLabel>
                  <CustomInput id="emergencyContactNo" value={form.emergencyContactNo} onChange={set("emergencyContactNo")}
                    placeholder="e.g. 0719876543" />
                </div>
              </div>

              {/* Level — hidden, reserved for future use */}
              <div className="hidden">
                <CustomSelect id="level" value={form.level} onChange={set("level")}>
                  <option value="">Select Level</option>
                  {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </CustomSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="category">Category</CustomLabel>
                <CustomSelect id="category" value={form.category} onChange={set("category")} required>
                  <option value="">Select Category</option>
                  <optgroup label="Main School — Academic">
                    <option value="Main - Upper School">Upper School</option>
                    <option value="Main - Junior School">Junior School</option>
                    <option value="Main - Elementary School">Elementary School</option>
                  </optgroup>
                  <optgroup label="Main School">
                    <option value="Main - Non-Academic Staff">Non-Academic Staff</option>
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

              {/* Position — hidden, reserved for future use */}
              <div className="hidden">
                <CustomSelect id="position" value={form.position} onChange={set("position")}>
                  <option value="">Select Position</option>
                  {positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </CustomSelect>
              </div>
            </div>
          </section>

          {/* Salary & Tax */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Salary & Tax</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="basicSalary">Basic Salary (Rs.)</CustomLabel>
                  <CustomInput id="basicSalary" type="number" value={form.basicSalary} onChange={set("basicSalary")} placeholder="e.g. 75000" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="taxMode">Tax Mode</CustomLabel>
                  <CustomSelect id="taxMode" value={form.taxMode} onChange={set("taxMode")} required>
                    <option value="">Select Tax Mode</option>
                    {taxModes.map((m) => <option key={m} value={m}>{m}</option>)}
                  </CustomSelect>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">EPF / ETF Eligibility</p>
                    <p className="text-xs text-gray-400">Toggle to enable or disable EPF/ETF for this employee</p>
                  </div>
                  <CustomToggle checked={epfEtf} onChange={setEpfEtf} color="purple" />
                </div>
                {epfEtf && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <CustomLabel htmlFor="epfEtfName">EPF / ETF Member Name</CustomLabel>
                    <CustomInput id="epfEtfName" value={form.epfEtfName} onChange={set("epfEtfName")}
                      placeholder="Name as registered under EPF/ETF" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Bank Details</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="accountName">Account Name</CustomLabel>
                  <CustomInput id="accountName" value={form.accountName} onChange={set("accountName")} placeholder="e.g. John D. Perera" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="accountNum">Account Number</CustomLabel>
                  <CustomInput id="accountNum" value={form.accountNum} onChange={set("accountNum")} placeholder="e.g. 1234567890" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="bank">Bank</CustomLabel>
                  <CustomInput id="bank" value={form.bank} onChange={set("bank")} placeholder="e.g. Bank of Ceylon" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="branch">Branch</CustomLabel>
                  <CustomInput id="branch" value={form.branch} onChange={set("branch")} placeholder="e.g. Colombo 03" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="bankCode">Bank Code</CustomLabel>
                  <CustomInput id="bankCode" value={form.bankCode} onChange={set("bankCode")} placeholder="e.g. 7010" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="branchCode">Branch Code</CustomLabel>
                  <CustomInput id="branchCode" value={form.branchCode} onChange={set("branchCode")} placeholder="e.g. 001" required />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">{isEdit ? "Update Employee" : "Save Employee"}</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
