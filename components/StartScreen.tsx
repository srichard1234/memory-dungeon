import type { BestScores, Difficulty, TestDungeonKind } from "@/lib/types";
import { DIFFICULTY_CONFIGS } from "@/lib/maze";

interface StartScreenProps {
  bestScores: BestScores;
  onStart: (difficulty: Difficulty) => void;
  onStartTest?: (kind: TestDungeonKind) => void;
}

const DIFFICULTIES: Difficulty[] = ["small", "medium", "large"];

const TEST_DUNGEONS: { kind: TestDungeonKind; label: string }[] = [
  { kind: "monster", label: "Test: Monster" },
  { kind: "portal", label: "Test: Portal" },
];

export default function StartScreen({ bestScores, onStart, onStartTest }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-xl bg-[#1d1830] p-6 text-center sm:p-10">
      <h1 className="text-3xl font-bold text-[#ffd166] sm:text-4xl">Memory Dungeon</h1>
      <p className="max-w-md text-[#c9c0dd]">
        Explore a randomly generated dungeon using the arrow keys or the buttons on screen. Collect
        every piece of treasure, defeat all the monsters, then find the exit &mdash; try to do it in as few steps as possible. There&apos;s no map on screen, so use your memory!
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        {DIFFICULTIES.map((difficulty) => {
          const config = DIFFICULTY_CONFIGS[difficulty];
          const best = bestScores[difficulty];
          return (
            <button
              key={difficulty}
              type="button"
              onClick={() => onStart(difficulty)}
              className="flex w-44 flex-col items-center gap-1 rounded-lg bg-[#2c2640] px-5 py-4 font-semibold hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
            >
              <span className="text-lg">{config.label}</span>
              <span className="text-xs font-normal text-[#8a80a3]">
                {config.size}×{config.size} grid, {config.itemCount} treasure, {config.monsterCount} monsters
              </span>
              <span className="text-xs font-normal text-[#5fd6a8]">
                {best !== undefined ? `Best: ${best} steps` : "No best score yet"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 max-w-md text-xs text-[#8a80a3]">
        Controls: ↑ forward · ↓ back · ← turn left · → turn right (or use the on-screen buttons)
      </div>

      {onStartTest && (
        <div className="flex flex-col items-center gap-2 border-t border-[#3b3550] pt-4">
          <span className="text-xs uppercase tracking-wide text-[#8a80a3]">Dev: isolated tests</span>
          <div className="flex gap-3">
            {TEST_DUNGEONS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => onStartTest(kind)}
                className="rounded-md bg-[#2c2640] px-3 py-2 text-xs font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
