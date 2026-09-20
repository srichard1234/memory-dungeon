import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { sqlMock, setNextResult } = vi.hoisted(() => {
  let nextResult: unknown[] = [];
  const sqlMock = vi.fn(() => Promise.resolve(nextResult));
  return {
    sqlMock,
    setNextResult: (rows: unknown[]) => {
      nextResult = rows;
    },
  };
});

vi.mock("@/lib/db", () => ({ default: sqlMock }));

vi.mock("@/lib/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rateLimit")>();
  return { ...actual, checkRateLimit: vi.fn().mockResolvedValue(true) };
});

const { GET, POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rateLimit");

function get(query: string): NextRequest {
  return new NextRequest(`https://example.com/api/scores${query}`, {
    headers: { host: "example.com" },
  });
}

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://example.com/api/scores", {
    method: "POST",
    headers: { host: "example.com", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  sqlMock.mockClear();
  setNextResult([]);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
});

describe("GET /api/scores", () => {
  it("rejects an invalid difficulty", async () => {
    const res = await GET(get("?difficulty=impossible"));
    expect(res.status).toBe(400);
  });

  it("returns the top scores for a valid difficulty", async () => {
    const rows = [{ name: "AAA", steps: 10, created_at: "2026-01-01" }];
    setNextResult(rows);
    const res = await GET(get("?difficulty=small"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ scores: rows });
  });

  it("returns steps: null for a name query without touching the database when the name is empty", async () => {
    const res = await GET(get("?difficulty=small&name=123"));
    expect(sqlMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({ steps: null });
  });

  it("looks up a specific player's steps by normalized name", async () => {
    setNextResult([{ steps: 7 }]);
    const res = await GET(get("?difficulty=small&name=abc"));
    await expect(res.json()).resolves.toEqual({ steps: 7 });
  });

  it("returns steps: null when the named player has no row", async () => {
    setNextResult([]);
    const res = await GET(get("?difficulty=small&name=abc"));
    await expect(res.json()).resolves.toEqual({ steps: null });
  });
});

describe("POST /api/scores", () => {
  it("rejects a cross-origin request before touching rate limiting or the database", async () => {
    const res = await POST(post({ difficulty: "small", name: "ABC", steps: 10 }, { origin: "https://evil.com" }));
    expect(res.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("rejects when the caller is over the rate limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);
    const res = await POST(post({ difficulty: "small", name: "ABC", steps: 10 }));
    expect(res.status).toBe(429);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid difficulty", async () => {
    const res = await POST(post({ difficulty: "nope", name: "ABC", steps: 10 }));
    expect(res.status).toBe(400);
  });

  it.each([
    ["non-integer", 1.5],
    ["zero", 0],
    ["negative", -1],
    ["absurdly large", 999999],
  ])("rejects %s steps", async (_label, steps) => {
    const res = await POST(post({ difficulty: "small", name: "ABC", steps }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid steps" });
  });

  it("rejects a name that normalizes to empty", async () => {
    const res = await POST(post({ difficulty: "small", name: "123", steps: 10 }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid name" });
  });

  it("rejects a profane name", async () => {
    const res = await POST(post({ difficulty: "small", name: "fuck", steps: 10 }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "name not allowed" });
  });

  it("inserts and returns ok when the upsert affects a row", async () => {
    setNextResult([{ id: 1 }]);
    const res = await POST(post({ difficulty: "small", name: "ABC", steps: 10 }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("returns 409 when the upsert is filtered out (not a new best)", async () => {
    setNextResult([]);
    const res = await POST(post({ difficulty: "small", name: "ABC", steps: 10 }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "not a new best" });
  });
});
