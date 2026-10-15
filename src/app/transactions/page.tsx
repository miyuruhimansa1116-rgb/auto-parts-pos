// src/app/transactions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Transaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  supplierName?: string;
  isDadCash?: boolean;
  isReturned?: boolean;
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
  const [isDadCash, setIsDadCash] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const txSnap = await getDocs(collection(db, "transactions"));
      const txList: Transaction[] = [];
      txSnap.forEach((docSnap) => {
        txList.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
      });

      // Sort: Pending Dad Cash first, then by newest date/time
      txList.sort((a, b) => {
        const aPending = a.isDadCash && !a.isReturned ? 1 : 0;
        const bPending = b.isDadCash && !b.isReturned ? 1 : 0;
        if (aPending !== bPending) {
          return bPending - aPending; // Pending ones on top
        }
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });

      setTransactions(txList);

      const purSnap = await getDocs(collection(db, "purchases"));
      const supSet = new Set<string>();
      purSnap.forEach((docSnap) => {
        const data = docSnap.data();
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
        isDadCash: type === "expense" ? isDadCash : false,
        isReturned: false,
        createdAt: serverTimestamp(),
      });

      setAmount("");
      setDescription("");
      setSupplierName("");
      setIsDadCash(false);
      fetchData();
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDadReturn = async (id?: string, currentStatus?: boolean) => {
    if (!id) return;
    try {
      const txRef = doc(db, "transactions", id);
      const willBeReturned = !currentStatus;

      // Update the return status
      await updateDoc(txRef, {
        isReturned: willBeReturned,
      });

      // If it is newly marked as returned, automatically create an Income transaction with the same description and amount
      if (willBeReturned) {
        const txDocSnap = await getDoc(txRef);
        if (txDocSnap.exists()) {
          const txData = txDocSnap.data() as Transaction;
          await addDoc(collection(db, "transactions"), {
            type: "income",
            amount: Number(txData.amount || 0),
            description: `Returned: ${txData.description || "Dad's Cash Return"}`,
            supplierName: "",
            isDadCash: false,
            isReturned: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
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
    <main className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 sm:p-10 font-sans">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 hover:bg-gray-100 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Expenses & Incomes</h1>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">Manage shop expenses, incomes and cash drawer records</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Form Section */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" /> Add New Record
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Fill out the details below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transaction Type</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType("expense");
                      setIsDadCash(false);
                    }}
                    className={`rounded-2xl py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === "expense"
                        ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType("income");
                      setIsDadCash(false);
                    }}
                    className={`rounded-2xl py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === "income"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Income (+)
                  </button>
                </div>
              </div>

              {type === "expense" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Supplier / Seller</label>
                    <select
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- General Expense (No Seller) --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.supplierName}>
                          {s.supplierName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dad's Cash Option Checkbox */}
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 transition">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDadCash}
                        onChange={(e) => setIsDadCash(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                          Dad took money from cash box
                        </span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed block mt-0.5">
                          Mark as pending return. Will be tracked separately until returned.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description / Reason</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details..."
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Saving..." : "Save Record"}
              </button>
            </form>
          </div>

          {/* List Section */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold">Transaction History</h2>
              <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-300">
                Total Records: {transactions.length}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-400 font-medium">Loading records...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 font-medium">No transactions found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="p-4">Type</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Seller / Tag</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Dad's Cash Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold ${
                              tx.type === "income"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                            }`}
                          >
                            {tx.type === "income" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-gray-800 dark:text-gray-200">
                          <span className="font-semibold block">{tx.description}</span>
                          {tx.isDadCash && (
                            <span className="inline-block mt-1 text-[11px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              Dad's Cash Box Withdrawal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {tx.supplierName || "-"}
                        </td>
                        <td
                          className={`p-4 text-right font-black whitespace-nowrap ${
                            tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"} {money(tx.amount)}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {tx.isDadCash ? (
                            <button
                              onClick={() => handleToggleDadReturn(tx.id, tx.isReturned)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                                tx.isReturned
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                  : "bg-amber-500 text-white dark:bg-amber-600 hover:bg-amber-600 shadow-md shadow-amber-500/20 animate-pulse"
                              }`}
                              title="Click to toggle return status"
                            >
                              {tx.isReturned ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" /> Returned
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4" /> Pending Return
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700 font-bold">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition cursor-pointer"
                            title="Delete Record"
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
