// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Sun, 
  Moon, 
  Wrench, 
  LogIn 
} from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
    }
  }, []);

  // Toggle Dark Mode Function
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();

    try {
      let role = "counter";
      let isValid = false;

      // 1. ප්‍රධාන Admin පරීක්ෂා කිරීම
      if (cleanUser === "miyuru07" && password === "KAmh0716#") {
        role = "admin";
        isValid = true;
      } else {
        // 2. වෙනත් යූසර්වරුන් Firestore 'systemUsers' මඟින් පරීක්ෂා කිරීම
        const userDocRef = doc(db, "systemUsers", cleanUser);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.password === password) {
            role = data.role || "counter";
            isValid = true;
          }
        }
      }

      if (isValid) {
        // LocalStorage වල සටහන් කර ගැනීම
        localStorage.setItem("userRole", role);
        localStorage.setItem("username", cleanUser);

        alert(`සාර්ථකව ඇතුළු විය! (${role.toUpperCase()} ලෙස සම්බන්ධ විය)`);
        router.push("/"); // ප්‍රධාන පිටුවට යොමු කරන්න
      } else {
        alert("වැරදි Username එකක් හෝ Password එකක්! කරුණාකර පරීක්ෂා කරන්න.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("ලොග් වීමේ දෝෂයක් ඇති විය.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-sans p-4 transition-colors duration-200">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6 border border-gray-200 dark:border-gray-800 relative">
          
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-xl transition shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 text-xs font-semibold"
            title="Toggle Dark/Light Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>

          <div className="text-center space-y-1 pt-2">
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Auto Electrical & AC
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">පද්ධතියට පිවිසීමට ඔබේ Username සහ Password ඇතුළත් කරන්න</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="miyuru07"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "පරීක්ෂා කරමින් පවතී..." : "Login to System"}
            </button>
          </form>

          <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center border-t border-gray-200 dark:border-gray-800 pt-4 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            Admin ලෙස <b className="text-gray-600 dark:text-gray-300 ml-1">miyuru07</b> මඟින් හෝ වෙනත් Counter යූසර්වරුන්ගෙන් ඇතුළත් විය හැක.
          </div>
        </div>
      </div>
    </div>
  );
}