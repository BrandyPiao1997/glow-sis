"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { useSavedLang } from "@/components/site";
import { getSupabase } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/auth";

// Auth callback: exchanges the ?code= for a session (OAuth, e.g. Google /
// Apple when they are enabled), or verifies an email OTP link's
// ?token_hash=, then sends the user back to where they started sign-in
// (localStorage glow-sis-post-auth, default /profile). Reads the query
// from window.location directly so no Suspense boundary is needed.
export default function AuthCallbackPage() {
  const { lang } = useSavedLang();
  const t = dicts[lang];
  const router = useRouter();
  const [error, setError] = useState(() => {
    if (!getSupabase()) return t.authNotConfigured;
    const params = new URLSearchParams(window.location.search);
    return params.get("code") || params.get("token_hash")
      ? ""
      : "Missing sign-in code.";
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const code = params.get("code");
    if (!code && !tokenHash) return;
    const exchange = tokenHash
      ? sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : sb.auth.exchangeCodeForSession(code as string);
    exchange
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        let next = "/profile";
        try {
          next = window.localStorage.getItem(POST_AUTH_KEY) ?? "/profile";
          window.localStorage.removeItem(POST_AUTH_KEY);
        } catch {
          // Ignore storage errors; fall back to /profile.
        }
        router.replace(next);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Sign-in failed."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm font-semibold">{t.authCallback}</p>
      )}
    </main>
  );
}
