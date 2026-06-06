import React from 'react';
import { MediaItem } from '../../types';
import SearchModal from '../../components/search/SearchModal';

// This file now serves as a clean entry point / container for the Search Feature
// ensuring backward compatibility with App.tsx imports.

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (item: MediaItem) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = (props) => {
  return <SearchModal {...props} />;
};

export default GlobalSearch;