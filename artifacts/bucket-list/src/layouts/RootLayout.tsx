
import React from 'react';
import Navbar from '@/components/Navbar';
import GlobalSearch from '@/features/search/GlobalSearch';
import SettingsModal from '@/components/SettingsModal';
import { MediaItem } from '@/types';
import { AlertTriangle, Plus, Loader } from 'lucide-react';
import { Toaster } from 'sonner';

interface RootLayoutProps {
    children: React.ReactNode;
    watchedCount: number;
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    onSearchResultClick: (item: MediaItem) => void;
    isProcessing: boolean;
    appError: string | null;
    setAppError: (error: string | null) => void;
    setSelectedContent?: (item: MediaItem, episodeId?: string) => void;
}

export const RootLayout: React.FC<RootLayoutProps> = ({
    children,
    watchedCount,
    isSearchOpen,
    setIsSearchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    onSearchResultClick,
    isProcessing,
    appError,
    setAppError,
    setSelectedContent
}) => {
    return (
        <div className="min-h-screen bg-[#141414] font-sans relative">

            {isProcessing && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-4">
                    <Loader className="w-12 h-12 text-red-600 animate-spin" />
                    <p className="text-white font-bold">Syncing content details...</p>
                </div>
            )}

            {appError && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-xl backdrop-blur-md border border-white/20 animate-in slide-in-from-top-4">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold">{appError}</span>
                    {appError.includes('connection') && (
                        <button onClick={() => window.location.reload()} className="underline ml-2 hover:text-gray-200">Retry</button>
                    )}
                    <button onClick={() => setAppError(null)} className="ml-4 opacity-70 hover:opacity-100"><Plus className="w-5 h-5 rotate-45" /></button>
                </div>
            )}

            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onResultClick={onSearchResultClick}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {children}

            {/* Top Level Utilities */}
            <div className="fixed inset-0 pointer-events-none z-[100]">
                <div className="pointer-events-auto">
                    <Navbar
                        watchedCount={watchedCount}
                        onSearchClick={() => setIsSearchOpen(true)}
                        onSettingsClick={() => setIsSettingsOpen(true)}
                    />
                </div>
            </div>
            
            <Toaster theme="dark" position="bottom-right" richColors />
        </div>
    );
};