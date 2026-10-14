// src/app/expenses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ArrowUpDown } from "lucide-react";

interface Transaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  supplierName?: string;
  createdAt: any;
}

interface Supplier {
  id: string;
  supplierName?: string;
}

const money = (val: number) => `Rs. ${Number(val || 0).toLocaleString("en-LK")}`;

export default function ExpensesAndIncomesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch transactions
      const txSnap = await getDocs(collection(db, "transactions"));
      const txList: Transaction[] = [];
      txSnap.forEach((doc) => {
        txList.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(
        txList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );

      // Fetch suppliers from purchases
      const purSnap = await getDocs(collection(db, "purchases"));
      const supSet = new Set<string>();
      purSnap.forEach((doc) => {
        const data = doc.data();
        if (data.supplierName) supSet.add(data.supplierName);
      });
      setSuppliers(Array.from(supSet).map((name) => ({ id: name, supplierName: name })));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      setSubmitting(true);
      await addDoc(collection(db, "transactions"), {
        type,
        amount: Number(amount),
        description,
        supplierName: type === "expense" ? supplierName : "",
        createdAt: serverTimestamp(),
      });

      setAmount("");
      setDescription("");
      setSupplierName("");
      fetchData();
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
      fetchData();
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black">Expenses & Additional Incomes</h1>
              <p className="text-xs text-slate-400">Manage extra expenses and shop incomes</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
            <h2 className="text-base font-bold mb-4">Add New Record</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Transaction Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      type === "expense"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      type === "income"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Income (+)
                  </button>
                </div>
              </div>

              {type === "expense" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500">Select Supplier / Seller</label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- General Expense (No Seller) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.supplierName}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500">Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Description / Reason</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Saving..." : "Save Record"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <h2 className="text-base font-bold mb-4">Transaction History</h2>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-slate-400">No records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Seller</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              tx.type === "income"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 font-medium">{tx.description}</td>
                        <td className="py-3 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          {tx.supplierName || "-"}
                        </td>
                        <td
                          className={`py-3 text-right font-black ${
                            tx.type === "income" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"} {money(tx.amount)}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
