"use client";

import { useMemo, useState } from "react";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import seedData from "@/data/seed-clinics.json";
import { lowestMatchingPrice } from "@/components/BrowseClinics";

interface SeedPrice {
  treatment: string;
  price: string;
  unit: string;
  source_url: string;
}

interface SeedClinic {
  name: string;
  neighborhood: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  languages: string[];
  services: string[];
  prices: SeedPrice[];
  source_notes: string;
}

const MAX_COMPARE = 3;

// Simple starter: pick 2–3 clinics from a searchable list and compare them
// side by side (neighborhood, lowest comparable price + treatment, languages).
// Reuses the seed data and the price helpers from BrowseClinics.
export default function ComparePage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SeedClinic[]>([]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = seedData.clinics as SeedClinic[];
    const filtered = q
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.neighborhood ?? "").toLowerCase().includes(q) ||
            (c.city ?? "").toLowerCase().includes(q),
        )
      : list;
    return filtered.slice(0, 8);
  }, [query]);

  const chosen = new Set(selected.map((c) => c.name));

  function add(c: SeedClinic) {
    if (chosen.has(c.name) || selected.length >= MAX_COMPARE) return;
    setSelected((s) => [...s, c]);
  }

  function remove(name: string) {
    setSelected((s) => s.filter((c) => c.name !== name));
  }

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="browse" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <section className="py-8 md:py-10">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {t.cmpTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.cmpSub}</p>

          <div className="mt-6">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.cmpSearchPh}
              className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm outline-none focus:border-brand"
            />
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {matches.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-muted">
                      {c.neighborhood}
                      {c.city ? ` · ${c.city}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={chosen.has(c.name) || selected.length >= MAX_COMPARE}
                    onClick={() => add(c)}
                    className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand disabled:opacity-40"
                  >
                    {chosen.has(c.name) ? "✓" : t.cmpAdd}
                  </button>
                </li>
              ))}
            </ul>
            {selected.length >= MAX_COMPARE && (
              <p className="mt-2 text-xs text-muted">{t.cmpMax}</p>
            )}
          </div>

          {selected.length > 0 && (
            <div className="mt-8">
              {selected.length < 2 && (
                <p className="mb-3 text-sm text-muted">{t.cmpPick2}</p>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                {selected.map((c) => {
                  const lowest = lowestMatchingPrice(c, "", "", "");
                  return (
                    <article
                      key={c.name}
                      className="rounded-3xl border border-line bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-bold leading-snug">{c.name}</h2>
                        <button
                          type="button"
                          onClick={() => remove(c.name)}
                          className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
                        >
                          {t.cmpRemove}
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {c.neighborhood}
                        {c.city ? ` · ${c.city}` : ""}
                      </p>
                      <div className="mt-4">
                        {lowest ? (
                          <>
                            <p className="text-xs text-muted">
                              {t.cmpFrom} {lowest.price}
                            </p>
                            <p className="text-sm font-semibold">{lowest.treatment}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted">{t.cmpNoPrices}</p>
                        )}
                      </div>
                      {c.languages && c.languages.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-muted">{t.cmpLanguages}</p>
                          <p className="mt-1 text-sm">
                            {c.languages
                              .map((l) => (t.languages as Record<string, string>)[l] ?? l)
                              .join(" · ")}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
