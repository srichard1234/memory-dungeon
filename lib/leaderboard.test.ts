import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEADERBOARD_SIZE,
  MAX_NAME_LENGTH,
  fetchLeaderboard,
  fetchPersonalBest,
  normalizeName,
  qualifiesForLeaderboard,
  submitScore,
} from "./leaderboard";
import { LeaderboardEntry } from "./types";

describe("normalizeName", () => {
  it("uppercases and strips non-letters", () => {
    expect(normalizeName("ab3! cd")).toBe("ABCD");
  });

  it("truncates to MAX_NAME_LENGTH", () => {
    expect(normalizeName("abcdefghijklmnop")).toHaveLength(MAX_NAME_LENGTH);
    expect(normalizeName("abcdefghijklmnop")).toBe("ABCDEFGH");
  });

  it("returns an empty string when nothing letter-like is left", () => {
    expect(normalizeName("123 !@#")).toBe("");
  });
});

function entries(steps: number[]): LeaderboardEntry[] {
  return steps.map((s, i) => ({ name: `P${i}`, steps: s, created_at: "2026-01-01" }));
}

describe("qualifiesForLeaderboard", () => {
  it("qualifies any score when the board has room", () => {
    expect(qualifiesForLeaderboard(entries([10, 20]), 999)).toBe(true);
  });

  it("requires beating the current lowest entry once the board is full", () => {
    const full = entries(Array.from({ length: LEADERBOARD_SIZE }, (_, i) => (i + 1) * 10));
    const worst = full[full.length - 1].steps;
    expect(qualifiesForLeaderboard(full, worst - 1)).toBe(true);
    expect(qualifiesForLeaderboard(full, worst)).toBe(true);
    expect(qualifiesForLeaderboard(full, worst + 1)).toBe(false);
  });

  it("rejects a run that doesn't beat the player's own personal best", () => {
    expect(qualifiesForLeaderboard(entries([10]), 50, 50)).toBe(false);
    expect(qualifiesForLeaderboard(entries([10]), 51, 50)).toBe(false);
    expect(qualifiesForLeaderboard(entries([10]), 49, 50)).toBe(true);
  });

  it("ignores personal best when it is null or undefined", () => {
    expect(qualifiesForLeaderboard(entries([10, 20]), 999, null)).toBe(true);
    expect(qualifiesForLeaderboard(entries([10, 20]), 999, undefined)).toBe(true);
  });
});

describe("fetch-backed helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchLeaderboard returns the scores array on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ scores: entries([1, 2]) }) }),
    );
    const result = await fetchLeaderboard("small");
    expect(result).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith("/api/scores?difficulty=small");
  });

  it("fetchLeaderboard throws when the response isn't ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchLeaderboard("small")).rejects.toThrow("Failed to load leaderboard");
  });

  it("fetchPersonalBest short-circuits without a network call when the name normalizes to empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchPersonalBest("small", "123");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchPersonalBest normalizes and URL-encodes the name in the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ steps: 42 }) }));
    const result = await fetchPersonalBest("medium", "abc");
    expect(result).toBe(42);
    expect(fetch).toHaveBeenCalledWith("/api/scores?difficulty=medium&name=ABC");
  });

  it("submitScore reports ok on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const result = await submitScore("small", "ABC", 10);
    expect(result).toEqual({ ok: true });
  });

  it("submitScore surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "not a new best" }) }),
    );
    const result = await submitScore("small", "ABC", 10);
    expect(result).toEqual({ ok: false, error: "not a new best" });
  });
});
