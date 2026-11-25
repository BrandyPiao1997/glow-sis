import { NextResponse, connection } from "next/server";
import { getDatabaseUrl, usingPostgres } from "@/lib/store";
import { Pool } from "pg";

export async function GET() {
  await connection();
  const url = getDatabaseUrl();
  let host = "";
  try {
    if (url) host = new URL(url).host;
  } catch {
    host = "unparsable";
  }
  if (!usingPostgres() || !url) {
    return NextResponse.json({ ok: false, usingPostgres: false, databaseUrlSet: false, host });
  }
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("sslmode=require") || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await pool.query("SELECT 1");
    await pool.end();
    return NextResponse.json({ ok: true, usingPostgres: true, databaseUrlSet: true, host });
  } catch (err) {
    await pool.end().catch(() => {});
    return NextResponse.json({ ok: false, usingPostgres: true, databaseUrlSet: true, host, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
