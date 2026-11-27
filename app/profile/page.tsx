"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import AuthButtons from "@/components/AuthButtons";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

// Account page only: sign in / sign out. There is no profile setup or
// account creation flow anymore — sign-in is just the Google/Apple
// buttons below, and everything else in the app works signed out.
export default function ProfilePage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
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
                <p className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-ink">
                  {t.profNoAccounts}
                </p>
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
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
