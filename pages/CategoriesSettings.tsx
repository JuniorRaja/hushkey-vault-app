import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../src/stores/authStore";
import { useCategoryStore } from "../src/stores/categoryStore";
import { useItemStore } from "../src/stores/itemStore";
import { ChevronLeft, Layers, Plus, Trash2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Category } from "../types";

const CategoriesSettings: React.FC = () => {
  const navigate = useNavigate();
  const { items } = useItemStore();
  const { categories, isLoading, loadCategories, addCategory, deleteCategory } = useCategoryStore();
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("bg-purple-500");
  const [deleteConfirm, setDeleteConfirm] = useState<{ category: Category; linkedItemsCount: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const COLORS = [
    { name: "Purple", class: "bg-purple-500" },
    { name: "Blue", class: "bg-blue-500" },
    { name: "Green", class: "bg-green-500" },
    { name: "Red", class: "bg-red-500" },
    { name: "Yellow", class: "bg-yellow-500" },
    { name: "Pink", class: "bg-pink-500" },
    { name: "Indigo", class: "bg-indigo-500" },
    { name: "Orange", class: "bg-orange-500" },
    { name: "Teal", class: "bg-teal-500" },
    { name: "Cyan", class: "bg-cyan-500" },
  ];

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setIsAdding(true);
    try {
      await addCategory(newCatName.trim(), newCatColor);
      setNewCatName("");
      setNewCatColor("bg-purple-500");
    } catch (err: any) {
      alert("Error creating category: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    const linkedItemsCount = items.filter(item => item.categoryId === category.id).length;
    setDeleteConfirm({ category, linkedItemsCount });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCategory(deleteConfirm.category.id);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert("Error deleting category: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-400" />
        </button>
        <h1 className="text-3xl font-bold text-white">Categories</h1>
      </div>

      {/* Add New Category Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-900/20 to-purple-900/10 border border-primary-800/30 rounded-2xl p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Sparkles size={18} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create New Category</h2>
              <p className="text-xs text-gray-500">Organize your items with custom categories</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Category Name</label>
              <input
                type="text"
                placeholder="e.g., Work, Personal, Finance..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Choose Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.class}
                    onClick={() => setNewCatColor(color.class)}
                    title={color.name}
                    className={`w-9 h-9 rounded-lg ${color.class} transition-all ${
                      newCatColor === color.class
                        ? "scale-110 ring-2 ring-white shadow-lg"
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!newCatName.trim() || isAdding}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary-900/30"
            >
              {isAdding ? (
                <><Loader2 size={16} className="animate-spin" /> Creating...</>
              ) : (
                <><Plus size={16} /> Create Category</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Your Categories
          </label>
          <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-lg">
            {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
          </span>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin mx-auto text-primary-500" size={24} />
              <p className="text-gray-500 text-sm mt-2">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-dashed border-gray-800">
              <Layers size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">No categories yet</p>
              <p className="text-gray-600 text-xs mt-1">Create your first category above</p>
            </div>
          ) : (
            categories.map((cat, idx) => {
              const linkedItemsCount = items.filter(item => item.categoryId === cat.id).length;
              return (
                <div 
                  key={cat.id} 
                  className="flex items-center justify-between p-4 bg-gray-900/80 border border-gray-800 rounded-xl group hover:border-gray-700 hover:bg-gray-900 transition-all animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center shadow-lg`}>
                      <Layers size={18} className="text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-200 block">{cat.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {linkedItemsCount} {linkedItemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteClick(cat)} 
                    className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Category?</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {deleteConfirm.linkedItemsCount > 0
                  ? `This category has ${deleteConfirm.linkedItemsCount} linked ${deleteConfirm.linkedItemsCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
                  : `Are you sure you want to delete "${deleteConfirm.category.name}"?`}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold transition-all active:scale-95">Cancel</button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-red-900/30">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesSettings;