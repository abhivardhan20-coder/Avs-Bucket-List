'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Tv, Loader } from 'lucide-react';
import { usePostAuthConfirmReset } from '@/api-client-react';
import { useToast } from '@/contexts/ToastProvider';

const ConfirmResetContent: React.FC = () => {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const { mutateAsync: confirmReset, isPending } = usePostAuthConfirmReset();

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('Missing reset token. Please check your email link.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      await confirmReset({ data: { token, new_password: newPassword } });
      showToast('Password updated successfully. You can now log in.', 'success');
      navigate.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-radial-gradient"></div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-amber-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] mb-4">
              <Tv className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Reset Password
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Enter your new password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !token}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader className="animate-spin w-5 h-5" /> : 'Update Password'}
            </button>
          </form>

          {!token && (
            <p className="mt-4 text-sm text-red-400 text-center">
              No token found in URL. Please use the link sent to your email.
            </p>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfirmReset = () => (
  <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader className="animate-spin text-red-600 w-8 h-8" /></div>}>
    <ConfirmResetContent />
  </Suspense>
);

export default ConfirmReset;
