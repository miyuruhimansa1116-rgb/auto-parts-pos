// src/app/pos/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import { Product } from "@/types/product";
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
  Store
} from "lucide-react";

interface CartItem extends Product {
  cartQty: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("latest"); // 'latest' | 'low-stock' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc'

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [cashPaid, setCashPaid] = useState<number>(0);

  // Firestore Data Load
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

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBrands();
    };
  }, []);

  // Cart Qty handling
  const handleIncreaseQty = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.stockQty) {
          alert("තොගයේ ඇති ප්‍රමාණයට වඩා වැඩි කළ නොහැක!");
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        );
      } else {
        if (product.stockQty <= 0) {
          alert("මේ Item එක තොගයේ අවසන් වී ඇත!");
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

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    const product = products.find(p => p.id === id);
    if (product && qty > product.stockQty) {
      alert("තොගයේ ඇති ප්‍රමාණයට වඩා වැඩි කළ නොහැක!");
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cartQty: qty } : item))
    );
  };

  const subTotal = cart.reduce((acc, item) => acc + item.sellingPrice * item.cartQty, 0);
  const netTotal = Math.max(0, subTotal - discount);
  const balance = Math.max(0, cashPaid - netTotal);

  const handleCheckoutAndPrint = async () => {
    if (cart.length === 0) {
      alert("Cart එක හිස්ව පවතී!");
      return;
    }
    if (cashPaid < netTotal) {
      alert("ලැබුණු මුදල මදි!");
      return;
    }

    try {
      for (const item of cart) {
        if (item.id) {
          const productRef = doc(db, "products", item.id);
          await updateDoc(productRef, {
            stockQty: item.stockQty - item.cartQty,
          });
        }
      }

      await addDoc(collection(db, "sales"), {
        createdAt: new Date(),
        items: cart,
        subTotal,
        discount,
        netTotal,
        cashPaid,
        balance,
      });

      window.print();
      setCart([]);
      setDiscount(0);
      setCashPaid(0);
      alert("බිල්පත සාර්ථකව නිකුත් කළා!");
    } catch (error) {
      console.error("Checkout Error: ", error);
      alert("දෝෂයක් සිදු විය!");
    }
  };

  // Filter & Sort Products for POS screen
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

  return (
    <div className="max-w-[1300px] mx-auto p-4 sm:p-6 font-sans dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-100">
      {/* Printable Receipt Layout */}
      <div 
        id="receipt-print" 
        className="hidden print:block p-2 text-black font-mono text-[11px]"
        style={{ width: "58mm" }}
      >
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold uppercase">AUTO ELECTRICAL & AC</h2>
          <p className="text-[9px]">No. 12, Main Street, Battuluoya</p>
          <p className="text-[9px]">Tel: 07X-XXXXXXX</p>
          <p className="text-[9px] mt-1" suppressHydrationWarning>
            {new Date().toLocaleString()}
          </p>
        </div>
        <div className="border-b border-dashed border-black my-1"></div>
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="border-b border-black">
              <th>Item</th>
              <th className="text-center">Qty</th>
              <th className="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.id}>
                <td className="py-0.5 truncate max-w-[28mm]">{item.name}</td>
                <td className="text-center">{item.cartQty}</td>
                <td className="text-right">{(item.sellingPrice * item.cartQty).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-b border-dashed border-black my-1"></div>
        <div className="space-y-0.5 text-right text-[10px]">
          <p>Subtotal: {subTotal.toLocaleString()}</p>
          <p>Discount: {discount.toLocaleString()}</p>
          <p className="font-bold text-xs">TOTAL: Rs. {netTotal.toLocaleString()}</p>
          <p>Cash: {cashPaid.toLocaleString()}</p>
          <p>Balance: {balance.toLocaleString()}</p>
        </div>
        <div className="border-b border-dashed border-black my-1"></div>
        <p className="text-center mt-2 font-bold text-[10px]">THANK YOU COME AGAIN!</p>
      </div>

      {/* Main Screen Layout */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Point of Sale (POS Billing)</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select products to add items to order and generate bills instantly.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Filters & Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((item) => item.id === product.id);
                const currentQty = cartItem ? cartItem.cartQty : 0;

                return (
                  <div
                    key={product.id}
                    onClick={(e) => handleIncreaseQty(product, e)}
                    className="p-3.5 border border-gray-100 dark:border-gray-700 rounded-2xl text-left hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition bg-gray-50/50 dark:bg-gray-700/40 flex flex-col justify-between cursor-pointer select-none"
                  >
                    <div>
                      {product.imageUrl ? (
                        <div className="w-full h-24 mb-2.5 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full h-24 mb-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 text-[10px]">
                          <Package className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 block">{product.partNumber || "-"}</span>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs line-clamp-2 mt-0.5">{product.name}</h3>
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">Rs. {(product.sellingPrice || 0).toLocaleString()}</span>
                        
                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-lg shadow-2xs" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDecreaseQty(product, e)}
                            className="w-5 h-5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold rounded-md flex items-center justify-center hover:bg-red-100 text-xs transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold px-1 text-gray-700 dark:text-gray-200 min-w-[16px] text-center">{currentQty}</span>
                          <button
                            onClick={(e) => handleIncreaseQty(product, e)}
                            className="w-5 h-5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold rounded-md flex items-center justify-center hover:bg-emerald-100 text-xs transition"
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

          {/* Right: Cart & Billing */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold mb-3 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" /> Current Order
              </h2>
              
              <div className="space-y-2.5 max-h-[250px] overflow-y-auto mb-4 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-gray-700/50 pb-2.5">
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Rs. {(item.sellingPrice || 0).toLocaleString()} x {item.cartQty}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-xl border border-gray-100 dark:border-gray-700">
                      <button onClick={() => updateCartQty(item.id!, item.cartQty - 1)} className="w-6 h-6 bg-white dark:bg-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center shadow-2xs">-</button>
                      <span className="font-bold text-xs px-1 text-gray-800 dark:text-gray-200">{item.cartQty}</span>
                      <button onClick={() => updateCartQty(item.id!, item.cartQty + 1)} className="w-6 h-6 bg-white dark:bg-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center shadow-2xs">+</button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-xs">Cart එක හිස්ව පවතී.</p>
                )}
              </div>
            </div>

            {/* Calculations & Checkout */}
            <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4 bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-xl">
              <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>Rs. {subTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">Discount:</span>
                <input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-28 p-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-right text-xs font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2.5">
                <span>Net Total:</span>
                <span className="text-blue-600 dark:text-blue-400">Rs. {netTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">Cash Paid:</span>
                <input
                  type="number"
                  value={cashPaid || ""}
                  onChange={(e) => setCashPaid(Number(e.target.value))}
                  placeholder="0"
                  className="w-32 p-1.5 border border-gray-200 dark:border-gray-600 rounded-xl text-right font-black bg-white dark:bg-gray-700 text-sm text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Balance:</span>
                <span>Rs. {balance.toLocaleString()}</span>
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

      {/* Global Print CSS */}
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