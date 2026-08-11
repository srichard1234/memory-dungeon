import type { Dungeon, Direction, Point } from "@/lib/types";

interface HelpMapProps {
  dungeon: Dungeon;
  playerX: number;
  playerY: number;
  facing: Direction;
  collectedItems: Point[];
  defeatedMonsters: Point[];
  onClose: () => void;
}

const CELL = 26;

const FACING_ROTATION: Record<Direction, number> = { N: 0, E: 90, S: 180, W: 270 };

export default function HelpMap({
  dungeon,
  playerX,
  playerY,
  facing,
  collectedItems,
  defeatedMonsters,
  onClose,
}: HelpMapProps) {
  const size = dungeon.size;
  const dim = size * CELL;
  const collectedKeys = new Set(collectedItems.map((p) => `${p.x},${p.y}`));
  const remainingItems = dungeon.items.filter((p) => !collectedKeys.has(`${p.x},${p.y}`));
  const defeatedKeys = new Set(defeatedMonsters.map((p) => `${p.x},${p.y}`));
  const activeMonsters = dungeon.monsters.filter((m) => !defeatedKeys.has(`${m.x},${m.y}`));

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = dungeon.cells[y][x];
      const x0 = x * CELL;
      const y0 = y * CELL;
      const x1 = x0 + CELL;
      const y1 = y0 + CELL;
      if (cell.walls.N) lines.push({ x1: x0, y1: y0, x2: x1, y2: y0 });
      if (cell.walls.S) lines.push({ x1: x0, y1: y1, x2: x1, y2: y1 });
      if (cell.walls.W) lines.push({ x1: x0, y1: y0, x2: x0, y2: y1 });
      if (cell.walls.E) lines.push({ x1: x1, y1: y0, x2: x1, y2: y1 });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Full dungeon map"
      onClick={onClose}
    >
      <div
        className="flex max-h-full flex-col items-center gap-4 rounded-xl bg-[#1d1830] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Full Map</h2>
        <div className="max-h-[60vh] max-w-[85vw] overflow-auto rounded-md bg-[#0f0c18] p-2">
          <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
            <rect x={0} y={0} width={dim} height={dim} fill="#0f0c18" />
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#c9b98a"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
            {remainingItems.map((p, i) => (
              <circle
                key={`item-${i}`}
                cx={p.x * CELL + CELL / 2}
                cy={p.y * CELL + CELL / 2}
                r={5}
                fill="#ffd166"
                stroke="#8a6a1a"
              />
            ))}
            <rect
              x={dungeon.exit.x * CELL + 4}
              y={dungeon.exit.y * CELL + 4}
              width={CELL - 8}
              height={CELL - 8}
              fill="none"
              stroke="#5fd6a8"
              strokeWidth={2.5}
              rx={3}
            />
            {activeMonsters.map((m, i) => (
              <polygon
                key={`monster-${i}`}
                points={`${m.x * CELL + CELL / 2},${m.y * CELL + 5} ${m.x * CELL + CELL - 5},${m.y * CELL + CELL - 5} ${m.x * CELL + 5},${m.y * CELL + CELL - 5}`}
                fill="#f2a154"
                stroke="#8a4f1f"
                strokeWidth={1.5}
              />
            ))}
            <g
              transform={`translate(${playerX * CELL + CELL / 2}, ${playerY * CELL + CELL / 2}) rotate(${FACING_ROTATION[facing]})`}
            >
              <polygon points="0,-8 6,7 -6,7" fill="#ff5c5c" stroke="#7a0f0f" strokeWidth={1} />
            </g>
          </svg>
        </div>
        <p className="max-w-xs text-center text-sm text-[#b7aed0]">
          Red arrow is you. Gold dots are treasure still out there. Orange triangles are monsters.
          The green square is the exit.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-[#2c2640] px-4 py-2 font-medium hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Close map
        </button>
      </div>
    </div>
  );
}
