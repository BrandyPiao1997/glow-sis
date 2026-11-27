"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import AuthButtons from "@/components/AuthButtons";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadProfile, type UserProfile } from "@/lib/profile";

export default function ProfilePage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    const sb = getSupabase();
    if (!sb) {
      setChecked(true);
      return;
    }
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
                  <AuthButtons t={t} returnTo="/profile" />
                </div>
                {!configured && (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {t.authNotConfiguredSub}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">{t.profSkinProfile}</p>
              <a href="/onboarding" className="text-sm font-semibold text-brand">
                {t.profSetup}
              </a>
            </div>
            {!profile || (!profile.skinReport && profile.concerns.length === 0 && !profile.city) ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.profNoProfile}</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {profile.skinReport && (
                  <p>
                    <span className="text-muted">{t.stOverall}: </span>
                    <span className="font-bold">{profile.skinReport.overall}</span>
                    {profile.skinReport.isPlaceholder ? " · " + t.stSample : ""}
                  </p>
                )}
                {profile.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.concerns.map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark"
                      >
                        {(t.concernNames as Record<string, string>)[c] ?? c}
                      </span>
                    ))}
                  </div>
                )}
                {profile.skinType && (
                  <p>
                    <span className="text-muted">{t.qSkinType} </span>
                    {(t.skinTypeNames as Record<string, string>)[profile.skinType] ??
                      profile.skinType}
                  </p>
                )}
                {profile.city && (
                  <p>
                    <span className="text-muted">{t.aiQCity} </span>
                    {(t.cityNames as Record<string, string>)[profile.city] ?? profile.city}
                  </p>
                )}
                {profile.budget && (
                  <p>
                    <span className="text-muted">{t.aiQBudget} </span>
                    {(t.budgetNames as Record<string, string>)[profile.budget] ??
                      profile.budget}
                  </p>
                )}
                <a
                  href="/ai/skin-test"
                  className="inline-block pt-1 text-sm font-semibold text-brand"
                >
                  {t.aiRetake}
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
