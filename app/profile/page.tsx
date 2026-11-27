"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import EmailOtpAuth from "@/components/EmailOtpAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadSkinReport, type SkinReport } from "@/lib/skin-analysis";

// Account page: sign in / sign out, plus the skin-test result tile
// once a test is finished (the report lives on this device — see
// lib/skin-analysis). Sign-in is an email link (EmailOtpAuth). Google /
// Apple buttons live in AuthButtons.tsx but are hidden for now because
// neither provider works yet; phone OTP is skipped for now (it needs a
// paid Twilio SMS setup). The skin test needs an account (gated at
// /ai/skin-test); everything else in the app works signed out.
export default function ProfilePage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const [user, setUser] = useState<User | null>(null);
  // If Supabase isn't configured there is no session to check for.
  const [checked, setChecked] = useState(() => !isSupabaseConfigured());
  // The finished skin-test report, if one is saved on this device —
  // shown as the result tile below the account card.
  const [report, setReport] = useState<SkinReport | null>(null);

  useEffect(() => {
    // The state update rides in a setTimeout so the effect body itself
    // doesn't set state synchronously (the repo's eslint rejects that).
    const id = window.setTimeout(() => setReport(loadSkinReport()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
  }

  const configured = isSupabaseConfigured();

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="profile" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="py-8 md:py-10">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {t.profTitle}
          </h1>

          <div className="mt-6 rounded-3xl border border-line bg-white p-5">
            {checked && user ? (
              <>
                <p className="text-sm text-muted">{t.profSignedInAs}</p>
                <p className="mt-1 font-semibold">{user.email ?? user.id}</p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-4 rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-brand"
                >
                  {t.profSignOut}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted">{t.profGuest}</p>
                <div className="mt-4">
                  <EmailOtpAuth t={t} />
                </div>
                {!configured && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {t.authNotConfiguredSub}
                  </p>
                )}
              </>
            )}
          </div>

          {report && (
            <div className="mt-6 rounded-3xl border border-line bg-white p-5">
              <p className="text-sm font-bold">{t.aiContextTitle}</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[#7dd3c8] text-lg font-extrabold">
                  {report.overall}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
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
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/ai/skin-test"
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand"
                >
                  {t.aiRetake}
                </a>
                <a
                  href="/ai"
                  className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  {t.stBackToChat}
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
