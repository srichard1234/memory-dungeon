import { Difficulty, LeaderboardEntry } from "./types";

export const LEADERBOARD_SIZE = 10;
export const MAX_NAME_LENGTH = 8;

export async function fetchLeaderboard(difficulty: Difficulty): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/scores?difficulty=${difficulty}`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  const data = (await res.json()) as { scores: LeaderboardEntry[] };
  return data.scores;
}

// Looks up the player's own score for this difficulty, regardless of
// whether it currently ranks inside the visible top LEADERBOARD_SIZE.
// Returns null if they have no name yet, or no existing entry.
export async function fetchPersonalBest(difficulty: Difficulty, name: string): Promise<number | null> {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;
  const res = await fetch(`/api/scores?difficulty=${difficulty}&name=${encodeURIComponent(normalizedName)}`);
  if (!res.ok) throw new Error("Failed to load personal best");
  const data = (await res.json()) as { steps: number | null };
  return data.steps;
}

export interface SubmitScoreResult {
  ok: boolean;
  error?: string;
}

export async function submitScore(difficulty: Difficulty, name: string, steps: number): Promise<SubmitScoreResult> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, name, steps }),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => null);
  return { ok: false, error: typeof data?.error === "string" ? data.error : undefined };
}

// A run qualifies if it beats the player's own previous best for this
// difficulty (or they have none yet), and either the board has fewer than
// LEADERBOARD_SIZE entries or it beats the current lowest-ranked entry.
// personalBest should come from fetchPersonalBest — pass null/undefined if
// the player has no saved name yet. The server re-checks the personal-best
// condition on submit (see POST /api/scores), since this client-side check
// can't see entries outside the fetched top LEADERBOARD_SIZE.
export function qualifiesForLeaderboard(
  entries: LeaderboardEntry[],
  steps: number,
  personalBest?: number | null,
): boolean {
  if (personalBest != null && steps >= personalBest) return false;
  if (entries.length < LEADERBOARD_SIZE) return true;
  return steps <= entries[entries.length - 1].steps;
}

// Arcade-style initials: letters only, uppercased, capped at MAX_NAME_LENGTH.
export function normalizeName(raw: string): string {
  return raw
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, MAX_NAME_LENGTH);
}
