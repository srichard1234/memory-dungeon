# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Memory Dungeon

A browser maze game (Next.js App Router, TypeScript, Tailwind) with a Neon-backed
Postgres leaderboard. `components/Game.tsx` is the central state machine — most gameplay
state lives there and flows down as props.

## Commands

- `npm run dev` — start the dev server (port 3000, or 3100+ if that's taken — see
  `.claude/launch.json` → `memory-dungeon-dev`, which uses `autoPort`)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit` — typecheck

No automated test suite exists. Verify changes with `npx tsc --noEmit` plus manual
checks against the dev server.

## Architecture

### Game state machine
`components/Game.tsx` owns nearly all gameplay state — phase, dungeon, player
position/facing, collected items, defeated monsters, the active puzzle, step count,
and leaderboard-submission state — and passes it down as props to presentational
children:
- `DungeonView` — first-person corridor view for the current cell/facing
- `Compass`, `StatusBar`, `Controls`, `HelpMap` — playing-phase HUD/chrome
- `SimonPuzzle` — memory-sequence puzzle blocking a monster's cell until solved
- `TileMatchPuzzle` — memory tile-match puzzle gating the exit portal
- `StartScreen` / `WinScreen` / `Leaderboard` — the other top-level phases
- `UpdateBanner` — polls `/api/version` (`lib/useVersionCheck.ts`) to prompt a reload
  when the deployed build has moved on from an already-open tab

`phase` (`"start" | "playing" | "win"`) drives which top-level view renders;
`difficulty` and `isTestGame` travel alongside it to size puzzles and gate
score/leaderboard writes (see Test dungeons below).

### Maze generation & movement
`lib/maze.ts` holds `DIFFICULTY_CONFIGS` (grid size, item/monster counts, puzzle
lengths per difficulty), dungeon generation (`generateDungeon`, `generateTestDungeon`),
and movement/turn helpers (`canMove`, `move`, `leftOf`/`rightOf`, `findActiveMonster`).
A monster occupies its cell like a wall — `attemptMove` in `Game.tsx` intercepts a step
into a live monster's cell and opens `SimonPuzzle` instead of completing the move.
`lib/types.ts` defines the shared domain types (`Dungeon`, `Cell`, `Direction`,
`Monster`, etc.).

### API routes
- `GET/POST /api/scores` — leaderboard read/write, see Leaderboard model below
- `GET /api/version` — returns the deployed `package.json` version with `no-store`, so
  `UpdateBanner` can detect a stale open tab

### Security headers
`next.config.ts` sets a strict CSP and related headers (`X-Frame-Options: DENY`, HSTS,
etc.) on every response via `headers()`. Adding any external script, font, image, or
fetch target requires updating the matching `connect-src`/`script-src`/etc. directive
too, or it will be silently blocked in production.

## Database access — Neon via plain Postgres

The database is Neon Postgres, provisioned through a Vercel Marketplace integration
(resource name `memory-dungeon`, which is why its env vars carry a
`MEMORY_DUNEGON_` prefix — a typo baked into the provisioned names, not ours to fix).
The app never uses `@neondatabase/serverless` or any Neon-specific client — `lib/db.ts`
opens a single reused TCP connection via the `postgres` npm package straight to
Postgres, using the pooled connection string in `MEMORY_DUNEGON_POSTGRES_URL`. Neon has
no auto-generated REST API, so (unlike the previous Supabase setup) there's no RLS
workaround needed to protect these tables from an external API layer.

The `MEMORY_DUNEGON_*` env vars are provisioned only for the Preview and Production
Vercel environments, not Development, and several of them (including
`MEMORY_DUNEGON_POSTGRES_URL`) are marked **Sensitive** in Vercel — once set, their
real value can never be read back via `vercel env pull`, `vercel env ls`, or the
dashboard, by anyone, including the project owner. For local development, the real
value has to come from the Neon console or the Vercel dashboard's env var edit view and
be pasted into `.env.local` by hand; it cannot be fetched via the CLI.

`db/schema.sql` is the only source of truth for schema; there's no migrations folder.
A Supabase MCP server may still be available in this session for the old project — it's
only useful now for historical/export access to pre-migration data, not live app data.

## Leaderboard model

One row per `(difficulty, name)`, enforced by a unique index. `POST /api/scores` does an
atomic upsert (`ON CONFLICT ... WHERE scores.steps > excluded.steps`) — a resubmission
only replaces the row if it's a *strict* improvement; ties don't count. This exists
because players resubmitting under the same name used to fill the visible top 10 with
their own stale runs.

Two separate "best score" concepts — don't conflate them:
- **Server personal best** (`fetchPersonalBest` in `lib/leaderboard.ts`): the player's
  actual submitted leaderboard row for that difficulty, keyed by name. Drives whether
  the "you made the leaderboard!" prompt shows and the "New best score!" badge.
- **Local best** (`lib/storage.ts`, `localStorage` key `memory-dungeon-best-scores`):
  a per-browser stat tracking every run regardless of leaderboard participation. Drives
  the start screen and the "Your best for this difficulty: N steps" fallback text.
  Intentionally independent of the server — don't try to unify them.

`qualifiesForLeaderboard()` on the client is only a hint for showing the name-entry
form; the server is the real gate and can still reject with `"not a new best"`.

## Test dungeons

`?test=<kind>` query params (or dev-only Start Screen buttons) load fixed layouts for
exercising a single monster/portal encounter. They must never write to local best
scores or hit the leaderboard — see the `isTestGame` gate in `Game.tsx`.

## Build/tooling quirks

- A **local, unversioned** `.git/hooks/pre-push` bumps the build number
  (`package.json` patch version) and creates an extra commit on every push. It won't
  exist after a fresh clone — don't assume it's there, and don't manually bump the
  version yourself.
- `.env.local` holds the real Neon DB password/connection strings (plus leftover,
  unused Supabase keys from before the migration) — never echo, log, or commit its
  contents.
