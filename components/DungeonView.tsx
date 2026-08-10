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
const BG = "#0f0c18";

function frameAt(depth: number) {
  const s = Math.pow(SCALE, depth);
  return {
    x0: VX + (OUTER.x0 - VX) * s,
    y0: VY + (OUTER.y0 - VY) * s,
    x1: VX + (OUTER.x1 - VX) * s,
    y1: VY + (OUTER.y1 - VY) * s,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Mixes a hex color toward `target` by fraction t, used to darken each
// surface progressively with depth so distance reads clearly.
function mixHex(hex: string, target: string, t: number): string {
  const c1 = parseInt(hex.slice(1), 16);
  const c2 = parseInt(target.slice(1), 16);
  const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t));
  const g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t));
  const b = Math.round(lerp(c1 & 255, c2 & 255, t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function shadeForDepth(hex: string, depth: number): string {
  return mixHex(hex, BG, Math.min(depth * 0.24, 0.75));
}

// Walls stay visibly lit even far away (a brightness floor), while
// openings are always a true near-black void — that brightness contrast
// (surface vs. empty space) reads correctly at a glance regardless of
// depth or color vision, unlike the hue-only distinction used before.
function wallShade(depth: number): string {
  return mixHex(WALL_BASE, BG, Math.min(depth * 0.14, 0.35));
}

// Distinct hues per surface (cool slate walls, cool-dark ceiling, warm
// stone floor) so the three surfaces read apart even in dim light —
// depth shading then darkens each independently as it recedes.
const WALL_BASE = "#4c5580";
const CEILING_BASE = "#211d33";
const FLOOR_BASE = "#3c2e22";
const EDGE_STROKE = "#e8d9a8";
const DOORWAY_GLOW = "#ffb347";
const VOID_FILL = "#050308";
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
        fill={shadeForDepth(CEILING_BASE, i)}
        stroke={EDGE_STROKE}
        strokeWidth={1}
        strokeOpacity={0.4}
      />,
    );

    shapes.push(
      <polygon
        key={`floor-${i}`}
        points={`${near.x0},${near.y1} ${near.x1},${near.y1} ${far.x1},${far.y1} ${far.x0},${far.y1}`}
        fill={shadeForDepth(FLOOR_BASE, i)}
        stroke={EDGE_STROKE}
        strokeWidth={1}
        strokeOpacity={0.4}
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
        i,
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
        i,
      ),
    );

    if (isLast) {
      if (seg.isEnd) {
        shapes.push(
          <g key={`endwall-${i}`}>
            <rect
              x={far.x0}
              y={far.y0}
              width={far.x1 - far.x0}
              height={far.y1 - far.y0}
              fill={wallShade(i + 1)}
              stroke={EDGE_STROKE}
              strokeWidth={1.5}
            />
            {brickCourses(far.x0, far.y0, far.x1, far.y0, far.x0, far.y1, far.x1, far.y1)}
          </g>,
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
            fill={BG}
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
      <defs>
        <filter id="doorglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x={0} y={0} width={VB_W} height={VB_H} fill={BG} />
      {shapes}
    </svg>
  );
}

// A few coursing lines suggest stone-block rows so walls read as a
// distinct textured surface rather than a flat color, at any depth.
function brickCourses(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bx0: number,
  by0: number,
  bx1: number,
  by1: number,
): ReactNode {
  const lines: ReactNode[] = [];
  for (const t of [0.33, 0.66]) {
    lines.push(
      <line
        key={`course-${t}-${x0}-${y0}`}
        x1={lerp(x0, bx0, t)}
        y1={lerp(y0, by0, t)}
        x2={lerp(x1, bx1, t)}
        y2={lerp(y1, by1, t)}
        stroke={BG}
        strokeWidth={1}
        strokeOpacity={0.3}
      />,
    );
  }
  return <>{lines}</>;
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
  depth: number,
): ReactNode {
  const points = `${nearX},${nearY0} ${farX},${farY0} ${farX},${farY1} ${nearX},${nearY1}`;
  if (!isOpening) {
    return (
      <g key={key}>
        <polygon
          points={points}
          fill={wallShade(depth)}
          stroke={EDGE_STROKE}
          strokeWidth={1.5}
        />
        {brickCourses(nearX, nearY0, farX, farY0, nearX, nearY1, farX, farY1)}
      </g>
    );
  }
  // Doorway: a true black void (never brightened, unlike walls) plus
  // torches bracketing the opening — brightness contrast and a
  // recognizable "passage" symbol, not just a subtle color/glow difference.
  return (
    <g key={key}>
      <polygon points={points} fill={VOID_FILL} />
      <polygon
        points={points}
        fill="none"
        stroke={DOORWAY_GLOW}
        strokeWidth={2}
        strokeOpacity={Math.max(0.35, 0.9 - depth * 0.22)}
        filter="url(#doorglow)"
      />
      {renderTorch(nearX, nearY0, Math.pow(SCALE, depth))}
      {renderTorch(farX, farY0, Math.pow(SCALE, depth + 1))}
    </g>
  );
}

// A small glowing lantern marking a doorway corner — a shape-based
// "passage here" symbol that doesn't rely on spotting a subtle color
// or brightness difference.
function renderTorch(x: number, y: number, scale: number): ReactNode {
  const r = Math.max(2, 3.2 * scale);
  return (
    <g key={`torch-${x}-${y}`}>
      <line x1={x} y1={y} x2={x} y2={y + r * 1.8} stroke="#2a2333" strokeWidth={Math.max(1, 1.4 * scale)} />
      <circle cx={x} cy={y} r={r} fill={DOORWAY_GLOW} filter="url(#doorglow)" />
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
