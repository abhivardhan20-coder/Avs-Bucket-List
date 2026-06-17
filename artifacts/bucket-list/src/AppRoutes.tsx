import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Types for props
interface AppRoutesProps {
  Home: React.ComponentType<any>;
  Upcoming: React.ComponentType<any>;
  Watchlist: React.ComponentType<any>;
  Watched: React.ComponentType<any>;
  StatsDashboard: React.ComponentType<any>;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  Home, Upcoming, Watchlist, Watched, StatsDashboard
}) => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upcoming" element={<Upcoming />} />
      <Route path="/watchlist" element={<Watchlist />} />
      <Route path="/watched" element={<Watched />} />
      <Route path="/stats" element={<StatsDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
