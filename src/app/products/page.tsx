// src/app/products/page.tsx
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
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Product } from "@/types/product";
import {
  Package,
  Plus,
  Search,
  Star,
  Edit,
  Trash2,
  X,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Check,
  ChevronDown,
  MapPin,
} from "lucide-react";

interface ItemOption {
  id: string;
  name: string;
}

interface RackOption {
  id: string;
  rackNumber: string;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [lowStockLimit, setLowStockLimit] = useState("5");
  const [rackNumber, setRackNumber] = useState(""); // Rack Number State
  const [racks, setRacks] = useState<RackOption[]>([]); // Available Racks List
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

  // Stock Update Quick Modal States
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addStockQty, setAddStockQty] = useState("");

  // Custom Searchable Dropdown States for Stock Update
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockFilterCategory, setStockFilterCategory] = useState("all");
  const [stockFilterBrand, setStockFilterBrand] = useState("all");
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

  // View Details Modal State
  const [viewProduct, setViewProduct] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

  // 5. Fetch Racks
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "racks"), (snapshot) => {
      const rackList: RackOption[] = snapshot.docs.map((d) => ({
        id: d.id,
        rackNumber: d.data().rackNumber,
        description: d.data().description,
      }));
      setRacks(rackList);
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
  const toggleFavorite = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
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
    setLowStockLimit("5");
    setRackNumber("");
    setSupplier("");
    setIsFavorite(false);
    setCurrentImageUrl("");
    setImageFile(null);
    setShowNewCatInput(false);
    setShowNewBrandInput(false);
    const today = new Date();
    setEntryDate(today.toLocaleDateString('en-US'));
  };

  // Edit Click
  const handleEditClick = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id || null);
    setPartNumber(p.partNumber || "");
    setName(p.name || "");
    setSellingPrice(p.sellingPrice ? p.sellingPrice.toString() : "");
    setCostPrice(p.costPrice ? p.costPrice.toString() : "");
    setStockQty(p.stockQty ? p.stockQty.toString() : "");
    setLowStockLimit(p.lowStockLimit ? p.lowStockLimit.toString() : "5");
    setRackNumber(p.rackNumber || "");
    setSupplier(p.supplier || "");
    setIsFavorite(p.isFavorite || false);
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setCurrentImageUrl(p.imageUrl || "");
    setEntryDate(p.entryDate || new Date().toLocaleDateString('en-US'));
    setImageFile(null);
    setIsModalOpen(true);
  };

  // Submit Product Form (साथ සමඟ purchases collection එක update කිරීම)
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
        lowStockLimit: Number(lowStockLimit) || 5,
        rackNumber: rackNumber ? rackNumber.trim().toUpperCase() : "",
        isFavorite,
        category: category || "Uncategorized",
        brand: brand || "Generic",
        imageUrl,
        updatedAt: new Date(),
      };

      if (editingId) {
        // 1. Update Product document
        await updateDoc(doc(db, "products", editingId), productData);

        // 2. Update matching documents in 'purchases' collection where partNumber matches
        const purchasesRef = collection(db, "purchases");
        const q = query(purchasesRef, where("partNumber", "==", partNumber));
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map((purchaseDoc) =>
          updateDoc(doc(db, "purchases", purchaseDoc.id), {
            name: name,
            supplier: supplier || "General Supplier",
            costPrice: Number(costPrice) || 0,
            sellingPrice: Number(sellingPrice) || 0,
            category: category || "Uncategorized",
            brand: brand || "Generic",
            updatedAt: new Date(),
          })
        );

        await Promise.all(updatePromises);

        alert("Product and related purchases updated successfully!");
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

  // Handle Quick Stock Update Submission
  const handleStockUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !addStockQty) {
      alert("Please select a product and enter stock quantity!");
      return;
    }

    try {
      const selectedProduct: any = products.find((p) => p.id === selectedProductId);
      if (!selectedProduct) return;

      const currentQty = Number(selectedProduct.stockQty) || 0;
      const addedQty = Number(addStockQty) || 0;
      const newTotalQty = currentQty + addedQty;

      await updateDoc(doc(db, "products", selectedProductId), {
        stockQty: newTotalQty,
        updatedAt: new Date(),
      });

      alert(`Stock updated successfully! New total: ${newTotalQty} units`);
      setSelectedProductId("");
      setAddStockQty("");
      setStockSearchQuery("");
      setStockFilterCategory("all");
      setStockFilterBrand("all");
      setIsStockModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update stock!");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(doc(db, "products", id));
      if (editingId === id) resetForm();
    }
  };

  // Handle Row Click to View Full Details
  const handleRowClick = (product: any) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  // Sorted & Filtered Products for Stock Update Dropdown (A to Z by Name)
  const sortedStockProducts = useMemo(() => {
    return [...products]
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
      .filter((p: any) => {
        const queryText = stockSearchQuery.toLowerCase();
        const matchesQuery =
          (p.name && p.name.toLowerCase().includes(queryText)) ||
          (p.partNumber && p.partNumber.toLowerCase().includes(queryText));
        
        const matchesCategory =
          stockFilterCategory === "all" || p.category === stockFilterCategory;
        
        const matchesBrand =
          stockFilterBrand === "all" || p.brand === stockFilterBrand;

        return matchesQuery && matchesCategory && matchesBrand;
      });
  }, [products, stockSearchQuery, stockFilterCategory, stockFilterBrand]);

  // Selected Product Object for Display
  const selectedProductObj = useMemo(() => {
    return products.find((p: any) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Filtering and Sorting Logic for Main Table
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p: any) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.rackNumber && p.rackNumber.toLowerCase().includes(searchQuery.toLowerCase()));
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
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto font-sans bg-gray-50/50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-100 pb-20">
      
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400 shrink-0" /> 
          <span>Products Management</span>
        </h1>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
          
          <button
            onClick={() => {
              setSelectedProductId("");
              setAddStockQty("");
              setStockSearchQuery("");
              setStockFilterCategory("all");
              setStockFilterBrand("all");
              setIsStockModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Update Stock
          </button>
        </div>
      </div>

      {/* Product List Card */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        
        {/* Controls Container */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-base sm:text-lg text-gray-800 dark:text-gray-100">
            Product List <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 font-normal">({filteredAndSortedProducts.length})</span>
          </h2>

          {/* Search, Filter & Sort Controls */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full lg:w-auto items-center">
            
            {/* Search Bar */}
            <div className="col-span-2 sm:w-72 relative">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, part #, rack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 sm:h-11 pl-10 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <select
              value={filterFavorite}
              onChange={(e) => setFilterFavorite(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 font-medium outline-none"
            >
              <option value="all">All Items</option>
              <option value="favorites">Favorites Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 font-medium outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 font-medium outline-none"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 font-medium outline-none"
            >
              <option value="latest">Sort: Latest</option>
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Table / List Container */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left text-sm border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-xs font-bold">
                <th className="p-3.5">Image</th>
                <th className="p-3.5">Part No</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">Rack Number</th>
                <th className="p-3.5">Stock Qty</th>
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 dark:text-gray-500 font-medium text-sm">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((p: any) => {
                  const stockLimit = Number(p.lowStockLimit) || 5;
                  const currentStock = Number(p.stockQty) || 0;
                  const isLowStock = currentStock <= stockLimit;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className="transition hover:bg-blue-50/40 dark:hover:bg-gray-700/50 cursor-pointer"
                      title="Click to view full details"
                    >
                      <td className="p-3.5">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 font-medium">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {p.partNumber}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(p.id, p.isFavorite, e)}
                            className="text-lg hover:scale-110 transition cursor-pointer focus:outline-none"
                            title="Click to toggle favorite"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                p.isFavorite
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          </button>
                          <span className="truncate">{p.name}</span>
                        </div>
                      </td>
                      {/* Rack Number Column in Table */}
                      <td className="p-3.5 whitespace-nowrap">
                        {p.rackNumber ? (
                          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {p.rackNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-xs ${
                          currentStock === 0 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                            : isLowStock 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        }`}>
                          {currentStock} Units {isLowStock && "(Low)"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        Rs. {p.sellingPrice ? p.sellingPrice.toLocaleString() : "0"}
                      </td>
                      <td className="p-3.5 text-center space-x-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleEditClick(p, e)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-bold transition inline-flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={(e) => p.id && handleDelete(p.id, e)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
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

      {/* Quick Stock Update Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-md space-y-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" /> Quick Stock Update
              </h2>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Product (A to Z)</label>
                
                <div 
                  onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 flex justify-between items-center cursor-pointer"
                >
                  <span className="truncate">
                    {selectedProductObj 
                      ? `${selectedProductObj.partNumber} - ${selectedProductObj.name} (Stock: ${selectedProductObj.stockQty || 0})`
                      : "-- Search or Select Product --"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                </div>

                {/* Dropdown Menu */}
                {isStockDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[350px] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 space-y-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search name or part no..."
                          value={stockSearchQuery}
                          onChange={(e) => setStockSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none text-gray-800 dark:text-gray-100"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={stockFilterCategory}
                          onChange={(e) => setStockFilterCategory(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-700 dark:text-gray-200 outline-none font-medium"
                        >
                          <option value="all">All Categories</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>

                        <select
                          value={stockFilterBrand}
                          onChange={(e) => setStockFilterBrand(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-700 dark:text-gray-200 outline-none font-medium"
                        >
                          <option value="all">All Brands</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-56 divide-y divide-gray-50 dark:divide-gray-700">
                      {sortedStockProducts.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No products found</div>
                      ) : (
                        sortedStockProducts.map((p: any) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setIsStockDropdownOpen(false);
                              setStockSearchQuery("");
                              setStockFilterCategory("all");
                              setStockFilterBrand("all");
                            }}
                            className={`p-3 text-sm hover:bg-emerald-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between transition ${
                              selectedProductId === p.id ? 'bg-emerald-50/80 dark:bg-gray-700/80 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-gray-700 dark:text-gray-200 font-medium'
                            }`}
                          >
                            <span className="truncate">
                              <strong className="font-mono text-blue-600 dark:text-blue-400">{p.partNumber}</strong> - {p.name} <span className="text-gray-400 font-normal">(Stock: {p.stockQty || 0})</span>
                            </span>
                            {selectedProductId === p.id && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Quantity to Add (+)</label>
                <input
                  type="number"
                  value={addStockQty}
                  onChange={(e) => setAddStockQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="w-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition shadow-sm"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Details Modal */}
      {isViewModalOpen && viewProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Product Details</span>
                {viewProduct.isFavorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" />}
              </h2>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center my-3">
              {viewProduct.imageUrl ? (
                <img
                  src={viewProduct.imageUrl}
                  alt={viewProduct.name}
                  className="w-36 h-36 object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                />
              ) : (
                <div className="w-36 h-36 bg-gray-100 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm text-gray-400 font-semibold">
                  No Image
                </div>
              )}
            </div>

            <div className="bg-gray-50/60 dark:bg-gray-700/50 p-4 rounded-xl space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Product Name:</span>
                <span className="font-bold text-gray-900 dark:text-white text-right">{viewProduct.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Part Number:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{viewProduct.partNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Rack Number:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {viewProduct.rackNumber || "Not Assigned"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Category:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{viewProduct.category || "General"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Brand:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">{viewProduct.brand || "Generic"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Cost Price:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">Rs. {viewProduct.costPrice ? viewProduct.costPrice.toLocaleString() : "0"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Selling Price:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {viewProduct.sellingPrice ? viewProduct.sellingPrice.toLocaleString() : "0"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Stock Quantity:</span>
                <span className={`font-bold px-2.5 py-1 rounded-md text-sm ${
                  Number(viewProduct.stockQty || 0) === 0 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                    : Number(viewProduct.stockQty || 0) <= (Number(viewProduct.lowStockLimit) || 5)
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {viewProduct.stockQty || 0} Units
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsViewModalOpen(false)}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {editingId ? <Edit className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Supplier</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  required
                />
              </div>

              {/* Rack Number Input / Selection in Add/Edit Form */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rack Number</label>
                <input
                  type="text"
                  list="racks-list-form"
                  value={rackNumber}
                  onChange={(e) => setRackNumber(e.target.value)}
                  placeholder="Type or select rack number..."
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                />
                <datalist id="racks-list-form">
                  {racks.map((r) => (
                    <option key={r.id} value={r.rackNumber}>
                      {r.rackNumber} {r.description ? `- ${r.description}` : ""}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="isFavoriteCheckbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 cursor-pointer"
                />
                <label htmlFor="isFavoriteCheckbox" className="text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 inline" /> Mark as Favorite (POS Quick Item)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Category</label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="px-3.5 py-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> New
                  </button>
                </div>

                {showNewCatInput && (
                  <div className="flex gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="New Category Name"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl text-sm outline-none text-gray-800 dark:text-gray-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brand</label>
                <div className="flex gap-2">
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                    className="px-3.5 py-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> New
                  </button>
                </div>

                {showNewBrandInput && (
                  <div className="flex gap-2 mt-2 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="New Brand Name"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl text-sm outline-none text-gray-800 dark:text-gray-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddBrand}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cost Price</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Selling Price</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Stock Qty</label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200" title="මෙම ප්‍රමාණයට වඩා අඩු වූ විට Low stock ලෙස පෙන්වයි">Low Stock Alert Qty</label>
                  <input
                    type="number"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 block">Product Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(false);
                  }}
                  className="w-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`w-1/2 text-white py-3 rounded-xl font-bold text-sm transition shadow-sm disabled:bg-gray-300 ${
                    editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {uploading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
