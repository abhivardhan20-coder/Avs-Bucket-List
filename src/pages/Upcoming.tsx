import React from 'react';
import UpcomingDashboard from '@/components/upcoming/UpcomingDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MediaItem } from '@/types';

interface UpcomingProps {
    setSelectedContent: (item: MediaItem) => void;
}

export const Upcoming: React.FC<UpcomingProps> = React.memo(({ setSelectedContent }) => {
    return (
        <ErrorBoundary>
            <UpcomingDashboard
                onResultClick={setSelectedContent}
            />
        </ErrorBoundary>
    );
});