"use client";

import { dicts } from "@/lib/i18n";
import BrowseClinics from "@/components/BrowseClinics";
import InstallBanner from "@/components/InstallBanner";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";

export default function BrowsePage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="browse" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <InstallBanner t={t} />
        <BrowseClinics t={t} />
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
