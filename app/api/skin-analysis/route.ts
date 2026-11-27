import { NextResponse } from "next/server";

// POST /api/skin-analysis — real skin analysis via Perfect Corp YouCam API.
// A scan takes about 2 minutes on Perfect Corp's side, longer than one
// serverless call can wait, so this is two steps:
//   POST: upload the photo (File API + presigned PUT) and create the task.
//         Returns { task_id } immediately.
//   GET ?task_id=...: poll Perfect Corp once. Returns { task_status:
//         "running" } while it works, the SkinReport when it succeeds, or
//         502 when it errors. The client polls GET every few seconds.
// The key lives in PERFECTCORP_API_KEY (Vercel, server-only) and never
// reaches the browser. Cost: 13 SD concerns = 16 units per scan. No
// Advanced Skin Report, so no extra 40 units. Without a key the route
// answers 503.
export const maxDuration = 60;

const BASE = "https://yce-api-01.makeupar.com";
const KEY = () => process.env.PERFECTCORP_API_KEY?.trim();

// SD actions, 13 concerns. Kept in one tier so the cost is a flat 16 units.
const ACTIONS = [
  "redness",
  "oiliness",
  "moisture",
  "texture",
  "pore",
  "radiance",
  "firmness",
  "acne",
  "wrinkle",
  "dark_circle_v2",
  "eye_bag",
  "age_spot",
  "skin_type",
];

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

type OutputEntry = {
  type?: string;
  ui_score?: number;
  score?: number;
  skin_type?: string;
  region?: string;
  [k: string]: unknown;
};

// results.output is an ARRAY, one entry per action, e.g.
// { type: "redness", ui_score: 77 }, { type: "all", score: 74.5 },
// { type: "skin_age", score: 45 } (years, not a 0-100 score),
// { type: "skin_type", skin_type: "Oily", region: "whole" }.
// A zone-nested entry (HD pore/wrinkle) has per-zone { ui_score } objects.
function scoreOf(entry: OutputEntry | undefined): number | null {
  if (!entry) return null;
  if (typeof entry.ui_score === "number") return entry.ui_score;
  const zones = Object.values(entry).filter(
    (v): v is Record<string, unknown> => !!v && typeof v === "object",
  );
  const scores = zones
    .map((z) => (typeof z.ui_score === "number" ? z.ui_score : null))
    .filter((n): n is number => n !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

const avg = (xs: (number | null)[]) => {
  const ns = xs.filter((n): n is number => n !== null);
  return ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : null;
};

function toReport(output: OutputEntry[]) {
  const byType = new Map<string, OutputEntry>();
  for (const e of output) {
    if (e.type && !byType.has(e.type)) byType.set(e.type, e);
  }
  const s = (k: string) => scoreOf(byType.get(k));
  const overallEntry = byType.get("all");
  const overall =
    typeof overallEntry?.score === "number"
      ? Math.round(overallEntry.score)
      : avg(ACTIONS.map((a) => s(a)));
  if (overall === null) return null;
  // Map the 13 concern scores onto the 4 radar dimensions. Higher = healthier.
  const sensitivity = s("redness") ?? 75;
  const skinTone = avg([s("radiance"), s("age_spot")]) ?? 75;
  const skinTexture = avg([s("texture"), s("pore"), s("wrinkle")]) ?? 75;
  const skinAge = avg([s("wrinkle"), s("firmness"), s("age_spot")]) ?? 75;
  // Top concerns: lowest scores first, using only keys the UI translates.
  const concernScores: { key: string; score: number }[] = [
    { key: "redness", score: s("redness") },
    { key: "pores", score: s("pore") },
    { key: "wrinkles", score: s("wrinkle") },
    { key: "acne", score: s("acne") },
    { key: "firmness", score: s("firmness") },
    { key: "dryness", score: s("moisture") },
    { key: "pigmentation", score: s("age_spot") },
    { key: "dark circles", score: s("dark_circle_v2") },
  ]
    .filter((c): c is { key: string; score: number } => c.score !== null)
    .sort((a, b) => a.score - b.score);
  // Perfect Corp gives no percentile, so the "better than" line mirrors
  // the overall score rather than inventing one.
  return {
    overall,
    dimensions: { sensitivity, skinTone, skinTexture, skinAge },
    concerns: concernScores.slice(0, 3).map((c) => c.key),
    betterThanPct: overall,
    analyzedAt: new Date().toISOString(),
    isPlaceholder: false,
  };
}

export async function POST(req: Request) {
  const key = KEY();
  if (!key) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) {
    return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  }
  if (photo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be under 10 MB." }, { status: 400 });
  }
  if (photo.type !== "image/jpeg" && photo.type !== "image/png") {
    return NextResponse.json({ error: "Photo must be JPEG or PNG." }, { status: 400 });
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    "User-Agent": "GlowSis/1.0",
  };
  try {
    // 1. Register the file, get a presigned PUT url + file_id.
    const metaRes = await fetchWithTimeout(
      `${BASE}/s2s/v2.0/file`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          files: [
            { content_type: photo.type, file_name: "selfie.jpg", file_size: photo.size },
          ],
        }),
      },
      15000,
    );
    if (!metaRes.ok) {
      console.error("POST /api/skin-analysis file API error:", metaRes.status);
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }
    const meta = (await metaRes.json()) as {
      data?: { files?: { file_id?: string; requests?: { url?: string; headers?: Record<string, string> }[] }[] };
    };
    const info = meta.data?.files?.[0];
    const putUrl = info?.requests?.[0]?.url;
    const fileId = info?.file_id;
    if (!putUrl || !fileId) {
      console.error("POST /api/skin-analysis file API: no upload url");
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }
    const putRes = await fetchWithTimeout(
      putUrl,
      {
        method: "PUT",
        headers: info.requests?.[0]?.headers ?? { "Content-Type": photo.type },
        body: photo,
      },
      20000,
    );
    if (!putRes.ok) {
      console.error("POST /api/skin-analysis presigned PUT error:", putRes.status);
      return NextResponse.json({ error: "upload_failed" }, { status: 502 });
    }

    // 2. Create the analysis task and hand the task_id back at once.
    const taskRes = await fetchWithTimeout(
      `${BASE}/s2s/v2.1/task/skin-analysis`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ src_file_id: fileId, dst_actions: ACTIONS, format: "json" }),
      },
      15000,
    );
    if (!taskRes.ok) {
      const text = await taskRes.text().catch(() => "");
      console.error("POST /api/skin-analysis task error:", taskRes.status, text.slice(0, 300));
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }
    const task = (await taskRes.json()) as { data?: { task_id?: string } };
    const taskId = task.data?.task_id;
    if (!taskId) {
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }
    return NextResponse.json({ task_id: taskId });
  } catch (err) {
    console.error("POST /api/skin-analysis failed:", err);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const key = KEY();
  if (!key) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const taskId = new URL(req.url).searchParams.get("task_id");
  if (!taskId) {
    return NextResponse.json({ error: "Missing task_id." }, { status: 400 });
  }
  try {
    const pollRes = await fetchWithTimeout(
      `${BASE}/s2s/v2.1/task/skin-analysis/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "User-Agent": "GlowSis/1.0",
        },
      },
      15000,
    );
    if (!pollRes.ok) {
      console.error("GET /api/skin-analysis poll error:", pollRes.status);
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }
    const poll = (await pollRes.json()) as {
      data?: {
        task_status?: string;
        error?: string;
        error_message?: string;
        results?: { output?: OutputEntry[] };
      };
    };
    const status = poll.data?.task_status;
    if (status === "error") {
      console.error(
        "GET /api/skin-analysis task failed:",
        taskId,
        poll.data?.error,
        poll.data?.error_message,
      );
      return NextResponse.json(
        { error: "analysis_failed", detail: poll.data?.error_message ?? poll.data?.error },
        { status: 502 },
      );
    }
    if (status !== "success") {
      return NextResponse.json({ task_status: "running" });
    }
    const output = poll.data?.results?.output ?? [];
    const report = toReport(output);
    if (!report) {
      console.error("GET /api/skin-analysis: no scores in output", output.length);
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }
    return NextResponse.json(report);
  } catch (err) {
    console.error("GET /api/skin-analysis failed:", err);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
