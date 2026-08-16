import { createHash } from "crypto";
import { NextRequest } from "next/server";
import sql from "./db";

export const RATE_LIMIT_WINDOW_MINUTES = 5;
export const RATE_LIMIT_MAX_REQUESTS = 8;

// Only same-origin requests should reach state-changing routes. Browsers set
// this header on POSTs and don't let script forge it; non-browser clients
// (curl, server-to-server) simply omit it, so a missing header is allowed.
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function hashClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : (request.headers.get("x-real-ip") ?? "unknown");
  return createHash("sha256").update(ip).digest("hex");
}

// Records this attempt and reports whether the caller is over the rolling
// window limit. Every attempt counts, valid or not, so malformed-payload
// spam gets throttled too.
export async function checkRateLimit(ipHash: string): Promise<boolean> {
  const rows = await sql`
    select count(*)::int as count
    from score_submission_attempts
    where ip_hash = ${ipHash}
      and created_at > now() - make_interval(mins => ${RATE_LIMIT_WINDOW_MINUTES})
  `;
  const count = rows[0]?.count as number;
  if (count >= RATE_LIMIT_MAX_REQUESTS) return false;

  await sql`insert into score_submission_attempts (ip_hash) values (${ipHash})`;

  // Opportunistic cleanup so the table doesn't grow unbounded — no cron
  // infra here, so just occasionally sweep stale rows on a live request.
  if (Math.random() < 0.05) {
    await sql`
      delete from score_submission_attempts
      where created_at < now() - make_interval(mins => ${RATE_LIMIT_WINDOW_MINUTES * 3})
    `;
  }

  return true;
}
