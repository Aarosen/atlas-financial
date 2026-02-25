// User Provider - Authentication State Management
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { UserContext, type User, type UserContextType } from './userContext';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session from localStorage (MVP implementation)
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('atlas_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    localStorage.removeItem('atlas_user');
    setUser(null);
  };

  const value: UserContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
