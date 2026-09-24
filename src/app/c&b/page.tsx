"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Tags, Folder, Award } from "lucide-react";

interface ItemOption {
  id: string;
  name: string;
}

export default function CategoriesBrandsPage() {
  const [categories, setCategories] = useState<ItemOption[]>([]);
  const [brands, setBrands] = useState<ItemOption[]>([]);

  const [newCatName, setNewCatName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingBrand, setLoadingBrand] = useState(false);

  // Fetch Categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const catList: ItemOption[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
      }));
      setCategories(catList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Brands
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "brands"), (snapshot) => {
      const brandList: ItemOption[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
      }));
      setBrands(brandList);
    });
    return () => unsubscribe();
  }, []);

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setLoadingCat(true);
      await addDoc(collection(db, "categories"), {
        name: newCatName.trim(),
        createdAt: new Date(),
      });
      setNewCatName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add category!");
    } finally {
      setLoadingCat(false);
    }
  };

  // Add Brand
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      setLoadingBrand(true);
      await addDoc(collection(db, "brands"), {
        name: newBrandName.trim(),
        createdAt: new Date(),
      });
      setNewBrandName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add brand!");
    } finally {
      setLoadingBrand(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteDoc(doc(db, "categories", id));
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (id: string) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      await deleteDoc(doc(db, "brands", id));
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-[1300px] mx-auto font-sans bg-gray-50/60 dark:bg-gray-950 min-h-screen text-gray-800 dark:text-gray-100 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Tags className="w-6 h-6" />
            </span>
            Categories & Brands Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize and manage your inventory categories and product brands efficiently.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Categories Section */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2.5">
                <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Categories</span>
                <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                  {categories.length}
                </span>
              </h2>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-3">
              <input
                type="text"
                placeholder="Enter new category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                required
              />
              <button
                type="submit"
                disabled={loadingCat}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition whitespace-nowrap shadow-sm shadow-blue-500/20 disabled:bg-gray-400 cursor-pointer"
              >
                {loadingCat ? "Adding..." : "+ Add"}
              </button>
            </form>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {categories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-400 font-medium">No categories found yet.</p>
                </div>
              ) : (
                categories.map((c) => (
                  <div 
                    key={c.id} 
                    className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-blue-50/40 dark:hover:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 text-sm transition group"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{c.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold opacity-90 group-hover:opacity-100 transition px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Brands Section */}
        <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2.5">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Brands</span>
                <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">
                  {brands.length}
                </span>
              </h2>
            </div>

            <form onSubmit={handleAddBrand} className="flex gap-3">
              <input
                type="text"
                placeholder="Enter new brand name..."
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition"
                required
              />
              <button
                type="submit"
                disabled={loadingBrand}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition whitespace-nowrap shadow-sm shadow-purple-500/20 disabled:bg-gray-400 cursor-pointer"
              >
                {loadingBrand ? "Adding..." : "+ Add"}
              </button>
            </form>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {brands.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-400 font-medium">No brands found yet.</p>
                </div>
              ) : (
                brands.map((b) => (
                  <div 
                    key={b.id} 
                    className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-purple-50/40 dark:hover:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 text-sm transition group"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{b.name}</span>
                    <button
                      onClick={() => handleDeleteBrand(b.id)}
                      className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold opacity-90 group-hover:opacity-100 transition px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
