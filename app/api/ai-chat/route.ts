import { NextResponse } from "next/server";
import { buildSystemPrompt, findTreatmentCards, findTreatmentFacts } from "@/lib/ai-chat";
import { chunksToFacts, searchVectors } from "@/lib/vector-search";

// POST /api/ai-chat — multi-provider chat for the AI tab.
// Chain: Groq first, then Gemini, then the client's scripted keyword
// replies. If one provider fails or hits its limit, the next takes over
// and the user never sees the difference.
//
// Retrieval is hybrid. Keyword facts (findTreatmentFacts) run first;
// when they come back empty, the message is embedded with
// gemini-embedding-001 (128 dims) and vector-searched against the
// prebuilt index (data/seed-embeddings.json, built by
// scripts/build-embeddings.py) so paraphrases and questions no keyword
// list covers still get grounded in real clinic prices. A `metro` in
// the request body prefers in-metro chunks. If the embedding call fails
// or GEMINI_API_KEY is missing, the chat proceeds with no facts, as
// before — the model then answers from general knowledge and is told
// not to invent prices.
//
// Groq (openai/gpt-oss-120b) goes first because it is fast (answers in
// seconds) and its free plan is generous: 1,000 requests and 200,000
// tokens a day, no credit card. Its key lives in GROQ_API_KEY.
//
// Gemini is the backup: gemini-3.5-flash first, gemini-3.8-flash as the
// fallback. gemini-2.5-flash is retired for new API keys — generateContent
// 404s with "no longer available to new users". 3.8-flash 503s under high
// demand. Gemini's free tier is also slow: a full grounded answer took
// ~19.5s in a direct test, so the per-attempt timeout must be well above
// 20s (the old 20s timeout aborted every live call). Answers are capped
// at 256 tokens to keep them short and fast. maxDuration 60 gives the
// attempts room to run.
//
// Keys live in Vercel env (server-only) and never reach the browser.
// Without any key the route answers 503 and the client falls back to its
// scripted keyword replies, so the chat still works.
export const maxDuration = 60;

const GROQ_MODEL = "openai/gpt-oss-120b";
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash"];
const GROQ_TIMEOUT_MS = 20000;
const GEMINI_TIMEOUT_MS = 45000;

type HistoryMsg = { role: "assistant" | "user"; text: string };

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function embedQuery(
  text: string,
  key: string,
  timeoutMs: number,
): Promise<number[] | null> {
  try {
    const res = await fetchWithTimeout(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          outputDimensionality: 128,
        }),
      },
      timeoutMs,
    );
    if (!res.ok) {
      console.error("POST /api/ai-chat embed error:", res.status);
      return null;
    }
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    return values && values.length === 128 ? values : null;
  } catch (err) {
    console.error("POST /api/ai-chat embed failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  // Trim: a key pasted with a trailing space/newline would be rejected.
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!groqKey && !geminiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { message, lang, history, report, metro } = body as {
    message?: unknown;
    lang?: unknown;
    history?: unknown;
    report?: unknown;
    metro?: unknown;
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

  let facts = findTreatmentFacts(message);
  // Structured cards for the chat UI — same grounding as the facts above,
  // cheapest first. The client renders them as treatment cards under the
  // answer; when no keyword matched there are no cards to show.
  const { cards } = findTreatmentCards(message);
  // One shared deadline for all attempts so the function stays inside
  // maxDuration. Every failure falls through to the next provider instead
  // of failing the chat.
  const deadline = Date.now() + 50000;
  const remaining = () => deadline - Date.now();

  // Semantic fallback: keyword facts missed, so embed the message and
  // search the clinic index. A metro in the request prefers in-metro
  // chunks; with no in-metro match it falls back to nationwide.
  if (facts.facts.length === 0 && geminiKey && remaining() > 17000) {
    const queryVec = await embedQuery(
      message,
      geminiKey,
      Math.min(15000, remaining()),
    );
    if (queryVec) {
      const metroStr = typeof metro === "string" && metro.trim() ? metro.trim() : undefined;
      const hits = searchVectors(queryVec, { metro: metroStr, topK: 5, minScore: 0.3 });
      if (hits.length > 0) {
        facts = chunksToFacts(hits);
      }
    }
  }

  const systemPrompt = buildSystemPrompt(
    language,
    facts,
    report && typeof report === "object" ? (report as never) : null,
  );

  // Groq first: OpenAI-compatible chat completions. Groq sits behind
  // Cloudflare, which blocks requests with a bot-like User-Agent (HTTP
  // 403 error code 1010), so send a plain one.
  if (groqKey && remaining() > 2000) {
    const messages = [
      { role: "system", content: systemPrompt },
      ...turns.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: message },
    ];
    try {
      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
            "User-Agent": "GlowSis/1.0",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 256,
          }),
        },
        Math.min(GROQ_TIMEOUT_MS, remaining()),
      );
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return NextResponse.json({ text: text.slice(0, 1200), cards });
        }
      } else {
        console.error("POST /api/ai-chat Groq error:", res.status);
      }
    } catch (err) {
      console.error("POST /api/ai-chat Groq fetch failed:", err);
    }
  }

  // Gemini backup.
  if (geminiKey) {
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
    for (const model of GEMINI_MODELS) {
      if (remaining() <= 2000) break;
      let res: Response;
      try {
        res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: payload,
          },
          Math.min(GEMINI_TIMEOUT_MS, remaining()),
        );
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
        continue;
      }
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        continue;
      }
      const parts = (
        data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      ).candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!parts) {
        continue;
      }
      return NextResponse.json({ text: parts.slice(0, 1200), cards });
    }
  }

  return NextResponse.json({ error: "ai_failed" }, { status: 502 });
}
