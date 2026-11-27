import { NextResponse } from "next/server";
import { buildSystemPrompt, findTreatmentFacts } from "@/lib/ai-chat";

// POST /api/ai-chat — Gemini-backed chat for the AI tab.
// The API key lives in GEMINI_API_KEY (Vercel env, server-only) and never
// reaches the browser. Without a key the route answers 503 and the client
// falls back to its scripted keyword replies, so the chat still works.
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type HistoryMsg = { role: "assistant" | "user"; text: string };

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
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

  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    console.error("POST /api/ai-chat fetch failed:", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
  if (!res.ok) {
    console.error("POST /api/ai-chat Gemini error:", res.status);
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
