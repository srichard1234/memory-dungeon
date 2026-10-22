import postgres from "postgres";

// Reused across requests/route invocations rather than opening a new
// connection per call. MEMORY_DUNEGON_POSTGRES_URL is the pooled connection
// string the Neon Vercel integration provisions (mirrors the old Vercel
// Postgres naming convention for drop-in compatibility).
const sql = postgres(process.env.MEMORY_DUNEGON_POSTGRES_URL!);

export default sql;
