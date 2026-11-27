"use client";

import { dicts } from "@/lib/i18n";
import BrowseClinics, { CLINIC_COUNT } from "@/components/BrowseClinics";
import InstallBanner from "@/components/InstallBanner";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";

export default function Home() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];

  // The home URL is the browse page for everyone, first visit or not.
  // The AI assistant is one tap away on the AI tab / header link — it is
  // just a chat now, with no profile setup or onboarding flow.
  //
  // Direction C: the page opens on the search itself — the hero
  // one-liner lives as a second row in the header, location + search
  // share one bar, and the old hero copy (subtitle, price promise,
  // seed note, app banner, clinic sign-up) is marginalized into an
  // About section at the bottom of the page.

  return (
    <div className="flex-1">
      <SiteHeader
        t={t}
        lang={lang}
        chooseLang={chooseLang}
        active="browse"
        tagline={t.homeHeroTitle}
      />

      <main className="mx-auto max-w-5xl px-4 pb-12">
        <div id="browse" className="scroll-mt-28 pt-4 md:pt-6">
          <BrowseClinics t={t} home />
        </div>

        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-lg font-extrabold">{t.homeAbout}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.homeHeroSub}</p>
          <p className="mt-3 text-sm font-semibold text-brand-dark">{t.parityNote}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            {t.browseSeedNote.replace("{count}", String(CLINIC_COUNT))}
          </p>
          <InstallBanner t={t} />
          <div className="mt-5">
            <a
              href="/apply"
              className="inline-block rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold hover:border-brand"
            >
              {t.homeHeroCta}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter t={t} />
    </div>
  );
}
