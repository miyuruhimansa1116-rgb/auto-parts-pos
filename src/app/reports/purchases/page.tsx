"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Building2,
  Tag,
  Award,
  ClipboardList,
  Trash2,
} from "lucide-react";

interface PurchaseItem {
  id?: string;
  supplierName: string;
  partNumber: string;
  itemName: string;
  category: string;
  brand: string;
  qty: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  imageUrl?: string;
  createdAt: any;
}

export default function PurchaseReportsPage() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User Role State for Permission Control
  const [userRole, setUserRole] = useState("counter");

  // Filters State
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "7days" | "thisMonth" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get User Role on load
  useEffect(() => {
    const role = localStorage.getItem("userRole") || "counter";
    setUserRole(role);
  }, []);

  // Load Purchases
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "purchases"), (snapshot) => {
      const list: PurchaseItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PurchaseItem[];
      setPurchases(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Delete Purchase Record Function (Restricted to Admin only)
  const handleDeletePurchase = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (userRole !== "admin") {
      alert("මෙම මිලදී ගැනීමේ වාර්තාව (Delete කිරීම) ඉවත් කිරීමට ඔබට අවසර නැත! (Admin පමණයි)");
      return;
    }

    if (confirm("මෙම මිලදී ගැනීමේ වාර්තාව (Purchase Record) සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍ය බව තහවුරු කරන්නද?")) {
      try {
        await deleteDoc(doc(db, "purchases", docId));
        alert("මිලදී ගැනීමේ වාර්තාව සාර්ථකව මකා දමන ලදී!");
      } catch (error) {
        console.error("Error deleting purchase: ", error);
        alert("වාර්තාව මකා දැමීමේදී දෝෂයක් ඇති විය!");
      }
    }
  };

  // Helper function to extract Date object safely
  const parseDate = (createdAt: any): Date => {
    if (!createdAt) return new Date(0);
    if (createdAt.toDate && typeof createdAt.toDate === "function") {
      return createdAt.toDate();
    }
    return new Date(createdAt);
  };

  // Filter Purchases by Selected Date Range & Filters
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return purchases.filter((p) => {
      const pDate = parseDate(p.createdAt);

      // Date Filtering Logic
      let matchesDate = true;
      if (dateRange === "today") {
        matchesDate = pDate >= todayStart;
      } else if (dateRange === "yesterday") {
        const yestStart = new Date(todayStart);
        yestStart.setDate(yestStart.getDate() - 1);
        const yestEnd = new Date(todayStart);
        matchesDate = pDate >= yestStart && pDate < yestEnd;
      } else if (dateRange === "7days") {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchesDate = pDate >= sevenDaysAgo;
      } else if (dateRange === "thisMonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        matchesDate = pDate >= monthStart;
      } else if (dateRange === "custom") {
        if (startDate) {
          const s = new Date(`${startDate}T00:00:00`);
          matchesDate = matchesDate && pDate >= s;
        }
        if (endDate) {
          const e = new Date(`${endDate}T23:59:59`);
          matchesDate = matchesDate && pDate <= e;
        }
      }

      // Dropdown Filters Logic
      const matchesSupplier = selectedSupplier === "all" || p.supplierName === selectedSupplier;
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
      const matchesSearch =
        p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesSupplier && matchesCategory && matchesSearch;
    });
  }, [purchases, dateRange, startDate, endDate, selectedSupplier, selectedCategory, searchQuery]);

  // Dynamic Lists for Filter Dropdowns
  const suppliersList = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => p.supplierName && set.add(p.supplierName));
    return Array.from(set);
  }, [purchases]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [purchases]);

  // Analytics Calculations
  const totalExpense = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (p.totalCost || (p.costPrice || 0) * (p.qty || 0)), 0);
  }, [filteredPurchases]);

  const totalQtyBought = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (p.qty || 0), 0);
  }, [filteredPurchases]);

  const totalTransactions = filteredPurchases.length;
  const avgOrderValue = totalTransactions > 0 ? totalExpense / totalTransactions : 0;

  // Supplier Wise Expense Breakdown
  const supplierBreakdown = useMemo(() => {
    const map: { [key: string]: { total: number; count: number } } = {};
    filteredPurchases.forEach((p) => {
      const name = p.supplierName || "Unknown";
      const cost = p.totalCost || (p.costPrice || 0) * (p.qty || 0);
      if (!map[name]) map[name] = { total: 0, count: 0 };
      map[name].total += cost;
      map[name].count += 1;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percent: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPurchases, totalExpense]);

  // Top 5 Purchased Products
  const topProducts = useMemo(() => {
    const map: { [key: string]: { name: string; partNumber: string; qty: number; totalCost: number } } = {};
    filteredPurchases.forEach((p) => {
      const key = p.partNumber || p.itemName;
      if (!map[key]) {
        map[key] = { name: p.itemName, partNumber: p.partNumber, qty: 0, totalCost: 0 };
      }
      map[key].qty += p.qty || 0;
      map[key].totalCost += p.totalCost || (p.costPrice || 0) * (p.qty || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [filteredPurchases]);

  // Category Wise Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredPurchases.forEach((p) => {
      const cat = p.category || "General";
      const cost = p.totalCost || (p.costPrice || 0) * (p.qty || 0);
      map[cat] = (map[cat] || 0) + cost;
    });

    return Object.entries(map)
      .map(([cat, total]) => ({
        category: cat,
        total,
        percent: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPurchases, totalExpense]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (filteredPurchases.length === 0) {
      alert("වාර්තා සටහන් කිසිවක් නැත!");
      return;
    }

    const headers = ["Date", "Supplier", "Part Number", "Item Name", "Category", "Brand", "Qty", "Cost Price", "Total Cost"];
    const rows = filteredPurchases.map((p) => {
      const d = parseDate(p.createdAt).toLocaleDateString();
      return [
        `"${d}"`,
        `"${p.supplierName || ""}"`,
        `"${p.partNumber || ""}"`,
        `"${p.itemName || ""}"`,
        `"${p.category || ""}"`,
        `"${p.brand || ""}"`,
        p.qty || 0,
        p.costPrice || 0,
        p.totalCost || 0,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-semibold">ලෝඩ් වෙමින් පවතී...</div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto font-sans space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Purchase Analytics & Reports
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">සැපයුම්කරුවන්ගෙන් මිලදී ගත් භාණ්ඩ සහ වියදම් සවිස්තරාත්මකව විශ්ලේෂණය කරන්න.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV (Excel)
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-gray-800 text-white dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-900 dark:hover:bg-gray-600 transition shadow flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center border-b pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase">Auto Electrical & AC Services</h1>
        <p className="text-xs">Purchase Expense Report</p>
        <p className="text-[10px] text-gray-500">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 print:hidden transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Preset Range:</span>
          <button
            onClick={() => setDateRange("today")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              dateRange === "today"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange("yesterday")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              dateRange === "yesterday"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateRange("7days")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              dateRange === "7days"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange("thisMonth")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              dateRange === "thisMonth"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateRange("custom")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              dateRange === "custom"
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Pickers & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          {dateRange === "custom" && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">Filter Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
            >
              <option value="all">All Suppliers</option>
              {suppliersList.map((sup, idx) => (
                <option key={idx} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">Filter Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name / part #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-1.5 pl-7 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-blue-600 transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">TOTAL EXPENSE (මුළු වියදම)</span>
          <span className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1 block">
            Rs. {totalExpense.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">තෝරාගත් කාලසීමාව සඳහා</span>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-emerald-600 transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">UNITS PURCHASED (මිලදීගත් ප්‍රමාණය)</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            {totalQtyBought.toLocaleString()} <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Items</span>
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">තොගයට එකතු වූ මුළු ඒකක</span>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-purple-600 transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">PURCHASE ORDERS (වාර ගණන)</span>
          <span className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1 block">
            {totalTransactions} <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Orders</span>
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">මිලදීගැනීම් සටහන් සංඛ්‍යාව</span>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-amber-600 transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">AVG ORDER VALUE (සාමාන්‍ය අගය)</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
            Rs. {Math.round(avgOrderValue).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">එක් මිලදී ගැනීමකට සාමාන්‍යයෙන්</span>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier Expense Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-500" /> Expense by Supplier</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">Share %</span>
          </h2>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {supplierBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">දත්ත නොමැත</p>
            ) : (
              supplierBreakdown.map((sup, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{sup.name}</span>
                    <span className="text-gray-700 dark:text-gray-300">Rs. {sup.total.toLocaleString()} ({sup.percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sup.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Expense Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-purple-500" /> Expense by Category
          </h2>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">දත්ත නොමැත</p>
            ) : (
              categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800 dark:text-gray-200">{cat.category}</span>
                    <span className="text-gray-700 dark:text-gray-300">Rs. {cat.total.toLocaleString()} ({cat.percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Purchased Products */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" /> Top 5 Purchased Items
          </h2>
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">දත්ත නොමැත</p>
            ) : (
              topProducts.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block text-[11px]">{prod.partNumber}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block max-w-[150px]">{prod.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 dark:text-gray-100 block">Rs. {prod.totalCost.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{prod.qty} Units bought</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detailed Purchases Register Table */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-2">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base flex items-center gap-1.5">
            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Purchase Register ({filteredPurchases.length})
          </h2>
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-900">
            Total Spent: Rs. {totalExpense.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Supplier</th>
                <th className="p-2.5">Part # / Item Name</th>
                <th className="p-2.5">Category / Brand</th>
                <th className="p-2.5 text-center">Qty</th>
                <th className="p-2.5 text-right">Cost Price</th>
                <th className="p-2.5 text-right">Selling Price</th>
                <th className="p-2.5 text-right">Total Expense</th>
                {userRole === "admin" && <th className="p-2.5 text-center print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={userRole === "admin" ? 9 : 8} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    තෝරාගත් පරාමිතීන්ට අදාළව මිලදී ගැනීමේ සටහන් කිසිවක් හමු නොවීය.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const pDate = parseDate(p.createdAt);
                  return (
                    <tr key={p.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{pDate.toLocaleDateString()}</td>
                      <td className="p-2.5 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{p.supplierName || "General"}</td>
                      <td className="p-2.5">
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block">{p.partNumber}</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{p.itemName}</span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-semibold block w-fit mb-0.5">
                          {p.category || "General"}
                        </span>
                        <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-purple-200 dark:border-purple-900 block w-fit">
                          {p.brand || "Generic"}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-extrabold text-gray-800 dark:text-gray-200">{p.qty}</td>
                      <td className="p-2.5 text-right text-gray-600 dark:text-gray-400">Rs. {(p.costPrice || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-semibold">Rs. {(p.sellingPrice || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-extrabold text-blue-700 dark:text-blue-400">
                        Rs. {(p.totalCost || (p.costPrice || 0) * (p.qty || 0)).toLocaleString()}
                      </td>
                      
                      {/* DELETE BUTTON: පෙන්වන්නේ Admin ට පමණි */}
                      {userRole === "admin" && (
                        <td className="p-2.5 text-center whitespace-nowrap print:hidden">
                          <button
                            onClick={(e) => handleDeletePurchase(p.id!, e)}
                            className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition border border-red-200 dark:border-red-900 flex items-center gap-1 mx-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredPurchases.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/80 font-extrabold text-gray-800 dark:text-gray-100 border-t-2 border-gray-300 dark:border-gray-700">
                  <td colSpan={4} className="p-3 text-right">GRAND TOTALS:</td>
                  <td className="p-3 text-center">{totalQtyBought} Units</td>
                  <td colSpan={2}></td>
                  <td className="p-3 text-right text-blue-700 dark:text-blue-400 text-sm">Rs. {totalExpense.toLocaleString()}</td>
                  {userRole === "admin" && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}