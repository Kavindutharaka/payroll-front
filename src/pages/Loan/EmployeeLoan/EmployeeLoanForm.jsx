import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import { CustomLabel, CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { fetchEmployees } from "../../../services/employeeService";
import { fetchLoanTypes } from "../../../services/loanTypeService";

export default function EmployeeLoanForm({ closeForm, onSave }) {
  const [employees, setEmployees]   = useState([]);
  const [loanTypes, setLoanTypes]   = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ emp_id: "", loanTypeId: "", principal: "", installments: 12, startDate: "" });

  useEffect(() => {
    fetchEmployees().then((d)  => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
    fetchLoanTypes().then((d) => setLoanTypes(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleTypeChange = (e) => {
    const found = loanTypes.find((lt) => lt.id === +e.target.value);
    setSelectedType(found ?? null);
    setForm((p) => ({ ...p, loanTypeId: e.target.value }));
  };

  const interest     = selectedType ? Number(selectedType.interestRate) : 0;
  const totalPayable = form.principal ? Math.round(+form.principal * (1 + interest / 100)) : 0;
  const monthly      = totalPayable && form.installments ? Math.round(totalPayable / form.installments) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      emp_id:             form.emp_id,
      loanTypeId:         form.loanTypeId,
      loanType:           selectedType?.name ?? "",
      principal:          form.principal,
      interestRate:       interest,
      totalPayable,
      installments:       form.installments,
      monthlyInstallment: monthly,
      startDate:          form.startDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Grant Loan</h3>
          <button type="button" onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 hover:bg-purple-500 hover:text-white">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="employee">Employee</CustomLabel>
            <CustomSelect id="employee" value={form.emp_id} onChange={set("emp_id")} required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.emp_id} value={e.emp_id}>{e.initial} {e.firstName} {e.surName} ({e.emp_id})</option>
              ))}
            </CustomSelect>
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
                onChange={set("principal")} placeholder="e.g. 100000" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <CustomLabel htmlFor="installments">No. of Installments</CustomLabel>
              <CustomInput id="installments" type="number" value={form.installments}
                onChange={set("installments")} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <CustomLabel htmlFor="startDate">Start Date</CustomLabel>
            <CustomInput id="startDate" type="date" value={form.startDate} onChange={set("startDate")} required />
          </div>
          {form.principal > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-500">Loan Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Interest Rate:</span>   <span className="font-semibold">{interest}%</span>
                <span className="text-gray-500">Total Payable:</span>   <span className="font-semibold text-purple-700">Rs. {totalPayable.toLocaleString()}</span>
                <span className="text-gray-500">Monthly Installment:</span> <span className="font-semibold text-green-700">Rs. {monthly.toLocaleString()}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CustomButton color="gray" type="button" onClick={closeForm}>Cancel</CustomButton>
            <CustomButton color="purple" type="submit">Grant Loan</CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
}
