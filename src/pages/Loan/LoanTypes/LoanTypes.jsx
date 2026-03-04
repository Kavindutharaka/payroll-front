import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import LoanTypeForm from "./LoanTypeForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const loanTypes = [
  { id: 1, name: "Staff Loan",       interestRate: 0,   maxAmount: 500000,  installmentMethod: "Equal Monthly", linkedComponent: "Loan Installment" },
  { id: 2, name: "Festival Advance", interestRate: 0,   maxAmount: 50000,   installmentMethod: "Lump Sum",       linkedComponent: "Salary Advance Deduction" },
  { id: 3, name: "Vehicle Loan",     interestRate: 8,   maxAmount: 1500000, installmentMethod: "Equal Monthly", linkedComponent: "Loan Installment" },
  { id: 4, name: "Education Loan",   interestRate: 5,   maxAmount: 200000,  installmentMethod: "Equal Monthly", linkedComponent: "Loan Installment" },
];

export default function LoanTypes() {
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Loan Types</h1>
            <p className="mt-1 text-sm text-gray-500">Configure loan products with interest rates and installment methods</p>
          </div>
          <CustomButton color="purple" onClick={() => { setEditData(null); setShowForm(true); }}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Loan Type
          </CustomButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>#</CustomTableHeadCell>
                  <CustomTableHeadCell>Loan Name</CustomTableHeadCell>
                  <CustomTableHeadCell>Interest Rate</CustomTableHeadCell>
                  <CustomTableHeadCell>Max Amount</CustomTableHeadCell>
                  <CustomTableHeadCell>Installment Method</CustomTableHeadCell>
                  <CustomTableHeadCell>Linked Component</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loanTypes.map((lt) => (
                  <CustomTableRow key={lt.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell className="text-sm text-gray-400">{lt.id}</CustomTableCell>
                    <CustomTableCell className="text-sm font-medium text-gray-800 dark:text-gray-200">{lt.name}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={lt.interestRate === 0 ? "success" : "warning"} className="w-fit text-xs">
                        {lt.interestRate}%
                      </StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Rs. {lt.maxAmount.toLocaleString()}
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{lt.installmentMethod}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="indigo" className="w-fit text-xs">{lt.linkedComponent}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell>
                      <div className="flex justify-center gap-2">
                        <CustomButton size="xs" color="blue" outline pill onClick={() => { setEditData(lt); setShowForm(true); }}>
                          <HiPencil className="h-3.5 w-3.5" />
                        </CustomButton>
                        <CustomButton size="xs" color="failure" outline pill>
                          <HiTrash className="h-3.5 w-3.5" />
                        </CustomButton>
                      </div>
                    </CustomTableCell>
                  </CustomTableRow>
                ))}
              </CustomTableBody>
            </CustomTable>
          </div>
        </div>
      </div>

      {showForm && (
        <LoanTypeForm
          closeForm={() => { setShowForm(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </Layout>
  );
}
