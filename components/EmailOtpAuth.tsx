"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/auth";

// Email sign-in with a magic link (Supabase OTP). No password, no social
// login. The user types their email, gets a sign-in link, taps it, and
// is signed in — /auth/callback finishes the session from the link.
// Why a link, not a 6-digit code: Supabase's Free plan locks email
// template editing, so the sign-in email can't include the code
// ({{ .Token }}); it only ever carries the link. Google / Apple live in
// AuthButtons.tsx but are hidden for now because neither works yet —
// see docs/auth-setup.md.
// postAuthPath: where /auth/callback sends the user after sign-in —
// "/profile" by default; the skin-test gate passes "/ai/skin-test"
// so the user lands back at the test they were starting.
export default function EmailOtpAuth({ t, postAuthPath = "/profile" }: { t: Dict; postAuthPath?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold">{t.authNotConfigured}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t.authNotConfiguredSub}</p>
      </div>
    );
  }

  async function sendLink() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t.authInvalidEmail);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setError("");
    setBusy(true);
    try {
      window.localStorage.setItem(POST_AUTH_KEY, postAuthPath);
      const { error } = await sb.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setEmail(trimmed);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">{t.authEmailTitle}</p>
      <p className="-mt-2 text-sm leading-relaxed text-muted">{t.authEmailSub}</p>
      {!sent ? (
        <>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendLink();
            }}
            placeholder={t.authEmailPh}
            className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendLink()}
            className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? t.authSending : t.authSendLink}
          </button>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-ink">
            {t.authLinkSent.replace("{email}", email)}
          </p>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendLink()}
              className="font-semibold text-brand-dark hover:underline disabled:opacity-50"
            >
              {t.authResend}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setError("");
              }}
              className="font-semibold text-muted hover:underline disabled:opacity-50"
            >
              {t.authChangeEmail}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
