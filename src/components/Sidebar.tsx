// src/app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  Building2, 
  Tags,
  MapPin,
  BarChart3, 
  FileSpreadsheet, 
  UserPlus, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS (Billing)", icon: ShoppingCart },
  { href: "/products", label: "Products & Stock", icon: Package },
  { href: "/purchases", label: "Purchases", icon: Truck },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/c&b", label: "Categories & Brands", icon: Tags },
  { href: "/racks", label: "Rack Numbers", icon: MapPin },
  { href: "/reports", label: "Sales Reports", icon: BarChart3 },
  { href: "/reports/purchases", label: "Purchase Reports", icon: FileSpreadsheet },
  { href: "/admin/users", label: "Create Users", icon: UserPlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState("counter");
  const [username, setUsername] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
    const role = localStorage.getItem("userRole") || "counter";
    const user = localStorage.getItem("username") || "";
    setUserRole(role);
    setUsername(user);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (confirm("සැබැවින්ම පද්ධතියෙන් ඉවත් වීමට (Logout) අවශ්‍ය බව තහවුරු කරන්නද?")) {
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      router.push("/login");
    }
  };

  const filteredLinks = navLinks.filter((link) => {
    if ((link.href === "/suppliers" || link.href === "/admin/users") && userRole !== "admin") {
      return false;
    }
    return true;
  });

  if (!mounted) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between py-2">
      {/* Top Section: Header & Navigation */}
      <div className="flex flex-col space-y-1 px-2">
        {/* Header & Logo Section */}
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/25 text-sm">
                S
              </div>
              <div className={`transition-all duration-300 whitespace-nowrap ${!isHovered ? "sm:opacity-0 sm:w-0 sm:overflow-hidden" : "opacity-100"}`}>
                <h1 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">Sampath Auto Parts</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">POS & Inventory System</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="sm:hidden p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info Badge */}
          {username && (
            <div className={`mt-2 bg-slate-50/80 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs border border-slate-200/60 dark:border-slate-700/50 transition-all duration-300 ${!isHovered ? "sm:opacity-0 sm:h-0 sm:p-0 sm:overflow-hidden sm:border-0 sm:mt-0" : "opacity-100"}`}>
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-[120px] text-[11px]">
                User: <strong className="text-blue-600 dark:text-blue-400 font-semibold">{username}</strong>
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                userRole === "admin" 
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" 
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              }`}>
                {userRole}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links with Smooth Scrolling Support */}
      <nav className="flex-1 px-2 space-y-1 text-xs font-medium overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              title={!isHovered ? link.label : ""}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                isActive 
                  ? "text-white" 
                  : !isHovered 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`} />
              <span className={`transition-opacity duration-300 whitespace-nowrap text-[13px] ${!isHovered ? "sm:opacity-0 sm:w-0 sm:overflow-hidden" : "opacity-100"}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section: Logout Button & Footer */}
      <div className="px-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 mt-auto">
        <button
          onClick={handleLogout}
          title={!isHovered ? "Logout" : ""}
          className="w-full py-2.5 bg-rose-50/80 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-semibold transition-all duration-200 border border-rose-200/60 dark:border-rose-500/20 flex items-center justify-center gap-2 group"
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 text-rose-500" />
          <span className={`transition-opacity duration-300 whitespace-nowrap ${!isHovered ? "sm:opacity-0 sm:w-0 sm:overflow-hidden" : "opacity-100"}`}>
            Logout
          </span>
        </button>

        <div className={`text-[9px] text-slate-400 dark:text-slate-500 text-center font-medium transition-opacity duration-300 ${!isHovered ? "sm:opacity-0 sm:h-0 sm:overflow-hidden" : "opacity-100"}`}>
          Battuluoya System v1.0
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="sm:hidden flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            S
          </div>
          <span className="font-bold text-xs text-slate-900 dark:text-white">Sampath Auto Parts</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Fullscreen Sliding Menu */}
      <div className={`fixed inset-0 z-50 bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out sm:hidden ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar with Hover Expand & Scroll Support */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 hidden sm:flex flex-col shadow-xl h-screen sticky top-0 border-r border-slate-200/70 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-40 ${
          isHovered ? "w-64" : "w-20"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
