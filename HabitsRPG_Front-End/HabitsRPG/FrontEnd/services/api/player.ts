import apiClient from './client';
import { Config } from '@/constants/config';

export const playerService = {
  getStats: () => apiClient.get(`/player/${Config.PLAYER_ID}/stats`),
  sleep: () => apiClient.post(`/player/${Config.PLAYER_ID}/sleep`),
  buyPotion: () => apiClient.post(`/player/${Config.PLAYER_ID}/buy-potion`),
};
