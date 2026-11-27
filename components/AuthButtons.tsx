"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/auth";

// Google / Apple sign-in buttons (Supabase OAuth). Hidden for now: neither
// provider works yet (Google fails the code exchange, Apple needs the $99
// Developer Program). Not rendered on /profile — email OTP is the sign-in
// for now. Kept for later; provider credentials must be created by the
// owner and enabled in the Supabase dashboard — see docs/auth-setup.md.
export default function AuthButtons({
  t,
  returnTo = "/profile",
}: {
  t: Dict;
  returnTo?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const configured = isSupabaseConfigured();

  async function signIn(provider: "google" | "apple") {
    const sb = getSupabase();
    if (!sb) return;
    setError("");
    setBusy(provider);
    try {
      window.localStorage.setItem(POST_AUTH_KEY, returnTo);
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold">{t.authNotConfigured}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t.authNotConfiguredSub}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void signIn("google")}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold hover:border-brand disabled:opacity-50"
      >
        <span aria-hidden className="text-base font-extrabold">
          G
        </span>
        {busy === "google" ? t.authSigningIn : t.authGoogle}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void signIn("apple")}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M17.05 12.54c-.03 3.03 2.66 4.03 2.69 4.04-.02.07-.42 1.44-1.39 2.85-.84 1.22-1.71 2.44-3.07 2.46-1.34.03-1.77-.79-3.31-.79-1.53 0-2.01.77-3.28.82-1.32.05-2.32-1.32-3.16-2.54C3.8 16.6 2.5 12.6 4.05 9.99c.77-1.3 2.15-2.13 3.64-2.15.97-.02 1.88.65 2.51.65.63 0 1.81-.8 3.05-.68.52.02 1.98.21 2.92 1.58-.08.05-1.74 1.02-1.72 3.03.01 2.42 2.12 3.22 2.6 3.12zM14.12 5.1c.68-.82 1.14-1.96 1.01-3.1-1.1.04-2.42.73-3.2 1.55-.7.81-1.32 2.1-1.15 3.24 1.2.1 2.43-.62 3.34-1.69z" />
        </svg>
        {busy === "apple" ? t.authSigningIn : t.authApple}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
