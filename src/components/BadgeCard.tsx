import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Target, 
  Flame, 
  Trophy, 
  Sparkles, 
  Award, 
  Clock, 
  Medal, 
  Lock, 
  CheckCircle2, 
  Gift 
} from 'lucide-react';
import { Badge } from '../lib/badges';
import { cn } from '../lib/utils';

interface BadgeCardProps {
  badge: Badge;
  isUnlocked: boolean;
  progress: {
    current: number;
    max: number;
    percent: number;
    label: string;
  };
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, isUnlocked, progress }) => {
  const renderIcon = () => {
    const iconProps = { size: 28, className: isUnlocked ? "drop-shadow-sm" : "text-slate-500" };
    switch (badge.icon) {
      case 'zap': return <Zap {...iconProps} />;
      case 'target': return <Target {...iconProps} />;
      case 'flame': return <Flame {...iconProps} />;
      case 'trophy': return <Trophy {...iconProps} />;
      case 'sparkles': return <Sparkles {...iconProps} />;
      case 'award': return <Award {...iconProps} />;
      case 'clock': return <Clock {...iconProps} />;
      case 'medal': return <Medal {...iconProps} />;
      default: return <Award {...iconProps} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between overflow-hidden",
        isUnlocked 
          ? "bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/80 border-amber-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] shadow-amber-500/5 hover:border-amber-500/50" 
          : "bg-slate-900/30 border-white/5 opacity-80 hover:opacity-100 hover:border-white/10"
      )}
    >
      {/* Background glow for unlocked badges */}
      {isUnlocked && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="relative">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform",
              isUnlocked 
                ? `bg-gradient-to-br ${badge.color} text-slate-950 shadow-md` 
                : "bg-slate-800/80 border-slate-700/50 text-slate-500"
            )}>
              {renderIcon()}
            </div>
            {!isUnlocked && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-950 border border-slate-700 text-slate-400">
                <Lock size={12} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 size={12} />
                Débloqué
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                En cours
              </span>
            )}

            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Gift size={12} />
              <span>+{badge.xpReward} XP</span>
            </div>
          </div>
        </div>

        <h4 className={cn(
          "text-lg font-black tracking-tight mb-1.5",
          isUnlocked ? "text-white" : "text-slate-300"
        )}>
          {badge.title}
        </h4>

        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          {badge.description}
        </p>
      </div>

      {/* Progress or criteria status */}
      <div className="pt-3 border-t border-white/5 mt-auto">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
          <span className="text-slate-500 uppercase tracking-wider">Condition</span>
          <span className={cn(isUnlocked ? "text-emerald-400" : "text-slate-300")}>
            {progress.label}
          </span>
        </div>

        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isUnlocked 
                ? "bg-gradient-to-r from-emerald-400 to-teal-400" 
                : "bg-gradient-to-r from-blue-500 to-indigo-500"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
};
