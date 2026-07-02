import apiClient from './client';
import { Config } from '@/constants/config';

export const streakService = {
  getHabitStreak: (habitId: number) =>
    apiClient.get(`/streaks/habit/${habitId}?playerId=${Config.PLAYER_ID}`),
  getAllStreaks: () =>
    apiClient.get(`/streaks/player/${Config.PLAYER_ID}`),
};
