export interface Badge {
  id: string;
  title: string;
  description: string;
  category: 'speed' | 'accuracy' | 'endurance' | 'milestone';
  icon: 'zap' | 'target' | 'flame' | 'trophy' | 'sparkles' | 'award' | 'clock' | 'medal';
  color: string;
  xpReward: number;
  criterionText: string;
  checkUnlocked: (context: BadgeEvaluationContext) => boolean;
  getProgress: (context: BadgeEvaluationContext) => { current: number; max: number; percent: number; label: string };
}

export interface BadgeEvaluationContext {
  bestWpm: number;
  bestAccuracy: number;
  totalSessions: number;
  totalXp: number;
  hasPerfectAccuracySession: boolean;
  currentSession?: {
    wpm: number;
    accuracy: number;
    errors: number;
  };
}

export const BADGES: Badge[] = [
  {
    id: 'cent-wpm',
    title: 'Cent WPM',
    description: 'Franchir le cap d’élite des 100 WPM en session dactylographique.',
    category: 'speed',
    icon: 'zap',
    color: 'from-amber-400 to-yellow-600 border-amber-500/40 text-amber-300',
    xpReward: 300,
    criterionText: '100 WPM requis',
    checkUnlocked: (ctx) => {
      const current = ctx.currentSession?.wpm || 0;
      return ctx.bestWpm >= 100 || current >= 100;
    },
    getProgress: (ctx) => {
      const best = Math.max(ctx.bestWpm, ctx.currentSession?.wpm || 0);
      const current = Math.min(best, 100);
      return {
        current,
        max: 100,
        percent: Math.min(100, Math.round((current / 100) * 100)),
        label: `${best} / 100 WPM`
      };
    }
  },
  {
    id: 'precision-parfaite',
    title: 'Précision Parfaite',
    description: 'Terminer un exercice complet avec 100% de précision et zéro faute.',
    category: 'accuracy',
    icon: 'target',
    color: 'from-emerald-400 to-teal-600 border-emerald-500/40 text-emerald-300',
    xpReward: 250,
    criterionText: '100% de précision sans erreur',
    checkUnlocked: (ctx) => {
      if (ctx.hasPerfectAccuracySession) return true;
      if (ctx.currentSession && ctx.currentSession.accuracy >= 100 && ctx.currentSession.errors === 0) {
        return true;
      }
      return false;
    },
    getProgress: (ctx) => {
      const unlocked = ctx.hasPerfectAccuracySession || (ctx.currentSession?.accuracy === 100 && ctx.currentSession?.errors === 0);
      if (unlocked) {
        return { current: 100, max: 100, percent: 100, label: '100% sans faute' };
      }
      const bestAcc = ctx.bestAccuracy || 0;
      return {
        current: bestAcc,
        max: 100,
        percent: bestAcc,
        label: `${bestAcc}% / 100%`
      };
    }
  },
  {
    id: 'marathonien',
    title: 'Marathonien',
    description: 'Faire preuve d’endurance en complétant au moins 10 sessions d’entraînement.',
    category: 'endurance',
    icon: 'flame',
    color: 'from-orange-400 to-rose-600 border-orange-500/40 text-orange-300',
    xpReward: 200,
    criterionText: '10 sessions complétées',
    checkUnlocked: (ctx) => {
      return ctx.totalSessions >= 10;
    },
    getProgress: (ctx) => {
      const current = Math.min(ctx.totalSessions, 10);
      return {
        current,
        max: 10,
        percent: Math.min(100, Math.round((current / 10) * 100)),
        label: `${ctx.totalSessions} / 10 sessions`
      };
    }
  },
  {
    id: 'premier-pas',
    title: 'Premier Pas',
    description: 'Compléter votre première session de dactylographie.',
    category: 'milestone',
    icon: 'award',
    color: 'from-blue-400 to-indigo-600 border-blue-500/40 text-blue-300',
    xpReward: 50,
    criterionText: '1 session complétée',
    checkUnlocked: (ctx) => ctx.totalSessions >= 1,
    getProgress: (ctx) => ({
      current: Math.min(ctx.totalSessions, 1),
      max: 1,
      percent: ctx.totalSessions >= 1 ? 100 : 0,
      label: `${Math.min(ctx.totalSessions, 1)} / 1 session`
    })
  },
  {
    id: 'eclair',
    title: 'Éclair',
    description: 'Franchir une vitesse de 60 WPM lors d’une session.',
    category: 'speed',
    icon: 'sparkles',
    color: 'from-cyan-400 to-blue-600 border-cyan-500/40 text-cyan-300',
    xpReward: 100,
    criterionText: '60 WPM requis',
    checkUnlocked: (ctx) => {
      const current = ctx.currentSession?.wpm || 0;
      return ctx.bestWpm >= 60 || current >= 60;
    },
    getProgress: (ctx) => {
      const best = Math.max(ctx.bestWpm, ctx.currentSession?.wpm || 0);
      const current = Math.min(best, 60);
      return {
        current,
        max: 60,
        percent: Math.min(100, Math.round((current / 60) * 100)),
        label: `${best} / 60 WPM`
      };
    }
  },
  {
    id: 'tireur-elite',
    title: 'Tireur d’Élite',
    description: 'Atteindre au moins 98% de précision avec une frappe quasi chirurgicale.',
    category: 'accuracy',
    icon: 'medal',
    color: 'from-violet-400 to-purple-600 border-violet-500/40 text-violet-300',
    xpReward: 150,
    criterionText: '98% de précision',
    checkUnlocked: (ctx) => {
      const current = ctx.currentSession?.accuracy || 0;
      return ctx.bestAccuracy >= 98 || current >= 98;
    },
    getProgress: (ctx) => {
      const best = Math.max(ctx.bestAccuracy, ctx.currentSession?.accuracy || 0);
      return {
        current: best,
        max: 98,
        percent: Math.min(100, Math.round((best / 98) * 100)),
        label: `${best}% / 98%`
      };
    }
  },
  {
    id: 'grand-maitre',
    title: 'Grand Maître',
    description: 'Atteindre un total de 1 000 XP et gravir les échelons du classement.',
    category: 'milestone',
    icon: 'trophy',
    color: 'from-yellow-300 via-amber-500 to-red-600 border-yellow-500/50 text-yellow-300',
    xpReward: 400,
    criterionText: '1 000 XP requis',
    checkUnlocked: (ctx) => ctx.totalXp >= 1000,
    getProgress: (ctx) => {
      const current = Math.min(ctx.totalXp, 1000);
      return {
        current,
        max: 1000,
        percent: Math.min(100, Math.round((current / 1000) * 100)),
        label: `${ctx.totalXp} / 1 000 XP`
      };
    }
  }
];

export function evaluateBadges(
  context: BadgeEvaluationContext,
  alreadyUnlockedIds: string[] = []
): { newlyUnlocked: Badge[]; allUnlockedIds: string[] } {
  const currentSet = new Set(alreadyUnlockedIds);
  const newlyUnlocked: Badge[] = [];

  for (const badge of BADGES) {
    if (!currentSet.has(badge.id)) {
      if (badge.checkUnlocked(context)) {
        currentSet.add(badge.id);
        newlyUnlocked.push(badge);
      }
    }
  }

  return {
    newlyUnlocked,
    allUnlockedIds: Array.from(currentSet)
  };
}
