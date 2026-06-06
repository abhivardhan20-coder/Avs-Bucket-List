
import React from 'react';
import { Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface AchievementsProps {
  items: Achievement[];
}

const Achievements: React.FC<AchievementsProps> = ({ items }) => {
  return (
    <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h3 className="text-xl font-bold text-white">Achievements Unlocked</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((achievement) => (
          <div 
            key={achievement.id} 
            className="bg-gradient-to-br from-white/5 to-white/0 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all group"
          >
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 w-fit">{achievement.icon}</div>
            <h4 className="font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">{achievement.title}</h4>
            <p className="text-xs text-gray-400">{achievement.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;