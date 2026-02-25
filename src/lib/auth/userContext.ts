// User Context - Authentication and User State Management
import { createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  profileComplete: boolean;
}

export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useUser();
  return { user, isAuthenticated, isLoading };
}
