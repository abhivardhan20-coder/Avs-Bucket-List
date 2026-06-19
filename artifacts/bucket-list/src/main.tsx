import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { UIProvider } from './contexts/UIContext';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { API_KEYS } from './services/config';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker
registerSW({ immediate: true });

if (import.meta.env.PROD) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn && dsn !== 'https://placeholder@o0.ingest.sentry.io/0') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const missingVars: string[] = [];
if (!API_KEYS.GOOGLE_CLIENT_ID || API_KEYS.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') missingVars.push('VITE_GOOGLE_CLIENT_ID');
if (!import.meta.env.VITE_SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');

const isMissingConfig = missingVars.length > 0;

if (isMissingConfig) {
  if (import.meta.env.PROD) {
    throw new Error(`CRITICAL: Missing required environment variables in production: ${missingVars.join(', ')}`);
  }

  const MissingConfigScreen = () => (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: '#ef4444', borderRadius: '12px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚙️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Setup Required</h1>
        <p style={{ color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          This app needs a few API keys to work. Please add the following secrets in the Replit Secrets panel, then refresh the page:
        </p>
        <ul style={{ textAlign: 'left', background: '#1a1a1a', borderRadius: '8px', padding: '1rem 1.25rem', listStyle: 'none', marginBottom: '1.5rem' }}>
          {missingVars.map(v => (
            <li key={v} style={{ padding: '0.4rem 0', borderBottom: '1px solid #2a2a2a', fontSize: '0.875rem' }}>
              <code style={{ color: '#ef4444' }}>{v}</code> is missing
            </li>
          ))}
        </ul>
        <button onClick={() => window.location.reload()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' }}>
          Refresh After Adding Secrets
        </button>
      </div>
    </div>
  );
  
  const root = createRoot(rootElement);
  root.render(<MissingConfigScreen />);
} else {

  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AppProvider>
            <UIProvider>
              <App />
              <Toaster position="bottom-right" theme="dark" />
            </UIProvider>
          </AppProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
