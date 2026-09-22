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
  BarChart3, 
  FileSpreadsheet, 
  UserPlus, 
  Settings,
  LogOut
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS (Billing)", icon: ShoppingCart },
  { href: "/products", label: "Products & Stock", icon: Package },
  { href: "/purchases", label: "Purchases", icon: Truck },
  { href: "/suppliers", label: "Suppliers", icon: Building2 }, // Admin ට පමණි
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

  useEffect(() => {
    setMounted(true);
    const role = localStorage.getItem("userRole") || "counter";
    const user = localStorage.getItem("username") || "";
    setUserRole(role);
    setUsername(user);
  }, []);

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

  return (
    <aside className="w-64 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md text-gray-800 dark:text-gray-100 flex flex-col hidden sm:flex shadow-lg min-h-screen border-r border-gray-200/80 dark:border-gray-800 transition-colors duration-200">
      {/* Header & Logo Section */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">Sampath Auto Parts</h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">POS & Inventory System</p>
          </div>
        </div>

        {/* User Info Badge */}
        {username && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl flex items-center justify-between text-xs border border-gray-200/60 dark:border-gray-700/50">
            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[110px]">
              User: <strong className="text-blue-600 dark:text-blue-400 font-semibold">{username}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase shadow-xs ${
              userRole === "admin" 
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" 
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            }`}>
              {userRole}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 text-sm font-medium overflow-y-auto">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400 dark:text-gray-500"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button & Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800/80 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs font-semibold transition-all duration-200 border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2 shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>

        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium">
          Battuluoya System v1.0
        </div>
      </div>
    </aside>
  );
}