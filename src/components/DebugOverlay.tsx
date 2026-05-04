import React, { useEffect, useState } from 'react';

export const DebugOverlay: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Use setTimeout to avoid 'Cannot update a component while rendering another component' warning
            setTimeout(() => {
                setLogs(prev => [...prev.slice(-4), `ERROR: ${args.join(' ')}`]);
            }, 0);
            originalConsoleError(...args);
        };

        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
            // Filter out Google Sign-In warnings that spam the overlay
            if (args.some(arg => typeof arg === 'string' && (
                arg.includes('[GSI_LOGGER]') || 
                arg.includes('width(-1) and height(-1)') ||
                (arg.includes('TMDB API warning') && arg.includes('404'))
            ))) {
                originalConsoleWarn(...args);
                return;
            }
            // Use setTimeout to avoid 'Cannot update a component while rendering another component' warning
            setTimeout(() => {
                setLogs(prev => [...prev.slice(-4), `WARN: ${args.join(' ')}`]);
            }, 0);
            originalConsoleWarn(...args);
        };

        const errorHandler = (event: ErrorEvent) => {
            setLogs(prev => [...prev.slice(-4), `UNCAUGHT: ${event.message} at ${event.filename}:${event.lineno}`]);
        };

        window.addEventListener('error', errorHandler);

        // Test log
        console.log("Debug Overlay Initialized");

        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            window.removeEventListener('error', errorHandler);
        };
    }, []);

    if (logs.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 z-[9999] w-full max-h-[30vh] overflow-y-auto bg-black/90 text-white font-mono text-[10px] p-2 shadow-2xl border-t border-red-900/50">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-black/95 py-1 border-b border-white/10">
                <h3 className="font-bold text-red-500">Debug Output ({logs.length})</h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => setLogs([])}
                        className="hover:text-red-400 cursor-pointer px-2 py-0.5 rounded border border-white/10 hover:bg-white/5"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        className="hover:text-red-400 cursor-pointer px-2 py-0.5 rounded border border-white/10 hover:bg-white/5"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
            <div className="flex flex-col-reverse">
                {logs.map((log, i) => (
                    <div key={i} className="mb-0.5 py-0.5 border-b border-white/5 whitespace-pre-wrap break-words hover:bg-white/5 px-1 rounded">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};