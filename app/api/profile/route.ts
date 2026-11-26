import { NextResponse } from "next/server";
import { saveUserProfile, usingPostgres } from "@/lib/store";

// POST /api/profile — server backup of a signed-in user's skin profile.
// localStorage is the source of truth; if Postgres isn't configured this
// endpoint just reports that (the client already saved locally).
// (POST routes are dynamic by default; no `dynamic` export needed.)

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_id is required" }, { status: 400 });
    }
    if (!usingPostgres()) {
      return NextResponse.json({ ok: false, error: "database not configured" }, { status: 503 });
    }
    await saveUserProfile({
      user_id: userId,
      concerns: Array.isArray(body.concerns) ? (body.concerns as string[]) : [],
      skin_type: typeof body.skinType === "string" ? body.skinType : "",
      city: typeof body.city === "string" ? body.city : "",
      budget: typeof body.budget === "string" ? body.budget : "",
      skin_report: body.skinReport ?? null,
      onboarded: body.onboarded === true,
      source: typeof body.source === "string" ? body.source : "",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/profile failed:", e);
    return NextResponse.json({ ok: false, error: "failed to save profile" }, { status: 500 });
  }
}
