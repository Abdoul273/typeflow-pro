import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  Zap, 
  Target, 
  Keyboard as KeyboardIcon, 
  History, 
  Settings,
  Brain,
  RotateCcw,
  BarChart3,
  Moon,
  Sun,
  Sparkles,
  ArrowRight,
  LogIn,
  LogOut,
  User as UserIcon,
  TrendingUp,
  Activity,
  EyeOff,
  Eye,
  Award,
  Minimize2,
  Maximize2,
  Cloud,
  CloudOff,
  Star,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  Volume2,
  Volume1,
  VolumeX,
  Clock,
  Hourglass,
  Swords
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useTyping } from './hooks/useTyping';
import { useSound } from './hooks/useSound';
import { TypingDisplay } from './components/TypingDisplay';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { StatsCard } from './components/StatsCard';
import { AICoach } from './components/AICoach';
import { 
  KeyboardLayoutType, 
  getExercises, 
  sanitizeForQwerty, 
  Exercise, 
  EXERCISES 
} from './lib/constants';
import { cn } from './lib/utils';
import { generateDefaultSeedHistory } from './lib/streak';
import { KeyHeatmap } from './components/KeyHeatmap';
import { KeyboardLayoutModal } from './components/KeyboardLayoutModal';
import { SoundSettingsModal } from './components/SoundSettingsModal';
import { CountdownSettingsModal } from './components/CountdownSettingsModal';
import { analyzePerformance, AIAssessment } from './services/geminiService';
import { useAuth } from './context/AuthContext';
import { 
  saveSession, 
  getLeaderboard, 
  getUserProfile, 
  updateUserXP, 
  updateUserBadges,
  saveUserProgression,
  ExerciseRecord 
} from './lib/firebase';
import { triggerRecordConfetti, playVictoryFanfare } from './lib/confetti';
import { BADGES, evaluateBadges, BadgeEvaluationContext, Badge } from './lib/badges';
import { ProfileView } from './components/ProfileView';
import { BadgeUnlockModal } from './components/BadgeUnlockModal';
import { CurriculumModal } from './components/CurriculumModal';
import { DuelView } from './components/DuelView';

function App() {
  const { user, login, logout } = useAuth();

  // Keyboard layout state (AZERTY vs QWERTY)
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutType>(() => {
    try {
      const saved = localStorage.getItem('typeflow_keyboard_layout');
      if (saved === 'azerty' || saved === 'qwerty') return saved;
      return 'azerty';
    } catch {
      return 'azerty';
    }
  });

  const [showLayoutModal, setShowLayoutModal] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('typeflow_keyboard_layout');
    } catch {
      return false;
    }
  });

  const [isFirstLayoutSelection, setIsFirstLayoutSelection] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('typeflow_keyboard_layout');
    } catch {
      return false;
    }
  });

  // Current exercises based on layout
  const currentExercises = useMemo(() => getExercises(keyboardLayout), [keyboardLayout]);
  const [currentExercise, setCurrentExercise] = useState<Exercise>(() => currentExercises[0]);

  // Target exercise text, guaranteed 100% accent-free for QWERTY
  const targetExerciseContent = useMemo(() => {
    if (keyboardLayout === 'qwerty') {
      return sanitizeForQwerty(currentExercise.content);
    }
    return currentExercise.content;
  }, [keyboardLayout, currentExercise.content]);

  // Audio rhythm & subtle sound effects state
  const { 
    settings: soundSettings, 
    update: updateSound, 
    toggleMute, 
    preview: previewSoundEffect 
  } = useSound();
  const [showSoundModal, setShowSoundModal] = useState(false);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('typeflow_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const initialSeed = generateDefaultSeedHistory();
      localStorage.setItem('typeflow_history', JSON.stringify(initialSeed));
      return initialSeed;
    } catch {
      return generateDefaultSeedHistory();
    }
  });

  // Sync session history to local cache
  useEffect(() => {
    try {
      if (history.length > 0) {
        localStorage.setItem('typeflow_history', JSON.stringify(history.slice(0, 300)));
      }
    } catch {
      // Ignore localStorage write errors
    }
  }, [history]);
  const [globalSessions, setGlobalSessions] = useState<any[]>([]);
  const [aiAssessment, setAIAssessment] = useState<AIAssessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [theme, setTheme] = useState<'modern' | 'terminal'>('modern');
  const [tab, setTab] = useState<'practice' | 'duel' | 'leaderboard' | 'stats' | 'profile'>('practice');
  const [initialDuelCode, setInitialDuelCode] = useState<string | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [errorHistory, setErrorHistory] = useState<Record<string, number>>({});
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Check URL parameters, hash, or storage for direct duel invites (?duel=CODE or #duel=CODE)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let duelParam = urlParams.get('duel') || urlParams.get('room') || urlParams.get('code');

      if (!duelParam && window.location.hash) {
        const hash = window.location.hash;
        const match = hash.match(/duel[=/]([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          duelParam = match[1];
        }
      }

      if (!duelParam) {
        duelParam = sessionStorage.getItem('typeflow_pending_duel');
      }

      if (duelParam) {
        const cleanParam = duelParam.trim().toUpperCase();
        setInitialDuelCode(cleanParam);
        sessionStorage.setItem('typeflow_pending_duel', cleanParam);
        setTab('duel');
      }
    } catch (e) {
      console.warn('Could not parse URL query params', e);
    }
  }, []);

  // Completed Tap'Touche exercises tracking (local cache + Google Cloud Firestore)
  const [completedExercises, setCompletedExercises] = useState<Record<string, ExerciseRecord>>(() => {
    try {
      const saved = localStorage.getItem('typeflow_completed_exercises');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Badges & Achievements state
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('typeflow_unlocked_badges');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [latestUnlockedBadge, setLatestUnlockedBadge] = useState<Badge | null>(null);

  // Personal record tracking & visual celebration state
  const [personalBestWpm, setPersonalBestWpm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('typeflow_best_wpm');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [isRecordBroken, setIsRecordBroken] = useState(false);
  const [previousRecordWpm, setPreviousRecordWpm] = useState(0);
  const [focusLocked, setFocusLocked] = useState(false);

  // Optional countdown timer challenge for focus mode
  const [countdownTimeLimit, setCountdownTimeLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('typeflow_countdown_limit');
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [showCountdownModal, setShowCountdownModal] = useState(false);

  const { 
    userInput, 
    stats, 
    isStarted, 
    isFinished, 
    isTimeOut,
    lastErrorKey,
    errorShakeTrigger,
    reset, 
    handleInput,
    elapsedTime,
    timeRemaining,
    timeLimit
  } = useTyping(targetExerciseContent, countdownTimeLimit);

  const handleSelectTimeLimit = (seconds: number) => {
    setCountdownTimeLimit(seconds);
    try {
      localStorage.setItem('typeflow_countdown_limit', seconds.toString());
    } catch (e) {
      console.warn('localStorage error', e);
    }
    reset();
  };

  const isFocusModeActive = tab === 'practice' && ((isStarted && !isFinished) || focusLocked);

  // Global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key exits focus mode or resets current run
      if (e.key === 'Escape') {
        if (isFocusModeActive) {
          setFocusLocked(false);
          if (isStarted && !isFinished) {
            reset();
          }
          return;
        }
      }

      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
      }
      setActiveKey(e.key);
      if (e.key.length === 1 || e.key === 'Backspace') {
        handleInput(e.key);
      }
    };
    const handleKeyUp = () => setActiveKey(null);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleInput, isFocusModeActive, isStarted, isFinished, reset]);

  // Handle completion
  useEffect(() => {
    if (isFinished) {
      // If session ended due to countdown timeout, record challenge attempt if characters were typed
      if (isTimeOut) {
        if (stats.totalCharsTyped > 0) {
          const newRecord = {
            ...stats,
            title: `${currentExercise.title} [Défi ${timeLimit}s - Expiré]`,
            date: new Date().toISOString(),
          };
          setHistory(prev => [newRecord, ...prev]);
        }
        return;
      }

      const newRecord = {
        ...stats,
        title: currentExercise.title,
        date: new Date().toISOString(),
      };
      setHistory(prev => [newRecord, ...prev]);

      // Check if this is a new personal WPM record
      const isNewBest = stats.wpm > personalBestWpm && stats.wpm > 0;
      const prevBest = personalBestWpm;

      if (isNewBest) {
        setPreviousRecordWpm(prevBest);
        setIsRecordBroken(true);
        setPersonalBestWpm(stats.wpm);
        try {
          localStorage.setItem('typeflow_best_wpm', stats.wpm.toString());
        } catch (e) {
          console.warn('localStorage error', e);
        }

        // Fire festive particle confetti and victory audio fanfare
        triggerRecordConfetti();
        playVictoryFanfare();
      } else {
        setIsRecordBroken(false);
      }

      // Calculate stars earned: 3 stars (speed & accuracy), 2 stars (solid), 1 star (completion)
      let earnedStars = 1;
      if (stats.accuracy >= 96 && stats.wpm >= 38) {
        earnedStars = 3;
      } else if (stats.accuracy >= 90 && stats.wpm >= 20) {
        earnedStars = 2;
      }

      const prevRec = completedExercises[currentExercise.id];
      const updatedRec: ExerciseRecord = {
        bestWpm: Math.max(prevRec?.bestWpm || 0, stats.wpm),
        bestAccuracy: Math.max(prevRec?.bestAccuracy || 0, stats.accuracy),
        stars: Math.max(prevRec?.stars || 0, earnedStars),
        completedAt: new Date().toISOString(),
        attempts: (prevRec?.attempts || 0) + 1
      };

      const nextCompletedMap = {
        ...completedExercises,
        [currentExercise.id]: updatedRec
      };
      setCompletedExercises(nextCompletedMap);
      try {
        localStorage.setItem('typeflow_completed_exercises', JSON.stringify(nextCompletedMap));
      } catch (e) {
        console.warn('localStorage error', e);
      }

      if (user) {
        setCloudSaveStatus('saving');
        saveUserProgression(user.uid, {
          exerciseId: currentExercise.id,
          exerciseTitle: currentExercise.title,
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errors: stats.errors,
          correctChars: stats.correctChars
        }, userProfile)
          .then(() => {
            setCloudSaveStatus('saved');
            setTimeout(() => setCloudSaveStatus('idle'), 3500);
          })
          .catch((err) => {
            console.error('Cloud save failed:', err);
            setCloudSaveStatus('error');
          });

        saveSession({
          userId: user.uid,
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errors: stats.errors,
          exerciseTitle: currentExercise.title,
          userName: user.displayName,
          userPhoto: user.photoURL
        });
      }

      // Evaluate badges & achievements (Cent WPM, Précision Parfaite, Marathonien, etc.)
      const updatedTotalSessions = history.length + 1;
      const updatedTotalXp = (userProfile?.xp || 0) + stats.correctChars;
      const hasPerfectAcc = (Number(stats.accuracy) >= 100 && (stats.errors === 0 || !stats.errors)) ||
        history.some(h => Number(h.accuracy) >= 100 && (h.errors === 0 || !h.errors));

      const evalContext: BadgeEvaluationContext = {
        bestWpm: Math.max(personalBestWpm, stats.wpm),
        bestAccuracy: history.length > 0 ? Math.max(...history.map(h => Number(h.accuracy) || 0), stats.accuracy) : stats.accuracy,
        totalSessions: updatedTotalSessions,
        totalXp: updatedTotalXp,
        hasPerfectAccuracySession: hasPerfectAcc,
        currentSession: {
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          errors: stats.errors
        }
      };

      const { newlyUnlocked, allUnlockedIds } = evaluateBadges(evalContext, unlockedBadgeIds);
      let hasNewBadges = false;

      if (newlyUnlocked.length > 0) {
        hasNewBadges = true;
        setUnlockedBadgeIds(allUnlockedIds);
        try {
          localStorage.setItem('typeflow_unlocked_badges', JSON.stringify(allUnlockedIds));
        } catch (e) {
          console.warn('localStorage error', e);
        }

        setLatestUnlockedBadge(newlyUnlocked[0]);
        triggerRecordConfetti();
        playVictoryFanfare();

        const bonusXp = newlyUnlocked.reduce((acc, b) => acc + b.xpReward, 0);
        if (user) {
          updateUserBadges(user.uid, allUnlockedIds);
          updateUserXP(user.uid, bonusXp);
        }
      }

      // Aggregate error keys for heatmap
      setErrorHistory(prev => {
        const next = { ...prev };
        Object.entries(stats.errorKeys).forEach(([key, count]) => {
          next[key] = (next[key] || 0) + count;
        });
        return next;
      });

      // Auto-progress: give 4 seconds to enjoy the celebration, or 2 seconds normally (only if no badge modal is shown)
      if (!hasNewBadges) {
        const autoProgressDelay = isNewBest ? 4200 : 2000;
        const timeout = setTimeout(() => {
          nextExercise();
        }, autoProgressDelay);
        return () => clearTimeout(timeout);
      }
    } else {
      setIsRecordBroken(false);
    }
  }, [isFinished, user, history, personalBestWpm, userProfile, unlockedBadgeIds, currentExercise.title, stats]);

  // Sync badges and progression from user profile
  useEffect(() => {
    if (userProfile?.badges && Array.isArray(userProfile.badges) && userProfile.badges.length > 0) {
      setUnlockedBadgeIds(prev => {
        const merged = Array.from(new Set([...prev, ...userProfile.badges]));
        try {
          localStorage.setItem('typeflow_unlocked_badges', JSON.stringify(merged));
        } catch (e) {
          console.warn('localStorage error', e);
        }
        return merged;
      });
    }

    if (userProfile?.completedExercises) {
      setCompletedExercises(prev => {
        const merged = { ...prev, ...userProfile.completedExercises };
        try {
          localStorage.setItem('typeflow_completed_exercises', JSON.stringify(merged));
        } catch (e) {
          console.warn('localStorage error', e);
        }
        return merged;
      });
    }

    if (userProfile?.bestWpm && userProfile.bestWpm > personalBestWpm) {
      setPersonalBestWpm(userProfile.bestWpm);
      try {
        localStorage.setItem('typeflow_best_wpm', userProfile.bestWpm.toString());
      } catch (e) {
        console.warn('localStorage error', e);
      }
    }
  }, [userProfile]);

  // Sync personal best from user sessions in global leaderboard if available
  useEffect(() => {
    if (user && globalSessions.length > 0) {
      const mySessions = globalSessions.filter(s => s.userId === user.uid);
      if (mySessions.length > 0) {
        const maxScore = Math.max(...mySessions.map(s => Number(s.wpm) || 0));
        if (maxScore > personalBestWpm) {
          setPersonalBestWpm(maxScore);
          try {
            localStorage.setItem('typeflow_best_wpm', maxScore.toString());
          } catch (e) {
            console.warn('localStorage error', e);
          }
        }
      }
    }
  }, [user, globalSessions, personalBestWpm]);

  // Fetch user profile and levels
  useEffect(() => {
    if (user) {
      const unsubscribe = getUserProfile(user.uid, setUserProfile);
      return () => unsubscribe();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Fetch leaderboard
  useEffect(() => {
    const unsubscribe = getLeaderboard(setGlobalSessions);
    return () => unsubscribe();
  }, []);

  // Trigger AI assessment automatically after 3 sessions
  useEffect(() => {
    if (history.length > 0 && history.length % 3 === 0) {
      handleAnalyze();
    }
  }, [history.length]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzePerformance(history);
      setAIAssessment(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectLayout = (newLayout: KeyboardLayoutType) => {
    setKeyboardLayout(newLayout);
    try {
      localStorage.setItem('typeflow_keyboard_layout', newLayout);
    } catch (e) {
      console.warn('localStorage error', e);
    }
    setIsFirstLayoutSelection(false);
    
    const newExercises = getExercises(newLayout);
    const currIdx = currentExercises.findIndex(e => e.id === currentExercise.id);
    const targetIdx = currIdx !== -1 ? currIdx : 0;
    const nextEx = newExercises[Math.min(targetIdx, newExercises.length - 1)];
    setIsRecordBroken(false);
    setCurrentExercise(nextEx);
    reset();
    setAIAssessment(null);
  };

  const applyAIExercise = (text: string) => {
    setIsRecordBroken(false);
    const cleanText = keyboardLayout === 'qwerty' ? sanitizeForQwerty(text) : text;
    setCurrentExercise({
      id: `ai-${Date.now()}`,
      title: 'Session IA Ciblée',
      content: cleanText,
      level: 'Sur mesure',
      category: 'Progrès IA'
    });
    reset();
    setAIAssessment(null);
  };

  const changeExercise = (index: number) => {
    setIsRecordBroken(false);
    setCurrentExercise(currentExercises[index]);
    reset();
    setAIAssessment(null);
  };

  const handleResetSession = () => {
    setIsRecordBroken(false);
    reset();
  };

  const nextExercise = () => {
    setIsRecordBroken(false);
    const currentIndex = currentExercises.findIndex(ex => ex.id === currentExercise.id);
    if (currentIndex !== -1 && currentIndex < currentExercises.length - 1) {
      changeExercise(currentIndex + 1);
    } else {
      changeExercise(0);
    }
  };

  const avgWpm = history.length > 0 
    ? history.reduce((acc, h) => acc + h.wpm, 0) / history.length 
    : 40;
  const ghostIndex = (avgWpm / 60) * 5 * elapsedTime; // 5 chars per word

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans selection:bg-blue-500/30 transition-colors duration-500",
      theme === 'modern' ? "bg-[#020617] text-slate-100" : "bg-black text-green-500 font-mono"
    )}>
      {/* Background Decor */}
      {theme === 'modern' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>
      )}

      {theme === 'terminal' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[100] bg-[length:100%_2px,3px_100%]" />
      )}

      {!isFocusModeActive && (
        <header className={cn(
          "p-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl",
          theme === 'modern' ? "border-b border-white/5 bg-slate-950/20" : "border-b border-green-900/30 bg-black"
        )}>
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className={cn(
            "p-2 rounded-xl shadow-lg transition-transform group-hover:scale-110",
            theme === 'modern' ? "bg-blue-600 shadow-blue-500/20" : "bg-green-900 border border-green-500"
          )}>
            <KeyboardIcon className={theme === 'modern' ? "text-white" : "text-green-400"} size={24} />
          </div>
          <h1 className={cn(
            "text-xl font-black tracking-tighter uppercase italic",
            theme === 'modern' ? "text-white" : "text-green-500"
          )}>
            Type<span className={theme === 'modern' ? "text-blue-500" : "text-green-300"}>Flow</span>
          </h1>
        </div>
        
        <nav className="flex items-center gap-8">
          {!zenMode && (
            <>
              <button 
                onClick={() => setTab('practice')}
                className={cn(
                  "text-slate-400 hover:text-white transition-all flex items-center gap-2 group",
                  tab === 'practice' && "text-white"
                )}
              >
                <KeyboardIcon size={18} />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Entraîner</span>
              </button>

              <button 
                onClick={() => setTab('duel')}
                className={cn(
                  "text-slate-400 hover:text-white transition-all flex items-center gap-2 group relative",
                  tab === 'duel' && "text-white"
                )}
                title="Mode Duel 1v1 en direct"
              >
                <Swords size={18} className="group-hover:rotate-[-12deg] transition-transform text-amber-400" />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Duel 1v1</span>
                <span className="flex items-center justify-center px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-[9px] font-black tracking-tighter uppercase animate-pulse">
                  Live
                </span>
              </button>

              <button 
                onClick={() => setTab('leaderboard')}
                className={cn(
                  "text-slate-400 hover:text-white transition-all flex items-center gap-2 group",
                  tab === 'leaderboard' && "text-white"
                )}
              >
                <Trophy size={18} className="group-hover:rotate-[-12deg] transition-transform" />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Classement</span>
              </button>

              <button 
                onClick={() => setTab('stats')}
                className={cn(
                  "text-slate-400 hover:text-white transition-all flex items-center gap-2 group",
                  tab === 'stats' && "text-white"
                )}
              >
                <BarChart3 size={18} className="group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Stats</span>
              </button>

              <button 
                onClick={() => setTab('profile')}
                className={cn(
                  "text-slate-400 hover:text-white transition-all flex items-center gap-2 group relative",
                  tab === 'profile' && "text-white"
                )}
              >
                <Award size={18} className="group-hover:scale-110 transition-transform text-amber-400" />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Profil</span>
                {unlockedBadgeIds.length > 0 && (
                  <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                    {unlockedBadgeIds.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border rounded-full transition-all disabled:opacity-50 group",
                  theme === 'modern' ? "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20" : "bg-green-900/10 border-green-500/20 text-green-500 hover:bg-green-500/10"
                )}
              >
                <Brain size={18} className={isAnalyzing ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
                <span className="font-bold text-[10px] uppercase tracking-widest">
                  {isAnalyzing ? "Analyse..." : "Coach IA"}
                </span>
              </button>
            </>
          )}

          <button 
            onClick={() => setZenMode(!zenMode)}
            className={cn(
              "p-2 rounded-full transition-colors",
              theme === 'modern' ? "hover:bg-white/5 text-slate-400" : "hover:bg-green-500/10 text-green-500",
              zenMode && "text-white bg-blue-500/20"
            )}
            title={zenMode ? "Quitter Mode Zen" : "Mode Zen"}
          >
            {zenMode ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>

          {/* Keyboard Layout Selector (AZERTY / QWERTY) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-white/10 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => handleSelectLayout('azerty')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer",
                keyboardLayout === 'azerty'
                  ? "bg-blue-600 text-white shadow-sm font-black"
                  : "text-slate-400 hover:text-white"
              )}
              title="Clavier AZERTY (Français avec accents)"
            >
              <span className="text-[10px]">🇫🇷</span>
              <span>AZERTY</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectLayout('qwerty')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer",
                keyboardLayout === 'qwerty'
                  ? "bg-blue-600 text-white shadow-sm font-black"
                  : "text-slate-400 hover:text-white"
              )}
              title="Clavier QWERTY (Sans accents)"
            >
              <span className="text-[10px]">🌐</span>
              <span>QWERTY</span>
              {keyboardLayout === 'qwerty' && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold hidden xl:inline">
                  Sans accent
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              className="p-1 text-slate-400 hover:text-white ml-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
              title="Configurer la disposition du clavier"
            >
              <KeyboardIcon size={14} />
            </button>
          </div>

          {/* Audio Rhythm & Sound Effects Toggle */}
          <button
            type="button"
            onClick={() => setShowSoundModal(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-inner",
              soundSettings.enabled
                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                : "bg-slate-900/50 border-rose-500/20 text-rose-400 hover:border-rose-500/40"
            )}
            title={
              soundSettings.enabled
                ? `Sons actifs : ${soundSettings.profile} (${Math.round(soundSettings.volume * 100)}%) - Cliquer pour régler`
                : "Sons désactivés (Muet) - Cliquer pour activer"
            }
          >
            {!soundSettings.enabled || soundSettings.volume === 0 ? (
              <VolumeX size={15} className="text-rose-400" />
            ) : soundSettings.volume < 0.4 ? (
              <Volume1 size={15} className="text-blue-400" />
            ) : (
              <Volume2 size={15} className="text-blue-400" />
            )}
            <span className="hidden sm:inline text-[11px] font-bold">
              {!soundSettings.enabled ? 'Muet' : soundSettings.profile === 'soft-tactile' ? 'Feutré' : soundSettings.profile === 'mechanical' ? 'Mécanique' : soundSettings.profile === 'typewriter' ? 'Rétro' : 'Bulle'}
            </span>
          </button>

          <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            {user && userProfile && !zenMode && (
              <button 
                onClick={() => setTab('profile')}
                className="hidden lg:flex flex-col items-end gap-1 mr-4 text-left hover:opacity-80 transition-opacity"
                title="Voir mon profil et mes succès"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Niveau {Math.floor(Math.sqrt((userProfile.xp || 0) / 100)) + 1}</span>
                  <Award size={14} className="text-yellow-500" />
                </div>
                <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((userProfile.xp || 0) % 100)}%` }}
                    className="h-full bg-blue-500" 
                  />
                </div>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTab('profile')}
                  title="Voir mon profil et mes succès"
                  className="rounded-full ring-2 ring-transparent hover:ring-amber-500/50 transition-all"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-blue-500/50" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <UserIcon size={16} className="text-slate-400" />
                    </div>
                  )}
                </button>
                <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors" title="Déconnexion">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                title="Connectez-vous avec Google pour sauvegarder votre progression"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Connexion Google</span>
                <span className="sm:hidden">Connexion</span>
              </button>
            )}
          </div>
        </nav>
      </header>
      )}

      <main className={cn(
        "flex-1 w-full mx-auto flex flex-col relative z-10 transition-all duration-300",
        isFocusModeActive 
          ? "max-w-5xl justify-center items-center px-4 py-4 sm:py-8 min-h-[calc(100vh-2rem)]" 
          : tab === 'duel'
          ? "max-w-7xl p-5 sm:p-8 gap-8"
          : "max-w-5xl p-6 sm:p-12 gap-10"
      )}>
        {tab === 'duel' ? (
          <DuelView
            user={user}
            userProfile={userProfile}
            layout={keyboardLayout}
            initialDuelCode={initialDuelCode}
            onUpdateXP={(xpIncrement) => {
              if (user) {
                updateUserXP(user.uid, xpIncrement);
              }
            }}
            onExitDuel={() => setTab('practice')}
          />
        ) : tab === 'profile' ? (
          <ProfileView
            user={user}
            userProfile={userProfile}
            personalBestWpm={personalBestWpm}
            history={history}
            unlockedBadgeIds={unlockedBadgeIds}
            completedExercises={completedExercises}
            onLogin={login}
            onLogout={logout}
            onStartPractice={() => setTab('practice')}
            onSelectExercise={(idx) => {
              changeExercise(idx);
              setTab('practice');
            }}
            exercises={currentExercises}
            layout={keyboardLayout}
          />
        ) : tab === 'leaderboard' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1"
          >
            {/* Leaderboard content stays same... but wrap it better if needed */}
            <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-yellow-500/20 p-4 rounded-2xl">
                  <Trophy className="text-yellow-500" size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Leaderboard <span className="text-yellow-500 italic">Global</span></h2>
                  <p className="text-slate-500 font-medium">Les meilleurs temps de la communauté</p>
                </div>
              </div>

              <div className="grid gap-3">
                {globalSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border border-white/5 transition-all",
                      i === 0 ? "bg-yellow-500/10 border-yellow-500/20 scale-[1.02]" : "bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <span className={cn(
                        "text-2xl font-black w-10 text-center italic",
                        i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600"
                      )}>
                        #{i + 1}
                      </span>
                      {session.userPhoto ? (
                        <img src={session.userPhoto} alt="" className="w-12 h-12 rounded-2xl border border-white/10" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                          <UserIcon size={20} className="text-slate-500" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-white">{session.userName || 'Anonyme'}</span>
                        <span className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">{session.exerciseTitle}</span>
                      </div>
                    </div>
                    <div className="flex gap-12 items-center">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Speed</p>
                        <p className="text-3xl font-black text-blue-400">{session.wpm}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Accuracy</p>
                        <p className="text-xl font-bold text-green-400">{session.accuracy}%</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : tab === 'stats' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col gap-8"
          >
            <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-blue-500/20 p-4 rounded-2xl">
                  <TrendingUp className="text-blue-500" size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Analyses <span className="text-blue-500 italic">Détaillées</span></h2>
                  <p className="text-slate-500 font-medium">Évolution de vos performances au fil du temps</p>
                </div>
              </div>

              {history.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-white/5 p-6 rounded-full mb-6">
                    <Activity className="text-slate-600" size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Pas assez de données</h3>
                  <p className="text-slate-500 max-w-xs">Complétez au moins deux exercices pour voir vos graphiques d'évolution.</p>
                </div>
              ) : (
                <div className="grid gap-10">
                  <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                       <Zap size={18} className="text-yellow-400" />
                       Vitesse (WPM)
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...history].reverse()}>
                          <defs>
                            <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            hide 
                          />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="wpm" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWpm)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                       <Target size={18} className="text-green-400" />
                       Précision (%)
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...history].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            hide 
                          />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
                       <KeyboardIcon size={18} className="text-purple-400" />
                       Heatmap des Erreurs ({keyboardLayout.toUpperCase()})
                    </h3>
                    <div className="flex justify-center py-4 bg-slate-950/50 rounded-2xl border border-white/5">
                      <KeyHeatmap errorStats={errorHistory} layout={keyboardLayout} />
                    </div>
                    <p className="text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-6">Les touches rouges indiquent vos points de friction majeurs</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : isFocusModeActive ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col justify-center items-center gap-8 sm:gap-10 my-auto"
          >
            {/* Minimalist Floating Focus Bar */}
            <div className="w-full flex items-center justify-between px-6 py-3 bg-slate-900/70 border border-slate-800/90 rounded-2xl backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tracking-tight">{currentExercise.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">{currentExercise.level}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 uppercase">
                      {keyboardLayout}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact live metrics */}
              <div className="flex items-center gap-6 text-xs font-mono">
                <div className="flex items-center gap-1.5" title="Vitesse actuelle">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-white font-bold text-sm">{stats.wpm}</span>
                  <span className="text-slate-500 uppercase text-[10px]">WPM</span>
                </div>
                <div className="flex items-center gap-1.5" title="Précision">
                  <Target size={14} className="text-emerald-400" />
                  <span className="text-white font-bold text-sm">{stats.accuracy}%</span>
                  <span className="text-slate-500 uppercase text-[10px]">Précision</span>
                </div>

                {/* Interactive Countdown Timer / Stopwatch in Focus Mode */}
                <button
                  onClick={() => setShowCountdownModal(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer border text-xs font-mono",
                    countdownTimeLimit > 0
                      ? timeRemaining <= 5 && isStarted
                        ? "bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse"
                        : timeRemaining <= 10 && isStarted
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20"
                      : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                  )}
                  title={countdownTimeLimit > 0 ? "Compte à rebours défi actif - Cliquez pour modifier" : "Chronomètre libre - Cliquez pour lancer un défi de temps"}
                >
                  {countdownTimeLimit > 0 ? (
                    <>
                      <Timer size={14} className={timeRemaining <= 5 && isStarted ? "text-rose-400" : "text-amber-400"} />
                      <span className="font-bold text-sm">
                        {isStarted ? `${timeRemaining}s` : `${countdownTimeLimit}s`}
                      </span>
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                        {isStarted ? "restant" : "défi"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Timer size={14} className="text-blue-400" />
                      <span className="text-white font-bold text-sm">{elapsedTime}s</span>
                      <span className="text-slate-500 text-[9px] uppercase tracking-wider hidden lg:inline hover:underline">+ Défi</span>
                    </>
                  )}
                </button>

                <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs">
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.round((userInput.length / targetExerciseContent.length) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{Math.round((userInput.length / targetExerciseContent.length) * 100)}%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleResetSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  title="Recommencer cet exercice"
                >
                  <RotateCcw size={13} />
                  <span className="hidden sm:inline">Recommencer</span>
                </button>
                <button
                  onClick={() => {
                    setFocusLocked(false);
                    if (isStarted && !isFinished) reset();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Quitter le mode focus (Touche Échap)"
                >
                  <Minimize2 size={13} />
                  <span className="hidden sm:inline">Quitter (Échap)</span>
                </button>
              </div>
            </div>

            {/* Stage: Text to type + Virtual keyboard */}
            <div className="w-full flex flex-col gap-10">
              <TypingDisplay
                targetText={targetExerciseContent}
                userInput={userInput}
                isFinished={isFinished}
                ghostIndex={isStarted ? ghostIndex : undefined}
                isNewRecord={isRecordBroken}
                currentWpm={stats.wpm}
                accuracy={stats.accuracy}
                previousRecordWpm={previousRecordWpm}
                errorShakeTrigger={errorShakeTrigger}
                isFocusMode={true}
                timeLimit={countdownTimeLimit}
                timeRemaining={timeRemaining}
                isTimeOut={isTimeOut}
                onRetry={handleResetSession}
                onContinue={nextExercise}
              />

              <VirtualKeyboard
                activeKey={activeKey}
                targetKey={targetExerciseContent[userInput.length] || null}
                errorKey={lastErrorKey}
                layout={keyboardLayout}
              />
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
          {aiAssessment && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <AICoach assessment={aiAssessment} onApplyExercise={applyAIExercise} />
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex flex-wrap gap-6 justify-between items-end">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{currentExercise.category} • {currentExercise.level}</span>
              
              {/* Stars for this lesson */}
              <div className="flex items-center gap-0.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10" title="Étoiles obtenues sur cet exercice">
                {[1, 2, 3].map(s => (
                  <Star 
                    key={s} 
                    size={11} 
                    className={(completedExercises[currentExercise.id]?.stars || 0) >= s ? "text-yellow-400 fill-yellow-400" : "text-slate-600"} 
                  />
                ))}
              </div>

              {personalBestWpm > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-amber-500/10">
                  <Trophy size={11} className="text-amber-400" />
                  Record : {personalBestWpm} WPM
                </span>
              )}

              {user ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider" title="Votre progression est sauvegardée dans le Cloud Google">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Cloud size={11} />
                  Sauvegardé Google
                </span>
              ) : (
                <button
                  onClick={login}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/25 transition-colors cursor-pointer"
                  title="Connectez-vous pour sauvegarder vos progrès"
                >
                  <LogIn size={11} />
                  Sauvegarder avec Google
                </button>
              )}

              <button
                onClick={() => setTab('profile')}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors cursor-pointer"
                title="Voir vos badges et succès"
              >
                <Award size={11} className="text-purple-400" />
                {unlockedBadgeIds.length} / {BADGES.length} Succès
              </button>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{currentExercise.title}</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Prev / Next Lesson Navigation */}
            <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => {
                  const currIdx = currentExercises.findIndex(e => e.id === currentExercise.id);
                  changeExercise(Math.max(0, currIdx - 1));
                }}
                disabled={currentExercises.findIndex(e => e.id === currentExercise.id) === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                title="Exercice précédent"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setShowCurriculumModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Ouvrir le centre des missions Tap'Touche"
              >
                <BookOpen size={13} className="text-blue-400" />
                <span>Mission {currentExercises.findIndex(e => e.id === currentExercise.id) + 1} / {currentExercises.length}</span>
              </button>

              <button
                onClick={() => {
                  const currIdx = currentExercises.findIndex(e => e.id === currentExercise.id);
                  changeExercise(Math.min(currentExercises.length - 1, currIdx + 1));
                }}
                disabled={currentExercises.findIndex(e => e.id === currentExercise.id) === currentExercises.length - 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                title="Mission suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setShowCurriculumModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Ouvrir la liste complète des missions Tap'Touche"
            >
              <BookOpen size={14} className="text-blue-400" />
              <span>Missions Tap'Touche</span>
            </button>

            <button
              onClick={() => setShowLayoutModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Modifier la disposition du clavier (AZERTY ou QWERTY)"
            >
              <KeyboardIcon size={14} className="text-blue-400" />
              <span className="uppercase font-black">{keyboardLayout}</span>
              {keyboardLayout === 'qwerty' ? (
                <span className="text-[10px] text-emerald-400 font-semibold">(Sans accents)</span>
              ) : (
                <span className="text-[10px] text-blue-400 font-semibold">(Accents FR)</span>
              )}
            </button>

            <button
              onClick={() => setShowSoundModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Ajuster les effets sonores et la cadence audio"
            >
              {!soundSettings.enabled || soundSettings.volume === 0 ? (
                <VolumeX size={14} className="text-rose-400" />
              ) : soundSettings.volume < 0.4 ? (
                <Volume1 size={14} className="text-blue-400" />
              ) : (
                <Volume2 size={14} className="text-blue-400" />
              )}
              <span>
                Son: {!soundSettings.enabled ? 'Muet' : soundSettings.profile === 'soft-tactile' ? 'Feutré' : soundSettings.profile === 'mechanical' ? 'Mécanique' : soundSettings.profile === 'typewriter' ? 'Machine à écrire' : 'Bulle'}
              </span>
              {soundSettings.enabled && (
                <span className="text-[10px] text-blue-400 font-semibold hidden md:inline">
                  {Math.round(soundSettings.volume * 100)}%
                </span>
              )}
            </button>

            <button
              onClick={() => setShowCountdownModal(true)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95",
                countdownTimeLimit > 0
                  ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-400"
                  : "bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-200"
              )}
              title="Configurer un défi chronométré pour le mode focus"
            >
              <Timer size={14} className={countdownTimeLimit > 0 ? "text-amber-400" : "text-slate-400"} />
              <span>{countdownTimeLimit > 0 ? `Défi: ${countdownTimeLimit}s` : 'Chrono Libre'}</span>
              {countdownTimeLimit > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setFocusLocked(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Passer en mode focus plein écran"
            >
              <Maximize2 size={14} />
              <span>Mode Focus</span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            label="WPM" 
            value={stats.wpm} 
            icon={Zap} 
            color="text-yellow-400" 
            subValue={personalBestWpm > 0 ? `Record: ${personalBestWpm} WPM` : undefined}
          />
          <StatsCard label="Précision" value={`${stats.accuracy}%`} icon={Target} color="text-green-400" />
          <StatsCard label="Consécutif" value={stats.correctChars} icon={Trophy} color="text-purple-400" />
          <StatsCard 
            label={countdownTimeLimit > 0 ? "Défi Chrono" : "Chrono"} 
            value={countdownTimeLimit > 0 ? `${timeRemaining}s` : `${elapsedTime}s`} 
            icon={countdownTimeLimit > 0 ? Timer : Clock} 
            color={countdownTimeLimit > 0 && timeRemaining <= 5 && isStarted ? "text-rose-400" : "text-blue-400"}
            subValue={countdownTimeLimit > 0 ? `Limite: ${countdownTimeLimit}s` : undefined}
          />
        </div>

        <section className="flex flex-col gap-12">
          <TypingDisplay
            targetText={targetExerciseContent}
            userInput={userInput}
            isFinished={isFinished}
            ghostIndex={isStarted ? ghostIndex : undefined}
            isNewRecord={isRecordBroken}
            currentWpm={stats.wpm}
            accuracy={stats.accuracy}
            previousRecordWpm={previousRecordWpm}
            errorShakeTrigger={errorShakeTrigger}
            timeLimit={countdownTimeLimit}
            timeRemaining={timeRemaining}
            isTimeOut={isTimeOut}
            onRetry={handleResetSession}
            onContinue={nextExercise}
          />

          <VirtualKeyboard
            activeKey={activeKey}
            targetKey={targetExerciseContent[userInput.length] || null}
            errorKey={lastErrorKey}
            layout={keyboardLayout}
          />
        </section>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-4">
          <button
            onClick={handleResetSession}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-xs border border-white/5 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw size={16} />
            Reset Session
          </button>
          
          {isFinished && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextExercise}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 cursor-pointer"
            >
              Continue <ArrowRight className="inline-block ml-2" size={18} />
            </motion.button>
          )}
        </div>

        {history.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 p-1 bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem]"
          >
            <div className="bg-[#020617] p-8 sm:p-12 rounded-[2.4rem]">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-800 p-3 rounded-2xl">
                    <BarChart3 className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">Performance</h3>
                    <p className="text-slate-500 text-sm font-medium">Vos 5 dernières sessions</p>
                  </div>
                </div>
                <button className="text-blue-500 font-bold text-xs uppercase tracking-widest hover:underline">
                  Voir tout
                </button>
              </div>
              
              <div className="grid gap-4">
                {history.slice(0, 5).map((record, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-white">{record.title}</span>
                      <span className="text-slate-500 text-xs font-mono uppercase">
                        {new Date(record.date).toLocaleDateString()} at {new Date(record.date).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex gap-8 items-center">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Speed</p>
                        <p className="text-2xl font-black text-blue-400">{record.wpm} <span className="text-xs font-normal text-slate-500">WPM</span></p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Acc</p>
                        <p className="text-2xl font-black text-green-400">{record.accuracy}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
        </>
      )}
    </main>

      {!isFocusModeActive && (
        <footer className="p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5 blur-[80px] pointer-events-none" />
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Master Typing Environment</p>
          <p className="text-slate-500 text-xs font-medium">Built for speed. Powered by intelligence.</p>
        </footer>
      )}

      {/* Badge Unlock Celebration Modal */}
      <BadgeUnlockModal
        unlockedBadge={latestUnlockedBadge}
        onClose={() => {
          setLatestUnlockedBadge(null);
          nextExercise();
        }}
      />

      {/* Tap'Touche Curriculum Drawer/Modal */}
      <CurriculumModal
        isOpen={showCurriculumModal}
        onClose={() => setShowCurriculumModal(false)}
        exercises={currentExercises}
        currentExerciseId={currentExercise.id}
        completedExercises={completedExercises}
        onSelectExercise={(idx) => {
          changeExercise(idx);
          setShowCurriculumModal(false);
        }}
        user={user}
        onLogin={login}
        layout={keyboardLayout}
        onOpenLayoutModal={() => {
          setShowCurriculumModal(false);
          setShowLayoutModal(true);
        }}
      />

      {/* Keyboard Layout Selection Modal */}
      <KeyboardLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        currentLayout={keyboardLayout}
        onSelectLayout={handleSelectLayout}
        isInitialSelection={isFirstLayoutSelection}
      />

      {/* Sound Settings & Audio Rhythm Modal */}
      <SoundSettingsModal
        isOpen={showSoundModal}
        onClose={() => setShowSoundModal(false)}
        settings={soundSettings}
        onUpdate={updateSound}
        onPreview={previewSoundEffect}
      />

      {/* Countdown Challenge Settings Modal */}
      <CountdownSettingsModal
        isOpen={showCountdownModal}
        onClose={() => setShowCountdownModal(false)}
        currentTimeLimit={countdownTimeLimit}
        onSelectTimeLimit={handleSelectTimeLimit}
        targetTextLength={targetExerciseContent.length}
      />
    </div>
  );
}

// Add ArrowRight import if missing

export default App;
