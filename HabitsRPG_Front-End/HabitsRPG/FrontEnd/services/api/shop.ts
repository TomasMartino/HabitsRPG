import apiClient from './client';

export const shopService = {
  getItems: () => apiClient.get('/shop/items'),
  buyItem: (itemId: number, playerId: number) =>
    apiClient.post(`/shop/buy/${itemId}`, { playerId }),
  getInventory: (playerId: number) =>
    apiClient.get(`/shop/inventory?playerId=${playerId}`),
  equipItem: (inventoryId: number, playerId: number, slot: string) =>
    apiClient.post(`/shop/inventory/equip/${inventoryId}`, { playerId }),
  unequipItem: (slot: string, playerId: number) =>
    apiClient.post(`/shop/inventory/unequip/${slot}`, { playerId }),
};
