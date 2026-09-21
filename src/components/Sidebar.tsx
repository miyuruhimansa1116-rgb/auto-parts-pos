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

  // පේජ් එක ලෝඩ් වන විට localStorage එකෙන් User ගේ Role සහ Username ලබා ගැනීම
  useEffect(() => {
    setMounted(true);
    const role = localStorage.getItem("userRole") || "counter";
    const user = localStorage.getItem("username") || "";
    setUserRole(role);
    setUsername(user);
  }, []);

  // Logout Function with Confirmation Warning
  const handleLogout = () => {
    if (confirm("සැබැවින්ම පද්ධතියෙන් ඉවත් වීමට (Logout) අවශ්‍ය බව තහවුරු කරන්නද?")) {
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      router.push("/login");
    }
  };

  // Role එක අනුව ලින්ක්ස් ෆිල්ටර් කිරීම
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
    <aside className="w-64 bg-gray-900 text-white flex flex-col hidden sm:flex shadow-md min-h-screen">
      {/* Header & User Info */}
      <div className="p-5 border-b border-gray-800 space-y-2">
        <div>
          <h1 className="text-lg font-bold tracking-wider text-blue-400">⚡ Auto Electrical</h1>
          <p className="text-xs text-gray-400">POS & Inventory System</p>
        </div>

        {/* ලොග් වී සිටින යුසර්ගේ විස්තරය */}
        {username && (
          <div className="bg-gray-800 p-2 rounded-lg flex items-center justify-between text-xs border border-gray-700">
            <span className="text-gray-300 truncate max-w-[110px]">User: <strong className="text-blue-300">{username}</strong></span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
              userRole === "admin" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"
            }`}>
              {userRole}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 text-sm font-medium overflow-y-auto">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 font-bold border-l-4 border-blue-500"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button & Footer */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition border border-red-500/30 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>

        <div className="text-[10px] text-gray-500 text-center">
          Battuluoya System v1.0
        </div>
      </div>
    </aside>
  );
}