"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MonsterKind } from "@/lib/types";
import * as audio from "@/lib/audio";
import { renderMonster } from "./DungeonView";

interface TileMatchPuzzleProps {
  pairs: number;
  onSolve: () => void;
  onClose: () => void;
}

interface Tile {
  id: number;
  kind: MonsterKind;
}

const ALL_KINDS: MonsterKind[] = ["slime", "boo", "toadle", "flutterling", "whisk", "blinky", "emberling"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(pairs: number): Tile[] {
  const kinds = shuffle(ALL_KINDS).slice(0, pairs);
  return shuffle([...kinds, ...kinds]).map((kind, id) => ({ id, kind }));
}

function columnsFor(totalTiles: number): number {
  return totalTiles <= 6 ? 3 : 4;
}

export default function TileMatchPuzzle({ pairs, onSolve, onClose }: TileMatchPuzzleProps) {
  const [tiles] = useState(() => buildTiles(pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [cursor, setCursor] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const pending = timeouts.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const flipTile = useCallback(
    (id: number) => {
      if (locked || flipped.includes(id) || matchedIds.has(id) || flipped.length === 2) return;

      const next = [...flipped, id];
      setFlipped(next);
      audio.playTurn();

      if (next.length === 2) {
        const [a, b] = next;
        if (tiles[a].kind === tiles[b].kind) {
          audio.playPickup();
          after(400, () => {
            setMatchedIds((prev) => new Set(prev).add(a).add(b));
            setFlipped([]);
          });
        } else {
          setLocked(true);
          after(750, () => {
            audio.playBump();
            setFlipped([]);
            setLocked(false);
          });
        }
      }
    },
    [locked, flipped, matchedIds, tiles, after],
  );

  useEffect(() => {
    if (matchedIds.size === pairs * 2) {
      audio.playWin();
      after(900, onSolve);
    }
  }, [matchedIds, pairs, onSolve, after]);

  const cols = columnsFor(tiles.length);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCursor((c) => Math.min(tiles.length - 1, c + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(tiles.length - 1, c + cols));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - cols));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipTile(cursor);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cursor, cols, tiles.length, flipTile, onClose]);

  const matchedPairs = matchedIds.size / 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exit memory match puzzle"
    >
      <div className="flex flex-col items-center gap-4 rounded-xl bg-[#1d1830] p-6">
        <h2 className="text-center text-lg font-semibold">Match every pair to open the portal</h2>
        <p className="text-sm text-[#b7aed0]">
          {matchedPairs} / {pairs} pairs found
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tiles.map((tile, idx) => {
            const isFaceUp = matchedIds.has(idx) || flipped.includes(idx);
            const isMatched = matchedIds.has(idx);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  setCursor(idx);
                  flipTile(idx);
                }}
                disabled={isMatched}
                aria-label={isFaceUp ? `${tile.kind} tile` : "hidden tile"}
                className={`flex h-16 w-16 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] sm:h-20 sm:w-20 ${
                  isFaceUp ? "bg-[#2c2640]" : "bg-[#3b3550] hover:bg-[#443c5e]"
                } ${cursor === idx ? "ring-2 ring-[#ffd166]" : ""} ${isMatched ? "opacity-70" : ""}`}
              >
                {isFaceUp ? (
                  <svg viewBox="0 0 160 160" className="h-12 w-12 sm:h-14 sm:w-14">
                    {renderMonster(tile.kind, 80, 90, 60)}
                  </svg>
                ) : (
                  <span className="text-xl text-[#8a80a3]">?</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#8a80a3] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Step away for now
        </button>
      </div>
    </div>
  );
}
