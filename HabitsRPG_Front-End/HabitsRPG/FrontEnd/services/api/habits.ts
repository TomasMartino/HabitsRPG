import apiClient from './client';
import { Config } from '@/constants/config';

export const habitService = {
  getAll: () => apiClient.get(`/habits/player/${Config.PLAYER_ID}`),
  create: (habitData: any) => apiClient.post(`/habits/player/${Config.PLAYER_ID}`, habitData),
  complete: (habitId: number) => apiClient.post(`/habits/${habitId}/complete/${Config.PLAYER_ID}`),
};
