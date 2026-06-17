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

const googleClientId = API_KEYS.GOOGLE_CLIENT_ID;
const isMissingConfig = !googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID';

if (isMissingConfig) {
  const container = document.createElement('div');
  container.style.cssText = 'min-height:100vh;background:#0a0a0a;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:white;padding:2rem;';
  container.innerHTML = `
    <div style="max-width:480px;text-align:center;">
      <div style="width:48px;height:48px;background:#ef4444;border-radius:12px;margin:0 auto 1.5rem;display:flex;align-items:center;justify-content:center;font-size:24px;">⚙️</div>
      <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:0.75rem;">Setup Required</h1>
      <p style="color:#9ca3af;margin-bottom:1.5rem;line-height:1.6;">
        This app needs a few API keys to work. Please add the following secrets in the Replit Secrets panel, then refresh the page:
      </p>
      <ul style="text-align:left;background:#1a1a1a;border-radius:8px;padding:1rem 1.25rem;list-style:none;margin-bottom:1.5rem;">
        <li style="padding:0.4rem 0;border-bottom:1px solid #2a2a2a;font-size:0.875rem;"><code style="color:#60a5fa;">VITE_GOOGLE_CLIENT_ID</code> — Google OAuth Client ID</li>
        <li style="padding:0.4rem 0;border-bottom:1px solid #2a2a2a;font-size:0.875rem;"><code style="color:#60a5fa;">VITE_SUPABASE_URL</code> — Your Supabase project URL</li>
        <li style="padding:0.4rem 0;border-bottom:1px solid #2a2a2a;font-size:0.875rem;"><code style="color:#60a5fa;">VITE_SUPABASE_ANON_KEY</code> — Your Supabase anon key</li>
        <li style="padding:0.4rem 0;font-size:0.875rem;"><code style="color:#60a5fa;">VITE_TMDB_API_KEY</code> — TMDB API key (optional)</li>
      </ul>
      <button onclick="window.location.reload()" style="background:#ef4444;color:white;border:none;padding:0.75rem 2rem;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9375rem;">
        Refresh After Adding Secrets
      </button>
    </div>
  `;
  rootElement.appendChild(container);
} else {
  // Global safety timeout to detect "Blank Screen"
  setTimeout(() => {
    if (rootElement.children.length === 0) {
      const container = document.createElement('div');
      container.style.cssText = 'padding: 3rem; text-align: center; color: white; background: #0a0a0a; min-height: 100vh; font-family: sans-serif;';
      const heading = document.createElement('h1');
      heading.style.color = '#ef4444';
      heading.textContent = 'Mounting Delay Detected';
      const message = document.createElement('p');
      message.textContent = 'The application is taking longer than usual to initialize.';
      const button = document.createElement('button');
      button.style.cssText = 'padding: 10px 20px; background: white; color: black; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; margin-top: 20px;';
      button.textContent = 'Force Reload';
      // @ts-ignore
      button.onclick = () => window.location.reload(true);
      container.appendChild(heading);
      container.appendChild(message);
      container.appendChild(button);
      rootElement.appendChild(container);
    }
  }, 8000);

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
