import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Button,
  Badge,
} from "flowbite-react";
import { useState } from "react";
import { HiPlus, HiPencil } from "react-icons/hi";
import EmployeeForm from "./EmployeeForm";

const employees = [
  {
    id: 1,
    emp_id: "EMP-001",
    initial: "Mr.",
    firstName: "John",
    midName: "A.",
    surName: "Smith",
    nic: "901234567V",
    address: "123 Main St, Colombo",
    dob: "1990-05-15",
    title: "Software Engineer",
    designation: "Team Lead",
    dateOfJoining: "2020-01-10",
    position: "Software Engineer",
    level: "Senior",
    bank: "Bank of Ceylon",
    branch: "Colombo 03",
    accountNum: "1234567890",
  },
  {
    id: 2,
    emp_id: "EMP-002",
    initial: "Ms.",
    firstName: "Sarah",
    midName: "",
    surName: "Johnson",
    nic: "881234567V",
    address: "45 Lake Rd, Kandy",
    dob: "1988-09-22",
    title: "HR Manager",
    designation: "HR Head",
    dateOfJoining: "2019-03-01",
    position: "HR Manager",
    level: "Manager",
    bank: "Peoples Bank",
    branch: "Kandy",
    accountNum: "9876543210",
  },
  {
    id: 3,
    emp_id: "EMP-003",
    initial: "Dr.",
    firstName: "James",
    midName: "R.",
    surName: "Perera",
    nic: "850987654V",
    address: "78 Hill Street, Galle",
    dob: "1985-12-03",
    title: "Business Analyst",
    designation: "Senior Analyst",
    dateOfJoining: "2021-06-15",
    position: "Business Analyst",
    level: "Lead",
    bank: "Commercial Bank",
    branch: "Galle",
    accountNum: "1122334455",
  },
];

export function EmployeeTable() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Employees
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and organize your employee records
          </p>
        </div>
        <Button onClick={() => setOpenModal(true)} color="purple">
          <HiPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">

        {/* Table */}
        <div className="overflow-x-auto">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell className="w-10">#</TableHeadCell>
                <TableHeadCell>Emp ID</TableHeadCell>
                <TableHeadCell>Full Name</TableHeadCell>
                <TableHeadCell>NIC</TableHeadCell>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Designation</TableHeadCell>
                <TableHeadCell>Position</TableHeadCell>
                <TableHeadCell>Level</TableHeadCell>
                <TableHeadCell>Date of Joining</TableHeadCell>
                <TableHeadCell className="text-center">Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {employees.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <TableCell className="text-sm text-gray-400">{emp.id}</TableCell>
                  <TableCell className="font-medium text-gray-700 dark:text-gray-200">
                    {emp.emp_id}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                    {emp.initial} {emp.firstName} {emp.midName} {emp.surName}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {emp.nic}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {emp.title}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {emp.designation}
                  </TableCell>
                  <TableCell>
                    <Badge color="purple" className="w-fit px-2 py-0.5 text-xs font-medium">
                      {emp.position}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="indigo" className="w-fit px-2 py-0.5 text-xs font-medium">
                      {emp.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {emp.dateOfJoining}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="xs" color="blue" outline pill>
                        <HiPencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-white">{employees.length}</span> entries
          </span>
          <span className="text-xs text-gray-400">Employee Management</span>
        </div>

      </div>

      {openModal && <EmployeeForm closeForm={() => setOpenModal(false)} />}
    </div>
  );
}
