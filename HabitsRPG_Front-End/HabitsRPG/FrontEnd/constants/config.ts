/**
 * App configuration. Set EXPO_PUBLIC_API_URL in environment for deployment.
 * For local dev: the default uses the IP the project was developed with.
 */
export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.3:8080/api',
  PLAYER_ID: Number(process.env.EXPO_PUBLIC_PLAYER_ID) || 1,
  POLL_INTERVAL: 10000,
};
