import { Stack } from "expo-router";
import AuthRoutes from './AuthRoutes';

export default function RootLayout() {
  return (
    <AuthRoutes>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthRoutes>
  );
}
