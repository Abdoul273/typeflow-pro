import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Sparkles, Zap, ArrowRight, Target, Flame, Hourglass, RotateCcw, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface TypingDisplayProps {
  targetText: string;
  userInput: string;
  isFinished: boolean;
  ghostIndex?: number;
  isNewRecord?: boolean;
  currentWpm?: number;
  accuracy?: number;
  previousRecordWpm?: number;
  errorShakeTrigger?: number;
  isFocusMode?: boolean;
  timeLimit?: number;
  timeRemaining?: number;
  isTimeOut?: boolean;
  onRetry?: () => void;
  onContinue?: () => void;
}

export const TypingDisplay: React.FC<TypingDisplayProps> = ({ 
  targetText, 
  userInput, 
  isFinished, 
  ghostIndex,
  isNewRecord = false,
  currentWpm = 0,
  accuracy = 100,
  previousRecordWpm = 0,
  errorShakeTrigger = 0,
  isFocusMode = false,
  timeLimit = 0,
  timeRemaining = 0,
  isTimeOut = false,
  onRetry,
  onContinue
}) => {
  const wpmDiff = previousRecordWpm > 0 ? currentWpm - previousRecordWpm : currentWpm;
  const hasActiveError = userInput.length > 0 && userInput[userInput.length - 1] !== targetText[userInput.length - 1];

  const completionPercentage = targetText.length > 0 
    ? Math.min(100, Math.round((userInput.length / targetText.length) * 100)) 
    : 0;

  // Group text into whole words with attached spaces and sentence boundary detection
  const wordTokens = useMemo(() => {
    interface CharToken {
      char: string;
      index: number;
    }
    interface WordToken {
      id: number;
      chars: CharToken[];
      trailingSpace?: CharToken;
      isSentenceEnd?: boolean;
    }

    const tokens: WordToken[] = [];
    let currentChars: CharToken[] = [];

    for (let i = 0; i < targetText.length; i++) {
      const char = targetText[i];
      if (char === ' ') {
        const lastChar = currentChars[currentChars.length - 1]?.char;
        const isSentenceEnd = lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === ':';
        tokens.push({
          id: tokens.length,
          chars: currentChars,
          trailingSpace: { char: ' ', index: i },
          isSentenceEnd,
        });
        currentChars = [];
      } else {
        currentChars.push({ char, index: i });
      }
    }

    if (currentChars.length > 0) {
      tokens.push({
        id: tokens.length,
        chars: currentChars,
        isSentenceEnd: false,
      });
    }

    return tokens;
  }, [targetText]);

  return (
    <div 
      className={cn(
        "relative font-mono leading-relaxed rounded-3xl bg-slate-900/70 border border-slate-800/90 flex flex-col justify-between shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden",
        isFocusMode ? "text-3xl sm:text-4xl p-8 sm:p-12 min-h-[280px] max-w-4xl mx-auto w-full" : "text-xl sm:text-2xl p-7 sm:p-9 min-h-[230px] w-full"
      )}
    >
      {/* Top Countdown Urgency Progress Bar */}
      {timeLimit > 0 && !isFinished && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800/80 overflow-hidden pointer-events-none z-10">
          <motion.div
            className={cn(
              "h-full transition-all duration-300",
              timeRemaining <= 5
                ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse"
                : timeRemaining <= 10
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            )}
            style={{ width: `${Math.min(100, Math.max(0, (timeRemaining / timeLimit) * 100))}%` }}
          />
        </div>
      )}

      {/* Target Text Tokens with clean word wrapping and visible spaces */}
      <div className="w-full flex flex-wrap items-center content-start gap-y-3 font-mono select-none">
        {wordTokens.map((token) => (
          <span
            key={token.id}
            className={cn(
              "inline-flex items-center whitespace-nowrap transition-all",
              token.isSentenceEnd && "mr-3"
            )}
          >
            {/* Word Characters */}
            {token.chars.map(({ char, index }) => {
              let status: 'pending' | 'correct' | 'incorrect' = 'pending';
              if (index < userInput.length) {
                status = userInput[index] === char ? 'correct' : 'incorrect';
              }

              const isCurrent = index === userInput.length && !isFinished;
              const isGhost = ghostIndex !== undefined && Math.floor(ghostIndex) === index && !isFinished;
              const isRecentErrorChar = index === userInput.length - 1 && status === 'incorrect';

              return (
                <motion.span
                  key={index}
                  animate={
                    isRecentErrorChar
                      ? { x: [-3, 3, -2, 2, 0] }
                      : isCurrent && hasActiveError
                      ? { x: [-2, 2, -1, 1, 0] }
                      : { x: 0 }
                  }
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "relative transition-colors duration-75 inline-block",
                    status === 'pending' && "text-slate-400 font-normal",
                    status === 'correct' && "text-blue-400 font-semibold",
                    status === 'incorrect' && "text-red-400 font-bold bg-red-500/25 border-b-2 border-red-500 rounded px-0.5 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  )}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="cursor"
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-0.5 z-10 transition-colors",
                        hasActiveError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      )}
                      initial={false}
                      transition={{ type: "spring", stiffness: 600, damping: 45 }}
                    />
                  )}
                  {isGhost && (
                    <motion.span
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20"
                      initial={false}
                    />
                  )}
                  {char}
                </motion.span>
              );
            })}

            {/* Trailing Space Token - Highly visible between words & sentences */}
            {token.trailingSpace && (() => {
              const { index } = token.trailingSpace;
              let status: 'pending' | 'correct' | 'incorrect' = 'pending';
              if (index < userInput.length) {
                status = userInput[index] === ' ' ? 'correct' : 'incorrect';
              }

              const isCurrent = index === userInput.length && !isFinished;
              const isGhost = ghostIndex !== undefined && Math.floor(ghostIndex) === index && !isFinished;
              const isSentenceEnd = token.isSentenceEnd;

              if (isCurrent) {
                return (
                  <motion.span
                    key={index}
                    animate={
                      hasActiveError ? { x: [-3, 3, -2, 2, 0] } : { scale: [0.97, 1.03, 1] }
                    }
                    transition={{ duration: 0.22 }}
                    className={cn(
                      "relative inline-flex items-center justify-center px-2 py-0.5 mx-1 rounded-md border text-xs sm:text-sm font-sans font-black tracking-wider select-none shadow-md z-10 transition-all",
                      hasActiveError
                        ? "bg-rose-500/30 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.6)] animate-pulse"
                        : "bg-blue-500/30 border-blue-400 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50 animate-pulse",
                      isSentenceEnd && "ring-2 ring-blue-400"
                    )}
                    title={isSentenceEnd ? "Fin de phrase : appuyez sur la barre Espace pour continuer" : "Appuyez sur la barre Espace"}
                  >
                    <motion.span
                      layoutId="cursor"
                      className={cn(
                        "absolute -left-0.5 top-0.5 bottom-0.5 w-0.5 rounded-full z-10",
                        hasActiveError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      )}
                      initial={false}
                    />
                    ␣ ESPACE
                  </motion.span>
                );
              }

              if (status === 'incorrect') {
                return (
                  <motion.span
                    key={index}
                    animate={{ x: [-3, 3, -2, 2, 0] }}
                    transition={{ duration: 0.18 }}
                    className="relative inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-red-500/30 border border-red-500 text-red-300 font-mono font-bold text-xs shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    title="Erreur : un espace était attendu ici"
                  >
                    ␣
                  </motion.span>
                );
              }

              if (status === 'correct') {
                return (
                  <span
                    key={index}
                    className={cn(
                      "relative inline-flex items-center justify-center text-center select-none font-mono transition-colors",
                      isSentenceEnd ? "w-[1.6ch] mx-0.5 text-blue-500/40" : "w-[1.2ch] mx-0.5 text-blue-500/25"
                    )}
                  >
                    {isGhost && (
                      <motion.span
                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20"
                        initial={false}
                      />
                    )}
                    ·
                  </span>
                );
              }

              // Pending Space
              return (
                <span
                  key={index}
                  className={cn(
                    "relative inline-flex items-center justify-center text-center select-none font-mono transition-colors",
                    isSentenceEnd 
                      ? "w-[1.8ch] mx-1 text-slate-500 font-bold opacity-90" 
                      : "w-[1.2ch] mx-0.5 text-slate-600 font-medium"
                  )}
                  title={isSentenceEnd ? "Espace de fin de phrase" : "Espace"}
                >
                  {isGhost && (
                    <motion.span
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20"
                      initial={false}
                    />
                  )}
                  ·
                </span>
              );
            })()}
          </span>
        ))}
      </div>

      {/* Subtle Bottom Helper for Space Key Awareness */}
      {!isFinished && (
        <div className="w-full flex items-center justify-between pt-3 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500 select-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold">
              ·
            </span>
            <span>Le point indique un espace à taper entre les mots et après la ponctuation</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[9px] uppercase">
              ␣ ESPACE
            </span>
            <span>Indicateur actif lors du passage d'un mot au suivant</span>
          </div>
        </div>
      )}

      {isFinished && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/92 rounded-3xl backdrop-blur-md p-6 z-20"
        >
          {isTimeOut ? (
            /* Timeout Modal State */
            <motion.div
              initial={{ scale: 0.9, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative max-w-md w-full text-center p-8 rounded-3xl bg-gradient-to-b from-rose-500/15 via-slate-900/95 to-slate-950 border border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.2)] overflow-hidden"
            >
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
                  <Hourglass size={36} className="stroke-[2.2] animate-pulse" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider mb-2">
                Temps Écoulé !
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                Défi {timeLimit}s Expiré
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Le chronomètre a atteint zéro avant la fin du texte.
              </p>

              {/* Progress of characters typed */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 text-left">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-slate-400">Progression</span>
                  <span className="text-rose-400 font-bold">{completionPercentage}% ({userInput.length}/{targetText.length})</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: `${completionPercentage}%` }} 
                  />
                </div>
              </div>

              {/* Stats snapshot */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold">
                  <Zap size={15} className="text-yellow-400" />
                  <span>{currentWpm} WPM</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold">
                  <Target size={15} className="text-emerald-400" />
                  <span>{accuracy}% Précision</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider transition-all transform active:scale-95 shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    <span>Réessayer ({timeLimit}s)</span>
                  </button>
                )}
                {onContinue && (
                  <button
                    onClick={onContinue}
                    className="flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/5"
                  >
                    <span>Continuer</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : isNewRecord ? (
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative max-w-md w-full text-center p-8 rounded-3xl bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
            >
              {/* Floating ambient celebratory particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <span className="absolute top-2 left-6 w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-75" />
                <span className="absolute top-8 right-8 w-3 h-3 rounded-full bg-yellow-300 animate-pulse opacity-80" />
                <span className="absolute bottom-6 left-10 w-2 h-2 rounded-full bg-orange-400 animate-bounce opacity-60" />
                <span className="absolute bottom-8 right-12 w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping opacity-70" />
              </div>

              {/* Trophy with glowing rings */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                <motion.div
                  animate={{ 
                    rotate: [-4, 4, -4],
                    scale: [1, 1.08, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/40"
                >
                  <Trophy size={38} className="stroke-[2.2]" />
                </motion.div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                  className="absolute -top-1 -right-1 text-amber-300"
                >
                  <Sparkles size={20} />
                </motion.div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-[0.2em] mb-2">
                <Flame size={14} className="text-orange-400" />
                Nouveau Record Personnel !
              </div>

              {timeLimit > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Clock size={12} />
                  Défi {timeLimit}s réussi (+{timeRemaining}s restantes) !
                </div>
              )}

              <div className="flex items-baseline justify-center gap-2 my-2">
                <span className="text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {currentWpm}
                </span>
                <span className="text-xl font-bold text-amber-400 tracking-wider">WPM</span>
              </div>

              <p className="text-sm font-medium text-amber-200/90 mb-6">
                {previousRecordWpm > 0 ? (
                  <>
                    Progression de <span className="font-bold text-emerald-400">+{wpmDiff} WPM</span> (ancien record : {previousRecordWpm} WPM) !
                  </>
                ) : (
                  <>Premier record de vitesse établi ! Félicitations !</>
                )}
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold">
                  <Target size={15} className="text-emerald-400" />
                  <span>{accuracy}% Précision</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-bold">
                  <Zap size={15} className="text-amber-400" />
                  <span>Vitesse Max</span>
                </div>
              </div>

              {onContinue && (
                <button
                  onClick={onContinue}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <span>Continuer</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center max-w-sm w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-1">Session terminée !</h2>

              {timeLimit > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                  <Clock size={12} />
                  Défi {timeLimit}s réussi (+{timeRemaining}s restantes) !
                </div>
              )}

              <div className="flex items-center justify-center gap-4 my-4">
                <div className="text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Vitesse</span>
                  <span className="text-2xl font-black text-blue-400">{currentWpm} WPM</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Précision</span>
                  <span className="text-2xl font-black text-emerald-400">{accuracy}%</span>
                </div>
              </div>
              {previousRecordWpm > 0 && (
                <p className="text-xs text-slate-400 mb-5">
                  Record personnel : <span className="text-slate-200 font-semibold">{previousRecordWpm} WPM</span>
                </p>
              )}
              <div className="flex items-center gap-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/5"
                  >
                    <RotateCcw size={14} />
                    <span>Recommencer</span>
                  </button>
                )}
                {onContinue && (
                  <button
                    onClick={onContinue}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <span>Exercice suivant</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

