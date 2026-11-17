import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton, CustomToggle, CustomTextarea } from "../../../components/FormFields";
import { fetchTaxModes } from "../../../services/taxService";

const titles = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Rev."];
const positions = [
  { id: 1, name: "Software Engineer" }, { id: 2, name: "Product Manager" },
  { id: 3, name: "HR Manager" },        { id: 4, name: "Lecturer" },
  { id: 5, name: "Instructor" },        { id: 6, name: "Business Analyst" },
];
const levels   = ["Junior", "Mid-Level", "Senior", "Lead", "Manager"];

/* Tax modes come from Payroll Config, not a hard-coded list — the old list
 * offered "Mode 1" and "Custom Mode", neither of which exists. */
// Age is always derived from the date of birth — never stored, so it can't go stale.
const ageFrom = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d)) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? String(age) : "";
};

export default function EmployeeForm({ closeForm, initialData, onSave, saving = false, saveError = "" }) {
  const isEdit = !!initialData;

  const [form, setForm] = useState({
    emp_id:             initialData?.emp_id             ?? "",
    initial:            initialData?.initial            ?? "",
    initials:           initialData?.initials           ?? "",
    firstName:          initialData?.firstName          ?? "",
    midName:            initialData?.midName            ?? "",
    surName:            initialData?.surName            ?? "",
    fullName:           initialData?.fullName           ?? "",
    nic:                initialData?.nic                ?? "",
    dob:                initialData?.dob                ?? "",
    address:            initialData?.address            ?? "",
    title:              initialData?.title              ?? "",
    designation:        initialData?.designation        ?? "",
    dateOfJoining:      initialData?.dateOfJoining      ?? "",
    dateOfResignation:  initialData?.dateOfResignation  ?? "",
    category:           initialData?.category           ?? "",
    employmentType:     initialData?.employmentType     ?? "",
    contractStartDate: initialData?.contractStartDate ?? "",
    contractEndDate:   initialData?.contractEndDate   ?? "",
    position:           initialData?.position           ?? "",
    level:              initialData?.level              ?? "",
    contactNo:          initialData?.contactNo          ?? "",
    emergencyContactNo: initialData?.emergencyContactNo ?? "",
    remarks:           initialData?.remarks           ?? "",
    basicSalary:        initialData?.basicSalary        ?? "",
    tin:                initialData?.tin                ?? "",
    tinName:            initialData?.tinName            ?? "",
    newNic:         initialData?.newNic         ?? "",
    taxMode:            initialData?.taxMode            ?? "",
    epfEtfName:         initialData?.epfEtfName         ?? "",
    accountName:        initialData?.accountName        ?? "",
    bank:               initialData?.bank               ?? "",
    branch:             initialData?.branch             ?? "",
    accountNum:         initialData?.accountNum         ?? "",
    paymentMode:        initialData?.paymentMode        ?? "Bank",
    bankCode:           initialData?.bankCode           ?? "",
    branchCode:         initialData?.branchCode         ?? "",
  });
  const [epfEtf, setEpfEtf] = useState(initialData?.epfEtf ?? true);
  const [taxModes, setTaxModes] = useState([]);

  useEffect(() => {
    fetchTaxModes()
      .then((m) => setTaxModes(Array.isArray(m) ? m : []))
      .catch(() => setTaxModes([]));
  }, []);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  /* A required field left empty far down the form stopped the save with only the
   * browser's small bubble, often off screen - so the button seemed to do nothing.
   * Each empty required field is named here instead, and the first one is shown. */
  const [missing, setMissing] = useState([]);
  const noteInvalid = (e) => {
    const el = e.target;
    const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : "";
    const name = (label || el.placeholder || el.id || "a field").trim();
    setMissing((m) => (m.includes(name) ? m : [...m, name]));
    if (!e.currentTarget.dataset.shown) {
      e.currentTarget.dataset.shown = "1";
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  const tryingToSave = (e) => { setMissing([]); if (e.currentTarget.form) delete e.currentTarget.form.dataset.shown; };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    onSave({ ...form, epfEtf });
  };

  return (
    <div className="fb-fade fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="fb-pop relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{isEdit ? "Edit Employee" : "Add Employee"}</h3>
            <p className="text-sm text-purple-200">
              {isEdit ? `Editing ${initialData.emp_id}` : "Fill in the details to register a new employee"}
            </p>
          </div>
          <button type="button" onClick={closeForm} data-modal-close aria-label="Close"
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-col gap-6 px-6 py-6" onSubmit={handleSubmit} onInvalidCapture={noteInvalid}>

          {/* Personal Information */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Personal Information</h4>
            <div className="flex flex-col gap-4">
              {/* Title stays narrow; Initials sits beside the first name */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="initial">Title</CustomLabel>
                  <CustomSelect id="initial" value={form.initial} onChange={set("initial")} required>
                    <option value="">—</option>
                    {titles.map((t) => <option key={t} value={t}>{t}</option>)}
                  </CustomSelect>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="initials">Initials</CustomLabel>
                  <CustomInput id="initials" value={form.initials} onChange={set("initials")} placeholder="K.T" />
                </div>
                <div className="col-span-4 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="firstName">First Name</CustomLabel>
                  <CustomInput id="firstName" value={form.firstName} onChange={set("firstName")} placeholder="First name" required />
                </div>
                <div className="col-span-4 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="midName">Middle Name</CustomLabel>
                  <CustomInput id="midName" value={form.midName} onChange={set("midName")} placeholder="Middle name" />
                </div>
              </div>
              {/* Surname with date of birth and age beside it */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="surName">Surname</CustomLabel>
                  <CustomInput id="surName" value={form.surName} onChange={set("surName")} placeholder="Surname" required />
                </div>
                <div className="col-span-4 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dob">Date of Birth</CustomLabel>
                  <CustomInput id="dob" type="date" value={form.dob?.slice(0, 10) ?? ""} onChange={set("dob")} required />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="age">Age</CustomLabel>
                  <CustomInput id="age" value={ageFrom(form.dob)} readOnly disabled
                    placeholder="—" className="bg-gray-100 dark:bg-gray-700" />
                </div>
              </div>
              {/* The whole name as written on the NIC - some run to seven or more parts,
                  so it gets its own row and wraps. Reference only: no report or
                  calculation reads it; everywhere else uses initials + surname. */}
              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="fullName">Full Name</CustomLabel>
                <CustomTextarea id="fullName" rows={2} value={form.fullName} onChange={set("fullName")}
                  placeholder="Full name as on the NIC, for reference" />
              </div>
              {/* The registered NIC and, beside it, a newer one kept for reference only -
                  EPF, ETF, the bank and every report keep using the registered NIC. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="nic">NIC / Passport No</CustomLabel>
                  <CustomInput id="nic" value={form.nic} onChange={set("nic")} placeholder="e.g. 123456789V or N1234567" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="newNic">New ID Reference</CustomLabel>
                  <CustomInput id="newNic" value={form.newNic} onChange={set("newNic")}
                    placeholder="Newer NIC, for reference only" />
                </div>
              </div>
              {/* TIN and the name it is registered under, together. Some staff registered
                  under a maiden name or the name on a newer NIC; only the Tax report and
                  PAYE statement print it. */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="tin">TIN Number</CustomLabel>
                  <CustomInput id="tin" value={form.tin} onChange={set("tin")} placeholder="9 digits" />
                </div>
                <div className="col-span-8 flex flex-col gap-1.5">
                  <CustomLabel htmlFor="tinName">TIN Reference Name</CustomLabel>
                  <CustomInput id="tinName" value={form.tinName} onChange={set("tinName")}
                    placeholder="Name as registered for tax, if different" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="address">Address</CustomLabel>
                <CustomInput id="address" value={form.address} onChange={set("address")} placeholder="Residential address" required />
              </div>
            </div>
          </section>

          {/* Employment Details */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Employment Details</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="empId">Employee ID</CustomLabel>
                  <CustomInput id="empId" type="number" value={form.emp_id} onChange={set("emp_id")} placeholder="e.g. 001" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="title">Designation</CustomLabel>
                  <CustomInput id="title" value={form.title} onChange={set("title")} placeholder="e.g. Teacher, Head of Libraries" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dateOfJoining">Date of Joining</CustomLabel>
                  <CustomInput id="dateOfJoining" type="date" value={form.dateOfJoining?.slice(0, 10) ?? ""} onChange={set("dateOfJoining")} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="dateOfResignation">Date of Resignation</CustomLabel>
                  <CustomInput id="dateOfResignation" type="date" value={form.dateOfResignation?.slice(0, 10) ?? ""} onChange={set("dateOfResignation")} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="employmentType">Employment Type</CustomLabel>
                  <CustomSelect id="employmentType" value={form.employmentType} onChange={set("employmentType")} required>
                    <option value="">Select Type</option>
                    <option value="Permanent">Permanent</option>
                    {/* permanent staff kept on after 55 under a renewed contract -
                        still paid with permanent staff, EPF and ETF included */}
                    <option value="Permanent Staff on Contract">Permanent Staff on Contract</option>
                    <option value="Independent Contractor">Independent Contractor</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Intern">Intern</option>
                    <option value="Director">Director</option>
                  </CustomSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="contactNo">Contact No</CustomLabel>
                  <CustomInput id="contactNo" value={form.contactNo} onChange={set("contactNo")} placeholder="e.g. 0771234567" />
                </div>
              </div>

              {/* only for staff kept on under a contract - feeds the
                  Permanent Staff on Contract report */}
              {form.employmentType === "Permanent Staff on Contract" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <CustomLabel htmlFor="contractStartDate">Contract Start Date</CustomLabel>
                    <CustomInput id="contractStartDate" type="date" value={form.contractStartDate?.slice(0, 10) ?? ""}
                      onChange={set("contractStartDate")} />
                  </div>
                  {/* the renewal report counts the days left to this date */}
                  <div className="flex flex-col gap-1.5">
                    <CustomLabel htmlFor="contractEndDate">Contract End Date</CustomLabel>
                    <CustomInput id="contractEndDate" type="date" value={form.contractEndDate?.slice(0, 10) ?? ""}
                      onChange={set("contractEndDate")} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="emergencyContactNo">Emergency Contact No</CustomLabel>
                  <CustomInput id="emergencyContactNo" value={form.emergencyContactNo} onChange={set("emergencyContactNo")}
                    placeholder="e.g. 0719876543" />
                </div>
              </div>

              {/* free notes about the person - not used in any calculation or report */}
              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="remarks">Remarks</CustomLabel>
                <CustomTextarea id="remarks" rows={3} value={form.remarks} onChange={set("remarks")}
                  placeholder="Any notes about this employee" />
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
                    <option value="Main - Upper School">Main — Upper School</option>
                    <option value="Main - Junior School">Main — Junior School</option>
                    <option value="Main - Elementary School">Main — Elementary School</option>
                  </optgroup>
                  <optgroup label="Main School">
                    <option value="Main - Non-Academic Staff">Main — Non-Academic Staff</option>
                    <option value="Main - Administrative Staff">Main — Administrative Staff</option>
                    <option value="Main - Support Staff">Main — Support Staff</option>
                  </optgroup>
                  <optgroup label="Battaramulla School">
                    <option value="Battaramulla - Academic Staff">Battaramulla — Academic Staff</option>
                    <option value="Battaramulla - Administrative Staff">Battaramulla — Administrative Staff</option>
                    <option value="Battaramulla - Support Staff">Battaramulla — Support Staff</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="basicSalary">Basic Salary (Rs.)</CustomLabel>
                  <CustomInput id="basicSalary" type="number" value={form.basicSalary} onChange={set("basicSalary")} placeholder="e.g. 75000" required />
                </div>
                {/* Reference only — it lives in Salary Structure, so it isn't editable here */}
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="budgetaryRef">Budgetary Allowance (Rs.)</CustomLabel>
                  <CustomInput id="budgetaryRef" readOnly disabled
                    value={Number(initialData?.budgetaryAllowance || 0).toLocaleString()}
                    className="bg-gray-100 dark:bg-gray-700" />
                  <p className="text-xs text-gray-400">
                    Total package Rs. {(Number(form.basicSalary || 0) + Number(initialData?.budgetaryAllowance || 0)
                      + Number(initialData?.fixedAllowance || 0)).toLocaleString()} · edit in Salary Structure
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="taxMode">Tax Mode</CustomLabel>
                  <CustomSelect id="taxMode" value={form.taxMode} onChange={set("taxMode")}>
                    <option value="">Automatic — use the tax table</option>
                    {taxModes.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </CustomSelect>
                  <p className="text-xs text-gray-400">
                    Leave on Automatic for almost everyone: PAYE is worked out from the tax
                    table, which charges nothing below Rs. 150,000. Pick a mode only to
                    override that for this employee.
                  </p>
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

          {/* Payment */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Payment</h4>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <CustomLabel htmlFor="paymentMode">Payment Mode</CustomLabel>
                  <CustomSelect id="paymentMode" value={form.paymentMode} onChange={set("paymentMode")} required>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </CustomSelect>
                  <p className="text-xs text-gray-400">
                    {form.paymentMode === "Bank"
                      ? "Included in the bank bulk transfer file."
                      : form.paymentMode === "Cheque"
                      ? "Paid by cheque — for resignations held pending clearance. Appears in Reports → Cash & Cheque Payments."
                      : "Paid in cash — no bank details needed. Appears in Reports → Cash & Cheque Payments."}
                  </p>
                </div>
              </div>

              {/* Bank details only matter for a bank transfer */}
              {form.paymentMode === "Bank" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="accountName">Account Name</CustomLabel>
                      <CustomInput id="accountName" value={form.accountName} onChange={set("accountName")} placeholder="e.g. S.R Fernando" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="accountNum">Account Number</CustomLabel>
                      <CustomInput id="accountNum" value={form.accountNum} onChange={set("accountNum")} placeholder="e.g. 1234567890" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="bank">Bank</CustomLabel>
                      <CustomInput id="bank" value={form.bank} onChange={set("bank")} placeholder="e.g. Sampath Bank" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="branch">Branch</CustomLabel>
                      <CustomInput id="branch" value={form.branch} onChange={set("branch")} placeholder="e.g. Narahenpita" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="bankCode">Bank Code</CustomLabel>
                      <CustomInput id="bankCode" value={form.bankCode} onChange={set("bankCode")} placeholder="e.g. 7278" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <CustomLabel htmlFor="branchCode">Branch Code</CustomLabel>
                      <CustomInput id="branchCode" value={form.branchCode} onChange={set("branchCode")} placeholder="e.g. 040" required />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {missing.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
              <span className="font-semibold">Not saved — please fill in:</span> {missing.join(", ")}.
            </div>
          )}
          {saveError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit" disabled={saving} onClick={tryingToSave}>
              {saving ? "Saving…" : isEdit ? "Update Employee" : "Save Employee"}
            </CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
