import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, X, Gift, Zap, Target, Flame, Award, Medal, Check } from 'lucide-react';
import { Badge } from '../lib/badges';

interface BadgeUnlockModalProps {
  unlockedBadge: Badge | null;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ unlockedBadge, onClose }) => {
  if (!unlockedBadge) return null;

  const renderIcon = () => {
    const props = { size: 40, className: "text-slate-950 stroke-[2.2]" };
    switch (unlockedBadge.icon) {
      case 'zap': return <Zap {...props} />;
      case 'target': return <Target {...props} />;
      case 'flame': return <Flame {...props} />;
      case 'trophy': return <Trophy {...props} />;
      case 'sparkles': return <Sparkles {...props} />;
      case 'award': return <Award {...props} />;
      case 'medal': return <Medal {...props} />;
      default: return <Award {...props} />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className="relative max-w-md w-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden"
        >
          {/* Animated decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Badge Icon Showcase with glowing rings */}
          <div className="relative inline-flex items-center justify-center my-3">
            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />
            <motion.div
              animate={{ 
                rotate: [-3, 3, -3],
                scale: [1, 1.06, 1]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className={`relative p-5 rounded-2xl bg-gradient-to-br ${unlockedBadge.color} shadow-lg shadow-amber-500/30 flex items-center justify-center`}
            >
              {renderIcon()}
            </motion.div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="absolute -top-2 -right-2 text-amber-300"
            >
              <Sparkles size={24} />
            </motion.div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-[0.2em] mb-2">
            <Trophy size={14} className="text-amber-400" />
            Nouveau Succès Débloqué !
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight mb-2">
            {unlockedBadge.title}
          </h3>

          <p className="text-sm text-slate-300 mb-5 leading-relaxed">
            {unlockedBadge.description}
          </p>

          <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 mb-6">
            <Gift size={18} className="text-amber-400" />
            <span className="font-bold text-sm">Récompense obtenue : +{unlockedBadge.xpReward} XP</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-500/20 transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>Super, continuer !</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
