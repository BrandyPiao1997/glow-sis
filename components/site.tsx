"use client";

import { useEffect, useState } from "react";
import { LANGS, WECHAT_ID } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`${className} font-extrabold tracking-tight`}>
      <span className="text-ink">Glow</span>
      <span className="text-brand">Sis</span>
    </span>
  );
}

export function LangSwitcher({
  lang,
  chooseLang,
}: {
  lang: Lang;
  chooseLang: (next: Lang) => void;
}) {
  return (
    <div className="flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => chooseLang(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            lang === l.code ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({
  t,
  lang,
  chooseLang,
  active,
}: {
  t: Dict;
  lang: Lang;
  chooseLang: (next: Lang) => void;
  active: "browse" | "apply" | "ai" | "profile";
}) {
  const linkCls = (isActive: boolean) =>
    isActive ? "font-semibold text-ink" : "hover:text-ink";
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <a href="/" aria-label="GlowSis">
          <Logo />
        </a>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
          <a href="/" className={linkCls(active === "browse")}>
            {t.navBrowse}
          </a>
          <a href="/ai" className={linkCls(active === "ai")}>
            {t.tabAi}
          </a>
          <a href="/profile" className={linkCls(active === "profile")}>
            {t.tabProfile}
          </a>
          <a href="/apply" className={linkCls(active === "apply")}>
            {t.navForClinics}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitcher lang={lang} chooseLang={chooseLang} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <Logo className="text-base" />
          <p className="mt-1">{t.footerTag}</p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed">{t.footerNote}</p>
        </div>
        <a
          href="/apply"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
        >
          {t.navForClinics}
        </a>
      </div>
    </footer>
  );
}

export function useSavedLang(): {
  lang: Lang;
  chooseLang: (next: Lang) => void;
} {
  // Shared by every page so the language choice and default (Chinese)
  // stay consistent, using the same localStorage key.
  const [lang, setLang] = useState<Lang>("zh");
  useEffect(() => {
    const saved = window.localStorage.getItem("glow-nyc-lang");
    if (saved === "en" || saved === "zh" || saved === "ko") setLang(saved);
  }, []);
  function chooseLang(next: Lang) {
    setLang(next);
    window.localStorage.setItem("glow-nyc-lang", next);
  }
  return { lang, chooseLang };
}

export { WECHAT_ID };
