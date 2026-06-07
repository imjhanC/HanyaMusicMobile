import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthContextType, User } from './types';
import { AuthStorage } from './AuthStorage';
import AuthApi from './AuthApi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const login = async (access_token: string, refresh_token: string) => {
    await AuthStorage.saveTokens(access_token, refresh_token);
    setIsAuthenticated(true);
    
    try {
      const response = await AuthApi.get('/auth/users/me');
      setUser(response.data);
    } catch (e) {
      console.log('Error fetching user after login', e);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await AuthStorage.getRefreshToken();
      if (refreshToken) {
        // Optional: tell backend to revoke the refresh token
        await AuthApi.post('/auth/logout', { refresh_token: refreshToken }).catch(e => console.log('Backend logout failed', e));
      }
    } finally {
      await AuthStorage.clearTokens();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        setUser,
        setIsAuthenticated,
        setIsLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
