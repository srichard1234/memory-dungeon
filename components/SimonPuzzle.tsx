"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Direction, MonsterKind } from "@/lib/types";
import * as audio from "@/lib/audio";
import { renderMonster } from "./DungeonView";

interface SimonPuzzleProps {
  monsterKind: MonsterKind;
  sequenceLength: number;
  onSolve: () => void;
  onFail: () => void;
  onClose: () => void;
}

type Phase = "intro" | "watch" | "input" | "success";

const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];
const ARROW_GLYPH: Record<Direction, string> = { N: "▲", E: "▶", S: "▼", W: "◀" };
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "N",
  ArrowRight: "E",
  ArrowDown: "S",
  ArrowLeft: "W",
};
const MONSTER_NAMES: Record<MonsterKind, string> = {
  slime: "Slime",
  boo: "Boo",
  toadle: "Toadle",
  flutterling: "Flutterling",
  whisk: "Whisk",
  blinky: "Blinky",
  emberling: "Emberling",
};

function withIndefiniteArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? "An" : "A"} ${name}`;
}

function randomSequence(length: number): Direction[] {
  return Array.from({ length }, () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]);
}

export default function SimonPuzzle({ monsterKind, sequenceLength, onSolve, onFail, onClose }: SimonPuzzleProps) {
  const [sequence] = useState(() => randomSequence(sequenceLength));
  const [phase, setPhase] = useState<Phase>("intro");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [inputProgress, setInputProgress] = useState(0);
  const [pressedDir, setPressedDir] = useState<Direction | null>(null);
  const [shake, setShake] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  const playSequence = useCallback(() => {
    clearTimers();
    setPhase("watch");
    setInputProgress(0);
    setHighlightIndex(-1);
    setPressedDir(null);
    const stepMs = 650;
    sequence.forEach((_, i) => {
      after(500 + i * stepMs, () => {
        setHighlightIndex(i);
        audio.playTurn();
      });
      after(500 + i * stepMs + 400, () => setHighlightIndex(-1));
    });
    after(500 + sequence.length * stepMs, () => setPhase("input"));
  }, [sequence, clearTimers, after]);

  useEffect(() => clearTimers, [clearTimers]);

  const handleInput = useCallback(
    (dir: Direction) => {
      if (phase !== "input") return;
      setPressedDir(dir);
      after(150, () => setPressedDir(null));

      if (dir === sequence[inputProgress]) {
        const next = inputProgress + 1;
        if (next === sequence.length) {
          audio.playPickup();
          setPhase("success");
          clearTimers();
          after(700, onSolve);
        } else {
          audio.playStep();
          setInputProgress(next);
        }
      } else {
        audio.playBump();
        setShake(true);
        onFail();
        after(300, () => setShake(false));
        after(500, playSequence);
      }
    },
    [phase, sequence, inputProgress, onSolve, onFail, clearTimers, after, playSequence],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (phase === "intro") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playSequence();
        }
        return;
      }
      const dir = KEY_TO_DIR[e.key];
      if (dir) {
        e.preventDefault();
        handleInput(dir);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleInput, onClose, playSequence]);

  const statusText = phase === "watch" ? "Watch the sequence..." : phase === "input" ? "Now repeat it back" : "You got it!";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${MONSTER_NAMES[monsterKind]} puzzle`}
    >
      <div
        className={`flex flex-col items-center gap-4 rounded-xl bg-[#1d1830] p-6 ${shake ? "animate-bump" : ""}`}
      >
        <svg viewBox="0 0 160 160" className="h-20 w-20">
          {renderMonster(monsterKind, 80, 90, 70)}
        </svg>
        <h2 className="text-center text-lg font-semibold">
          {withIndefiniteArticle(MONSTER_NAMES[monsterKind])} blocks the way!
        </h2>

        {phase === "intro" ? (
          <>
            <p className="max-w-xs text-center text-sm text-[#b7aed0]">
              Watch the sequence of arrows, then repeat it back. Getting a step wrong costs 5 steps
              and replays the sequence.
            </p>
            <button
              type="button"
              onClick={playSequence}
              className="rounded-md bg-[#ffd166] px-5 py-2 text-sm font-semibold text-[#1d1830] hover:bg-[#ffdd85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
            >
              Begin
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#b7aed0]">{statusText}</p>

            <div className="flex gap-2" aria-hidden="true">
              {sequence.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i < inputProgress || phase === "success" ? "bg-[#5fd6a8]" : "bg-[#3b3550]"}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-2">
              <div />
              <PuzzleButton
                dir="N"
                active={highlightIndex >= 0 && sequence[highlightIndex] === "N"}
                pressed={pressedDir === "N"}
                disabled={phase !== "input"}
                onPress={handleInput}
              />
              <div />
              <PuzzleButton
                dir="W"
                active={highlightIndex >= 0 && sequence[highlightIndex] === "W"}
                pressed={pressedDir === "W"}
                disabled={phase !== "input"}
                onPress={handleInput}
              />
              <div />
              <PuzzleButton
                dir="E"
                active={highlightIndex >= 0 && sequence[highlightIndex] === "E"}
                pressed={pressedDir === "E"}
                disabled={phase !== "input"}
                onPress={handleInput}
              />
              <div />
              <PuzzleButton
                dir="S"
                active={highlightIndex >= 0 && sequence[highlightIndex] === "S"}
                pressed={pressedDir === "S"}
                disabled={phase !== "input"}
                onPress={handleInput}
              />
              <div />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#8a80a3] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Back away for now
        </button>
      </div>
    </div>
  );
}

function PuzzleButton({
  dir,
  active,
  pressed,
  disabled,
  onPress,
}: {
  dir: Direction;
  active: boolean;
  pressed: boolean;
  disabled: boolean;
  onPress: (dir: Direction) => void;
}) {
  const lit = active || pressed;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPress(dir)}
      aria-label={`${dir} direction`}
      className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] disabled:cursor-default ${
        lit ? "bg-[#ffd166] text-[#1d1830]" : "bg-[#2c2640] text-[#ede6f5]"
      } ${disabled && !lit ? "opacity-60" : ""}`}
    >
      {ARROW_GLYPH[dir]}
    </button>
  );
}
