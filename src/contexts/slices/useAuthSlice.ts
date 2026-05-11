
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../../types';
import { jwtDecode } from 'jwt-decode';
import { supabase } from '../../services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

/**
 * isTokenExpired - Checks if a JWT is expired with a 1-minute grace period.
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    if (!exp) return true;
    return Date.now() / 1000 > exp - 60; // 60-s grace period
  } catch {
    return true;
  }
};

/**
 * useAuthSlice - Handles authentication state via Supabase Auth with Google OAuth.
 * Stores Supabase session and syncs with user profile.
 */
export const useAuthSlice = () => {
  const sessionRef = useRef<AuthSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Initialize from stored session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get existing session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Failed to get session:', error);
          return;
        }

        if (session?.user) {
          sessionRef.current = session;
          const profile: UserProfile = {
            id: session.user.id, // Supabase UUID
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            picture: session.user.user_metadata?.picture || undefined,
          };
          setUser(profile);
          localStorage.setItem('av_user_profile', JSON.stringify(profile));
        } else {
          // Try to restore from localStorage fallback
          const stored = localStorage.getItem("av_user_profile");
          if (stored) {
            setUser(JSON.parse(stored));
          }
        }
      } catch (err) {
        console.error('[Auth] Initialization error:', err);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      sessionRef.current = session;
      
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
   * login - Authenticates via Supabase Google OAuth.
   * For backward compatibility, also accepts manual user data (for demo login).
   */
  const DEMO_USER_ID = 'demo_preview_account_001';

  const login = useCallback((data: Partial<UserProfile & { token?: string }>) => {
    // Special case: demo login
    if (data.id === DEMO_USER_ID) {
      const email = (data.email || '').trim().toLowerCase();
      const profile: UserProfile = {
        id: data.id,
        email: email || 'demo@avbucketlist.app',
        name: data.name || 'Demo User',
        picture: data.picture,
      };
      setUser(profile);
      localStorage.setItem('av_user_profile', JSON.stringify(profile));
      return;
    }

    // Standard login: validate email
    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
      console.error('[Auth] login() rejected — email is missing.');
      return;
    }

    const profile: UserProfile = {
      id: data.id || `user_${Date.now()}`,
      email,
      name: data.name || email.split('@')[0],
      picture: data.picture,
    };

    setUser(profile);
    localStorage.setItem('av_user_profile', JSON.stringify(profile));
  }, []);

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
      localStorage.removeItem('av_user_profile');
    }
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

  return {
    user,
    setUser,
    login,
    logout,
    signInWithGoogle,
    session: sessionRef.current,
  };
};
