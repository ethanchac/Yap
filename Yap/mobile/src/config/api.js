import Constants from 'expo-constants';

console.log('🚀 API config module loading...');

// Simple, hardcoded API URL for debugging
let API_BASE_URL = 'http://localhost:5000';

// Try to detect iOS and use 127.0.0.1
try {
  console.log('📱 Constants.platform:', JSON.stringify(Constants.platform));
  
  if (Constants.platform && Constants.platform.os === 'ios') {
    API_BASE_URL = 'http://127.0.0.1:5000';
    console.log('📱 Detected iOS, using 127.0.0.1');
  } else {
    console.log('📱 Not iOS, using localhost');
  }
} catch (error) {
  console.error('❌ Error detecting platform:', error);
}

console.log('🔗 Final API_BASE_URL:', API_BASE_URL);
console.log('🔗 API_BASE_URL type:', typeof API_BASE_URL);

// Function to test API connectivity
const testApiConnectivity = async () => {
  try {
    console.log('🔍 Testing API connectivity to:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    console.log('✅ API connectivity test - status:', response.status, 'ok:', response.ok);
    return response.ok;
  } catch (error) {
    console.error('❌ API connectivity test failed:', error.message);
    return false;
  }
};

export { API_BASE_URL, testApiConnectivity };