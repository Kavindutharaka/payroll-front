import React from 'react'
import { SideNav } from '../../../components/SideNav'
import { LevelTable } from './Table'

export default function Level() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNav />
      <main className="ml-64 flex-1 p-6">
        <LevelTable />
      </main>
    </div>
  )
}
