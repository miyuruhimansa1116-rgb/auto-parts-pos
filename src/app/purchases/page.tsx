// src/app/purchases/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  setDoc,
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
  DollarSign,
  Hash,
  Layers,
  Store,
  SlidersHorizontal,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  BellRing,
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
  lowStockAlert?: number;
  totalCost: number;
  imageUrl?: string;
  isFavorite?: boolean;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ItemOption[]>([]);
  const [brands, setBrands] = useState<ItemOption[]>([]);

  const [darkMode, setDarkMode] = useState(false);

  const [showForm, setShowForm] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("purchases_show_form");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("purchases_show_form", JSON.stringify(showForm));
  }, [showForm]);

  // Supplier, Purchase Date, Category සහ Brand සඳහා localStorage භාවිතා නොකරයි (රීෆ්‍රෙශ් කරන තුරු හෝ වෙනස් කරන තුරු ස්ථාවරව පවතී)
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayDateStr());
  const [category, setCategory] = useState<string>("");
  const [brand, setBrand] = useState<string>("");

  // ඉන්වෙන්ටරි සහ අනෙකුත් වෙනස් වන දත්ත පමණක් localStorage හි රඳවා ගනී
  const [partNumber, setPartNumber] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("form_partNumber") || "";
    return "";
  });
  const [itemName, setItemName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("form_itemName") || "";
    return "";
  });
  const [qty, setQty] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("form_qty");
      return val !== null && val !== "" ? Number(val) : "";
    }
    return "";
  });
  const [costPrice, setCostPrice] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("form_costPrice");
      return val !== null && val !== "" ? Number(val) : "";
    }
    return "";
  });
  const [sellingPrice, setSellingPrice] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("form_sellingPrice");
      return val !== null && val !== "" ? Number(val) : "";
    }
    return "";
  });
  const [lowStockAlert, setLowStockAlert] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("form_lowStockAlert");
      return val !== null && val !== "" ? Number(val) : 5;
    }
    return 5;
  });

  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("form_isFavorite") === "true";
    return false;
  });

  useEffect(() => {
    localStorage.setItem("form_partNumber", partNumber);
    localStorage.setItem("form_itemName", itemName);
    localStorage.setItem("form_qty", qty.toString());
    localStorage.setItem("form_costPrice", costPrice.toString());
    localStorage.setItem("form_sellingPrice", sellingPrice.toString());
    localStorage.setItem("form_lowStockAlert", lowStockAlert.toString());
    localStorage.setItem("form_isFavorite", String(isFavorite));
  }, [partNumber, itemName, qty, costPrice, sellingPrice, lowStockAlert, isFavorite]);

  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("form_editingId") || null;
    return null;
  });
  const [oldQty, setOldQty] = useState<number>(0);

  useEffect(() => {
    if (editingId) {
      localStorage.setItem("form_editingId", editingId);
    } else {
      localStorage.removeItem("form_editingId");
    }
  }, [editingId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("purchases_sort_by") || "modified";
    }
    return "modified";
  });

  useEffect(() => {
    localStorage.setItem("purchases_sort_by", sortBy);
  }, [sortBy]);

  const supplierSelectRef = useRef<HTMLSelectElement | null>(null);
  const lastFocusedInputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) {
        lastFocusedInputRef.current = e.target;
      }
    };
    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  const handleScreenClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("button") && !target.closest("select") && !target.closest("table") && lastFocusedInputRef.current) {
      lastFocusedInputRef.current.focus();
    }
  };

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

  const resetForm = () => {
    setEditingId(null);
    setOldQty(0);
    // මෙහිදී selectedSupplier, purchaseDate, category සහ brand clear නොකර තබා ඇත.
    setPartNumber("");
    setItemName("");
    setQty("");
    setCostPrice("");
    setSellingPrice("");
    setLowStockAlert(5);
    setIsFavorite(false);
    setImageFile(null);
    setImageUrlState("");
    setErrorMessage(null);
    setCategorySearch("");
    setBrandSearch("");
    
    localStorage.removeItem("form_partNumber");
    localStorage.removeItem("form_itemName");
    localStorage.removeItem("form_qty");
    localStorage.removeItem("form_costPrice");
    localStorage.removeItem("form_sellingPrice");
    localStorage.removeItem("form_lowStockAlert");
    localStorage.removeItem("form_isFavorite");
    localStorage.removeItem("form_editingId");
  };

  const setImageUrlState = (url: string) => {
    setCurrentImageUrl(url);
  };

  const handleEditClick = (p: PurchaseItem) => {
    setShowForm(true); 
    setEditingId(p.id || null);
    setOldQty(p.qty || 0);
    setSelectedSupplier(p.supplierName || "");
    setCategory(p.category || "");
    setBrand(p.brand || "");
    setPartNumber(p.partNumber || "");
    setItemName(p.itemName || "");
    setQty(p.qty ?? "");
    setCostPrice(p.costPrice ?? "");
    setSellingPrice(p.sellingPrice ?? "");
    setLowStockAlert(p.lowStockAlert ?? 5);
    setIsFavorite(p.isFavorite || false);
    setCurrentImageUrl(p.imageUrl || "");
    setImageFile(null);
    setErrorMessage(null);

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

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !selectedSupplier ||
      !partNumber ||
      !itemName ||
      qty === "" ||
      costPrice === "" ||
      sellingPrice === ""
    ) {
      setErrorMessage("කරුණාකර අවශ්‍ය සියලුම තොරතුරු සම්පූර්ණ කරන්න!");
      return;
    }

    try {
      setUploading(true);

      const trimmedPartNumber = partNumber.trim();
      const trimmedItemName = itemName.trim();

      const existingMatch = purchases.find((p) => {
        if (editingId && p.id === editingId) return false;
        
        return (
          p.partNumber?.trim().toLowerCase() === trimmedPartNumber.toLowerCase() ||
          p.itemName?.trim().toLowerCase() === trimmedItemName.toLowerCase()
        );
      });

      if (existingMatch) {
        setUploading(false);
        setErrorMessage("This part number or item name already exists in another purchase! Please enter a different one.");
        return;
      }

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
      const finalLowStockAlert = lowStockAlert === "" ? 5 : Number(lowStockAlert);
      const nowTimestamp = new Date();

      const purchaseData = {
        supplierName: selectedSupplier,
        partNumber: trimmedPartNumber,
        itemName: trimmedItemName,
        category: category || "General",
        brand: finalBrand,
        qty: Number(qty),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        lowStockAlert: finalLowStockAlert,
        totalCost,
        imageUrl,
        isFavorite,
        createdAt: finalDate,
        updatedAt: nowTimestamp,
      };

      if (editingId) {
        await updateDoc(doc(db, "purchases", editingId), purchaseData);

        const qtyDiff = Number(qty) - oldQty;
        const q = query(
          collection(db, "products"),
          where("partNumber", "==", trimmedPartNumber)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const prodDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "products", prodDoc.id), {
            name: trimmedItemName,
            stockQty: increment(qtyDiff),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            lowStockAlert: finalLowStockAlert,
            category: category || prodDoc.data().category,
            brand: finalBrand,
            isFavorite,
            ...(imageUrl ? { imageUrl } : {}),
            updatedAt: nowTimestamp,
          });
        }

        alert("Purchase record and product details updated successfully!");
        resetForm();
      } else {
        await setDoc(doc(db, "purchases", trimmedPartNumber), purchaseData);

        const q = query(
          collection(db, "products"),
          where("partNumber", "==", trimmedPartNumber)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const prodDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "products", prodDoc.id), {
            name: trimmedItemName,
            stockQty: increment(Number(qty)),
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            lowStockAlert: finalLowStockAlert,
            category: category || prodDoc.data().category,
            brand: finalBrand,
            isFavorite,
            ...(imageUrl ? { imageUrl } : {}),
            updatedAt: nowTimestamp,
          });
        } else {
          await setDoc(doc(db, "products", trimmedPartNumber), {
            partNumber: trimmedPartNumber,
            name: trimmedItemName,
            category: category || "General",
            brand: finalBrand,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            stockQty: Number(qty),
            lowStockAlert: finalLowStockAlert,
            imageUrl,
            isFavorite,
            createdAt: finalDate,
            updatedAt: nowTimestamp,
          });
        }

        alert("Purchase saved successfully and stock updated!");
        resetForm();
        
        if (supplierSelectRef.current) {
          supplierSelectRef.current.focus();
        }
      }

    } catch (error) {
      console.error("Purchase Error: ", error);
      setErrorMessage("දෝෂයක් සිදු විය: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

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

        if (sortBy === "modified") {
          const timeB = getTime(b.updatedAt) || getTime(b.createdAt);
          const timeA = getTime(a.updatedAt) || getTime(a.createdAt);
          return timeB - timeA;
        }

        if (sortBy === "latest") {
          const timeB = getTime(b.createdAt);
          const timeA = getTime(a.createdAt);
          return timeB - timeA;
        }

        return getTime(b.createdAt) - getTime(a.createdAt);
      });
  }, [purchases, searchQuery, filterCategory, filterBrand, sortBy]);

  const filteredCategoriesForDropdown = useMemo(() => {
    return categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categories, categorySearch]);

  const filteredBrandsForDropdown = useMemo(() => {
    return brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brands, brandSearch]);

  return (
    <div 
      onClick={handleScreenClick}
      className={`${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} min-h-screen transition-colors duration-300`}
    >
      <div className="p-6 max-w-[1400px] mx-auto font-sans space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
              <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" /> Supplier Purchases & Restocks
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Record stock purchases from suppliers and automatically update inventory.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                }
                setShowForm(!showForm);
              }}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition flex items-center gap-2 shadow-sm ${
                showForm 
                  ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-100" 
                  : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {showForm ? (
                <>
                  <EyeOff className="w-4 h-4" /> Hide Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add New Purchase
                </>
              )}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${showForm ? "lg:grid-cols-12" : "lg:grid-cols-1"} gap-6 transition-all duration-300`}>
          {showForm && (
            <form
              onSubmit={handleSubmitPurchase}
              className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 h-fit"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  {editingId ? <Edit3 className="w-5 h-5 text-amber-500" /> : <Sparkles className="w-5 h-5 text-blue-500" />}
                  {editingId ? "Edit Purchase" : "Record New Purchase"}
                </h2>
                <div className="flex items-center gap-1.5">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center gap-1 transition"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="text-sm bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-lg hover:bg-rose-100 font-bold flex items-center gap-1 transition"
                    title="Close form"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMessage}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-700 dark:text-rose-300 hover:opacity-75 font-bold p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Store className="w-4 h-4 text-blue-500" /> Select Supplier
                </label>
                <select
                  ref={supplierSelectRef}
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CalendarDays className="w-4 h-4 text-blue-500" /> Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Hash className="w-4 h-4 text-blue-500" /> Part Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. H4-BULB"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-4 h-4 text-blue-500" /> Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LED Headlight"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-4 h-4 text-blue-500" /> Category
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition">
                  <div className="relative border-b border-slate-200 dark:border-slate-800">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search category..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="" className="dark:bg-slate-900">-- Select Category --</option>
                    {filteredCategoriesForDropdown.map((c) => (
                      <option key={c.id} value={c.name} className="dark:bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-4 h-4 text-purple-500" /> Brand (If blank, saved as No Brand)
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition">
                  <div className="relative border-b border-slate-200 dark:border-slate-800">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search brand..."
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-3 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="" className="dark:bg-slate-900">-- No Brand / Select Brand --</option>
                    {filteredBrandsForDropdown.map((b) => (
                      <option key={b.id} value={b.name} className="dark:bg-slate-900">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Package className="w-4 h-4 text-blue-500" /> Quantity
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <BellRing className="w-4 h-4 text-amber-500" /> Low Stock Alert Limit
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    value={lowStockAlert}
                    onChange={(e) => setLowStockAlert(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Cost Price (Rs.)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Selling Price (Rs.)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1.5 pb-1.5">
                <input
                  type="checkbox"
                  id="isFavorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-5 h-5 text-amber-600 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isFavorite" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  ⭐ Mark as Favorite Item
                </label>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-500" /> Product Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 focus:outline-none file:mr-3 file:py-2.5 file:px-3.5 file:rounded-xl file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-600 dark:file:text-blue-400 file:cursor-pointer file:font-semibold"
                />
                
                {(imageFile || currentImageUrl) && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : currentImageUrl}
                      alt="Product Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {imageFile ? "New image selected" : "Current saved image"}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className={`w-full text-white font-bold py-3.5 rounded-xl transition shadow-md text-sm mt-3 disabled:bg-slate-400 flex items-center justify-center gap-2 ${
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
          )}

          <div className={`${showForm ? "lg:col-span-8" : "lg:col-span-12"} bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all duration-300`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" /> Purchase History ({filteredAndSortedPurchases.length})
              </h2>

              <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto overflow-hidden">
                <div
                  className={`relative transition-all duration-500 ease-in-out ${
                    searchQuery
                      ? "w-full sm:w-80"
                      : "w-full sm:w-56 focus-within:w-full sm:focus-within:w-80"
                  }`}
                >
                  <div className="relative group">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                        text-slate-400 dark:text-slate-500
                        group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400
                        transition-colors duration-200 pointer-events-none"
                    />

                    <input
                      type="text"
                      placeholder="Search name, part #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="
                        w-full h-11 pl-10 pr-10
                        rounded-xl
                        border border-slate-200 dark:border-slate-700
                        bg-white dark:bg-slate-800/80
                        text-sm font-medium
                        text-slate-800 dark:text-slate-100
                        placeholder:text-slate-400 dark:placeholder:text-slate-500
                        shadow-sm
                        outline-none
                        transition-all duration-200
                        hover:border-slate-300 dark:hover:border-slate-600
                        focus:border-blue-500 dark:focus:border-blue-500
                        focus:ring-4 focus:ring-blue-500/10
                        focus:bg-white dark:focus:bg-slate-800
                      "
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="
                          absolute right-2.5 top-1/2 -translate-y-1/2
                          w-6 h-6 rounded-lg
                          flex items-center justify-center
                          text-slate-400
                          hover:text-slate-600 dark:hover:text-slate-200
                          hover:bg-slate-100 dark:hover:bg-slate-700
                          transition-all duration-200
                        "
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-wrap gap-2.5 transition-all duration-500 ease-in-out items-center ${searchQuery ? "opacity-0 max-h-0 overflow-hidden sm:opacity-100 sm:max-h-20" : "opacity-100 max-h-20"}`}>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
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
                    className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
                  >
                    <option value="all">All Brands</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex items-center">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="p-2.5 pl-9 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-800/60 transition"
                    >
                      <option value="modified">Sort: Modified</option>
                      <option value="latest">Sort: Latest</option>
                      <option value="name-asc">Sort: Name (A to Z)</option>
                      <option value="name-desc">Sort: Name (Z to A)</option>
                      <option value="price-low">Sort: Cost (Low to High)</option>
                      <option value="price-high">Sort: Cost (High to Low)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3.5">Image</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">Part # / Item</th>
                    <th className="p-3.5">Category / Brand</th>
                    <th className="p-3.5 text-center">Qty / Alert</th>
                    <th className="p-3.5 text-right">Cost Price</th>
                    <th className="p-3.5 text-right">Total Cost</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {filteredAndSortedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">
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
                          <td className="p-3.5">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.itemName}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 font-semibold">
                                No
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            {pDate.toLocaleDateString()}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {p.supplierName}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                 if (!p.id) return;
                                 try {
                                   await updateDoc(doc(db, "purchases", p.id), {
                                     isFavorite: !p.isFavorite,
                                     updatedAt: new Date(),
                                   });
                                 } catch (err) {
                                   console.error(err);
                                 }
                               }}
                                className="text-base hover:scale-110 transition cursor-pointer focus:outline-none"
                              >
                                {p.isFavorite ? "⭐" : "☆"}
                              </button>
                              <div>
                                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block text-sm">
                                  {p.partNumber}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{p.itemName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs font-semibold block w-fit mb-1">
                              {p.category || "General"}
                            </span>
                            <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md text-xs font-semibold border border-purple-200 dark:border-purple-900 block w-fit">
                              {p.brand || "No Brand"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-sm">{p.qty}</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold block" title="Low Stock Alert Limit">
                              Alert: {p.lowStockAlert ?? 5}
                            </span>
                          </td>
                          <td className="p-3.5 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            Rs. {p.costPrice?.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">
                            Rs. {p.totalCost?.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="text-amber-600 dark:text-amber-400 hover:underline font-bold inline-flex items-center gap-1 transition text-sm"
                            >
                              <Edit3 className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="text-rose-600 dark:text-rose-400 hover:underline font-bold inline-flex items-center gap-1 transition text-sm"
                            >
                              <Trash2 className="w-4 h-4" />Delete
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
