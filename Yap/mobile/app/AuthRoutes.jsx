import { useEffect, useState } from 'react';
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

const AuthRoutes = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const router = useRouter();
  const segments = useSegments();

  const checkAuthState = async () => {
    try {
      console.log('🔒 AuthRoutes: Checking auth state...');
      const token = await SecureStore.getItemAsync('token');
      console.log('🔒 AuthRoutes: Token exists:', !!token);
      console.log('🔒 AuthRoutes: Token preview:', token ? `${token.substring(0, 20)}...` : 'null');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.log('🔒 AuthRoutes: Error checking auth state:', error);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  // Use focus effect to check auth state when navigating
  useFocusEffect(
    useCallback(() => {
      console.log('🔒 AuthRoutes: Screen focused, checking auth...');
      checkAuthState();
    }, [])
  );

  useEffect(() => {
    // Temporarily disabled automatic redirects - always stay on current page
    console.log('🔒 AuthRoutes: Auto-redirect disabled for debugging');
  }, [isAuthenticated, segments]);

  return children;
};

export default AuthRoutes;