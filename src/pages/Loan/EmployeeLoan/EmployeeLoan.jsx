import { useState, useEffect, useMemo, useRef } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { Progress } from "flowbite-react";
import { HiPlus, HiX, HiPencil, HiSearch } from "react-icons/hi";
import EmployeeLoanForm from "./EmployeeLoanForm";
import { fetchOpenPayrollMonth } from "../../../services/payrollRunService";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton, CustomInput, CustomSelect } from "../../../components/FormFields";
import {
  fetchLoans, createLoan, updateLoan, closeLoan,
  installmentFor, loanStanding, loanMonths, monthlyInterestOf,
} from "../../../services/loanService";
import { notify, confirmDialog } from "../../../ui/feedback";

const statusColor = { Active: "warning", Upcoming: "indigo", Completed: "success", Closed: "gray" };
const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const monthLabel = (ym) => {
  const [y, m] = String(ym).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
};

export default function EmployeeLoan() {
  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);   // the loan being edited, null when granting
  const [saving, setSaving]     = useState(false);
  const [query, setQuery]       = useState("");
  const [type, setType]         = useState("all");
  /* Salary advances are a one-month loan each, re-dated every month for whoever
   * takes one, and nothing showed which month a loan was for. So the list opens
   * on what is being recovered this month; "All months" shows everything. */
  const [scope, setScope]       = useState("month");
  const [inMonth, setInMonth]   = useState(() => today().slice(0, 7));
  /* The payroll month still open - October's is finished in November, so going by
   * the calendar showed November's (empty) advances. Everything on this page is
   * measured against it: recovered means recovered in a month already paid. */
  const [payMonth, setPayMonth] = useState(() => today().slice(0, 7));
  const [error, setError]       = useState("");
  const touchedMonth = useRef(false);
  useEffect(() => {
    fetchOpenPayrollMonth().then((m) => {
      if (!m) return;
      setPayMonth(m);
      if (!touchedMonth.current) setInMonth(m);
    }).catch(console.error);
  }, []);

  const load = async () => {
    setLoading(true);
    try { const d = await fetchLoans(); setLoans(Array.isArray(d) ? d : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    // one save at a time - a double click on Grant Loan gave emp 789 the same
    // insurance loan twice, 0.24 seconds apart
    if (saving) return;
    setSaving(true); setError("");
    try {
      if (editing) await updateLoan(editing.id, data);
      else await createLoan(data);
      closeDialog();
      load();
    } catch (err) {
      console.error(err);
      setError("The loan could not be saved — nothing was changed. Please try again.");
    }
    finally { setSaving(false); }
  };

  const openEdit = (l) => { setEditing(l); setShowForm(true); };
  const closeDialog = () => { setShowForm(false); setEditing(null); };

  const handleClose = async (id) => {
    if (!(await confirmDialog({ title: "Close this loan?", message: "No further installments will be deducted from payroll for it.", confirmLabel: "Close loan", tone: "danger" }))) return;
    try { await closeLoan(id); notify.success("Loan closed."); load(); } catch (err) { console.error(err); notify.error(err.userMessage || "That didn't work. Please try again."); }
  };

  // where each loan stands at the start of the open payroll month, from its
  // schedule - the stored balance never moves
  const asOf = `${payMonth}-01`;
  const standing = useMemo(
    () => Object.fromEntries(loans.map((l) => [l.id, loanStanding(l, asOf)])), [loans, asOf]);
  const thisMonth = payMonth;
  const active = loans.filter((l) => ["Active", "Upcoming"].includes(standing[l.id]?.state));

  // the EPF number is what Nadee works from, so it is both the search and the order
  // 16 insurance premiums and ~45 festival advances share one list, so it is
  // filtered by loan type as well as by EPF number or name
  const types = useMemo(
    () => [...new Set(loans.map((l) => l.loanType).filter(Boolean))].sort(), [loans]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loans
      // a number is an EPF number, matched whole - 327 must not also find 1327
      .filter((l) => !q || (/^\d+$/.test(q)
        ? String(l.emp_id) === q
        : String(l.empName || "").toLowerCase().includes(q)))
      .filter((l) => type === "all" || l.loanType === type)
      .filter((l) => scope === "all" || (l.status !== "Closed" && inMonth && installmentFor(l, inMonth) > 0))
      .sort((a, b) => (Number(a.emp_id) - Number(b.emp_id)) || (a.id - b.id));
  }, [loans, query, type, scope, inMonth]);

  // what each kind of loan recovers this month, so insurance can be checked
  // against the insurer's list and festival advances against the register
  const byType = Object.values(active.reduce((acc, l) => {
    const k = l.loanType || "Other";
    acc[k] ??= { type: k, count: 0, monthly: 0, outstanding: 0 };
    acc[k].count += 1;
    acc[k].monthly += installmentFor(l, thisMonth);
    acc[k].outstanding += standing[l.id].outstanding;
    return acc;
  }, {})).sort((a, b) => b.monthly - a.monthly);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Loans</h1>
            <p className="mt-1 text-sm text-gray-500">Grant loans, track installments and manage balances</p>
          </div>
          <CustomButton perm="loans.edit" color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Grant Loan
          </CustomButton>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Active Loans",      value: active.length, color: "text-orange-600" },
            { label: "Total Outstanding", value: `Rs. ${active.reduce((s, l) => s + standing[l.id].outstanding, 0).toLocaleString()}`, color: "text-red-600" },
            { label: `Recovery in ${monthLabel(thisMonth)}`, value: `Rs. ${active.reduce((s, l) => s + installmentFor(l, thisMonth), 0).toLocaleString()}`, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {byType.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Active loans by type</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {byType.map((t) => (
                <div key={t.type} className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-900/40">
                  <p className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{t.type}</p>
                  <p className="mt-1 text-xs text-gray-500">{t.count} staff · Rs. {t.monthly.toLocaleString()} this month</p>
                  <p className="text-xs text-gray-400">Rs. {t.outstanding.toLocaleString()} outstanding</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div className="w-full sm:w-72">
              <CustomInput icon={HiSearch} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by EPF number or name…" />
            </div>
            <div className="w-full sm:w-64">
              <CustomSelect value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All Loan Types</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </CustomSelect>
            </div>
            <div className="w-52">
              <CustomSelect value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="month">Recovering in…</option>
                <option value="all">All months</option>
              </CustomSelect>
            </div>
            {scope === "month" && (
              <input type="month" value={inMonth} onChange={(e) => { touchedMonth.current = true; setInMonth(e.target.value); }}
                aria-label="Recovery month"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
            )}
            <span className="text-xs text-gray-400">{shown.length} of {loans.length}</span>
          </div>
          <div className="table-viewport">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>EPF No</CustomTableHeadCell>
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Loan Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Month(s)</CustomTableHeadCell>
                  <CustomTableHeadCell>Principal</CustomTableHeadCell>
                  <CustomTableHeadCell>Interest</CustomTableHeadCell>
                  <CustomTableHeadCell>Total Payable</CustomTableHeadCell>
                  <CustomTableHeadCell>Monthly</CustomTableHeadCell>
                  <CustomTableHeadCell>Monthly Interest</CustomTableHeadCell>
                  <CustomTableHeadCell>Progress</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={12} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : shown.map((l) => {
                  const total = Number(l.totalPayable);
                  const st    = standing[l.id];
                  return (
                    <CustomTableRow key={l.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      <CustomTableCell className="font-mono text-sm text-purple-500">{l.emp_id}</CustomTableCell>
                      <CustomTableCell className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{l.empName}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{l.loanType}</CustomTableCell>
                      <CustomTableCell className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{loanMonths(l) || "—"}</CustomTableCell>
                      <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rs. {Number(l.principal).toLocaleString()}</CustomTableCell>
                      <CustomTableCell><StatusBadge color={Number(l.interestRate) === 0 ? "success" : "warning"} className="w-fit text-xs">{l.interestRate}%</StatusBadge></CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">Rs. {total.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">Rs. {Number(l.monthlyInstallment).toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">Rs. {monthlyInterestOf(l).toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="min-w-[140px]">
                        <Progress progress={st.paidPct} size="sm" color="purple" />
                        <p className="mt-1 text-xs text-gray-400">{st.paidPct}% paid · Rs. {st.outstanding.toLocaleString()} left</p>
                        {/* the payroll takes the monthly figure until the last installment -
                            more than the loan, and it keeps deducting after it is repaid */}
                        {st.state !== "Closed" && Number(l.installments) > 1 &&
                          Number(l.monthlyInstallment) * (Number(l.installments) - 1) > total && (
                          <p className="mt-0.5 text-xs font-semibold text-red-600"
                            title={`${l.installments} × Rs. ${Number(l.monthlyInstallment).toLocaleString()} is more than the Rs. ${total.toLocaleString()} payable`}>
                            Installments exceed the loan — check
                          </p>
                        )}
                      </CustomTableCell>
                      <CustomTableCell><StatusBadge color={statusColor[st.state]} className="w-fit text-xs">{st.state}</StatusBadge></CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-2">
                          {l.status === "Active" && (<>
                            <CustomButton perm="loans.edit" size="xs" color="purple" outline pill title="Edit Loan" onClick={() => openEdit(l)}>
                              <HiPencil className="h-3.5 w-3.5" />
                            </CustomButton>
                            <CustomButton perm="loans.close" size="xs" color="failure" outline pill title="Close Loan" onClick={() => handleClose(l.id)}>
                              <HiX className="h-3.5 w-3.5" />
                            </CustomButton>
                          </>)}
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  );
                })}
                {!loading && shown.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={12} className="py-8 text-center text-sm text-gray-400">
                    {scope === "month" && !query && type === "all"
                      ? `Nothing is being recovered in ${inMonth ? monthLabel(inMonth) : "that month"}. Choose "All months" to see every loan.`
                      : query || type !== "all" || scope === "month" ? "No loan matches this search." : "No loans found."}
                  </CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && (
        <EmployeeLoanForm key={editing?.id ?? "new"} loan={editing}
          closeForm={() => { closeDialog(); setError(""); }} onSave={handleSave} saving={saving} saveError={error} />
      )}
    </Layout>
  );
}
