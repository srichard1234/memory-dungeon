export type Direction = "N" | "E" | "S" | "W";

export type Difficulty = "small" | "medium" | "large";

export type TestDungeonKind = "monster" | "portal";

export type MonsterKind = "slime" | "boo" | "toadle" | "flutterling" | "whisk" | "blinky" | "emberling";

export interface DifficultyConfig {
  size: number;
  itemCount: number;
  label: string;
  monsterCount: number;
  simonLength: number; // Simon Says sequence length for monster encounters
  tilePairs: number; // pairs in the exit's memory tile-match puzzle
}

export interface Walls {
  N: boolean;
  E: boolean;
  S: boolean;
  W: boolean;
}

export interface Cell {
  x: number;
  y: number;
  walls: Walls; // true = wall present (blocked)
}

export interface Point {
  x: number;
  y: number;
}

export interface Monster extends Point {
  kind: MonsterKind;
}

export interface Dungeon {
  size: number;
  cells: Cell[][]; // cells[y][x]
  start: Point;
  startFacing: Direction;
  items: Point[];
  monsters: Monster[];
  exit: Point;
}

export interface ViewSegment {
  x: number; // absolute dungeon cell this segment represents
  y: number;
  hasLeftOpening: boolean;
  hasRightOpening: boolean;
  isEnd: boolean; // forward is blocked at this depth, draw an end wall
  hasItem: boolean;
  isExit: boolean;
  monster: MonsterKind | null;
}

export interface BestScores {
  small?: number;
  medium?: number;
  large?: number;
}

export interface LeaderboardEntry {
  name: string;
  steps: number;
  created_at: string;
}
