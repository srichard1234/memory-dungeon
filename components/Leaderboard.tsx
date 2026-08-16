import { useEffect, useState } from "react";
import type { Difficulty, LeaderboardEntry } from "@/lib/types";
import { DIFFICULTY_CONFIGS } from "@/lib/maze";
import { fetchLeaderboard } from "@/lib/leaderboard";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface LeaderboardProps {
  defaultDifficulty: Difficulty;
  onClose: () => void;
}

const DIFFICULTIES: Difficulty[] = ["small", "medium", "large"];

type LoadState = "loading" | "loaded" | "error";

export default function Leaderboard({ defaultDifficulty, onClose }: LeaderboardProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const dialogRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("loading");
    fetchLeaderboard(difficulty)
      .then((scores) => {
        if (cancelled) return;
        setEntries(scores);
        setState("loaded");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Leaderboard"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-[#1d1830] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#ffd166]">Leaderboard</h2>

        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] ${
                d === difficulty ? "bg-[#5fd6a8] text-[#0f0c18]" : "bg-[#2c2640] hover:bg-[#3b3550]"
              }`}
            >
              {DIFFICULTY_CONFIGS[d].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#8a80a3]">
          {DIFFICULTY_CONFIGS[difficulty].size}×{DIFFICULTY_CONFIGS[difficulty].size} grid
        </p>

        <div className="max-h-[50vh] w-full overflow-auto rounded-md bg-[#0f0c18] p-3">
          {state === "loading" && <p className="py-4 text-center text-sm text-[#8a80a3]">Loading…</p>}
          {state === "error" && (
            <p className="py-4 text-center text-sm text-[#e0567a]">Couldn&apos;t load the leaderboard.</p>
          )}
          {state === "loaded" && entries.length === 0 && (
            <p className="py-4 text-center text-sm text-[#8a80a3]">No scores yet — be the first!</p>
          )}
          {state === "loaded" && entries.length > 0 && (
            <ol className="flex flex-col gap-1">
              {entries.map((entry, i) => (
                <li
                  key={`${entry.name}-${entry.created_at}`}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm odd:bg-[#1d1830]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-[#8a80a3]">{i + 1}.</span>
                    <span className="font-semibold">{entry.name}</span>
                  </span>
                  <span className="text-[#5fd6a8]">{entry.steps} steps</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-[#2c2640] px-4 py-2 font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
