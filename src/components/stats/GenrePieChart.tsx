
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { X, ListFilter, MousePointerClick } from 'lucide-react';

interface GenrePieChartProps {
  data: { name: string; value: number }[];
}

const GENRE_COLORS: Record<string, string> = {
  'Action': '#ef4444',       // Red
  'Adventure': '#3b82f6',    // Blue
  'Animation': '#f97316',    // Orange
  'Comedy': '#eab308',       // Yellow
  'Crime': '#6366f1',        // Indigo
  'Documentary': '#14b8a6',  // Teal
  'Drama': '#10b981',        // Green
  'Family': '#ec4899',       // Pink
  'Fantasy': '#8b5cf6',      // Purple
  'Horror': '#9f1239',       // Dark Red
  'Music': '#f43f5e',        // Rose
  'Mystery': '#8b5cf6',      // Violet
  'Romance': '#ec4899',      // Pink
  'Science Fiction': '#3b82f6', // Blue
  'Sci-Fi': '#3b82f6',
  'TV Movie': '#64748b',     // Slate
  'Thriller': '#ef4444',     // Red
  'War': '#78350f',          // Brown
  'Western': '#d97706',      // Amber
};

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
];

const GenrePieChart: React.FC<GenrePieChartProps> = ({ data }) => {
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherGenres, setOtherGenres] = useState<{ name: string; value: number }[]>([]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl h-[400px] flex flex-col items-center justify-center">
        <h3 className="text-xl font-bold text-white mb-4 self-start">Genre Breakdown</h3>
        <div className="text-gray-500 font-medium italic">No genre data available</div>
      </div>
    );
  }

  // Calculate chart data and "Other" group
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const totalValue = sortedData.reduce((acc, curr) => acc + curr.value, 0);

  let chartData: { name: string; value: number }[] = [];
  let others: { name: string; value: number }[] = [];

  // Group into "Other" if we have more than 8 genres to keep the chart clean
  if (sortedData.length > 8) {
    // Keep top 7 distinct genres
    chartData = sortedData.slice(0, 7);
    // Group everything else into 'Other'
    others = sortedData.slice(7);
    const otherTotal = others.reduce((acc, curr) => acc + curr.value, 0);
    chartData.push({ name: 'Other', value: otherTotal });
  } else {
    chartData = sortedData;
  }

  const handlePieClick = (entry: any) => {
    const name = entry.name || (entry.payload && entry.payload.name);
    if (name === 'Other' && others.length > 0) {
      setOtherGenres(others);
      setShowOtherModal(true);
    }
  };

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl h-[400px] flex flex-col relative group/chart animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-white tracking-tight">Genre Breakdown</h3>
          {others.length > 0 && (
            <div
              onClick={() => { setOtherGenres(others); setShowOtherModal(true); }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/10 border border-red-600/20 rounded-full text-[9px] text-red-500 font-black uppercase tracking-widest cursor-pointer hover:bg-red-600/20 transition-all active:scale-95 shadow-sm"
            >
              <MousePointerClick className="w-3 h-3" />
              Interactive
            </div>
          )}
        </div>
        <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-white/5">
          Analytics
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={5}
              cornerRadius={8}
              dataKey="value"
              stroke="none"
              labelLine={false}
              label={false}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
              onClick={handlePieClick}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === 'Other' ? '#374151' : (GENRE_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length])}
                  className={`hover:opacity-80 transition-all outline-none cursor-pointer hover:scale-[1.02] transform origin-center`}
                  style={{ outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
              itemStyle={{ color: '#fff', padding: '2px 0' }}
              cursor={{ fill: 'transparent' }}
              formatter={(value: number) => [`${value} titles`, 'Count']}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '10px',
                fontWeight: '700',
                color: '#4b5563',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Other Genres Modal */}
      {showOtherModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-md">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowOtherModal(false)} />
          <div className="relative bg-[#1a1a1a] border border-gray-800 w-full max-w-sm rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-600/10 rounded-[1.5rem] border border-red-600/20 shadow-lg shadow-red-900/10">
                    <ListFilter className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Other Genres</h4>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Grouped Analytics</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOtherModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-all border border-transparent hover:border-white/10 active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-3 no-scrollbar">
                {otherGenres.map((g, idx) => {
                  const percentage = ((g.value / totalValue) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/5 group hover:bg-white/10 hover:border-white/10 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
                        <span className="font-black text-gray-100 text-sm tracking-tight">{g.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{g.value} titles</span>
                        <div className="px-3 py-1.5 bg-red-600/20 text-red-500 text-[11px] font-black rounded-xl border border-red-600/10 min-w-[55px] text-center">
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                <button
                  onClick={() => setShowOtherModal(false)}
                  className="w-full py-5 bg-white text-black font-black rounded-[1.5rem] hover:bg-gray-200 transition-all active:scale-[0.97] shadow-2xl shadow-white/5 uppercase tracking-[0.2em] text-[10px]"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenrePieChart;