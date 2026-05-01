import { useState, useEffect } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import BankAccountForm from "./BankAccountForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from "../../../services/bankAccountService";

export default function BankAccounts() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]       = useState("");
  const [filterEmp, setFilterEmp] = useState("all");

  const load = async () => {
    setLoading(true);
    try { setAccounts(Array.isArray(await fetchBankAccounts()) ? await fetchBankAccounts() : []); }
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
    if (!window.confirm("Delete this bank account?")) return;
    try { await deleteBankAccount(id); load(); } catch (err) { console.error(err); }
  };

  const empIds   = [...new Set(accounts.map((b) => b.emp_id))];
  const filtered = accounts.filter((b) => {
    const matchSearch = b.accountNum?.includes(search) || b.emp_id?.toLowerCase().includes(search.toLowerCase());
    const matchEmp    = filterEmp === "all" || b.emp_id === filterEmp;
    return matchSearch && matchEmp;
  });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bank Accounts</h1>
            <p className="mt-1 text-sm text-gray-500">Manage employee bank accounts and salary split configurations</p>
          </div>
          <CustomButton color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Add Account
          </CustomButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CustomInput icon={HiSearch} placeholder="Search by emp ID or account..." sizing="sm" className="w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <CustomSelect sizing="sm" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
            <option value="all">All Employees</option>
            {empIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </CustomSelect>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee ID</CustomTableHeadCell>
                  <CustomTableHeadCell>Bank</CustomTableHeadCell>
                  <CustomTableHeadCell>Branch</CustomTableHeadCell>
                  <CustomTableHeadCell>Account No.</CustomTableHeadCell>
                  <CustomTableHeadCell>Split Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Split Value</CustomTableHeadCell>
                  <CustomTableHeadCell>Default</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <CustomTableRow><CustomTableCell colSpan={8} className="py-8 text-center text-sm text-gray-400">Loading…</CustomTableCell></CustomTableRow>
                ) : filtered.map((b) => (
                  <CustomTableRow key={b.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="font-mono text-sm text-purple-500">{b.emp_id}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{b.bank}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{b.branch}</CustomTableCell>
                    <CustomTableCell className="font-mono text-sm text-gray-700 dark:text-gray-200">{b.accountNum}</CustomTableCell>
                    <CustomTableCell><StatusBadge color="indigo" className="w-fit text-xs">{b.splitType}</StatusBadge></CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{b.splitValue}{b.splitType === "Percentage" ? "%" : " Rs."}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={b.isDefault ? "success" : "gray"} className="w-fit text-xs">
                        {b.isDefault ? "Default" : "Secondary"}
                      </StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(b); setShowForm(true); }}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill onClick={() => handleDelete(b.id)}>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <CustomTableRow><CustomTableCell colSpan={8} className="py-8 text-center text-sm text-gray-400">No bank accounts found.</CustomTableCell></CustomTableRow>
                )}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>
      {showForm && <BankAccountForm closeForm={() => { setShowForm(false); setEditData(null); }} initialData={editData} onSave={handleSave} />}
    </Layout>
  );
}
