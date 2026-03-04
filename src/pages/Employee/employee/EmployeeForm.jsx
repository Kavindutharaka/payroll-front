import { Button, Label, TextInput, Select } from "flowbite-react";
import { HiX } from "react-icons/hi";

const initials = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Rev."];

const positions = [
  { id: 1, name: "Software Engineer" },
  { id: 2, name: "Product Manager" },
  { id: 3, name: "HR Manager" },
  { id: 4, name: "Business Analyst" },
  { id: 5, name: "DevOps Engineer" },
];

const levels = [
  { id: 1, name: "Junior" },
  { id: 2, name: "Mid-Level" },
  { id: 3, name: "Senior" },
  { id: 4, name: "Lead" },
  { id: 5, name: "Manager" },
];

export default function EmployeeForm({ closeForm }) {
  return (
    /* ── Backdrop ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

      {/* ── Modal Card ── */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Add Employee</h3>
            <p className="text-sm text-purple-200">Fill in the details to register a new employee</p>
          </div>
          <button
            type="button"
            onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form className="flex flex-col gap-6 px-6 py-6">

          {/* ── Personal Information ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">
              Personal Information
            </h4>
            <div className="flex flex-col gap-4">

              {/* Initial + First Name + Middle Name */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="initial" value="Initial" />
                  <Select id="initial" required>
                    <option value="">Select</option>
                    {initials.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="firstName" value="First Name" />
                  <TextInput id="firstName" type="text" placeholder="First name" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="midName" value="Middle Name" />
                  <TextInput id="midName" type="text" placeholder="Middle name" />
                </div>
              </div>

              {/* Surname + NIC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="surName" value="Surname" />
                  <TextInput id="surName" type="text" placeholder="Surname" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nic" value="NIC" />
                  <TextInput id="nic" type="text" placeholder="e.g. 123456789V" required />
                </div>
              </div>

              {/* DOB + Address */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dob" value="Date of Birth" />
                  <TextInput id="dob" type="date" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address" value="Address" />
                  <TextInput id="address" type="text" placeholder="Residential address" required />
                </div>
              </div>

            </div>
          </div>

          {/* ── Employment Details ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">
              Employment Details
            </h4>
            <div className="flex flex-col gap-4">

              {/* Employee ID + Title */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="empId" value="Employee ID" />
                  <TextInput id="empId" type="text" placeholder="e.g. EMP-001" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title" value="Title" />
                  <TextInput id="title" type="text" placeholder="e.g. Software Engineer" required />
                </div>
              </div>

              {/* Designation + Date of Joining */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="designation" value="Designation" />
                  <TextInput id="designation" type="text" placeholder="e.g. Team Lead" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dateOfJoining" value="Date of Joining" />
                  <TextInput id="dateOfJoining" type="date" required />
                </div>
              </div>

              {/* Position + Level */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="position" value="Position" />
                  <Select id="position" required>
                    <option value="">Select Position</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="level" value="Level" />
                  <Select id="level" required>
                    <option value="">Select Level</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

            </div>
          </div>

          {/* ── Bank Details ── */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500 dark:text-purple-400">
              Bank Details
            </h4>
            <div className="flex flex-col gap-4">

              {/* Bank + Branch */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bank" value="Bank" />
                  <TextInput id="bank" type="text" placeholder="e.g. Bank of Ceylon" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="branch" value="Branch" />
                  <TextInput id="branch" type="text" placeholder="e.g. Colombo 03" required />
                </div>
              </div>

              {/* Account Number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountNum" value="Account Number" />
                <TextInput id="accountNum" type="text" placeholder="e.g. 1234567890" required />
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Button color="gray" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button color="purple" type="submit">
              Save Employee
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
