"use client";

import { useEffect, useRef, useState } from "react";
import { dicts, type Dict } from "@/lib/i18n";
import { SiteHeader, useSavedLang } from "@/components/site";
import { loadSkinReport, type SkinReport } from "@/lib/skin-analysis";
import { nearestCity } from "@/lib/city-coords";
import { metroOf } from "@/lib/metros";

// AI tab — hybrid redesign (direction C, picked Nov 27, 2026), revised the
// same day at Brandy's request: the tab opens straight into the chat
// thread (greeting + suggestion pills), so it looks like a chat the minute
// you land — no skin-test banner anywhere. The Unni-style landing
// (greeting + Recent Chats) is still there one tap back, and the skin test
// lives only in the composer's camera button. In the thread the skin
// report shows as a compact context card pinned at the top, answers get
// real treatment cards (clinic + price + booking link, from
// /api/ai-chat's `cards`, grounded in the seed data), with follow-up
// chips. The thread persists on-device in localStorage so the landing can
// offer it back as a Recent Chat; nothing about the chat is stored
// server-side. The AI itself is unchanged (Groq first, Gemini backup,
// scripted replies as fallback).

type Card = {
  clinic: string;
  city: string;
  treatment: string;
  price: string;
  website: string | null;
};

type Msg = {
  id: number;
  role: "assistant" | "user";
  text: string;
  /** ISO timestamp the message was added — drives the Recent Chat time. */
  at?: string;
  // When set, the message text comes from the i18n dict at render time,
  // so switching language re-translates it.
  i18nKey?: string;
  // Optional follow-up action rendered under an assistant message
  // (e.g. "Start browsing" → /browse). actionLabelKey resolves from the
  // i18n dict at render time.
  actionHref?: string;
  actionLabelKey?: string;
  // Real treatment cards for this answer (from /api/ai-chat).
  cards?: Card[];
  // Treatment label the follow-up chips refer to, e.g. "Microneedling".
  treatmentLabel?: string;
};

// Scripted replies for free-text chat. Keyword matching only — no LLM,
// no treatment advice, no scores. Treatment names match in EN/ZH/KO.
// Order matters: more specific phrases first (e.g. "hair removal"
// before "laser", "masseter" before "botox").
const TREATMENT_KEYWORDS: { match: string[]; label: string }[] = [
  { match: ["masseter", "咬肌", "교근"], label: "Masseter" },
  { match: ["lip flip", "翻唇", "립 플립"], label: "Lip Flip" },
  { match: ["hair removal", "脱毛", "제모"], label: "Laser Hair Removal" },
  { match: ["botox", "肉毒素", "보톡스"], label: "Botox" },
  { match: ["filler", "填充", "필러"], label: "Filler" },
  { match: ["rejuran", "丽珠兰", "리쥬란"], label: "Rejuran" },
  { match: ["microneedling", "微针", "마이크로니들링"], label: "Microneedling" },
  { match: ["hydrafacial", "水飞梭", "하이드라페이셜"], label: "HydraFacial" },
  { match: ["chemical peel", "换肤", "필링"], label: "Chemical Peel" },
  { match: ["ultherapy", "超声刀", "울쎄라"], label: "Ultherapy" },
  { match: ["thermage", "热玛吉", "써마지"], label: "Thermage" },
  { match: ["hifu", "하이푸"], label: "HIFU" },
  { match: ["thread lift", "线雕", "실 리프팅"], label: "Thread Lift" },
  { match: ["morpheus8", "모피어스"], label: "Morpheus8" },
  { match: ["pico", "皮秒", "피코"], label: "Pico Laser" },
  { match: ["facial", "面部护理", "페이셜"], label: "Facial" },
  { match: ["lifting", "提拉", "리프팅"], label: "Lifting" },
  { match: ["laser", "激光", "레이저"], label: "Laser" },
  { match: ["prp"], label: "PRP" },
];

type ScriptedReply = { text: string; actionHref?: string; actionLabelKey?: string };

function scriptedReply(q: string, t: Dict): ScriptedReply {
  const s = q.toLowerCase().trim();
  const has = (...words: string[]) => words.some((w) => s.includes(w));
  // Skin test
  if (
    has(
      "skin test",
      "skin analysis",
      "测肤",
      "肤质",
      "皮肤检测",
      "测一测",
      "피부 테스트",
      "피부 분석",
      "피부 검사",
      "피부검사",
    ) ||
    s === "test" ||
    s === "测试" ||
    s === "테스트"
  ) {
    return { text: t.aiReplySkinTest, actionHref: "/ai/skin-test", actionLabelKey: "aiSkinTestCta" };
  }
  // Price / cost
  if (
    has(
      "price",
      "pricing",
      "cost",
      "how much",
      "much is",
      "价格",
      "多少钱",
      "费用",
      "收费",
      "가격",
      "비용",
      "얼마",
    )
  ) {
    return { text: t.aiReplyPrice, actionHref: "/browse", actionLabelKey: "aiStartBrowsing" };
  }
  // Named treatment → point to browse/search, never advise on it.
  for (const tk of TREATMENT_KEYWORDS) {
    if (tk.match.some((m) => s.includes(m))) {
      const label =
        (t.subTreatmentNames as Record<string, string>)[tk.label] ??
        (t.serviceNames as Record<string, string>)[tk.label] ??
        tk.label;
      return {
        text: t.aiReplyTreatment.replaceAll("{treatment}", label),
        actionHref: "/browse",
        actionLabelKey: "aiStartBrowsing",
      };
    }
  }
  // Greeting (word-boundary match so "hi" doesn't fire inside "this").
  if (/\b(hi|hello|hey)\b/.test(s) || has("你好", "您好", "안녕")) {
    return { text: t.aiReplyHello, actionHref: "/ai/skin-test", actionLabelKey: "aiSkinTestCta" };
  }
  return { text: t.aiReplyDefault, actionHref: "/ai/skin-test", actionLabelKey: "aiSkinTestCta" };
}

const THREAD_KEY = "glow-sis-ai-thread";
const METRO_KEY = "glow-sis-metro";

type SavedThread = { title: string; updatedAt: string; messages: Msg[] };

function relTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? "1m" : `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function threadTitle(messages: Msg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Skin treatment consultation";
  const text = firstUser.i18nKey ?? firstUser.text;
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function Composer({
  draft,
  setDraft,
  onSend,
  onLocate,
  locating,
  t,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onLocate: () => void;
  locating: boolean;
  t: Dict;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="rounded-3xl border border-line bg-white p-3 shadow-sm"
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.aiChatPh}
        enterKeyHint="send"
        aria-label={t.aiChatPh}
        className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex items-center gap-2">
        <a
          href="/ai/skin-test"
          aria-label={t.aiSkinTestCta}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-ink hover:bg-brand-soft"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </a>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          aria-label={t.browseUseLocation}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-ink hover:bg-brand-soft disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t.aiChatSend}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default function AiPage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  // The last skin-test report, if the user took one — shown as the chat's
  // compact context card. There is no profile or account setup anymore: the
  // AI tab is the same chat for everyone, signed in or not.
  const [report, setReport] = useState<SkinReport | null>(null);
  // Client-only data (localStorage) loads via the render-time adjustment
  // below, not an effect — the page renders nothing until then so the
  // server HTML and the first client render match.
  const [hydrated, setHydrated] = useState(false);
  // Metro picked on the browse page (localStorage "glow-sis-metro") —
  // sent with each chat request so answers prefer nearby clinics.
  const [metro, setMetro] = useState("");
  const [locating, setLocating] = useState(false);
  const [view, setView] = useState<"home" | "thread">("thread");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (!hydrated && typeof window !== "undefined") {
    setHydrated(true);
    setReport(loadSkinReport());
    try {
      setMetro(window.localStorage.getItem(METRO_KEY) ?? "");
      const raw = window.localStorage.getItem(THREAD_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedThread;
        if (Array.isArray(saved.messages) && saved.messages.length > 0) {
          const loadedMsgs = saved.messages.map((m) => ({
            ...m,
            at: m.at ?? saved.updatedAt,
          }));
          setMessages(loadedMsgs);
        } else {
          // No saved thread: the tab opens straight into the chat with
          // the greeting, so it looks like a chat the minute you land.
          setMessages([
            { id: 0, role: "assistant", text: "", at: new Date().toISOString(), i18nKey: "aiGreeting" },
          ]);
        }
      } else {
        setMessages([
          { id: 0, role: "assistant", text: "", at: new Date().toISOString(), i18nKey: "aiGreeting" },
        ]);
      }
    } catch {
      // Storage unavailable — search nationwide, start fresh.
    }
  }

  // Persist the thread on-device so the landing can offer it back as a
  // Recent Chat. Nothing about the chat is stored server-side. The write
  // is skipped when localStorage already holds the same JSON, so opening
  // the page doesn't reset the Recent Chat's timestamp.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length === 0) {
        if (window.localStorage.getItem(THREAD_KEY) !== null) {
          window.localStorage.removeItem(THREAD_KEY);
        }
        return;
      }
      const saved: SavedThread = {
        title: threadTitle(messages),
        updatedAt: messages[messages.length - 1].at ?? new Date().toISOString(),
        messages: messages.slice(-30),
      };
      const json = JSON.stringify(saved);
      if (json !== window.localStorage.getItem(THREAD_KEY)) {
        window.localStorage.setItem(THREAD_KEY, json);
      }
    } catch {
      // Storage unavailable — the thread just won't persist.
    }
  }, [messages, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  // push(role, text, i18nKey?, actionHref?, actionLabelKey?, extra?) —
  // one helper for every message append, so call sites stay short.
  function push(
    role: "assistant" | "user",
    text: string,
    i18nKey?: string,
    actionHref?: string,
    actionLabelKey?: string,
    extra?: { cards?: Card[]; treatmentLabel?: string },
  ) {
    setMessages((m) => {
      const id = m.reduce((max, x) => Math.max(max, x.id), -1) + 1;
      return [
        ...m,
        {
          id,
          role,
          text,
          at: new Date().toISOString(),
          i18nKey,
          actionHref,
          actionLabelKey,
          ...(extra ?? {}),
        },
      ];
    });
  }

  function openThread() {
    if (messages.length === 0) {
      push("assistant", "", "aiGreeting");
    }
    setView("thread");
  }

  function newChat() {
    try {
      window.localStorage.removeItem(THREAD_KEY);
    } catch {
      // Ignore.
    }
    // Fresh thread, still in the chat — the landing (with Recent Chats)
    // is one tap back.
    setMessages([
      { id: 0, role: "assistant", text: "", at: new Date().toISOString(), i18nKey: "aiGreeting" },
    ]);
    setView("thread");
  }

  // "Locate me": ask the browser for the user's position once, then pick
  // the nearest city in the data (within 50 miles) and use its metro for
  // chat answers. Same helper as the browse page. Permission denied,
  // timeout, or too far away just leaves the metro as it was.
  function locateMe() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = nearestCity(pos.coords.latitude, pos.coords.longitude);
        if (found) {
          const m = metroOf(found);
          setMetro(m);
          try {
            window.localStorage.setItem(METRO_KEY, m);
          } catch {
            // Ignore.
          }
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  // Free-text chat: ask the AI (via /api/ai-chat, grounded in real clinic
  // prices) and fall back to the scripted keyword reply when the API is
  // not configured or fails. The action button still comes from the local
  // matcher — the model only writes the text.
  async function send(text?: string) {
    const raw = (text ?? draft).trim();
    if (!raw || thinking) return;
    setDraft("");
    setView("thread");
    push("user", raw);
    const fallback = scriptedReply(raw, t);
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      text:
        m.i18nKey != null
          ? ((t as unknown as Record<string, string>)[m.i18nKey] ?? m.text)
          : m.text,
    }));
    setThinking(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: raw, lang, history, report, metro: metro || undefined }),
      });
      if (!res.ok) throw new Error(`ai-chat ${res.status}`);
      const data = (await res.json()) as { text?: unknown; cards?: Card[] };
      if (typeof data.text !== "string" || !data.text.trim()) {
        throw new Error("ai-chat empty");
      }
      const cards = Array.isArray(data.cards) ? data.cards : [];
      push("assistant", data.text, undefined, fallback.actionHref, fallback.actionLabelKey, {
        cards: cards.length > 0 ? cards : undefined,
        treatmentLabel: cards.length > 0 ? cards[0].treatment : undefined,
      });
    } catch {
      push("assistant", fallback.text, undefined, fallback.actionHref, fallback.actionLabelKey);
    } finally {
      setThinking(false);
    }
  }

  if (!hydrated) return null;

  // Recent Chat, derived from the thread itself — no extra state.
  const recent =
    messages.length > 0
      ? {
          title: threadTitle(messages),
          updatedAt: messages[messages.length - 1].at ?? new Date().toISOString(),
        }
      : null;

  const showPills = view === "thread" && messages.length <= 1;
  const suggestions = [t.aiSuggPores, t.aiSuggSensitive, t.aiSuggLines, t.aiSuggPigment];

  function renderMessage(m: Msg) {
    const displayText =
      m.i18nKey != null
        ? ((t as unknown as Record<string, string>)[m.i18nKey] ?? m.text)
        : m.text;
    const actionLabel =
      m.actionLabelKey != null
        ? ((t as unknown as Record<string, string>)[m.actionLabelKey] ?? m.actionLabelKey)
        : null;
    const followUps =
      m.cards && m.cards.length > 0 && m.treatmentLabel
        ? [
            t.aiFollowMore.replaceAll("{treatment}", m.treatmentLabel),
            t.aiFollowChoose,
            t.aiFollowPrice,
          ]
        : [];
    return (
      <div
        key={m.id}
        className={`flex flex-col gap-2 ${m.role === "assistant" ? "items-start" : "items-end"}`}
      >
        <div
          className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
            m.role === "assistant"
              ? "self-start rounded-bl-md border border-line bg-white"
              : "self-end rounded-br-md bg-brand text-white"
          }`}
        >
          {displayText}
        </div>
        {m.role === "assistant" && m.actionHref && actionLabel && (
          <a
            href={m.actionHref}
            className="rounded-full border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            {actionLabel}
          </a>
        )}
        {m.role === "assistant" && m.cards && m.cards.length > 0 && (
          <div className="flex w-full max-w-[92%] flex-col gap-2">
            {m.cards.map((c) => (
              <div key={`${c.clinic}-${c.treatment}`} className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold">{c.clinic}</p>
                  <p className="shrink-0 text-xs text-muted">{c.city}</p>
                </div>
                <p className="mt-0.5 text-sm text-muted">{c.treatment}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-base font-extrabold">{c.price}</p>
                  {c.website ? (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                    >
                      {t.aiBookConsult}
                    </a>
                  ) : (
                    <a
                      href="/browse"
                      className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                    >
                      {t.aiStartBrowsing}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {followUps.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => void send(f)}
                className="rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:border-brand"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="ai" />
      <main className="mx-auto max-w-2xl px-4 pb-12">
        {view === "home" ? (
          <section className="flex min-h-[72dvh] flex-col bg-gradient-to-b from-white via-[#fff1f5] to-[#fde8f0] pt-8 md:pt-10">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {t.aiChatTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.aiChatSub}</p>
            {metro && (
              <p className="mt-2 text-sm font-semibold text-brand">
                {t.aiSearchNear.replace("{metro}", metro)}
              </p>
            )}

            {recent && (
              <button
                type="button"
                onClick={openThread}
                className="mt-6 w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:border-brand"
              >
                <p className="text-sm font-bold">{t.aiRecentChats}</p>
                <span className="mt-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{recent.title}</span>
                    <span className="block text-xs text-muted">{relTime(recent.updatedAt)}</span>
                  </span>
                </span>
              </button>
            )}

            {report ? (
              <button
                type="button"
                onClick={openThread}
                className="mt-4 flex w-full items-center gap-4 rounded-3xl border border-line bg-white p-4 text-left shadow-sm hover:border-brand"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[#7dd3c8] text-lg font-extrabold">
                  {report.overall}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t.aiContextTitle}</span>
                  <span className="block text-xs text-muted">
                    {t.stBetterThan.replace("{pct}", String(report.betterThanPct))}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {report.concerns.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark"
                      >
                        {(t.concernNames as Record<string, string>)[c] ?? c}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-brand">{t.aiRetake}</span>
              </button>
            ) : null}

            <div className="mt-auto pt-8">
              <Composer
                draft={draft}
                setDraft={setDraft}
                onSend={() => void send()}
                onLocate={locateMe}
                locating={locating}
                t={t}
              />
            </div>
          </section>
        ) : (
          <section className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setView("home")}
                aria-label="Back"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-lg font-bold hover:border-brand"
              >
                ←
              </button>
              <h1 className="text-lg font-extrabold">Glow AI</h1>
              <button
                type="button"
                onClick={newChat}
                className="rounded-full border border-line bg-white px-4 py-2 text-xs font-bold hover:border-brand"
              >
                + {t.aiNewChat}
              </button>
            </div>

            {report ? (
              <div className="mt-4 flex items-center gap-4 rounded-3xl border border-line bg-white p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[#7dd3c8] text-lg font-extrabold">
                  {report.overall}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t.aiContextTitle}</p>
                  <p className="text-xs text-muted">
                    {t.stBetterThan.replace("{pct}", String(report.betterThanPct))}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {report.concerns.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark"
                      >
                        {(t.concernNames as Record<string, string>)[c] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
                <a href="/ai/skin-test" className="shrink-0 text-sm font-semibold text-brand">
                  {t.aiRetake}
                </a>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3">
              {messages.map(renderMessage)}
              {showPills && (
                <div className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium hover:border-brand"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {thinking && (
                <div className="flex flex-col items-start gap-2">
                  <div className="max-w-[85%] rounded-3xl rounded-bl-md border border-line bg-white px-4 py-3 text-sm leading-relaxed">
                    <span className="animate-pulse">···</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <p className="mt-6 text-xs leading-relaxed text-muted">{t.aiDisclaimer}</p>

            <div className="sticky bottom-16 z-30 mt-4 md:bottom-0">
              <Composer
                draft={draft}
                setDraft={setDraft}
                onSend={() => void send()}
                onLocate={locateMe}
                locating={locating}
                t={t}
              />
            </div>
            <div className="h-16" />
          </section>
        )}
      </main>
    </div>
  );
}
