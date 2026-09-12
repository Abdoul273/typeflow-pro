import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, X, Zap, Flame, ShieldAlert, Sparkles, Check, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CountdownSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeLimit: number;
  onSelectTimeLimit: (seconds: number) => void;
  targetTextLength?: number;
}

interface Preset {
  seconds: number;
  label: string;
  badge: string;
  desc: string;
  difficulty: 'zen' | 'easy' | 'medium' | 'hard' | 'extreme';
}

const PRESETS: Preset[] = [
  {
    seconds: 0,
    label: 'Chrono Libre',
    badge: 'Standard',
    desc: 'Aucune limite de temps. Progressez à votre rythme naturel.',
    difficulty: 'zen'
  },
  {
    seconds: 15,
    label: '15 secondes',
    badge: 'Sprint Éclair',
    desc: 'Idéal pour de courts exercices et tester votre vitesse réflexe.',
    difficulty: 'extreme'
  },
  {
    seconds: 30,
    label: '30 secondes',
    badge: 'Sprint Rapide',
    desc: 'Le format classique de compétition pour une concentration maximale.',
    difficulty: 'hard'
  },
  {
    seconds: 45,
    label: '45 secondes',
    badge: 'Cadence Rythmée',
    desc: 'Un excellent équilibre entre pression du chrono et régularité.',
    difficulty: 'medium'
  },
  {
    seconds: 60,
    label: '60 secondes',
    badge: 'Défi 1 Minute',
    desc: 'Le standard mondial de dactylographie sur une minute pleine.',
    difficulty: 'medium'
  },
  {
    seconds: 90,
    label: '90 secondes',
    badge: 'Endurance',
    desc: 'Parfait pour les textes longs et tester votre régularité.',
    difficulty: 'easy'
  },
  {
    seconds: 120,
    label: '2 minutes',
    badge: 'Grand Chelem',
    desc: 'Session approfondie demandant calme, endurance et zéro faute.',
    difficulty: 'easy'
  }
];

export const CountdownSettingsModal: React.FC<CountdownSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTimeLimit,
  onSelectTimeLimit,
  targetTextLength = 120
}) => {
  const [customInput, setCustomInput] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);

  // Suggested time based on text length assuming an intermediate ~40 WPM pace (200 chars / min = 3.3 chars/sec)
  const suggestedSeconds = Math.max(15, Math.round(targetTextLength / 3.3 / 5) * 5);

  const handleApplyCustom = () => {
    const parsed = parseInt(customInput, 10);
    if (isNaN(parsed) || parsed < 5 || parsed > 600) {
      setCustomError('Veuillez entrer une durée entre 5 et 600 secondes.');
      return;
    }
    setCustomError(null);
    onSelectTimeLimit(parsed);
    onClose();
  };

  const getDifficultyBadge = (difficulty: Preset['difficulty']) => {
    switch (difficulty) {
      case 'zen':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'easy':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'medium':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'hard':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'extreme':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 14 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Subtle glowing ambient accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Timer size={24} className="stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Défi Chrono <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold uppercase tracking-wider">Mode Focus</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Fixez une limite de temps pour stimuler votre concentration et votre réactivité
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body: Presets list */}
          <div className="py-5 space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar relative z-10">
            {/* Suggested Smart Preset */}
            {suggestedSeconds > 0 && (
              <button
                onClick={() => {
                  onSelectTimeLimit(suggestedSeconds);
                  onClose();
                }}
                className={cn(
                  "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group",
                  currentTimeLimit === suggestedSeconds
                    ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    : "bg-slate-800/40 hover:bg-slate-800/80 border-amber-500/20 hover:border-amber-500/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Temps Suggéré ({suggestedSeconds}s)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 uppercase tracking-wider">
                        Calibré sur le texte
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Objectif calculé pour un rythme soutenu de ~40 WPM ({targetTextLength} caractères).
                    </p>
                  </div>
                </div>
                {currentTimeLimit === suggestedSeconds && (
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
                    <Check size={16} className="stroke-[3]" />
                  </div>
                )}
              </button>
            )}

            {/* Standard Presets */}
            {PRESETS.map((preset) => {
              const isSelected = currentTimeLimit === preset.seconds;
              return (
                <button
                  key={preset.seconds}
                  onClick={() => {
                    onSelectTimeLimit(preset.seconds);
                    onClose();
                  }}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group",
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                      : "bg-slate-800/30 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl border flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        : "bg-slate-800 border-white/5 text-slate-400 group-hover:text-slate-200"
                    )}>
                      {preset.seconds === 0 ? <Clock size={16} /> : <Zap size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{preset.label}</span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                          getDifficultyBadge(preset.difficulty)
                        )}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</p>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                      <Check size={16} className="stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300">
                      {preset.seconds === 0 ? 'Off' : `${preset.seconds}s`}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom Time Selector */}
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-800/20 border border-slate-800/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Durée personnalisée</span>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Ex: 25 (en secondes)"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">sec</span>
                  </div>
                  <button
                    onClick={handleApplyCustom}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    Appliquer
                  </button>
                </div>
                {customError && (
                  <p className="text-xs text-rose-400 font-medium">{customError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
            <div className="flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              <span>Signaux sonores d'urgence lors des 5 dernières secondes</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
