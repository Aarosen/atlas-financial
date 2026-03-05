// User Provider - Authentication State Management
'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { UserContext, type User, type UserContextType } from './userContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const mapSupabaseUser = (supaUser: SupabaseUser): User => ({
    id: supaUser.id,
    email: supaUser.email || '',
    name: (supaUser.user_metadata?.full_name as string | undefined) || (supaUser.user_metadata?.name as string | undefined),
    profileComplete: Boolean(supaUser.user_metadata?.profileComplete),
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let active = true;

    const hydrateFromLocal = () => {
      try {
        const storedUser = localStorage.getItem('atlas_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;
          if (active) setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const load = async () => {
      if (!supabase) {
        hydrateFromLocal();
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data?.session?.user) {
          setUser(mapSupabaseUser(data.session.user));
        } else {
          hydrateFromLocal();
          return;
        }

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          if (session?.user) {
            setUser(mapSupabaseUser(session.user));
          } else {
            setUser(null);
          }
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (error) {
        console.error('Error checking auth:', error);
        hydrateFromLocal();
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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
