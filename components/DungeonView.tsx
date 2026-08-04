import type { ReactNode } from "react";
import type { Dungeon, Direction } from "@/lib/types";
import { getViewSegments } from "@/lib/maze";

interface DungeonViewProps {
  dungeon: Dungeon;
  x: number;
  y: number;
  facing: Direction;
  bump: boolean;
}

const VB_W = 400;
const VB_H = 300;
const VX = VB_W / 2;
const VY = VB_H / 2 + 8;
const OUTER = { x0: 28, y0: 22, x1: VB_W - 28, y1: VB_H - 22 };
const SCALE = 0.58;

function frameAt(depth: number) {
  const s = Math.pow(SCALE, depth);
  return {
    x0: VX + (OUTER.x0 - VX) * s,
    y0: VY + (OUTER.y0 - VY) * s,
    x1: VX + (OUTER.x1 - VX) * s,
    y1: VY + (OUTER.y1 - VY) * s,
  };
}

const WALL_FILL = "#3b3550";
const WALL_STROKE = "#c9b98a";
const FLOOR_FILL = "#241f30";
const CEILING_FILL = "#2c2640";
const DOORWAY_GLOW = "#f3d38a";
const ITEM_COLOR = "#ffd166";
const EXIT_COLOR = "#5fd6a8";

export default function DungeonView({ dungeon, x, y, facing, bump }: DungeonViewProps) {
  const segments = getViewSegments(dungeon, x, y, facing, 3);
  const depthCount = segments.length;
  const shapes: ReactNode[] = [];

  // Farthest to nearest so nearer geometry draws on top of it.
  for (let i = depthCount - 1; i >= 0; i--) {
    const near = frameAt(i);
    const far = frameAt(i + 1);
    const seg = segments[i];
    const isLast = i === depthCount - 1;

    shapes.push(
      <polygon
        key={`ceil-${i}`}
        points={`${near.x0},${near.y0} ${near.x1},${near.y0} ${far.x1},${far.y0} ${far.x0},${far.y0}`}
        fill={CEILING_FILL}
        stroke={WALL_STROKE}
        strokeWidth={1}
        strokeOpacity={0.35}
      />,
    );

    shapes.push(
      <polygon
        key={`floor-${i}`}
        points={`${near.x0},${near.y1} ${near.x1},${near.y1} ${far.x1},${far.y1} ${far.x0},${far.y1}`}
        fill={FLOOR_FILL}
        stroke={WALL_STROKE}
        strokeWidth={1}
        strokeOpacity={0.35}
      />,
    );

    shapes.push(
      renderSidePanel(
        `left-${i}`,
        near.x0,
        near.y0,
        near.y1,
        far.x0,
        far.y0,
        far.y1,
        seg.hasLeftOpening,
      ),
    );
    shapes.push(
      renderSidePanel(
        `right-${i}`,
        near.x1,
        near.y0,
        near.y1,
        far.x1,
        far.y0,
        far.y1,
        seg.hasRightOpening,
      ),
    );

    if (isLast) {
      if (seg.isEnd) {
        shapes.push(
          <rect
            key={`endwall-${i}`}
            x={far.x0}
            y={far.y0}
            width={far.x1 - far.x0}
            height={far.y1 - far.y0}
            fill={WALL_FILL}
            stroke={WALL_STROKE}
            strokeWidth={1.5}
          />,
        );
      } else {
        // View depth ran out while the corridor still continues — fade to
        // darkness rather than pretending we know what's further ahead.
        shapes.push(
          <rect
            key={`fade-${i}`}
            x={far.x0}
            y={far.y0}
            width={far.x1 - far.x0}
            height={far.y1 - far.y0}
            fill="#0f0c18"
          />,
        );
      }
    }

    if (seg.hasItem || seg.isExit) {
      const cx = VX;
      const cy = (near.y1 + far.y1) / 2;
      const size = Math.max(8, 30 * Math.pow(SCALE, i));
      shapes.push(
        seg.isExit ? (
          <rect
            key={`exit-${i}`}
            x={cx - size / 2}
            y={cy - size}
            width={size}
            height={size * 1.3}
            rx={size * 0.15}
            fill="none"
            stroke={EXIT_COLOR}
            strokeWidth={2}
          />
        ) : (
          <polygon
            key={`item-${i}`}
            points={starPoints(cx, cy, size / 2, size / 4.5, 5)}
            fill={ITEM_COLOR}
            stroke="#8a6a1a"
            strokeWidth={1}
          />
        ),
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={`h-full w-full rounded-lg ${bump ? "animate-bump" : ""}`}
      role="img"
      aria-label="First-person view of the dungeon corridor ahead"
    >
      <rect x={0} y={0} width={VB_W} height={VB_H} fill="#0f0c18" />
      {shapes}
    </svg>
  );
}

function renderSidePanel(
  key: string,
  nearX: number,
  nearY0: number,
  nearY1: number,
  farX: number,
  farY0: number,
  farY1: number,
  isOpening: boolean,
): ReactNode {
  const points = `${nearX},${nearY0} ${farX},${farY0} ${farX},${farY1} ${nearX},${nearY1}`;
  if (!isOpening) {
    return (
      <polygon key={key} points={points} fill={WALL_FILL} stroke={WALL_STROKE} strokeWidth={1.5} />
    );
  }
  // Doorway: leave it open (dark) with a soft glowing outline so the
  // passage clearly reads as "you can go this way."
  return (
    <g key={key}>
      <polygon points={points} fill="#191428" />
      <polygon points={points} fill="none" stroke={DOORWAY_GLOW} strokeWidth={1.2} strokeOpacity={0.6} />
    </g>
  );
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, spikes: number): string {
  const points: string[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    points.push(`${cx + Math.cos(rot) * outerR},${cy + Math.sin(rot) * outerR}`);
    rot += step;
    points.push(`${cx + Math.cos(rot) * innerR},${cy + Math.sin(rot) * innerR}`);
    rot += step;
  }
  return points.join(" ");
}
