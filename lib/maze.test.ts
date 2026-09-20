import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_CONFIGS,
  canMove,
  findActiveMonster,
  generateDungeon,
  generateTestDungeon,
  getViewSegments,
  leftOf,
  move,
  pointsEqual,
  rightOf,
} from "./maze";
import { Difficulty, Direction, Dungeon, TestDungeonKind } from "./types";

const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];
const DIFFICULTIES: Difficulty[] = ["small", "medium", "large"];

describe("leftOf / rightOf", () => {
  it("turning left then right returns to the original facing", () => {
    for (const dir of DIRECTIONS) {
      expect(rightOf(leftOf(dir))).toBe(dir);
      expect(leftOf(rightOf(dir))).toBe(dir);
    }
  });

  it("four left turns are a no-op", () => {
    for (const dir of DIRECTIONS) {
      expect(leftOf(leftOf(leftOf(leftOf(dir))))).toBe(dir);
    }
  });

  it("left and right are opposite turns", () => {
    expect(leftOf("N")).toBe("W");
    expect(rightOf("N")).toBe("E");
    expect(leftOf("E")).toBe("N");
    expect(rightOf("E")).toBe("S");
  });
});

describe("move / pointsEqual", () => {
  it("moves one cell in the given direction", () => {
    expect(move(2, 2, "N")).toEqual({ x: 2, y: 1 });
    expect(move(2, 2, "S")).toEqual({ x: 2, y: 3 });
    expect(move(2, 2, "E")).toEqual({ x: 3, y: 2 });
    expect(move(2, 2, "W")).toEqual({ x: 1, y: 2 });
  });

  it("compares points by coordinate, not identity", () => {
    expect(pointsEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(pointsEqual({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});

describe("canMove", () => {
  it("reflects whether a wall blocks the given direction", () => {
    const dungeon = generateTestDungeon("portal");
    expect(canMove(dungeon, 0, 0, "E")).toBe(true);
    expect(canMove(dungeon, 0, 0, "N")).toBe(false);
    expect(canMove(dungeon, 0, 0, "S")).toBe(false);
    expect(canMove(dungeon, 0, 0, "W")).toBe(false);
  });
});

describe("findActiveMonster", () => {
  it("finds a monster occupying the given cell", () => {
    const dungeon = generateTestDungeon("monster");
    const monster = findActiveMonster(dungeon, 1, 0, []);
    expect(monster).toBeDefined();
    expect(monster?.x).toBe(1);
    expect(monster?.y).toBe(0);
  });

  it("ignores monsters that have already been defeated", () => {
    const dungeon = generateTestDungeon("monster");
    const monster = findActiveMonster(dungeon, 1, 0, [{ x: 1, y: 0 }]);
    expect(monster).toBeUndefined();
  });

  it("returns undefined when no monster occupies the cell", () => {
    const dungeon = generateTestDungeon("monster");
    expect(findActiveMonster(dungeon, 0, 0, [])).toBeUndefined();
  });
});

describe("generateTestDungeon", () => {
  it("places a single monster in the target cell for monster kinds", () => {
    const kinds: TestDungeonKind[] = ["monster", "monster2", "monster3"];
    for (const kind of kinds) {
      const dungeon = generateTestDungeon(kind);
      expect(dungeon.monsters).toHaveLength(1);
      expect(dungeon.monsters[0]).toMatchObject({ x: 1, y: 0 });
      expect(dungeon.items).toHaveLength(0);
    }
  });

  it("places the exit in the target cell for portal kinds, with no monsters", () => {
    const kinds: TestDungeonKind[] = ["portal", "portal2", "portal3"];
    for (const kind of kinds) {
      const dungeon = generateTestDungeon(kind);
      expect(dungeon.exit).toEqual({ x: 1, y: 0 });
      expect(dungeon.monsters).toHaveLength(0);
    }
  });

  it("carves an open path from start to the target cell", () => {
    const dungeon = generateTestDungeon("monster");
    expect(canMove(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing)).toBe(true);
  });
});

// Distance from a point to every reachable cell, via BFS over the carved
// walls — used to assert maze connectivity properties below without
// duplicating generateDungeon's own internal BFS helper.
function bfsReachable(dungeon: Dungeon, from: { x: number; y: number }): Set<string> {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dir of DIRECTIONS) {
      if (!canMove(dungeon, cur.x, cur.y, dir)) continue;
      const next = move(cur.x, cur.y, dir);
      const key = `${next.x},${next.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe("generateDungeon", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces a fully connected ${difficulty} maze of the configured size`, () => {
      const dungeon = generateDungeon(difficulty);
      const config = DIFFICULTY_CONFIGS[difficulty];
      expect(dungeon.size).toBe(config.size);
      expect(dungeon.cells).toHaveLength(config.size);
      expect(dungeon.cells[0]).toHaveLength(config.size);

      const reachable = bfsReachable(dungeon, dungeon.start);
      expect(reachable.size).toBe(config.size * config.size);
    });

    it(`places the configured number of items and monsters for ${difficulty}, without overlap`, () => {
      const dungeon = generateDungeon(difficulty);
      const config = DIFFICULTY_CONFIGS[difficulty];
      expect(dungeon.items).toHaveLength(config.itemCount);
      expect(dungeon.monsters).toHaveLength(config.monsterCount);

      const occupied = new Map<string, number>();
      const points = [dungeon.start, dungeon.exit, ...dungeon.items, ...dungeon.monsters];
      for (const p of points) {
        const key = `${p.x},${p.y}`;
        occupied.set(key, (occupied.get(key) ?? 0) + 1);
      }
      for (const count of occupied.values()) {
        expect(count).toBe(1);
      }
    });

    it(`keeps the exit reachable from the start for ${difficulty}`, () => {
      const dungeon = generateDungeon(difficulty);
      const reachable = bfsReachable(dungeon, dungeon.start);
      expect(reachable.has(`${dungeon.exit.x},${dungeon.exit.y}`)).toBe(true);
    });
  }

  it("keeps every cell within bounds", () => {
    const dungeon = generateDungeon("small");
    for (const row of dungeon.cells) {
      for (const cell of row) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(dungeon.size);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeLessThan(dungeon.size);
      }
    }
  });
});

describe("getViewSegments", () => {
  it("stops at the first forward-blocking wall", () => {
    const dungeon = generateTestDungeon("portal");
    const segments = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[segments.length - 1].isEnd).toBe(true);
    for (const segment of segments.slice(0, -1)) {
      expect(segment.isEnd).toBe(false);
    }
  });

  it("flags the exit cell as isExit", () => {
    const dungeon = generateTestDungeon("portal");
    const segments = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing);
    const exitSegment = segments.find((s) => s.x === dungeon.exit.x && s.y === dungeon.exit.y);
    expect(exitSegment?.isExit).toBe(true);
  });

  it("reports an undefeated monster in view and hides it once defeated", () => {
    const dungeon = generateTestDungeon("monster");
    const withMonster = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing, [], []);
    const monsterSegment = withMonster.find((s) => s.x === dungeon.monsters[0].x && s.y === dungeon.monsters[0].y);
    expect(monsterSegment?.monster).toBe(dungeon.monsters[0].kind);

    const defeated = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing, [], [
      { x: dungeon.monsters[0].x, y: dungeon.monsters[0].y },
    ]);
    const clearedSegment = defeated.find((s) => s.x === dungeon.monsters[0].x && s.y === dungeon.monsters[0].y);
    expect(clearedSegment?.monster).toBeNull();
  });

  it("hides an item once it has been collected", () => {
    const dungeon: Dungeon = {
      ...generateTestDungeon("portal"),
      items: [{ x: 1, y: 0 }],
    };
    const uncollected = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing, []);
    expect(uncollected.find((s) => s.x === 1 && s.y === 0)?.hasItem).toBe(true);

    const collected = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing, [
      { x: 1, y: 0 },
    ]);
    expect(collected.find((s) => s.x === 1 && s.y === 0)?.hasItem).toBe(false);
  });

  it("never returns more segments than maxDepth", () => {
    const dungeon = generateDungeon("large");
    const segments = getViewSegments(dungeon, dungeon.start.x, dungeon.start.y, dungeon.startFacing, [], [], 3);
    expect(segments.length).toBeLessThanOrEqual(3);
  });
});
