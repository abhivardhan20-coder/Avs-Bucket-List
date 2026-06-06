
import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ActivityTimelineProps {
  data: { name: string; count: number }[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Watch Activity</h3>
        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Last 12 Months</span>
      </div>

      <div className="flex-1 w-full min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.3} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
              cursor={{ stroke: '#ef4444', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#ef4444"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
              activeDot={{ r: 6, fill: '#fff', stroke: '#ef4444', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityTimeline;