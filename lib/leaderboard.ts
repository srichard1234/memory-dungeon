import { Difficulty, LeaderboardEntry } from "./types";

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
