import { beforeEach, describe, expect, it } from "vitest";
import { clearBestScores, loadBestScores, loadPlayerName, recordScore, savePlayerName } from "./storage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("recordScore / loadBestScores", () => {
  it("records the first score for a difficulty as a new best", () => {
    expect(recordScore("small", 20)).toBe(true);
    expect(loadBestScores()).toEqual({ small: 20 });
  });

  it("replaces the best only on a strict improvement", () => {
    recordScore("small", 20);
    expect(recordScore("small", 25)).toBe(false);
    expect(recordScore("small", 20)).toBe(false);
    expect(recordScore("small", 15)).toBe(true);
    expect(loadBestScores()).toEqual({ small: 15 });
  });

  it("tracks each difficulty independently", () => {
    recordScore("small", 10);
    recordScore("large", 100);
    expect(loadBestScores()).toEqual({ small: 10, large: 100 });
  });
});

describe("clearBestScores", () => {
  it("removes all recorded bests", () => {
    recordScore("small", 10);
    clearBestScores();
    expect(loadBestScores()).toEqual({});
  });
});

describe("player name persistence", () => {
  it("returns an empty string when nothing has been saved", () => {
    expect(loadPlayerName()).toBe("");
  });

  it("round-trips a saved name", () => {
    savePlayerName("ABC");
    expect(loadPlayerName()).toBe("ABC");
  });
});
