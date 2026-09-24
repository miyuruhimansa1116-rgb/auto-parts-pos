// src/app/admin/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import ReceiptTemplate from "@/components/ReceiptTemplate";
import {
  Settings,
  Palette,
  Building2,
  CreditCard,
  Save,
  ShieldAlert,
  Printer,
  RotateCcw,
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

    // Theme (Local preference)
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Load Business Settings from Firestore
    const unsubSettings = onSnapshot(doc(db, "settings", "business"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreName(data.businessName || "AUTO ELECTRICAL & AC");
        setStorePhone(data.phoneNumber || "07X-XXXXXXX");
        setStoreAddress(data.businessAddress || "No. 12, Main Street, Battuluoya");
        setCurrency(data.currency || "LKR");
        setTaxRate(data.taxRate || "0");
        setFooterMessage(data.footerMessage || "THANK YOU COME AGAIN!");
      }
    });

    return () => unsubSettings();
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== "admin") {
      alert("Only Admin privileges are available to change these settings!");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "business"), {
        businessName: storeName,
        phoneNumber: storePhone,
        businessAddress: storeAddress,
        currency,
        taxRate,
        footerMessage,
      }, { merge: true });

      alert("Settings and receipt details successfully saved to the database!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("An error occurred!");
    } finally {
      setSaving(false);
    }
  };

  // Reset Invoice Counter to 0 (Admin Only)
  const handleResetCounter = async () => {
    if (currentUserRole !== "admin") {
      alert("Only Admin privileges are available to perform this action!");
      return;
    }

    if (confirm("Do you want to restart the invoice number from 0 (SAP-0)?")) {
      try {
        await setDoc(doc(db, "settings", "invoiceCounter"), { currentNo: 0 });
        localStorage.setItem("pos_invoice_no", "0");
        alert("Invoice number successfully updated to 0!");
      } catch (err) {
        console.error("Error resetting counter:", err);
        alert("An error occurred!");
      }
    }
  };

  // Sample Invoice data for ReceiptTemplate Preview
  const sampleInvoice = {
    invoiceNo: "SAP-0",
    customerName: "Kamal Perera",
    paymentMethod: "Cash",
    items: [
      { name: "Engine Oil 4L", cartQty: 1, sellingPrice: 6500 },
      { name: "Oil Filter", cartQty: 1, sellingPrice: 1800 },
    ],
    subTotal: 8300,
    discount: 300,
    netTotal: 8000,
    cashPaid: 10000,
    balance: 2000,
    createdAt: new Date(),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2.5">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" /> System Settings & Receipt Configuration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400"></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance / Theme Settings */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base border-b border-gray-200 dark:border-gray-800 pb-2.5 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Appearance (Theme) - For Everyone
            </h2>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">System Theme</label>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="w-full sm:w-1/2 p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-bold"
              >
                <option value="light">Light Mode (Standard)</option>
                <option value="dark">Dark Mode (Dark Look)</option>
              </select>
            </div>
          </div>

          {/* Admin Only Settings */}
          {currentUserRole === "admin" ? (
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Business Profile Settings */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                  <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base border-b border-gray-200 dark:border-gray-800 pb-2.5 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Business & Receipt Profile (Admin Only)
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Business / Shop Name</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Business Address</label>
                      <input
                        type="text"
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* POS & Tax Settings */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                  <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base border-b border-gray-200 dark:border-gray-800 pb-2.5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> POS & Billing Preferences
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Currency Symbol</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-bold"
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
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Receipt Footer Message</label>
                      <input
                        type="text"
                        value={footerMessage}
                        onChange={(e) => setFooterMessage(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" /> {saving ? "Saving..." : "Save Settings"}
                </button>
              </form>

              {/* Reset Invoice Counter Section (Admin Only) */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm space-y-3">
                <h2 className="font-bold text-red-600 dark:text-red-400 text-base border-b border-red-100 dark:border-red-900/30 pb-2.5 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" /> Reset Invoice Counter (Admin Control)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This allows resetting the next issued invoice number to start from <span className="font-bold text-red-500">SAP-0</span>.
                </p>
                <button
                  type="button"
                  onClick={handleResetCounter}
                  className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition shadow-xs inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> Reset Invoice to SAP-0
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-sm text-amber-800 dark:text-amber-200 flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <span>Business details and POS settings can only be changed by an **Admin**.</span>
            </div>
          )}
        </div>

        {/* Right Column: Live Receipt Preview using ReceiptTemplate */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base border-b border-gray-200 dark:border-gray-800 pb-2.5 mb-3.5 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500" /> Live Receipt Preview
            </h2>
            
            {/* Real-time Receipt Template Component */}
            <div className="bg-gray-100 dark:bg-gray-950 p-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-800 overflow-hidden">
              <ReceiptTemplate invoice={sampleInvoice} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Changes you make to the text above will be instantly reflected on the receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
