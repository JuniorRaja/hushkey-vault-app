import { create } from 'zustand';
import { Category } from '../../types';
import DatabaseService from '../services/database';
import { useAuthStore } from './authStore';

interface CategoryStore {
  categories: Category[];
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearCategories: () => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async () => {
    const { user } = useAuthStore.getState();
    const masterKey = useAuthStore.getState().masterKey;
    if (!user || !masterKey) return;

    set({ isLoading: true });
    try {
      const categories = await DatabaseService.getCategories(user.id, masterKey);
      set({ categories, isLoading: false });
    } catch (error) {
      console.error('Failed to load categories:', error);
      set({ isLoading: false });
    }
  },

  addCategory: async (name: string, color: string) => {
    const { user } = useAuthStore.getState();
    const masterKey = useAuthStore.getState().masterKey;
    if (!user || !masterKey) return;

    try {
      const newCategory = await DatabaseService.createCategory(user.id, name, color, masterKey);
      set((state) => ({ categories: [...state.categories, newCategory] }));
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await DatabaseService.deleteCategory(id);
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  clearCategories: () => set({ categories: [], isLoading: false }),
}));
