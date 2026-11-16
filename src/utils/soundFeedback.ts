let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playScanBeep(type: 'success' | 'error', muted = false) {
  if (muted) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.setValueAtTime(1560, now + 0.055);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.setValueAtTime(190, now + 0.12);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.29);
    }
  } catch {
    // Ignore audio playback errors when browser blocks autoplay audio
  }
}
