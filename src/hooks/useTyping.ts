/**
 * Core typing engine hook with low-latency audio sync and error tracking
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  playErrorSound, 
  playKeyClick, 
  playCountdownTick, 
  playTimeoutSound, 
  playChallengeSuccessSound 
} from '../lib/audio';

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  totalCharsTyped: number;
  startTime: number | null;
  endTime: number | null;
  cpm: number;
  errorKeys: Record<string, number>;
}

export const useTyping = (targetText: string, timeLimit: number = 0) => {
  const [userInput, setUserInput] = useState('');
  const [lastErrorKey, setLastErrorKey] = useState<string | null>(null);
  const [errorShakeTrigger, setErrorShakeTrigger] = useState<number>(0);

  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    errors: 0,
    correctChars: 0,
    totalCharsTyped: 0,
    startTime: null,
    endTime: null,
    cpm: 0,
    errorKeys: {}
  });
  const [isFinished, setIsFinished] = useState(false);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  // Timer for WPM calculation
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync refs to avoid stale closures in interval
  const timeLimitRef = useRef(timeLimit);
  useEffect(() => {
    timeLimitRef.current = timeLimit;
  }, [timeLimit]);

  const userInputRef = useRef(userInput);
  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);

  const targetTextRef = useRef(targetText);
  useEffect(() => {
    targetTextRef.current = targetText;
  }, [targetText]);

  const isTimeOutRef = useRef(isTimeOut);
  useEffect(() => {
    isTimeOutRef.current = isTimeOut;
  }, [isTimeOut]);

  const reset = useCallback(() => {
    setUserInput('');
    setIsFinished(false);
    setIsTimeOut(false);
    setIsStarted(false);
    setElapsedTime(0);
    setLastErrorKey(null);
    setErrorShakeTrigger(0);
    setStats({
      wpm: 0,
      accuracy: 100,
      errors: 0,
      correctChars: 0,
      totalCharsTyped: 0,
      startTime: null,
      endTime: null,
      cpm: 0,
      errorKeys: {}
    });
    if (timerRef.current) clearInterval(timerRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  }, []);

  const finish = useCallback(() => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeLimitRef.current > 0 && !isTimeOutRef.current) {
      playChallengeSuccessSound();
    }
    setStats(prev => ({ ...prev, endTime: Date.now() }));
  }, []);

  const handleInput = useCallback((key: string) => {
    if (isFinished) return;

    // Handle Backspace: remove last character and clear error state
    if (key === 'Backspace') {
      setUserInput(prev => {
        if (prev.length === 0) return prev;
        const nextInput = prev.slice(0, -1);
        playKeyClick('Backspace');
        return nextInput;
      });
      setLastErrorKey(null);
      return;
    }

    // Only accept single character keys
    if (key.length !== 1) return;

    // Do not accept characters past target text length
    if (userInput.length >= targetText.length) return;

    // Start timer on first keystroke
    if (!isStarted) {
      setIsStarted(true);
      setStats(prev => ({ ...prev, startTime: Date.now() }));
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const next = prev + 1;
          const currentLimit = timeLimitRef.current;

          if (currentLimit && currentLimit > 0) {
            const remaining = currentLimit - next;
            // Play acoustic tick cue during last 5 seconds
            if (remaining <= 5 && remaining > 0) {
              playCountdownTick(remaining);
            }
            // Timeout reached!
            if (remaining <= 0) {
              if (timerRef.current) clearInterval(timerRef.current);
              setIsFinished(true);
              setIsTimeOut(true);
              playTimeoutSound();

              setStats(s => {
                const minutes = Math.max(currentLimit / 60, 0.01);
                const currentInput = userInputRef.current;
                const correctCount = currentInput.split('').filter((c, i) => c === targetTextRef.current[i]).length;
                const totalTyped = s.totalCharsTyped || currentInput.length;
                return {
                  ...s,
                  endTime: Date.now(),
                  correctChars: correctCount,
                  wpm: Math.max(Math.round((correctCount / 5) / minutes), 0),
                  cpm: Math.max(Math.round(correctCount / minutes), 0),
                  accuracy: totalTyped > 0 ? Math.max(0, Math.round((correctCount / totalTyped) * 100)) : 100
                };
              });
              return currentLimit;
            }
          }
          return next;
        });
      }, 1000);
    }

    const expectedChar = targetText[userInput.length];
    const isMatch = key === expectedChar;

    if (!isMatch) {
      // 1. INSTANT AUDIO FEEDBACK: crisp, low-latency tactile error knock
      playErrorSound(key);

      // 2. VISUAL FEEDBACK: set error key for virtual keyboard and trigger shake
      setLastErrorKey(key);
      setErrorShakeTrigger(prev => prev + 1);

      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        setLastErrorKey(null);
      }, 250);

      // 3. LETTER IN RED: append character to userInput so it renders in red at that position!
      const currentInput = userInput + key;
      setUserInput(currentInput);

      // Track errors and key frequencies
      const keyName = expectedChar.toLowerCase();
      setStats(prev => {
        const newTotal = prev.totalCharsTyped + 1;
        const newErrors = prev.errors + 1;
        const correctCount = currentInput.split('').filter((c, i) => c === targetText[i]).length;
        const minutes = Math.max(elapsedTime / 60, 0.01);
        const wpm = Math.max(Math.round((correctCount / 5) / minutes), 0);
        const cpm = Math.max(Math.round(correctCount / minutes), 0);

        return {
          ...prev,
          errors: newErrors,
          totalCharsTyped: newTotal,
          correctChars: correctCount,
          accuracy: Math.max(0, Math.round((correctCount / newTotal) * 100)),
          wpm,
          cpm,
          errorKeys: {
            ...prev.errorKeys,
            [keyName]: (prev.errorKeys[keyName] || 0) + 1
          }
        };
      });

      if (currentInput.length === targetText.length) {
        finish();
      }
      return;
    }

    // MATCHING KEY
    setLastErrorKey(null);

    const currentInput = userInput + key;
    setUserInput(currentInput);

    const correctCharsCount = currentInput.split('').filter((c, i) => c === targetText[i]).length;
    playKeyClick(key, { streak: correctCharsCount });
    const minutes = Math.max(elapsedTime / 60, 0.01);
    const wpm = Math.max(Math.round((correctCharsCount / 5) / minutes), 0);
    const cpm = Math.max(Math.round(correctCharsCount / minutes), 0);

    setStats(prev => {
      const newTotal = prev.totalCharsTyped + 1;
      return {
        ...prev,
        correctChars: correctCharsCount,
        totalCharsTyped: newTotal,
        accuracy: Math.round((correctCharsCount / newTotal) * 100),
        wpm,
        cpm,
      };
    });

    if (currentInput.length === targetText.length) {
      finish();
    }
  }, [userInput, targetText, isFinished, isStarted, elapsedTime, finish]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const timeRemaining = timeLimit > 0 ? Math.max(0, timeLimit - elapsedTime) : 0;

  return {
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
  };
};
