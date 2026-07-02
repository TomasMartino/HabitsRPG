import { create } from 'zustand';
import { streakService } from '@/services/api/streaks';

export interface HabitStreak {
  habitId: number;
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
  lastCompletedDate?: string | null;
}

export interface StreakSummary {
  habitId: number;
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
}

interface StreakState {
  streaks: StreakSummary[];
  habitStreaks: Map<number, HabitStreak>;
  loading: boolean;
  error: string | null;

  fetchAllStreaks: () => Promise<void>;
  fetchHabitStreak: (habitId: number) => Promise<HabitStreak | null>;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  streaks: [],
  habitStreaks: new Map(),
  loading: false,
  error: null,

  fetchAllStreaks: async () => {
    try {
      set({ loading: true, error: null });
      const response = await streakService.getAllStreaks();
      const data = response.data;

      // Support both { streaks: [...] } and direct array response
      const streaks: StreakSummary[] = data?.streaks || data || [];

      // Also populate habitStreaks map
      const habitStreaks = new Map<number, HabitStreak>();
      for (const s of streaks) {
        habitStreaks.set(s.habitId, {
          habitId: s.habitId,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
          multiplier: s.multiplier,
        });
      }

      set({ streaks, habitStreaks, loading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Error al cargar rachas',
        loading: false,
      });
    }
  },

  fetchHabitStreak: async (habitId: number) => {
    try {
      set({ loading: true, error: null });
      const response = await streakService.getHabitStreak(habitId);
      const data: HabitStreak = response.data;

      // Update the map
      const habitStreaks = new Map(get().habitStreaks);
      habitStreaks.set(habitId, data);

      set({ habitStreaks, loading: false });
      return data;
    } catch (err: any) {
      set({
        error: err?.message || `Error al cargar racha del hábito ${habitId}`,
        loading: false,
      });
      return null;
    }
  },
}));
