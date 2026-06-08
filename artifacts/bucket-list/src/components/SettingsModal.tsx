
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Upload, Database, CheckCircle, Trash2, Cloud, RefreshCw, FileText } from 'lucide-react';
import Modal from './ui/Modal';
import { useLibraryData, useSettings } from '../contexts/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useToast } from '../contexts/ToastProvider';
import { db } from '../lib/db';
import { useQueryClient } from '@tanstack/react-query';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { exportData, importData, clearData } = useSettings();
  const { watchlist, watched } = useLibraryData();
  const { isInstallable, isInstalled, showInstallPrompt } = usePWAInstall();
  const { showToast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleExport = () => {
    exportData();
    showToast("Backup file downloaded!", "success");
  };

  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to delete all saved data? This action cannot be undone.")) {
      const res = await clearData();
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        setTimeout(onClose, 1500);
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadLogs = async () => {
    try {
      const logs = await db.logs.orderBy('time').reverse().toArray();
      const content = JSON.stringify(logs, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `av_bucket_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Logs downloaded successfully", "success");
    } catch {
      showToast("Failed to download logs", "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importData(content);
      showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        setTimeout(onClose, 1500);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefreshSync = async () => {
    setIsSaving(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      await queryClient.invalidateQueries({ queryKey: ['watched'] });
      showToast("Data refreshed from Supabase!", "success");
    } catch {
      showToast('Refresh failed — check your connection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="settings-modal-title"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      className="w-full max-w-md mx-4"
      zIndex={150}
    >
      <div className="bg-[#1a1a1a] w-full rounded-2xl border border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh] relative custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1" aria-label="Close settings">
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <h2 id="settings-modal-title" className="text-2xl font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400 mb-8">Manage your data and preferences.</p>

          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{watchlist.length}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Watchlist</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{watched.length}</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Watched</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4" /> Data Management
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleExport} className="bg-[#0f0f0f] border border-gray-700 hover:border-gray-500 hover:bg-[#222] text-white p-4 rounded-xl flex flex-col items-center gap-3 transition-all group">
                  <div className="p-3 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                    <Download className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="font-medium">Export Data</span>
                </button>

                <button onClick={handleDownloadLogs} className="bg-[#0f0f0f] border border-gray-700 hover:border-gray-500 hover:bg-[#222] text-white p-4 rounded-xl flex flex-col items-center gap-3 transition-all group">
                  <div className="p-3 bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                    <FileText className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="font-medium">Export Logs</span>
                </button>

                <button onClick={handleImportClick} className="bg-[#0f0f0f] border border-gray-700 hover:border-gray-500 hover:bg-[#222] text-white p-4 rounded-xl flex flex-col items-center gap-3 transition-all group col-span-2">
                  <div className="p-3 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                    <Upload className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="font-medium">Import Data</span>
                </button>
              </div>

              {isInstallable && !isInstalled && (
                <button
                  onClick={showInstallPrompt}
                  className="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 transition-all group shadow-lg shadow-red-900/20"
                >
                  <Download className="w-5 h-5 animate-bounce" />
                  <span className="font-bold">Install Desktop App</span>
                </button>
              )}

              <button onClick={handleClearData} className="w-full bg-[#0f0f0f] border border-red-900/30 hover:border-red-600 hover:bg-red-900/10 text-red-500 p-4 rounded-xl flex items-center justify-center gap-3 transition-all group">
                <Trash2 className="w-5 h-5" />
                <span className="font-bold">Clear All Data</span>
              </button>

              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-4 h-4" /> Cloud Sync
                </h3>
                <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">Live</span>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-white font-bold text-sm">Supabase Real-time</p>
                    <p className="text-[11px] text-gray-500 leading-tight">Your watchlist and history are secured in Supabase.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sync Status</span>
                  <button onClick={handleRefreshSync} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-blue-900/20">
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Refresh Cloud
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;