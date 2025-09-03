import { Redirect } from 'expo-router';

export default function Index() {
  // Always redirect to landing page on app start
  console.log('🏠 Root Index: Always redirecting to landing page');
  return <Redirect href="/(auth)/landing" />;
}
