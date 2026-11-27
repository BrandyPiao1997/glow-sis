"use client";

import { useEffect, useRef, useState } from "react";
import { dicts, type Dict } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import SkinRadar from "@/components/SkinRadar";
import { loadSkinReport, type SkinReport } from "@/lib/skin-analysis";

type Msg = {
  id: number;
  role: "assistant" | "user";
  text: string;
  kind?: "skin-test";
  // When set, the message text comes from the i18n dict at render time,
  // so switching language re-translates it. Assistant messages seeded or
  // pushed once used to freeze in the language active at that moment
  // (Chinese by default), which is why the first two greetings stayed
  // Chinese in English/Korean. User answers keep their literal text.
  i18nKey?: string;
  // Optional follow-up action rendered under an assistant message
  // (e.g. "Start browsing" → /browse). actionLabelKey resolves from the
  // i18n dict at render time.
  actionHref?: string;
  actionLabelKey?: string;
};

let msgId = 0;

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

export default function AiPage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  // The last skin-test report, if the user took one — shown as the chat's
  // context card. There is no profile or account setup anymore: the AI tab
  // is the same chat for everyone, signed in or not.
  const [report, setReport] = useState<SkinReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReport(loadSkinReport());
    setLoaded(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function push(
    role: "assistant" | "user",
    text: string,
    kind?: Msg["kind"],
    i18nKey?: string,
    actionHref?: string,
    actionLabelKey?: string,
  ) {
    setMessages((m) => [...m, { id: msgId++, role, text, kind, i18nKey, actionHref, actionLabelKey }]);
  }

  function sendFreeText(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    push("user", text);
    const reply = scriptedReply(text, t);
    push("assistant", reply.text, undefined, undefined, reply.actionHref, reply.actionLabelKey);
  }

  if (!loaded) return null;

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="ai" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="pt-8 md:pt-10">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {t.aiChatTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.aiChatSub}</p>

          {report && (
            <div className="mt-6 rounded-3xl border border-line bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{t.aiContextTitle}</p>
                <a href="/ai/skin-test" className="text-sm font-semibold text-brand">
                  {t.aiRetake}
                </a>
              </div>
              {report.isPlaceholder && (
                <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed text-muted">
                  {t.stSample}
                </p>
              )}
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                <SkinRadar scores={report.dimensions} size={150} />
                <div className="text-center sm:text-left">
                  <p className="text-4xl font-extrabold">{report.overall}</p>
                  <p className="text-sm text-muted">{t.stOverall}</p>
                  <p className="mt-1 text-sm font-semibold">
                    {t.stBetterThan.replace("{pct}", String(report.betterThanPct))}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {report.concerns.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark"
                      >
                        {(t.concernNames as Record<string, string>)[c] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!report && (
            <div className="mt-6 rounded-3xl border border-line bg-white p-5">
              <p className="font-bold">{t.aiSkinTestCta}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t.aiSkinTestSub}</p>
              <a
                href="/ai/skin-test"
                className="mt-4 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {t.aiSkinTestCta}
              </a>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {messages.map((m) => {
              const displayText =
                m.i18nKey != null
                  ? ((t as unknown as Record<string, string>)[m.i18nKey] ?? m.text)
                  : m.text;
              const actionLabel =
                m.actionLabelKey != null
                  ? ((t as unknown as Record<string, string>)[m.actionLabelKey] ??
                    m.actionLabelKey)
                  : null;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-2 ${
                    m.role === "assistant" ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "assistant"
                        ? "self-start rounded-bl-md bg-white border border-line"
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
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted">{t.aiDisclaimer}</p>
        </section>

        <form
          onSubmit={sendFreeText}
          className="sticky bottom-16 z-30 -mx-4 mt-4 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur md:bottom-0"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.aiChatPh}
              enterKeyHint="send"
              aria-label={t.aiChatPh}
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label={t.aiChatSend}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </form>
        <div className="h-16" />
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
