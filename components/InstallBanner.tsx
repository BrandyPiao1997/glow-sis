"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

// Dismissible "get the app" banner. Shows on the homepage and the browse
// page (first-time visitors are redirected from / to /ai, so a
// homepage-only banner was nearly invisible). Shows on mobile and desktop:
// iPhone users get the Share → Add to Home Screen instruction, desktop
// users get the address-bar install hint, everyone else gets the generic
// prompt. Hidden when the site is already installed (standalone) or was
// dismissed before. Never a popup — a slim banner under the hero / header.
const DISMISSED_KEY = "glow-sis-install-dismissed";

export default function InstallBanner({ t }: { t: Dict }) {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
      if (window.matchMedia("(display-mode: standalone)").matches) return;
      const ua = window.navigator.userAgent;
      setIsIOS(/iPad|iPhone|iPod/.test(ua));
      setIsDesktop(!/iPad|iPhone|iPod|Android|Mobile/.test(ua));
      setShow(true);
    } catch {
      // Ignore storage errors; banner simply stays hidden.
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore.
    }
    setShow(false);
  }

  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xl font-extrabold text-white">
        G
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t.installTitle}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {isIOS ? t.installIos : isDesktop ? t.installDesktop : t.installBody}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.installDismiss}
        className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-muted hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
