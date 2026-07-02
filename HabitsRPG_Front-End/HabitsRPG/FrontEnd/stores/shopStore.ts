import { create } from 'zustand';
import { shopService } from '@/services/api/shop';
import { usePlayerStore } from './playerStore';
import { Config } from '@/constants/config';

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  itemType: 'CONSUMABLE' | 'COSMETIC' | 'BOOST' | 'PET';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  priceGold: number;
  priceGems: number;
  effectType?: string;
  effectValue?: number;
  imageUrl?: string | null;
  isPurchasable?: boolean;
  maxOwned?: number | null;
  equipSlot?: string | null;
  owned?: boolean;
  ownedQuantity?: number;
}

export interface InventoryItem {
  id: number;
  itemId: number;
  name: string;
  description?: string;
  itemType: string;
  rarity: string;
  quantity: number;
  isEquipped: boolean;
  expiresAt?: string | null;
  equipSlot?: string | null;
}

interface ShopState {
  items: ShopItem[];
  inventory: InventoryItem[];
  isPurchasing: boolean;
  loading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  buyItem: (itemId: number) => Promise<boolean>;
  equipItem: (inventoryId: number, slot: string) => Promise<boolean>;
  unequipItem: (slot: string) => Promise<boolean>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  items: [],
  inventory: [],
  isPurchasing: false,
  loading: false,
  error: null,

  fetchItems: async () => {
    try {
      set({ loading: true, error: null });
      const response = await shopService.getItems();
      const rawItems: ShopItem[] = response.data?.items || response.data || [];

      // Cross-reference with inventory to mark owned items
      const { inventory } = get();
      const markedItems = rawItems.map((item) => {
        const inv = inventory.find((i) => i.itemId === item.id);
        return {
          ...item,
          owned: !!inv,
          ownedQuantity: inv?.quantity || 0,
        };
      });

      set({ items: markedItems, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al cargar la tienda',
        loading: false,
      });
    }
  },

  fetchInventory: async () => {
    try {
      const response = await shopService.getInventory(Config.PLAYER_ID);
      const data: InventoryItem[] = response.data?.inventory || response.data || [];
      set({ inventory: data });
    } catch (err: any) {
      set({ error: err?.response?.data?.message || err?.message || 'Error al cargar inventario' });
    }
  },

  buyItem: async (itemId: number) => {
    if (get().isPurchasing) {
      console.log('[ShopStore] Purchase already in progress, blocking duplicate');
      return false;
    }

    set({ isPurchasing: true, error: null });
    try {
      await shopService.buyItem(itemId, Config.PLAYER_ID);

      // Refetch player stats and inventory after purchase
      await get().fetchInventory();
      await usePlayerStore.getState().fetchPlayer();
      // Re-fetch items to update owned markers
      await get().fetchItems();

      return true;
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      const errorCode = err?.response?.data?.error;
      const msg = serverMsg || errorCode || err?.message || 'Error al comprar';
      set({ error: msg });
      return false;
    } finally {
      set({ isPurchasing: false });
    }
  },

  equipItem: async (inventoryId: number, slot: string) => {
    try {
      await shopService.equipItem(inventoryId, Config.PLAYER_ID, slot);
      await get().fetchInventory();
      await get().fetchItems();
      return true;
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al equipar',
      });
      return false;
    }
  },

  unequipItem: async (slot: string) => {
    try {
      await shopService.unequipItem(slot, Config.PLAYER_ID);
      await get().fetchInventory();
      await get().fetchItems();
      return true;
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err?.message || 'Error al desequipar',
      });
      return false;
    }
  },
}));
