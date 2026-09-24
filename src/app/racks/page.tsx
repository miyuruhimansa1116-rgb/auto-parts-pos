// src/app/racks/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  deleteField,
} from "firebase/firestore";
import {
  Grid,
  Plus,
  Trash2,
  Search,
  MapPin,
  Package,
  Layers,
  AlertCircle,
  ArrowUpDown,
  X,
  Check,
} from "lucide-react";

interface Rack {
  id: string;
  rackNumber: string;
  description?: string;
}

interface Product {
  id: string;
  partNumber: string;
  name: string;
  rackNumber?: string;
}

type SortField = "partNumber" | "name" | "rackNumber";
type SortOrder = "asc" | "desc";

export default function RackManagementPage() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // New Rack Form State
  const [newRackNumber, setNewRackNumber] = useState("");
  const [newRackDesc, setNewRackDesc] = useState("");
  
  // Assign Rack to Item States
  const [selectedRack, setSelectedRack] = useState("");
  const [selectedProductPart, setSelectedProductPart] = useState("");
  
  // Inline Editing State in Table
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [inlineRackValue, setInlineRackValue] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting States
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Fetch Racks and Products from Firebase
  useEffect(() => {
    const unsubscribeRacks = onSnapshot(collection(db, "racks"), (snapshot) => {
      setRacks(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Rack, "id">) })));
    });

    const unsubscribeProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) })));
    });

    return () => {
      unsubscribeRacks();
      unsubscribeProducts();
    };
  }, []);

  // Add New Rack
  const handleAddRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newRackNumber.trim()) {
      setErrorMessage("Please enter a rack number!");
      return;
    }

    try {
      const trimmedRack = newRackNumber.trim().toUpperCase();
      const exists = racks.some((r) => r.rackNumber.toUpperCase() === trimmedRack);
      
      if (exists) {
        setErrorMessage("This rack number already exists!");
        return;
      }

      await addDoc(collection(db, "racks"), {
        rackNumber: trimmedRack,
        description: newRackDesc.trim(),
        createdAt: new Date(),
      });

      setNewRackNumber("");
      setNewRackDesc("");
      setSuccessMessage("Rack number added successfully!");
    } catch (error) {
      setErrorMessage("An error occurred: " + (error as Error).message);
    }
  };

  // Assign Rack to an Item
  const handleAssignRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedRack || !selectedProductPart) {
      setErrorMessage("Please select both a rack and an item!");
      return;
    }

    try {
      const q = query(collection(db, "products"), where("partNumber", "==", selectedProductPart.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMessage("Corresponding product not found! Please check the part number.");
        return;
      }

      const prodDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "products", prodDoc.id), {
        rackNumber: selectedRack.trim().toUpperCase(),
        updatedAt: new Date(),
      });

      setSuccessMessage("Rack number updated successfully for the item!");
      setSelectedProductPart("");
      setSelectedRack("");
    } catch (error) {
      setErrorMessage("An error occurred: " + (error as Error).message);
    }
  };

  // Inline Update Rack directly from Table
  const handleInlineSave = async (productId: string, valueToSave: string) => {
    try {
      await updateDoc(doc(db, "products", productId), {
        rackNumber: valueToSave.trim() ? valueToSave.trim().toUpperCase() : deleteField(),
        updatedAt: new Date(),
      });
      setEditingProductId(null);
      setSuccessMessage("Rack mapping updated successfully!");
    } catch (error) {
      setErrorMessage("Failed to update rack: " + (error as Error).message);
    }
  };

  // Remove Rack Assignment completely from an Item
  const handleRemoveRackAssignment = async (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to remove the rack assignment for "${productName}"?`)) {
      try {
        await updateDoc(doc(db, "products", productId), {
          rackNumber: deleteField(),
          updatedAt: new Date(),
        });
        setSuccessMessage("Rack assignment removed successfully.");
      } catch (error) {
        setErrorMessage("Failed to remove rack assignment.");
      }
    }
  };

  // Delete a Rack from Racks List
  const handleDeleteRack = async (id: string, rackNum: string) => {
    if (confirm(`Are you sure you want to delete rack "${rackNum}"?`)) {
      try {
        await deleteDoc(doc(db, "racks", id));
        setSuccessMessage("Rack removed successfully.");
      } catch (error) {
        setErrorMessage("Error occurred while deleting the rack.");
      }
    }
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filter and Sort Products
  const filteredProducts = products
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.rackNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = (a[sortField] || "").toLowerCase();
      let bVal = (b[sortField] || "").toLowerCase();
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 max-w-[1400px] mx-auto font-sans space-y-8">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-slate-800">
            <Grid className="w-8 h-8 text-blue-600" /> Rack Management & Assignment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Add warehouse rack numbers and assign them to respective inventory items.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-semibold flex items-center gap-2.5">
          <Package className="w-5 h-5 shrink-0" /> {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Add Rack & Assign Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Add New Rack Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5 border-b pb-4">
              <Plus className="w-5 h-5 text-blue-500" /> Add New Rack
            </h2>
            <form onSubmit={handleAddRack} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Rack Number / Name</label>
                <input
                  type="text"
                  placeholder="e.g. RACK-A1"
                  value={newRackNumber}
                  onChange={(e) => setNewRackNumber(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near front entrance"
                  value={newRackDesc}
                  onChange={(e) => setNewRackDesc(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 font-medium"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md"
              >
                Save Rack
              </button>
            </form>
          </div>

          {/* 2. Assign Rack to Item Section with Searchable Inputs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5 border-b pb-4">
              <MapPin className="w-5 h-5 text-emerald-500" /> Assign Rack to Item
            </h2>
            <form onSubmit={handleAssignRack} className="space-y-4">
              
              {/* Searchable Item Input */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Search & Select Item</label>
                <input
                  type="text"
                  list="products-datalist"
                  placeholder="Type item name or part number..."
                  value={selectedProductPart}
                  onChange={(e) => setSelectedProductPart(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 font-semibold"
                  required
                />
                <datalist id="products-datalist">
                  {products.map((p) => (
                    <option key={p.id} value={p.partNumber}>
                      {p.name} ({p.partNumber})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Searchable Rack Input */}
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Search & Select Rack</label>
                <input
                  type="text"
                  list="racks-datalist"
                  placeholder="Type rack number..."
                  value={selectedRack}
                  onChange={(e) => setSelectedRack(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 font-semibold"
                  required
                />
                <datalist id="racks-datalist">
                  {racks.map((r) => (
                    <option key={r.id} value={r.rackNumber}>
                      {r.rackNumber} {r.description ? `- ${r.description}` : ""}
                    </option>
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md"
              >
                Assign Rack to Item
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Existing Racks & Assigned Products List */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Available Racks List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-blue-500" /> Available Racks ({racks.length})
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {racks.length === 0 ? (
                <p className="text-sm text-slate-400">No racks added yet.</p>
              ) : (
                racks.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl text-sm font-semibold">
                    <span>{r.rackNumber}</span>
                    <button
                      onClick={() => handleDeleteRack(r.id, r.rackNumber)}
                      className="text-rose-500 hover:text-rose-700 font-bold ml-1.5"
                      title="Delete Rack"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Products & Their Racks Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5">
                <Package className="w-6 h-6 text-blue-500" /> Items & Racks Mapping
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item or rack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm bg-slate-50 outline-none font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th 
                      onClick={() => handleSort("partNumber")} 
                      className="p-4 cursor-pointer hover:bg-slate-200 transition font-bold"
                    >
                      <div className="flex items-center gap-1.5">
                        Part Number <ArrowUpDown className="w-4 h-4 text-slate-500" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("name")} 
                      className="p-4 cursor-pointer hover:bg-slate-200 transition font-bold"
                    >
                      <div className="flex items-center gap-1.5">
                        Item Name <ArrowUpDown className="w-4 h-4 text-slate-500" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("rackNumber")} 
                      className="p-4 cursor-pointer hover:bg-slate-200 transition font-bold"
                    >
                      <div className="flex items-center gap-1.5">
                        Assigned Rack (Click row to edit) <ArrowUpDown className="w-4 h-4 text-slate-500" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-400 text-sm">
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isEditing = editingProductId === p.id;
                      return (
                        <tr 
                          key={p.id} 
                          onClick={() => {
                            if (!isEditing) {
                              setEditingProductId(p.id);
                              setInlineRackValue(p.rackNumber || "");
                            }
                          }}
                          className={`transition-colors cursor-pointer ${
                            isEditing ? "bg-blue-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-blue-600">{p.partNumber}</td>
                          <td className="p-4 font-semibold text-slate-800">{p.name}</td>
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  list="racks-datalist-inline"
                                  value={inlineRackValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInlineRackValue(val);
                                    if (racks.some(r => r.rackNumber.toLowerCase() === val.toLowerCase())) {
                                      handleInlineSave(p.id, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleInlineSave(p.id, inlineRackValue);
                                    } else if (e.key === "Escape") {
                                      setEditingProductId(null);
                                    }
                                  }}
                                  placeholder="Type or select rack & Enter..."
                                  className="w-44 p-2 border border-blue-400 rounded-lg text-sm bg-white font-semibold outline-none shadow-sm"
                                  autoFocus
                                />
                                <datalist id="racks-datalist-inline">
                                  {racks.map((r) => (
                                    <option key={r.id} value={r.rackNumber}>
                                      {r.rackNumber} {r.description ? `- ${r.description}` : ""}
                                    </option>
                                  ))}
                                </datalist>

                                <button
                                  onClick={() => handleInlineSave(p.id, inlineRackValue)}
                                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingProductId(null)}
                                  className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                {p.rackNumber ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-sm font-bold inline-flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" /> {p.rackNumber}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-sm italic">Not Assigned</span>
                                )}

                                <div className="flex items-center gap-2">
                                  {p.rackNumber && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveRackAssignment(p.id, p.name);
                                      }}
                                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded transition"
                                      title="Remove Rack Assignment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-semibold">Click to Edit</span>
                                </div>
                              </div>
                            )}
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