import React from 'react';
import { motion } from 'motion/react';
import { Brain, Sparkles, ArrowRight } from 'lucide-react';
import { AIAssessment } from '../services/geminiService';

interface AICoachProps {
  assessment: AIAssessment | null;
  onApplyExercise: (text: string) => void;
}

export const AICoach: React.FC<AICoachProps> = ({ assessment, onApplyExercise }) => {
  if (!assessment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group shadow-2xl"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={120} className="text-blue-400" />
      </div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
          <Brain className="text-white" size={24} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            Coach IA Personnel
          </h3>
          <p className="text-blue-100/80 mb-4 leading-relaxed italic">
            "{assessment.feedback}"
          </p>
          
          {assessment.focusCharacters.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {assessment.focusCharacters.map((char, i) => (
                <span key={i} className="px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded italic text-xs text-blue-300 font-mono">
                  {char}
                </span>
              ))}
            </div>
          )}

          <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 mb-4">
            <p className="text-xs text-blue-400 uppercase font-bold tracking-widest mb-2">Exercice suggéré :</p>
            <p className="font-mono text-lg text-slate-200">{assessment.suggestedText}</p>
          </div>

          <button
            onClick={() => onApplyExercise(assessment.suggestedText)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
          >
            Lancer l'exercice ciblé
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
