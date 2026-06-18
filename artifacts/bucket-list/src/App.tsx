import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/AppContext';
import { RootLayout } from '@/layouts/RootLayout';
import LoginPage from '@/components/LoginPage';
import { AppRoutes } from '@/AppRoutes';
import { ModalsLayer } from '@/components/ModalsLayer';

function App() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <RootLayout>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-12 focus:z-[100] focus:px-4 focus:py-2 focus:bg-red-600 focus:text-white focus:rounded-md focus:font-bold">
        Skip to content
      </a>

      <main id="main-content" className="outline-none" tabIndex={-1}>
        <Suspense fallback={
          <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-6">
            <div className="relative">
                <div className="w-12 h-12 border-t-2 border-red-600 rounded-full animate-spin" />
                <div className="absolute inset-0 blur-2xl bg-red-600/20 animate-pulse" />
            </div>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Syncing Interface</p>
          </div>
        }>
          <AppRoutes />
        </Suspense>
      </main>

      <ModalsLayer />
    </RootLayout>
  );
}

export default React.memo(App);