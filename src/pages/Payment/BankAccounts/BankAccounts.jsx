import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import BankAccountForm from "./BankAccountForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const bankAccounts = [
  { id: 1, emp_id: "EMP-001", name: "Mr. John A. Smith",   bank: "Bank of Ceylon",   branch: "Colombo 03", accountNum: "1234567890", priority: 1, splitType: "100%",    isDefault: true  },
  { id: 2, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   bank: "Peoples Bank",     branch: "Kandy",       accountNum: "9876543210", priority: 1, splitType: "100%",    isDefault: true  },
  { id: 3, emp_id: "EMP-003", name: "Dr. James R. Perera", bank: "Commercial Bank",  branch: "Galle",       accountNum: "1122334455", priority: 1, splitType: "70%",     isDefault: true  },
  { id: 4, emp_id: "EMP-003", name: "Dr. James R. Perera", bank: "Bank of Ceylon",   branch: "Galle",       accountNum: "5566778800", priority: 2, splitType: "30%",     isDefault: false },
  { id: 5, emp_id: "EMP-004", name: "Ms. Nadia Fernando",  bank: "HNB",              branch: "Negombo",     accountNum: "5566778899", priority: 1, splitType: "100%",    isDefault: true  },
];

export default function BankAccounts() {
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState("");
  const [filterEmp, setFilterEmp] = useState("all");

  const empIds = [...new Set(bankAccounts.map((b) => b.emp_id))];
  const filtered = bankAccounts.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.accountNum.includes(search);
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
          <CustomButton color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Add Account
          </CustomButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CustomInput icon={HiSearch} placeholder="Search by name or account..." sizing="sm" className="w-64"
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
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Bank</CustomTableHeadCell>
                  <CustomTableHeadCell>Branch</CustomTableHeadCell>
                  <CustomTableHeadCell>Account No.</CustomTableHeadCell>
                  <CustomTableHeadCell>Priority</CustomTableHeadCell>
                  <CustomTableHeadCell>Split</CustomTableHeadCell>
                  <CustomTableHeadCell>Default</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((b) => (
                  <CustomTableRow key={b.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.name}</p>
                      <p className="font-mono text-xs text-purple-500">{b.emp_id}</p>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{b.bank}</CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{b.branch}</CustomTableCell>
                    <CustomTableCell className="font-mono text-sm text-gray-700 dark:text-gray-200">{b.accountNum}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="indigo" className="w-fit text-xs">#{b.priority}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="purple" className="w-fit text-xs">{b.splitType}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={b.isDefault ? "success" : "gray"} className="w-fit text-xs">
                        {b.isDefault ? "Default" : "Secondary"}
                      </StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill><HiPencil className="h-3.5 w-3.5" /></CustomButton>
                        <CustomButton size="xs" color="failure" outline pill><HiTrash className="h-3.5 w-3.5" /></CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>

      {showForm && <BankAccountForm closeForm={() => setShowForm(false)} />}
    </Layout>
  );
}
