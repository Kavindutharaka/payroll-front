import { SideNav } from "./SideNav";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <SideNav />
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
