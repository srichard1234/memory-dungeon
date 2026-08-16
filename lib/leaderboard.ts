import { Difficulty, LeaderboardEntry } from "./types";

export const LEADERBOARD_SIZE = 10;
export const MAX_NAME_LENGTH = 5;

export async function fetchLeaderboard(difficulty: Difficulty): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/scores?difficulty=${difficulty}`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  const data = (await res.json()) as { scores: LeaderboardEntry[] };
  return data.scores;
}

export async function submitScore(difficulty: Difficulty, name: string, steps: number): Promise<boolean> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, name, steps }),
  });
  return res.ok;
}

// A run qualifies once the board has fewer than LEADERBOARD_SIZE entries, or
// it beats (or ties) the current lowest-ranked entry.
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
