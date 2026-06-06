
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import GlobalSearch from '@/features/search/GlobalSearch';
import SettingsModal from '@/components/SettingsModal';
import { WatchNextModal } from '@/components/WatchNextModal';
import { MediaItem } from '@/types';
import { AlertTriangle, Plus, Loader, Zap } from 'lucide-react';

interface RootLayoutProps {
    children: React.ReactNode;
    activeTab: 'home' | 'upcoming' | 'watchlist' | 'watched' | 'stats';
    setActiveTab: (tab: 'home' | 'upcoming' | 'watchlist' | 'watched' | 'stats') => void;
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
    activeTab,
    setActiveTab,
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
    const [isWatchNextOpen, setIsWatchNextOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#141414] font-sans relative">
            <WatchNextModal 
                isOpen={isWatchNextOpen} 
                onClose={() => setIsWatchNextOpen(false)} 
                setSelectedContent={setSelectedContent || (() => {})}
            />

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
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        watchedCount={watchedCount}
                        onSearchClick={() => setIsSearchOpen(true)}
                        onSettingsClick={() => setIsSettingsOpen(true)}
                    />
                </div>

                {!isWatchNextOpen && (
                    <div className="absolute bottom-24 right-6 pointer-events-auto">
                        <button
                            onClick={() => setIsWatchNextOpen(true)}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-full px-5 py-3.5 font-black text-xs shadow-[0_12px_40px_rgba(220,38,30,0.4)] flex items-center gap-2.5 active:scale-90 transition-all group overflow-hidden"
                            aria-label="What to watch? Get recommendations"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <Zap className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" />
                            <span className="mb-0.5 uppercase tracking-tighter font-black">What to watch?</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};