import React from 'react';
import { useSync } from '../contexts/AppContext';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SyncMonitor: React.FC = () => {
  const { backendStatus } = useSync();

  if (backendStatus === 'online') {
    return (
      <div className="flex items-center gap-2 text-green-500/80 text-[10px] font-black uppercase tracking-widest animate-in fade-in duration-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Vault Secure</span>
      </div>
    );
  }

  const getIcon = () => {
    switch (backendStatus) {
      case 'offline':
        return <CloudOff className="w-4 h-4 text-gray-500 animate-pulse" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <Cloud className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getLabel = () => {
    switch (backendStatus) {
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Connecting';
      default:
        return 'Connecting';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 bg-white/5 ${
      backendStatus === 'offline' ? 'border-gray-800 text-gray-500' : 'border-blue-900/50 text-blue-400'
    }`}>
      {getIcon()}
      <span className="text-[10px] font-black uppercase tracking-tighter hidden md:inline">
        {getLabel()}
      </span>
    </div>
  );
};
