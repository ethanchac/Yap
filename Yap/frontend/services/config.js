export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// For SocketIO
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Export as default for easy importing fuck this shit
export default {
  API_BASE_URL,
  SOCKET_URL
};