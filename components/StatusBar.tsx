import type { Direction } from "@/lib/types";
import { compassLabel } from "@/lib/maze";

interface StatusBarProps {
  steps: number;
  itemsCollected: number;
  itemsTotal: number;
  facing: Direction;
  muted: boolean;
  helpActive: boolean;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onRestart: () => void;
}

export default function StatusBar({
  steps,
  itemsCollected,
  itemsTotal,
  facing,
  muted,
  helpActive,
  onToggleMute,
  onToggleHelp,
  onRestart,
}: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#1d1830] px-4 py-3 text-sm sm:text-base">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-medium">
          Steps: <span className="text-[#ffd166]">{steps}</span>
        </span>
        <span className="font-medium">
          Treasure:{" "}
          <span className="text-[#ffd166]">
            {itemsCollected} / {itemsTotal}
          </span>
        </span>
        <span className="font-medium">
          Facing: <span className="text-[#5fd6a8]">{compassLabel(facing)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          className="rounded-md bg-[#2c2640] px-3 py-2 font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          {muted ? "🔇 Sound" : "🔊 Sound"}
        </button>
        <button
          type="button"
          onClick={onToggleHelp}
          aria-pressed={helpActive}
          aria-label="Toggle stuck helper map"
          className="rounded-md bg-[#2c2640] px-3 py-2 font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          🗺️ I&apos;m stuck?
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart with a new dungeon"
          className="rounded-md bg-[#2c2640] px-3 py-2 font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          🔄 Restart
        </button>
      </div>
    </div>
  );
}
