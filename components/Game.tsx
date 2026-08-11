"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BestScores, Difficulty, Direction, Dungeon, Monster, Point } from "@/lib/types";
import {
  DIFFICULTY_CONFIGS,
  OPPOSITE,
  canMove,
  findActiveMonster,
  generateDungeon,
  leftOf,
  move,
  pointsEqual,
  rightOf,
} from "@/lib/maze";
import * as audio from "@/lib/audio";
import { loadBestScores, recordScore } from "@/lib/storage";
import DungeonView from "./DungeonView";
import StatusBar from "./StatusBar";
import Controls from "./Controls";
import HelpMap from "./HelpMap";
import StartScreen from "./StartScreen";
import WinScreen from "./WinScreen";
import SimonPuzzle from "./SimonPuzzle";
import TileMatchPuzzle from "./TileMatchPuzzle";

type Phase = "start" | "playing" | "win";

export default function Game() {
  const [phase, setPhase] = useState<Phase>("start");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);
  const [playerPos, setPlayerPos] = useState<Point>({ x: 0, y: 0 });
  const [facing, setFacing] = useState<Direction>("N");
  const [collectedItems, setCollectedItems] = useState<Point[]>([]);
  const [defeatedMonsters, setDefeatedMonsters] = useState<Point[]>([]);
  const [activeMonster, setActiveMonster] = useState<Monster | null>(null);
  const [exitPuzzleOpen, setExitPuzzleOpen] = useState(false);
  const [steps, setSteps] = useState(0);
  const [bump, setBump] = useState(false);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bestScores, setBestScores] = useState<BestScores>({});
  const [isNewBest, setIsNewBest] = useState(false);

  const bumpTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // localStorage isn't available during server rendering, so best scores
    // must be read after mount rather than in the initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBestScores(loadBestScores());
    return () => {
      if (bumpTimeout.current) clearTimeout(bumpTimeout.current);
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
    };
  }, []);

  const triggerBump = useCallback(() => {
    audio.playBump();
    setBump(true);
    if (bumpTimeout.current) clearTimeout(bumpTimeout.current);
    bumpTimeout.current = setTimeout(() => setBump(false), 220);
  }, []);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  const startGame = useCallback((chosen: Difficulty) => {
    const newDungeon = generateDungeon(chosen);
    setDifficulty(chosen);
    setDungeon(newDungeon);
    setPlayerPos(newDungeon.start);
    setFacing(newDungeon.startFacing);
    setCollectedItems([]);
    setDefeatedMonsters([]);
    setActiveMonster(null);
    setExitPuzzleOpen(false);
    setSteps(0);
    setMessage(null);
    setIsNewBest(false);
    setHelpOpen(false);
    setPhase("playing");
  }, []);

  const handleWin = useCallback(
    (finalSteps: number) => {
      if (!difficulty) return;
      const newBest = recordScore(difficulty, finalSteps);
      setIsNewBest(newBest);
      setBestScores(loadBestScores());
      audio.playWin();
      setPhase("win");
    },
    [difficulty],
  );

  const attemptMove = useCallback(
    (direction: "forward" | "back") => {
      if (!dungeon || phase !== "playing" || helpOpen || activeMonster || exitPuzzleOpen) return;
      const moveDir = direction === "forward" ? facing : OPPOSITE[facing];
      if (!canMove(dungeon, playerPos.x, playerPos.y, moveDir)) {
        triggerBump();
        return;
      }
      const next = move(playerPos.x, playerPos.y, moveDir);

      // A monster blocks the cell like a wall until its puzzle is solved —
      // the attempted step opens the encounter instead of completing.
      const monsterHere = findActiveMonster(dungeon, next.x, next.y, defeatedMonsters);
      if (monsterHere) {
        setActiveMonster(monsterHere);
        return;
      }

      const nextSteps = steps + 1;
      setPlayerPos(next);
      setSteps(nextSteps);
      audio.playStep();

      const itemHere = dungeon.items.find(
        (it) => pointsEqual(it, next) && !collectedItems.some((c) => pointsEqual(c, it)),
      );
      let nextCollected = collectedItems;
      if (itemHere) {
        nextCollected = [...collectedItems, itemHere];
        setCollectedItems(nextCollected);
        audio.playPickup();
      }

      if (pointsEqual(next, dungeon.exit)) {
        const allItemsCollected = nextCollected.length === dungeon.items.length;
        const allMonstersDefeated = defeatedMonsters.length === dungeon.monsters.length;
        if (allItemsCollected && allMonstersDefeated) {
          setExitPuzzleOpen(true);
        } else if (!allItemsCollected && !allMonstersDefeated) {
          showMessage("Collect all the treasure and defeat every monster first!");
        } else if (!allItemsCollected) {
          showMessage("Find all the treasure first!");
        } else {
          showMessage("Defeat every monster first!");
        }
      }
    },
    [
      dungeon,
      phase,
      helpOpen,
      activeMonster,
      exitPuzzleOpen,
      facing,
      playerPos,
      steps,
      collectedItems,
      defeatedMonsters,
      triggerBump,
      showMessage,
    ],
  );

  const turnLeft = useCallback(() => {
    if (phase !== "playing" || helpOpen || activeMonster || exitPuzzleOpen) return;
    setFacing((f) => leftOf(f));
    audio.playTurn();
  }, [phase, helpOpen, activeMonster, exitPuzzleOpen]);

  const turnRight = useCallback(() => {
    if (phase !== "playing" || helpOpen || activeMonster || exitPuzzleOpen) return;
    setFacing((f) => rightOf(f));
    audio.playTurn();
  }, [phase, helpOpen, activeMonster, exitPuzzleOpen]);

  const handleMonsterSolved = useCallback(() => {
    if (!activeMonster) return;
    const defeated = { x: activeMonster.x, y: activeMonster.y };
    setDefeatedMonsters((prev) => (prev.some((m) => pointsEqual(m, defeated)) ? prev : [...prev, defeated]));
    setActiveMonster(null);
  }, [activeMonster]);

  const handleMonsterPuzzleClose = useCallback(() => setActiveMonster(null), []);

  const handleExitPuzzleSolved = useCallback(() => {
    setExitPuzzleOpen(false);
    handleWin(steps);
  }, [handleWin, steps]);

  const handleExitPuzzleClose = useCallback(() => setExitPuzzleOpen(false), []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      audio.setMuted(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    if (!difficulty) return;
    startGame(difficulty);
  }, [difficulty, startGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (helpOpen) {
        if (e.key === "Escape") setHelpOpen(false);
        return;
      }
      // Monster and exit puzzles capture keyboard input themselves while open.
      if (activeMonster || exitPuzzleOpen) return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          attemptMove("forward");
          break;
        case "ArrowDown":
          e.preventDefault();
          attemptMove("back");
          break;
        case "ArrowLeft":
          e.preventDefault();
          turnLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          turnRight();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, helpOpen, activeMonster, exitPuzzleOpen, attemptMove, turnLeft, turnRight]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      {phase === "start" && <StartScreen bestScores={bestScores} onStart={startGame} />}

      {phase === "playing" && dungeon && (
        <>
          <StatusBar
            steps={steps}
            itemsCollected={collectedItems.length}
            itemsTotal={dungeon.items.length}
            monstersDefeated={defeatedMonsters.length}
            monstersTotal={dungeon.monsters.length}
            facing={facing}
            muted={muted}
            helpActive={helpOpen}
            onToggleMute={toggleMute}
            onToggleHelp={() => setHelpOpen((v) => !v)}
            onRestart={restart}
          />
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#3b3550]">
            <DungeonView
              dungeon={dungeon}
              x={playerPos.x}
              y={playerPos.y}
              facing={facing}
              bump={bump}
              collectedItems={collectedItems}
              defeatedMonsters={defeatedMonsters}
            />
            {message && (
              <div className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-md bg-black/70 px-4 py-2 text-sm font-medium text-[#ffd166]">
                {message}
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Controls
              onForward={() => attemptMove("forward")}
              onBack={() => attemptMove("back")}
              onTurnLeft={turnLeft}
              onTurnRight={turnRight}
              disabled={helpOpen || !!activeMonster || exitPuzzleOpen}
            />
          </div>
          {helpOpen && (
            <HelpMap
              dungeon={dungeon}
              playerX={playerPos.x}
              playerY={playerPos.y}
              facing={facing}
              collectedItems={collectedItems}
              defeatedMonsters={defeatedMonsters}
              onClose={() => setHelpOpen(false)}
            />
          )}
          {activeMonster && difficulty && (
            <SimonPuzzle
              monsterKind={activeMonster.kind}
              sequenceLength={DIFFICULTY_CONFIGS[difficulty].simonLength}
              onSolve={handleMonsterSolved}
              onClose={handleMonsterPuzzleClose}
            />
          )}
          {exitPuzzleOpen && difficulty && (
            <TileMatchPuzzle
              pairs={DIFFICULTY_CONFIGS[difficulty].tilePairs}
              onSolve={handleExitPuzzleSolved}
              onClose={handleExitPuzzleClose}
            />
          )}
        </>
      )}

      {phase === "win" && difficulty && (
        <WinScreen
          steps={steps}
          bestSteps={bestScores[difficulty]}
          isNewBest={isNewBest}
          onPlayAgain={() => startGame(difficulty)}
          onChangeDifficulty={() => setPhase("start")}
        />
      )}
    </div>
  );
}
