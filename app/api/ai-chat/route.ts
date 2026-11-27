import { NextResponse } from "next/server";
import { buildSystemPrompt, findTreatmentFacts } from "@/lib/ai-chat";

// POST /api/ai-chat — Gemini-backed chat for the AI tab.
// The API key lives in GEMINI_API_KEY (Vercel env, server-only) and never
// reaches the browser. Without a key the route answers 503 and the client
// falls back to its scripted keyword replies, so the chat still works.
//
// Models: gemini-3.5-flash first, gemini-3.8-flash as the fallback.
// gemini-2.5-flash is retired for new API keys — generateContent 404s with
// "no longer available to new users". 3.8-flash 503s under high demand, so
// 3.5-flash (which has answered every time) goes first.
//
// Free-tier generation is SLOW: a full grounded answer took ~19.5s in a
// direct test, so the per-attempt timeout must be well above 20s (the old
// 20s timeout aborted every live call and the chat always fell back to
// scripted replies). Answers are capped at 256 tokens to keep them short
// and fast. maxDuration 60 gives the two attempts room to run.
export const maxDuration = 60;

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash"];
const FETCH_TIMEOUT_MS = 45000;

type HistoryMsg = { role: "assistant" | "user"; text: string };

export async function POST(req: Request) {
  // Trim: a key pasted with a trailing space/newline would be rejected.
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { message, lang, history, report } = body as {
    message?: unknown;
    lang?: unknown;
    history?: unknown;
    report?: unknown;
  };
  if (typeof message !== "string" || !message.trim() || message.length > 1000) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }
  const language = lang === "zh" || lang === "ko" ? lang : "en";
  const turns: HistoryMsg[] = Array.isArray(history)
    ? (history as HistoryMsg[])
        .filter(
          (m) =>
            m &&
            (m.role === "assistant" || m.role === "user") &&
            typeof m.text === "string" &&
            m.text.trim(),
        )
        .slice(-6)
    : [];

  const facts = findTreatmentFacts(message);
  const systemPrompt = buildSystemPrompt(
    language,
    facts,
    report && typeof report === "object" ? (report as never) : null,
  );

  const contents = [
    ...turns.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
  });

  // One shared deadline for both attempts so the function stays inside
  // maxDuration. Try each model in order; a 503/overload on one falls
  // through to the next instead of failing the chat. Any other failure
  // fails fast.
  const deadline = Date.now() + 50000;
  for (const model of GEMINI_MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 2000) break;
    let res: Response;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(
        () => ctrl.abort(),
        Math.min(FETCH_TIMEOUT_MS, remaining),
      );
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: payload,
          signal: ctrl.signal,
        },
      );
      clearTimeout(timer);
    } catch (err) {
      console.error(`POST /api/ai-chat fetch failed (${model}):`, err);
      continue;
    }
    if (res.status === 503) {
      console.error(`POST /api/ai-chat overloaded (${model}), trying next model`);
      continue;
    }
    if (!res.ok) {
      console.error("POST /api/ai-chat Gemini error:", model, res.status);
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    const parts = (
      data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    ).candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!parts) {
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    return NextResponse.json({ text: parts.slice(0, 1200) });
  }
  return NextResponse.json({ error: "ai_failed" }, { status: 502 });
}
