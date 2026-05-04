import React from 'react';
import { X, ChevronLeft } from 'lucide-react';

interface StackedLayerProps {
  children: React.ReactNode;
  isActive: boolean;
  onClose: () => void;
  index: number; // Position in stack (0 is Home, 1 is first layer, etc.)
  title: string;
}

export const StackedLayer: React.FC<StackedLayerProps> = ({ 
  children, 
  isActive, 
  onClose, 
  index,
  title 
}) => {
  // Home is index 0 and isn't a "stacked layer" usually, but we start offsets from index 1
  const topOffset = index * 24; // 24px sliver per layer
  const zIndex = 30 + index; // Starting above main content (z-10-20)
  
  return (
    <div 
      className={`fixed inset-0 flex flex-col transition-all duration-500 ease-out shadow-2xl overflow-hidden ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      style={{ 
        zIndex, 
        marginTop: `${topOffset}px`,
        backgroundColor: '#141414',
        borderTopLeftRadius: index > 0 ? '24px' : '0',
        borderTopRightRadius: index > 0 ? '24px' : '0',
        boxShadow: index > 0 ? '0 -10px 40px rgba(0,0,0,0.8)' : 'none',
        borderTop: index > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
      }}
    >
      {/* Layer Header */}
      {index > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
            >
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Back</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <h2 className="text-lg font-black text-white tracking-tight uppercase">{title}</h2>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};
