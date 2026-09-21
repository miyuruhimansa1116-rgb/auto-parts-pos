// src/app/reports/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
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
  ShieldCheck,
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

  // Get User Role and Theme preference on load
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

  // Fetch Sales Data
  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, "sales"), (snapshot) => {
      const list: SaleTransaction[] = [];
      const catSet = new Set<string>();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const invoiceNo = data.invoiceNo || docId.slice(0, 6).toUpperCase();
        const customerName = data.customerName || "Cash Customer";
        const paymentMethod = data.paymentMethod || "Cash";
        const items = Array.isArray(data.items) ? data.items : [];
        
        items.forEach((it: any) => {
          if (it.category) catSet.add(it.category);
        });

        const netTotal = Number(data.netTotal || data.totalAmount || items.reduce((acc, curr) => acc + (Number(curr.total || curr.sellingPrice || 0) * Number(curr.qty || curr.cartQty || 1)), 0));

        list.push({
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
          createdAt: data.createdAt,
        });
      });

      setSales(list);
      setCategories(Array.from(catSet));
    });

    return () => unsubSales();
  }, []);

  // Delete Sale Invoice Function (Restricted to Admin only)
  const handleDeleteSale = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (userRole !== "admin") {
      alert("මෙම ක්‍රියාව (Delete කිරීම) සඳහා ඔබට අවසර නැත! (Admin පමණයි)");
      return;
    }

    if (confirm("මෙම සම්පූර්ණ බිල්පත (Invoice) සහ එහි විකුණුම් වාර්තාව මකා දැමීමට අවශ්‍ය බව තහවුරු කරන්නද?")) {
      try {
        await deleteDoc(doc(db, "sales", docId));
        if (selectedInvoice?.id === docId) setSelectedInvoice(null);
        alert("බිල්පත සාර්ථකව මකා දමන ලදී!");
      } catch (error) {
        console.error("Error deleting sale: ", error);
        alert("බිල්පත මකා දැමීමේදී දෝෂයක් ඇති විය!");
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

  // Category Breakdown Summary
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((it: any) => {
        const cat = it.category || "General";
        const amt = Number(it.total || (Number(it.sellingPrice || 0) * Number(it.cartQty || it.qty || 1)));
        map[cat] = (map[cat] || 0) + amt;
      });
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [filteredSales]);

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
      const d = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "";
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
      <div className="p-6 max-w-[1400px] mx-auto font-sans space-y-6 bg-gray-50/50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 min-h-screen transition-colors duration-200">
        
        {/* Global Print Styles for POS Receipt format */}
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
              padding: 5px !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              font-family: 'Courier New', Courier, monospace !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Sales Analytics & Reports
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> පාරිභෝගිකයින්ගේ විකුණුම් තොරතුරු සහ ආදායම් සවිස්තරාත්මකව විශ්ලේෂණය කරන්න.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 p-2.5 rounded-xl transition shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 text-xs font-semibold"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button
              onClick={exportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>
        </div>

        {/* Filter Options */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm space-y-3 no-print transition-colors">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <span className="text-gray-400 dark:text-gray-300 mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Preset Range:
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
                className={`px-3.5 py-1.5 rounded-lg border text-xs transition font-medium ${
                  dateRange === btn.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
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
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-600" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 block mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-purple-500" /> Filter Payment Method
              </label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card / Online</option>
                <option value="Credit">Credit / Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 block mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" /> Filter Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
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
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 block mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-emerald-500" /> Search Keyword
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice, item, part # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-blue-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" /> TOTAL REVENUE
            </span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
              Rs. {metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">තෝරාගත් කාලසීමාව සඳහා</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-emerald-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> UNITS SOLD
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {metrics.totalQty.toLocaleString()} <span className="text-sm font-semibold">Items</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">අලෙවි වූ එකතු එකතුව</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-purple-600 shadow-sm transition-all hover:shadow-md">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" /> TOTAL INVOICES
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
              {metrics.totalOrders} <span className="text-sm font-semibold">Orders</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">නිකුත් කළ බිල්පත් සංඛ්‍යාව</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" /> ESTIMATED PROFIT
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
              Rs. {metrics.totalProfit.toLocaleString()}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">විකුණුම්වලින් ලැබූ ලාභය</p>
          </div>
        </div>

        {/* Analytics Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm col-span-2">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-blue-500" /> Revenue by Category</span>
              <span className="text-xs font-normal text-gray-400 dark:text-gray-400">Share & Total</span>
            </h3>

            <div className="mt-3 space-y-3">
              {categoryBreakdown.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">දත්ත නොමැත</p>
              ) : (
                categoryBreakdown.map((cat) => {
                  const percentage = metrics.totalRevenue > 0 ? (cat.amount / metrics.totalRevenue) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <span>{cat.name}</span>
                        <span>Rs. {cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2.5 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" /> Top 5 Selling Items
            </h3>

            <div className="mt-3 space-y-3">
              {topItems.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">දත්ත නොමැත</p>
              ) : (
                topItems.map((item, idx) => (
                  <div key={item.name} className="flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-800 pb-2.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center border border-blue-200 dark:border-blue-700">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{item.qty} pcs</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-400">Rs. {item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sales Register Table */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm space-y-3 no-print">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-3">
            <h2 className="font-bold text-base text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-purple-500" /> Sales Register ({filteredSales.length} Invoices)
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-300 font-medium">
              💡 පාරිභෝගික බිල්පත් විස්තර බැලීමට අදාළ Row එක මත Click කරන්න
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-center">Items Count</th>
                  <th className="p-3 text-right">Net Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      තෝරාගත් පරාමිතීන්ට අදාළව විකුණුම් වාර්තා කිසිවක් හමු නොවීය.
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
                        <td className="p-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {sDate.toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {sale.invoiceNo}
                        </td>
                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {sale.customerName}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-gray-800 dark:text-gray-200">
                          {totalItemsCount} items
                        </td>
                        <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          Rs. {sale.netTotal?.toLocaleString()}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedInvoice(sale)}
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border border-blue-200 dark:border-blue-700/60 inline-flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          
                          {userRole === "admin" && (
                            <button
                              onClick={(e) => handleDeleteSale(sale.id, e)}
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border border-red-200 dark:border-red-700/60 inline-flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-600">
              {/* Modal Header */}
              <div className="bg-gray-900 dark:bg-gray-950 text-white p-3.5 flex justify-between items-center no-print border-b border-gray-800">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" /> Invoice: {selectedInvoice.invoiceNo}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-gray-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body / POS Receipt Styled Format */}
              <div className="p-6 overflow-y-auto space-y-3 printable-receipt bg-white text-black font-mono text-xs">
                <div className="text-center border-b pb-2 space-y-0.5">
                  <h2 className="font-bold text-sm tracking-wider">AUTO ELECTRICAL & AC</h2>
                  <p className="text-[10px]">No. 12, Main Street, Battuluoya</p>
                  <p className="text-[10px]">Tel: 07X-XXXXXXX</p>
                  <p className="text-[10px] mt-1">
                    {selectedInvoice.createdAt?.toDate
                      ? selectedInvoice.createdAt.toDate().toLocaleString()
                      : new Date().toLocaleString()}
                  </p>
                </div>

                {/* Items Table matching POS layout */}
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-dashed border-gray-400">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-gray-300">
                    {selectedInvoice.items.map((item: any, idx: number) => {
                      const qty = Number(item.cartQty || item.qty || 1);
                      const price = Number(item.sellingPrice || item.price || 0);
                      return (
                        <tr key={idx}>
                          <td className="py-1 font-medium">
                            {item.name || item.itemName}
                          </td>
                          <td className="py-1 text-center">{qty}</td>
                          <td className="py-1 text-right">{price.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals Section */}
                <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{selectedInvoice.subTotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{selectedInvoice.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs border-t border-dashed border-gray-400 pt-1">
                    <span>TOTAL: Rs.</span>
                    <span>{selectedInvoice.netTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>Cash:</span>
                    <span>{selectedInvoice.cashPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>Balance:</span>
                    <span>{selectedInvoice.balance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-center border-t border-dashed border-gray-400 pt-3 text-[10px] font-bold">
                  THANK YOU COME AGAIN!
                </div>
              </div>

              {/* Modal Footer (Actions) */}
              <div className="bg-gray-50 dark:bg-gray-900 p-3.5 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-2 no-print">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-3.5 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Reprint Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}