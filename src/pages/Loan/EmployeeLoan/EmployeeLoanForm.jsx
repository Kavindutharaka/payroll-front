import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { fetchActiveEmployees } from "../../../services/employeeService";
import { fetchLoanTypes } from "../../../services/loanTypeService";
import EmployeePicker from "../../../components/EmployeePicker";
import { loanStanding, monthlyInterestOf } from "../../../services/loanService";

const iso = (d) => (d ? String(d).slice(0, 10) : "");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* `loan` set means we are editing one that is already running. Two things change
 * in that mode: the employee is fixed (moving a loan to someone else is a new
 * loan, not an edit), and the installment and outstanding balance become
 * editable. Nadee asked for that second part directly - when a member of staff
 * resigns she has to recover the whole remaining balance in their final month,
 * which the principal-over-installments arithmetic will never produce. */
export default function EmployeeLoanForm({ closeForm, onSave, loan = null, saving = false }) {
  const editing = Boolean(loan);
  const [employees, setEmployees]   = useState([]);
  const [loanTypes, setLoanTypes]   = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({
    emp_id:             loan?.emp_id ?? "",
    loanTypeId:         loan?.loanTypeId ?? "",
    principal:          loan?.principal ?? "",
    installments:       loan?.installments ?? 12,
    startDate:          iso(loan?.startDate),
    monthlyInstallment: loan?.monthlyInstallment ?? "",
    // the balance from the installment schedule - the stored figure is never reduced
    remaining:          loan ? loanStanding(loan, todayIso()).outstanding : "",
  });
  // interest is set per loan: it starts from the loan type and can be changed here
  const [rate, setRate] = useState(loan ? String(loan.interestRate ?? 0) : "");
  /* Nadee thinks of interest as so much a month, so it can be typed either way:
   * as a rate, or as the monthly interest in rupees, which then fixes the total
   * exactly (a rate kept to 2 decimals would not). A saved loan opens in amount
   * mode when its total is not what its rate gives. */
  const savedByAmount = loan && Number(loan.totalPayable) !==
    Math.round(Number(loan.principal || 0) * (1 + (Number(loan.interestRate) || 0) / 100));
  const [interestMode, setInterestMode] = useState(savedByAmount ? "amount" : "rate");
  const [interestAmt, setInterestAmt]   = useState(loan ? String(monthlyInterestOf(loan)) : "");
  // an amount the user typed wins over the calculated one until they change the
  // principal, the count or the type, which is when the calculation is trusted again
  const [manual, setManual] = useState(editing);

  useEffect(() => {
    fetchActiveEmployees().then((d)  => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
    fetchLoanTypes().then((d) => setLoanTypes(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  // the type carries the interest rate, so it has to be resolved once the list arrives
  useEffect(() => {
    if (!loanTypes.length) return;
    setSelectedType(loanTypes.find((lt) => lt.id === +form.loanTypeId) ?? null);
  }, [loanTypes, form.loanTypeId]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const setRecalc = (f) => (e) => { setManual(false); setForm((p) => ({ ...p, [f]: e.target.value })); };

  const handleTypeChange = (e) => {
    setManual(false);
    const type = loanTypes.find((lt) => lt.id === +e.target.value) ?? null;
    setSelectedType(type);
    setRate(type ? String(Number(type.interestRate) || 0) : "");
    setInterestMode("rate");
    setForm((p) => ({ ...p, loanTypeId: e.target.value }));
  };

  const principal    = Number(form.principal) || 0;
  const count        = Number(form.installments) || 0;
  const typedRate    = rate !== "" ? Number(rate) || 0 : (selectedType ? Number(selectedType.interestRate) || 0 : 0);
  const totalPayable = !principal ? 0
    : interestMode === "amount" ? principal + Math.round(Number(interestAmt) || 0) * count
    : Math.round(principal * (1 + typedRate / 100));
  // the rate shown and saved: as typed, or what the monthly amount works out to
  const interest = interestMode === "amount"
    ? (principal > 0 ? Math.round(((totalPayable - principal) / principal) * 10000) / 100 : 0)
    : typedRate;
  // rounded down; the last installment picks up the rupees left over (see installmentFor)
  const calcMonthly  = totalPayable && form.installments ? Math.floor(totalPayable / form.installments) : 0;

  const monthly   = manual && form.monthlyInstallment !== "" ? Number(form.monthlyInstallment) : calcMonthly;
  const remaining = editing
    ? (manual && form.remaining !== "" ? Number(form.remaining) : totalPayable)
    : totalPayable;
  // the flat-rate split of each installment, shown so capital and interest are clear
  const monthlyInterest = form.installments > 0 ? Math.round((totalPayable - Number(form.principal || 0)) / form.installments) : 0;
  const lastInstallment = form.installments > 1
    ? Math.max(0, totalPayable - monthly * (form.installments - 1))
    : monthly;
  /* The payroll takes the monthly figure every month up to the last installment.
   * If those add up to more than is payable it keeps deducting after the loan is
   * repaid - 1122's Rs. 100,000 at 21,666 x 12 would have taken Rs. 238,326. */
  const overRecovers = count > 1 && monthly * (count - 1) > totalPayable;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.emp_id || saving) return;   // the picker is not a native input, so guard it here
    onSave({
      emp_id:             form.emp_id,
      loanTypeId:         form.loanTypeId,
      loanType:           selectedType?.name ?? loan?.loanType ?? "",
      principal:          form.principal,
      interestRate:       interest,
      totalPayable,
      installments:       form.installments,
      monthlyInstallment: monthly,
      remaining,
      startDate:          form.startDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{editing ? "Edit Loan" : "Grant Loan"}</h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="employee">Employee</CustomLabel>
            <EmployeePicker id="employee" employees={employees} disabled={editing}
              value={form.emp_id} onChange={set("emp_id")} />
            {editing && (
              <p className="text-xs text-gray-400">
                The employee cannot be changed. Close this loan and grant a new one instead.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="loanType">Loan Type</CustomLabel>
            <CustomSelect id="loanType" value={form.loanTypeId} onChange={handleTypeChange} required>
              <option value="">Select Loan Type</option>
              {loanTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </CustomSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="principal">Principal Amount (Rs.)</CustomLabel>
              <CustomInput id="principal" type="number" value={form.principal}
                onChange={setRecalc("principal")} placeholder="e.g. 100000" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="installments">No. of Installments</CustomLabel>
              <CustomInput id="installments" type="number" value={form.installments}
                onChange={setRecalc("installments")} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="interestRate">Interest Rate (%)</CustomLabel>
              <CustomInput id="interestRate" type="number" step="0.01" min="0"
                value={interestMode === "rate" ? rate : String(interest)}
                onChange={(e) => { setManual(false); setInterestMode("rate"); setRate(e.target.value); }} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="monthlyInterest">Monthly Interest (Rs.)</CustomLabel>
              <CustomInput id="monthlyInterest" type="number" step="1" min="0"
                value={interestMode === "amount" ? interestAmt
                  : String(count > 0 ? Math.round((totalPayable - principal) / count) : 0)}
                onChange={(e) => { setManual(false); setInterestMode("amount"); setInterestAmt(e.target.value); }} placeholder="0" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="startDate">Start Date</CustomLabel>
            <CustomInput id="startDate" type="date" value={form.startDate} onChange={set("startDate")} required />
          </div>

          {editing && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="col-span-2 text-xs text-amber-800 dark:text-amber-200">
                Adjust these when someone resigns and the balance has to come off their final
                salary. Leave them alone and they follow the principal.
              </p>
              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="monthlyInstallment">Monthly Installment (Rs.)</CustomLabel>
                <CustomInput id="monthlyInstallment" type="number" value={form.monthlyInstallment}
                  onChange={(e) => { setManual(true); set("monthlyInstallment")(e); }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <CustomLabel htmlFor="remaining">Outstanding (Rs.)</CustomLabel>
                <CustomInput id="remaining" type="number" value={form.remaining}
                  onChange={(e) => { setManual(true); set("remaining")(e); }} />
              </div>
            </div>
          )}

          {form.principal > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-500">Loan Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Interest Rate:</span>   <span className="font-semibold">{interest}%</span>
                <span className="text-gray-500">Total Payable:</span>   <span className="font-semibold text-purple-700">Rs. {totalPayable.toLocaleString()}</span>
                <span className="text-gray-500">Monthly Installment:</span> <span className="font-semibold text-green-700">Rs. {monthly.toLocaleString()}</span>
                <span className="text-gray-500">of which Interest:</span>
                <span className="font-semibold">Rs. {monthlyInterest.toLocaleString()} / month</span>
                <span className="text-gray-500">of which Capital:</span>
                <span className="font-semibold">Rs. {Math.max(0, monthly - monthlyInterest).toLocaleString()} / month</span>
                {!manual && lastInstallment !== monthly && (<>
                  <span className="text-gray-500">Last Installment:</span>
                  <span className="font-semibold text-green-700">Rs. {lastInstallment.toLocaleString()}</span>
                </>)}
                {editing && (<>
                  <span className="text-gray-500">Outstanding:</span>
                  <span className="font-semibold">Rs. {remaining.toLocaleString()}</span>
                </>)}
              </div>
            </div>
          )}
          {overRecovers && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
              <span className="font-semibold">These installments add up to more than the loan.</span>{" "}
              {count} × Rs. {monthly.toLocaleString()} is Rs. {(monthly * count).toLocaleString()}, but only
              Rs. {totalPayable.toLocaleString()} is payable — the payroll takes Rs. {monthly.toLocaleString()} every
              month until the last installment, so it would keep deducting after the loan is repaid. Correct the number
              of installments or the monthly amount; if this is a final settlement, close the loan once that month is paid.
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit" disabled={!form.emp_id || saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Grant Loan"}
            </CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
