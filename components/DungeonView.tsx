import type { ReactNode } from "react";
import type { Dungeon, Direction, Point } from "@/lib/types";
import { getViewSegments } from "@/lib/maze";

interface DungeonViewProps {
  dungeon: Dungeon;
  x: number;
  y: number;
  facing: Direction;
  bump: boolean;
  collectedItems: Point[];
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

type Pt = [number, number];

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

// Bilinear point inside a quad given by its four corners, u = across, v = down.
function quadPoint(topLeft: Pt, topRight: Pt, bottomLeft: Pt, bottomRight: Pt, u: number, v: number): Pt {
  return lerpPt(lerpPt(topLeft, topRight, u), lerpPt(bottomLeft, bottomRight, u), v);
}

function quadCell(
  topLeft: Pt,
  topRight: Pt,
  bottomLeft: Pt,
  bottomRight: Pt,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): Pt[] {
  return [
    quadPoint(topLeft, topRight, bottomLeft, bottomRight, u0, v0),
    quadPoint(topLeft, topRight, bottomLeft, bottomRight, u1, v0),
    quadPoint(topLeft, topRight, bottomLeft, bottomRight, u1, v1),
    quadPoint(topLeft, topRight, bottomLeft, bottomRight, u0, v1),
  ];
}

// Deterministic pseudo-random in [0, 1) so masonry/flagstone texture is
// stable across re-renders instead of re-randomizing on every move.
function hash01(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
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
// depth or color vision.
function wallShade(depth: number): string {
  return mixHex(WALL_BASE, BG, Math.min(depth * 0.14, 0.35));
}

const WALL_BASE = "#4c5580";
const CEILING_BASE = "#211d33";
const FLOOR_BASE = "#3c2e22";
const EDGE_STROKE = "#e8d9a8";
const MORTAR = "#181228";
const IRON = "#22202c";
const DOORWAY_GLOW = "#ffb347";
const VOID_FILL = "#050308";
const ITEM_COLOR = "#ffd166";
const EXIT_COLOR = "#5fd6a8";
const FLAME_COLORS = ["#c94f1f", "#ff9d3f", "#ffe2a1"];

export default function DungeonView({ dungeon, x, y, facing, bump, collectedItems }: DungeonViewProps) {
  const segments = getViewSegments(dungeon, x, y, facing, collectedItems, 3);
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
      <g key={`floor-${i}`}>
        {renderFlagstones(
          [near.x0, near.y1],
          [near.x1, near.y1],
          [far.x0, far.y1],
          [far.x1, far.y1],
          seg.x,
          seg.y,
          i,
        )}
      </g>,
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
        seg.x,
        seg.y,
        1,
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
        seg.x,
        seg.y,
        2,
      ),
    );

    if (isLast) {
      if (seg.isEnd) {
        shapes.push(
          <g key={`endwall-${i}`}>
            {renderMasonry(
              [far.x0, far.y0],
              [far.x1, far.y0],
              [far.x0, far.y1],
              [far.x1, far.y1],
              wallShade(i + 1),
              seg.x,
              seg.y,
              3,
            )}
            <rect
              x={far.x0}
              y={far.y0}
              width={far.x1 - far.x0}
              height={far.y1 - far.y0}
              fill="none"
              stroke={EDGE_STROKE}
              strokeWidth={1.5}
            />
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
          <g key={`exit-${i}`}>
            <rect
              x={cx - size / 2}
              y={cy - size}
              width={size}
              height={size * 1.3}
              rx={size * 0.15}
              fill="none"
              stroke={EXIT_COLOR}
              strokeWidth={2}
              opacity={0.35}
              filter="url(#doorglow)"
            />
            <rect
              x={cx - size / 2}
              y={cy - size}
              width={size}
              height={size * 1.3}
              rx={size * 0.15}
              fill="none"
              stroke={EXIT_COLOR}
              strokeWidth={2}
            />
          </g>
        ) : (
          <g key={`item-${i}`}>{renderTreasureChest(cx, cy, size)}</g>
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

// Individually shaded stone blocks (with mortar gaps) inside an
// arbitrary quad — used for both side-panel walls and the end wall, so
// walls read as real masonry rather than a flat fill.
function renderMasonry(
  topLeft: Pt,
  topRight: Pt,
  bottomLeft: Pt,
  bottomRight: Pt,
  baseColor: string,
  cellX: number,
  cellY: number,
  salt: number,
): ReactNode {
  const rows = 3;
  const cols = 3;
  const blocks: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = cellX * 7919 + cellY * 104729 + salt * 92821 + r * 131 + c * 967;
      const t = hash01(seed);
      const shade = mixHex(baseColor, t > 0.5 ? "#ffffff" : "#000000", 0.04 + t * 0.08);
      const pts = quadCell(topLeft, topRight, bottomLeft, bottomRight, c / cols, (c + 1) / cols, r / rows, (r + 1) / rows);
      blocks.push(
        <polygon
          key={`m-${r}-${c}`}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill={shade}
          stroke={MORTAR}
          strokeWidth={1}
        />,
      );
    }
  }
  return <>{blocks}</>;
}

// Individually shaded flagstone tiles across a floor slice.
function renderFlagstones(
  topLeft: Pt,
  topRight: Pt,
  bottomLeft: Pt,
  bottomRight: Pt,
  cellX: number,
  cellY: number,
  depth: number,
): ReactNode {
  const rows = 2;
  const cols = 3;
  const base = shadeForDepth(FLOOR_BASE, depth);
  const tiles: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = cellX * 60013 + cellY * 7639 + depth * 4241 + r * 271 + c * 883;
      const t = hash01(seed);
      const shade = mixHex(base, "#000000", 0.04 + t * 0.1);
      const pts = quadCell(topLeft, topRight, bottomLeft, bottomRight, c / cols, (c + 1) / cols, r / rows, (r + 1) / rows);
      tiles.push(
        <polygon
          key={`f-${r}-${c}`}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill={shade}
          stroke={MORTAR}
          strokeWidth={0.75}
          strokeOpacity={0.7}
        />,
      );
    }
  }
  return <>{tiles}</>;
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
  cellX: number,
  cellY: number,
  salt: number,
): ReactNode {
  if (!isOpening) {
    return (
      <g key={key}>
        {renderMasonry([nearX, nearY0], [farX, farY0], [nearX, nearY1], [farX, farY1], wallShade(depth), cellX, cellY, salt)}
        <polygon
          points={`${nearX},${nearY0} ${farX},${farY0} ${farX},${farY1} ${nearX},${nearY1}`}
          fill="none"
          stroke={EDGE_STROKE}
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // Doorway: a true black void plus an arched stone frame and a pair of
  // wall-mounted torches — a recognizable "passage here" symbol rather
  // than a subtle color/glow difference.
  const jambTopFrac = 0.28;
  const jamb: Pt[] = [
    [nearX, nearY1],
    [nearX, lerp(nearY0, nearY1, jambTopFrac)],
    [farX, lerp(farY0, farY1, jambTopFrac)],
    [farX, farY1],
  ];
  const archStart: Pt = [nearX, lerp(nearY0, nearY1, jambTopFrac)];
  const archEnd: Pt = [farX, lerp(farY0, farY1, jambTopFrac)];
  const archControl: Pt = [(nearX + farX) / 2, nearY0 - 6];
  const archPath = `M ${archStart[0]} ${archStart[1]} Q ${archControl[0]} ${archControl[1]} ${archEnd[0]} ${archEnd[1]}`;

  return (
    <g key={key}>
      <polygon points={jamb.map((p) => p.join(",")).join(" ")} fill={VOID_FILL} />
      <line
        x1={nearX}
        y1={nearY1}
        x2={nearX}
        y2={lerp(nearY0, nearY1, jambTopFrac)}
        stroke={EDGE_STROKE}
        strokeWidth={3}
      />
      <path d={archPath} fill="none" stroke={EDGE_STROKE} strokeWidth={3} />
      <path
        d={archPath}
        fill="none"
        stroke={DOORWAY_GLOW}
        strokeWidth={1.4}
        strokeOpacity={Math.max(0.35, 0.9 - depth * 0.22)}
        filter="url(#doorglow)"
      />
      {ironTorch(nearX, lerp(nearY0, nearY1, 0.34), Math.pow(SCALE, depth))}
      {ironTorch(farX, lerp(farY0, farY1, 0.3), Math.pow(SCALE, depth + 1))}
    </g>
  );
}

// A wall-mounted iron torch: a curled bracket and a layered flame, drawn
// as an actual flame silhouette rather than a plain glowing dot.
function ironTorch(x: number, y: number, scale: number): ReactNode {
  const r = Math.max(5, 7 * scale);
  return (
    <g key={`torch-${x}-${y}`}>
      <circle cx={x} cy={y - r * 0.6} r={r * 2.1} fill={DOORWAY_GLOW} opacity={0.22} filter="url(#doorglow)" />
      <path
        d={`M ${x} ${y + r * 1.1} q ${r * 0.9} -2 ${r * 0.2} -${r * 1.3}`}
        fill="none"
        stroke={IRON}
        strokeWidth={Math.max(1, r * 0.18)}
      />
      <circle cx={x} cy={y + r * 1.15} r={r * 0.22} fill={IRON} />
      {FLAME_COLORS.map((c, idx) => {
        const rr = r * (0.85 - idx * 0.28);
        const topY = y - r * 1.6 + idx * r * 0.5;
        return (
          <path
            key={c}
            d={`M ${x} ${topY} C ${x - rr} ${y - r * 0.6} ${x - rr * 0.6} ${y + r * 0.3} ${x} ${y + r * 0.5} C ${x + rr * 0.6} ${y + r * 0.3} ${x + rr} ${y - r * 0.6} ${x} ${topY} Z`}
            fill={c}
            filter={idx === 0 ? "url(#doorglow)" : undefined}
          />
        );
      })}
    </g>
  );
}

// A small treasure chest — wood body, gold trim and lock, and a domed
// lid — sitting on the floor, standing in for a plain gold star.
function renderTreasureChest(cx: number, cy: number, size: number): ReactNode {
  const w = size;
  const baseH = size * 0.5;
  const domeH = size * 0.32;
  const bottom = cy + size * 0.42;
  const baseTop = bottom - baseH;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const domePath = `M ${left} ${baseTop} Q ${cx} ${baseTop - domeH * 2} ${right} ${baseTop} Z`;
  const wood = "#5c3a21";
  const woodDark = "#3a2415";

  return (
    <g>
      <circle cx={cx} cy={cy} r={size * 0.9} fill={ITEM_COLOR} opacity={0.22} filter="url(#doorglow)" />
      <path d={domePath} fill={wood} stroke={woodDark} strokeWidth={1} />
      <rect
        x={left}
        y={baseTop}
        width={w}
        height={baseH}
        rx={w * 0.06}
        fill={wood}
        stroke={woodDark}
        strokeWidth={1}
      />
      <rect x={left} y={baseTop} width={w} height={baseH * 0.16} fill={ITEM_COLOR} opacity={0.9} />
      <rect x={left} y={baseTop} width={w * 0.14} height={baseH} fill={ITEM_COLOR} stroke="#8a6a1a" strokeWidth={0.6} />
      <rect
        x={right - w * 0.14}
        y={baseTop}
        width={w * 0.14}
        height={baseH}
        fill={ITEM_COLOR}
        stroke="#8a6a1a"
        strokeWidth={0.6}
      />
      <rect
        x={cx - w * 0.09}
        y={baseTop + baseH * 0.26}
        width={w * 0.18}
        height={baseH * 0.36}
        rx={w * 0.03}
        fill={ITEM_COLOR}
        stroke="#5c4413"
        strokeWidth={0.8}
      />
      <circle cx={cx} cy={baseTop + baseH * 0.42} r={w * 0.035} fill={woodDark} />
    </g>
  );
}
