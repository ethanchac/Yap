//FOR UNAUTHENTICATED USERS (LOGIN, SIGNUP, LANDING PAGE)

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="landing" options={{ headerShown: false }} />
      <Stack.Screen name="authentication/login" options={{ headerShown: false }} />
      <Stack.Screen name="authentication/signup" options={{ headerShown: false }} />
      <Stack.Screen name="authentication/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="authentication/reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}