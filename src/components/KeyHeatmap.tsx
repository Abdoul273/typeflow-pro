import React from 'react';
import { motion } from 'motion/react';
import { KeyboardLayoutType, getKeyboardLayout } from '../lib/constants';
import { cn } from '../lib/utils';

interface KeyHeatmapProps {
  errorStats: Record<string, number>;
  layout?: KeyboardLayoutType;
}

export const KeyHeatmap: React.FC<KeyHeatmapProps> = ({ errorStats, layout = 'azerty' }) => {
  const keyboardRows = getKeyboardLayout(layout);
  const errorValues = Object.values(errorStats) as number[];
  const maxErrors = errorValues.length > 0 ? Math.max(...errorValues) : 1;

  const getHeatColor = (key: string) => {
    const errors = errorStats[key.toLowerCase()] || 0;
    if (errors === 0) return 'bg-slate-900/40 border-slate-800 text-slate-600';
    
    const intensity = errors / maxErrors;
    if (intensity > 0.8) return 'bg-red-500/40 border-red-500/50 text-red-200';
    if (intensity > 0.5) return 'bg-orange-500/40 border-orange-500/50 text-orange-200';
    if (intensity > 0.2) return 'bg-yellow-500/40 border-yellow-500/50 text-yellow-200';
    return 'bg-blue-500/20 border-blue-500/30 text-blue-200';
  };

  return (
    <div className="flex flex-col gap-2 scale-75 origin-top-left sm:scale-100">
      {keyboardRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map((key, keyIndex) => {
            // Adjust widths for special keys
            let width = "w-10";
            if (key === 'Backspace' || key === 'Tab') width = "w-16";
            if (key === 'Caps' || key === 'Enter') width = "w-20";
            if (key === 'Shift') width = "w-28";
            if (key === 'Space') width = "w-72";

            return (
              <div
                key={keyIndex}
                className={cn(
                  "h-10 flex items-center justify-center rounded-lg text-[10px] font-bold border transition-all uppercase select-none",
                  width,
                  getHeatColor(key)
                )}
              >
                {key.length === 1 ? key : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
