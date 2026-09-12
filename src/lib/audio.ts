/**
 * TypeFlow Ultra-Low-Latency Audio Rhythm Engine
 * Provides subtle, non-intrusive acoustic feedback for keystrokes, spacebar rhythm,
 * and warm dampened error cues to enhance typing cadence.
 */

export type SoundProfile = 'soft-tactile' | 'mechanical' | 'typewriter' | 'bubble';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  profile: SoundProfile;
  spaceAccent: boolean;
  pitchVariation: boolean;
  streakChimes: boolean;
}

const STORAGE_KEY = 'typeflow_sound_settings';

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.35,
  profile: 'soft-tactile',
  spaceAccent: true,
  pitchVariation: true,
  streakChimes: true,
};

let currentSettings: SoundSettings = { ...DEFAULT_SETTINGS };

// Load settings from localStorage
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to read sound settings:', e);
  }
}

// Listeners for setting changes
type SettingsListener = (settings: SoundSettings) => void;
const listeners: Set<SettingsListener> = new Set();

export const getSoundSettings = (): SoundSettings => ({ ...currentSettings });

export const updateSoundSettings = (updates: Partial<SoundSettings>): SoundSettings => {
  currentSettings = { ...currentSettings, ...updates };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    }
  } catch (e) {
    console.warn('Failed to save sound settings:', e);
  }
  listeners.forEach(fn => fn(currentSettings));
  return currentSettings;
};

export const subscribeSoundSettings = (listener: SettingsListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Web Audio API Context
let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    }

    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
};

// Auto-unlock audio on the very first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      });
    } else if (ctx && ctx.state === 'running') {
      isAudioUnlocked = true;
    }
  };

  window.addEventListener('keydown', unlockAudio, { capture: true, once: false });
  window.addEventListener('pointerdown', unlockAudio, { capture: true, once: false });
  window.addEventListener('touchstart', unlockAudio, { capture: true, once: false });
}

// Noise Buffer cache for crisp tactile transient clicks
let cachedNoiseBuffer: AudioBuffer | null = null;
const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (!cachedNoiseBuffer || cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.035); // 35ms of noise
    cachedNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = cachedNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Exponentially dampened noise
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
  }
  return cachedNoiseBuffer;
};

// Calculate micro-pitch variation based on key character to prevent acoustic monotony
const getPitchMultiplier = (key: string, enabled: boolean): number => {
  if (!enabled || !key) return 1.0;
  const code = key.charCodeAt(0) || 65;
  // Natural variation range: ±4%
  const variance = ((code % 9) - 4) * 0.01;
  return 1.0 + variance;
};

/**
 * Play a synthesized key press sound tailored to the current sound profile
 */
export const playKeyClick = (
  keyOrVolume?: string | number,
  options?: { streak?: number; forceProfile?: SoundProfile; forceVolume?: number }
) => {
  try {
    const settings = currentSettings;
    const isMuted = !settings.enabled || settings.volume <= 0;
    if (isMuted && !options?.forceProfile && options?.forceVolume === undefined) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const profile = options?.forceProfile || settings.profile;
    const masterVol = options?.forceVolume !== undefined ? options.forceVolume : settings.volume;
    
    // Parse key vs legacy volume argument
    const key = typeof keyOrVolume === 'string' ? keyOrVolume : '';
    const isSpace = key === ' ' || key === 'Space';
    const isBackspace = key === 'Backspace';

    const now = ctx.currentTime;
    const pitchMod = getPitchMultiplier(key, settings.pitchVariation);

    // Profile-specific sound generation
    switch (profile) {
      case 'soft-tactile': {
        // Soft, lubed mechanical switch / scissor switch (Doux & Feutré)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isSpace ? 700 : 1200, now);
        filter.Q.setValueAtTime(1.8, now);

        osc.type = 'triangle';
        const startFreq = (isSpace ? 340 : 620) * pitchMod;
        const endFreq = isSpace ? 140 : 260;
        const duration = isSpace ? 0.038 : 0.022;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        const vol = (isSpace ? 0.11 : isBackspace ? 0.06 : 0.08) * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        // Add soft noise pop for physical keycap contact
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = getNoiseBuffer(ctx);
        const noiseGain = ctx.createGain();
        const noiseVol = (isSpace ? 0.03 : 0.02) * masterVol;
        noiseGain.gain.setValueAtTime(noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        osc.connect(filter);
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + duration + 0.005);
        noiseNode.stop(now + 0.02);
        break;
      }

      case 'mechanical': {
        // Crisp tactile mechanical clicky switch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isSpace ? 1600 : 2400, now);
        filter.Q.setValueAtTime(3.5, now);

        osc.type = 'triangle';
        const startFreq = (isSpace ? 480 : 920) * pitchMod;
        const endFreq = isSpace ? 200 : 380;
        const duration = isSpace ? 0.032 : 0.02;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        const vol = (isSpace ? 0.12 : isBackspace ? 0.07 : 0.09) * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.0015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        // Crisp transient click
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = getNoiseBuffer(ctx);
        const noiseGain = ctx.createGain();
        const noiseVol = (isSpace ? 0.07 : 0.05) * masterVol;
        noiseGain.gain.setValueAtTime(noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

        osc.connect(filter);
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + duration + 0.005);
        noiseNode.stop(now + 0.015);
        break;
      }

      case 'typewriter': {
        // Vintage typewriter mechanical lever click with chassis warmth
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isSpace ? 1100 : 2100, now);
        filter.Q.setValueAtTime(4, now);

        osc.type = 'sine';
        const startFreq = (isSpace ? 520 : 1080) * pitchMod;
        const endFreq = isSpace ? 180 : 420;
        const duration = isSpace ? 0.045 : 0.028;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        const vol = (isSpace ? 0.14 : isBackspace ? 0.08 : 0.1) * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        // Metallic hammer contact
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = getNoiseBuffer(ctx);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.06 * masterVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

        osc.connect(filter);
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + duration + 0.005);
        noiseNode.stop(now + 0.02);
        break;
      }

      case 'bubble': {
        // Relaxing organic water droplet pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const startFreq = (isSpace ? 240 : 420) * pitchMod;
        const endFreq = (isSpace ? 520 : 880) * pitchMod;
        const duration = isSpace ? 0.035 : 0.022;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        const vol = (isSpace ? 0.13 : isBackspace ? 0.07 : 0.09) * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.005);
        break;
      }
    }

    // Check for streak milestone celebration (every 25 consecutive keys)
    if (options?.streak && settings.streakChimes && options.streak > 0 && options.streak % 25 === 0) {
      playStreakMilestoneChime(options.streak, masterVol);
    }
  } catch (error) {
    // Gracefully handle any browser audio glitch
  }
};

/**
 * Subtle, non-intrusive error notification.
 * Soft, warm, dampened low-frequency thud instead of harsh buzzer.
 */
export const playErrorSound = (
  _keyOrVolume?: string | number,
  options?: { forceProfile?: SoundProfile; forceVolume?: number }
) => {
  try {
    const settings = currentSettings;
    const isMuted = !settings.enabled || settings.volume <= 0;
    if (isMuted && !options?.forceProfile && options?.forceVolume === undefined) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const profile = options?.forceProfile || settings.profile;
    const masterVol = options?.forceVolume !== undefined ? options.forceVolume : settings.volume;
    const now = ctx.currentTime;

    switch (profile) {
      case 'soft-tactile': {
        // Warm dampened felt knock (135Hz -> 50Hz) with lowpass filter
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.Q.setValueAtTime(1.2, now);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(135, now);
        osc1.frequency.exponentialRampToValueAtTime(52, now + 0.065);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(190, now);
        osc2.frequency.exponentialRampToValueAtTime(70, now + 0.05);

        const vol = 0.22 * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.075);
        osc2.stop(now + 0.075);
        break;
      }

      case 'mechanical': {
        // Dry wooden block thock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(240, now);
        filter.Q.setValueAtTime(2.0, now);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.05);

        const vol = 0.24 * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'typewriter': {
        // Dry typewriter mechanical reject knock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.06);

        const vol = 0.25 * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'bubble': {
        // Deep muffled water bubble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.06);

        const vol = 0.22 * masterVol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
    }
  } catch (error) {
    console.warn('Error sound playback failed:', error);
  }
};

/**
 * Very gentle pentatonic harmonic chime on streak milestones (25, 50, 75, 100).
 * Floats delicately without breaking typing rhythm.
 */
const playStreakMilestoneChime = (streak: number, masterVol: number) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pentatonic scale based on streak level: A5 (880), B5 (988), C#6 (1108), E6 (1318)
    const pitches = [880, 988, 1108, 1318];
    const pitchIndex = Math.min(Math.floor((streak / 25) - 1), pitches.length - 1);
    const freq = pitches[pitchIndex % pitches.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const chimeVol = 0.045 * masterVol;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(chimeVol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    // Non-critical audio
  }
};

/**
 * Preview helper to test sounds in settings modal
 */
export const previewSound = (profile: SoundProfile, type: 'key' | 'space' | 'error', volume: number = 0.45) => {
  if (type === 'error') {
    playErrorSound('', { forceProfile: profile, forceVolume: volume });
  } else if (type === 'space') {
    playKeyClick(' ', { forceProfile: profile, forceVolume: volume });
  } else {
    playKeyClick('a', { forceProfile: profile, forceVolume: volume });
  }
};

/**
 * Subtle clock tick cue for urgency during the final 5 seconds of countdown
 */
export const playCountdownTick = (secondsLeft: number) => {
  try {
    if (!currentSettings.enabled || currentSettings.volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Rising urgency pitch: 5s -> 680Hz, 1s -> 920Hz
    const baseFreq = 680 + (5 - Math.max(1, secondsLeft)) * 60;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.035);

    const tickVol = 0.05 * currentSettings.volume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(tickVol, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Non-critical
  }
};

/**
 * Soft dampened chime when countdown expires
 */
export const playTimeoutSound = () => {
  try {
    if (!currentSettings.enabled || currentSettings.volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Two-tone descending chime (360Hz -> 240Hz)
    const tones = [
      { freq: 360, time: 0, dur: 0.12 },
      { freq: 240, time: 0.14, dur: 0.22 }
    ];

    tones.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      const vol = 0.12 * currentSettings.volume;
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(vol, now + time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.01);
    });
  } catch {
    // Non-critical
  }
};

/**
 * Bright, brief victory chime for beating the countdown challenge
 */
export const playChallengeSuccessSound = () => {
  try {
    if (!currentSettings.enabled || currentSettings.volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Ascending arpeggio: C5 (523), E5 (659), G5 (784), C6 (1046)
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const vol = (idx === 3 ? 0.09 : 0.06) * currentSettings.volume;
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (idx === 3 ? 0.35 : 0.18));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch {
    // Non-critical
  }
};

/**
 * Legacy beep fallback
 */
export const playBeep = (frequency: number = 440, duration: number = 0.1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.08 * currentSettings.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
};
