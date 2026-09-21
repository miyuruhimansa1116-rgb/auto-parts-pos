"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit3,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";

interface SystemUser {
  id: string;
  username: string;
  role: string;
  password?: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating new user
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("counter");
  const [creating, setCreating] = useState(false);

  // Editing states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "counter";
    setCurrentUserRole(role);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "systemUsers"));
      const list: SystemUser[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SystemUser);
      });
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== "admin") {
      alert("මෙම ක්‍රියාව සඳහා අවසර ඇත්තේ Admin කෙනෙකුට පමණි!");
      return;
    }

    if (!newUsername || !newPassword) {
      alert("කරුණාකර Username සහ Password ඇතුළත් කරන්න!");
      return;
    }

    setCreating(true);
    try {
      const userId = newUsername.trim().toLowerCase();
      
      await setDoc(doc(db, "systemUsers", userId), {
        username: userId,
        password: newPassword,
        role: newRole,
        createdAt: new Date().toISOString(),
      });

      alert(`යූසර් '${userId}' සාර්ථකව සාදන ලදී!`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("counter");
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("යූසර් සෑදීමේදී දෝෂයක් ඇති විය.");
    } finally {
      setCreating(false);
    }
  };

  // Start Editing
  const startEditing = (user: SystemUser) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditPassword(user.password || "");
  };

  // Cancel Editing
  const cancelEditing = () => {
    setEditingUserId(null);
    setEditUsername("");
    setEditPassword("");
  };

  // Save Edited User
  const handleSaveEdit = async (oldUserId: string) => {
    if (!editPassword.trim()) {
      alert("පාස්වර්ඩ් එක හිස් විය නොහැක!");
      return;
    }

    try {
      await updateDoc(doc(db, "systemUsers", oldUserId), {
        password: editPassword,
      });

      alert("යූසර් තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී!");
      setEditingUserId(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය!");
    }
  };

  // Update Role
  const handleUpdateRole = async (userId: string, currentRole: string) => {
    if (currentUserRole !== "admin") return;
    const updatedRole = currentRole === "admin" ? "counter" : "admin";

    if (confirm(`User '${userId}' ගේ role එක '${updatedRole}' ලෙස වෙනස් කිරීමට අවශ්‍ය බව තහවුරු කරන්නද?`)) {
      try {
        await updateDoc(doc(db, "systemUsers", userId), { role: updatedRole });
        alert("Role එක සාර්ථකව යාවත්කාලීන කරන ලදී!");
        fetchUsers();
      } catch (error) {
        console.error("Error updating role:", error);
        alert("දෝෂයක් ඇති විය!");
      }
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string) => {
    if (currentUserRole !== "admin") {
      alert("ප්‍රවේශය ප්‍රතික්ෂේප විය!");
      return;
    }

    if (userId === "miyuru07") {
      alert("ප්‍රධාන Admin යූසර්වරයා මකා දැමිය නොහැක!");
      return;
    }

    if (confirm(`User '${userId}' සම්පූර්ණයෙන්ම මකා දැමීමට අවශ්‍යද?`)) {
      try {
        await deleteDoc(doc(db, "systemUsers", userId));
        alert("යූසර්වරයා සාර්ථකව මකා දමන ලදී!");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("මකා දැමීමේදී දෝෂයක් ඇති විය!");
      }
    }
  };

  if (currentUserRole !== "admin") {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400 font-bold text-base bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> මෙම පිටුවට පිවිසීමට ඔබට Admin බලතල නැත!
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 transition-colors">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" /> System User Management
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">පද්ධතියේ පරිශීලකයන් (Users) එකතු කිරීම, රෝල්ස් වෙනස් කිරීම, තොරතුරු බලා එඩිට් කිරීම සහ ඉවත් කිරීම.</p>
      </div>

      {/* Add New User Form */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Add New System User
        </h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block mb-1">Username</label>
            <input
              type="text"
              placeholder="e.g. counter01"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block mb-1">Password</label>
            <input
              type="text"
              placeholder="Password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 block mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 font-semibold"
            >
              <option value="counter">Counter (Normal)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2 bg-blue-600 dark:bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      {/* Existing Users Table */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Existing Users List ({users.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <th className="p-2.5">Username</th>
                <th className="p-2.5">Password</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Created Date</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 dark:text-gray-500">ලෝඩ් වෙමින් පවතී...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 dark:text-gray-500">යූසර්වරුන් හමු නොවීය.</td></tr>
              ) : (
                users.map((u) => {
                  const isEditing = editingUserId === u.id;

                  return (
                    <tr key={u.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Username */}
                      <td className="p-2.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                        {u.username}
                      </td>

                      {/* Password */}
                      <td className="p-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="p-1 border border-gray-300 dark:border-gray-700 rounded text-xs w-32 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono"
                            placeholder="New Password"
                          />
                        ) : (
                          <span className="font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            {u.password || "••••••••"}
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          u.role === "admin" 
                            ? "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900" 
                            : "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="p-2.5 text-gray-500 dark:text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center space-x-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(u.id)}
                              className="bg-green-600 text-white hover:bg-green-700 px-2.5 py-1 rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-gray-300 text-gray-700 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 px-2.5 py-1 rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(u)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition border border-blue-200 dark:border-blue-900 inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleUpdateRole(u.username, u.role)}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-600 dark:hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition border border-amber-200 dark:border-amber-900 inline-flex items-center gap-1"
                            >
                              <Key className="w-3.5 h-3.5" /> Toggle Role
                            </button>
                            {u.username !== "miyuru07" && (
                              <button
                                onClick={() => handleDeleteUser(u.username)}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white px-2.5 py-1 rounded text-[11px] font-bold transition border border-red-200 dark:border-red-900 inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </>
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
  );
}