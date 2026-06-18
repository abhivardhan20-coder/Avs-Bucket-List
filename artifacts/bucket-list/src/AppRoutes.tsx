import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

export const ROUTES = {
  HOME: '/',
  UPCOMING: '/upcoming',
  WATCHLIST: '/watchlist',
  WATCHED: '/watched',
  STATS: '/stats',
};

// Lazy Pages for better initial load performance
// Preload the critical home chunk if needed, but lazy load works well here.
const Home = lazyWithRetry(() => import(/* webpackChunkName: "home" */ '@/pages/Home').then(module => ({ default: module.Home })));
const Upcoming = lazyWithRetry(() => import(/* webpackChunkName: "upcoming" */ '@/pages/Upcoming').then(module => ({ default: module.Upcoming })));
const Watchlist = lazyWithRetry(() => import(/* webpackChunkName: "watchlist" */ '@/pages/Watchlist').then(module => ({ default: module.Watchlist })));
const Watched = lazyWithRetry(() => import(/* webpackChunkName: "watched" */ '@/pages/Watched').then(module => ({ default: module.Watched })));
const StatsDashboard = lazyWithRetry(() => import(/* webpackChunkName: "stats" */ '@/components/stats/StatsDashboard'));

const routeConfig = [
  { path: ROUTES.HOME, element: <Home /> },
  { path: ROUTES.UPCOMING, element: <Upcoming /> },
  { path: ROUTES.WATCHLIST, element: <Watchlist /> },
  { path: ROUTES.WATCHED, element: <Watched /> },
  { path: ROUTES.STATS, element: <StatsDashboard /> },
  { path: "*", element: <Navigate to={ROUTES.HOME} replace /> }
];

/**
 * Main application router configuration.
 * Handles lazy loading of all route components to optimize initial bundle size.
 * Automatically wraps lazy-loaded pages with Suspense boundaries.
 * 
 * @component
 * @returns The populated Route components for wouter.
 */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {routeConfig.map((route, idx) => (
        <Route key={idx} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
};
