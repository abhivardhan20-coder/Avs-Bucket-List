import { db } from '../lib/db';
import { AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export const ConflictBanner = ({ onReview }: { onReview: () => void }) => {
  // Use a reactive query for better UX than polling
  const count = useLiveQuery(
    () => db.conflicts.where('resolved').equals(0).count(),
    []
  );

  if (!count || count === 0) return null;

  return (
    <div className="bg-amber-600/20 border-b border-amber-600/30 px-4 py-3 flex items-center justify-between backdrop-blur-md animate-in slide-in-from-top-full duration-500">
      <div className="flex items-center gap-3 text-amber-500 text-sm font-bold">
        <AlertTriangle className="w-5 h-5 animate-pulse" />
        <span className="tracking-tight">{count} synchronization conflict{count > 1 ? 's' : ''} require your review</span>
      </div>
      <button 
        onClick={onReview} 
        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all active:scale-95 shadow-lg shadow-amber-950/40"
      >
        Review & Resolve
      </button>
    </div>
  );
};
