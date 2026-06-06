import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastProvider';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn && dsn !== 'https://placeholder@o0.ingest.sentry.io/0') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }
}

// Service worker is registered automatically by vite-plugin-pwa (registerType: 'autoUpdate')

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
  throw new Error(errorMsg);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global safety timeout to detect "Blank Screen"
setTimeout(() => {
  if (rootElement.innerHTML === '') {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 3rem; text-align: center; color: white; background: #0a0a0a; min-height: 100vh; font-family: sans-serif;';
    
    const heading = document.createElement('h1');
    heading.style.color = '#ef4444';
    heading.textContent = 'Mounting Delay Detected';
    
    const message = document.createElement('p');
    message.textContent = 'The application is taking longer than usual to initialize.';
    
    const button = document.createElement('button');
    button.style.cssText = 'padding: 10px 20px; background: white; color: black; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; margin-top: 20px;';
    button.textContent = 'Force Reload (Clear Cache)';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    button.onclick = () => window.location.reload(true);
    
    container.appendChild(heading);
    container.appendChild(message);
    container.appendChild(button);
    
    rootElement.appendChild(container);
  }
}, 8000);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary variant="full">
          <GoogleOAuthProvider clientId={API_KEYS.GOOGLE_CLIENT_ID}>
            <ToastProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </ToastProvider>
          </GoogleOAuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);