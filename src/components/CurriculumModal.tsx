import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BookOpen, 
  Star, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Cloud, 
  LogIn,
  Zap,
  Target,
  Keyboard
} from 'lucide-react';
import { Exercise, KeyboardLayoutType } from '../lib/constants';
import { ExerciseRecord } from '../lib/firebase';
import { cn } from '../lib/utils';

interface CurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  currentExerciseId: string;
  completedExercises: Record<string, ExerciseRecord>;
  onSelectExercise: (index: number) => void;
  user: any;
  onLogin: () => void;
  layout?: KeyboardLayoutType;
  onOpenLayoutModal?: () => void;
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  isOpen,
  onClose,
  exercises,
  currentExerciseId,
  completedExercises,
  onSelectExercise,
  user,
  onLogin,
  layout = 'azerty',
  onOpenLayoutModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(exercises.map(e => e.category)))];

  const filteredExercises = selectedCategory === 'all'
    ? exercises
    : exercises.filter(e => e.category === selectedCategory);

  const completedCount = Object.keys(completedExercises).length;
  const totalStars = (Object.values(completedExercises) as ExerciseRecord[]).reduce((acc: number, item: ExerciseRecord) => acc + (item.stars || 0), 0);
  const maxPossibleStars = exercises.length * 3;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                  Programme Officiel
                </span>
                {user ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Cloud size={12} />
                    Synchronisé Cloud Google
                  </span>
                ) : (
                  <button
                    onClick={onLogin}
                    className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                  >
                    <LogIn size={11} />
                    Connectez-vous pour sauvegarder
                  </button>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Missions Dactylographiques <span className="text-blue-400 italic">Tap'Touche</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {completedCount} / {exercises.length} missions terminées • {totalStars} / {maxPossibleStars} étoiles obtenues
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onOpenLayoutModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                title="Changer de disposition clavier"
              >
                <Keyboard size={14} className="text-blue-400" />
                <span className="uppercase">{layout}</span>
                {layout === 'qwerty' ? (
                  <span className="text-[10px] text-emerald-400 font-semibold">(Sans accent)</span>
                ) : (
                  <span className="text-[10px] text-blue-400 font-semibold">(Accents FR)</span>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-6 sm:px-8 py-3 bg-slate-950/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {cat === 'all' ? 'Toutes les Missions' : cat}
              </button>
            ))}
          </div>

          {/* Lessons List */}
          <div className="p-6 sm:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExercises.map(ex => {
              const actualIndex = exercises.findIndex(e => e.id === ex.id);
              const isCurrent = ex.id === currentExerciseId;
              const record = completedExercises[ex.id];
              const isCompleted = !!record;
              const stars = record?.stars || 0;
              const wordCount = ex.content.trim().split(/\s+/).length;
              const charCount = ex.content.length;

              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    onSelectExercise(actualIndex);
                    onClose();
                  }}
                  className={cn(
                    "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group",
                    isCurrent
                      ? "bg-blue-950/30 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                      : isCompleted
                      ? "bg-slate-900/70 border-white/10 hover:border-blue-500/40 hover:bg-slate-900"
                      : "bg-slate-950/40 border-white/5 hover:border-white/15 hover:bg-slate-900/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-blue-400 border border-white/5">
                          {ex.category}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                          {wordCount} mots • {charCount} car.
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                            En cours
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                        {ex.title}
                      </h4>
                    </div>

                    {/* Star ratings */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          size={13}
                          className={cn(
                            s <= stars
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-slate-700"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 italic font-serif bg-slate-950/50 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    "{ex.content}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    {isCompleted ? (
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Zap size={11} /> {record.bestWpm} WPM
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Target size={11} /> {record.bestAccuracy}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">À commencer</span>
                    )}

                    <span className="text-blue-400 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {isCurrent ? 'Continuer' : isCompleted ? 'Rejouer' : 'Démarrer'}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span>20 missions dactylographiques réelles et captivantes avec progression fluide</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
