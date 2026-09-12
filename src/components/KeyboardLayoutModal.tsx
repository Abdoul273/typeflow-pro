import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, Check, Sparkles, X, Globe, Flag } from 'lucide-react';
import { KeyboardLayoutType } from '../lib/constants';
import { cn } from '../lib/utils';

interface KeyboardLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: KeyboardLayoutType;
  onSelectLayout: (layout: KeyboardLayoutType) => void;
  isInitialSelection?: boolean;
}

export const KeyboardLayoutModal: React.FC<KeyboardLayoutModalProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onSelectLayout,
  isInitialSelection = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isInitialSelection ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/10 bg-slate-900/90 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <Keyboard size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                    Configuration Clavier
                  </span>
                  {isInitialSelection && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Étape initiale
                    </span>
                  )}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Quel est votre clavier ?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Choisissez votre disposition physique pour adapter les exercices et le guidage des doigts.
                </p>
              </div>
            </div>

            {!isInitialSelection && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Selection Cards */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* AZERTY Card */}
            <div
              onClick={() => {
                onSelectLayout('azerty');
                onClose();
              }}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 text-left group relative",
                currentLayout === 'azerty'
                  ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-white/10 hover:border-white/30 hover:bg-slate-900"
              )}
            >
              {currentLayout === 'azerty' && (
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                  <Check size={14} className="stroke-[3]" />
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇫🇷</span>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                    France & Belgique
                  </span>
                </div>
                <h4 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors">
                  AZERTY
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Clavier français traditionnel. Les exercices intègrent les accents naturels (<span className="text-slate-300 font-mono">é, è, ç, à</span>) et la rangée centrale <span className="text-slate-300 font-mono">QSDF JKLM</span>.
                </p>
              </div>

              {/* Visual preview pills */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 font-mono text-[11px] select-none">
                <div className="flex justify-center gap-1 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">A</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Z</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">E</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">R</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">T</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Y</span>
                </div>
                <div className="flex justify-center gap-1 text-slate-400 text-[9px]">
                  <span>Accents directs • Rangée QSDF</span>
                </div>
              </div>

              <button
                type="button"
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                  currentLayout === 'azerty'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "bg-white/10 group-hover:bg-white/15 text-slate-300"
                )}
              >
                {currentLayout === 'azerty' ? 'Disposition active' : 'Choisir AZERTY'}
              </button>
            </div>

            {/* QWERTY Card */}
            <div
              onClick={() => {
                onSelectLayout('qwerty');
                onClose();
              }}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 text-left group relative",
                currentLayout === 'qwerty'
                  ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30"
                  : "bg-slate-950/50 border-white/10 hover:border-white/30 hover:bg-slate-900"
              )}
            >
              {currentLayout === 'qwerty' && (
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
                  <Check size={14} className="stroke-[3]" />
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌐</span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    US & International
                  </span>
                </div>
                <h4 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors">
                  QWERTY
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Clavier international. Exercices <strong className="text-emerald-400 font-semibold">100% sans aucun accent</strong> pour une frappe directe sans touches mortes, et rangée <span className="text-slate-300 font-mono">ASDF JKL;</span>.
                </p>
              </div>

              {/* Visual preview pills */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 flex flex-col gap-1.5 font-mono text-[11px] select-none">
                <div className="flex justify-center gap-1 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Q</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">W</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">E</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">R</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">T</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Y</span>
                </div>
                <div className="flex justify-center gap-1 text-emerald-400/90 text-[9px] font-bold">
                  <span>Garanti sans accents • Rangée ASDF</span>
                </div>
              </div>

              <button
                type="button"
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                  currentLayout === 'qwerty'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "bg-white/10 group-hover:bg-white/15 text-slate-300"
                )}
              >
                {currentLayout === 'qwerty' ? 'Disposition active' : 'Choisir QWERTY'}
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              Vous pouvez changer de disposition à tout moment dans l'en-tête.
            </span>

            {!isInitialSelection && (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
