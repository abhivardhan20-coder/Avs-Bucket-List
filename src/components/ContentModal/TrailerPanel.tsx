import React from 'react';
import { VideoOff } from 'lucide-react';

interface TrailerPanelProps {
  trailerKey: string | null;
  title: string;
}

const TrailerPanel: React.FC<TrailerPanelProps> = ({ trailerKey, title }) => {
  if (!trailerKey) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-2xl flex flex-col items-center justify-center text-gray-500 gap-4 mt-4">
        <VideoOff className="w-16 h-16 opacity-30" />
        <p className="font-bold uppercase tracking-widest text-sm">No Trailer Available</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mt-4 border border-white/10">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
        title={`${title} Trailer`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default TrailerPanel;
