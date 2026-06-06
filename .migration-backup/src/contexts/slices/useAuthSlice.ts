import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../../types';
import { supabase } from '../../services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

/**
 * useAuthSlice - Handles authentication state via Supabase Auth with Google OAuth.
 * Stores Supabase session and syncs with user profile.
 */
export const useAuthSlice = () => {
  const sessionRef = useRef<AuthSession | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Initialize from stored session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Failed to get session:', error);
          return;
        }

        if (session?.user) {
          sessionRef.current = session;
          setSession(session);
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            picture: session.user.user_metadata?.picture || undefined,
          };
          setUser(profile);
          localStorage.setItem('av_user_profile', JSON.stringify(profile));
        } else {
          // Clear legacy data
          localStorage.removeItem("av_user_profile");
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      sessionRef.current = session;
      setSession(session);
      
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          picture: session.user.user_metadata?.picture || undefined,
        };
        setUser(profile);
        localStorage.setItem('av_user_profile', JSON.stringify(profile));
      } else {
        setUser(null);
        localStorage.removeItem('av_user_profile');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * signInWithGoogle - Initiates Supabase Google OAuth flow.
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('[Auth] Google sign-in error:', err);
      throw err;
    }
  }, []);

  /**
   * login - Authenticates via Supabase Google OAuth.
   */
  const login = useCallback(async (profile?: UserProfile & { token?: string; isDemo?: boolean }) => {
    if (profile) {
      // Demo/direct login — set state without Supabase OAuth
      setUser(profile);
      localStorage.setItem('av_user_profile', JSON.stringify(profile));
      return;
    }
    // Normal path: trigger Supabase Google OAuth
    await signInWithGoogle();
  }, [signInWithGoogle]);

  /**
   * logout - Signs out from Supabase and clears local state.
   */
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    } finally {
      setUser(null);
      sessionRef.current = null;
      setSession(null);
      localStorage.removeItem('av_user_profile');
    }
  }, []);

  return {
    user,
    setUser,
    login,
    logout,
    signInWithGoogle,
    session,
  };
};
