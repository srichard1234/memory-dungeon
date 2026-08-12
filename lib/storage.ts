import { BestScores, Difficulty } from "./types";

const STORAGE_KEY = "memory-dungeon-best-scores";

export function loadBestScores(): BestScores {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BestScores;
  } catch {
    return {};
  }
}

// Returns true when this run set a new best for the given difficulty.
export function recordScore(difficulty: Difficulty, steps: number): boolean {
  if (typeof window === "undefined") return false;
  const scores = loadBestScores();
  const previous = scores[difficulty];
  if (previous !== undefined && previous <= steps) return false;

  scores[difficulty] = steps;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — best score
    // just won't persist this session, which isn't worth surfacing to the player.
  }
  return true;
}

export function clearBestScores(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — nothing to clear.
  }
}
