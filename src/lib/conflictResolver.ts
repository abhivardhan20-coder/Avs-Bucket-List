import { SyncEntry } from '@/services/syncService';
import { ConflictStrategy } from '@/types';

export interface ConflictLog {
  id: string; // appId
  timestamp: string;
  strategy: ConflictStrategy;
  reason: string;
  resolvedVersion: number;
}

// Pending audit buffer — flush every 5 entries or 2s to reduce localStorage I/O
const _auditBuffer: ConflictLog[] = [];
let _auditTimer: NodeJS.Timeout | null = null;

const flushAuditLog = () => {
  if (_auditBuffer.length === 0) return;
  try {
    const existing = JSON.parse(localStorage.getItem('av_conflict_audit') || '[]');
    // Add new logs to the start, cap at 50 entries
    const merged = [..._auditBuffer, ...existing].slice(0, 50);
    localStorage.setItem('av_conflict_audit', JSON.stringify(merged));
    _auditBuffer.length = 0;
  } catch (err) {
    console.warn("[ConflictResolver] Audit flush failed", err);
  } finally {
    if (_auditTimer) {
      clearTimeout(_auditTimer);
      _auditTimer = null;
    }
  }
};

/**
 * Conflict Detection Logic (Hierarchy: Version -> updatedAt)
 */
export const resolveConflict = (
  local: SyncEntry, 
  cloud: SyncEntry, 
  strategy: ConflictStrategy = 'lww'
): SyncEntry => {
  if (import.meta.env.DEV) {
    console.debug(`[ConflictResolver] Resolving ${local.id} | LocalV: ${local.version} CloudV: ${cloud.version}`);
  }
  
  const resolved = strategy === 'lww' 
    ? resolveLWW(local, cloud) 
    : resolveMerge(local, cloud);

  // Audit Log (localStorage for debug) - Debounced
  const logEntry: ConflictLog = {
    id: local.id,
    timestamp: new Date().toISOString(),
    strategy,
    reason: `V: L${local.version} vs C${cloud.version} | T: L${local.updatedAt} vs C${cloud.updatedAt}`,
    resolvedVersion: resolved.version || 1
  };

  _auditBuffer.unshift(logEntry); // Add to start of buffer
  if (_auditBuffer.length >= 5) {
    flushAuditLog();
  } else if (!_auditTimer) {
    _auditTimer = setTimeout(flushAuditLog, 2000);
  }

  return resolved;
};

/**
 * Last-Write-Wins based on Version first, then updatedAt timestamp.
 * Strictly follows user-provided resolution logic.
 */
export const resolveLWW = (local: SyncEntry, remote: SyncEntry): SyncEntry => {
  // 1. Version check (fastest)
  if ((local.version || 0) > (remote.version || 0)) return local;
  if ((remote.version || 0) > (local.version || 0)) return remote;

  // 2. Timestamp check
  return (local.updatedAt || '') > (remote.updatedAt || '') ? local : remote;
};

/**
 * Optimized Intelligent Merger
 * Avoids full JSON parsing for scalar changes.
 */
export const resolveMerge = (local: SyncEntry, remote: SyncEntry): SyncEntry => {
  const localVer = local.version || 0;
  const remoteVer = remote.version || 0;
  
  // 1. Fast Path: If versions differ significantly, take the winner and increment
  if (remoteVer > localVer) {
    return { ...local, ...remote, version: remoteVer + 1, updatedAt: new Date().toISOString() };
  }
  if (localVer > remoteVer) {
    return { ...local, version: localVer + 1, updatedAt: new Date().toISOString() };
  }

  // 2. Tie-breaker check (Versions are equal)
  const isRemoteNewer = (remote.updatedAt || '') > (local.updatedAt || '');
  const base = isRemoteNewer ? remote : local;
  const other = isRemoteNewer ? local : remote;

  // 3. Payload Merge (Only if payloads actually differ as strings)
  let mergedPayload = base.payload;
  if (local.payload && remote.payload && local.payload !== remote.payload) {
    try {
      const pLocal = JSON.parse(local.payload);
      const pRemote = JSON.parse(remote.payload);
      
      // Deep merge set-like fields
      const pMerged: Record<string, any> = { ...pRemote, ...pLocal };
      
      const setFields = ['watchlistEpisodeIds', 'watchlistSeasonIds', 'watchedEpisodeIds'];
      for (const key of setFields) {
        if (pLocal[key] || pRemote[key]) {
          pMerged[key] = Array.from(new Set([...(pLocal[key] || []), ...(pRemote[key] || [])]));
        }
      }
      
      // Numerical fields (max wins)
      if (typeof pLocal.progress === 'number' || typeof pRemote.progress === 'number') {
        pMerged.progress = Math.max(Number(pLocal.progress || 0), Number(pRemote.progress || 0));
      }
      if (typeof pLocal.watchedEpisodes === 'number' || typeof pRemote.watchedEpisodes === 'number') {
        pMerged.watchedEpisodes = Math.max(Number(pLocal.watchedEpisodes || 0), Number(pRemote.watchedEpisodes || 0));
      }

      mergedPayload = JSON.stringify(pMerged);
    } catch (err) {
      console.warn(`[ConflictResolver] Optimization bypass: Fallback to base payload`, err);
    }
  }

  return {
    ...base,
    payload: mergedPayload,
    version: Math.max(localVer, remoteVer) + 1,
    updatedAt: new Date().toISOString()
  };
};
