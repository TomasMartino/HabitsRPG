import apiClient from './client';
import { Config } from '@/constants/config';

export const petService = {
  getActivePet: (playerId: number) =>
    apiClient.get(`/pets/active?playerId=${playerId}`),
  getAvailablePets: (playerId: number) =>
    apiClient.get(`/pets/available?playerId=${playerId}`),
  selectPet: (playerId: number, petId: number) =>
    apiClient.post('/pets/select', { playerId, petId }),
};
