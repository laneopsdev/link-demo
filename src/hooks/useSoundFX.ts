import { useRef, useCallback } from "react";

function getAudioContext(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ref.current) {
    try {
      ref.current = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ref.current.state === "suspended") {
    ref.current.resume();
  }
  return ref.current;
}

// Premium 3-layer activation — rising arpeggio with sparkle shimmer
function triggerStartSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Layer 1 — warm rising fundamental (sine)
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o1.type = "sine";
  o1.frequency.setValueAtTime(220, now);
  o1.frequency.exponentialRampToValueAtTime(880, now + 0.22);
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(0.2, now + 0.04);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  o1.start(now); o1.stop(now + 0.4);

  // Layer 2 — a perfect fifth up (sparkle)
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = "triangle";
  o2.frequency.setValueAtTime(330, now + 0.06);
  o2.frequency.exponentialRampToValueAtTime(1320, now + 0.26);
  g2.gain.setValueAtTime(0, now + 0.06);
  g2.gain.linearRampToValueAtTime(0.09, now + 0.10);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  o2.start(now + 0.06); o2.stop(now + 0.36);

  // Layer 3 — high air shimmer (delayed, fast decay)
  const o3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  o3.connect(g3); g3.connect(ctx.destination);
  o3.type = "sine";
  o3.frequency.setValueAtTime(2600, now + 0.14);
  o3.frequency.exponentialRampToValueAtTime(3800, now + 0.28);
  g3.gain.setValueAtTime(0, now + 0.14);
  g3.gain.linearRampToValueAtTime(0.04, now + 0.17);
  g3.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
  o3.start(now + 0.14); o3.stop(now + 0.31);

  // Layer 4 — punchy sub kick for weight
  const o4 = ctx.createOscillator();
  const g4 = ctx.createGain();
  o4.connect(g4); g4.connect(ctx.destination);
  o4.type = "sine";
  o4.frequency.setValueAtTime(100, now);
  o4.frequency.exponentialRampToValueAtTime(48, now + 0.1);
  g4.gain.setValueAtTime(0.28, now);
  g4.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  o4.start(now); o4.stop(now + 0.13);
}

// Premium stop — warm descending resolve with soft shimmer tail
function triggerStopSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Layer 1 — warm descend (sine)
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.connect(g1); g1.connect(ctx.destination);
  o1.type = "sine";
  o1.frequency.setValueAtTime(760, now);
  o1.frequency.exponentialRampToValueAtTime(180, now + 0.3);
  g1.gain.setValueAtTime(0.15, now);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  o1.start(now); o1.stop(now + 0.35);

  // Layer 2 — upper descend for shimmer
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.connect(g2); g2.connect(ctx.destination);
  o2.type = "triangle";
  o2.frequency.setValueAtTime(1520, now);
  o2.frequency.exponentialRampToValueAtTime(360, now + 0.25);
  g2.gain.setValueAtTime(0.06, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  o2.start(now); o2.stop(now + 0.29);

  // Layer 3 — soft settling note (slow fade)
  const o3 = ctx.createOscillator();
  const g3 = ctx.createGain();
  o3.connect(g3); g3.connect(ctx.destination);
  o3.type = "sine";
  o3.frequency.setValueAtTime(260, now + 0.08);
  o3.frequency.exponentialRampToValueAtTime(200, now + 0.4);
  g3.gain.setValueAtTime(0, now + 0.08);
  g3.gain.linearRampToValueAtTime(0.08, now + 0.14);
  g3.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
  o3.start(now + 0.08); o3.stop(now + 0.45);
}

export interface SoundFX {
  playStart: () => void;
  playStop: () => void;
}

export function useSoundFX(): SoundFX {
  const ctxRef = useRef<AudioContext | null>(null);

  const playStart = useCallback(() => {
    const ctx = getAudioContext(ctxRef);
    if (ctx) triggerStartSound(ctx);
  }, []);

  const playStop = useCallback(() => {
    const ctx = getAudioContext(ctxRef);
    if (ctx) triggerStopSound(ctx);
  }, []);

  return { playStart, playStop };
}