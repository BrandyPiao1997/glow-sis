"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import AuthButtons from "@/components/AuthButtons";
import SkinRadar from "@/components/SkinRadar";
import {
  BUDGETS,
  CITIES,
  CONCERNS,
  emptyProfile,
  loadProfile,
  saveProfile,
  saveProfileServer,
  type UserProfile,
} from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";

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
};

type Step = "concerns" | "city" | "budget" | "signin" | "done";

let msgId = 0;

export default function AiPage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("concerns");
  const [picked, setPicked] = useState<string[]>([]);
  const [showSkinTest, setShowSkinTest] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the saved profile once; resume the scripted conversation where
  // the user left off (answers are saved as they go).
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p?.onboarded) {
      setLoaded(true);
      return;
    }
    const draft = p ?? emptyProfile();
    setPicked(draft.concerns);
    const nextStep: Step = draft.concerns.length === 0
      ? "concerns"
      : !draft.city
        ? "city"
        : !draft.budget
          ? "budget"
          : "signin";
    setStep(nextStep);
    const seed: Msg[] = [
      { id: msgId++, role: "assistant", text: t.aiGreet1, i18nKey: "aiGreet1" },
      { id: msgId++, role: "assistant", text: t.aiGreet2, i18nKey: "aiGreet2" },
      { id: msgId++, role: "assistant", text: "", kind: "skin-test" },
    ];
    if (nextStep === "city") seed.push({ id: msgId++, role: "assistant", text: t.aiQCity, i18nKey: "aiQCity" });
    if (nextStep === "budget") seed.push({ id: msgId++, role: "assistant", text: t.aiQBudget, i18nKey: "aiQBudget" });
    if (nextStep === "signin") seed.push({ id: msgId++, role: "assistant", text: t.aiSignInTitle, i18nKey: "aiSignInTitle" });
    setMessages(seed);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  function updateDraft(patch: Partial<UserProfile>) {
    setProfile((prev) => {
      const next = saveProfile({ ...(prev ?? emptyProfile()), ...patch });
      return next;
    });
  }

  function push(role: "assistant" | "user", text: string, kind?: Msg["kind"], i18nKey?: string) {
    setMessages((m) => [...m, { id: msgId++, role, text, kind, i18nKey }]);
  }

  function skipToBrowse() {
    const next = saveProfile({
      ...(profile ?? emptyProfile()),
      onboarded: true,
      source: "skip",
    });
    setProfile(next);
    router.push("/browse");
  }

  function answerConcerns() {
    if (picked.length === 0) return;
    const labels = picked
      .map((c) => (t.concernNames as Record<string, string>)[c] ?? c)
      .join(" · ");
    push("user", labels);
    updateDraft({ concerns: picked });
    push("assistant", t.aiQCity, undefined, "aiQCity");
    setStep("city");
  }

  function answerSingle(
    raw: string,
    display: string,
    nextStep: Step,
    nextQuestionKey: string,
  ) {
    push("user", display);
    if (step === "city") updateDraft({ city: raw });
    if (step === "budget") updateDraft({ budget: raw });
    push("assistant", "", undefined, nextQuestionKey);
    setStep(nextStep);
  }

  async function finishOnboarding() {
    const next = saveProfile({
      ...(profile ?? emptyProfile()),
      onboarded: true,
      source: "chat",
    });
    setProfile(next);
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data.user) void saveProfileServer(next, data.user.id);
    }
    router.push("/browse");
  }

  const chipCls = (selected: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium ${
      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:border-brand"
    }`;

  if (!loaded) return null;

  // --- Returning user: assistant home (no onboarding chat) ---
  if (profile?.onboarded) {
    const report = profile.skinReport;
    return (
      <div className="flex-1">
        <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="browse" />
        <main className="mx-auto max-w-5xl px-4 pb-12">
          <section className="py-8 md:py-10">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {t.aiTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.aiComingSoon}</p>

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

            <p className="mt-6 text-xs leading-relaxed text-muted">{t.aiDisclaimer}</p>
          </section>
        </main>
        <SiteFooter t={t} />
      </div>
    );
  }

  // --- First-time user: conversational onboarding ---
  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="browse" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-xl font-extrabold tracking-tight">{t.aiTitle}</h1>
          <button
            type="button"
            onClick={skipToBrowse}
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            {t.aiSkipBrowse}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            // Resolve i18n-keyed assistant messages in the current language
            // (falls back to the text captured when the message was pushed).
            const displayText =
              m.i18nKey != null
                ? ((t as unknown as Record<string, string>)[m.i18nKey] ?? m.text)
                : m.text;
            return m.kind === "skin-test" && showSkinTest ? (
              <div key={m.id} className="rounded-3xl border border-brand bg-brand-soft p-4">
                <p className="font-bold">{t.aiSkinTestCta}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t.aiSkinTestSub}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/ai/skin-test"
                    className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    {t.aiSkinTestCta}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowSkinTest(false)}
                    className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:border-brand"
                  >
                    {t.aiQuestionsInstead}
                  </button>
                </div>
              </div>
            ) : m.kind === "skin-test" ? null : (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "assistant"
                    ? "self-start rounded-bl-md bg-white border border-line"
                    : "self-end rounded-br-md bg-brand text-white"
                }`}
              >
                {displayText}
              </div>
            );
          })}

          {step === "concerns" && (
            <div className="rounded-3xl border border-line bg-white p-4">
              <p className="text-sm font-bold">{t.aiQConcerns}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CONCERNS.map((c) => {
                  const selected = picked.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setPicked((prev) =>
                          selected ? prev.filter((x) => x !== c) : [...prev, c],
                        )
                      }
                      className={chipCls(selected)}
                    >
                      {(t.concernNames as Record<string, string>)[c] ?? c}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={answerConcerns}
                className="mt-4 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {t.stContinue}
              </button>
            </div>
          )}

          {step === "city" && (
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    answerSingle(
                      c,
                      (t.cityNames as Record<string, string>)[c] ?? c,
                      "budget",
                      "aiQBudget",
                    )
                  }
                  className={chipCls(false)}
                >
                  {(t.cityNames as Record<string, string>)[c] ?? c}
                </button>
              ))}
            </div>
          )}

          {step === "budget" && (
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() =>
                    answerSingle(
                      b,
                      (t.budgetNames as Record<string, string>)[b] ?? b,
                      "signin",
                      "aiSignInTitle",
                    )
                  }
                  className={chipCls(false)}
                >
                  {(t.budgetNames as Record<string, string>)[b] ?? b}
                </button>
              ))}
            </div>
          )}

          {step === "signin" && (
            <div className="rounded-3xl border border-line bg-white p-4">
              <p className="text-sm leading-relaxed text-muted">{t.aiSignInSub}</p>
              <div className="mt-4">
                <AuthButtons t={t} returnTo="/ai" />
              </div>
              <button
                type="button"
                onClick={() => {
                  push("assistant", t.aiDoneTitle, undefined, "aiDoneTitle");
                  setStep("done");
                }}
                className="mt-4 text-sm font-semibold text-muted hover:text-ink"
              >
                {t.aiContinueNoSignIn}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="rounded-3xl border border-line bg-white p-4">
              <p className="font-bold">{t.aiDoneTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t.aiDoneBody}</p>
              <button
                type="button"
                onClick={() => void finishOnboarding()}
                className="mt-4 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                {t.aiStartBrowsing}
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">{t.aiDisclaimer}</p>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
