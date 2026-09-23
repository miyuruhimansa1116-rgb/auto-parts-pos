// src/app/purchases/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  Timestamp,
} from "firebase/firestore";
import {
  Truck,
  Plus,
  Edit3,
  Trash2,
  Search,
  CalendarDays,
  Package,
  Tag,
  Image as ImageIcon,
  Sun,
  Moon,
  X,
  Check,
  DollarSign,
  Hash,
  Layers,
  Store,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

interface ItemOption {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseItem {
  id?: string;
  supplierName: string;
  partNumber: string;
  itemName: string;
  category: string;
  brand: string;
  qty: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  imageUrl?: string;
  isFavorite?: boolean;
  createdAt: Timestamp | Date | string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ItemOption[]>([]);
  const [brands, setBrands] = useState<ItemOption[]>([]);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(false);

  // Form States
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [itemName, setItemName] = useState("");

  const [category, setCategory] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [brand, setBrand] = useState("");
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const [qty, setQty] = useState<number | "">("");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Edit Mode States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldQty, setOldQty] = useState<number>(0);

  // Filter & Search & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  // References for Keyboard Navigation & Focus Management
  const supplierSelectRef = useRef<HTMLSelectElement | null>(null);
  const lastFocusedInputRef = useRef<HTMLElement | null>(null);

  // Date state (Default today)
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayDateStr());

  // Track last focused input element globally for screen touch/click refocusing
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) {
        lastFocusedInputRef.current = e.target;
      }
    };
    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  // Handle global screen click/touch to restore focus to the last active input
  const handleScreenClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest("select") && !target.closest("table") && lastFocusedInputRef.current) {
      lastFocusedInputRef.current.focus();
    }
  };

  // 1. Fetch Purchases
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "purchases"), (snapshot) => {
      const list: PurchaseItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PurchaseItem, "id">),
      }));
      setPurchases(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Suppliers, Categories, Brands
  useEffect(() => {
    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      setSuppliers(snapshot.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });

    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });

    const unsubBrands = onSnapshot(collection(db, "brands"), (snapshot) => {
      setBrands(snapshot.docs.map((d) => ({ id: d.id, name: d.data().name })));
    });

    return () => {
      unsubSuppliers();
      unsubCategories();
      unsubBrands();
    };
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

  // Quick Add Category
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
      console.error("Add Category Error:", err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async () => {
    if (!category) return;
    if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
      try {
        const catObj = categories.find((c) => c.name === category);
        if (catObj && catObj.id) {
          await deleteDoc(doc(db, "categories", catObj.id));
          setCategory("");
          alert("Category deleted successfully!");
        }
      } catch (err) {
        console.error("Delete Category Error:", err);
        alert("Error deleting category.");
      }
    }
  };

  // Quick Add Brand
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
      console.error("Add Brand Error:", err);
    }
  };

  // Delete Brand
  const handleDeleteBrand = async () => {
    if (!brand) return;
    if (confirm(`Are you sure you want to delete the brand "${brand}"?`)) {
      try {
        const brandObj = brands.find((b) => b.name === brand);
        if (brandObj && brandObj.id) {
          await deleteDoc(doc(db, "brands", brandObj.id));
          setBrand("");
          alert("Brand deleted successfully!");
        }
      } catch (err) {
        console.error("Delete Brand Error:", err);
        alert("Error deleting brand.");
      }
    }
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setOldQty(0);
    setSelectedSupplier("");
    setPartNumber("");
    setItemName("");
    setCategory("");
    setBrand("");
    setQty("");
    setCostPrice("");
    setSellingPrice("");
    setIsFavorite(false);
    setImageFile(null);
    setCurrentImageUrl("");
    setShowNewCatInput(false);
    setShowNewBrandInput(false);
    setPurchaseDate(getTodayDateStr());
  };

  // Edit Click Handler
  const handleEditClick = (p: PurchaseItem) => {
    setEditingId(p.id || null);
    setOldQty(p.qty || 0);
    setSelectedSupplier(p.supplierName || "");
    setPartNumber(p.partNumber || "");
    setItemName(p.itemName || "");
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setQty(p.qty ?? "");
    setCostPrice(p.costPrice ?? "");
    setSellingPrice(p.sellingPrice ?? "");
    setIsFavorite(p.isFavorite || false);
    setCurrentImageUrl(p.imageUrl || "");
    setImageFile(null);

    if (p.createdAt) {
      const pDate =
        typeof (p.createdAt as Timestamp)?.toDate === "function"
          ? (p.createdAt as Timestamp).toDate()
          : new Date(p.createdAt as string | Date);
      const year = pDate.getFullYear();
      const month = String(pDate.getMonth() + 1).padStart(2, "0");
      const day = String(pDate.getDate()).padStart(2, "0");
      setPurchaseDate(`${year}-${month}-${day}`);
    } else {
      setPurchaseDate(getTodayDateStr());
    }
  };

  // Safeguarded Delete Click Handler
  const handleDelete = async (p: PurchaseItem) => {
    if (!p.id) return;

    const confirmMsg = p.itemName 
      ? `Are you sure you want to delete the purchase record for "${p.itemName}"?` 
      : "Are you sure you want to delete this purchase record?";

    if (confirm(confirmMsg)) {
      try {
        if (p.partNumber && typeof p.qty === "number" && !isNaN(p.qty)) {
          const q = query(
            collection(db, "products"),
            where("partNumber", "==", p.partNumber.trim())
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const prodDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, "products", prodDoc.id), {
              stockQty: increment(-p.qty),
              updatedAt: new Date(),
            });
          }
        }

        await deleteDoc(doc(db, "purchases", p.id));
        alert("Record deleted successfully!");

        if (editingId === p.id) {
          resetForm();
        }
      } catch (error) {
        console.error("Delete Error: ", error);
        alert("Error occurred while deleting: " + (error as Error).message);
      }
    }
  };

  // Handle Submit Purchase & Update Inventory Stock
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedSupplier ||
      !partNumber ||
      !itemName ||
      qty === "" ||
      costPrice === "" ||
      sellingPrice === ""
    ) {
      alert("Please fill in all required information!");
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
      if (purchaseDate === todayStr) {
        finalDate = new Date();
      } else {
        finalDate = new Date(`${purchaseDate}T00:00:00`);
      }

      const totalCost = Number(qty) * Number(costPrice);
      const finalBrand = brand && brand.trim() !== "" ? brand.trim() : "No Brand";

      const purchaseData = {
        supplierName: selectedSupplier,
        partNumber: partNumber.trim(),
        itemName: itemName.trim(),
        category: category || "General",
        brand: finalBrand,
        qty: Number(qty),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        totalCost,
        imageUrl,
        isFavorite,
        createdAt: finalDate,
      };

      if (editingId) {
        await updateDoc(doc(db, "purchases", editingId), purchaseData);

        const qtyDiff = Number(qty) - oldQty;
        const q = query(
          collection(db, "products"),
          where("partNumber", "==", partNumber.trim())
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const prodDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "products", prodDoc.id), {
            stockQty: increment(qtyDiff),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            category: category || prodDoc.data().category,
            brand: finalBrand,
            isFavorite,
            ...(imageUrl ? { imageUrl } : {}),
            updatedAt: new Date(),
          });
        }

        alert("Purchase record updated successfully!");
        resetForm();
      } else {
        await addDoc(collection(db, "purchases"), purchaseData);

        const q = query(
          collection(db, "products"),
          where("partNumber", "==", partNumber.trim())
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const prodDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "products", prodDoc.id), {
            stockQty: increment(Number(qty)),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            category: category || prodDoc.data().category,
            brand: finalBrand,
            isFavorite,
            ...(imageUrl ? { imageUrl } : {}),
            updatedAt: new Date(),
          });
        } else {
          await addDoc(collection(db, "products"), {
            partNumber: partNumber.trim(),
            name: itemName.trim(),
            category: category || "General",
            brand: finalBrand,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            stockQty: Number(qty),
            imageUrl,
            isFavorite,
            createdAt: finalDate,
          });
        }

        alert("Purchase saved successfully and stock updated!");
        
        // Clear transaction form fields but keep supplier, category, brand, and date for quick entry
        setEditingId(null);
        setOldQty(0);
        setPartNumber("");
        setItemName("");
        setQty("");
        setCostPrice("");
        setSellingPrice("");
        setImageFile(null);
        setCurrentImageUrl("");
        
        // Focus back to supplier select box and select it for keyboard/flow continuation
        if (supplierSelectRef.current) {
          supplierSelectRef.current.focus();
          supplierSelectRef.current.select();
        }
      }

    } catch (error) {
      console.error("Purchase Error: ", error);
      alert("An error occurred!");
    } finally {
      setUploading(false);
    }
  };

  // Filter & Sort Logic for Purchases Table
  const filteredAndSortedPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchesSearch =
          (p.itemName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.partNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.supplierName || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          filterCategory === "all" || p.category === filterCategory;
        const matchesBrand = filterBrand === "all" || p.brand === filterBrand;

        return matchesSearch && matchesCategory && matchesBrand;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") {
          return (a.itemName || "").localeCompare(b.itemName || "");
        } else if (sortBy === "name-desc") {
          return (b.itemName || "").localeCompare(a.itemName || "");
        } else if (sortBy === "price-low") {
          return (a.costPrice || 0) - (b.costPrice || 0);
        } else if (sortBy === "price-high") {
          return (b.costPrice || 0) - (a.costPrice || 0);
        }

        const getTime = (dateVal: any) => {
          if (!dateVal) return 0;
          if (typeof dateVal.toDate === "function") return dateVal.toDate().getTime();
          return new Date(dateVal).getTime();
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
      });
  }, [purchases, searchQuery, filterCategory, filterBrand, sortBy]);

  return (
    <div 
      onClick={handleScreenClick}
      className={`${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} min-h-screen transition-colors duration-300`}
    >
      <div className="p-6 max-w-[1400px] mx-auto font-sans space-y-6">
        
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
              <Truck className="w-7 h-7 text-blue-600 dark:text-blue-400" /> Supplier Purchases & Restocks
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record stock purchases from suppliers and automatically update inventory.
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2 text-xs font-semibold shadow-sm"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Purchase Form */}
          <form
            onSubmit={handleSubmitPurchase}
            className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 h-fit"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                {editingId ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Sparkles className="w-4 h-4 text-blue-500" />}
                {editingId ? "Edit Purchase" : "Record New Purchase"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center gap-1 transition"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Store className="w-3.5 h-3.5 text-blue-500" /> Select Supplier
              </label>
              <select
                ref={supplierSelectRef}
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const formElements = e.currentTarget.form?.elements;
                    if (formElements) {
                      for (let i = 0; i < formElements.length; i++) {
                        if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                          (formElements[i + 1] as HTMLElement).focus();
                          break;
                        }
                      }
                    }
                  }
                }}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                autoComplete="off"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-500" /> Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const formElements = e.currentTarget.form?.elements;
                    if (formElements) {
                      for (let i = 0; i < formElements.length; i++) {
                        if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                          (formElements[i + 1] as HTMLElement).focus();
                          break;
                        }
                      }
                    }
                  }
                }}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 transition"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <Hash className="w-3.5 h-3.5 text-blue-500" /> Part Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. H4-BULB"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. LED Headlight"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-500" /> Category
              </label>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
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
                  tabIndex={-1}
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-bold hover:bg-blue-100 whitespace-nowrap flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
                {category && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleDeleteCategory}
                    className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold hover:bg-rose-100 whitespace-nowrap flex items-center gap-1 transition"
                    title="Delete selected category"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
              {showNewCatInput && (
                <div className="flex gap-2 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="New Category"
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleAddCategory}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-purple-500" /> Brand (If blank, saved as No Brand)
              </label>
              <div className="flex gap-2">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
                >
                  <option value="">-- No Brand / Select Brand --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                  className="px-3 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 rounded-xl text-xs font-bold hover:bg-purple-100 whitespace-nowrap flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
                {brand && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleDeleteBrand}
                    className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold hover:bg-rose-100 whitespace-nowrap flex items-center gap-1 transition"
                    title="Delete selected brand"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
              {showNewBrandInput && (
                <div className="flex gap-2 mt-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="New Brand"
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleAddBrand}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5 text-blue-500" /> Quantity
              </label>
              <input
                type="number"
                placeholder="0"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value === "" ? "" : Number(e.target.value))
                }
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const formElements = e.currentTarget.form?.elements;
                    if (formElements) {
                      for (let i = 0; i < formElements.length; i++) {
                        if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                          (formElements[i + 1] as HTMLElement).focus();
                          break;
                        }
                      }
                    }
                  }
                }}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                autoComplete="off"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cost Price (Rs.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={costPrice}
                  onChange={(e) =>
                    setCostPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Selling Price (Rs.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={sellingPrice}
                  onChange={(e) =>
                    setSellingPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const formElements = e.currentTarget.form?.elements;
                      if (formElements) {
                        for (let i = 0; i < formElements.length; i++) {
                          if (formElements[i] === e.currentTarget && formElements[i + 1]) {
                            (formElements[i + 1] as HTMLElement).focus();
                            break;
                          }
                        }
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Favorite Checkbox in Form - tabIndex={-1} added */}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <input
                type="checkbox"
                id="isFavorite"
                tabIndex={-1}
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isFavorite" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                ⭐ Mark as Favorite Item
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Product Photo{" "}
                {editingId ? "(Optional: For change only)" : "(Optional)"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-600 dark:file:text-blue-400 file:cursor-pointer file:font-semibold"
              />
              
              {(imageFile || currentImageUrl) && (
                <div className="mt-2.5 flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : currentImageUrl}
                    alt="Product Preview"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    {imageFile ? "New image selected" : "Current saved image"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md text-xs mt-3 disabled:bg-slate-400 flex items-center justify-center gap-2 ${
                editingId
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {uploading ? (
                "Saving..."
              ) : editingId ? (
                <>
                  <Edit3 className="w-4 h-4" /> Update Purchase
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save Purchase & Update Stock
                </>
              )}
            </button>
          </form>

          {/* Right: Purchase History Table */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" /> Purchase History ({filteredAndSortedPurchases.length})
              </h2>

              {/* Search, Filter & Sort Controls */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, part #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="p-2 pl-8 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 w-full transition"
                    autoComplete="off"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
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
                  onFocus={(e) => e.target.select()}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
                >
                  <option value="all">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="relative flex items-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="p-2 pl-7 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
                  >
                    <option value="latest">Sort: Latest (Default)</option>
                    <option value="name-asc">Sort: Name (A to Z)</option>
                    <option value="name-desc">Sort: Name (Z to A)</option>
                    <option value="price-low">Sort: Cost (Low to High)</option>
                    <option value="price-high">Sort: Cost (High to Low)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Image</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Part # / Item</th>
                    <th className="p-3">Category / Brand</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Cost Price</th>
                    <th className="p-3 text-right">Total Cost</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {filteredAndSortedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-slate-500">
                        No purchase records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedPurchases.map((p) => {
                      const pDate =
                        typeof (p.createdAt as Timestamp)?.toDate === "function"
                          ? (p.createdAt as Timestamp).toDate()
                          : new Date(p.createdAt as string | Date);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.itemName}
                                className="w-9 h-9 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                                No
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            {pDate.toLocaleDateString()}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {p.supplierName}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!p.id) return;
                                  try {
                                    await updateDoc(doc(db, "purchases", p.id), {
                                      isFavorite: !p.isFavorite,
                                    });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-base hover:scale-110 transition cursor-pointer focus:outline-none"
                                title="Click to toggle favorite"
                              >
                                {p.isFavorite ? "⭐" : "☆"}
                              </button>
                              <div>
                                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block">
                                  {p.partNumber}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">{p.itemName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-semibold block w-fit mb-1">
                              {p.category || "General"}
                            </span>
                            <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-purple-200 dark:border-purple-900 block w-fit">
                              {p.brand || "No Brand"}
                            </span>
                          </td>
                          <td className="p-3 text-center font-extrabold text-slate-800 dark:text-slate-200">{p.qty}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            Rs. {p.costPrice?.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            Rs. {p.totalCost?.toLocaleString()}
                          </td>
                          <td className="p-3 text-center space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-1 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="text-rose-600 dark:text-rose-400 hover:underline font-bold inline-flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
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
    </div>
  );
}
