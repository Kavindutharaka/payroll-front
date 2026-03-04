import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import Layout from "../../../components/Layout";import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import StandingOrderForm from "./StandingOrderForm";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";
import { CustomButton } from "../../../components/FormFields";

const standingOrders = [
  { id: 1, emp_id: "EMP-002", name: "Ms. Sarah Johnson",   description: "Housing Loan - BOC",        amount: "Rs. 25,000", type: "Fixed",      effectiveFrom: "2025-01-01", status: "Active" },
  { id: 2, emp_id: "EMP-003", name: "Dr. James R. Perera", description: "Savings Transfer - NSB",    amount: "10%",        type: "Percentage", effectiveFrom: "2024-06-01", status: "Active" },
  { id: 3, emp_id: "EMP-001", name: "Mr. John A. Smith",   description: "Insurance Premium - Ceylinco", amount: "Rs. 5,000", type: "Fixed",     effectiveFrom: "2023-03-01", status: "Active" },
];

export default function StandingOrders() {
  const [showForm, setShowForm] = useState(false);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Standing Orders</h1>
            <p className="mt-1 text-sm text-gray-500">Configure recurring fixed or percentage-based salary transfers</p>
          </div>
          <CustomButton color="purple" onClick={() => setShowForm(true)}>
            <HiPlus className="mr-2 h-4 w-4" /> Create Standing Order
          </CustomButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <CustomTable hoverable>
              <CustomTableHead>
                <CustomTableRow>
                  <CustomTableHeadCell>Employee</CustomTableHeadCell>
                  <CustomTableHeadCell>Description</CustomTableHeadCell>
                  <CustomTableHeadCell>Amount / Rate</CustomTableHeadCell>
                  <CustomTableHeadCell>Type</CustomTableHeadCell>
                  <CustomTableHeadCell>Effective From</CustomTableHeadCell>
                  <CustomTableHeadCell>Status</CustomTableHeadCell>
                  <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
                </CustomTableRow>
              </CustomTableHead>
              <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
                {standingOrders.map((so) => (
                  <CustomTableRow key={so.id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <CustomTableCell>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{so.name}</p>
                      <p className="font-mono text-xs text-purple-500">{so.emp_id}</p>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{so.description}</CustomTableCell>
                    <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">{so.amount}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color={so.type === "Fixed" ? "indigo" : "purple"} className="w-fit text-xs">{so.type}</StatusBadge>
                    </CustomTableCell>
                    <CustomTableCell className="text-sm text-gray-500">{so.effectiveFrom}</CustomTableCell>
                    <CustomTableCell>
                      <StatusBadge color="success" className="w-fit text-xs">{so.status}</StatusBadge>
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

      {showForm && <StandingOrderForm closeForm={() => setShowForm(false)} />}
    </Layout>
  );
}
