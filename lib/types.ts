export type Direction = "N" | "E" | "S" | "W";

export type Difficulty = "small" | "medium" | "large";

export interface DifficultyConfig {
  size: number;
  itemCount: number;
  label: string;
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

export interface Dungeon {
  size: number;
  cells: Cell[][]; // cells[y][x]
  start: Point;
  startFacing: Direction;
  items: Point[];
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
}

export interface BestScores {
  small?: number;
  medium?: number;
  large?: number;
}
