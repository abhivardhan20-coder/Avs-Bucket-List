import React, { useState } from 'react';
import { X, Shield, Cloud, CheckCircle2, History } from 'lucide-react';
import { db, ConflictRecord, WatchlistDBItem, WatchedDBItem } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { fromSyncEntry, SyncEntry } from '../services/syncService';
import { useAuth } from '../contexts/AppContext';

interface ConflictReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictReviewModal: React.FC<ConflictReviewModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const conflicts = useLiveQuery(
    () => db.conflicts.where('resolved').equals(0).toArray(),
    []
  );

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResolve = async (conflict: ConflictRecord, side: 'local' | 'cloud') => {
    if (!user || !conflict.id) return;
    setResolvingId(conflict.id);
    
    try {
      const winner = side === 'local' ? conflict.localSnapshot : conflict.cloudSnapshot;
      
      // 1. Update the actual data table
      const itemData = fromSyncEntry(winner as unknown as SyncEntry, user.email);
      if (winner.status === 'watchlist') {
        await db.watchlist.put(itemData as WatchlistDBItem);
      } else {
        await db.watched.put(itemData as WatchedDBItem);
      }

      // 2. Mark conflict as resolved
      await db.conflicts.update([user.email, conflict.itemId], {
        resolved: 1,
        resolvedWith: side
      });

      console.log(`[Conflict] Resolved ${conflict.itemId} using ${side} version`);
    } catch (err) {
      console.error("Resolution failed", err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <History className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Sync Conflict Review</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                {conflicts?.length || 0} items pending resolution
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {conflicts && conflicts.length > 0 ? (
            conflicts.map((conflict) => (
              <ConflictItemCard 
                key={conflict.id} 
                conflict={conflict} 
                onResolve={handleResolve}
                isResolving={resolvingId === conflict.id}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-green-600/10 rounded-full mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-50" />
              </div>
              <p className="text-gray-400 font-bold">All conflicts resolved!</p>
              <button 
                onClick={onClose}
                className="mt-6 text-sm text-gray-500 underline hover:text-white transition-colors"
              >
                Close Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConflictItemCard = ({ 
  conflict, 
  onResolve,
  isResolving 
}: { 
  conflict: ConflictRecord, 
  onResolve: (c: ConflictRecord, side: 'local' | 'cloud') => void,
  isResolving: boolean
}) => {
  const local = conflict.localSnapshot;
  const cloud = conflict.cloudSnapshot;

  const parsePayload = (payload?: string) => {
    try { return payload ? JSON.parse(payload) : {}; } catch { return {}; }
  };

  const pLocal = parsePayload(local.payload);
  const pCloud = parsePayload(cloud.payload);

  return (
    <div className="border border-white/5 rounded-xl bg-white/[0.02] overflow-hidden">
      <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-black text-lg text-white">{conflict.title}</h3>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 py-1 bg-black/40 rounded border border-white/5">
          {local.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
        {/* Local Snapshot */}
        <div className="bg-[#141414] p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Local Version (This Device)</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-white/5 py-1">
              <span className="text-gray-500">Version</span>
              <span className="text-white font-bold">{local.version}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-1">
              <span className="text-gray-500">Updated</span>
              <span className="text-white font-bold">{new Date(local.updatedAt).toLocaleDateString()}</span>
            </div>
            {pLocal.watchedEpisodes !== undefined && (
               <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-gray-500">Episodes</span>
                <span className="text-white font-bold">{pLocal.watchedEpisodes}</span>
              </div>
            )}
            {pLocal.rating !== undefined && (
               <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-gray-500">Rating</span>
                <span className="text-white font-bold">{pLocal.rating}/10</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => onResolve(conflict, 'local')}
            disabled={isResolving}
            className="w-full py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-lg text-blue-500 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {isResolving ? 'Resolving...' : 'Keep Local Version'}
          </button>
        </div>

        {/* Cloud Snapshot */}
        <div className="bg-[#141414] p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Cloud Version (Remote)</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-white/5 py-1">
              <span className="text-gray-500">Version</span>
              <span className="text-white font-bold">{cloud.version}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-1">
              <span className="text-gray-500">Updated</span>
              <span className="text-white font-bold">{new Date(cloud.updatedAt).toLocaleDateString()}</span>
            </div>
            {pCloud.watchedEpisodes !== undefined && (
               <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-gray-500">Episodes</span>
                <span className="text-white font-bold">{pCloud.watchedEpisodes}</span>
              </div>
            )}
            {pCloud.rating !== undefined && (
               <div className="flex justify-between border-b border-white/5 py-1">
                <span className="text-gray-500">Rating</span>
                <span className="text-white font-bold">{pCloud.rating}/10</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => onResolve(conflict, 'cloud')}
            disabled={isResolving}
            className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 rounded-lg text-red-500 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {isResolving ? 'Resolving...' : 'Use Cloud Version'}
          </button>
        </div>
      </div>
    </div>
  );
};
