import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subValue?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color = "text-blue-400", subValue }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 min-w-[200px]"
    >
      <div className={`p-3 rounded-xl bg-slate-800 ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && (
          <p className="text-[11px] font-semibold text-amber-400 mt-0.5">
            {subValue}
          </p>
        )}
      </div>
    </motion.div>
  );
};
