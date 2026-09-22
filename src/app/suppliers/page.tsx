// src/app/suppliers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Building2, Plus, Trash2, Loader2, Phone, MapPin, User } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      const list: Supplier[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Supplier[];
      setSuppliers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter the supplier name!");
      return;
    }

    try {
      await addDoc(collection(db, "suppliers"), {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        createdAt: new Date(),
      });
      setName("");
      setPhone("");
      setAddress("");
      alert("Supplier added successfully!");
    } catch (err) {
      console.error(err);
      alert("An error occurred!");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      await deleteDoc(doc(db, "suppliers", id));
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto font-sans space-y-6 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold">Supplier Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form - Left Side */}
        <form onSubmit={handleAddSupplier} className="lg:col-span-4 bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">Add New Supplier</h2>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Supplier Name
            </label>
            <input
              type="text"
              placeholder="e.g. Auto City Traders"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. 0771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Address
            </label>
            <textarea
              placeholder="e.g. Main Street, Puttalam"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow-sm text-xs flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Save Supplier
          </button>
        </form>

        {/* Suppliers List - Right Side */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">
              Suppliers List <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({suppliers.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Address</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading...
                      </div>
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400 dark:text-gray-500">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{s.name}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{s.phone || "-"}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{s.address || "-"}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}