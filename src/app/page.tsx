// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  Receipt,
  Boxes,
  AlertTriangle,
  Truck,
  Clock3,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  CircleDollarSign,
  ShoppingBag,
  Activity,
  Flame,
  X,
} from "lucide-react";

interface SaleItem {
  id?: string;
  invoiceNumber?: string;
  invoiceNo?: string;
  billNumber?: string;
  createdAt: any;
  netTotal: number;
  subTotal: number;
  discount: number;
  cashPaid: number;
  balance: number;
  items: any[];
}

interface PurchaseItem {
  id?: string;
  createdAt: any;
  supplierName?: string;
  itemName?: string;
  qty?: number;
  totalCost?: number;
}

interface ProductItem {
  id?: string;
  name?: string;
  partNumber?: string;
  stockQty?: number;
  sellingPrice?: number;
  costPrice?: number;
  category?: string;
  brand?: string;
}

const money = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK")}`;

const getDate = (value: any) => {
  if (!value) return null;
  try {
    return value?.toDate ? value.toDate() : new Date(value);
  } catch {
    return null;
  }
};

const getSaleTotal = (sale: SaleItem) =>
  Number(sale.netTotal ?? sale.subTotal ?? 0);

export default function DashboardPage() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<ProductItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [productsMap, setProductsMap] = useState<
    Record<string, { buyingPrice: number; sellingPrice: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [timeFilter, setTimeFilter] = useState("1day");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  
  const [deductExpenses, setDeductExpenses] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setLoading(true);

      const prodSnapshot = await getDocs(collection(db, "products"));
      setTotalProducts(prodSnapshot.size);

      let lowStock = 0;
      const lowStockList: ProductItem[] = [];
      const pMap: Record<
        string,
        { buyingPrice: number; sellingPrice: number }
      > = {};

      prodSnapshot.forEach((doc) => {
        const data = doc.data() as ProductItem;
        const stock = Number(data.stockQty || 0);

        if (stock <= 5) {
          lowStock++;
          lowStockList.push({ id: doc.id, ...data, stockQty: stock });
        }

        const bPrice = Number(
          (data as any).buyingPrice ??
            (data as any).costPrice ??
            (data as any).cost ??
            (data as any).buyPrice ??
            0
        );
        const sPrice = Number(
          (data as any).sellingPrice ??
            (data as any).price ??
            (data as any).sellPrice ??
            0
        );

        const priceInfo = { buyingPrice: bPrice, sellingPrice: sPrice };

        pMap[doc.id] = priceInfo;
        if (data.partNumber) pMap[data.partNumber] = priceInfo;
        if (data.name) pMap[data.name] = priceInfo;
      });

      setLowStockCount(lowStock);
      setLowStockProducts(
        lowStockList.sort(
          (a, b) => Number(a.stockQty || 0) - Number(b.stockQty || 0)
        )
      );
      setProductsMap(pMap);

      const salesSnapshot = await getDocs(collection(db, "sales"));
      const salesList: SaleItem[] = [];
      salesSnapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() } as SaleItem);
      });
      setSales(
        salesList.sort(
          (a, b) =>
            (getDate(b.createdAt)?.getTime() || 0) -
            (getDate(a.createdAt)?.getTime() || 0)
        )
      );

      try {
        const purchasesSnapshot = await getDocs(collection(db, "purchases"));
        const purchasesList: PurchaseItem[] = [];
        purchasesSnapshot.forEach((doc) => {
          purchasesList.push({ id: doc.id, ...doc.data() } as PurchaseItem);
        });
        setPurchases(
          purchasesList.sort(
            (a, b) =>
              (getDate(b.createdAt)?.getTime() || 0) -
              (getDate(a.createdAt)?.getTime() || 0)
          )
        );
      } catch {
        setPurchases([]);
      }
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      const saleDate = getDate(sale.createdAt);
      if (!saleDate) return false;
      const saleTime = saleDate.getTime();

      if (timeFilter === "1hour") return now.getTime() - saleTime <= 60 * 60 * 1000;
      
      // Today: අද දවසේ මධ්‍යම රාත්‍රියේ සිට
      if (timeFilter === "1day") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return saleTime >= startOfToday;
      }

      // Yesterday: ඊයේ දවසේ මධ්‍යම රාත්‍රියේ සිට අද දවසේ මධ්‍යම රාත්‍රිය දක්වා
      if (timeFilter === "yesterday") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
        return saleTime >= startOfYesterday && saleTime < startOfToday;
      }

      if (timeFilter === "1week")
        return now.getTime() - saleTime <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === "1year")
        return now.getTime() - saleTime <= 365 * 24 * 60 * 60 * 1000;

      if (timeFilter === "custom") {
        if (!startDateTime || !endDateTime) return true;
        const start = new Date(startDateTime).getTime();
        const end = new Date(endDateTime).getTime();
        return saleTime >= start && saleTime <= end;
      }

      return true;
    });
  }, [sales, timeFilter, startDateTime, endDateTime]);

  const filteredPurchases = useMemo(() => {
    const now = new Date();

    return purchases.filter((purchase) => {
      const date = getDate(purchase.createdAt);
      if (!date) return false;
      const time = date.getTime();

      if (timeFilter === "1hour") return now.getTime() - time <= 60 * 60 * 1000;
      
      // Today: අද දවසේ මධ්‍යම රාත්‍රියේ සිට
      if (timeFilter === "1day") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return time >= startOfToday;
      }

      // Yesterday: ඊයේ දවසේ පරාසය
      if (timeFilter === "yesterday") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
        return time >= startOfYesterday && time < startOfToday;
      }

      if (timeFilter === "1week")
        return now.getTime() - time <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === "1year")
        return now.getTime() - time <= 365 * 24 * 60 * 60 * 1000;

      if (timeFilter === "custom") {
        if (!startDateTime || !endDateTime) return true;
        const start = new Date(startDateTime).getTime();
        const end = new Date(endDateTime).getTime();
        return time >= start && time <= end;
      }

      return true;
    });
  }, [purchases, timeFilter, startDateTime, endDateTime]);

  const { periodRevenue, periodGrossProfit, periodCostOfGoodsSold, periodSalesCount, totalItemsSold } =
    useMemo(() => {
      let revenue = 0;
      let profit = 0;
      let itemsCount = 0;

      filteredSales.forEach((sale) => {
        revenue += getSaleTotal(sale);

        if (Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const qty = Number(item.cartQty || item.qty || item.quantity) || 1;
            itemsCount += qty;

            const pInfo =
              productsMap[item.id] ||
              productsMap[item.partNumber] ||
              productsMap[item.name] || {
                buyingPrice: 0,
                sellingPrice: 0,
              };

            const sellingPrice = Number(
              item.sellingPrice ??
                item.price ??
                item.sellPrice ??
                pInfo.sellingPrice ??
                0
            );
            const buyingPrice = Number(
              item.buyingPrice ??
                item.costPrice ??
                item.cost ??
                item.buyPrice ??
                pInfo.buyingPrice ??
                0
            );

            profit += (sellingPrice - buyingPrice) * qty;
          });
        }
      });

      const costOfGoodsSold = revenue - profit;

      return {
        periodRevenue: revenue,
        periodGrossProfit: profit,
        periodCostOfGoodsSold: costOfGoodsSold,
        periodSalesCount: filteredSales.length,
        totalItemsSold: itemsCount,
      };
    }, [filteredSales, productsMap]);

  const { allTimeProfit, allTimePurchasesCost } = useMemo(() => {
    let totalProfit = 0;
    sales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const qty = Number(item.cartQty || item.qty || item.quantity) || 1;
          const pInfo =
            productsMap[item.id] ||
            productsMap[item.partNumber] ||
            productsMap[item.name] || {
              buyingPrice: 0,
              sellingPrice: 0,
            };

          const sellingPrice = Number(item.sellingPrice ?? item.price ?? item.sellPrice ?? pInfo.sellingPrice ?? 0);
          const buyingPrice = Number(item.buyingPrice ?? item.costPrice ?? item.cost ?? item.buyPrice ?? pInfo.buyingPrice ?? 0);

          totalProfit += (sellingPrice - buyingPrice) * qty;
        });
      }
    });

    let totalPurchasesCost = 0;
    purchases.forEach((p) => {
      totalPurchasesCost += Number(p.totalCost || 0);
    });

    return {
      allTimeProfit: totalProfit,
      allTimePurchasesCost: totalPurchasesCost,
    };
  }, [sales, purchases, productsMap]);

  const periodProfit = deductExpenses ? allTimeProfit - allTimePurchasesCost : periodGrossProfit;

  const topSellingItems = useMemo(() => {
    const itemMap: Record<
      string,
      { name: string; partNumber: string; category: string; qty: number; revenue: number }
    > = {};

    filteredSales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const qty = Number(item.cartQty || item.qty || item.quantity) || 1;
          const name = item.name || item.itemName || "N/A";
          const partNumber = item.partNumber || "-";
          const category = item.category || "General";
          const key = item.id || partNumber || name;

          const sellingPrice = Number(
            item.sellingPrice ?? item.price ?? item.sellPrice ?? 0
          );

          if (!itemMap[key]) {
            itemMap[key] = { name, partNumber, category, qty: 0, revenue: 0 };
          }
          itemMap[key].qty += qty;
          itemMap[key].revenue += sellingPrice * qty;
        });
      }
    });

    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales]);

  const recentSales = filteredSales.slice(0, 6);
  const recentPurchases = filteredPurchases.slice(0, 6);

  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });

    return days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);

      const total = sales
        .filter((sale) => {
          const d = getDate(sale.createdAt);
          return d && d >= day && d < next;
        })
        .reduce((sum, sale) => sum + getSaleTotal(sale), 0);

      return {
        label: day.toLocaleDateString("en-LK", { weekday: "short" }),
        total,
      };
    });
  }, [sales]);

  const maxDailySales = Math.max(...salesByDay.map((d) => d.total), 1);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* Custom Animated Loader */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
            <div className="absolute h-14 w-14 rounded-full border-4 border-emerald-500/20 border-b-emerald-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/50 animate-pulse">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-extrabold tracking-wide text-slate-700 dark:text-slate-200 animate-pulse">
              Loading Dashboard...
            </p>
            <p className="text-[11px] text-slate-400">Please wait while data is being prepared</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-[1450px] px-3 py-4 sm:px-6 lg:px-8 lg:py-7">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Business Dashboard
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Good day
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Here&apos;s what&apos;s happening with your shop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fetchDashboardData(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              href="/pos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <ShoppingCart className="h-4 w-4" />
              New Bill
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Filter */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <CalendarDays className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Reporting period
                </p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Sales & purchases
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[
                ["1hour", "1 Hour"],
                ["1day", "Today"],
                ["yesterday", "Yesterday"],
                ["1week", "7 Days"],
                ["1year", "1 Year"],
                ["all", "All Time"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTimeFilter(value)}
                  className={`rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${
                    timeFilter === value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setTimeFilter("custom")}
                className={`rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${
                  timeFilter === "custom"
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {timeFilter === "custom" && (
            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-500">
                From
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                To
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Quick actions</p>
                <p className="text-[11px] text-slate-500">Common tasks at your fingertips</p>
              </div>
              <Activity className="h-4 w-4 text-slate-300" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                ["/pos", ShoppingCart, "New Sale", "blue"],
                ["/products", Package, "Products", "emerald"],
                ["/reports", BarChart3, "Reports", "violet"],
                ["/purchases", Truck, "Purchase Stock", "amber"],
              ].map(([href, Icon, label, tone]) => {
                const toneClasses: Record<string, string> = {
                  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
                  emerald:
                    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
                  violet:
                    "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
                  amber:
                    "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
                };

                return (
                  <Link
                    href={href as string}
                    key={label as string}
                    className="group flex items-center gap-2.5 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone as string]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">
                        {label as string}
                      </p>
                      <ArrowRight className="mt-0.5 h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Revenue */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <CircleDollarSign className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Revenue
            </p>
            <p className="mt-1 truncate text-xl font-black tracking-tight">
              {money(periodRevenue)}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Sales income</p>
          </div>

          {/* Estimated Profit / Net Profit Card */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {deductExpenses ? "Net Profit" : "Estimated Profit"}
              </p>
              <p className="mt-1 truncate text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {money(periodProfit)}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                {deductExpenses 
                  ? `All-Time Profit (${money(allTimeProfit)}) − Purchases (${money(allTimePurchasesCost)})`
                  : `Gross profit margin`}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Deduct Purchases
              </span>
              <button
                onClick={() => setDeductExpenses(!deductExpenses)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  deductExpenses ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
                title="Deduct purchase expenses from profit"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    deductExpenses ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sold Items Buying Cost Card */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <DollarSign className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sold Items Cost
            </p>
            <p className="mt-1 truncate text-xl font-black tracking-tight">
              {money(periodCostOfGoodsSold)}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Total buying price</p>
          </div>

          {/* Bills */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                <Receipt className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bills
            </p>
            <p className="mt-1 truncate text-xl font-black tracking-tight">
              {periodSalesCount.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">{totalItemsSold.toLocaleString()} items sold</p>
          </div>

          {/* Products */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Boxes className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Products
            </p>
            <p className="mt-1 truncate text-xl font-black tracking-tight">
              {totalProducts.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Inventory items</p>
          </div>

          {/* Low Stock */}
          <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                lowStockCount > 0
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Low Stock
            </p>
            <p className="mt-1 truncate text-xl font-black tracking-tight">
              {lowStockCount.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">{lowStockCount ? "Needs attention" : "Stock is healthy"}</p>
          </div>
        </section>

        {/* Sales Overview Chart */}
        <section className="mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Sales overview</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Revenue generated over the last 7 days
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-7 flex h-44 items-end gap-2 sm:gap-4 overflow-x-auto pb-2">
              {salesByDay.map((day) => {
                const height =
                  day.total === 0
                    ? 5
                    : Math.max(10, (day.total / maxDailySales) * 100);

                return (
                  <div
                    key={day.label}
                    className="flex h-full min-w-[36px] flex-1 flex-col justify-end"
                  >
                    <div className="mb-2 text-center text-[9px] font-bold text-slate-400">
                      {day.total > 0
                        ? `${Math.round(day.total / 1000)}k`
                        : ""}
                    </div>
                    <div className="flex h-full items-end">
                      <div
                        className="w-full rounded-t-lg bg-blue-500 transition-all duration-500 hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                        title={money(day.total)}
                      />
                    </div>
                    <p className="mt-2 text-center text-[10px] font-bold text-slate-400">
                      {day.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Top-Selling Items & Low Stock (Low stock & Supplier purchases side by side as requested) */}
        <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Top Selling Items */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black">Top selling items</h2>
                  <p className="text-[10px] text-slate-400">
                    Most sold items in selected period
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                Top {topSellingItems.length}
              </span>
            </div>

            {topSellingItems.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
                <ShoppingBag className="mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs font-bold">No sales records</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  No items sold during this period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-5 py-3">Part No. / Product</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-center">Qty Sold</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topSellingItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-3">
                          <p className="max-w-[200px] truncate text-xs font-bold">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[9px] text-blue-600 dark:text-blue-300 font-semibold">
                            {item.partNumber}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-[10px] font-black text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                            {item.qty} units
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {money(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low stock */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black">Low stock</h2>
                  <p className="text-[10px] text-slate-400">
                    Products with 5 units or less (Click row for details)
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  lowStockCount
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                }`}
              >
                {lowStockCount ? `${lowStockCount} items` : "All good"}
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold">Stock looks healthy</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  No products currently need restocking.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-5 py-3">Part Number</th>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3 text-center">Stock</th>
                      <th className="px-5 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lowStockProducts.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-slate-800/50"
                        title="Click to view details"
                      >
                        <td className="px-5 py-3 text-xs font-bold text-blue-600 dark:text-blue-300">
                          {p.partNumber || "-"}
                        </td>
                        <td className="px-5 py-3">
                          <p className="max-w-[160px] truncate text-xs font-bold">
                            {p.name || "N/A"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600 dark:bg-red-950/40 dark:text-red-300">
                            {p.stockQty || 0}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-black">
                          {money(Number(p.sellingPrice || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Recent sales & Supplier Purchases side by side */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Recent sales */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black">Recent bills</h2>
                  <p className="text-[10px] text-slate-400">
                    Latest sales in this period
                  </p>
                </div>
              </div>
              <Link
                href="/reports"
                className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-300"
              >
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentSales.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold">No sales found</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    No bills match the selected period.
                  </p>
                </div>
              ) : (
                recentSales.map((sale, index) => {
                  const date = getDate(sale.createdAt);
                  const itemCount = Array.isArray(sale.items)
                    ? sale.items.reduce(
                        (sum, item) =>
                          sum +
                          (Number(
                            item.cartQty || item.qty || item.quantity
                          ) || 1),
                        0
                      )
                    : 0;

                  return (
                    <div
                      key={sale.id || index}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {String(sale.invoiceNumber || sale.invoiceNo || sale.billNumber || sale.id)}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {date
                              ? date.toLocaleString("en-LK", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Unknown date"}{" "}
                            · {itemCount} items
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-xs font-black text-emerald-600 dark:text-emerald-300">
                        {money(getSaleTotal(sale))}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Supplier Purchases (Placed directly next to Recent Sales / Low Stock) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black">Supplier purchases</h2>
                  <p className="text-[10px] text-slate-400">
                    Recent stock restocks for the selected period
                  </p>
                </div>
              </div>
              <Clock3 className="h-4 w-4 text-slate-300" />
            </div>

            {recentPurchases.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center text-center px-5">
                <p className="text-xs text-slate-400">
                  No supplier purchases recorded for this period.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPurchases.map((p, idx) => {
                  const date = getDate(p.createdAt);
                  return (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          <Truck className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {p.supplierName || "N/A"}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-400">
                            {date ? date.toLocaleString("en-LK") : "-"} · Qty: {p.qty || 0}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-xs font-black text-amber-600 dark:text-amber-300">
                        {money(Number(p.totalCost || 0))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Low Stock Item Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Low Stock Item Details</h3>
                    <p className="text-[10px] text-slate-400">Product inventory info</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedProduct.name || "N/A"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Part Number</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-300 mt-0.5">{selectedProduct.partNumber || "-"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Stock</p>
                    <p className="text-xs font-black text-red-600 dark:text-red-400 mt-0.5">{selectedProduct.stockQty || 0} Units</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selling Price</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{money(Number(selectedProduct.sellingPrice || 0))}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedProduct.category || "General"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Manage Products
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-5 flex flex-col gap-1 px-1 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Dashboard data is loaded directly from your Firebase records.</span>
          <span className="font-semibold">Sampath Auto Parts • Management</span>
        </footer>
      </div>
    </main>
  );
}