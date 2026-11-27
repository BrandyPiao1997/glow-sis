"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { useSavedLang } from "@/components/site";
import { getSupabase } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/auth";

// Auth callback: finishes sign-in after an email link or an OAuth
// redirect, then sends the user back to where they started sign-in
// (localStorage glow-sis-post-auth, default /profile). It accepts
// three shapes, because Supabase sends the proof differently per
// flow:
//   ?token_hash=  email OTP link (verifyOtp, type "email")
//   ?code=       OAuth code (exchangeCodeForSession)
//   #access_token=...&refresh_token=...  Supabase's redirect after
//                verifying a confirmation link — tokens arrive in the
//                URL fragment, not the query, so the page must read
//                window.location.hash too (a query-only check shows a
//                bogus "Missing sign-in code" even though the user is
//                about to be signed in).
// All of the work happens inside the effect, which only runs in the
// browser — the page must not touch window during prerendering (the
// build renders it on the server, where window does not exist).
export default function AuthCallbackPage() {
  const { lang } = useSavedLang();
  const t = dicts[lang];
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const sb = getSupabase();
      if (!sb) {
        setError(t.authNotConfigured);
        return;
      }
      const goNext = () => {
        let next = "/profile";
        try {
          next = window.localStorage.getItem(POST_AUTH_KEY) ?? "/profile";
          window.localStorage.removeItem(POST_AUTH_KEY);
        } catch {
          // Ignore storage errors; fall back to /profile.
        }
        router.replace(next);
      };
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const code = params.get("code");
      try {
        if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type: "email",
          });
          if (error) {
            setError(error.message);
            return;
          }
          goNext();
          return;
        }
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) {
            setError(error.message);
            return;
          }
          goNext();
          return;
        }
        // Tokens in the URL fragment (#access_token=...&refresh_token=...).
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setError(error.message);
            return;
          }
          goNext();
          return;
        }
        // The Supabase client may already have picked the session up
        // from the URL itself (detectSessionInUrl).
        const { data } = await sb.auth.getSession();
        if (data.session) {
          goNext();
          return;
        }
        setError("Missing sign-in code.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();
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
