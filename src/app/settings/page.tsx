"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Palette,
  Building2,
  CreditCard,
  Save,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [taxRate, setTaxRate] = useState("0");
  const [footerMessage, setFooterMessage] = useState("");
  const [theme, setTheme] = useState("light");
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("counter");

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "counter";
    setCurrentUserRole(role);

    // Load saved settings & theme
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setStoreName(localStorage.getItem("storeName") || "Auto Electrical & AC Service");
    setStorePhone(localStorage.getItem("storePhone") || "+94 71 234 5678");
    setStoreAddress(localStorage.getItem("storeAddress") || "Main Street, Battuluoya");
    setCurrency(localStorage.getItem("currency") || "LKR");
    setTaxRate(localStorage.getItem("taxRate") || "0");
    setFooterMessage(localStorage.getItem("footerMessage") || "Thank you! Come Again.");
  }, []);

  // Handle Theme Change instantly
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== "admin") {
      alert("මෙම සැකසුම් වෙනස් කිරීමට ඇත්තේ Admin බලතල පමණි!");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem("storeName", storeName);
      localStorage.setItem("storePhone", storePhone);
      localStorage.setItem("storeAddress", storeAddress);
      localStorage.setItem("currency", currency);
      localStorage.setItem("taxRate", taxRate);
      localStorage.setItem("footerMessage", footerMessage);

      alert("සැකසුම් (Settings) සාර්ථකව සුරකින ලදී!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("දෝෂයක් ඇති විය!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-blue-600 dark:text-blue-400" /> System Settings
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">පද්ධතියේ මූලික සැකසුම්, ව්‍යාපාරික විස්තර සහ තේමා (Theme) කළමනාකරණය.</p>
      </div>

      <div className="space-y-6">
        {/* Appearance / Theme Settings - Available to Everyone */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Appearance (Theme) - හැමෝටම
          </h2>
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">System Theme</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-full sm:w-1/2 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-semibold"
            >
              <option value="light">Light Mode (සාමාන්‍ය)</option>
              <option value="dark">Dark Mode (අඳුරු පෙනුම)</option>
            </select>
          </div>
        </div>

        {/* Admin Only Settings */}
        {currentUserRole === "admin" ? (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Business Profile Settings */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Business & Receipt Profile (Admin Only)
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Business Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Business Address</label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* POS & Tax Settings */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> POS & Billing Preferences (Admin Only)
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Currency Symbol</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-semibold"
                  >
                    <option value="LKR">LKR (Rs.)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Default Tax / VAT (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Receipt Footer Message</label>
                  <input
                    type="text"
                    value={footerMessage}
                    onChange={(e) => setFooterMessage(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? "සුරකිනු ලැබේ..." : "Save Settings"}
            </button>
          </form>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>ව්‍යාපාරික විස්තර සහ POS සැකසුම් වෙනස් කළ හැක්කේ **Admin** කෙනෙකුට පමණි. ඔබට වෙනස් කළ හැක්කේ ඉහත **Theme** සැකසුම පමණි.</span>
          </div>
        )}
      </div>
    </div>
  );
}