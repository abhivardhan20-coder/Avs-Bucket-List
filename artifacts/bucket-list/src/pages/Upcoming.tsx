import React from 'react';
import UpcomingDashboard from '@/components/upcoming/UpcomingDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUI } from '@/contexts/UIContext';

export const Upcoming: React.FC = React.memo(() => {
    const { handleSetSelectedContent } = useUI();

    return (
        <ErrorBoundary>
            <UpcomingDashboard
                onResultClick={handleSetSelectedContent}
            />
        </ErrorBoundary>
    );
});