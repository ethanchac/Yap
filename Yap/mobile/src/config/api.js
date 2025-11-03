import Constants from 'expo-constants';

// Get your computer's local IP address for mobile development
const getApiUrl = () => {
  // Check if we're in development mode
  const isDev = __DEV__;

  // For web, use localhost
  if (Constants.platform?.web) {
    return 'http://localhost:5000';
  }

  // For iOS simulator/device, always use localhost for local development
  if (Constants.platform?.ios) {
    return 'http://localhost:5000';
  }

  // For Android emulator, use 10.0.2.2 (special IP for host machine)
  if (Constants.platform?.android) {
    return 'http://10.0.2.2:5000';
  }

  // For Expo development on other platforms, try to get the debugger host IP
  if (isDev && Constants.debuggerHost) {
    const debuggerHostname = Constants.debuggerHost.split(':').shift();
    const apiUrl = `http://${debuggerHostname}:5000`;
    return apiUrl;
  }

  // Fallback
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiUrl();

// Function to test API connectivity
const testApiConnectivity = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    });

    return response.ok;
  } catch (error) {
    // Keep error reporting but don't leak API details to console
    console.error('API connectivity test failed');
    return false;
  }
};

export { API_BASE_URL, testApiConnectivity };