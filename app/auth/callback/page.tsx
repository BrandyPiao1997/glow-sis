"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { useSavedLang } from "@/components/site";
import { getSupabase } from "@/lib/supabase";
import { POST_AUTH_KEY } from "@/lib/profile";

// OAuth callback: exchanges the ?code= for a session, then sends the user
// back to where they started sign-in (localStorage glow-sis-post-auth,
// default /profile). Reads the code from window.location directly so no
// Suspense boundary is needed.
export default function AuthCallbackPage() {
  const { lang } = useSavedLang();
  const t = dicts[lang];
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setError(t.authNotConfigured);
      return;
    }
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setError("Missing sign-in code.");
      return;
    }
    sb.auth
      .exchangeCodeForSession(code)
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
