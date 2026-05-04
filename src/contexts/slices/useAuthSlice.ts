
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../../types';
import { jwtDecode } from 'jwt-decode';

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
 * useAuthSlice - Handles authentication state, login, and logout.
 */
export const useAuthSlice = () => {
  const sessionTokenRef = useRef<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const sessionToken = sessionStorage.getItem("av_session_token");
    if (!sessionToken) return null;

    const stored = localStorage.getItem("av_user_profile") || localStorage.getItem("av_user");
    if (stored && localStorage.getItem("av_user")) {
      localStorage.setItem("av_user_profile", stored);
      localStorage.removeItem("av_user");
    }
    return stored ? JSON.parse(stored) : null;
  });

  // Persist user state to localStorage without token
  useEffect(() => {
    if (user) {
      // Create a clean profile without sensitive session fields if any
      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      };
      localStorage.setItem("av_user_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("av_user_profile");
      localStorage.removeItem("av_user");
    }
  }, [user]);

  /**
   * login - Authenticates a user. Enforces valid Google sub ID.
   */
  const SYNTHETIC_ID_PATTERN = /^user_(\d+|1)$/;
  const DEMO_USER_ID = 'demo_preview_account_001';

  const login = useCallback((data: Partial<UserProfile & { token?: string }>) => {
    const isDemoLogin = data.id === DEMO_USER_ID;

    // 1. Enforce that a real Google sub is always present and non-synthetic (bypass for demo)
    if (!isDemoLogin && (!data.id || typeof data.id !== 'string' || SYNTHETIC_ID_PATTERN.test(data.id))) {
      console.error('[Auth] login() rejected — missing or synthetic Google sub:', data.id);
      return; // Do not authenticate with a fake ID
    }

    // 2. Enforce email presence for identity stability
    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
      console.error('[Auth] login() rejected — email is missing.');
      return;
    }

    const { token } = data;
    const profile: UserProfile = {
      id: data.id,         // Google sub — verified non-synthetic
      email,
      name: data.name || email.split('@')[0],
      picture: data.picture,
    };

    setUser(profile);
    localStorage.setItem('av_user_profile', JSON.stringify(profile));
    sessionTokenRef.current = token || null;
    if (token) sessionStorage.setItem('av_session_token', token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('av_session_token');
  }, []);

  return {
    user,
    setUser,
    login,
    logout
  };
};
