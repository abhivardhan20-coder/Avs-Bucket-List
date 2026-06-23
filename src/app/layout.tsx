import type { Metadata } from 'next';
import { AppProvider } from '@/contexts/AppContext';
import QueryProvider from '@/providers/QueryProvider';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Avs Bucket List',
  description: 'Your personal movie & TV bucket list',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </AppProvider>
      </body>
    </html>
  );
}
