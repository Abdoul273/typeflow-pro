import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Swords, 
  Users, 
  Trophy, 
  Flame, 
  Zap, 
  Clock, 
  Copy, 
  Check, 
  ArrowRight, 
  RotateCcw, 
  LogOut, 
  Bot, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Share2, 
  Crown, 
  Flag,
  Gauge,
  Target,
  Shield,
  Activity,
  Columns2,
  Maximize2
} from 'lucide-react';
import { 
  DuelRoom, 
  DuelPlayer, 
  DuelCategory, 
  DUEL_TEXTS, 
  BOT_PROFILES, 
  createFirestoreDuel, 
  joinFirestoreDuelByCode, 
  subscribeToDuel, 
  subscribeToOpenDuels, 
  updatePlayerRaceProgress, 
  setPlayerReadyStatus, 
  startDuelCountdown, 
  launchDuelRace, 
  finishDuelRoom, 
  rematchDuelRoom,
  leaveDuelRoom
} from '../lib/duel';
import { copyToClipboard } from '../lib/clipboard';
import { DuelShareModal } from './DuelShareModal';
import { KeyboardLayoutType } from '../lib/constants';
import { playKeyClick, playErrorSound, playCountdownTick, playChallengeSuccessSound } from '../lib/audio';
import { triggerRecordConfetti, playVictoryFanfare } from '../lib/confetti';
import { cn } from '../lib/utils';

export interface CharToken {
  char: string;
  index: number;
}

export interface WordToken {
  id: number;
  chars: CharToken[];
  trailingSpace?: CharToken;
  isSentenceEnd?: boolean;
}

export function parseWordTokens(targetText: string): WordToken[] {
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
}

interface DuelViewProps {
  user: any;
  userProfile?: any;
  layout: KeyboardLayoutType;
  onUpdateXP?: (xpIncrement: number) => void;
  onExitDuel?: () => void;
  initialDuelCode?: string | null;
}

export const DuelView: React.FC<DuelViewProps> = ({
  user,
  userProfile,
  layout,
  onUpdateXP,
  onExitDuel,
  initialDuelCode
}) => {
  // Current user representation in duel
  const currentPlayer = useMemo<DuelPlayer>(() => {
    return {
      id: user?.uid || `guest_${Math.random().toString(36).substring(2, 9)}`,
      name: userProfile?.displayName || user?.displayName || 'Pilote Rapide',
      photo: user?.photoURL || null,
      ready: false,
      progress: 0,
      cursorIndex: 0,
      wpm: 0,
      accuracy: 100,
      errors: 0,
      finished: false,
      finishTime: null
    };
  }, [user, userProfile]);

  // Screen State: 'lobby' | 'room'
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const [duelRoom, setDuelRoom] = useState<DuelRoom | null>(null);
  const [openDuels, setOpenDuels] = useState<DuelRoom[]>([]);

  // Lobby Creation Form State
  const [selectedCategory, setSelectedCategory] = useState<DuelCategory>('standard');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');

  // Clipboard & Share Modal state
  const [copiedCode, setCopiedCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Typing & Race State
  const [userInput, setUserInput] = useState('');
  const [inputErrors, setInputErrors] = useState(0);
  const [isErrorState, setIsErrorState] = useState(false);
  const [raceStartTime, setRaceStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dual Screen View Mode: 'split' (side-by-side) or 'single' (focused)
  const [duelViewMode, setDuelViewMode] = useState<'split' | 'single'>('split');

  // Group text into whole words with attached spaces and sentence boundary detection
  const wordTokens = useMemo(() => {
    if (!duelRoom?.textContent) return [];
    return parseWordTokens(duelRoom.textContent);
  }, [duelRoom?.textContent]);

  // Synchronized Countdown animation state (3, 2, 1, 0 = 'PARTEZ !', null)
  const [syncedCountdown, setSyncedCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastChimedCountdownRef = useRef<number | null>(null);

  // Bot simulation loop ref
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const raceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Determine current user's role in the duel: 'player1' or 'player2'
  const playerRole = useMemo<'player1' | 'player2' | null>(() => {
    if (!duelRoom) return null;
    if (duelRoom.player1.id === currentPlayer.id) return 'player1';
    if (duelRoom.player2 && duelRoom.player2.id === currentPlayer.id) return 'player2';
    return null;
  }, [duelRoom, currentPlayer.id]);

  const isPlayer1 = playerRole === 'player1';
  const myPlayer = duelRoom ? (isPlayer1 ? duelRoom.player1 : duelRoom.player2) : null;
  const opponentPlayer = duelRoom ? (isPlayer1 ? duelRoom.player2 : duelRoom.player1) : null;

  // Subscribe to public open duels when on lobby
  useEffect(() => {
    if (!activeDuelId) {
      const unsub = subscribeToOpenDuels((duels) => {
        // Filter out rooms created by current user
        setOpenDuels(duels.filter(d => d.player1.id !== currentPlayer.id));
      });
      return () => unsub();
    }
  }, [activeDuelId, currentPlayer.id]);

  // Auto-fill and auto-join if an initial duel code was provided via URL query (?duel=CODE)
  useEffect(() => {
    if (initialDuelCode && !activeDuelId) {
      setJoinCodeInput(initialDuelCode);
      handleJoinDuel(initialDuelCode);
    }
  }, [initialDuelCode, activeDuelId]);

  // Subscribe to the active duel room
  useEffect(() => {
    if (!activeDuelId) {
      setDuelRoom(null);
      return;
    }

    const unsub = subscribeToDuel(
      activeDuelId,
      (room) => {
        if (!room) {
          setActiveDuelId(null);
          setDuelRoom(null);
          return;
        }
        setDuelRoom(room);
      },
      (err) => {
        console.error("Duel subscription error:", err);
      }
    );

    return () => unsub();
  }, [activeDuelId]);

  // Auto-launch countdown when both players are marked ready
  useEffect(() => {
    if (
      duelRoom &&
      duelRoom.status === 'ready' &&
      duelRoom.player1?.ready &&
      duelRoom.player2?.ready &&
      isPlayer1 &&
      activeDuelId
    ) {
      startDuelCountdown(activeDuelId);
    }
  }, [duelRoom?.status, duelRoom?.player1?.ready, duelRoom?.player2?.ready, isPlayer1, activeDuelId]);

  // Handle synchronized countdown sequence driven by shared target epoch timestamp
  useEffect(() => {
    if (!duelRoom || duelRoom.status !== 'starting') {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSyncedCountdown(null);
      lastChimedCountdownRef.current = null;
      return;
    }

    // Shared target epoch timestamp agreed upon via Firestore
    const targetEpoch = duelRoom.raceStartsAt || (Date.now() + 3500);

    const checkSyncCountdown = () => {
      const now = Date.now();
      const remainingMs = targetEpoch - now;

      if (remainingMs > 2200) {
        setSyncedCountdown(3);
        if (lastChimedCountdownRef.current !== 3) {
          lastChimedCountdownRef.current = 3;
          playCountdownTick(3);
        }
      } else if (remainingMs > 1200) {
        setSyncedCountdown(2);
        if (lastChimedCountdownRef.current !== 2) {
          lastChimedCountdownRef.current = 2;
          playCountdownTick(2);
        }
      } else if (remainingMs > 150) {
        setSyncedCountdown(1);
        if (lastChimedCountdownRef.current !== 1) {
          lastChimedCountdownRef.current = 1;
          playCountdownTick(1);
        }
      } else if (remainingMs > -800) {
        // Step 0: "PARTEZ !"
        setSyncedCountdown(0);
        if (lastChimedCountdownRef.current !== 0) {
          lastChimedCountdownRef.current = 0;
          playChallengeSuccessSound();
          setTimeout(() => {
            hiddenInputRef.current?.focus();
          }, 20);

          // Atomic Firestore transition by host (or either client if delay)
          if (isPlayer1 && activeDuelId) {
            launchDuelRace(activeDuelId, targetEpoch);
          }
        }
      } else {
        // Race in progress, dismiss countdown lights
        setSyncedCountdown(null);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        if (isPlayer1 && activeDuelId && duelRoom.status === 'starting') {
          launchDuelRace(activeDuelId, targetEpoch);
        }
      }
    };

    checkSyncCountdown();
    countdownIntervalRef.current = setInterval(checkSyncCountdown, 30);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [duelRoom?.status, duelRoom?.raceStartsAt, isPlayer1, activeDuelId]);

  // Initialize race typing when status transitions to 'in_progress' or countdown starts
  useEffect(() => {
    if (duelRoom?.status === 'in_progress') {
      const startMs = duelRoom.startTime || duelRoom.raceStartsAt || Date.now();
      setRaceStartTime(startMs);

      // Focus hidden input
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 50);

      // Start elapsed timer
      if (raceTimerRef.current) clearInterval(raceTimerRef.current);
      raceTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 500);
    } else if (duelRoom?.status === 'starting') {
      // Clear previous keystrokes on the starting grid
      setUserInput('');
      setInputErrors(0);
      setIsErrorState(false);
      setElapsedSeconds(0);
      setRaceStartTime(duelRoom.raceStartsAt || Date.now() + 3500);
    } else {
      if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    }

    return () => {
      if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    };
  }, [duelRoom?.status, duelRoom?.startTime, duelRoom?.raceStartsAt]);

  // Simulated Bot competitor progress loop with fluid, human-like keystroke cadence
  useEffect(() => {
    if (!duelRoom || !duelRoom.isBot || duelRoom.status !== 'in_progress' || !activeDuelId) {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      return;
    }

    const textLen = duelRoom.textContent.length;
    const targetWpm = duelRoom.botTargetWpm || 60;
    // Average 5 chars per word -> chars per second = (targetWpm * 5) / 60
    const charsPerSec = (targetWpm * 5) / 60;
    const tickIntervalMs = 70;
    const charsPerTick = (charsPerSec * (tickIntervalMs / 1000));

    let botCursor = duelRoom.player2?.cursorIndex || 0;
    let botErrors = duelRoom.player2?.errors || 0;
    let pauseRemainingMs = 0;
    const startMs = Date.now();
    let lastReportedCursor = botCursor;

    botIntervalRef.current = setInterval(() => {
      if (pauseRemainingMs > 0) {
        pauseRemainingMs -= tickIntervalMs;
        return;
      }

      // Add slight human jitter (some ticks faster, micro-pauses on spaces & punctuation)
      const jitter = (Math.random() - 0.48) * 0.4;
      const advance = Math.max(0, charsPerTick + jitter);
      const prevInt = Math.floor(botCursor);
      botCursor = Math.min(textLen, botCursor + advance);
      const currentIntCursor = Math.floor(botCursor);

      // If passing a space or sentence boundary, add a small realistic micro-pause
      if (currentIntCursor > prevInt && currentIntCursor < textLen) {
        const currentChar = duelRoom.textContent[currentIntCursor];
        if (currentChar === ' ') {
          pauseRemainingMs = 90 + Math.random() * 60;
        } else if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
          pauseRemainingMs = 140 + Math.random() * 80;
        }
      }

      const progress = Math.min(100, Math.round((currentIntCursor / textLen) * 100));
      const elapsedSec = Math.max(0.5, (Date.now() - startMs) / 1000);
      const calculatedWpm = elapsedSec > 1 ? Math.round((currentIntCursor / 5) / (elapsedSec / 60)) : targetWpm;

      // Rare random bot error
      if (Math.random() < 0.015) {
        botErrors += 1;
      }
      const accuracy = Math.max(90, 100 - Math.round((botErrors / Math.max(1, currentIntCursor)) * 100));

      if (currentIntCursor >= textLen) {
        // Bot finished race!
        if (botIntervalRef.current) clearInterval(botIntervalRef.current);
        updatePlayerRaceProgress(activeDuelId, 'player2', {
          cursorIndex: textLen,
          progress: 100,
          wpm: calculatedWpm,
          accuracy,
          finished: true,
          finishTime: Math.round(elapsedSec * 10) / 10
        });

        // If player 1 hasn't won yet, bot is winner
        if (!duelRoom.winnerId) {
          finishDuelRoom(activeDuelId, duelRoom.player2!.id, 'player2', {
            cursorIndex: textLen,
            progress: 100,
            wpm: calculatedWpm,
            accuracy,
            finished: true,
            finishTime: Math.round(elapsedSec * 10) / 10
          });
        }
      } else {
        if (currentIntCursor !== lastReportedCursor) {
          lastReportedCursor = currentIntCursor;
          updatePlayerRaceProgress(activeDuelId, 'player2', {
            cursorIndex: currentIntCursor,
            progress,
            wpm: calculatedWpm,
            accuracy,
            errors: botErrors
          });
        }
      }
    }, tickIntervalMs);

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [duelRoom?.status, duelRoom?.isBot, activeDuelId]);

  // Celebrate on Duel Finish
  useEffect(() => {
    if (duelRoom?.status === 'finished') {
      if (duelRoom.winnerId === currentPlayer.id) {
        triggerRecordConfetti();
        playVictoryFanfare();
        if (onUpdateXP) {
          onUpdateXP(80); // Win bonus XP
        }
      } else {
        if (onUpdateXP) {
          onUpdateXP(30); // Participation bonus XP
        }
      }
    }
  }, [duelRoom?.status, duelRoom?.winnerId, currentPlayer.id]);

  // Active race typing status (ready when in_progress or countdown hits 0)
  const isRaceActive = Boolean(
    duelRoom && (
      duelRoom.status === 'in_progress' || 
      (duelRoom.status === 'starting' && syncedCountdown === 0)
    )
  );

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!duelRoom || !isRaceActive || !playerRole || !activeDuelId) return;

    const value = e.target.value;
    const targetText = duelRoom.textContent;

    if (value.length < userInput.length) {
      // User pressed backspace
      setUserInput(value);
      setIsErrorState(false);
      return;
    }

    if (value.length > userInput.length) {
      const expectedChar = targetText[userInput.length];
      const typedChar = value.slice(userInput.length)[0];

      if (!typedChar) return;

      if (typedChar === expectedChar) {
        // Correct keystroke
        playKeyClick(typedChar);
        setIsErrorState(false);
        const newInput = targetText.slice(0, userInput.length + 1);
        setUserInput(newInput);

        const currentChars = newInput.length;
        const progress = Math.min(100, Math.round((currentChars / targetText.length) * 100));
        const raceStartEpoch = duelRoom.startTime || duelRoom.raceStartsAt || raceStartTime || Date.now();
        const elapsedSec = Math.max(0.5, (Date.now() - raceStartEpoch) / 1000);
        const wpm = Math.round((currentChars / 5) / (elapsedSec / 60));
        const accuracy = Math.max(50, 100 - Math.round((inputErrors / Math.max(1, currentChars + inputErrors)) * 100));

        // Finished race!
        if (currentChars >= targetText.length) {
          const finalTime = Math.round(elapsedSec * 10) / 10;
          const finalWpm = Math.round((targetText.length / 5) / (elapsedSec / 60));
          
          finishDuelRoom(activeDuelId, currentPlayer.id, playerRole, {
            progress: 100,
            cursorIndex: targetText.length,
            wpm: finalWpm,
            accuracy,
            errors: inputErrors,
            finished: true,
            finishTime: finalTime
          });
          return;
        }

        // Throttle Firestore write (ultra fast: max once per 70ms or on space or finish)
        const now = Date.now();
        if (now - lastSyncRef.current > 70 || typedChar === ' ') {
          lastSyncRef.current = now;
          updatePlayerRaceProgress(activeDuelId, playerRole, {
            cursorIndex: currentChars,
            progress,
            wpm,
            accuracy,
            errors: inputErrors
          });
        }
      } else {
        // Mistake
        playErrorSound(typedChar);
        setIsErrorState(true);
        setInputErrors(prev => prev + 1);
        // Reset the input field so it doesn't accumulate incorrect keystrokes
        if (hiddenInputRef.current) {
          hiddenInputRef.current.value = userInput;
        }
      }
    }
  };

  // Create duel handler
  const handleCreateDuel = async (isBotMatch: boolean = false) => {
    setIsCreating(true);
    setJoinError(null);
    try {
      const roomId = await createFirestoreDuel({
        creator: {
          id: currentPlayer.id,
          name: currentPlayer.name,
          photo: currentPlayer.photo
        },
        category: selectedCategory,
        layout,
        isBot: isBotMatch,
        botDifficulty: isBotMatch ? botDifficulty : undefined
      });
      setActiveDuelId(roomId);
    } catch (err: any) {
      setJoinError(err.message || "Erreur lors de la création du salon.");
    } finally {
      setIsCreating(false);
    }
  };

  // Join duel by code handler
  const handleJoinDuel = async (codeToJoin: string) => {
    if (!codeToJoin.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const roomId = await joinFirestoreDuelByCode(codeToJoin, {
        id: currentPlayer.id,
        name: currentPlayer.name,
        photo: currentPlayer.photo
      });
      setActiveDuelId(roomId);
    } catch (err: any) {
      setJoinError(err.message || "Impossible de rejoindre ce duel.");
    } finally {
      setIsJoining(false);
    }
  };

  // Toggle ready status
  const handleToggleReady = () => {
    if (!duelRoom || !playerRole || !activeDuelId) return;
    const nextReady = !myPlayer?.ready;
    setPlayerReadyStatus(activeDuelId, playerRole, nextReady);

    // If opponent is also ready (or bot ready), launch countdown!
    if (nextReady && opponentPlayer?.ready) {
      startDuelCountdown(activeDuelId);
    }
  };

  // Rematch handler
  const handleRematch = () => {
    if (!duelRoom || !activeDuelId) return;
    rematchDuelRoom(activeDuelId, duelRoom.category, layout, Boolean(duelRoom.isBot));
  };

  // Leave room handler
  const handleLeaveRoom = () => {
    if (activeDuelId && playerRole) {
      leaveDuelRoom(activeDuelId, playerRole);
    }
    setActiveDuelId(null);
    setDuelRoom(null);
    setUserInput('');
    setInputErrors(0);
    setSyncedCountdown(null);
  };

  // Copy code to clipboard & open share modal
  const handleCopyCode = async () => {
    if (!duelRoom) return;
    playKeyClick('c');
    const success = await copyToClipboard(duelRoom.code);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
    setShowShareModal(true);
  };

  // Calculate lead margin in characters & words
  const leadStats = useMemo(() => {
    if (!myPlayer || !opponentPlayer) return null;
    const diff = (myPlayer.cursorIndex || 0) - (opponentPlayer.cursorIndex || 0);
    const wordsDiff = Math.round(Math.abs(diff) / 5);
    return {
      diff,
      wordsDiff,
      isAhead: diff > 0,
      isTied: diff === 0
    };
  }, [myPlayer?.cursorIndex, opponentPlayer?.cursorIndex]);

  // Current live accuracy calculation
  const currentAccuracy = useMemo(() => {
    const totalKeystrokes = userInput.length + inputErrors;
    if (totalKeystrokes === 0) return 100;
    return Math.max(0, Math.round((userInput.length / totalKeystrokes) * 100));
  }, [userInput.length, inputErrors]);

  // Live WPM calculation
  const currentWpm = useMemo(() => {
    const startMs = duelRoom?.startTime || duelRoom?.raceStartsAt || raceStartTime;
    if (!startMs || userInput.length === 0) return 0;
    const mins = Math.max(0.01, (Date.now() - startMs) / 60000);
    return Math.round((userInput.length / 5) / mins);
  }, [userInput.length, raceStartTime, elapsedSeconds, duelRoom?.startTime, duelRoom?.raceStartsAt]);

  // =========================================================================
  // VIEW 1: LOBBY SCREEN (Not in a room)
  // =========================================================================
  if (!duelRoom) {
    return (
      <div className="flex flex-col gap-8">
        {/* Banner Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/70 via-slate-900/80 to-purple-950/60 border border-purple-500/20 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-4">
                <Swords size={14} className="animate-pulse" />
                Arène Compétitive 1v1
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                Duel <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400">Temps Réel</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Affrontez un adversaire en direct sur un texte strictement identique. 
                Visualisez chaque frappe, accélérez sur les lignes droites et franchissez la ligne d'arrivée en tête !
              </p>
            </div>

            {/* Quick stats / Profile chip */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                {currentPlayer.photo ? (
                  <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  currentPlayer.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Votre profil pilote</span>
                <span className="text-sm font-black text-white">{currentPlayer.name}</span>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-amber-400 font-bold">
                  <span>Disposition : {layout.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error message alert */}
        {joinError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm font-medium animate-shake">
            <AlertCircle size={18} className="shrink-0" />
            <span>{joinError}</span>
          </div>
        )}

        {/* Main Grid: Create Room / Join Room / Bot Rival */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Create a Duel */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                  <Swords size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Créer un Salon</h3>
                  <p className="text-xs text-slate-400">Générez un code et invitez un ami</p>
                </div>
              </div>

              {/* Text Category Selection */}
              <div className="flex flex-col gap-2 mt-6">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Type de texte :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'sprint', label: '⚡ Sprint Court', desc: '~120 car.' },
                    { key: 'standard', label: '🏎️ Course Standard', desc: '~220 car.' },
                    { key: 'literary', label: '📚 Littéraire', desc: '~180 car.' },
                    { key: 'tech', label: '💻 Code & Tech', desc: '~150 car.' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key as DuelCategory)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                        selectedCategory === cat.key
                          ? "bg-amber-500/15 border-amber-400/60 text-white shadow-md shadow-amber-500/10"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
                      )}
                    >
                      <span className="block text-xs font-black">{cat.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCreateDuel(false)}
              disabled={isCreating}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap size={16} />
              <span>{isCreating ? 'Création en cours...' : 'Ouvrir le Salon 1v1'}</span>
            </button>
          </div>

          {/* Card 2: Join by Room Code */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                  <Radio size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Rejoindre un Duel</h3>
                  <p className="text-xs text-slate-400">Entrez le code à 6 caractères</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Code du salon :
                </label>
                <input
                  type="text"
                  placeholder="EX: DUEL-42"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinDuel(joinCodeInput);
                  }}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-white/10 text-white font-mono font-bold text-center tracking-widest text-lg uppercase focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                />
                <p className="text-[11px] text-slate-500">
                  Demandez le code à votre adversaire pour synchroniser la course.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleJoinDuel(joinCodeInput)}
              disabled={isJoining || !joinCodeInput.trim()}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Users size={16} />
              <span>{isJoining ? 'Connexion au salon...' : 'Rejoindre la Course'}</span>
            </button>
          </div>

          {/* Card 3: Instant AI Ghost Rival */}
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Défi Rival IA</h3>
                  <p className="text-xs text-slate-400">Course immédiate contre un fantôme calibré</p>
                </div>
              </div>

              {/* Bot difficulty selector */}
              <div className="flex flex-col gap-2 mt-6">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Niveau du rival :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BOT_PROFILES.map((b) => (
                    <button
                      key={b.difficulty}
                      type="button"
                      onClick={() => setBotDifficulty(b.difficulty)}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5",
                        botDifficulty === b.difficulty
                          ? "bg-purple-500/20 border-purple-400 text-white shadow-sm"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20"
                      )}
                    >
                      <span className="text-lg">{b.avatar}</span>
                      <div className="overflow-hidden">
                        <span className="block text-[11px] font-bold truncate">{b.name.split(' ')[0]}</span>
                        <span className="text-[10px] text-purple-300 font-mono font-bold">{b.wpm} WPM</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCreateDuel(true)}
              disabled={isCreating}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>Défier le Fantôme ({BOT_PROFILES.find(b => b.difficulty === botDifficulty)?.wpm} WPM)</span>
            </button>
          </div>
        </div>

        {/* Public Waiting Duels List */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  Salons Publics en Attente ({openDuels.length})
                </h3>
                <p className="text-xs text-slate-400">Rejoignez un joueur attendant un défi en 1 clic</p>
              </div>
            </div>
          </div>

          {openDuels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openDuels.map((duel) => (
                <div
                  key={duel.id}
                  className="p-5 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                        {duel.player1.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{duel.player1.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Code : {duel.code}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      En attente
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-300 block">{duel.textTitle}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{duel.textContent}</span>
                  </div>

                  <button
                    onClick={() => handleJoinDuel(duel.code)}
                    disabled={isJoining}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <span>Défier ce joueur</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col items-center gap-2">
              <Users size={28} className="text-slate-500" />
              <p className="text-sm font-bold text-slate-300">Aucun salon public en attente</p>
              <p className="text-xs text-slate-500 max-w-md">
                Créez un salon et transmettez le code à un ami, ou lancez un défi instantané contre le Rival IA.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DUEL ARENA (Waiting / Ready / Starting / Racing / Finished)
  // =========================================================================
  return (
    <div className="flex flex-col gap-8 relative">
      {/* Top Navigation / Room Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/70 border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
            <Swords size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">
                Salon 1v1
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-black text-xs transition-all cursor-pointer shadow-sm group"
                title="Cliquer pour copier et partager le code"
              >
                <span>{duelRoom.code}</span>
                <Copy size={12} className="group-hover:scale-110 transition-transform opacity-75" />
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                title="Ouvrir les options de partage"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                <span>{copiedCode ? 'Copié !' : 'Partager'}</span>
              </button>
            </div>
            <span className="text-xs text-slate-400">
              Texte : <strong className="text-slate-200">{duelRoom.textTitle}</strong> ({duelRoom.textContent.length} car.)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {duelRoom.status === 'in_progress' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs font-bold text-white">
              <Clock size={14} className="text-amber-400" />
              <span>{elapsedSeconds}s</span>
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Quitter</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MATCHUP VERSUS LOBBY (When waiting or ready) */}
      {/* ------------------------------------------------------------- */}
      {(duelRoom.status === 'waiting' || duelRoom.status === 'ready') && (
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-8">
          <div className="text-center max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Préparation de la Course
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Partagez le code <strong className="text-amber-400 font-mono">{duelRoom.code}</strong>. Lorsque les deux joueurs sont prêts, le compte à rebours se déclenche !
            </p>
          </div>

          {/* Versus Matchup Display */}
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-5 items-center gap-6">
            {/* Player 1 Card */}
            <div className={cn(
              "md:col-span-2 p-6 rounded-3xl border transition-all flex flex-col items-center text-center gap-3",
              duelRoom.player1.ready 
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                : "bg-slate-950/70 border-white/10"
            )}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-2xl font-black shadow-md">
                {duelRoom.player1.photo ? (
                  <img src={duelRoom.player1.photo} alt={duelRoom.player1.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  duelRoom.player1.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <span className="text-base font-black text-white block">{duelRoom.player1.name}</span>
                <span className="text-xs text-slate-500">Hôte du duel</span>
              </div>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
                duelRoom.player1.ready 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                  : "bg-slate-800 text-slate-400 border border-white/5"
              )}>
                {duelRoom.player1.ready ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                <span>{duelRoom.player1.ready ? 'Prêt au départ' : 'En préparation...'}</span>
              </div>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-rose-500/20 animate-pulse">
                VS
              </div>
            </div>

            {/* Player 2 Card */}
            <div className={cn(
              "md:col-span-2 p-6 rounded-3xl border transition-all flex flex-col items-center text-center gap-3",
              duelRoom.player2?.ready 
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                : duelRoom.player2 
                ? "bg-slate-950/70 border-white/10"
                : "bg-slate-950/30 border-dashed border-white/10"
            )}>
              {duelRoom.player2 ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-md">
                    {duelRoom.isBot ? (
                      <span className="text-3xl">🤖</span>
                    ) : duelRoom.player2.photo ? (
                      <img src={duelRoom.player2.photo} alt={duelRoom.player2.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      duelRoom.player2.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="text-base font-black text-white block">{duelRoom.player2.name}</span>
                    <span className="text-xs text-slate-500">
                      {duelRoom.isBot ? `IA (${duelRoom.botTargetWpm} WPM)` : 'Adversaire'}
                    </span>
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold",
                    duelRoom.player2.ready 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                      : "bg-slate-800 text-slate-400 border border-white/5"
                  )}>
                    {duelRoom.player2.ready ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                    <span>{duelRoom.player2.ready ? 'Prêt au départ' : 'En préparation...'}</span>
                  </div>
                </>
              ) : (
                <div className="py-4 flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                      <Users size={28} className="animate-pulse" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-base font-black text-white block">En attente d'un adversaire...</span>
                    <span className="text-xs text-slate-400">Invitez un ami à rejoindre votre salon</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 group"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={16} className="text-slate-950 animate-bounce" />
                        <span>Code {duelRoom.code} copié ! Options...</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} className="group-hover:rotate-12 transition-transform" />
                        <span>Partager le code ({duelRoom.code})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Player Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            {myPlayer && duelRoom.player2 && (
              <button
                onClick={handleToggleReady}
                className={cn(
                  "px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2",
                  myPlayer.ready
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20"
                )}
              >
                {myPlayer.ready ? (
                  <>
                    <Clock size={18} />
                    <span>Annuler mon statut Prêt</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Je suis Prêt !</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* F1 SYNCHRONIZED STARTING LIGHTS HUD (When Starting) */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {duelRoom.status === 'starting' && syncedCountdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-slate-900/90 border-2 border-amber-500/40 rounded-[2rem] p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center gap-5 text-center relative overflow-hidden"
          >
            {/* Ambient track starting glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 pointer-events-none" />

            {/* Formula 1 Starting Lights Pods */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 bg-slate-950 px-6 py-3.5 rounded-2xl border border-white/10 shadow-inner">
              {/* Pod 1 */}
              <div className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                syncedCountdown === 0
                  ? "bg-emerald-500 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.95)] scale-110"
                  : syncedCountdown <= 3
                  ? "bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.9)] scale-105"
                  : "bg-slate-900 border-slate-800 opacity-30"
              )}>
                <span className="w-3 h-3 rounded-full bg-white/80" />
              </div>

              {/* Pod 2 */}
              <div className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                syncedCountdown === 0
                  ? "bg-emerald-500 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.95)] scale-110"
                  : syncedCountdown <= 2
                  ? "bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.9)] scale-105"
                  : "bg-slate-900 border-slate-800 opacity-30"
              )}>
                <span className="w-3 h-3 rounded-full bg-white/80" />
              </div>

              {/* Pod 3 */}
              <div className={cn(
                "w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                syncedCountdown === 0
                  ? "bg-emerald-500 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.95)] scale-110"
                  : syncedCountdown <= 1
                  ? "bg-amber-500 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.9)] scale-105"
                  : "bg-slate-900 border-slate-800 opacity-30"
              )}>
                <span className="w-3 h-3 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Big Countdown Number & Synced Status Text */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "text-6xl sm:text-8xl font-black tracking-tight font-mono transition-transform duration-150",
                syncedCountdown === 0
                  ? "text-emerald-400 scale-110 drop-shadow-[0_0_30px_rgba(52,211,153,0.9)] animate-pulse"
                  : "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              )}>
                {syncedCountdown === 0 ? 'PARTEZ !' : syncedCountdown}
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest mt-1">
                {syncedCountdown === 0
                  ? '🚀 COURSE LANCÉE ! TAPEZ À PLEINE VITESSE !'
                  : syncedCountdown === 1
                  ? '⚡ ATTENTION... DÉPART SYNCHRONISÉ IMMINENT !'
                  : '🎯 CONCENTRATION MAXIMALE... PRÉPAREZ VOS DOIGTS !'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE RACE TRACK & LIVE COMPARISON (Starting, In Progress or Finished) */}
      {/* ------------------------------------------------------------- */}
      {(duelRoom.status === 'starting' || duelRoom.status === 'in_progress' || duelRoom.status === 'finished') && (
        <div className="flex flex-col gap-6">
          {/* Race Track Header */}
          <div className="bg-slate-900/70 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-xl flex flex-col gap-6 shadow-xl relative overflow-hidden">
            {/* Ambient track lighting */}
            <div className="absolute top-0 left-1/3 w-96 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-amber-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-white">
                  Piste de Course en Direct
                </h4>
              </div>

              {/* Lead margin indicator */}
              {leadStats && duelRoom.status === 'in_progress' && (
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse",
                  leadStats.isAhead
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : leadStats.isTied
                    ? "bg-slate-800 text-slate-300 border border-white/10"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                )}>
                  {leadStats.isAhead ? (
                    <>
                      <Flame size={12} className="fill-emerald-400" />
                      <span>Vous menez de {leadStats.diff} car. (~{leadStats.wordsDiff} mots)</span>
                    </>
                  ) : leadStats.isTied ? (
                    <span>Égalité parfaite !</span>
                  ) : (
                    <>
                      <AlertCircle size={12} />
                      <span>Adversaire en tête de {Math.abs(leadStats.diff)} car. (~{leadStats.wordsDiff} mots)</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Lanes */}
            <div className="flex flex-col gap-4">
              {/* Lane 1: You */}
              <div className="relative p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-white font-black">{myPlayer?.name} (Vous)</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-amber-400">{myPlayer?.wpm || currentWpm} WPM</span>
                    <span className="text-emerald-400">{myPlayer?.accuracy || currentAccuracy}%</span>
                    <span className="text-white font-bold">{myPlayer?.progress || 0}%</span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(2, myPlayer?.progress || 0))}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              {/* Lane 2: Opponent */}
              <div className="relative p-3 rounded-2xl bg-slate-950/80 border border-purple-500/30 shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="text-slate-300 font-black">
                      {opponentPlayer?.name || 'Adversaire'}
                      {duelRoom.isBot && <span className="ml-1 text-[10px] text-purple-400 font-mono">(IA)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-purple-400">{opponentPlayer?.wpm || 0} WPM</span>
                    <span className="text-emerald-400">{opponentPlayer?.accuracy || 100}%</span>
                    <span className="text-white font-bold">{opponentPlayer?.progress || 0}%</span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(2, opponentPlayer?.progress || 0))}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* ACTIVE TYPING ZONE (When Starting or In Progress) */}
          {/* ------------------------------------------------------------- */}
          {(duelRoom.status === 'in_progress' || duelRoom.status === 'starting') && (
            <div className="flex flex-col gap-4">
              {/* Top View Mode Switcher & Sync Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                    <Swords size={18} className="text-amber-400" />
                    <span>Arène 1v1 Synchronisée</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Sync Direct 70ms</span>
                  </div>
                </div>

                {/* Switcher: Dual screen side-by-side vs Solo screen */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-2xl border border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setDuelViewMode('split')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                      duelViewMode === 'split' 
                        ? "bg-amber-500 text-slate-950 shadow-md font-black" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    title="Afficher les écrans de vous et de votre adversaire côte à côte en direct"
                  >
                    <Columns2 size={14} />
                    <span>Écrans Jumelés 1v1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuelViewMode('single')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                      duelViewMode === 'single' 
                        ? "bg-amber-500 text-slate-950 shadow-md font-black" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                    title="Agrandir votre écran de frappe personnel"
                  >
                    <Maximize2 size={14} />
                    <span>Grand Écran Solo</span>
                  </button>
                </div>
              </div>

              {/* Status banner on starting grid */}
              {duelRoom.status === 'starting' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold">
                  <div className="flex items-center gap-2 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Grille de départ : lecture anticipée du texte autorisée</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Frappe débloquée à la milliseconde près au top départ
                  </div>
                </div>
              )}

              {/* Grid with Dual Screens */}
              <div className={cn(
                "grid gap-6 transition-all",
                duelViewMode === 'split' ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
              )}>
                {/* --------------------------------------------------------- */}
                {/* SCREEN 1: YOUR TYPING SCREEN (PILOT 1 - VOUS) */}
                {/* --------------------------------------------------------- */}
                <div 
                  onClick={() => {
                    if (isRaceActive) hiddenInputRef.current?.focus();
                  }}
                  className={cn(
                    "bg-slate-900/70 border rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl transition-all relative flex flex-col justify-between",
                    isRaceActive ? "cursor-text" : "cursor-default select-none",
                    isErrorState 
                      ? "border-rose-500/60 shadow-rose-500/10 animate-shake ring-2 ring-rose-500/30" 
                      : duelRoom.status === 'starting'
                      ? "border-amber-500/30 ring-1 ring-amber-500/20"
                      : "border-white/10 hover:border-amber-500/40"
                  )}
                >
                  {/* Hidden input for keystrokes */}
                  <input
                    ref={hiddenInputRef}
                    type="text"
                    autoFocus={isRaceActive}
                    disabled={!isRaceActive}
                    value={userInput}
                    onChange={handleInputChange}
                    className="absolute opacity-0 pointer-events-none"
                  />

                  {/* Header of Player Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md ring-2 ring-amber-400/40 shrink-0">
                        {currentPlayer.photo ? (
                          <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          currentPlayer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{currentPlayer.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                            Vous
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isRaceActive ? "Clavier actif • Tapez le texte" : "Sur la ligne de départ"}
                        </span>
                      </div>
                    </div>

                    {/* Live Telemetry Chips */}
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-mono text-xs font-bold">
                        <Gauge size={13} className="text-amber-400" />
                        <span>{currentWpm} WPM</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-mono text-xs font-bold">
                        <Target size={13} className="text-emerald-400" />
                        <span>{currentAccuracy}%</span>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 font-mono text-xs font-bold">
                        <span>{myPlayer?.progress || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Text Display with Word Tokens & Visible Space Capsules */}
                  <div className="text-lg sm:text-xl md:text-2xl font-mono leading-relaxed select-none flex flex-wrap items-center gap-y-3 min-h-[140px]">
                    {wordTokens.map((token) => (
                      <span 
                        key={token.id} 
                        className={cn(
                          "inline-flex items-center whitespace-nowrap transition-all",
                          token.isSentenceEnd && "mr-3"
                        )}
                      >
                        {/* Word characters */}
                        {token.chars.map(({ char, index }) => {
                          const isTyped = index < userInput.length;
                          const isCurrent = index === userInput.length;
                          const isOpponentCursor = opponentPlayer && index === opponentPlayer.cursorIndex;

                          let charClass = "text-slate-400";
                          if (isTyped) {
                            charClass = "text-emerald-400 font-semibold";
                          }

                          return (
                            <span
                              key={index}
                              className={cn(
                                "relative transition-colors duration-75 inline-block",
                                charClass,
                                isCurrent && "text-white font-black bg-amber-500/25 rounded px-1 ring-2 ring-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                              )}
                            >
                              {/* Opponent Ghost Pointer Marker on your board */}
                              {isOpponentCursor && (
                                <span 
                                  className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-tight shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-20 flex items-center gap-0.5"
                                  title={`Position de ${opponentPlayer.name}`}
                                >
                                  <span>Rival</span>
                                </span>
                              )}
                              {char}
                            </span>
                          );
                        })}

                        {/* Trailing Space with Visual Indicator */}
                        {token.trailingSpace && (() => {
                          const spaceIndex = token.trailingSpace.index;
                          const isSpaceTyped = spaceIndex < userInput.length;
                          const isSpaceCurrent = spaceIndex === userInput.length;
                          const isOpponentAtSpace = opponentPlayer && spaceIndex === opponentPlayer.cursorIndex;

                          return (
                            <span key={spaceIndex} className="relative inline-flex items-center mx-1">
                              {/* Opponent Ghost Pointer Marker on space */}
                              {isOpponentAtSpace && (
                                <span 
                                  className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-tight shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-20 flex items-center gap-0.5"
                                  title={`Position de ${opponentPlayer.name}`}
                                >
                                  <span>Rival</span>
                                </span>
                              )}

                              {isSpaceCurrent ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/30 border border-amber-400 text-amber-200 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.6)] animate-pulse ring-1 ring-amber-400/50">
                                  ␣ ESPACE
                                </span>
                              ) : isSpaceTyped ? (
                                <span className="text-emerald-500/30 w-[1.2ch] text-center inline-block font-mono font-bold">
                                  ·
                                </span>
                              ) : (
                                <span className="text-slate-600 font-bold w-[1.2ch] text-center inline-block font-mono">
                                  ·
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </span>
                    ))}
                  </div>

                  {/* Real-time typing telemetry bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-5 border-t border-white/10 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={14} className={inputErrors > 0 ? "text-rose-400" : "text-slate-500"} />
                        <strong className="text-white text-sm font-mono">{inputErrors}</strong> Faute{inputErrors > 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-mono">
                        {userInput.length} / {duelRoom.textContent.length} car.
                      </span>
                    </div>

                    <div className="text-[11px] text-amber-400/80 font-medium">
                      Point (·) = espace requis • Capsule ␣ ESPACE active
                    </div>
                  </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* SCREEN 2: OPPONENT TYPING SCREEN (PILOT 2 - ADVERSAIRE) */}
                {/* --------------------------------------------------------- */}
                {opponentPlayer && (
                  <div 
                    onClick={() => {
                      if (isRaceActive) hiddenInputRef.current?.focus();
                    }}
                    className={cn(
                      "bg-slate-900/70 border rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl transition-all relative flex flex-col justify-between border-purple-500/30 hover:border-purple-500/50",
                      isRaceActive ? "cursor-text" : "cursor-default select-none"
                    )}
                  >
                    {/* Header of Opponent Card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-purple-400/40 shrink-0">
                          {opponentPlayer.photo ? (
                            <img src={opponentPlayer.photo} alt={opponentPlayer.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            opponentPlayer.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{opponentPlayer.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                              {duelRoom.isBot ? "Rival IA" : "Adversaire"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                            <span>Frappe en direct synchronisée</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Telemetry Chips for Opponent */}
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 font-mono text-xs font-bold">
                          <Gauge size={13} className="text-purple-400" />
                          <span>{opponentPlayer.wpm || 0} WPM</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 flex items-center gap-1.5 font-mono text-xs font-bold">
                          <Target size={13} className="text-pink-400" />
                          <span>{opponentPlayer.accuracy || 100}%</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 font-mono text-xs font-bold">
                          <span>{opponentPlayer.progress || 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Text Display for Opponent with Identical Word Tokens & Space Capsules */}
                    <div className="text-lg sm:text-xl md:text-2xl font-mono leading-relaxed select-none flex flex-wrap items-center gap-y-3 min-h-[140px]">
                      {wordTokens.map((token) => (
                        <span 
                          key={token.id} 
                          className={cn(
                            "inline-flex items-center whitespace-nowrap transition-all",
                            token.isSentenceEnd && "mr-3"
                          )}
                        >
                          {/* Word characters */}
                          {token.chars.map(({ char, index }) => {
                            const isTypedByOpponent = index < (opponentPlayer.cursorIndex || 0);
                            const isOpponentCurrent = index === opponentPlayer.cursorIndex;

                            let charClass = "text-slate-500";
                            if (isTypedByOpponent) {
                              charClass = "text-purple-300 font-semibold";
                            }

                            return (
                              <span
                                key={index}
                                className={cn(
                                  "relative transition-colors duration-75 inline-block",
                                  charClass,
                                  isOpponentCurrent && "text-white font-black bg-purple-500/30 rounded px-1 ring-2 ring-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                )}
                              >
                                {char}
                              </span>
                            );
                          })}

                          {/* Trailing Space with Visual Indicator for Opponent */}
                          {token.trailingSpace && (() => {
                            const spaceIndex = token.trailingSpace.index;
                            const isSpaceTypedByOpponent = spaceIndex < (opponentPlayer.cursorIndex || 0);
                            const isOpponentOnSpace = spaceIndex === opponentPlayer.cursorIndex;

                            return (
                              <span key={spaceIndex} className="relative inline-flex items-center mx-1">
                                {isOpponentOnSpace ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/30 border border-purple-400 text-purple-200 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(168,85,247,0.6)] animate-pulse ring-1 ring-purple-400/50">
                                    ␣ ESPACE
                                  </span>
                                ) : isSpaceTypedByOpponent ? (
                                  <span className="text-purple-400/40 w-[1.2ch] text-center inline-block font-mono font-bold">
                                    ·
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-bold w-[1.2ch] text-center inline-block font-mono">
                                    ·
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </span>
                      ))}
                    </div>

                    {/* Opponent Card Footer with real-time status */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-5 border-t border-white/10 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono">
                          {opponentPlayer.cursorIndex || 0} / {duelRoom.textContent.length} car. tapés
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-mono">
                          {opponentPlayer.errors || 0} faute{opponentPlayer.errors && opponentPlayer.errors > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="text-[11px] text-purple-300/80 font-medium">
                        {opponentPlayer.finished ? "Ligne d'arrivée franchie !" : "Frappe en cours..."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VICTORY & PODIUM SCREEN (When Finished) */}
          {/* ------------------------------------------------------------- */}
          {duelRoom.status === 'finished' && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900/80 border border-amber-500/30 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-8 relative overflow-hidden"
            >
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Victory Crown & Header */}
              <div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 mx-auto mb-4 animate-bounce">
                  <Crown size={40} />
                </div>

                <h3 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                  {duelRoom.winnerId === currentPlayer.id ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
                      Victoire Éclatante !
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      Course Terminée !
                    </span>
                  )}
                </h3>

                <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-md mx-auto">
                  {duelRoom.winnerId === currentPlayer.id
                    ? "Félicitations ! Votre vitesse et votre précision ont fait la différence sur la ligne d'arrivée."
                    : `${opponentPlayer?.name || 'Votre adversaire'} a franchi la ligne d'arrivée en premier. Prenez votre revanche !`}
                </p>
              </div>

              {/* Side-by-side Comparative Table */}
              <div className="w-full max-w-2xl bg-slate-950/80 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/10 text-xs font-black uppercase tracking-wider text-slate-400">
                  <span className="text-left text-amber-400">{myPlayer?.name} (Vous)</span>
                  <span className="text-center">Indicateur</span>
                  <span className="text-right text-purple-400">{opponentPlayer?.name || 'Adversaire'}</span>
                </div>

                <div className="flex flex-col divide-y divide-white/5 text-sm py-2">
                  {/* WPM Row */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className={cn(
                      "text-left font-mono font-black text-lg",
                      (myPlayer?.wpm || 0) >= (opponentPlayer?.wpm || 0) ? "text-amber-400" : "text-white"
                    )}>
                      {myPlayer?.wpm || 0} WPM
                    </span>
                    <span className="text-center text-xs text-slate-400 font-bold uppercase">Vitesse Moyenne</span>
                    <span className={cn(
                      "text-right font-mono font-black text-lg",
                      (opponentPlayer?.wpm || 0) >= (myPlayer?.wpm || 0) ? "text-purple-400" : "text-white"
                    )}>
                      {opponentPlayer?.wpm || 0} WPM
                    </span>
                  </div>

                  {/* Accuracy Row */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className="text-left font-mono font-bold text-emerald-400">
                      {myPlayer?.accuracy || 100}%
                    </span>
                    <span className="text-center text-xs text-slate-400 font-bold uppercase">Précision</span>
                    <span className="text-right font-mono font-bold text-emerald-400">
                      {opponentPlayer?.accuracy || 100}%
                    </span>
                  </div>

                  {/* Finish Time Row */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className="text-left font-mono font-bold text-slate-300">
                      {myPlayer?.finishTime ? `${myPlayer.finishTime}s` : 'En cours'}
                    </span>
                    <span className="text-center text-xs text-slate-400 font-bold uppercase">Temps de course</span>
                    <span className="text-right font-mono font-bold text-slate-300">
                      {opponentPlayer?.finishTime ? `${opponentPlayer.finishTime}s` : 'En cours'}
                    </span>
                  </div>

                  {/* Errors Row */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className="text-left font-mono font-bold text-rose-400">
                      {myPlayer?.errors || 0}
                    </span>
                    <span className="text-center text-xs text-slate-400 font-bold uppercase">Erreurs</span>
                    <span className="text-right font-mono font-bold text-rose-400">
                      {opponentPlayer?.errors || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rematch & Next actions */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleRematch}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>Revanche Immédiate (Nouveau texte)</span>
                </button>

                <button
                  onClick={handleLeaveRoom}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Retour au Salon</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
      {/* Duel Share & Invite Modal */}
      {duelRoom && (
        <DuelShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          roomCode={duelRoom.code}
          textTitle={duelRoom.textTitle}
        />
      )}
    </div>
  );
};
