import postgres from "postgres";

// Reused across requests/route invocations rather than opening a new
// connection per call.
const sql = postgres(process.env.POSTGRES_URL!);

export default sql;
