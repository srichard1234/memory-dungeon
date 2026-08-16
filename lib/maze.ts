import {
  Cell,
  Difficulty,
  DifficultyConfig,
  Direction,
  Dungeon,
  Monster,
  MonsterKind,
  Point,
  TestDungeonKind,
  ViewSegment,
} from "./types";

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  small: { size: 6, itemCount: 3, label: "Small", monsterCount: 3, simonLength: 4, tilePairs: 4 },
  medium: { size: 9, itemCount: 5, label: "Medium", monsterCount: 5, simonLength: 6, tilePairs: 6 },
  large: { size: 13, itemCount: 8, label: "Large", monsterCount: 7, simonLength: 8, tilePairs: 8 },
};

// Dev/test dungeons (`?test=` on the start screen) name their difficulty by
// suffix — "monster"/"portal" is small, "2" is medium, "3" is large — so the
// puzzle they trigger is sized like the real difficulty being exercised.
export const TEST_DUNGEON_DIFFICULTY: Record<TestDungeonKind, Difficulty> = {
  monster: "small",
  monster2: "medium",
  monster3: "large",
  portal: "small",
  portal2: "medium",
  portal3: "large",
};

const MONSTER_KINDS: MonsterKind[] = [
  "slime",
  "boo",
  "toadle",
  "flutterling",
  "whisk",
  "blinky",
  "emberling",
  "frostling",
];

const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];

const DELTA: Record<Direction, Point> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = { N: "S", S: "N", E: "W", W: "E" };

// Counter-clockwise order, used to compute the facing after turning left.
const CCW_ORDER: Direction[] = ["N", "W", "S", "E"];
// Clockwise order, used to compute the facing after turning right.
const CW_ORDER: Direction[] = ["N", "E", "S", "W"];

export function leftOf(dir: Direction): Direction {
  return CCW_ORDER[(CCW_ORDER.indexOf(dir) + 1) % 4];
}

export function rightOf(dir: Direction): Direction {
  return CW_ORDER[(CW_ORDER.indexOf(dir) + 1) % 4];
}

export function compassLabel(dir: Direction): string {
  return { N: "North", E: "East", S: "South", W: "West" }[dir];
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function inBounds(size: number, x: number, y: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}

function createGrid(size: number): Cell[][] {
  const cells: Cell[][] = [];
  for (let y = 0; y < size; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < size; x++) {
      row.push({ x, y, walls: { N: true, E: true, S: true, W: true } });
    }
    cells.push(row);
  }
  return cells;
}

// Randomized depth-first search (recursive backtracker), run iteratively
// with an explicit stack so grid size can't blow the call stack. Produces a
// "perfect" maze: every cell reachable, exactly one path between any two.
function carveMaze(size: number, cells: Cell[][], startX: number, startY: number): void {
  const visited = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const stack: Point[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const next = shuffle(DIRECTIONS)
      .map((dir) => ({ dir, x: current.x + DELTA[dir].x, y: current.y + DELTA[dir].y }))
      .find((n) => inBounds(size, n.x, n.y) && !visited[n.y][n.x]);

    if (!next) {
      stack.pop();
      continue;
    }

    cells[current.y][current.x].walls[next.dir] = false;
    cells[next.y][next.x].walls[OPPOSITE[next.dir]] = false;
    visited[next.y][next.x] = true;
    stack.push({ x: next.x, y: next.y });
  }
}

function bfsDistances(size: number, cells: Cell[][], from: Point): number[][] {
  const dist = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  dist[from.y][from.x] = 0;
  const queue: Point[] = [from];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cell = cells[cur.y][cur.x];
    for (const dir of DIRECTIONS) {
      if (cell.walls[dir]) continue;
      const nx = cur.x + DELTA[dir].x;
      const ny = cur.y + DELTA[dir].y;
      if (dist[ny][nx] === -1) {
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return dist;
}

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function generateDungeon(difficulty: Difficulty): Dungeon {
  const { size, itemCount, monsterCount } = DIFFICULTY_CONFIGS[difficulty];
  const cells = createGrid(size);

  const start: Point = { x: randInt(size), y: randInt(size) };
  carveMaze(size, cells, start.x, start.y);

  const allCells: Point[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) allCells.push({ x, y });

  const distFromStart = bfsDistances(size, cells, start);

  // Exit sits among the farthest ~10% of cells from the start, chosen at
  // random within that group so the exit isn't always in the same spot.
  const sortedByStartDist = [...allCells].sort(
    (a, b) => distFromStart[b.y][b.x] - distFromStart[a.y][a.x],
  );
  const topCount = Math.max(1, Math.floor(allCells.length * 0.1));
  const exit = sortedByStartDist[randInt(topCount)];

  const distFromExit = bfsDistances(size, cells, exit);

  const selectedDistGrids: number[][][] = [distFromStart, distFromExit];
  const excluded = new Set<string>([pointKey(start), pointKey(exit)]);

  // Greedy farthest-point sampling: each item goes at the cell that
  // maximizes its minimum distance to the start, the exit, and every
  // previously placed item, so items end up spread across the dungeon
  // rather than clustered together.
  const items: Point[] = [];
  for (let i = 0; i < itemCount; i++) {
    let best: Point | null = null;
    let bestScore = -1;
    for (const p of allCells) {
      if (excluded.has(pointKey(p))) continue;
      let minDist = Infinity;
      for (const grid of selectedDistGrids) {
        minDist = Math.min(minDist, grid[p.y][p.x]);
      }
      if (minDist > bestScore) {
        bestScore = minDist;
        best = p;
      }
    }
    if (!best) break;
    items.push(best);
    excluded.add(pointKey(best));
    selectedDistGrids.push(bfsDistances(size, cells, best));
  }

  // Monsters use the same farthest-point sampling as items, so they end up
  // spaced apart from the start, exit, items, and each other.
  const monsters: Monster[] = [];
  for (let i = 0; i < monsterCount; i++) {
    let best: Point | null = null;
    let bestScore = -1;
    for (const p of allCells) {
      if (excluded.has(pointKey(p))) continue;
      let minDist = Infinity;
      for (const grid of selectedDistGrids) {
        minDist = Math.min(minDist, grid[p.y][p.x]);
      }
      if (minDist > bestScore) {
        bestScore = minDist;
        best = p;
      }
    }
    if (!best) break;
    monsters.push({ x: best.x, y: best.y, kind: MONSTER_KINDS[randInt(MONSTER_KINDS.length)] });
    excluded.add(pointKey(best));
    selectedDistGrids.push(bfsDistances(size, cells, best));
  }

  const startFacing: Direction = DIRECTIONS[randInt(4)];

  return { size, cells, start, startFacing, items, monsters, exit };
}

// A minimal two-room dungeon for quickly testing a single monster or exit
// portal interaction, without generating and exploring a full maze: a start
// room with a straight-on view into a second room holding just the thing
// under test.
export function generateTestDungeon(kind: TestDungeonKind): Dungeon {
  const size = 2;
  const cells = createGrid(size);
  cells[0][0].walls.E = false;
  cells[0][1].walls.W = false;

  const start: Point = { x: 0, y: 0 };
  const target: Point = { x: 1, y: 0 };
  const startFacing: Direction = "E";
  // A cell the carved corridor never opens into, used as a harmless
  // placeholder exit when this dungeon isn't testing the portal itself.
  const unreachable: Point = { x: 1, y: 1 };

  if (kind.startsWith("monster")) {
    return {
      size,
      cells,
      start,
      startFacing,
      items: [],
      monsters: [{ x: target.x, y: target.y, kind: MONSTER_KINDS[randInt(MONSTER_KINDS.length)] }],
      exit: unreachable,
    };
  }

  return {
    size,
    cells,
    start,
    startFacing,
    items: [],
    monsters: [],
    exit: target,
  };
}

export function canMove(dungeon: Dungeon, x: number, y: number, dir: Direction): boolean {
  return !dungeon.cells[y][x].walls[dir];
}

export function move(x: number, y: number, dir: Direction): Point {
  return { x: x + DELTA[dir].x, y: y + DELTA[dir].y };
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function findActiveMonster(
  dungeon: Dungeon,
  x: number,
  y: number,
  defeatedMonsters: Point[],
): Monster | undefined {
  return dungeon.monsters.find(
    (m) => m.x === x && m.y === y && !defeatedMonsters.some((d) => pointsEqual(d, m)),
  );
}

export { OPPOSITE };

// Walks up to `maxDepth` cells forward from (x, y) facing `facing`,
// describing each cell along the way so the view can render a corridor
// that recedes into the distance with side openings and items visible
// down the hall, stopping as soon as a forward wall blocks the view.
export function getViewSegments(
  dungeon: Dungeon,
  x: number,
  y: number,
  facing: Direction,
  collectedItems: Point[] = [],
  defeatedMonsters: Point[] = [],
  maxDepth = 3,
): ViewSegment[] {
  const segments: ViewSegment[] = [];
  let cx = x;
  let cy = y;
  const left = leftOf(facing);
  const right = rightOf(facing);

  for (let depth = 0; depth < maxDepth; depth++) {
    const cell = dungeon.cells[cy][cx];
    const hasLeftOpening = !cell.walls[left];
    const hasRightOpening = !cell.walls[right];
    const hasItem =
      dungeon.items.some((it) => it.x === cx && it.y === cy) &&
      !collectedItems.some((it) => it.x === cx && it.y === cy);
    const isExit = pointsEqual(dungeon.exit, { x: cx, y: cy });
    const blockedAhead = cell.walls[facing];
    const activeMonster = dungeon.monsters.find(
      (m) => m.x === cx && m.y === cy && !defeatedMonsters.some((d) => d.x === cx && d.y === cy),
    );

    segments.push({
      x: cx,
      y: cy,
      hasLeftOpening,
      hasRightOpening,
      isEnd: blockedAhead,
      hasItem,
      isExit,
      monster: activeMonster ? activeMonster.kind : null,
    });

    if (blockedAhead) break;
    cx += DELTA[facing].x;
    cy += DELTA[facing].y;
  }

  return segments;
}
