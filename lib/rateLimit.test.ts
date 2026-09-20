import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { hashClientIp, isSameOrigin } from "./rateLimit";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://example.com/api/scores", { headers });
}

describe("isSameOrigin", () => {
  it("allows requests with no Origin header (non-browser clients)", () => {
    expect(isSameOrigin(makeRequest({ host: "example.com" }))).toBe(true);
  });

  it("allows a same-origin request", () => {
    expect(isSameOrigin(makeRequest({ origin: "https://example.com", host: "example.com" }))).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    expect(isSameOrigin(makeRequest({ origin: "https://evil.com", host: "example.com" }))).toBe(false);
  });

  it("rejects a malformed Origin header instead of throwing", () => {
    expect(isSameOrigin(makeRequest({ origin: "not-a-url", host: "example.com" }))).toBe(false);
  });
});

describe("hashClientIp", () => {
  it("hashes to a stable, deterministic sha256 hex digest", () => {
    const a = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" }));
    const b = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" }));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different IPs", () => {
    const a = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" }));
    const b = hashClientIp(makeRequest({ "x-forwarded-for": "5.6.7.8" }));
    expect(a).not.toBe(b);
  });

  it("uses only the first address in a forwarded chain", () => {
    const chained = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" }));
    const direct = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" }));
    expect(chained).toBe(direct);
  });

  it("falls back to x-real-ip, then a constant when neither header is present", () => {
    const realIp = hashClientIp(makeRequest({ "x-real-ip": "1.2.3.4" }));
    const direct = hashClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" }));
    expect(realIp).toBe(direct);

    const unknown = hashClientIp(makeRequest({}));
    expect(unknown).toMatch(/^[0-9a-f]{64}$/);
  });
});
