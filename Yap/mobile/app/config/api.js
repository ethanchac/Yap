import Constants from 'expo-constants';

// Get the API base URL from environment or use default for development
export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.2.112:5000/api';

// For production, you'd set this in app.config.js:
// extra: {
//   apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://your-production-api.com/api'
// }