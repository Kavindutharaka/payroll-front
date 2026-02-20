import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Button,
  Badge,
  TextInput,
} from "flowbite-react";
import { useState } from "react";
import { HiPlus, HiSearch, HiPencil, HiTrash } from "react-icons/hi";
import LevelForm from "./PositionForm";

const levels = [
  { id: 1, name: "Junior", description: "Entry-level employees with 0–2 years of experience" },
  { id: 2, name: "Mid-Level", description: "Employees with 2–5 years of experience" },
  { id: 3, name: "Senior", description: "Experienced employees with 5+ years" },
  { id: 4, name: "Lead", description: "Team leads and tech leads overseeing a group" },
  { id: 5, name: "Manager", description: "Department managers responsible for a team" },
];

export function PositionTable() {
    const [openModal, setOpenModal] = useState(false);
    const openForm =()=>{
        setOpenModal(true);
    };
    const closeForm =()=>{
        setOpenModal(false);
    };
  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Employee Positions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and organize your employee positions
          </p>
        </div>
        <Button onClick={openForm} color="purple">
          <HiPlus className="mr-2 h-4 w-4" />
          Add Position
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
                <TableHeadCell>Position Name</TableHeadCell>
                <TableHeadCell>Description</TableHeadCell>
                <TableHeadCell className="text-center">Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-700">
              {levels.map((level) => (
                <TableRow
                  key={level.id}
                  className="bg-white transition-colors hover:bg-purple-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <TableCell className="text-sm text-gray-400">{level.id}</TableCell>
                  <TableCell>
                    <Badge color="purple" className="w-fit px-3 py-1 text-sm font-medium">
                      {level.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {level.description}
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
            Showing <span className="font-semibold text-gray-700 dark:text-white">{levels.length}</span> entries
          </span>
          <span className="text-xs text-gray-400">Employee Position Management</span>
        </div>

      </div>
      {openModal && <LevelForm closeForm={closeForm} />}
    </div>
  );
}
