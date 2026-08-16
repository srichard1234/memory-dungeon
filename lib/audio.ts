// Small synthesized sound effects via the Web Audio API — no audio files,
// so the game stays a single self-contained static export.

import type { Direction } from "./types";

let ctx: AudioContext | null = null;
let muted = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers suspend new contexts until a user gesture; each play call
  // happens in response to a keypress/click, so resume is safe here.
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

interface Tone {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: Tone[]): void {
  if (muted) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  for (const tone of tones) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.value = tone.freq;

    const peak = tone.gain ?? 0.2;
    const startAt = now + tone.start;
    const endAt = startAt + tone.duration;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endAt);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}

export function playStep(): void {
  playTones([{ freq: 220, start: 0, duration: 0.08, type: "sine", gain: 0.15 }]);
}

export function playTurn(): void {
  playTones([{ freq: 330, start: 0, duration: 0.05, type: "triangle", gain: 0.1 }]);
}

// One distinct pitch per direction, so the monster puzzle's arrow sequence
// can be memorized by ear as well as by eye/color.
const DIRECTION_TONE: Record<Direction, number> = { N: 523.25, E: 659.25, S: 392.0, W: 440.0 };

export function playDirection(dir: Direction): void {
  playTones([{ freq: DIRECTION_TONE[dir], start: 0, duration: 0.16, type: "triangle", gain: 0.18 }]);
}

export function playBump(): void {
  playTones([{ freq: 110, start: 0, duration: 0.18, type: "sawtooth", gain: 0.18 }]);
}

export function playPickup(): void {
  playTones([
    { freq: 523.25, start: 0, duration: 0.12, type: "sine", gain: 0.2 },
    { freq: 783.99, start: 0.1, duration: 0.16, type: "sine", gain: 0.2 },
  ]);
}

export function playWin(): void {
  playTones([
    { freq: 523.25, start: 0, duration: 0.15, type: "sine", gain: 0.22 },
    { freq: 659.25, start: 0.15, duration: 0.15, type: "sine", gain: 0.22 },
    { freq: 783.99, start: 0.3, duration: 0.15, type: "sine", gain: 0.22 },
    { freq: 1046.5, start: 0.45, duration: 0.3, type: "sine", gain: 0.24 },
  ]);
}
