// src/app/reports/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";
import ReceiptTemplate from "@/components/ReceiptTemplate";
import { 
  BarChart3, 
  Printer, 
  Download, 
  Tag, 
  Trophy, 
  ClipboardList, 
  Search, 
  X, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Trash2, 
  Eye, 
  Sun, 
  Moon,
  Filter,
  Layers,
  Receipt,
  Sparkles,
  FileText
} from "lucide-react";

interface SaleTransaction {
  id: string;
  invoiceNo: string;
  customerName: string;
  paymentMethod: string;
  items: any[];
  netTotal: number;
  subTotal: number;
  discount: number;
  cashPaid: number;
  balance: number;
  createdAt: any;
}

export default function SalesReportsPage() {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // User Role State for Permission Control
  const [userRole, setUserRole] = useState("counter");
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);

  // Modal / Selected Invoice State for viewing details & reprinting
  const [selectedInvoice, setSelectedInvoice] = useState<SaleTransaction | null>(null);

  // Filter States
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Category View Toggle State ("revenue" හෝ "profit")
  const [categoryViewMode, setCategoryViewMode] = useState<"revenue" | "profit">("revenue");

  // Get User Role, Theme preference and Business Settings on load
  useEffect(() => {
    const role = localStorage.getItem("userRole") || "counter";
    setUserRole(role);

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

  // Fetch Sales Data (Online Firestore + LocalStorage Offline Sales with Duplicate Prevention)
  useEffect(() => {
    const fetchSalesReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "sales"));
        let allSales: SaleTransaction[] = [];
        const catSet = new Set<string>();
        const seenUniqueKeys = new Set<string>();

        const processAndPushSale = (data: any, docId: string) => {
          const invoiceNo = data.invoiceNo || docId.slice(0, 6).toUpperCase();
          
          let rawCreatedAt = data.createdAt;
          let timeKey = "";
          if (rawCreatedAt?.toDate) {
            timeKey = rawCreatedAt.toDate().toISOString();
          } else if (rawCreatedAt) {
            timeKey = new Date(rawCreatedAt).toISOString();
          } else {
            timeKey = new Date().toISOString();
          }

          const uniqueKey = `${invoiceNo}_${timeKey}`;
          
          if (seenUniqueKeys.has(uniqueKey)) {
            return;
          }
          seenUniqueKeys.add(uniqueKey);

          const customerName = data.customerName || "Cash Customer";
          const paymentMethod = data.paymentMethod || "Cash";
          const items = Array.isArray(data.items) ? data.items : [];
          
          items.forEach((it: any) => {
            if (it.category) catSet.add(it.category);
          });

          const netTotal = Number(data.netTotal || data.totalAmount || items.reduce((acc, curr) => acc + (Number(curr.total || curr.sellingPrice || 0) * Number(curr.qty || curr.cartQty || 1)), 0));

          allSales.push({
            id: docId,
            invoiceNo,
            customerName,
            paymentMethod,
            items,
            netTotal,
            subTotal: Number(data.subTotal || netTotal),
            discount: Number(data.discount || 0),
            cashPaid: Number(data.cashPaid || netTotal),
            balance: Number(data.balance || 0),
            createdAt: rawCreatedAt,
          });
        };

        querySnapshot.docs.forEach((docSnap) => {
          processAndPushSale(docSnap.data(), docSnap.id);
        });

        const offlineSales = JSON.parse(localStorage.getItem("pos_offline_sales") || "[]");
        const remainingOfflineSales: any[] = [];

        offlineSales.forEach((data: any) => {
          const docId = data.id || `offline_${Math.random()}`;
          const invoiceNo = data.invoiceNo || docId.slice(0, 6).toUpperCase();

          let rawCreatedAt = data.createdAt || new Date().toISOString();
          let timeKey = rawCreatedAt?.toDate ? rawCreatedAt.toDate().toISOString() : new Date(rawCreatedAt).toISOString();
          const uniqueKey = `${invoiceNo}_${timeKey}`;

          if (seenUniqueKeys.has(uniqueKey)) {
            return; 
          }

          remainingOfflineSales.push(data);
          processAndPushSale(data, docId);
        });

        localStorage.setItem("pos_offline_sales", JSON.stringify(remainingOfflineSales));

        setSales(allSales);
        setCategories(Array.from(catSet));
      } catch (error) {
        console.error("Error fetching sales reports: ", error);
      }
    };

    fetchSalesReports();
  }, []);

  // Delete Sale Invoice Function (Restricted to Admin only)
  const handleDeleteSale = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (userRole !== "admin") {
      alert("You do not have permission for this action! (Admin only)");
      return;
    }

    if (confirm("Are you sure you want to completely delete this invoice and its sales record?")) {
      try {
        if (docId.startsWith("offline_")) {
          const offlineSales = JSON.parse(localStorage.getItem("pos_offline_sales") || "[]");
          const updatedOffline = offlineSales.filter((s: any) => s.id !== docId);
          localStorage.setItem("pos_offline_sales", JSON.stringify(updatedOffline));
          setSales(sales.filter((s) => s.id !== docId));
          if (selectedInvoice?.id === docId) setSelectedInvoice(null);
          alert("Offline invoice successfully deleted!");
          return;
        }

        await deleteDoc(doc(db, "sales", docId));
        setSales(sales.filter((s) => s.id !== docId));
        if (selectedInvoice?.id === docId) setSelectedInvoice(null);
        alert("Invoice successfully deleted!");
      } catch (error) {
        console.error("Error deleting sale: ", error);
        alert("An error occurred while deleting the invoice!");
      }
    }
  };

  // Filter Logic
  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      let itemDate: Date;
      if (sale.createdAt?.toDate) {
        itemDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        itemDate = new Date(sale.createdAt);
      } else {
        itemDate = new Date(0);
      }

      let matchesDate = true;
      if (dateRange === "today") {
        matchesDate = itemDate.toDateString() === now.toDateString();
      } else if (dateRange === "yesterday") {
        const yday = new Date();
        yday.setDate(now.getDate() - 1);
        matchesDate = itemDate.toDateString() === yday.toDateString();
      } else if (dateRange === "last7") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = itemDate >= sevenDaysAgo;
      } else if (dateRange === "thisMonth") {
        matchesDate =
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
      } else if (dateRange === "custom") {
        if (startDate) matchesDate = matchesDate && itemDate >= new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && itemDate <= end;
        }
      }

      const matchesPayment =
        filterPayment === "all" ||
        sale.paymentMethod.toLowerCase() === filterPayment.toLowerCase();

      const matchesCategory =
        filterCategory === "all" ||
        sale.items.some((it: any) => it.category === filterCategory);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        sale.invoiceNo.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.items.some((it: any) => (it.name || "").toLowerCase().includes(q) || (it.partNumber || "").toLowerCase().includes(q));

      return matchesDate && matchesPayment && matchesCategory && matchesSearch;
    });
  }, [sales, dateRange, startDate, endDate, filterPayment, filterCategory, searchQuery]);

  // Summary Metrics Calculation
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalQty = 0;
    let totalProfit = 0;

    filteredSales.forEach((sale) => {
      totalRevenue += sale.netTotal || 0;
      sale.items.forEach((it: any) => {
        const q = Number(it.cartQty || it.qty || 1);
        totalQty += q;
        const sPrice = Number(it.sellingPrice || it.price || 0);
        const cPrice = Number(it.buyingPrice || it.costPrice || 0);
        totalProfit += (sPrice - cPrice) * q;
      });
    });

    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, totalQty, totalOrders, avgOrderValue, totalProfit };
  }, [filteredSales]);

  // Category Breakdown Summary (Revenue & Profit calculations)
  const categoryBreakdown = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const profitMap: Record<string, number> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((it: any) => {
        const cat = it.category || "General";
        const q = Number(it.cartQty || it.qty || 1);
        const sPrice = Number(it.sellingPrice || it.price || 0);
        const cPrice = Number(it.buyingPrice || it.costPrice || 0);
        
        const amt = Number(it.total || (sPrice * q));
        const profit = (sPrice - cPrice) * q;

        revenueMap[cat] = (revenueMap[cat] || 0) + amt;
        profitMap[cat] = (profitMap[cat] || 0) + profit;
      });
    });

    if (categoryViewMode === "revenue") {
      return Object.entries(revenueMap).map(([name, amount]) => ({ name, amount }));
    } else {
      return Object.entries(profitMap).map(([name, amount]) => ({ name, amount }));
    }
  }, [filteredSales, categoryViewMode]);

  // Top 5 Items Summary
  const topItems = useMemo(() => {
    const map: Record<string, { qty: number; total: number }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((it: any) => {
        const key = it.name || it.itemName || "Unknown";
        const q = Number(it.cartQty || it.qty || 1);
        const amt = Number(it.total || (Number(it.sellingPrice || 0) * q));
        if (!map[key]) map[key] = { qty: 0, total: 0 };
        map[key].qty += q;
        map[key].total += amt;
      });
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales]);

  // CSV Export Function
  const exportCSV = () => {
    const headers = ["Date,Invoice #,Customer,Payment Method,Total Items,Net Total\n"];
    const rows = filteredSales.map((s) => {
      const d = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : new Date(s.createdAt || Date.now()).toLocaleDateString();
      const totalItemsCount = s.items.reduce((acc, curr) => acc + Number(curr.cartQty || curr.qty || 1), 0);
      return `"${d}","${s.invoiceNo}","${s.customerName}","${s.paymentMethod}",${totalItemsCount},${s.netTotal}\n`;
    });

    const blob = new Blob([...headers, [...rows]], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Print Specific Invoice
  const handlePrintInvoice = (invoice: SaleTransaction) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto font-sans space-y-8 bg-gray-50/50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 min-h-screen transition-colors duration-200">
        
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .printable-receipt, .printable-receipt * {
              visibility: visible !important;
            }
            .printable-receipt {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Sales Analytics & Reports
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-xl transition shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-2 text-sm font-semibold cursor-pointer"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button
              onClick={exportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-3 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-semibold text-sm px-4 py-3 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>
        </div>

        {/* Filter Options */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 no-print transition-colors">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <span className="text-gray-400 dark:text-gray-300 mr-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" /> Preset Range:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "custom", label: "Custom Range" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateRange(btn.id as any)}
                className={`px-4 py-2 rounded-xl border text-sm transition font-medium cursor-pointer ${
                  dateRange === btn.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                }`}
              >
                {btn.label}
              </button>
            ))}

            {dateRange === "custom" && (
              <div className="flex gap-2 ml-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-purple-500" /> Filter Payment Method
              </label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card / Online</option>
                <option value="Credit">Credit / Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-500" /> Filter Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-emerald-500" /> Search Keyword
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice, item, part # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 p-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-blue-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> TOTAL REVENUE
            </span>
            <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
              Rs. {metrics.totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-emerald-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> UNITS SOLD
            </span>
            <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.totalQty.toLocaleString()} <span className="text-base font-semibold">Items</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-purple-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" /> TOTAL INVOICES
            </span>
            <div className="text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
              {metrics.totalOrders} <span className="text-base font-semibold">Orders</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" /> ESTIMATED PROFIT
            </span>
            <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
              Rs. {metrics.totalProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Analytics Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 gap-3">
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" /> 
                {categoryViewMode === "revenue" ? "Revenue by Category" : "Profit by Category"}
              </h3>
              
              {/* Revenue & Profit Switcher Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCategoryViewMode("revenue")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    categoryViewMode === "revenue"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setCategoryViewMode("profit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    categoryViewMode === "profit"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Profit
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {categoryBreakdown.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">No data</p>
              ) : (
                categoryBreakdown.map((cat) => {
                  const totalBase = categoryViewMode === "revenue" ? metrics.totalRevenue : metrics.totalProfit;
                  const percentage = totalBase > 0 ? (cat.amount / totalBase) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-semibold text-gray-800 dark:text-gray-200">
                        <span>{cat.name}</span>
                        <span>Rs. {cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            categoryViewMode === "revenue" 
                              ? "bg-blue-600 dark:bg-blue-400" 
                              : "bg-amber-500 dark:bg-amber-400"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Top 5 Selling Items
            </h3>

            <div className="mt-4 space-y-3.5">
              {topItems.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">No data</p>
              ) : (
                topItems.map((item, idx) => (
                  <div key={item.name} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-700">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{item.qty} pcs</span>
                      <span className="text-xs text-gray-400 dark:text-gray-400">Rs. {item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sales Register Table */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 no-print">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-500" /> Sales Register ({filteredSales.length} Invoices)
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 font-bold">
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-center">Items Count</th>
                  <th className="p-4 text-right">Net Total</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      No sales records found for the selected parameters.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const sDate = sale.createdAt?.toDate
                      ? sale.createdAt.toDate()
                      : new Date(sale.createdAt || Date.now());

                    const totalItemsCount = sale.items.reduce((acc, curr) => acc + Number(curr.cartQty || curr.qty || 1), 0);

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedInvoice(sale)}
                        className="hover:bg-blue-50/50 dark:hover:bg-gray-800/50 cursor-pointer transition"
                      >
                        <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {sDate.toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {sale.invoiceNo}
                        </td>
                        <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {sale.customerName}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-800 dark:text-gray-200">
                          {totalItemsCount} items
                        </td>
                        <td className="p-4 text-right font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          Rs. {sale.netTotal?.toLocaleString()}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedInvoice(sale)}
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-700/60 inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                          
                          {userRole === "admin" && (
                            <button
                              onClick={(e) => handleDeleteSale(sale.id, e)}
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition border border-red-200 dark:border-red-700/60 inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Details & Reprint Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
              <div className="bg-gray-900 dark:bg-gray-950 text-white p-4 flex justify-between items-center no-print border-b border-gray-800">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" /> Invoice: {selectedInvoice.invoiceNo}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto printable-receipt bg-white text-black flex justify-center">
                <ReceiptTemplate invoice={selectedInvoice} />
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 no-print">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Reprint Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
