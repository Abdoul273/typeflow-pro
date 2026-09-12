import React from 'react';
import { motion } from 'motion/react';
import { 
  KeyboardLayoutType, 
  getKeyboardLayout, 
  getFingerMap 
} from '../lib/constants';
import { cn } from '../lib/utils';

interface VirtualKeyboardProps {
  activeKey: string | null;
  targetKey: string | null;
  errorKey?: string | null;
  layout?: KeyboardLayoutType;
  className?: string;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ 
  activeKey, 
  targetKey,
  errorKey,
  layout = 'azerty',
  className
}) => {
  const keyboardRows = getKeyboardLayout(layout);
  const fingerMap = getFingerMap(layout);

  return (
    <div className={cn(
      "flex flex-col gap-1.5 p-5 bg-slate-900/60 rounded-3xl border border-slate-800/80 w-full max-w-4xl mx-auto backdrop-blur-xl shadow-2xl transition-all",
      className
    )}>
      {keyboardRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5 h-11 sm:h-12">
          {row.map((key, keyIndex) => {
            const isTarget = targetKey?.toLowerCase() === key.toLowerCase() || (targetKey === ' ' && key === 'Space');
            const isActive = activeKey?.toLowerCase() === key.toLowerCase() || (activeKey === ' ' && key === 'Space');
            const isError = errorKey?.toLowerCase() === key.toLowerCase() || (errorKey === ' ' && key === 'Space');
            const finger = fingerMap[key.toLowerCase()] || '';
            
            // Adjust widths for special keys
            let width = "w-8 sm:w-11 md:w-12";
            if (key === 'Backspace' || key === 'Tab') width = "w-14 sm:w-18 md:w-20";
            if (key === 'Caps' || key === 'Enter') width = "w-16 sm:w-20 md:w-24";
            if (key === 'Shift') width = "w-20 sm:w-28 md:w-32";
            if (key === 'Space') width = "w-56 sm:w-80 md:w-96";

            const fingerColors: Record<string, string> = {
              'left-pinky': 'border-pink-500/30 text-pink-400/80',
              'left-ring': 'border-orange-500/30 text-orange-400/80',
              'left-middle': 'border-yellow-500/30 text-yellow-400/80',
              'left-index': 'border-emerald-500/30 text-emerald-400/80',
              'right-index': 'border-blue-500/30 text-blue-400/80',
              'right-middle': 'border-indigo-500/30 text-indigo-400/80',
              'right-ring': 'border-violet-500/30 text-violet-400/80',
              'right-pinky': 'border-purple-500/30 text-purple-400/80',
              'thumb': 'border-slate-500/30 text-slate-400/80'
            };

            // Dynamic styles based on key state
            let bg = '#0f172a';
            let textColor = undefined;
            let borderColor = undefined;
            let scale = 1;

            if (isError) {
              bg = '#ef4444';
              textColor = '#ffffff';
              borderColor = '#f87171';
              scale = 0.92;
            } else if (isTarget) {
              bg = '#2563eb';
              textColor = '#ffffff';
              borderColor = '#60a5fa';
              scale = 1.04;
            } else if (isActive) {
              bg = '#1d4ed8';
              textColor = '#ffffff';
              borderColor = '#3b82f6';
              scale = 0.94;
            }

            return (
              <motion.div
                key={keyIndex}
                animate={{
                  scale,
                  backgroundColor: bg,
                  color: textColor,
                  borderColor
                }}
                transition={{ duration: 0.08 }}
                className={cn(
                  "flex items-center justify-center rounded-xl text-[10px] sm:text-[11px] font-black border transition-all uppercase select-none",
                  width,
                  isError && "shadow-[0_0_18px_rgba(239,68,68,0.7)] ring-2 ring-red-400/50",
                  isTarget && !isError && "shadow-[0_0_16px_rgba(37,99,235,0.6)] ring-2 ring-blue-400/40",
                  !isTarget && !isActive && !isError && (fingerColors[finger] || "border-slate-800 text-slate-500")
                )}
              >
                {key}
              </motion.div>
            );
          })}
        </div>
      ))}
      <div className="flex flex-wrap justify-between items-center px-4 mt-3 text-[10px] text-slate-500 font-mono uppercase tracking-widest gap-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-400">Touche cible</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400/80">Erreur</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 rounded-full border border-slate-600" />
            <span className="text-slate-500">Doigt guidé</span>
          </div>
        </div>

        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 font-bold">
          Disposition: <span className="text-blue-400">{layout.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
