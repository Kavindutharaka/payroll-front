import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canOpen } from "../auth/access";
import { ChangePasswordModal } from "../pages/Auth/ChangePassword";
import {
  HiChartPie,
  HiUsers,
  HiIdentification,
  HiViewList,
  HiCog,
  HiCalendar,
  HiCash,
  HiCreditCard,
  HiClipboard,
  HiCollection,
  HiDocumentText,
  HiAdjustments,
  HiClock,
  HiOfficeBuilding,
  HiBriefcase,
  HiCurrencyDollar,
  HiChartBar,
  HiFolderOpen,
  HiRefresh,
  HiPlay,
  HiChevronDown,
  HiTrendingUp,
  HiGift,
  HiShieldCheck,
  HiKey,
  HiLogout,
  HiSelector,
} from "react-icons/hi";

const navGroups = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: HiChartPie },
    ],
  },
  {
    label: "MASTER DATA",
    items: [
      {
        label: "Employee Master",
        icon: HiUsers,
        children: [
          { href: "/emp/manage",           label: "Employees",        icon: HiIdentification },
          { href: "/emp/salary-structure", label: "Salary Structure", icon: HiCurrencyDollar },
          { href: "/emp/pos",              label: "Positions",        icon: HiViewList },
          { href: "/emp/lvl",              label: "Levels",           icon: HiChartBar },
        ],
      },
      {
        label: "Payroll Config",
        icon: HiCog,
        children: [
          { href: "/config/components", label: "Salary Components", icon: HiCollection  },
          { href: "/config/tax",        label: "Tax Configuration", icon: HiDocumentText },
          { href: "/config/epf-etf",    label: "EPF / ETF",         icon: HiAdjustments },
          { href: "/config/ot",         label: "OT Configuration",  icon: HiClock        },
        ],
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        label: "Leave Management",
        icon: HiCalendar,
        children: [
          { href: "/leave/types",    label: "Leave Types",    icon: HiClipboard    },
          { href: "/leave/tracking", label: "Leave Tracking", icon: HiDocumentText },
        ],
      },
      {
        label: "Loan & Advance",
        icon: HiBriefcase,
        children: [
          { href: "/loan/types",    label: "Loan Types",     icon: HiCollection },
          { href: "/loan/employee", label: "Employee Loans", icon: HiCash       },
        ],
      },
      {
        label: "Payment",
        icon: HiCreditCard,
        children: [
          { href: "/payment/banks",           label: "Bank Accounts",  icon: HiOfficeBuilding },
          { href: "/payment/standing-orders", label: "Standing Orders", icon: HiRefresh       },
        ],
      },
    ],
  },
  {
    label: "PAYROLL",
    items: [
      {
        label: "Payroll Processing",
        icon: HiPlay,
        children: [
          { href: "/payroll/run",       label: "Run Payroll",     icon: HiPlay         },
          { href: "/payroll/payslip",   label: "Payslips",        icon: HiDocumentText },
          { href: "/payroll/increment", label: "Increment Sheet", icon: HiTrendingUp   },
          { href: "/payroll/bonus",     label: "Bonus Sheet",     icon: HiGift         },
        ],
      },
      { href: "/reports", label: "Reports", icon: HiChartBar },
      { href: "/documents", label: "Payroll Files", icon: HiFolderOpen },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: HiShieldCheck },
    ],
  },
];

/* Only what the signed-in person's role can open; empty sections disappear. */
function visibleGroups(can) {
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items
        .map((it) => (it.children ? { ...it, children: it.children.filter((c) => canOpen(can, c.href)) } : it))
        .filter((it) => (it.children ? it.children.length > 0 : canOpen(can, it.href))),
    }))
    .filter((g) => g.items.length > 0);
}

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!user) return null;
  return (
    <div ref={ref} className="relative flex-shrink-0 border-t border-gray-100 p-3 dark:border-gray-700">
      {open && (
        <div role="menu" className="fb-pop absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
          </div>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); setChanging(true); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
            <HiKey className="h-4 w-4 text-gray-400" /> Change password
          </button>
          <button role="menuitem" type="button" onClick={logout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">
            <HiLogout className="h-4 w-4 text-gray-400" /> Sign out
          </button>
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#29166F] text-xs font-semibold text-white">
          {initials(user.displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">{user.displayName}</span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{user.role}</span>
        </span>
        <HiSelector className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>
      {changing && <ChangePasswordModal onClose={() => setChanging(false)} />}
    </div>
  );
}

// Build initial open state: auto-open sections that contain the active route
function getInitialOpen(pathname) {
  const open = {};
  navGroups.forEach((group) => {
    group.items.forEach((item) => {
      if (item.children) {
        open[item.label] = item.children.some((c) => pathname.startsWith(c.href));
      }
    });
  });
  return open;
}

export function SideNav() {
  const { pathname } = useLocation();
  const { can } = useAuth();
  const groups = visibleGroups(can);
  const [openSections, setOpenSections] = useState(() => getInitialOpen(pathname));

  const toggle = (label) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">

      {/* Brand */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
        <img src="/ais-logo.jpg" alt="" className="h-9 w-9 flex-shrink-0 rounded-md bg-white object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">AIS Payroll</p>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">Asian International School</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-5 overflow-x-hidden px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">

            {/* Section Label */}
            {group.label && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {group.label}
              </p>
            )}

            {group.items.map((item) => {
              /* ── Direct link ── */
              if (item.href) {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 flex-shrink-0 h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              }

              /* ── Collapsible section ── */
              const isOpen    = openSections[item.label] ?? false;
              const hasActive = item.children.some((c) => isActive(c.href));

              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    onClick={() => toggle(item.label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      hasActive && !isOpen
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    <HiChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Children */}
                  {isOpen && (
                    <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l-2 border-purple-100 pl-3 dark:border-purple-800/50">
                      {item.children.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                              childActive
                                ? "bg-purple-600 font-medium text-white"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            }`}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <AccountMenu />
    </aside>
  );
}
