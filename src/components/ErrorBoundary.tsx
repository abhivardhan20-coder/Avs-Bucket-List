import React, { useCallback } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertTriangle, RefreshCcw, Home, X, Bug } from 'lucide-react';

export type ErrorVariant = 'full' | 'row' | 'modal';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  variant?: ErrorVariant;
  onReset?: () => void;
  resetKeys?: Array<unknown>;
  fallback?: React.ReactNode;
  /** Optional custom error reporter (e.g. Sentry) */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

/**
 * Standardized Error Reporting Logic
 */
const reportError = (error: Error, info: { componentStack: string }, variant: ErrorVariant) => {
  console.group(`%c Error Boundary Caught [${variant}] `, 'background: #991b1b; color: #fff; font-weight: bold;');
  console.error('Error:', error.message);
  console.error('Component Stack:', info.componentStack);
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Modernized Error Boundary for AV's Bucket List.
 * Built on react-error-boundary v5+ + TanStack Query integration.
 */
export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({
  children,
  variant = 'full',
  onReset,
  resetKeys,
  fallback,
  onError
}) => {
  const { reset: resetQueries } = useQueryErrorResetBoundary();

  const handleReset = useCallback(() => {
    resetQueries();
    onReset?.();
  }, [resetQueries, onReset]);

  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    reportError(error, info, variant);
    onError?.(error, info);
  }, [variant, onError]);

  // If a custom static fallback is provided, use it
  if (fallback) {
    return (
      <ReactErrorBoundary
        fallback={fallback as React.ReactElement}
        onReset={handleReset}
        onError={handleError}
        resetKeys={resetKeys}
      >
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary
      fallbackRender={(props) => (
        <ErrorFallback {...props} variant={variant} onReset={handleReset} />
      )}
      onReset={handleReset}
      onError={handleError}
      resetKeys={resetKeys}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Aliasing for compatibility
export { AppErrorBoundary as ErrorBoundary };

interface ErrorFallbackProps extends FallbackProps {
  variant: ErrorVariant;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  variant,
  onReset
}) => {
  const isDev = import.meta.env.DEV;

  const handleRetry = () => {
    onReset();
    resetErrorBoundary();
  };

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (variant === 'row') {
    return (
      <div className="w-full min-h-[220px] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 text-gray-500 gap-4 my-6 p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 bg-red-900/10 rounded-full border border-red-900/20">
          <Bug className="w-6 h-6 text-red-500/60" />
        </div>
        <div className="text-center space-y-1">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Section Unavailable</h4>
          <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed">
            Content encountered a temporary glitch. Other sections are unaffected.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-lg transition-all border border-white/10 active:scale-95"
          >
            <RefreshCcw className="w-3 h-3" />
            Retry
          </button>
          <button 
            onClick={resetErrorBoundary}
            className="text-[11px] font-medium text-gray-600 hover:text-gray-400 underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in backdrop-blur-xl bg-black/60">
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-3xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50" />
          <button 
            onClick={resetErrorBoundary} 
            className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-900/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <h3 className="text-2xl font-black text-white mb-3">Failed to load details</h3>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            {errorMessage || "The media metadata could not be fetched securely. This might be a temporary network issue."}
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleRetry}
              className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Try Again
            </button>
            <button 
              onClick={resetErrorBoundary}
              className="w-full bg-transparent text-gray-500 py-2 text-xs font-bold hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      <div className="relative mb-10 group">
        <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-full group-hover:bg-red-600/30 transition-all duration-500" />
        <div className="relative bg-black border border-white/5 p-8 rounded-full shadow-2xl">
          <AlertTriangle className="w-20 h-20 text-red-600" />
        </div>
      </div>

      <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
        System Interruption
      </h1>
      
      <p className="text-gray-400 max-w-lg mb-10 text-lg leading-relaxed font-medium">
        An unexpected logic error occurred. We've logged the incident and are ready to recover.
      </p>

      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-3 px-10 py-4 bg-white text-black rounded-2xl font-black hover:bg-gray-200 transition-all shadow-xl active:scale-95 text-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Hard Refresh
        </button>
        <button
          onClick={() => {
            onReset();
            window.location.href = '/';
          }}
          className="flex items-center justify-center gap-3 px-10 py-4 bg-white/5 text-white rounded-2xl font-black hover:bg-white/10 transition-all border border-white/10 active:scale-95 text-sm"
        >
          <Home className="w-4 h-4" />
          Go Home
        </button>
      </div>

      {isDev && (
        <div className="mt-16 p-8 bg-black/80 rounded-2xl border border-white/5 max-w-4xl w-full text-left overflow-auto max-h-80 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 text-red-500 border-b border-white/5 pb-2">
            <Bug className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Developer Context</span>
          </div>
          <p className="text-red-400/90 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
            {errorStack || errorMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export const withAppErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AppErrorBoundaryProps, 'children'>
) => {
  return (props: P) => (
    <AppErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AppErrorBoundary>
  );
};