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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [entryDate, setEntryDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US');
  });
  const [isFavorite, setIsFavorite] = useState(false);

  // Supplier States
  const [supplier, setSupplier] = useState("");
  const [suppliers, setSuppliers] = useState<ItemOption[]>([]);

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

  // Edit Mode & Modal States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter & Search & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterFavorite, setFilterFavorite] = useState("all");
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
      const supList: ItemOption[] = snapshot.docs.map((d) => ({
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

  // Add category
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
      alert("Failed to add category!");
    }
  };

  // Add brand
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
      alert("Failed to add brand!");
    }
  };

  // Direct Toggle Favorite from Table
  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), {
        isFavorite: !currentStatus,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update favorite status!");
    }
  };

  // Form Reset
  const resetForm = () => {
    setEditingId(null);
    setPartNumber("");
    setName("");
    setSellingPrice("");
    setCostPrice("");
    setStockQty("");
    setSupplier("");
    setIsFavorite(false);
    setCurrentImageUrl("");
    setImageFile(null);
    setShowNewCatInput(false);
    setShowNewBrandInput(false);
    const today = new Date();
    setEntryDate(today.toLocaleDateString('en-US'));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Edit Click
  const handleEditClick = (p: Product & { isFavorite?: boolean; supplier?: string; costPrice?: number; stockQty?: number; entryDate?: string }) => {
    setEditingId(p.id || null);
    setPartNumber(p.partNumber || "");
    setName(p.name || "");
    setSellingPrice(p.sellingPrice ? p.sellingPrice.toString() : "");
    setCostPrice(p.costPrice ? p.costPrice.toString() : "");
    setStockQty(p.stockQty ? p.stockQty.toString() : "");
    setSupplier(p.supplier || "");
    setIsFavorite(p.isFavorite || false);
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setCurrentImageUrl(p.imageUrl || "");
    setEntryDate(p.entryDate || new Date().toLocaleDateString('en-US'));
    setImageFile(null);
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber || !name || !sellingPrice) {
      alert("Please provide required details!");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = currentImageUrl;

      if (imageFile) {
        imageUrl = await convertAndCompressImage(imageFile);
      }

      const productData = {
        partNumber,
        name,
        supplier: supplier || "General Supplier",
        entryDate,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stockQty: Number(stockQty) || 0,
        isFavorite,
        category: category || "Uncategorized",
        brand: brand || "Generic",
        imageUrl,
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), productData);
        alert("Product updated successfully!");
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: new Date(),
        });
        alert("Product added successfully!");
      }

      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("An error occurred!");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(doc(db, "products", id));
      if (editingId === id) resetForm();
    }
  };

  // Filtering and Sorting Logic
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p: any) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          filterCategory === "all" || p.category === filterCategory;
        const matchesBrand =
          filterBrand === "all" || p.brand === filterBrand;
        const matchesFavorite =
          filterFavorite === "all" || (filterFavorite === "favorites" && p.isFavorite);

        return matchesSearch && matchesCategory && matchesBrand && matchesFavorite;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") {
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
  }, [products, searchQuery, filterCategory, filterBrand, filterFavorite, sortBy]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50/50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">📦 Inventory Management</h1>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
        >
          + Add New Product
        </button>
      </div>

      {/* Product List Table - Full Width */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-base text-gray-800 dark:text-gray-100">
            Product List <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({filteredAndSortedProducts.length})</span>
          </h2>

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search name or part #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-medium focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none w-full sm:w-40"
            />

            <select
              value={filterFavorite}
              onChange={(e) => setFilterFavorite(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-medium focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">⭐ All Items</option>
              <option value="favorites">⭐ Favorites Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-medium focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-medium focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-medium focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="latest">Sort: Latest</option>
              <option value="name-asc">Sort: Name (A to Z)</option>
              <option value="name-desc">Sort: Name (Z to A)</option>
              <option value="price-low">Sort: Price (Low to High)</option>
              <option value="price-high">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-700/80 text-gray-500 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-[11px] font-semibold">
                <th className="p-3">Image</th>
                <th className="p-3">Part No</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category / Brand</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500 font-medium">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((p: any) => {
                  return (
                    <tr
                      key={p.id}
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-700/50"
                    >
                      <td className="p-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-9 h-9 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                            No Pic
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {p.partNumber}
                      </td>
                      <td className="p-3 font-medium text-gray-800 dark:text-gray-200 max-w-[150px] truncate">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleFavorite(p.id, p.isFavorite)}
                            className="text-base hover:scale-110 transition cursor-pointer focus:outline-none"
                            title="Click to toggle favorite"
                          >
                            {p.isFavorite ? "⭐" : "☆"}
                          </button>
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap space-y-1">
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md text-[10px] font-medium block w-fit">
                          {p.category || "General"}
                        </span>
                        <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md text-[10px] font-medium border border-purple-100 dark:border-purple-900 block w-fit">
                          {p.brand || "Generic"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        Rs. {p.sellingPrice ? p.sellingPrice.toLocaleString() : "0"}
                      </td>
                      <td className="p-3 text-center space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => p.id && handleDelete(p.id)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold transition"
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

      {/* Modal / Popup for Add/Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-base text-gray-800 dark:text-gray-100">
                {editingId ? "✏️ Edit Product" : "+ Add New Product"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Supplier */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Select Supplier</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                  placeholder="e.g. ALT-102"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                  placeholder="e.g. Starter Motor"
                  required
                />
              </div>

              {/* Favorite Checkbox Option */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="isFavoriteCheckbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 dark:border-gray-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isFavoriteCheckbox" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  ⭐ Mark as Favorite (POS Quick Item)
                </label>
              </div>

              {/* Entry Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Entry Date</label>
                <input
                  type="text"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                />
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Category</label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
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
                    className="px-3 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-xl text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>

                {showNewCatInput && (
                  <div className="flex gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="New Category Name"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20"
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
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Brand</label>
                <div className="flex gap-2">
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
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
                    className="px-3 py-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 rounded-xl text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900 transition whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>

                {showNewBrandInput && (
                  <div className="flex gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="New Brand Name"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/20"
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

              {/* Cost Price & Selling Price side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Cost Price</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Selling Price</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                    required
                  />
                </div>
              </div>

              {/* Stock Qty */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Stock Qty</label>
                <input
                  type="number"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                  Product Photo {editingId ? "(Optional: For change only)" : "(Optional)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-600 transition cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(false);
                  }}
                  className="w-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`w-1/2 text-white py-2.5 rounded-xl font-semibold text-xs tracking-wide transition shadow-sm disabled:bg-gray-300 dark:disabled:bg-gray-700 ${
                    editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {uploading
                    ? "Saving..."
                    : editingId
                    ? "Update Product"
                    : "+ Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
