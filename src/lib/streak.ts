/**
 * Streak and Daily Activity computation utilities for Tap'Touche
 */

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number;
  totalChars: number;
  bestWpm: number;
  avgAccuracy: number;
  exercises: string[];
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  isPracticedToday: boolean;
  todaySessionsCount: number;
  activityMap: Record<string, DailyActivity>;
  activeDates: string[]; // sorted ascending YYYY-MM-DD
}

export interface StreakMilestone {
  days: number;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    title: 'Départ Enflammé',
    description: '3 jours consécutifs de pratique active.',
    icon: 'flame',
    badgeColor: 'from-amber-500 to-orange-500'
  },
  {
    days: 7,
    title: 'Dévotion Hebdo',
    description: 'Une semaine complète sans interruption.',
    icon: 'sparkles',
    badgeColor: 'from-blue-500 to-indigo-500'
  },
  {
    days: 14,
    title: 'Habitude d’Acier',
    description: '2 semaines d’entraînement continu.',
    icon: 'zap',
    badgeColor: 'from-emerald-500 to-teal-500'
  },
  {
    days: 30,
    title: 'Dactylo d’Or',
    description: 'Un mois entier de frappe quotidienne.',
    icon: 'trophy',
    badgeColor: 'from-yellow-400 to-amber-600'
  },
  {
    days: 60,
    title: 'Maître de Régularité',
    description: 'Deux mois consécutifs de progression ininterrompue.',
    icon: 'crown',
    badgeColor: 'from-purple-500 to-pink-500'
  },
  {
    days: 100,
    title: 'Centurion Tap’Touche',
    description: '100 jours d’entraînement légendaire.',
    icon: 'award',
    badgeColor: 'from-rose-500 to-red-600'
  }
];

/**
 * Format a Date object into local YYYY-MM-DD string
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses YYYY-MM-DD into a local Date
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Add or subtract days from a date string
 */
export const offsetDateString = (dateStr: string, dayOffset: number): string => {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + dayOffset);
  return getLocalDateString(date);
};

/**
 * Calculate difference in calendar days between two YYYY-MM-DD strings
 */
export const diffCalendarDays = (dateStrA: string, dateStrB: string): number => {
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcA - utcB) / msPerDay);
};

/**
 * Default initial sample history so new or demo users immediately experience the streak calendar
 */
export const generateDefaultSeedHistory = (): any[] => {
  const today = new Date();
  const sampleRecords: any[] = [];

  const offsets = [
    { daysAgo: 0, count: 3, wpm: 48, acc: 98, title: 'Touches de base A et P' },
    { daysAgo: 1, count: 4, wpm: 46, acc: 97, title: 'Ligne médiane E et I' },
    { daysAgo: 2, count: 2, wpm: 44, acc: 96, title: 'Majuscules et ponctuation' },
    { daysAgo: 3, count: 3, wpm: 42, acc: 95, title: 'Mots courts et régularité' },
    { daysAgo: 5, count: 2, wpm: 40, acc: 94, title: 'Chiffres et symboles' },
    { daysAgo: 6, count: 3, wpm: 39, acc: 93, title: 'Ligne supérieure' },
    { daysAgo: 8, count: 2, wpm: 38, acc: 95, title: 'Accents et cédilles' },
    { daysAgo: 9, count: 4, wpm: 37, acc: 92, title: 'Vitesse de croisière' },
    { daysAgo: 12, count: 1, wpm: 35, acc: 94, title: 'Initiation clavier' }
  ];

  offsets.forEach(({ daysAgo, count, wpm, acc, title }) => {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - daysAgo);

    for (let i = 0; i < count; i++) {
      sampleRecords.push({
        wpm: wpm + (i * 2),
        cpm: (wpm + (i * 2)) * 5,
        accuracy: Math.min(100, acc + (i % 2)),
        errors: Math.max(0, 4 - i),
        correctChars: 120 + (i * 15),
        totalCharsTyped: 125 + (i * 15),
        title,
        date: targetDate.toISOString()
      });
    }
  });

  return sampleRecords;
};

/**
 * Aggregates all user sessions into daily buckets and computes accurate consecutive streaks
 */
export const computeStreakStats = (
  history: any[] = [],
  completedExercises: Record<string, any> = {},
  userProfile?: any
): StreakStats => {
  const activityMap: Record<string, DailyActivity> = {};

  // 1. Process history records
  history.forEach((session) => {
    if (!session || !session.date) return;
    try {
      const d = new Date(session.date);
      if (isNaN(d.getTime())) return;
      const dateKey = getLocalDateString(d);

      if (!activityMap[dateKey]) {
        activityMap[dateKey] = {
          date: dateKey,
          count: 0,
          totalChars: 0,
          bestWpm: 0,
          avgAccuracy: 0,
          exercises: []
        };
      }

      const day = activityMap[dateKey];
      const sessionAcc = Number(session.accuracy) || 0;
      const sessionWpm = Number(session.wpm) || 0;
      const sessionChars = Number(session.correctChars) || Number(session.totalCharsTyped) || 50;

      day.avgAccuracy = Math.round(((day.avgAccuracy * day.count) + sessionAcc) / (day.count + 1));
      day.count += 1;
      day.totalChars += sessionChars;
      day.bestWpm = Math.max(day.bestWpm, sessionWpm);
      if (session.title && !day.exercises.includes(session.title)) {
        day.exercises.push(session.title);
      }
    } catch {
      // Ignore invalid date records
    }
  });

  // 2. Process completedExercises records if they contain completedAt
  Object.values(completedExercises).forEach((rec: any) => {
    if (!rec || !rec.completedAt) return;
    try {
      const d = new Date(rec.completedAt);
      if (isNaN(d.getTime())) return;
      const dateKey = getLocalDateString(d);

      if (!activityMap[dateKey]) {
        activityMap[dateKey] = {
          date: dateKey,
          count: 1,
          totalChars: 80,
          bestWpm: Number(rec.bestWpm) || 0,
          avgAccuracy: Number(rec.bestAccuracy) || 95,
          exercises: []
        };
      } else {
        const day = activityMap[dateKey];
        day.bestWpm = Math.max(day.bestWpm, Number(rec.bestWpm) || 0);
      }
    } catch {
      // Ignore
    }
  });

  // 3. Process userProfile?.dailyActivity if available from Firestore
  if (userProfile?.dailyActivity && typeof userProfile.dailyActivity === 'object') {
    Object.entries(userProfile.dailyActivity).forEach(([dateKey, count]) => {
      if (!activityMap[dateKey]) {
        activityMap[dateKey] = {
          date: dateKey,
          count: Number(count) || 1,
          totalChars: (Number(count) || 1) * 80,
          bestWpm: userProfile?.bestWpm || 0,
          avgAccuracy: userProfile?.averageAccuracy || 95,
          exercises: []
        };
      }
    });
  }

  // 4. Ensure lastStreakDate from userProfile is counted
  if (userProfile?.lastStreakDate) {
    const lsd = userProfile.lastStreakDate;
    if (!activityMap[lsd]) {
      activityMap[lsd] = {
        date: lsd,
        count: 1,
        totalChars: 100,
        bestWpm: userProfile?.bestWpm || 0,
        avgAccuracy: userProfile?.averageAccuracy || 95,
        exercises: []
      };
    }
  }

  const activeDates = Object.keys(activityMap).sort(); // Ascending YYYY-MM-DD
  const totalActiveDays = activeDates.length;

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = offsetDateString(todayStr, -1);

  const isPracticedToday = !!activityMap[todayStr] && activityMap[todayStr].count > 0;
  const todaySessionsCount = activityMap[todayStr]?.count || 0;

  // 5. Calculate Current Streak
  let currentStreak = 0;
  if (isPracticedToday) {
    currentStreak = 1;
    let checkDate = yesterdayStr;
    while (activityMap[checkDate] && activityMap[checkDate].count > 0) {
      currentStreak++;
      checkDate = offsetDateString(checkDate, -1);
    }
  } else if (activityMap[yesterdayStr] && activityMap[yesterdayStr].count > 0) {
    // Yesterday was practiced, today is pending -> streak is intact!
    currentStreak = 1;
    let checkDate = offsetDateString(yesterdayStr, -1);
    while (activityMap[checkDate] && activityMap[checkDate].count > 0) {
      currentStreak++;
      checkDate = offsetDateString(checkDate, -1);
    }
  }

  // Synchronize with userProfile?.streak if stored in Firestore
  if (userProfile?.streak && typeof userProfile.streak === 'number') {
    currentStreak = Math.max(currentStreak, userProfile.streak);
  }

  // 6. Calculate Longest Streak
  let longestStreak = currentStreak;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const d of activeDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = diffCalendarDays(d, prevDate);
      if (diff === 1) {
        tempStreak++;
      } else if (diff > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = d;
  }

  if (userProfile?.longestStreak && typeof userProfile.longestStreak === 'number') {
    longestStreak = Math.max(longestStreak, userProfile.longestStreak);
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalActiveDays,
    isPracticedToday,
    todaySessionsCount,
    activityMap,
    activeDates
  };
};

/**
 * Returns month matrix for a specific month (year, monthIndex 0-11)
 */
export interface CalendarDayInfo {
  dateStr: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  activity?: DailyActivity;
}

export const getMonthGridDays = (year: number, monthIndex: number, activityMap: Record<string, DailyActivity>): CalendarDayInfo[] => {
  const todayStr = getLocalDateString(new Date());
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  // In French / ISO week, Monday is 0, Sunday is 6
  // JS getDay(): 0 is Sunday, 1 is Monday...
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const days: CalendarDayInfo[] = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const d = new Date(year, monthIndex - 1, dayNum);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayOfMonth: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      activity: activityMap[dateStr]
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= lastDayOfMonth.getDate(); dayNum++) {
    const d = new Date(year, monthIndex, dayNum);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayOfMonth: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      activity: activityMap[dateStr]
    });
  }

  // Next month leading days to complete full weeks (multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const d = new Date(year, monthIndex + 1, dayNum);
    const dateStr = getLocalDateString(d);
    days.push({
      dateStr,
      dayOfMonth: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      activity: activityMap[dateStr]
    });
  }

  return days;
};

/**
 * Returns weeks of past N weeks for the activity contribution heatmap
 */
export interface HeatmapDay {
  dateStr: string;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  monthName: string;
  isToday: boolean;
  activity?: DailyActivity;
}

export const getContributionHeatmap = (
  weeksCount: number = 20,
  activityMap: Record<string, DailyActivity>
): { weeks: HeatmapDay[][]; monthLabels: { label: string; weekIndex: number }[] } => {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Find the end date: end of current week (Sunday)
  let todayDayOfWeek = today.getDay() - 1;
  if (todayDayOfWeek === -1) todayDayOfWeek = 6;

  const daysToSunday = 6 - todayDayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysToSunday);

  const totalDays = weeksCount * 7;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const weeks: HeatmapDay[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let currentWeek: HeatmapDay[] = [];
  let lastMonthSeen = -1;

  const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  for (let i = 0; i < totalDays; i++) {
    const curr = new Date(startDate);
    curr.setDate(curr.getDate() + i);

    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const dateStr = getLocalDateString(curr);
    const m = curr.getMonth();

    if (m !== lastMonthSeen && curr.getDate() <= 7) {
      monthLabels.push({
        label: monthNamesFr[m],
        weekIndex: weeks.length
      });
      lastMonthSeen = m;
    }

    currentWeek.push({
      dateStr,
      dayOfWeek,
      monthName: monthNamesFr[m],
      isToday: dateStr === todayStr,
      activity: activityMap[dateStr]
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return { weeks, monthLabels };
};
