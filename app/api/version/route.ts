import { NextResponse } from "next/server";
import { VERSION } from "@/lib/version";

// Always re-read the currently-deployed version rather than a cached
// response, so an already-open tab can detect that the server has moved
// on to a newer build.
export async function GET() {
  return NextResponse.json({ version: VERSION }, { headers: { "Cache-Control": "no-store" } });
}
