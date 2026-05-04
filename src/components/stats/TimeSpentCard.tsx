import React, { useState } from 'react';
import { Clock, Calendar, Hourglass } from 'lucide-react';
import WatchBreakdownModal from './WatchBreakdownModal';

interface TimeSpentCardProps {
  stats: {
    totalMinutes: number;
    hours: number;
    days: string;
    hoursThisYear: number;
    hoursMovies?: number;
    hoursSeries?: number;
    hoursAnime?: number;
  };
}

const TimeSpentCard: React.FC<TimeSpentCardProps> = ({ stats }) => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowPopup(true)}
        className="bg-gradient-to-br from-[#7f1d1d] to-[#450a0a] p-8 rounded-2xl border border-red-900/50 shadow-xl text-white relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xl hover:border-red-500/50"
      >
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-2 relative z-10">
          <Clock className="w-6 h-6" /> Time Invested
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
          <div>
            <div className="text-4xl md:text-5xl font-extrabold mb-1">{stats.hours}</div>
            <div className="text-sm text-red-200 uppercase font-bold tracking-wider">Hours Total</div>
          </div>

          <div>
            <div className="text-4xl md:text-5xl font-extrabold mb-1">{stats.days}</div>
            <div className="text-sm text-red-200 uppercase font-bold tracking-wider">Days of Life</div>
          </div>

          <div>
            <div className="text-4xl md:text-5xl font-extrabold mb-1">{stats.hoursThisYear}</div>
            <div className="text-sm text-red-200 uppercase font-bold tracking-wider">Hours This Year</div>
          </div>

          <div className="relative min-h-[80px]">
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none -top-6">
              <Hourglass className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col justify-end h-full">
              <div className="text-4xl md:text-5xl font-extrabold mb-1 opacity-0">0</div> {/* Invisible spacer to match height */}
              <div className="bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/10 mt-auto">
                <div className="flex items-center gap-2 text-sm text-gray-200 justify-center whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span>Started 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learn More Hint */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-200 font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
          Click for details
        </div>
      </div>

      {/* Breakdown Popup */}
      <WatchBreakdownModal
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        stats={{
          hours: stats.hours,
          hoursMovies: stats.hoursMovies || 0,
          hoursSeries: stats.hoursSeries || 0,
          hoursAnime: stats.hoursAnime || 0
        }}
      />
    </>
  );
};

export default TimeSpentCard;