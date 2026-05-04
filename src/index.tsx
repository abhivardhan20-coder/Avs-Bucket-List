import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastProvider';

// ✅ Register service worker for offline resilience and PWA caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err =>
      console.warn('SW registration failed:', err)
    );
  });
}

const DebugOverlay = import.meta.env.DEV
  ? React.lazy(() => import('./components/DebugOverlay').then(m => ({ default: m.DebugOverlay })))
  : null;

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { API_KEYS } from './services/config';
 
if (!API_KEYS.GOOGLE_CLIENT_ID || API_KEYS.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
  const errorMsg = "CRITICAL: VITE_GOOGLE_CLIENT_ID is missing or set to placeholder. Application cannot authenticate.";
  console.error(errorMsg);
  // Show a basic UI error if root hasn't been created yet
  const rootElement = document.getElementById('root');
  if (rootElement) {
    // Use safe DOM API to avoid XSS
    const container = document.createElement('div');
    container.style.cssText = 'padding: 2rem; color: #ef4444; font-family: sans-serif; text-align: center;';
    
    const heading = document.createElement('h1');
    heading.textContent = 'Configuration Error';
    
    const message = document.createElement('p');
    message.textContent = errorMsg;  // Safe - no HTML parsing
    
    container.appendChild(heading);
    container.appendChild(message);
    rootElement.innerHTML = '';
    rootElement.appendChild(container);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {import.meta.env.DEV && DebugOverlay && (
        <React.Suspense fallback={null}>
          <DebugOverlay />
        </React.Suspense>
      )}
      <AppErrorBoundary variant="full">
        <GoogleOAuthProvider clientId={API_KEYS.GOOGLE_CLIENT_ID}>
          <ToastProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ToastProvider>
        </GoogleOAuthProvider>
      </AppErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);