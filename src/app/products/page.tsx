// src/app/inventory/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Product } from "@/types/product";

interface ItemOption {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stockQty, setStockQty] = useState("");

  // Get current local date string in YYYY-MM-DD format for input default
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Entry Date State (Default is today)
  const [entryDate, setEntryDate] = useState<string>(getTodayDateStr());

  // Supplier State
  const [selectedSupplier, setSelectedSupplier] = useState("");

  // Category States
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<ItemOption[]>([]);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Brand States
  const [brand, setBrand] = useState("");
  const [brands, setBrands] = useState<ItemOption[]>([]);
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Edit Mode States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");

  // Filter & Search & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // 1. Fetch Products
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const items: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Suppliers
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      const supList: Supplier[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
      }));
      setSuppliers(supList);
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch Categories
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

  // 4. Fetch Brands
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

  // Image Compress Function
  const convertAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 300;
          const scaleFactor = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Category එකක් එකතු කිරීම
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addDoc(collection(db, "categories"), {
        name: newCatName.trim(),
        createdAt: new Date(),
      });
      setCategory(newCatName.trim());
      setNewCatName("");
      setShowNewCatInput(false);
    } catch (err) {
      console.error(err);
      alert("Category එක එකතු කිරීමට නොහැකි විය!");
    }
  };

  // Brand එකක් එකතු කිරීම
  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      await addDoc(collection(db, "brands"), {
        name: newBrandName.trim(),
        createdAt: new Date(),
      });
      setBrand(newBrandName.trim());
      setNewBrandName("");
      setShowNewBrandInput(false);
    } catch (err) {
      console.error(err);
      alert("Brand එක එකතු කිරීමට නොහැකි විය!");
    }
  };

  // Form Reset
  const resetForm = () => {
    setEditingId(null);
    setPartNumber("");
    setName("");
    setCostPrice("");
    setSellingPrice("");
    setStockQty("");
    setCurrentImageUrl("");
    setImageFile(null);
    setShowNewCatInput(false);
    setShowNewBrandInput(false);
  };

  // Edit Click
  const handleEditClick = (p: Product & { supplierName?: string }) => {
    setEditingId(p.id || null);
    setPartNumber(p.partNumber || "");
    setName(p.name || "");
    setCostPrice(p.costPrice ? p.costPrice.toString() : "");
    setSellingPrice(p.sellingPrice ? p.sellingPrice.toString() : "");
    setStockQty(p.stockQty ? p.stockQty.toString() : "");
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setSelectedSupplier(p.supplierName || "");
    setCurrentImageUrl(p.imageUrl || "");
    setImageFile(null);

    if (p.createdAt) {
      const pDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const year = pDate.getFullYear();
      const month = String(pDate.getMonth() + 1).padStart(2, "0");
      const day = String(pDate.getDate()).padStart(2, "0");
      setEntryDate(`${year}-${month}-${day}`);
    } else {
      setEntryDate(getTodayDateStr());
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber || !name || !sellingPrice) {
      alert("කරුණාකර අවශ්‍ය විස්තර ලබා දෙන්න!");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = currentImageUrl;

      if (imageFile) {
        imageUrl = await convertAndCompressImage(imageFile);
      }

      let finalDate: Date;
      const todayStr = getTodayDateStr();

      if (entryDate === todayStr) {
        finalDate = new Date();
      } else {
        finalDate = new Date(`${entryDate}T00:00:00`);
      }

      const productData = {
        partNumber,
        name,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        category: category || "Uncategorized",
        brand: brand || "Generic",
        supplierName: selectedSupplier || "General",
        imageUrl,
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), {
          ...productData,
          createdAt: finalDate,
        });
        alert("Product එක සාර්ථකව වෙනස් කළා (Update)!");
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: finalDate,
        });

        // Also record in purchases collection for tracking history
        await addDoc(collection(db, "purchases"), {
          createdAt: finalDate,
          supplierName: selectedSupplier || "Inventory Stock",
          partNumber,
          itemName: name,
          category: category || "Uncategorized",
          brand: brand || "Generic",
          qty: Number(stockQty) || 0,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          totalCost: (Number(costPrice) || 0) * (Number(stockQty) || 0),
          imageUrl,
        });

        alert("Product එක සාර්ථකව එකතු කළා!");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      alert("දෝෂයක් සිදු විය!");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("මෙම Item එක මකා දැමීමට තහවුරු කරන්න?")) {
      await deleteDoc(doc(db, "products", id));
      if (editingId === id) resetForm();
    }
  };

  // Filtering and Sorting Logic
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          filterCategory === "all" || p.category === filterCategory;
        const matchesBrand =
          filterBrand === "all" || p.brand === filterBrand;

        return matchesSearch && matchesCategory && matchesBrand;
      })
      .sort((a, b) => {
        if (sortBy === "low-stock") {
          return (a.stockQty || 0) - (b.stockQty || 0);
        } else if (sortBy === "price-low") {
          return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        } else if (sortBy === "price-high") {
          return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        } else if (sortBy === "name-asc") {
          return (a.name || "").localeCompare(b.name || "");
        } else if (sortBy === "name-desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [products, searchQuery, filterCategory, filterBrand, sortBy]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50/50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">📦 Inventory Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form - Left Side (4 columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-base text-gray-800">
              {editingId ? "✏️ Edit Product" : "+ Add New Product"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Supplier Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Select Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Part Number</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
              placeholder="e.g. ALT-102"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
              placeholder="e.g. Starter Motor"
              required
            />
          </div>

          {/* Date Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Entry Date (දිනය)
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-semibold hover:bg-blue-100 transition whitespace-nowrap"
              >
                + New
              </button>
            </div>

            {showNewCatInput && (
              <div className="flex gap-2 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Brand Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Brand</label>
            <div className="flex gap-2">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                className="px-3 py-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl text-xs font-semibold hover:bg-purple-100 transition whitespace-nowrap"
              >
                + New
              </button>
            </div>

            {showNewBrandInput && (
              <div className="flex gap-2 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="New Brand Name"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddBrand}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Cost Price</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Selling Price</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Stock Qty</label>
            <input
              type="number"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">
              Product Photo {editingId ? "(Optional: වෙනස් කිරීමට පමණක්)" : "(Optional)"}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={`w-full text-white py-2.5 rounded-xl font-semibold text-xs tracking-wide transition shadow-sm disabled:bg-gray-300 ${
              editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {uploading
              ? "Saving..."
              : editingId
              ? "Update Product"
              : "+ Add Product"}
          </button>
        </form>

        {/* Product List Table - Right Side (8 columns) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-base text-gray-800">
              Product List <span className="text-xs text-gray-400 font-normal">({filteredAndSortedProducts.length})</span>
            </h2>

            {/* Search, Filter & Sort Controls */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Search Bar */}
              <input
                type="text"
                placeholder="🔍 Search name or part #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none w-full sm:w-44"
              />

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Brand Filter */}
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Sort By Option */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="latest">Sort: Latest</option>
                <option value="name-asc">Sort: Name (A to Z)</option>
                <option value="name-desc">Sort: Name (Z to A)</option>
                <option value="low-stock">Sort: Low Stock First</option>
                <option value="price-low">Sort: Price (Low to High)</option>
                <option value="price-high">Sort: Price (High to Low)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="p-3">Image</th>
                  <th className="p-3">Part No</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Category / Brand</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-center">Stock</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400 font-medium">
                      No products found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedProducts.map((p: any) => {
                    const isLowStock = (p.stockQty || 0) <= 5;

                    return (
                      <tr
                        key={p.id}
                        className={`transition hover:bg-gray-50/80 ${
                          isLowStock ? "bg-rose-50/40 hover:bg-rose-50/70" : ""
                        }`}
                      >
                        <td className="p-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 object-cover rounded-xl border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                              No Pic
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-semibold text-blue-600 whitespace-nowrap">
                          {p.partNumber}
                        </td>
                        <td className="p-3 font-medium text-gray-800 max-w-[150px] truncate">
                          {p.name}
                        </td>
                        <td className="p-3 font-medium text-gray-600 whitespace-nowrap">
                          {p.supplierName || "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap space-y-1">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-medium block w-fit">
                            {p.category || "General"}
                          </span>
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[10px] font-medium border border-purple-100 block w-fit">
                            {p.brand || "Generic"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-gray-600 whitespace-nowrap">
                          Rs. {p.costPrice ? p.costPrice.toLocaleString() : "0"}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                          Rs. {p.sellingPrice ? p.sellingPrice.toLocaleString() : "0"}
                        </td>
                        <td className="p-3 text-center font-medium">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                              isLowStock
                                ? "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {p.stockQty} {isLowStock && "⚠️ Low"}
                          </span>
                        </td>
                        <td className="p-3 text-center space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(p)}
                            className="text-amber-600 hover:text-amber-700 font-semibold transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => p.id && handleDelete(p.id)}
                            className="text-rose-600 hover:text-rose-700 font-semibold transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}