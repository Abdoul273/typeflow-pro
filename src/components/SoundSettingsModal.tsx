import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  Volume1, 
  VolumeX, 
  X, 
  Check, 
  Sparkles, 
  Play, 
  Sliders, 
  Disc, 
  Layers, 
  Droplet,
  Radio
} from 'lucide-react';
import { SoundProfile, SoundSettings } from '../lib/audio';
import { cn } from '../lib/utils';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SoundSettings;
  onUpdate: (updates: Partial<SoundSettings>) => void;
  onPreview: (type: 'key' | 'space' | 'error', profile?: SoundProfile) => void;
}

interface ProfileOption {
  id: SoundProfile;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}

const PROFILES: ProfileOption[] = [
  {
    id: 'soft-tactile',
    title: 'Feutré & Tactile',
    badge: 'Recommandé',
    description: 'Switches lubrifiés au son doux et crémeux. Idéal pour de longues sessions sans fatigue auditive.',
    icon: Layers,
    iconColor: 'text-blue-400'
  },
  {
    id: 'mechanical',
    title: 'Mécanique Précis',
    badge: 'Clicky',
    description: 'Switches mécaniques vifs et nets avec contact franc pour une précision millimétrée.',
    icon: Disc,
    iconColor: 'text-amber-400'
  },
  {
    id: 'typewriter',
    title: 'Machine à Écrire',
    badge: 'Vintage',
    description: 'Cadence rétro mécanique avec frappe métallique texturée et retour de chariot feutré.',
    icon: Radio,
    iconColor: 'text-emerald-400'
  },
  {
    id: 'bubble',
    title: 'Bulle & Goutte d\'Eau',
    badge: 'Zen',
    description: 'Micro-pops aquatiques légers et relaxants. Crée une ambiance apaisante de travail.',
    icon: Droplet,
    iconColor: 'text-cyan-400'
  }
];

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onPreview
}) => {
  if (!isOpen) return null;

  const volumePercent = Math.round(settings.volume * 100);

  const getVolumeIcon = () => {
    if (!settings.enabled || settings.volume === 0) return VolumeX;
    if (settings.volume < 0.4) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Subtle top accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <VolumeIcon size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Effets Sonores & Rythme Audio
                </h2>
                <p className="text-xs text-slate-400">
                  Acoustique tactile subtile pour rythmer la frappe sans saturer l'écoute
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

          {/* Modal Body */}
          <div className="overflow-y-auto pr-1 py-5 space-y-6 flex-1">
            {/* Master Toggle & Volume Bar */}
            <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Retour sonore en temps réel</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Micro-clics sur les touches correctes et avertissement feutré sur les erreurs
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdate({ enabled: !settings.enabled })}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer",
                    settings.enabled ? "bg-blue-600" : "bg-slate-700"
                  )}
                  title={settings.enabled ? "Désactiver le son" : "Activer le son"}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md",
                      settings.enabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Volume Slider */}
              <div className={cn("space-y-2 pt-2 transition-opacity", !settings.enabled && "opacity-40 pointer-events-none")}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders size={13} className="text-blue-400" />
                    Volume général
                  </span>
                  <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    {volumePercent}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <VolumeX size={16} className="text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <Volume2 size={16} className="text-blue-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* Profile Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Styles Acoustiques de Touche
                </span>
                <span className="text-[11px] text-slate-500">
                  Synthétisé en temps réel (0ms de latence)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROFILES.map((profile) => {
                  const isSelected = settings.profile === profile.id;
                  const Icon = profile.icon;

                  return (
                    <div
                      key={profile.id}
                      onClick={() => onUpdate({ profile: profile.id })}
                      className={cn(
                        "relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
                        isSelected
                          ? "bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10"
                          : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg bg-white/5", profile.iconColor)}>
                              <Icon size={16} />
                            </div>
                            <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                              {profile.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                              {profile.badge}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {profile.description}
                        </p>
                      </div>

                      {/* Quick audition bar */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Tester ce style :</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreview('key', profile.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Tester une lettre"
                          >
                            <Play size={8} className="fill-current" />
                            Lettre
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreview('space', profile.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Tester la barre d'espace"
                          >
                            <Play size={8} className="fill-current" />
                            Espace
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreview('error', profile.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Tester l'avertissement d'erreur"
                          >
                            <Play size={8} className="fill-current" />
                            Erreur
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rhythm Enhancements */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Cadence & Fluidité du Rythme
              </span>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3 divide-y divide-white/5">
                {/* Micro-Pitch Variation */}
                <div className="flex items-center justify-between pt-1">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-white block">
                      Variation organique du pitch (±3%)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Fait varier imperceptiblement la fréquence selon la touche pour un rythme vivant et naturel.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate({ pitchVariation: !settings.pitchVariation })}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0",
                      settings.pitchVariation ? "bg-blue-600" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                        settings.pitchVariation ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Spacebar Accent */}
                <div className="flex items-center justify-between pt-3">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-white block">
                      Résonance de la barre d'espace
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Donne une tonalité plus ample et profonde à la barre d'espace pour marquer la fin des mots.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate({ spaceAccent: !settings.spaceAccent })}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0",
                      settings.spaceAccent ? "bg-blue-600" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                        settings.spaceAccent ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Streak Chimes */}
                <div className="flex items-center justify-between pt-3">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      Tintements discrets de régularité
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Micro-note harmonique toutes les 25 touches sans faute pour ancrer l'état de concentration (flow).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate({ streakChimes: !settings.streakChimes })}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0",
                      settings.streakChimes ? "bg-blue-600" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                        settings.streakChimes ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Tester en direct :</span>
              <button
                type="button"
                onClick={() => onPreview('key')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Touche standard
              </button>
              <button
                type="button"
                onClick={() => onPreview('space')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Espace
              </button>
              <button
                type="button"
                onClick={() => onPreview('error')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Notification d'erreur
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer ml-auto"
            >
              Terminé
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
