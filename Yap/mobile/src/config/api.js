import Constants from 'expo-constants';

console.log('🚀 API config module loading...');

// Get your computer's local IP address for mobile development
const getApiUrl = () => {
  // Check if we're in development mode
  const isDev = __DEV__;
  
  console.log('📱 Development mode:', isDev);
  console.log('📱 Constants.platform:', JSON.stringify(Constants.platform));
  console.log('📱 Constants.debuggerHost:', Constants.debuggerHost);
  console.log('📱 Constants.manifest:', Constants.manifest);
  
  // For web, use localhost
  if (Constants.platform?.web) {
    console.log('📱 Web platform detected');
    return 'http://localhost:5000';
  }
  
  // For iOS simulator/device, always use localhost for local development
  if (Constants.platform?.ios) {
    console.log('📱 iOS detected, using localhost');
    return 'http://localhost:5000';
  }
  
  // For Android emulator, use 10.0.2.2 (special IP for host machine)
  if (Constants.platform?.android) {
    console.log('📱 Android detected, using 10.0.2.2');
    return 'http://10.0.2.2:5000';
  }
  
  // For Expo development on other platforms, try to get the debugger host IP
  if (isDev && Constants.debuggerHost) {
    const debuggerHostname = Constants.debuggerHost.split(':').shift();
    const apiUrl = `http://${debuggerHostname}:5000`;
    console.log('📱 Using debugger host IP:', apiUrl);
    return apiUrl;
  }
  
  // Fallback
  console.log('📱 Using fallback localhost');
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiUrl();

console.log('🔗 Final API_BASE_URL:', API_BASE_URL);
console.log('🔗 API_BASE_URL type:', typeof API_BASE_URL);

// Function to test API connectivity
const testApiConnectivity = async () => {
  try {
    console.log('🔍 Testing API connectivity to:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    });
    console.log('✅ API connectivity test - status:', response.status, 'ok:', response.ok);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('❌ API connectivity test response:', text);
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ API connectivity test failed:', error.message);
    return false;
  }
};

export { API_BASE_URL, testApiConnectivity };