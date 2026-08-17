import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { DIFFICULTY_CONFIGS } from "@/lib/maze";
import { LEADERBOARD_SIZE, normalizeName } from "@/lib/leaderboard";
import { isProfane } from "@/lib/profanity";
import { checkRateLimit, hashClientIp, isSameOrigin } from "@/lib/rateLimit";
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
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const withinLimit = await checkRateLimit(hashClientIp(request));
  if (!withinLimit) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

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

  // Upsert on (difficulty, name): a player keeps only one row per
  // difficulty, and it's only replaced when the new run beats their
  // existing best. The WHERE clause makes this atomic against races.
  const inserted = await sql`
    insert into scores (difficulty, name, steps)
    values (${difficulty}, ${normalizedName}, ${steps})
    on conflict (difficulty, name)
    do update set steps = excluded.steps, created_at = excluded.created_at
    where scores.steps > excluded.steps
    returning id
  `;
  if (inserted.length === 0) {
    return NextResponse.json({ error: "not a new best" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
