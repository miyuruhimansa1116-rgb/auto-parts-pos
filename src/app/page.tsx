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
} from "lucide-react";

interface SaleItem {
  id?: string;
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
    const now = Date.now();

    return sales.filter((sale) => {
      const saleDate = getDate(sale.createdAt);
      if (!saleDate) return false;
      const saleTime = saleDate.getTime();

      if (timeFilter === "1hour") return now - saleTime <= 60 * 60 * 1000;
      if (timeFilter === "1day") return now - saleTime <= 24 * 60 * 60 * 1000;
      if (timeFilter === "1week")
        return now - saleTime <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === "1year")
        return now - saleTime <= 365 * 24 * 60 * 60 * 1000;

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
    const now = Date.now();

    return purchases.filter((purchase) => {
      const date = getDate(purchase.createdAt);
      if (!date) return false;
      const time = date.getTime();

      if (timeFilter === "1hour") return now - time <= 60 * 60 * 1000;
      if (timeFilter === "1day") return now - time <= 24 * 60 * 60 * 1000;
      if (timeFilter === "1week")
        return now - time <= 7 * 24 * 60 * 60 * 1000;
      if (timeFilter === "1year")
        return now - time <= 365 * 24 * 60 * 60 * 1000;

      if (timeFilter === "custom") {
        if (!startDateTime || !endDateTime) return true;
        const start = new Date(startDateTime).getTime();
        const end = new Date(endDateTime).getTime();
        return time >= start && time <= end;
      }

      return true;
    });
  }, [purchases, timeFilter, startDateTime, endDateTime]);

  const { periodRevenue, periodProfit, periodSalesCount, totalItemsSold } =
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

      return {
        periodRevenue: revenue,
        periodProfit: profit,
        periodSalesCount: filteredSales.length,
        totalItemsSold: itemsCount,
      };
    }, [filteredSales, productsMap]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="mx-auto max-w-[1450px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Business Dashboard
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Good day 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Here&apos;s what&apos;s happening with your shop.
            </p>
          </div>

          <div className="flex gap-2">
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

            <div className="flex flex-wrap items-center gap-2">
              {[
                ["1hour", "1 Hour"],
                ["1day", "Today"],
                ["1week", "7 Days"],
                ["1year", "1 Year"],
                ["all", "All Time"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTimeFilter(value)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
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
                className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
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

        {/* KPI Cards */}
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "Revenue",
              value: money(periodRevenue),
              note: "Sales income",
              icon: CircleDollarSign,
              iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
            },
            {
              title: "Estimated Profit",
              value: money(periodProfit),
              note: "Selling price − cost",
              icon: TrendingUp,
              iconClass:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
            },
            {
              title: "Bills",
              value: periodSalesCount.toLocaleString(),
              note: `${totalItemsSold.toLocaleString()} items sold`,
              icon: Receipt,
              iconClass:
                "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
            },
            {
              title: "Products",
              value: totalProducts.toLocaleString(),
              note: "Inventory items",
              icon: Boxes,
              iconClass:
                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            },
            {
              title: "Low Stock",
              value: lowStockCount.toLocaleString(),
              note: lowStockCount ? "Needs attention" : "Stock is healthy",
              icon: AlertTriangle,
              iconClass:
                lowStockCount > 0
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.title}
                </p>
                <p className="mt-1 truncate text-xl font-black tracking-tight">
                  {card.value}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{card.note}</p>
              </div>
            );
          })}
        </section>

        {/* Analytics + Quick Actions */}
        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
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

            <div className="mt-7 flex h-44 items-end gap-2 sm:gap-4">
              {salesByDay.map((day) => {
                const height =
                  day.total === 0
                    ? 5
                    : Math.max(10, (day.total / maxDailySales) * 100);

                return (
                  <div
                    key={day.label}
                    className="flex h-full flex-1 flex-col justify-end"
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Quick actions</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Common tasks at your fingertips
                </p>
              </div>
              <Activity className="h-4 w-4 text-slate-300" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
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
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone as string]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold">
                        {label as string}
                      </p>
                      <ArrowRight className="mt-1 h-3 w-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main tables */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
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
                    Products with 5 units or less
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
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-5 py-3">Part Number</th>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-center">Stock</th>
                      <th className="px-5 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lowStockProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-3 text-xs font-bold text-blue-600 dark:text-blue-300">
                          {p.partNumber || "-"}
                        </td>
                        <td className="px-5 py-3">
                          <p className="max-w-[180px] truncate text-xs font-bold">
                            {p.name || "N/A"}
                          </p>
                          {p.brand && (
                            <p className="mt-0.5 text-[9px] text-slate-400">
                              {p.brand}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {p.category || "General"}
                          </span>
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
                            Bill #{String(sale.id || index + 1).slice(-8)}
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
        </section>

        {/* Purchases */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            <p className="px-5 py-10 text-center text-xs text-slate-400">
              No supplier purchases recorded for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Item</th>
                    <th className="px-5 py-3 text-center">Qty</th>
                    <th className="px-5 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentPurchases.map((p, idx) => {
                    const date = getDate(p.createdAt);
                    return (
                      <tr
                        key={p.id || idx}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-3 text-[10px] text-slate-500">
                          {date ? date.toLocaleString("en-LK") : "-"}
                        </td>
                        <td className="px-5 py-3 text-xs font-bold">
                          {p.supplierName || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {p.itemName || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-bold">
                          {p.qty || 0}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-black text-amber-600 dark:text-amber-300">
                          {money(Number(p.totalCost || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-5 flex flex-col gap-1 px-1 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Dashboard data is loaded directly from your Firebase records.</span>
          <span className="font-semibold">Sampath Auto Parts • Management</span>
        </footer>
      </div>
    </main>
  );
}
