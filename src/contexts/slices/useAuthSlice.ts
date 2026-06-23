'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { logger } from '../../lib/logger';
import { postAuthLogout } from '@/api-client-react';
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
          logger.error('[Auth] Failed to get session:', { error });
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
          // No active Supabase session. Check if there is a saved demo profile to restore.
          const storedProfileStr = localStorage.getItem('av_user_profile');
          if (storedProfileStr) {
            try {
              const storedProfile = JSON.parse(storedProfileStr) as UserProfile;
              if (storedProfile && (storedProfile as any).isDemo) {
                setUser(storedProfile);
                return;
              }
            } catch (e) {
              logger.error('[Auth] Failed to parse stored profile:', { error: e });
            }
          }
          // Clear legacy data if not a demo session
          localStorage.removeItem("av_user_profile");
        }
      } catch (err) {
        logger.error('[Auth] Initialization error:', { error: err });
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
        // No session from Supabase. Check if we currently have a stored demo session.
        const storedProfileStr = localStorage.getItem('av_user_profile');
        let isDemo = false;
        if (storedProfileStr) {
          try {
            const parsed = JSON.parse(storedProfileStr);
            if (parsed && parsed.isDemo) {
              isDemo = true;
            }
          } catch {}
        }

        if (isDemo) {
          // Keep the demo user session active and do not clear it
          return;
        }

        sessionRef.current = null;
        setSession(null);
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
      logger.error('[Auth] Google sign-in error:', { error: err });
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
   * Also sends a request to the backend to blacklist the current JWT token.
   */
  const logout = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Send revocation request to API backend
        try {
          await postAuthLogout({
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        } catch (e) {
          logger.error('[Auth] Failed to send logout signal to backend:', { error: e });
        }
      }
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('[Auth] Logout error:', { error: err });
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
