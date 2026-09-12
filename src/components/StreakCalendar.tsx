import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Trophy, 
  Calendar as CalendarIcon, 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Award, 
  Sparkles, 
  Target, 
  Grid3X3, 
  Info,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { 
  DailyActivity, 
  StreakStats, 
  STREAK_MILESTONES, 
  getLocalDateString, 
  getMonthGridDays, 
  getContributionHeatmap, 
  CalendarDayInfo 
} from '../lib/streak';
import { cn } from '../lib/utils';

interface StreakCalendarProps {
  streakStats: StreakStats;
  onStartPractice?: () => void;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  streakStats,
  onStartPractice
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'heatmap'>('month');

  // Month navigation state
  const today = useMemo(() => new Date(), []);
  const [displayedYear, setDisplayedYear] = useState<number>(() => today.getFullYear());
  const [displayedMonthIndex, setDisplayedMonthIndex] = useState<number>(() => today.getMonth());

  // Selected day for inspection
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getLocalDateString(today));

  const monthNamesFr = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayNamesFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Navigate months
  const handlePrevMonth = () => {
    if (displayedMonthIndex === 0) {
      setDisplayedMonthIndex(11);
      setDisplayedYear(prev => prev - 1);
    } else {
      setDisplayedMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayedMonthIndex === 11) {
      setDisplayedMonthIndex(0);
      setDisplayedYear(prev => prev + 1);
    } else {
      setDisplayedMonthIndex(prev => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setDisplayedYear(today.getFullYear());
    setDisplayedMonthIndex(today.getMonth());
    setSelectedDateStr(getLocalDateString(today));
  };

  // Calendar days grid for the selected month
  const monthDays = useMemo(() => {
    return getMonthGridDays(displayedYear, displayedMonthIndex, streakStats.activityMap);
  }, [displayedYear, displayedMonthIndex, streakStats.activityMap]);

  // Contribution heatmap (20 weeks)
  const heatmapData = useMemo(() => {
    return getContributionHeatmap(20, streakStats.activityMap);
  }, [streakStats.activityMap]);

  // Selected date activity details
  const selectedDayActivity = streakStats.activityMap[selectedDateStr];

  // Next milestone calculation
  const nextMilestone = useMemo(() => {
    return STREAK_MILESTONES.find(m => m.days > streakStats.currentStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  }, [streakStats.currentStreak]);

  const currentMilestone = useMemo(() => {
    const achieved = [...STREAK_MILESTONES].reverse().find(m => streakStats.currentStreak >= m.days);
    return achieved || null;
  }, [streakStats.currentStreak]);

  const milestoneProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const prevDays = currentMilestone ? currentMilestone.days : 0;
    const needed = nextMilestone.days - prevDays;
    const current = Math.max(0, streakStats.currentStreak - prevDays);
    return Math.min(100, Math.round((current / needed) * 100));
  }, [streakStats.currentStreak, nextMilestone, currentMilestone]);

  // Format date readable in French
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Color intensity helper for tiles
  const getIntensityClass = (activity?: DailyActivity, isCurrentMonth: boolean = true) => {
    if (!activity || activity.count === 0) {
      return isCurrentMonth 
        ? "bg-slate-950/70 border-white/5 text-slate-400 hover:border-white/20" 
        : "bg-slate-950/25 border-transparent text-slate-700";
    }

    if (activity.count >= 4) {
      return "bg-emerald-500/25 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]";
    }
    if (activity.count >= 2) {
      return "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
    }
    return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 sm:p-10 backdrop-blur-xl flex flex-col gap-8 shadow-xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Summary Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
              <Flame size={26} className={streakStats.currentStreak > 0 ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                Série & <span className="text-amber-400 italic">Calendrier d'Activité</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Suivez votre constance de frappe quotidienne et débloquez des séries légendaires
              </p>
            </div>
          </div>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-white/5 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === 'month'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <CalendarIcon size={14} />
            <span>Vue Mensuelle</span>
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === 'heatmap'
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Grid3X3 size={14} />
            <span>Matrice (20 sem.)</span>
          </button>
        </div>
      </div>

      {/* Streak Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* Current Streak */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-950/80 border border-amber-500/20 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={16} className={streakStats.currentStreak > 0 ? "fill-amber-400" : ""} />
              Série Actuelle
            </span>
            {streakStats.isPracticedToday ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <CheckCircle2 size={10} />
                Actif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                <Clock size={10} />
                En attente
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">
              {streakStats.currentStreak}
            </span>
            <span className="text-sm font-bold text-amber-400 uppercase">
              {streakStats.currentStreak > 1 ? 'Jours consécutifs' : 'Jour'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {streakStats.isPracticedToday 
              ? `Flamme sécurisée pour aujourd'hui (${streakStats.todaySessionsCount} session${streakStats.todaySessionsCount > 1 ? 's' : ''}).` 
              : 'Tapez une leçon aujourd\'hui pour préserver votre série !'}
          </p>
        </div>

        {/* Longest Streak */}
        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-yellow-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Trophy size={16} />
              Record de Série
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">
              {streakStats.longestStreak}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase">
              {streakStats.longestStreak > 1 ? 'Jours' : 'Jour'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Votre plus longue séquence ininterrompue de pratique.
          </p>
        </div>

        {/* Total Active Days */}
        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck size={16} />
              Jours Actifs
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">
              {streakStats.totalActiveDays}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase">
              Jours Totaux
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Nombre total de jours où vous avez tapé au clavier.
          </p>
        </div>

        {/* Today's Practice Status Card */}
        <div className={cn(
          "rounded-2xl p-5 border transition-all flex flex-col justify-between gap-2",
          streakStats.isPracticedToday
            ? "bg-emerald-500/10 border-emerald-500/25"
            : "bg-slate-950/60 border-white/5"
        )}>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={cn(
                "text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                streakStats.isPracticedToday ? "text-emerald-400" : "text-amber-400"
              )}>
                <Zap size={15} />
                Aujourd'hui
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {streakStats.isPracticedToday ? (
                <span className="text-emerald-300">Objectif du jour validé</span>
              ) : (
                <span className="text-slate-200">Pratique non effectuée</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {streakStats.isPracticedToday 
                ? `${streakStats.todaySessionsCount} exercice${streakStats.todaySessionsCount > 1 ? 's' : ''} complété${streakStats.todaySessionsCount > 1 ? 's' : ''} aujourd'hui.`
                : '1 leçon suffit pour conserver ou démarrer votre série.'}
            </p>
          </div>

          {!streakStats.isPracticedToday && onStartPractice && (
            <button
              onClick={onStartPractice}
              className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>Valider aujourd'hui</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Streak Milestone Progress Tracker */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-slate-950/80 border border-white/5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Palier Suivant : {nextMilestone.title} ({nextMilestone.days} jours)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {Math.max(0, nextMilestone.days - streakStats.currentStreak)} j. restant{nextMilestone.days - streakStats.currentStreak > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {nextMilestone.description}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 self-end sm:self-auto">
            {streakStats.currentStreak} / {nextMilestone.days} jours ({milestoneProgress}%)
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${milestoneProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          />
        </div>

        {/* Milestones chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 mr-1">
            Paliers Tap'Touche :
          </span>
          {STREAK_MILESTONES.map((m) => {
            const isAchieved = streakStats.currentStreak >= m.days;
            return (
              <div
                key={m.days}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border",
                  isAchieved
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                    : "bg-slate-950/60 border-white/5 text-slate-500 opacity-60"
                )}
                title={`${m.title} (${m.days} jours) : ${m.description}`}
              >
                <Flame size={12} className={isAchieved ? "text-amber-400 fill-amber-400" : "text-slate-600"} />
                <span>{m.days}j</span>
                {isAchieved && <CheckCircle2 size={10} className="text-emerald-400" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="flex flex-col lg:flex-row items-start gap-8 relative z-10">
        {/* Left: Interactive Calendar View (Month or Heatmap) */}
        <div className="flex-1 w-full bg-slate-950/60 border border-white/5 rounded-3xl p-6 sm:p-8">
          {viewMode === 'month' ? (
            <div>
              {/* Month Navigation Controls */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {monthNamesFr[displayedMonthIndex]} {displayedYear}
                  </h4>
                  {(displayedYear !== today.getFullYear() || displayedMonthIndex !== today.getMonth()) && (
                    <button
                      onClick={handleResetToCurrentMonth}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 transition-all cursor-pointer"
                    >
                      Aujourd'hui
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer active:scale-95"
                    title="Mois précédent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer active:scale-95"
                    title="Mois suivant"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {dayNamesFr.map((dayName) => (
                  <div key={dayName} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Month days grid */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, idx) => {
                  const hasActivity = day.activity && day.activity.count > 0;
                  const isSelected = day.dateStr === selectedDateStr;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDateStr(day.dateStr)}
                      className={cn(
                        "relative aspect-square sm:h-14 rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 transition-all flex flex-col justify-between items-start text-left cursor-pointer group",
                        getIntensityClass(day.activity, day.isCurrentMonth),
                        isSelected && "ring-2 ring-amber-400 border-amber-400 shadow-md",
                        day.isToday && !isSelected && "ring-1 ring-blue-400/60",
                        day.isFuture && "opacity-30 cursor-not-allowed hover:border-transparent"
                      )}
                    >
                      {/* Day Number */}
                      <span className={cn(
                        "text-xs font-bold leading-none",
                        day.isToday 
                          ? "text-blue-400 font-black" 
                          : day.isCurrentMonth 
                          ? hasActivity 
                            ? "text-emerald-200" 
                            : "text-slate-400 group-hover:text-white"
                          : "text-slate-700"
                      )}>
                        {day.dayOfMonth}
                      </span>

                      {/* Day indicator dots or session count */}
                      <div className="w-full flex items-center justify-between">
                        {hasActivity ? (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                            <span className="text-[9px] font-mono font-bold text-emerald-300 hidden sm:inline">
                              {day.activity!.count}
                            </span>
                          </div>
                        ) : day.isToday ? (
                          <span className="text-[8px] font-bold uppercase text-blue-400 hidden sm:inline">
                            Auj.
                          </span>
                        ) : null}

                        {hasActivity && day.activity!.bestWpm > 0 && (
                          <span className="text-[8px] font-mono font-bold text-amber-400/90 hidden md:inline ml-auto">
                            {day.activity!.bestWpm}w
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Contribution Heatmap Matrix (20 weeks) */
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Matrice de Constance (20 Semaines)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Chaque case représente une journée d'activité. Cliquez pour inspecter les sessions.
                  </p>
                </div>
              </div>

              {/* Month labels along the top */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[620px]">
                  <div className="flex items-center gap-1.5 mb-2 pl-7 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {heatmapData.monthLabels.map((ml, idx) => (
                      <span
                        key={idx}
                        style={{ marginLeft: `${Math.max(0, ml.weekIndex * 18 - (idx > 0 ? heatmapData.monthLabels[idx - 1].weekIndex * 18 + 24 : 0))}px` }}
                      >
                        {ml.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-start gap-2">
                    {/* Day of week labels (Lun, Mer, Ven) */}
                    <div className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-600 uppercase pr-2 pt-0.5 select-none">
                      <span className="h-3.5 leading-none">L</span>
                      <span className="h-3.5 leading-none">M</span>
                      <span className="h-3.5 leading-none">M</span>
                      <span className="h-3.5 leading-none">J</span>
                      <span className="h-3.5 leading-none">V</span>
                      <span className="h-3.5 leading-none">S</span>
                      <span className="h-3.5 leading-none">D</span>
                    </div>

                    {/* Heatmap week columns */}
                    <div className="flex items-center gap-1.5">
                      {heatmapData.weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1.5">
                          {week.map((day) => {
                            const hasActivity = day.activity && day.activity.count > 0;
                            const isSelected = day.dateStr === selectedDateStr;

                            let bgClass = "bg-slate-900 border-white/5 hover:border-white/20";
                            if (hasActivity) {
                              if (day.activity!.count >= 4) {
                                bgClass = "bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
                              } else if (day.activity!.count >= 2) {
                                bgClass = "bg-emerald-500/70 border-emerald-400/50";
                              } else {
                                bgClass = "bg-emerald-500/35 border-emerald-500/30";
                              }
                            }

                            return (
                              <button
                                key={day.dateStr}
                                onClick={() => setSelectedDateStr(day.dateStr)}
                                className={cn(
                                  "w-3.5 h-3.5 rounded-sm border transition-all cursor-pointer",
                                  bgClass,
                                  isSelected && "ring-2 ring-amber-400 scale-125 z-10",
                                  day.isToday && !isSelected && "ring-1 ring-blue-400"
                                )}
                                title={`${day.dateStr} : ${hasActivity ? `${day.activity!.count} session(s)` : '0 session'}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-4 border-t border-white/5 mt-4">
                <span>Total 140 jours couverts</span>
                <div className="flex items-center gap-1.5">
                  <span>Moins</span>
                  <span className="w-3 h-3 rounded-sm bg-slate-900 border border-white/5" />
                  <span className="w-3 h-3 rounded-sm bg-emerald-500/35 border border-emerald-500/30" />
                  <span className="w-3 h-3 rounded-sm bg-emerald-500/70 border border-emerald-400/50" />
                  <span className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-300" />
                  <span>Plus</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Day Details Inspector & Daily Summary */}
        <div className="w-full lg:w-80 bg-slate-950/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-xl shrink-0">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck size={16} className="text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Fiche du Jour
                </span>
              </div>
              {selectedDateStr === getLocalDateString(today) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Aujourd'hui
                </span>
              )}
            </div>

            <h5 className="text-base font-bold text-white capitalize mb-1">
              {formatReadableDate(selectedDateStr)}
            </h5>
            <p className="text-xs text-slate-500 font-mono mb-4">
              {selectedDateStr}
            </p>

            {selectedDayActivity ? (
              <div className="flex flex-col gap-4">
                {/* Stats badge grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Sessions
                    </span>
                    <span className="text-2xl font-black text-white font-mono">
                      {selectedDayActivity.count}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                      Meilleur WPM
                    </span>
                    <span className="text-2xl font-black text-amber-300 font-mono">
                      {selectedDayActivity.bestWpm}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                      Précision Moy.
                    </span>
                    <span className="text-2xl font-black text-emerald-300 font-mono">
                      {selectedDayActivity.avgAccuracy}%
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
                      Caractères
                    </span>
                    <span className="text-2xl font-black text-blue-300 font-mono">
                      {selectedDayActivity.totalChars}
                    </span>
                  </div>
                </div>

                {/* Exercises practiced list */}
                {selectedDayActivity.exercises.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Exercices pratiqués :
                    </span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedDayActivity.exercises.map((title, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 text-xs text-slate-300">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col items-center gap-3">
                <Info size={24} className="text-slate-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-300">
                    Aucune session ce jour-là
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Prenez quelques minutes pour pratiquer et maintenir votre rythme de frappe.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action CTA */}
          {onStartPractice && (
            <button
              onClick={onStartPractice}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Lancer une session</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
