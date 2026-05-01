import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { Progress } from "flowbite-react";
import { HiPlus, HiX } from "react-icons/hi";
import EmployeeLoanForm from "./EmployeeLoanForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";
import { fetchLoans, createLoan, closeLoan } from "../../../services/loanService";

const statusColor = { Active: "warning", Closed: "success" };

export default function EmployeeLoan() {
  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setLoans(Array.isArray(await fetchLoans()) ? await fetchLoans() : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    try { await createLoan(data); setShowForm(false); load(); }
    catch (err) { console.error(err); }
  };

  const handleClose = async (id) => {
    if (!window.confirm("Close this loan?")) return;
    try { await closeLoan(id); load(); } catch (err) { console.error(err); }
  };

  const active = loans.filter((l) => l.status === "Active");

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Loans</h1>
            <p className="mt-1 text-sm text-gray-500">Grant loans, track installments and manage balances</p>
          </div>
          <CustomButton color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Grant Loan
          </CustomButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Active Loans",      value: active.length, color: "text-orange-600" },
            { label: "Total Outstanding", value: `Rs. ${active.reduce((s, l) => s + Number(l.remaining), 0).toLocaleString()}`, color: "text-red-600" },
            { label: "Monthly Recovery",  value: `Rs. ${active.reduce((s, l) => s + Number(l.monthlyInstallment), 0).toLocaleString()}`, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee ID</CustomTableHeadCell>
                  <CustomTableHeadCell>Loan Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Principal</CustomTableHeadCell>
                  <CustomTableHeadCell>Interest</CustomTableHeadCell>
                  <CustomTableHeadCell>Total Payable</CustomTableHeadCell>
                  <CustomTableHeadCell>Monthly</CustomTableHeadCell>
                  <CustomTableHeadCell>Progress</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={9} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : loans.map((l) => {
                  const total    = Number(l.totalPayable);
                  const remain   = Number(l.remaining);
                  const paidPct  = total > 0 ? Math.round(((total - remain) / total) * 100) : 0;
                  return (
                    <CustomTableRow key={l.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                      <CustomTableCell className="font-mono text-sm text-purple-500">{l.emp_id}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{l.loanType}</CustomTableCell>
                      <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rs. {Number(l.principal).toLocaleString()}</CustomTableCell>
                      <CustomTableCell><StatusBadge color={l.interestRate == 0 ? "success" : "warning"} className="w-fit text-xs">{l.interestRate}%</StatusBadge></CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">Rs. {total.toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="text-sm text-gray-700 dark:text-gray-200">Rs. {Number(l.monthlyInstallment).toLocaleString()}</CustomTableCell>
                      <CustomTableCell className="min-w-[140px]">
                        <Progress progress={paidPct} size="sm" color="purple" />
                        <p className="mt-1 text-xs text-gray-400">{paidPct}% paid</p>
                      </CustomTableCell>
                      <CustomTableCell><StatusBadge color={statusColor[l.status]} className="w-fit text-xs">{l.status}</StatusBadge></CustomTableCell>
                      <CustomTableCell>
                        <div className="flex justify-center gap-2">
                          {l.status === "Active" && (
                            <CustomButton size="xs" color="failure" outline pill title="Close Loan" onClick={() => handleClose(l.id)}>
                              <HiX className="h-3.5 w-3.5" />
                            </CustomButton>
                          )}
                        </div>
                      </CustomTableCell>
                    </CustomTableRow>
                  );
                })}
                {!loading && loans.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={9} className="py-8 text-center text-sm text-gray-400">No loans found.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && <EmployeeLoanForm closeForm={() => setShowForm(false)} onSave={handleSave} />}
    </Layout>
  );
}
