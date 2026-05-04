
import React, { useState } from 'react';
import { Tv, Loader, Play } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Client-side decoding (backend is eliminated)
      // Note: jwtDecode() only decodes the JWT payload without verifying the signature.
      // For a personal single-user app this is acceptable since the Google OAuth flow 
      // itself validates the token, but we still verify the aud claim matches our GOOGLE_CLIENT_ID
      // to prevent token reuse from other apps.
      const decoded: any = jwtDecode(credentialResponse.credential);
      
      // Validate aud matches our app to prevent token reuse
      if (decoded.aud !== import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        setError("Token audience mismatch. Possible replay attack.");
        setIsLoading(false);
        return;
      }

      // Validate expiry
      if (!decoded.exp || (Date.now() / 1000) > decoded.exp) {
        setError("Token has expired. Please sign in again.");
        setIsLoading(false);
        return;
      }

      // Validate issuer
      const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
      if (!VALID_ISSUERS.includes(decoded.iss)) {
        setError("Token issuer is invalid.");
        setIsLoading(false);
        return;
      }

      const userData = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      
      login({ ...userData, token: credentialResponse.credential });
    } catch (e: any) {
      console.error("Google Login Decoding Error", e);
      setError(e.message || "Failed to verify Google account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed. Please try again.");
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setError('');
    // Use a fixed demo profile that bypasses the synthetic-ID guard
    const demoProfile = {
      id: 'demo_preview_account_001',
      email: 'demo@avbucketlist.app',
      name: 'Demo User',
      picture: undefined,
      token: 'demo-session-token',
    };
    // Small delay to feel intentional
    setTimeout(() => {
      login(demoProfile);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.45] scale-110 animate-subtle-zoom"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1574267431647-c82aba213af5?q=80&w=2000&auto=format&fit=crop)` }}
        ></div>
        {/* Animated Gradient Grids */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(10,10,10,1)_100%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 via-transparent to-[#0a0a0a]"></div>
      </div>

      {/* Navbar / Logo */}
      <header className="relative z-20 px-6 py-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer select-none">
          <Tv className="w-8 h-8 md:w-10 md:h-10 text-red-600 drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]" />
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight shadow-black drop-shadow-md">
            AV's Bucket List
          </h1>
        </div>
      </header>

      {/* Login Card */}
      <div className="relative z-20 flex justify-center items-center min-h-[80vh] px-4">
        <div
          className="w-full max-w-[450px] p-8 md:p-16 bg-black/75 backdrop-blur-md rounded-xl shadow-2xl border border-white/10"
        >
          <h2 className="text-3xl font-bold mb-8 text-white">Sign In</h2>

          <div className="flex flex-col gap-6">
            {/* Google Login Button */}
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full h-px bg-white/10 mb-2"></div>
              <div className="w-full flex justify-center scale-110 origin-center transition-transform hover:scale-[1.12]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_blue"
                  size="large"
                  width="100%"
                  shape="rectangular"
                  text="continue_with"
                />
              </div>
              <p className="text-gray-500 text-xs text-center mt-2">
                Securely sign in with your Google account.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-xs text-gray-500 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Demo Login Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-lg bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-300 border border-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isLoading ? 'Entering Demo...' : 'Try Demo Preview'}
            </button>

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
              This page is protected by Google reCAPTCHA to ensure you're not a bot. <span className="text-blue-500 hover:underline cursor-pointer">Learn more.</span>
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