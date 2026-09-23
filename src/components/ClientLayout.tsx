"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

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

  // Login පිටුවේදී Sidebar නොපෙන්වා සෘජුවම පෙන්වීම
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Login වී නැති නම් පිටුව පෙන්වීම වළක්වාලීම (Redirect වන තුරු)
  if (!isAuthorized) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col sm:flex-row">
      {/* Sidebar Component එක (මိုබයිල් සහ ඩෙස්ක්ටොප් දෙකම මෙහි පාලනය වේ) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
