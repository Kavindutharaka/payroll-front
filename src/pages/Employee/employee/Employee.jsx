import React from 'react'
import { SideNav } from '../../../components/SideNav'
import { EmployeeTable } from './Table'

export default function Employee() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNav />
      <main className="ml-64 flex-1 p-6">
        <EmployeeTable />
      </main>
    </div>
  )
}
