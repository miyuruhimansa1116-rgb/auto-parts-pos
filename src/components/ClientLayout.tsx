"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useRouterInstance = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Dark Mode එක පරීක්ෂා කර apply කිරීම
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 2. Authentication පරීක්ෂා කිරීම
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    // Login පිටුවේ සිටී නම් පරීක්ෂා කිරීම අවශ්‍ය නැත
    if (pathname === "/login") {
      setIsAuthorized(true);
      return;
    }

    // Login වී නැත්නම් /login වෙත යැවීම
    if (!isLoggedIn) {
      useRouterInstance.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, useRouterInstance]);

  // Login පිටුවේදී Sidebar සහ Header නොපෙන්වා සෘජුවම පෙන්වීම
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Login වී නැති නම් පිටුව පෙන්වීම වළක්වාලීම (Redirect වන තුරු)
  if (!isAuthorized) {
    return null; 
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Active Status සහිත Sidebar Component එක */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile Top Navigation Header */}
        <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex sm:hidden justify-between items-center shadow-xs">
          <span className="font-bold text-blue-600 dark:text-blue-400">⚡ Auto Electrical</span>
          <div className="flex gap-3 text-xs font-semibold">
            <Link href="/" className="text-gray-700 dark:text-gray-300">Home</Link>
            <Link href="/pos" className="text-blue-600 dark:text-blue-400">POS</Link>
            <Link href="/products" className="text-gray-700 dark:text-gray-300">Products</Link>
            <Link href="/reports" className="text-gray-700 dark:text-gray-300">Reports</Link>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}