import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthSlice } from '../contexts/slices/useAuthSlice';
import { supabase } from '../services/supabaseClient';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock supabase client
vi.mock('../services/supabaseClient', () => {
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    supabase: {
      auth: mockAuth,
    },
  };
});

describe('useAuthSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with null user when no stored session or profile exists', async () => {
    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => useAuthSlice());
      resultHook = result;
    });
    
    // Check initial state
    expect(resultHook.current.user).toBeNull();
    expect(supabase.auth.getSession).toHaveBeenCalled();
  });

  it('should restore user from Supabase session if it exists on mount', async () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid-456',
        email: 'supabase@example.com',
        user_metadata: {
          full_name: 'Supabase User',
          picture: 'https://example.com/avatar.jpg',
        },
      },
    };
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession as any },
      error: null,
    });

    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => useAuthSlice());
      resultHook = result;
    });

    expect(resultHook.current.user).toEqual({
      id: 'supabase-uuid-456',
      email: 'supabase@example.com',
      name: 'Supabase User',
      picture: 'https://example.com/avatar.jpg',
    });
    expect(JSON.parse(localStorage.getItem('av_user_profile') || '{}')).toEqual({
      id: 'supabase-uuid-456',
      email: 'supabase@example.com',
      name: 'Supabase User',
      picture: 'https://example.com/avatar.jpg',
    });
  });

  it('should sign in with Google OAuth', async () => {
    const { result } = renderHook(() => useAuthSlice());

    await act(async () => {
      await result.current.login();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  });

  it('should sign out from Supabase and clear local state', async () => {
    let resultHook: any;
    await act(async () => {
      const { result } = renderHook(() => useAuthSlice());
      resultHook = result;
    });

    // Now logout
    await act(async () => {
      await resultHook.current.logout();
    });

    expect(resultHook.current.user).toBeNull();
    expect(localStorage.getItem('av_user_profile')).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
