'use client';
import { useAuth } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RootLayout } from '@/layouts/RootLayout';
import { ModalsLayer } from '@/components/ModalsLayer';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <RootLayout>
      <main id="main-content" className="outline-none" tabIndex={-1}>
        {children}
      </main>
      <ModalsLayer />
    </RootLayout>
  );
}
