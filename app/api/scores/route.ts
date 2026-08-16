import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { DIFFICULTY_CONFIGS } from "@/lib/maze";
import { LEADERBOARD_SIZE, normalizeName } from "@/lib/leaderboard";
import { isProfane } from "@/lib/profanity";
import type { Difficulty } from "@/lib/types";

const DIFFICULTIES: Difficulty[] = ["small", "medium", "large"];

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const difficulty = request.nextUrl.searchParams.get("difficulty");
  if (!isDifficulty(difficulty)) {
    return NextResponse.json({ error: "invalid difficulty" }, { status: 400 });
  }

  const rows = await sql`
    select name, steps, created_at from scores
    where difficulty = ${difficulty}
    order by steps asc, created_at asc
    limit ${LEADERBOARD_SIZE}
  `;
  return NextResponse.json({ scores: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { difficulty, name, steps } = (body ?? {}) as Record<string, unknown>;

  if (!isDifficulty(difficulty)) {
    return NextResponse.json({ error: "invalid difficulty" }, { status: 400 });
  }

  const maxSteps = DIFFICULTY_CONFIGS[difficulty].size ** 2 * 50;
  if (typeof steps !== "number" || !Number.isInteger(steps) || steps <= 0 || steps > maxSteps) {
    return NextResponse.json({ error: "invalid steps" }, { status: 400 });
  }

  const normalizedName = typeof name === "string" ? normalizeName(name) : "";
  if (!normalizedName) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }
  if (isProfane(normalizedName)) {
    return NextResponse.json({ error: "name not allowed" }, { status: 400 });
  }

  await sql`insert into scores (difficulty, name, steps) values (${difficulty}, ${normalizedName}, ${steps})`;
  return NextResponse.json({ ok: true });
}
