import axios from 'axios';
import { Config } from '@/constants/config';

const apiClient = axios.create({
  baseURL: Config.API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || 'unknown';
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`[API Error] ${url} (${status}):`, data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
