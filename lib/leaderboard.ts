import { Difficulty, LeaderboardEntry } from "./types";

export const LEADERBOARD_SIZE = 10;
export const MAX_NAME_LENGTH = 8;

export async function fetchLeaderboard(difficulty: Difficulty): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/scores?difficulty=${difficulty}`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  const data = (await res.json()) as { scores: LeaderboardEntry[] };
  return data.scores;
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

// A run qualifies once the board has fewer than LEADERBOARD_SIZE entries, or
// it beats (or ties) the current lowest-ranked entry. This is only a
// client-side hint for whether to show the name-entry form — the server
// makes the real call, rejecting submissions that don't beat the player's
// own previous best for that difficulty (see POST /api/scores).
export function qualifiesForLeaderboard(entries: LeaderboardEntry[], steps: number): boolean {
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
