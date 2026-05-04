import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopPeopleChartProps {
  data: { name: string; count: number }[];
  title: string;
  color: string;
  onBarClick?: (name: string) => void;
}

const TopPeopleChart: React.FC<TopPeopleChartProps> = ({ data, title, color, onBarClick }) => {
  if (data.length === 0) return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl h-[350px] flex items-center justify-center">
      <p className="text-gray-500 font-bold">No data available</p>
    </div>
  );

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl h-[350px] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {onBarClick && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded border border-white/5">
              Interactive
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 w-full min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            onClick={(state) => {
              if (state && state.activeLabel && onBarClick) {
                onBarClick(String(state.activeLabel));
              }
            }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={110}
              tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ display: 'none' }}
            />
            <Bar
              dataKey="count"
              barSize={32}
              radius={[0, 6, 6, 0]}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  fillOpacity={0.8 - (index * 0.1)}
                  className="hover:opacity-100 transition-all duration-300"
                  style={{ outline: 'none' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopPeopleChart;