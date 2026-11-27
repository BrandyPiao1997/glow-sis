"use client";

import { dicts } from "@/lib/i18n";
import BrowseClinics from "@/components/BrowseClinics";
import InstallBanner from "@/components/InstallBanner";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";

export default function Home() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];

  // The home URL is the browse page for everyone, first visit or not.
  // The AI assistant is one tap away on the AI tab / header link — it is
  // just a chat now, with no profile setup or onboarding flow.

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="browse" />

      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{t.homeHeroEyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t.homeHeroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{t.homeHeroSub}</p>
          <p className="mt-6 inline-block rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand-dark">
            {t.parityNote}
          </p>
          <InstallBanner t={t} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#browse"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {t.navBrowse}
            </a>
            <a
              href="/apply"
              className="rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold hover:border-brand"
            >
              {t.homeHeroCta}
            </a>
          </div>
        </section>

        <div id="browse" className="scroll-mt-20">
          <BrowseClinics t={t} />
        </div>
      </main>

      <SiteFooter t={t} />
    </div>
  );
}
