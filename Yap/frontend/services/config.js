// Configuration - dynamic URLs based on environment
const getBackendUrl = () => {
    // Use environment variable if set
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // Check if we're accessing via network IP (not localhost)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // If accessing via network IP, use same host with backend port
        return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    
    // Default to localhost for development
    return 'http://localhost:5000';
};

export const API_BASE_URL = getBackendUrl();
export const SOCKET_URL = getBackendUrl();

// Export as default for easy importing fuck this shit
export default {
  API_BASE_URL,
  SOCKET_URL
};