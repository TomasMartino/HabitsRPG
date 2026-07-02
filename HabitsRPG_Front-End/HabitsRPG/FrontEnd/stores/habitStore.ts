import { create } from 'zustand';
import { habitService } from '@/services/api/habits';

interface HabitState {
  habits: any[];
  isLoading: boolean;
  error: string | null;

  fetchHabits: () => Promise<void>;
  createHabit: (habitData: any) => Promise<boolean>;
  completeHabit: (habitId: number) => Promise<any>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,

  fetchHabits: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await habitService.getAll();
      set({ habits: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch habits', isLoading: false });
    }
  },

  createHabit: async (habitData: any) => {
    try {
      set({ isLoading: true });
      await habitService.create(habitData);
      await get().fetchHabits();
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  completeHabit: async (habitId: number) => {
    try {
      const response = await habitService.complete(habitId);
      get().fetchHabits();
      return response.data;
    } catch (err: any) {
      throw err;
    }
  },
}));
