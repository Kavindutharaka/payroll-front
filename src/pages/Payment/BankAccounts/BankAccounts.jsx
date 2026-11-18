import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiSearch } from "react-icons/hi";
import BankAccountForm from "./BankAccountForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import DataTable, { RowActions } from "../../../ui/DataTable";
import { fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from "../../../services/bankAccountService";
import { notify, confirmDialog } from "../../../ui/feedback";

export default function BankAccounts() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filterEmp, setFilterEmp] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const data = await fetchBankAccounts(); setAccounts(Array.isArray(data) ? data : []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    try {
      if (editData) await updateBankAccount(editData.id, form);
      else          await createBankAccount(form);
      setShowForm(false); setEditData(null); load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!(await confirmDialog({ title: "Delete this bank account?", message: "Salary will no longer be paid into this account.", confirmLabel: "Delete account", tone: "danger" }))) return;
    try { await deleteBankAccount(id); notify.success("Bank account deleted."); load(); } catch (err) { console.error(err); notify.error(err.userMessage || "That didn't work. Please try again."); }
  };

  const empIds   = [...new Set(accounts.map((b) => b.emp_id))];
  const filtered = accounts.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || b.accountNum?.includes(search)
      || b.emp_id?.toLowerCase().includes(q)
      || b.empName?.toLowerCase().includes(q)
      || b.bank?.toLowerCase().includes(q);
    const matchEmp    = filterEmp === "all" || b.emp_id === filterEmp;
    return matchSearch && matchEmp;
  });

  const columns = [
    { key: "employee", label: "Employee", always: true, card: "title",
      render: (b) => (
        <div className="min-w-[11rem]">
          <div className="font-medium text-gray-800 dark:text-gray-100">{b.empName || "—"}</div>
          <div className="font-mono text-xs text-purple-600 dark:text-purple-400">EPF {b.emp_id}</div>
        </div>
      ) },
    { key: "accountName", label: "Account Name", render: (b) => b.accountName || "—" },
    { key: "accountNo", label: "Account No.", card: true, render: (b) => <span className="font-mono">{b.accountNum || "—"}</span> },
    { key: "bank", label: "Bank", card: "subtitle", render: (b) => b.bank || "—" },
    { key: "branch", label: "Branch", render: (b) => b.branch || "—" },
    { key: "codes", label: "Bank / Branch Code",
      render: (b) => <span className="font-mono text-xs text-gray-500">{b.bankCode || "—"} / {b.branchCode || "—"}</span> },
    { key: "split", label: "Split", align: "right", card: true,
      render: (b) => (b.splitType === "Percentage" ? `${b.splitValue}%` : `Rs. ${Number(b.splitValue || 0).toLocaleString()}`) },
    { key: "status", label: "Default", card: "badge",
      render: (b) => <StatusBadge color={b.isDefault ? "success" : "gray"} className="w-fit text-xs">{b.isDefault ? "Default" : "Secondary"}</StatusBadge> },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bank Accounts</h1>
            <p className="mt-1 text-sm text-gray-500">Manage employee bank accounts and salary split configurations</p>
          </div>
          <CustomButton perm="payment.edit" color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Add Account
          </CustomButton>
        </div>
        <DataTable
          id="bankAccounts"
          columns={columns}
          rows={filtered}
          loading={loading}
          empty={accounts.length ? "No account matches this search." : "No bank accounts yet."}
          toolbar={(
            <>
              <CustomInput icon={HiSearch} placeholder="Search by name, EPF no., bank or account" sizing="sm" className="w-full sm:w-72"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <CustomSelect sizing="sm" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
                <option value="all">All Employees</option>
                {empIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </CustomSelect>
            </>
          )}
          actions={(b, { inPanel } = {}) => (
            <RowActions inPanel={inPanel} editPerm="payment.edit" deletePerm="payment.delete"
              onEdit={() => { setEditData(b); setShowForm(true); }} onDelete={() => handleDelete(b.id)} />
          )}
          detail={{
            title: (b) => b.empName || b.emp_id,
            subtitle: (b) => `EPF ${b.emp_id}`,
          }}
          footer={(
            <span>
              Showing <span className="font-semibold text-gray-700 dark:text-white">{filtered.length}</span> of{" "}
              <span className="font-semibold text-gray-700 dark:text-white">{accounts.length}</span> accounts
            </span>
          )}
        />
      </div>
      {showForm && <BankAccountForm closeForm={() => { setShowForm(false); setEditData(null); }} initialData={editData} onSave={handleSave} />}
    </Layout>
  );
}
