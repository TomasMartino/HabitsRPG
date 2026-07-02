import { create } from 'zustand';
import { playerService } from '@/services/api/player';

interface PlayerStats {
  name: string;
  health: number;
  energy: number;
  xp: number;
  level: number;
  xpProgress: number;
  xpToNextLevel: number;
  gold: number;
  gems: number;
  lives: number;
}

interface PlayerState {
  player: PlayerStats | null;
  isLoading: boolean;
  error: string | null;

  fetchPlayer: () => Promise<void>;
  sleep: () => Promise<boolean>;
  buyPotion: () => Promise<boolean>;
  refreshAfterPurchase: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  player: null,
  isLoading: false,
  error: null,

  fetchPlayer: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await playerService.getStats();
      set({ player: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch player', isLoading: false });
    }
  },

  sleep: async () => {
    try {
      set({ isLoading: true });
      await playerService.sleep();
      await get().fetchPlayer();
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  buyPotion: async () => {
    try {
      set({ isLoading: true });
      await playerService.buyPotion();
      await get().fetchPlayer();
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  refreshAfterPurchase: async () => {
    await get().fetchPlayer();
  },
}));
