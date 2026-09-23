// src/app/pos/page.tsx
"use intl"; // හෝ "use client"; (ඔබේ වර්තමාන කේතයේ ඇති පරිදි)
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, runTransaction, getDoc, setDoc } from "firebase/firestore";
import { Product } from "@/types/product";
import ReceiptTemplate from "@/components/ReceiptTemplate";
import { 
  ShoppingCart, 
  Search, 
  Package, 
  Plus, 
  Minus, 
  Printer, 
  Tag, 
  Layers, 
  SlidersHorizontal,
  BookmarkPlus,
  FolderOpen,
  Trash2,
  X
} from "lucide-react";

interface CartItem extends Product {
  cartQty: number;
}

interface DraftBill {
  id?: string;
  title: string;
  cart: CartItem[];
  discount: number;
  createdAt: any;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<DraftBill[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>(""); 
  const [currentInvoiceNo, setCurrentInvoiceNo] = useState<number>(0);

  // Draft States
  const [draftTitle, setDraftTitle] = useState("");
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  // මොබයිල් සඳහා ටැබ් මාරු කිරීමට (products හෝ cart/billing බලන්න)
  const [activeTab, setActiveTab] = useState<"products" | "billing">("products");

  // ඔෆ්ලයින් සිදු කළ සේල්ස් ෆයර්බේස් වෙත යැවීම සහ සින්ක් කිරීම
  const syncOfflineSales = async () => {
    if (!navigator.onLine) return;
    try {
      const offlineSales = JSON.parse(localStorage.getItem("pos_offline_sales") || "[]");
      if (offlineSales.length === 0) return;

      for (const sale of offlineSales) {
        await addDoc(collection(db, "sales"), {
          ...sale,
          createdAt: new Date(sale.createdAt),
        });

        for (const item of sale.items) {
          if (item.id) {
            try {
              const productRef = doc(db, "products", item.id);
              const prodSnap = await getDoc(productRef);
              if (prodSnap.exists()) {
                const currentStock = prodSnap.data().stockQty || 0;
                await updateDoc(productRef, {
                  stockQty: Math.max(0, currentStock - item.cartQty),
                });
              }
            } catch (err) {
              console.warn("Stock sync error for item:", item.id);
            }
          }
        }
      }

      localStorage.removeItem("pos_offline_sales");
    } catch (e) {
      console.warn("Error syncing offline sales:", e);
    }
  };

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const items: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];
      setProducts(items);
    });

    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map((d) => d.data().name));
    });

    const unsubBrands = onSnapshot(collection(db, "brands"), (snapshot) => {
      setBrands(snapshot.docs.map((d) => d.data().name));
    });

    const unsubDrafts = onSnapshot(collection(db, "drafts"), (snapshot) => {
      const draftList: DraftBill[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DraftBill, "id">),
      }));
      setDrafts(draftList);
    });

    const fetchInvoiceCounter = async () => {
      const localNo = localStorage.getItem("pos_invoice_no");
      const localNumber = localNo !== null ? Number(localNo) : 0;
      
      if (!navigator.onLine) {
        setCurrentInvoiceNo(localNumber);
        return;
      }

      try {
        await syncOfflineSales();
        const counterDoc = await getDoc(doc(db, "settings", "invoiceCounter"));
        if (counterDoc.exists()) {
          const serverNo = counterDoc.data().currentNo ?? 0;
          const latestNo = Math.max(localNumber, serverNo);
          setCurrentInvoiceNo(latestNo);
          localStorage.setItem("pos_invoice_no", latestNo.toString());
        } else {
          await setDoc(doc(db, "settings", "invoiceCounter"), { currentNo: localNumber });
          setCurrentInvoiceNo(localNumber);
        }
      } catch (err) {
        setCurrentInvoiceNo(localNumber);
      }
    };
    fetchInvoiceCounter();

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBrands();
      unsubDrafts();
    };
  }, []);

  const handleIncreaseQty = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.stockQty) {
          alert("Cannot increase beyond available stock!");
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      } else {
        if (product.stockQty <= 0) {
          alert("This item is out of stock!");
          return prevCart;
        }
        return [...prevCart, { ...product, cartQty: 1 }];
      }
    });
  };

  const handleDecreaseQty = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (!existing) return prevCart;
      if (existing.cartQty > 1) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty - 1 } : item
        );
      } else {
        return prevCart.filter((item) => item.id !== product.id);
      }
    });
  };

  const subTotal = cart.reduce((acc, item) => acc + item.sellingPrice * item.cartQty, 0);
  const netTotal = Math.max(0, subTotal - discount);
  const balance = Math.max(0, cashPaid - netTotal);

  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    const titleToSave = draftTitle.trim() || customerName.trim();
    if (!titleToSave) {
      alert("Please enter vehicle number or name!");
      return;
    }

    try {
      await addDoc(collection(db, "drafts"), {
        title: titleToSave,
        cart,
        discount,
        createdAt: new Date(),
      });
      alert("Bill saved as Draft!");
      setDraftTitle("");
    } catch (error) {
      alert("Draft saved locally / Offline mode active.");
    }
  };

  const handleLoadDraft = (draft: DraftBill) => {
    setCart(draft.cart || []);
    setDiscount(draft.discount || 0);
    setCustomerName(draft.title || "");
    setShowDraftsModal(false);
    setActiveTab("billing"); // ඩ්‍රාෆ්ට් එකක් ලෝඩ් කළ විට බිල්ින් ටැබ් එකට මාරු වේ
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this draft bill?")) {
      try {
        await deleteDoc(doc(db, "drafts", id));
      } catch (err) {
        console.error("Delete draft error:", err);
      }
    }
  };

  const handleCheckoutAndPrint = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    const finalCustomerName = customerName.trim() ? customerName.trim() : "CASH CUSTOMER";
    const assignedInvoiceNo = currentInvoiceNo;
    const nextInvoiceNo = assignedInvoiceNo + 1;
    
    localStorage.setItem("pos_invoice_no", nextInvoiceNo.toString());
    setCurrentInvoiceNo(nextInvoiceNo);

    const formattedInvoiceNo = `SAP-${assignedInvoiceNo}`;
    window.print();

    const saleData = {
      invoiceNo: formattedInvoiceNo,
      createdAt: new Date().toISOString(),
      customerName: finalCustomerName,
      items: cart,
      subTotal,
      discount,
      netTotal,
      cashPaid,
      balance,
    };

    if (navigator.onLine) {
      try {
        await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, "settings", "invoiceCounter");
          transaction.set(counterRef, { currentNo: nextInvoiceNo }, { merge: true });
        });

        for (const item of cart) {
          if (item.id) {
            const productRef = doc(db, "products", item.id);
            const prodSnap = await getDoc(productRef);
            if (prodSnap.exists()) {
              const currentStock = prodSnap.data().stockQty || 0;
              await updateDoc(productRef, {
                stockQty: Math.max(0, currentStock - item.cartQty),
              });
            }
          }
        }

        await addDoc(collection(db, "sales"), {
          ...saleData,
          createdAt: new Date(),
        });
      } catch (error) {
        saveToOfflineQueue(saleData);
      }
    } else {
      saveToOfflineQueue(saleData);
    }

    setCart([]);
    setDiscount(0);
    setCashPaid(0);
    setCustomerName("");
  };

  const saveToOfflineQueue = (sale: any) => {
    try {
      const existingOffline = JSON.parse(localStorage.getItem("pos_offline_sales") || "[]");
      existingOffline.push(sale);
      localStorage.setItem("pos_offline_sales", JSON.stringify(existingOffline));
    } catch (e) {
      console.error("Error saving to offline queue:", e);
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.partNumber.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
        const matchesBrand = selectedBrand === "all" || p.brand === selectedBrand;
        return matchesSearch && matchesCategory && matchesBrand;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        if (sortBy === "price-high") return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        if (sortBy === "low-stock") return (a.stockQty || 0) - (b.stockQty || 0);
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
         
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [products, search, selectedCategory, selectedBrand, sortBy]);

  const currentInvoiceData = {
    invoiceNo: `SAP-${currentInvoiceNo}`,
    customerName: customerName.trim() ? customerName.trim() : "CASH CUSTOMER",
    paymentMethod: "Cash",
    items: cart,
    subTotal: subTotal,
    discount: discount,
    netTotal: netTotal,
    cashPaid: cashPaid,
    balance: balance,
    createdAt: new Date(),
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.cartQty, 0);

  return (
    <div className="max-w-[1300px] mx-auto p-2 sm:p-6 font-sans dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-100 pb-20 sm:pb-6">
      
      <div id="receipt-print" className="hidden print:block">
        <ReceiptTemplate invoice={currentInvoiceData} />
      </div>

      <div className="print:hidden space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">POS Billing</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Invoice: <span className="font-bold text-blue-600 dark:text-blue-400">#SAP-{currentInvoiceNo}</span></p>
            </div>
          </div>
          
          <button
            onClick={() => setShowDraftsModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-4 py-2.5 rounded-xl text-xs font-bold transition hover:bg-amber-100 shadow-xs"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Saved Drafts ({drafts.length})</span>
          </button>
        </div>

        {/* Mobile View Switcher (Bottom / Top Bar සඳහා දුරකථන පෙනුම වැඩිදියුණු කිරීමට) */}
        <div className="flex lg:hidden grid-cols-2 gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === "products" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-xs" : "text-gray-600 dark:text-gray-400"}`}
          >
            📦 Products ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === "billing" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-xs" : "text-gray-600 dark:text-gray-400"}`}
          >
            🛒 Cart 
            {totalCartCount > 0 && (
              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Products Section */}
          <div className={`lg:col-span-2 bg-white dark:bg-gray-800 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4 ${activeTab === "billing" ? "hidden lg:block" : "block"}`}>
            
            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search part # / name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold bg-gray-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <Layers className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold bg-gray-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold bg-gray-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="all">All Brands</option>
                  {brands.map((brand, idx) => (
                    <option key={idx} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold bg-gray-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="latest">Sort: Latest</option>
                  <option value="name-asc">Sort: Name (A to Z)</option>
                  <option value="name-desc">Sort: Name (Z to A)</option>
                  <option value="low-stock">Sort: Low Stock</option>
                  <option value="price-low">Sort: Price Low-High</option>
                  <option value="price-high">Sort: Price High-Low</option>
                </select>
              </div>
            </div>

            {/* Product Grid - දුරකථන සඳහා cols-2 සහ ලොකු තිර සඳහා වැඩි ප්‍රමාණයක් */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 max-h-[calc(100vh-280px)] sm:max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((item) => item.id === product.id);
                const currentQty = cartItem ? cartItem.cartQty : 0;

                return (
                  <div
                    key={product.id}
                    onClick={(e) => handleIncreaseQty(product, e)}
                    className="p-2.5 sm:p-3.5 border border-gray-100 dark:border-gray-700 rounded-2xl text-left hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/25 dark:hover:bg-blue-950/20 transition bg-gray-50/50 dark:bg-gray-700/40 flex flex-col justify-between cursor-pointer select-none"
                  >
                    <div>
                      {product.imageUrl ? (
                        <div className="w-full h-20 sm:h-24 mb-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full h-20 sm:h-24 mb-2 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 text-[10px]">
                          <Package className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 block">{product.partNumber || "-"}</span>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-[11px] sm:text-xs line-clamp-2 mt-0.5">{product.name}</h3>
                    </div>

                    <div className="mt-2.5 sm:mt-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">LKR {(product.sellingPrice || 0).toLocaleString()}</span>
                         
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0.5 sm:p-1 rounded-lg shadow-2xs" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDecreaseQty(product, e)}
                            className="w-5 h-5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-md flex items-center justify-center text-[10px]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] sm:text-[11px] font-bold px-1 text-gray-700 dark:text-gray-200 min-w-[14px] text-center">{currentQty}</span>
                          <button
                            onClick={(e) => handleIncreaseQty(product, e)}
                            className="w-5 h-5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold rounded-md flex items-center justify-center text-[10px]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart & Billing Section */}
          <div className={`bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between space-y-4 ${activeTab === "products" ? "hidden lg:flex" : "flex"}`}>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white max-h-[300px] sm:max-h-[350px] overflow-y-auto shadow-xs">
              <ReceiptTemplate invoice={currentInvoiceData} />
            </div>

            <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3 bg-gray-50/50 dark:bg-gray-700/30 p-3 sm:p-4 rounded-xl">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">Customer / Vehicle:</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional (e.g. WP-1234)"
                  className="w-36 p-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">Discount (LKR):</span>
                <input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-28 p-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-right text-xs font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">Cash Paid (LKR):</span>
                <input
                  type="number"
                  value={cashPaid || ""}
                  onChange={(e) => setCashPaid(Number(e.target.value))}
                  placeholder="0"
                  className="w-32 p-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-right font-black bg-white dark:bg-gray-700 text-sm text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Draft title (e.g. WP-1234)"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-semibold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSaveDraft}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs whitespace-nowrap"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" /> Save Draft
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckoutAndPrint}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-sm text-xs flex items-center justify-center gap-2 mt-2"
              >
                <Printer className="w-4 h-4" />
                <span>Pay & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drafts Modal */}
      {showDraftsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl max-w-lg w-full shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" /> Saved Bill Drafts ({drafts.length})
              </h3>
              <button 
                onClick={() => setShowDraftsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {drafts.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-xs">No draft bills available.</p>
              ) : (
                drafts.map((d) => {
                  const draftTotal = d.cart.reduce((acc, item) => acc + item.sellingPrice * item.cartQty, 0) - (d.discount || 0);
                  return (
                    <div 
                      key={d.id} 
                      className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-amber-400 transition"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          🚗 {d.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Items: <span className="font-semibold">{d.cart.length}</span> | Net Total: <span className="font-bold text-emerald-600 dark:text-emerald-400">LKR {draftTotal.toLocaleString()}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleLoadDraft(d)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Load Bill File
                        </button>
                        <button
                          onClick={(e) => handleDeleteDraft(d.id!, e)}
                          className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 p-1.5 rounded-xl text-xs transition"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print,
          #receipt-print * {
            visibility: visible;
          }
          #receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm !important;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}