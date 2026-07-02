import { create } from 'zustand';
import { petService } from '@/services/api/pets';
import { Config } from '@/constants/config';

export interface ActivePet {
  petId: number;
  petName: string;
  mood: 'HAPPY' | 'CONTENT' | 'NEUTRAL' | 'SAD' | 'ANGRY' | 'DEPRESSED';
  affection: number;
  imageUrl?: string;
}

export interface AvailablePet {
  petId: number;
  name: string;
  description: string;
  imageUrl?: string;
  priceGold: number;
}

interface PetState {
  activePet: ActivePet | null;
  availablePets: AvailablePet[];
  loading: boolean;
  error: string | null;

  fetchActivePet: () => Promise<void>;
  fetchAvailablePets: () => Promise<void>;
  selectPet: (petId: number) => Promise<boolean>;
}

export const usePetStore = create<PetState>((set, get) => ({
  activePet: null,
  availablePets: [],
  loading: false,
  error: null,

  fetchActivePet: async () => {
    try {
      set({ loading: true, error: null });
      const response = await petService.getActivePet(Config.PLAYER_ID);
      const data: ActivePet | null = response.data?.activePet || null;
      set({ activePet: data, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al cargar mascota activa',
        loading: false,
      });
    }
  },

  fetchAvailablePets: async () => {
    try {
      set({ loading: true, error: null });
      const response = await petService.getAvailablePets(Config.PLAYER_ID);
      const data: AvailablePet[] = response.data?.pets || response.data || [];
      set({ availablePets: data, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al cargar mascotas disponibles',
        loading: false,
      });
    }
  },

  selectPet: async (petId: number) => {
    try {
      set({ error: null });
      await petService.selectPet(Config.PLAYER_ID, petId);
      await get().fetchActivePet();
      return true;
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al seleccionar mascota',
      });
      return false;
    }
  },
}));
