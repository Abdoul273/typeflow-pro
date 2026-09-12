import confetti from 'canvas-confetti';

/**
 * Play a celebratory victory fanfare using Web Audio API
 */
export const playVictoryFanfare = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.12, duration: 0.15 }, // E5
      { freq: 783.99, time: 0.24, duration: 0.18 }, // G5
      { freq: 1046.50, time: 0.40, duration: 0.45 } // C6 (triumphant hold)
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      // Volume envelope
      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });

    // Close context after fanfare finishes
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch (e) {
    // AudioContext blocked or not supported
    console.warn('AudioContext not allowed or supported', e);
  }
};

/**
 * Triggers a multi-stage celebratory confetti explosion
 */
export const triggerRecordConfetti = () => {
  try {
    // Stage 1: Central burst of stars and shapes
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#38bdf8', '#818cf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'],
      shapes: ['square', 'circle'],
      scalar: 1.2,
      zIndex: 9999,
      disableForReducedMotion: true
    });

    // Stage 2: Left cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.75 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#6366f1', '#10b981'],
        zIndex: 9999,
        disableForReducedMotion: true
      });
    }, 150);

    // Stage 3: Right cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.75 },
        colors: ['#38bdf8', '#3b82f6', '#10b981', '#fbbf24', '#a855f7'],
        zIndex: 9999,
        disableForReducedMotion: true
      });
    }, 300);

    // Stage 4: Gentle falling golden shower
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 120,
        origin: { y: 0.3 },
        colors: ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'],
        gravity: 0.8,
        scalar: 0.9,
        ticks: 200,
        zIndex: 9999,
        disableForReducedMotion: true
      });
    }, 550);
  } catch (err) {
    console.warn('Confetti error:', err);
  }
};
