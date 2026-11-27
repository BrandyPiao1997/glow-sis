"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/auth";

// Email sign-in with a 6-digit code (Supabase OTP). No password, no social
// login. The user types their email, gets a code, types it back, and is
// signed in. Google / Apple live in AuthButtons.tsx but are hidden for now
// because neither works yet — see docs/auth-setup.md.
export default function EmailOtpAuth({ t }: { t: Dict }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold">{t.authNotConfigured}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t.authNotConfiguredSub}</p>
      </div>
    );
  }

  async function sendCode() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t.authInvalidEmail);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setError("");
    setBusy("send");
    try {
      window.localStorage.setItem(POST_AUTH_KEY, "/profile");
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
      setBusy(null);
    }
  }

  async function verify() {
    const token = code.trim();
    if (token.length !== 6) {
      setError(t.authInvalidCode);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setError("");
    setBusy("verify");
    try {
      const { error } = await sb.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) setError(error.message);
      // On success the profile page's onAuthStateChange picks up the
      // session and swaps this form for the signed-in view.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(null);
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
              if (e.key === "Enter") void sendCode();
            }}
            placeholder={t.authEmailPh}
            className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void sendCode()}
            className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "send" ? t.authSending : t.authSendCode}
          </button>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-ink">
            {t.authCodeSent.replace("{email}", email)}
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void verify();
            }}
            placeholder={t.authCodePh}
            className="w-full rounded-full border border-line bg-white px-5 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void verify()}
            className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "verify" ? t.authVerifying : t.authVerify}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void sendCode()}
              className="font-semibold text-brand-dark hover:underline disabled:opacity-50"
            >
              {t.authResend}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setSent(false);
                setCode("");
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
