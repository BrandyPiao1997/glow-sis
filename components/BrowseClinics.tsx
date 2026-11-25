"use client";

import { useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { SIMPLE_SERVICES } from "@/lib/types";
import seedData from "@/data/seed-clinics.json";

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

const CLINICS = seedData.clinics as SeedClinic[];

// Loose keyword match from a clinic's service strings to the one-level
// service categories (SIMPLE_SERVICES). Keywords are lowercase substrings.
const SERVICE_KEYWORDS: Record<string, string[]> = {
  "Botox & filler": [
    "botox", "filler", "xeomin", "daxxify", "juvederm", "sculptra",
    "radiesse", "skinvive", "lip flip", "masseter", "neurotoxin", "dermal",
  ],
  "Skin & laser": [
    "facial", "laser", "skin", "rejuran", "peel", "microneedling", "prp",
    "hydrafacial", "photon", "pico", "genesis", "morpheus8", "forma",
    "rf microneedling", "resurfacing", "chemical", "meso", "pdrn",
    "exosome", "mts", "ldm", "dermatoxin",
  ],
  Lifting: [
    "ultherapy", "thermage", "oligio", "xerf", "titan", "thread", "pdo",
    "lifting", "skin tightening", "liquid facelift", "contouring",
  ],
  "Brows & lashes": ["brow", "lash", "eyebrow", "eyelash"],
  "Hair removal": ["hair removal", "laser hair", "gentlemax", "diode"],
};

function serviceMatchesCategory(service: string, category: string): boolean {
  const s = service.toLowerCase();
  if (category === "Other") {
    // "Other" = a service that fits none of the named categories.
    return !Object.values(SERVICE_KEYWORDS).some((kws) =>
      kws.some((k) => s.includes(k)),
    );
  }
  return (SERVICE_KEYWORDS[category] ?? []).some((k) => s.includes(k));
}

function parsePriceNum(price: string): number | null {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// A price is "comparable" only if it buys a whole treatment: one session,
// one area, one package, one syringe/vial, one full set, etc. Rates that
// are only a fraction of a treatment must never be a clinic's headline
// "from" price — e.g. Botox at $15/unit is not comparable to a $150 facial,
// because one treatment takes many units. Excluded: bare per-unit / per-cc /
// per-shot rates, fractional syringes (0.5 mL), memberships, consultations,
// add-on enhancements, and member-only rates. Quantified full-treatment
// amounts (per 300 shots, per 50 units for a full face, per 2cc syringe,
// per 2 vials) ARE comparable — they are the price of the whole treatment.
function isComparablePrice(p: SeedPrice): boolean {
  const u = p.unit.toLowerCase();
  const t = p.treatment.toLowerCase();
  if (
    t.includes("membership") ||
    t.includes("consultation") ||
    t.includes("visit fee")
  )
    return false;
  if (
    u.includes("per month") ||
    u.includes("per consultation") ||
    u.includes("per enhancement")
  )
    return false;
  if (u.includes("member") && !u.includes("non-member")) return false;
  if (/per 0\.5/.test(u)) return false;
  if (/\bper unit\b/.test(u) && !/\bper \d+ units?\b/.test(u)) return false;
  if (/\bper cc\b/.test(u) && !/\bper \d+cc/.test(u)) return false;
  if (/\bper shots?\b/.test(u) && !/\bper \d+ shots?\b/.test(u)) return false;
  if (/\bper lines?\b/.test(u) && !/\bper \d+ lines?\b/.test(u)) return false;
  return true;
}

// The headline price, search-aware: when a search or service filter is
// active, only price rows that match it count — the headline is the cheapest
// comparable price among the treatments the user is actually looking at,
// not the clinic's overall cheapest treatment. A row matches the search if
// its treatment name contains the query; it matches a service filter if its
// treatment falls in that category (same keyword match as the filter). If
// the query matches only the clinic's name, fall back to all rows. Rows
// that match nothing yield no headline price (the card then shows "See
// price list" instead of a misleading figure).
function lowestMatchingPrice(
  clinic: SeedClinic,
  query: string,
  service: string,
): SeedPrice | null {
  const q = query.trim().toLowerCase();
  let rows = clinic.prices;
  if (service) {
    rows = rows.filter((p) => serviceMatchesCategory(p.treatment, service));
  }
  if (q) {
    const byTreatment = rows.filter((p) =>
      p.treatment.toLowerCase().includes(q),
    );
    if (byTreatment.length > 0) rows = byTreatment;
    else if (!clinic.name.toLowerCase().includes(q)) rows = [];
  }
  let best: SeedPrice | null = null;
  let bestNum = Infinity;
  for (const p of rows) {
    if (!isComparablePrice(p)) continue;
    const n = parsePriceNum(p.price);
    if (n !== null && n < bestNum) {
      bestNum = n;
      best = p;
    }
  }
  return best;
}

export default function BrowseClinics({ t }: { t: Dict }) {
  const [query, setQuery] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [service, setService] = useState("");
  const [language, setLanguage] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const allLanguages = useMemo(
    () => [...new Set(CLINICS.flatMap((c) => c.languages))].sort(),
    [],
  );

  const allNeighborhoods = useMemo(
    () => [...new Set(CLINICS.map((c) => c.neighborhood))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLINICS.filter((c) => {
      if (pricedOnly && c.prices.length === 0) return false;
      if (neighborhood && c.neighborhood !== neighborhood) return false;
      if (language && !c.languages.includes(language)) return false;
      if (service && !c.services.some((s) => serviceMatchesCategory(s, service)))
        return false;
      if (q) {
        const hay = [
          c.name,
          ...c.services,
          ...c.prices.map((p) => p.treatment),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, neighborhood, service, language, pricedOnly]);

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";
  const labelCls = "block text-sm font-semibold mb-1.5";
  const pill = (selected: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium ${
      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:border-brand"
    }`;

  return (
    <>
      <section className="py-8 md:py-10">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          {t.browseTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.browseSub}</p>
        <p className="mt-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-muted">
          {t.browseSeedNote}
        </p>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5">
        <div>
          <label className={labelCls} htmlFor="browse_search">
            {t.browseTitle}
          </label>
          <input
            id="browse_search"
            className={inputCls}
            type="search"
            placeholder={t.browseSearchPh}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="browse_neighborhood">
              {t.browseNeighborhood}
            </label>
            <select
              id="browse_neighborhood"
              className={inputCls}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            >
              <option value="">{t.browseAll}</option>
              {allNeighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="browse_language">
              {t.browseLanguage}
            </label>
            <select
              id="browse_language"
              className={inputCls}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">{t.browseAll}</option>
              {allLanguages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#d6336c]"
                checked={pricedOnly}
                onChange={(e) => setPricedOnly(e.target.checked)}
              />
              {t.browsePricedOnly}
            </label>
          </div>
        </div>

        <div className="mt-5">
          <span className={labelCls}>{t.browseService}</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setService("")}
              aria-pressed={service === ""}
              className={pill(service === "")}
            >
              {t.browseAll}
            </button>
            {SIMPLE_SERVICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setService(service === s ? "" : s)}
                aria-pressed={service === s}
                className={pill(service === s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-6 text-sm font-semibold" aria-live="polite">
        {filtered.length} {t.browseResults}
      </p>

      {filtered.length === 0 && (
        <p className="mt-4 rounded-2xl border border-line bg-white p-6 text-sm text-muted">
          {t.browseNoResults}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {filtered.map((c) => {
          const low = lowestMatchingPrice(c, query, service);
          const open = expanded === c.name;
          return (
            <article
              key={c.name}
              className="rounded-3xl border border-line bg-white p-5 md:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{c.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {c.neighborhood} · {c.address}
                  </p>
                  {c.phone && (
                    <p className="mt-1 text-sm text-muted">
                      {t.browsePhone}:{" "}
                      <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className="font-medium text-ink hover:text-brand">
                        {c.phone}
                      </a>
                    </p>
                  )}
                  {c.website && (
                    <p className="mt-1 text-sm">
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        {t.browseWebsite} ↗
                      </a>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {low ? (
                    <>
                      <p className="text-lg font-extrabold text-brand-dark">
                        {t.browseFrom} {low.price}
                      </p>
                      <p
                        className="mt-0.5 max-w-[220px] truncate text-xs text-muted"
                        title={low.treatment}
                      >
                        {low.treatment}
                      </p>
                    </>
                  ) : c.prices.length > 0 ? (
                    <p className="max-w-[220px] text-sm font-medium text-muted">
                      {t.browseSeePrices}
                    </p>
                  ) : (
                    <p className="max-w-[220px] text-sm font-medium text-muted">
                      {t.browseNoPrices}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold">{t.browseServices}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.services.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {c.languages.length > 0 && (
                <p className="mt-3 text-sm text-muted">
                  {t.browseLanguages}: {c.languages.map((l) => (t.languages as Record<string, string>)[l] ?? l).join(", ")}
                </p>
              )}

              <button
                type="button"
                onClick={() => setExpanded(open ? null : c.name)}
                aria-expanded={open}
                className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand"
              >
                {open ? t.browseHidePrices : t.browseViewPrices}
              </button>

              {open && (
                <div className="mt-4 rounded-2xl border border-line bg-cream p-4">
                  <h3 className="font-bold">{t.browsePriceList}</h3>
                  {c.prices.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">{t.browseNoPrices}</p>
                  ) : (
                    <ul className="mt-2 space-y-3">
                      {c.prices.map((p) => (
                        <li key={`${p.treatment}-${p.price}`} className="text-sm">
                          <span className="font-semibold">{p.treatment}</span>{" "}
                          <span className="font-bold text-brand-dark">{p.price}</span>
                          {p.unit && <span className="text-muted"> · {p.unit}</span>}
                          <br />
                          <a
                            href={p.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand hover:text-brand-dark"
                          >
                            {t.browseSource}: {p.source_url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    <span className="font-semibold text-ink">{t.browseSourceNotes}:</span>{" "}
                    {c.source_notes}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.browseDisclaimer}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
