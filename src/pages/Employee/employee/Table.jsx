import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { HiPlus, HiPencil, HiTrash, HiSearch } from "react-icons/hi";
import EmployeeForm from "./EmployeeForm";
import { CustomInput, CustomSelect, CustomButton } from "../../../components/FormFields";
import { CustomTable, CustomTableHead, CustomTableBody, CustomTableHeadCell, CustomTableRow, CustomTableCell } from "../../../components/CustomTable";

const employees = [
  {
    id: 1, emp_id: "EMP-001", initial: "Mr.", firstName: "John", midName: "A.", surName: "Smith",
    nic: "901234567V", dob: "1990-05-15", address: "123 Main St, Colombo",
    title: "Software Engineer", designation: "Team Lead", dateOfJoining: "2020-01-10",
    position: "Software Engineer", level: "Senior",
    category: "Non-Academic", employmentType: "Permanent",
    basicSalary: 85000, taxMode: "Mode 1", epfEtf: true, status: "Active",
    bank: "Bank of Ceylon", branch: "Colombo 03", accountNum: "1234567890",
  },
  {
    id: 2, emp_id: "EMP-002", initial: "Ms.", firstName: "Sarah", midName: "", surName: "Johnson",
    nic: "881234567V", dob: "1988-09-22", address: "45 Lake Rd, Kandy",
    title: "HR Manager", designation: "HR Head", dateOfJoining: "2019-03-01",
    position: "HR Manager", level: "Manager",
    category: "Non-Academic", employmentType: "Permanent",
    basicSalary: 95000, taxMode: "Mode 1", epfEtf: true, status: "Active",
    bank: "Peoples Bank", branch: "Kandy", accountNum: "9876543210",
  },
  {
    id: 3, emp_id: "EMP-003", initial: "Dr.", firstName: "James", midName: "R.", surName: "Perera",
    nic: "850987654V", dob: "1985-12-03", address: "78 Hill Street, Galle",
    title: "Senior Lecturer", designation: "HoD", dateOfJoining: "2021-06-15",
    position: "Lecturer", level: "Lead",
    category: "Academic", employmentType: "Permanent",
    basicSalary: 120000, taxMode: "Mode 2", epfEtf: true, status: "Active",
    bank: "Commercial Bank", branch: "Galle", accountNum: "1122334455",
  },
  {
    id: 4, emp_id: "EMP-004", initial: "Ms.", firstName: "Nadia", midName: "", surName: "Fernando",
    nic: "952345678V", dob: "1995-04-11", address: "22 Beach Rd, Negombo",
    title: "Teaching Assistant", designation: "Demonstrator", dateOfJoining: "2023-01-02",
    position: "Instructor", level: "Junior",
    category: "Academic", employmentType: "Temporary",
    basicSalary: 45000, taxMode: "No Tax", epfEtf: false, status: "Active",
    bank: "HNB", branch: "Negombo", accountNum: "5566778899",
  },
];

const categoryColor = { Academic: "indigo", "Non-Academic": "purple" };
const typeColor     = { Permanent: "success", Temporary: "warning" };
const statusColor   = { Active: "success", Inactive: "failure" };

export function EmployeeTable() {
  const [openModal, setOpenModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const filtered = employees.filter((e) => {
    const name = `${e.firstName} ${e.surName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || e.emp_id.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleEdit = (emp) => { setEditData(emp); setOpenModal(true); };
  const handleAdd  = ()    => { setEditData(null); setOpenModal(true); };

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employees</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and organize your employee records
          </p>
        </div>
        <CustomButton onClick={handleAdd} color="purple">
          <HiPlus className="mr-2 h-4 w-4" />
          Add Employee
        </CustomButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <CustomInput
          icon={HiSearch}
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sizing="sm"
          className="w-64"
        />
        <CustomSelect value={filterCat} onChange={(e) => setFilterCat(e.target.value)} sizing="sm">
          <option value="all">All Categories</option>
          <option value="Academic">Academic</option>
          <option value="Non-Academic">Non-Academic</option>
        </CustomSelect>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <CustomTable hoverable>
            <CustomTableHead>
              <CustomTableRow>
                <CustomTableHeadCell className="w-10">#</CustomTableHeadCell>
                <CustomTableHeadCell>Emp ID</CustomTableHeadCell>
                <CustomTableHeadCell>Full Name</CustomTableHeadCell>
                <CustomTableHeadCell>NIC</CustomTableHeadCell>
                <CustomTableHeadCell>Category</CustomTableHeadCell>
                <CustomTableHeadCell>Type</CustomTableHeadCell>
                <CustomTableHeadCell>Basic Salary</CustomTableHeadCell>
                <CustomTableHeadCell>Position / Level</CustomTableHeadCell>
                <CustomTableHeadCell>EPF/ETF</CustomTableHeadCell>
                <CustomTableHeadCell>Status</CustomTableHeadCell>
                <CustomTableHeadCell className="text-center">Actions</CustomTableHeadCell>
              </CustomTableRow>
            </CustomTableHead>
            <CustomTableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((emp) => (
                <CustomTableRow
                  key={emp.id}
                  className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <CustomTableCell className="text-sm text-gray-400">{emp.id}</CustomTableCell>
                  <CustomTableCell className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                    {emp.emp_id}
                  </CustomTableCell>
                  <CustomTableCell className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                    {emp.initial} {emp.firstName} {emp.midName} {emp.surName}
                  </CustomTableCell>
                  <CustomTableCell className="text-sm text-gray-600 dark:text-gray-300">{emp.nic}</CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={categoryColor[emp.category]} className="w-fit text-xs">
                      {emp.category}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={typeColor[emp.employmentType]} className="w-fit text-xs">
                      {emp.employmentType}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Rs. {emp.basicSalary.toLocaleString()}
                  </CustomTableCell>
                  <CustomTableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge color="purple" className="w-fit text-xs">{emp.position}</StatusBadge>
                      <StatusBadge color="indigo" className="w-fit text-xs">{emp.level}</StatusBadge>
                    </div>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={emp.epfEtf ? "success" : "gray"} className="w-fit text-xs">
                      {emp.epfEtf ? "Eligible" : "N/A"}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <StatusBadge color={statusColor[emp.status]} className="w-fit text-xs">
                      {emp.status}
                    </StatusBadge>
                  </CustomTableCell>
                  <CustomTableCell>
                    <div className="flex items-center justify-center gap-2">
                      <CustomButton size="xs" color="blue" outline pill onClick={() => handleEdit(emp)}>
                        <HiPencil className="h-3.5 w-3.5" />
                      </CustomButton>
                      <CustomButton size="xs" color="failure" outline pill>
                        <HiTrash className="h-3.5 w-3.5" />
                      </CustomButton>
                    </div>
                  </CustomTableCell>
                </CustomTableRow>
              ))}
              {filtered.length === 0 && (
                <CustomTableRow>
                  <CustomTableCell colSpan={11} className="py-8 text-center text-sm text-gray-400">
                    No employees found.
                  </CustomTableCell>
                </CustomTableRow>
              )}
            </CustomTableBody>
          </CustomTable>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-white">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-white">{employees.length}</span> employees
          </span>
          <span className="text-xs text-gray-400">Employee Management</span>
        </div>
      </div>

      {openModal && (
        <EmployeeForm
          closeForm={() => { setOpenModal(false); setEditData(null); }}
          initialData={editData}
        />
      )}
    </div>
  );
}
