import React, { useMemo } from 'react';
import { useSync } from '../contexts/AppContext';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SyncMonitor: React.FC = () => {
  const { syncStats, isSyncing, backendStatus } = useSync();
  
  const { pending, processing, failed, total, lastError } = syncStats || { pending: 0, processing: 0, failed: 0, total: 0 };

  const status = useMemo(() => {
    if (backendStatus === 'offline') return 'offline';
    if (failed > 0) return 'error';
    if (processing > 0 || isSyncing) return 'syncing';
    if (pending > 0) return 'pending';
    return 'idle';
  }, [failed, processing, isSyncing, pending, backendStatus]);

  if (total === 0 && status === 'idle' && backendStatus === 'online') return (
    <div className="flex items-center gap-2 text-green-500/40 text-[10px] font-black uppercase tracking-widest animate-in fade-in duration-700">
       <CheckCircle2 className="w-3.5 h-3.5" />
       <span className="hidden sm:inline">Vault Secure</span>
    </div>
  );

  const getIcon = () => {
    switch (status) {
      case 'offline': return <CloudOff className="w-4 h-4 text-gray-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'pending': return <Cloud className="w-4 h-4 text-yellow-500 animate-bounce" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      case 'syncing': return `Syncing ${total}`;
      case 'pending': return 'Waiting';
      default: return 'Synced';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 bg-white/5 ${
      status === 'error' ? 'border-red-900/50 text-red-400' :
      status === 'syncing' ? 'border-blue-900/50 text-blue-400' :
      status === 'offline' ? 'border-gray-800 text-gray-500' :
      'border-green-900/50 text-green-400'
    }`} title={status === 'error' ? lastError : undefined}>
      {getIcon()}
      <span className="text-[10px] font-black uppercase tracking-tighter hidden md:inline">
        {getLabel()}
      </span>
    </div>
  );
};
