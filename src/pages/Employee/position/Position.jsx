import React from 'react'
import { SideNav } from '../../../components/SideNav'
import { PositionTable } from './Table'

export default function Position() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNav />
      <main className="ml-64 flex-1 p-6">
        <PositionTable />
      </main>
    </div>
  )
}
