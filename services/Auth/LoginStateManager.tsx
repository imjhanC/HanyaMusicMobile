import React, { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { AuthStorage } from './AuthStorage';
import AuthApi from './AuthApi';

export const LoginStateManager = ({ children }: { children: React.ReactNode }) => {
  const { logout, setUser, setIsAuthenticated, setIsLoading } = useAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const refreshToken = await AuthStorage.getRefreshToken();

        if (!refreshToken) {
          // No session found, proceed to normal unauthenticated state
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // We have a token! Let's try to fetch user info to validate the session.
        // The AuthApi interceptor will automatically handle refreshing the access token if it's expired.
        const response = await AuthApi.get('/auth/users/me');
        
        // If we get here, the session is valid (either access token was good, or refresh was successful)
        setUser(response.data);
        setIsAuthenticated(true);
        
      } catch (error) {
        console.log('Session initialization failed, logging out', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return <>{children}</>;
};

