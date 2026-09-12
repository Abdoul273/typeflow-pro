import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Award, 
  Trophy, 
  Zap, 
  Target, 
  Activity, 
  User as UserIcon, 
  LogIn, 
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Star,
  BookOpen,
  Cloud,
  Check,
  Flame,
  Calendar
} from 'lucide-react';
import { BADGES, Badge, BadgeEvaluationContext } from '../lib/badges';
import { BadgeCard } from './BadgeCard';
import { StreakCalendar } from './StreakCalendar';
import { computeStreakStats } from '../lib/streak';
import { ExerciseRecord } from '../lib/firebase';
import { Exercise, EXERCISES, KeyboardLayoutType } from '../lib/constants';
import { cn } from '../lib/utils';

interface ProfileViewProps {
  user: any;
  userProfile: any;
  personalBestWpm: number;
  history: any[];
  unlockedBadgeIds: string[];
  completedExercises: Record<string, ExerciseRecord>;
  onLogin: () => void;
  onLogout: () => void;
  onStartPractice: () => void;
  onSelectExercise: (index: number) => void;
  exercises?: Exercise[];
  layout?: KeyboardLayoutType;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  userProfile,
  personalBestWpm,
  history,
  unlockedBadgeIds,
  completedExercises,
  onLogin,
  onLogout,
  onStartPractice,
  onSelectExercise,
  exercises = EXERCISES,
  layout = 'azerty'
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [curriculumCategory, setCurriculumCategory] = useState<string>('all');

  const exerciseList = exercises;

  // Calculate Streak and Daily Activity
  const streakStats = useMemo(() => {
    return computeStreakStats(history, completedExercises, userProfile);
  }, [history, completedExercises, userProfile]);


  // Calculate XP & Level
  const totalXp = userProfile?.xp || 0;
  const currentLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const nextLevelXp = Math.pow(currentLevel, 2) * 100;
  const currentLevelBaseXp = Math.pow(currentLevel - 1, 2) * 100;
  const levelProgressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100))
  );

  // Calculate aggregate stats
  const totalSessions = userProfile?.totalSessions || history.length;
  const averageAccuracy = userProfile?.averageAccuracy || (totalSessions > 0
    ? Math.round(history.reduce((acc, curr) => acc + (Number(curr.accuracy) || 0), 0) / history.length)
    : 100);
  const hasPerfectAccuracySession = history.some(s => Number(s.accuracy) >= 100 && (s.errors === 0 || !s.errors));

  // Stars and completed count
  const completedCount = Object.keys(completedExercises).length;
  const totalStars = (Object.values(completedExercises) as ExerciseRecord[]).reduce((acc: number, item: ExerciseRecord) => acc + (item.stars || 0), 0);
  const maxPossibleStars = exerciseList.length * 3;

  const context: BadgeEvaluationContext = {
    bestWpm: personalBestWpm,
    bestAccuracy: history.length > 0 ? Math.max(...history.map(s => Number(s.accuracy) || 0)) : 0,
    totalSessions,
    totalXp,
    hasPerfectAccuracySession
  };

  const unlockedCount = unlockedBadgeIds.length;
  const totalBadgesCount = BADGES.length;
  const completionPercentage = Math.round((unlockedCount / totalBadgesCount) * 100);

  // Level title based on level
  const getLevelTitle = (lvl: number) => {
    if (lvl >= 15) return 'Maître Céleste du Clavier';
    if (lvl >= 10) return 'Dactylographe Grand Maître Tap\'Touche';
    if (lvl >= 7) return 'Spécialiste Haute Vitesse';
    if (lvl >= 4) return 'Dactylographe Confirmé';
    if (lvl >= 2) return 'Initié Tap\'Touche';
    return 'Apprenti Dactylo';
  };

  // Categories in curriculum
  const categories = ['all', ...Array.from(new Set(exerciseList.map(e => e.category)))];

  const filteredExercises = curriculumCategory === 'all'
    ? exerciseList
    : exerciseList.filter(e => e.category === curriculumCategory);

  // Filtered badges
  const filteredBadges = BADGES.filter(badge => {
    const isUnlocked = unlockedBadgeIds.includes(badge.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col gap-10"
    >
      {/* Cloud Sync Announcement if not logged in */}
      {!user && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/50 border border-blue-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 shrink-0">
              <Cloud size={28} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Sauvegarde Automatique dans le Cloud Google
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Connectez-vous avec votre compte Google pour synchroniser instantanément votre progression Tap'Touche, vos étoiles, vos records WPM et vos succès sur tous vos appareils en temps réel.
              </p>
            </div>
          </div>
          <button
            onClick={onLogin}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer shrink-0"
          >
            <LogIn size={16} />
            <span>Connexion Google</span>
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="relative overflow-hidden bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utilisateur'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-amber-500/40 object-cover shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700/60 flex items-center justify-center shadow-xl">
                  <UserIcon size={40} className="text-slate-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                <Trophy size={11} />
                Nv. {currentLevel}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {user ? (user.displayName || 'Dactylographe Google') : 'Dactylographe Invité'}
                </h2>
                {user ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Sauvegarde Cloud Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    Session Locale (Non sauvegardée)
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-amber-300/90 mb-2">
                {getLevelTitle(currentLevel)}
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{user ? user.email : 'Connectez-vous pour conserver vos progrès et vos étoiles.'}</span>
                {user && (
                  <button
                    onClick={onLogout}
                    className="text-red-400 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer ml-2"
                  >
                    <LogOut size={12} />
                    Déconnexion
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-3">
            <div className="w-full md:w-64 bg-slate-950/60 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="text-slate-400">Progression Niveau {currentLevel}</span>
                <span className="text-amber-400">{totalXp} XP</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 text-right font-medium">
                {nextLevelXp - totalXp > 0 ? `${nextLevelXp - totalXp} XP pour le Niveau ${currentLevel + 1}` : 'Niveau maximal atteint !'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap size={14} />
              Record Vitesse
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {personalBestWpm} <span className="text-xs text-amber-400 font-bold">WPM</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Flame size={14} className={streakStats.currentStreak > 0 ? "fill-orange-400 animate-pulse" : ""} />
              Série Active
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {streakStats.currentStreak} <span className="text-xs text-orange-400 font-bold">{streakStats.currentStreak > 1 ? 'Jours' : 'Jour'}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Star size={14} className="fill-yellow-400" />
              Étoiles Tap'Touche
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {totalStars} <span className="text-xs text-slate-400 font-bold">/ {maxPossibleStars}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BookOpen size={14} />
              Leçons Réussies
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {completedCount} <span className="text-xs text-slate-400 font-bold">/ {exerciseList.length}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Award size={14} />
              Badges Débloqués
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              {unlockedCount} <span className="text-xs text-slate-400 font-bold">/ {totalBadgesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Calendar & Daily Activity View */}
      <StreakCalendar
        streakStats={streakStats}
        onStartPractice={onStartPractice}
      />

      {/* Cursus Tap'Touche Section */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  Programme <span className="text-blue-400 italic">Tap'Touche</span> ({layout.toUpperCase()})
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {completedCount} sur {exerciseList.length} leçons maîtrisées • {totalStars} étoiles récoltées
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-white/5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCurriculumCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  curriculumCategory === cat
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {cat === 'all' ? 'Toutes' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExercises.map((ex, index) => {
            const actualIndex = exerciseList.findIndex(e => e.id === ex.id);
            const record = completedExercises[ex.id];
            const isDone = !!record;
            const stars = record?.stars || 0;

            return (
              <div
                key={ex.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                  isDone
                    ? "bg-slate-900/80 border-blue-500/30 shadow-lg shadow-blue-500/5 hover:border-blue-500/50"
                    : "bg-slate-950/50 border-white/5 hover:border-white/15"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {ex.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((starIndex) => (
                        <Star
                          key={starIndex}
                          size={14}
                          className={cn(
                            starIndex <= stars
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-slate-700"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white tracking-tight mb-1">
                    {ex.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 italic font-serif">
                    "{ex.content}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="text-[11px]">
                    {isDone ? (
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-amber-400 font-bold">{record.bestWpm} WPM</span>
                        <span className="text-emerald-400 font-bold">{record.bestAccuracy}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-medium">Non complété</span>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectExercise(actualIndex)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <span>{isDone ? 'Rejouer' : 'Démarrer'}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges & Achievements Section */}
      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                <Trophy size={24} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  Badges & <span className="text-amber-400 italic">Succès</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Débloquez des récompenses et accumulez de l’XP en repoussant vos limites
                </p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-white/5 self-start sm:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === 'all' 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              Tous ({totalBadgesCount})
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === 'unlocked' 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              Débloqués ({unlockedCount})
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === 'locked' 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              À débloquer ({totalBadgesCount - unlockedCount})
            </button>
          </div>
        </div>

        {/* Badges Overall Progress Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Complétion des Succès : {completionPercentage}%
              </p>
              <p className="text-xs text-slate-400">
                {unlockedCount === totalBadgesCount 
                  ? "Incroyable ! Vous avez débloqué l’ensemble des badges disponibles !" 
                  : `Continuez à vous entraîner pour débloquer les ${totalBadgesCount - unlockedCount} succès restants.`}
              </p>
            </div>
          </div>

          <button
            onClick={onStartPractice}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all transform active:scale-95 shadow-md shadow-amber-500/20 self-start sm:self-auto cursor-pointer"
          >
            <span>S’entraîner</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge) => {
            const isUnlocked = unlockedBadgeIds.includes(badge.id);
            const progress = badge.getProgress(context);

            return (
              <BadgeCard
                key={badge.id}
                badge={badge}
                isUnlocked={isUnlocked}
                progress={progress}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
