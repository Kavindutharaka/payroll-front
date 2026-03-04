import {
  Sidebar,
  SidebarCollapse,
  SidebarItem,
  SidebarItemGroup,
  SidebarItems,
  TextInput,
} from "flowbite-react";
import {
  HiChartPie,
  HiClipboard,
  HiCollection,
  HiIdentification,
  HiInformationCircle,
  HiLogin,
  HiPencil,
  HiSearch,
  HiShoppingBag,
  HiUsers,
  HiViewList,
} from "react-icons/hi";

export function SideNav() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <Sidebar
        aria-label="Sidebar with multi-level dropdown example"
        className="h-full [&>div]:bg-transparent [&>div]:p-0"
      >
        <div className="flex h-full flex-col justify-between py-2 px-3">
          <div>
            <form className="pb-3 md:hidden">
              <TextInput icon={HiSearch} type="search" placeholder="Search" required size={32} />
            </form>
            <SidebarItems>
              <SidebarItemGroup>
                <SidebarItem href="/" icon={HiChartPie}>
                  Dashboard
                </SidebarItem>
                <SidebarItem href="/e-commerce/products" icon={HiShoppingBag}>
                  Products
                </SidebarItem>
                <SidebarCollapse icon={HiUsers} label="Employee Master">
                  <SidebarItem href="/emp/manage" icon={HiIdentification}>
                    Employee
                  </SidebarItem>
                  <SidebarItem href="/emp/pos" icon={HiViewList}>
                    Positions
                  </SidebarItem>
                  <SidebarItem href="/emp/lvl" icon={HiChartPie}>
                    Levels
                  </SidebarItem>
                </SidebarCollapse>
                <SidebarItem href="/authentication/sign-in" icon={HiLogin}>
                  Sign in
                </SidebarItem>
                <SidebarItem href="/authentication/sign-up" icon={HiPencil}>
                  Sign up
                </SidebarItem>
              </SidebarItemGroup>
              <SidebarItemGroup>
                <SidebarItem href="https://github.com/themesberg/flowbite-react/" icon={HiClipboard}>
                  Docs
                </SidebarItem>
                <SidebarItem href="https://flowbite-react.com/" icon={HiCollection}>
                  Components
                </SidebarItem>
                <SidebarItem href="https://github.com/themesberg/flowbite-react/issues" icon={HiInformationCircle}>
                  Help
                </SidebarItem>
              </SidebarItemGroup>
            </SidebarItems>
          </div>
        </div>
      </Sidebar>
    </aside>
  );
}
