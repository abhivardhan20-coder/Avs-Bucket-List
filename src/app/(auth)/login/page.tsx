'use client';


import React, { useState } from 'react';
import { Tv, Loader, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AppContext';

const LoginPage: React.FC = () => {
  const { signInWithGoogle, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle(); // Supabase handles the redirect
    } catch (e: any) {
      setError(e.message || 'Google Sign-In failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] scale-105 filter blur-[2px]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574267431629-2b5709b8f5f8?q=80&w=2000')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-radial-gradient"></div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Auth Card Container */}
        <div className="w-full max-w-[440px] bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-amber-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] mb-4">
              <Tv className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              AV's Bucket List
            </h1>
            <p className="text-[#a3a3a3] text-sm text-center mt-2">
              Track and discover your favorite media in one place.
            </p>
          </div>

          <div className="space-y-6">
            {/* Google Sign-in Section */}
            <div className="bg-white/[0.03] border border-white/5 p-5 rounded-xl hover:border-white/10 transition-colors">
              <h2 className="text-sm font-semibold text-white/90 mb-3 text-center">
                Sign in to Sync
              </h2>
              <div className="flex flex-col gap-3 justify-center">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader className="animate-spin w-5 h-5" /> : 'Continue with Google'}
                </button>
                <button
                  onClick={() => login({ id: 'demo-user-id', email: 'demo@example.com', name: 'Demo User', isDemo: true })}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded bg-gray-800 text-white font-medium hover:bg-gray-700 transition-colors"
                >
                  Demo Login
                </button>
              </div>
              <p className="text-gray-500 text-xs text-center mt-2">
                Securely sign in with your Google account.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[#e87c03] text-sm font-medium animate-in slide-in-from-top-1 text-center bg-[#e87c03]/10 p-2 rounded border border-[#e87c03]/20">
                {error}
              </div>
            )}



            {/* Secondary Actions (Help) */}
            <div className="flex justify-end items-center text-sm text-[#b3b3b3] mt-2">
              <button type="button" className="hover:underline hover:text-white transition-colors">Need help?</button>
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-16 text-[#737373]">
            <p className="text-xs leading-relaxed">
              Secure sign-in powered by Google OAuth via Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Gradient Line (Fixed to Top) */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 z-50"></div>
    </div>
  );
};

export default LoginPage;
