@AGENTS.md

# Memory Dungeon

A browser maze game (Next.js App Router, TypeScript, Tailwind) with a Supabase-backed
Postgres leaderboard. `components/Game.tsx` is the central state machine — most gameplay
state lives there and flows down as props.

## Database access — no supabase-js

The app never uses the Supabase JS client or its REST API. `lib/db.ts` opens a single
reused connection via the `postgres` npm package straight to Postgres, authenticated as
the `postgres` role (see `POSTGRES_URL`). Row Level Security is enabled on `scores` and
`score_submission_attempts` with **no policies** — this is intentional: it blocks
Supabase's auto-generated REST API from touching these tables, while the app's direct
connection is unaffected because `postgres` owns the tables and RLS doesn't restrict an
unforced table owner. If you ever see `FORCE ROW LEVEL SECURITY` mentioned or table
ownership changes, re-verify `/api/scores` still works — that assumption is why it works.

`supabase/schema.sql` is the only source of truth for schema; there's no migrations
folder. A Supabase MCP server may be available in this session — check the tool list;
if so, prefer `execute_sql`/`apply_migration`/`get_advisors` over asking the user to
paste SQL into the dashboard.

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
- No automated test suite exists. Verify changes with `npx tsc --noEmit` plus manual
  checks against the dev server (`.claude/launch.json` → `memory-dungeon-dev`, port
  3000 with `autoPort`, so it may come up on 3100+ if something's already running).
- `.env.local` holds real Supabase service-role keys and DB passwords — never echo,
  log, or commit its contents.
