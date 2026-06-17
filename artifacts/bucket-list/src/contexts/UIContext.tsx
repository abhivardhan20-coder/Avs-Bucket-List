import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MediaItem } from '@/types';

interface UIContextType {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  appError: string | null;
  setAppError: (error: string | null) => void;
  selectedContent: MediaItem | null;
  initialEpisodeId?: string;
  handleSetSelectedContent: (item: MediaItem, episodeId?: string) => void;
  handleCloseModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  const [selectedContent, setSelectedContent] = useState<MediaItem | null>(null);
  const [initialEpisodeId, setInitialEpisodeId] = useState<string | undefined>(undefined);

  const handleSetSelectedContent = (item: MediaItem, episodeId?: string) => {
    setSelectedContent(item);
    setInitialEpisodeId(episodeId);
  };

  const handleCloseModal = () => {
    setSelectedContent(null);
    setInitialEpisodeId(undefined);
  };

  return (
    <UIContext.Provider value={{
      isSearchOpen, setIsSearchOpen,
      isSettingsOpen, setIsSettingsOpen,
      appError, setAppError,
      selectedContent, initialEpisodeId,
      handleSetSelectedContent, handleCloseModal
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
