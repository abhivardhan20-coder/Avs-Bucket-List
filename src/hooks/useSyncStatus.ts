import { useSync } from '../contexts/AppContext';

/**
 * Custom hook to monitor real-time synchronization status.
 * Provides pending, success, failed counts and recent debug logs.
 */
export function useSyncStatus() {
  const { syncStats, isSyncing, backendStatus } = useSync();

  return {
    ...syncStats,
    isSyncing,
    isOnline: backendStatus === 'online',
    // Convenience flags
    hasFailedTasks: syncStats.failed > 0,
    isIdle: !isSyncing && syncStats.pending === 0
  };
}
