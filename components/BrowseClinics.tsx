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

// Classify one service/treatment string into exactly ONE category
// (SIMPLE_SERVICES). Word-boundary matching plus a precedence order, so
// look-alikes don't leak across categories:
//  - "Laser hair removal" is Hair removal, not Skin & laser (bare "laser"
//    must not claim it), and "threading" is hair removal too.
//  - "Eyebrow threading" / "Lash lift" are Brows & lashes / Hair removal,
//    not Lifting — "thread" only counts in "thread lift"/"PDO thread", and
//    "lift" alone (lash lift, brow lift) is not skin lifting.
//  - "Skin tightening" is Lifting, not Skin & laser (bare "skin" must not
//    claim it).
// Precedence (most specific first): Hair removal, Brows & lashes,
// Botox & filler, Lifting, Skin & laser, then Other.
function classifyService(service: string): string {
  const s = service.toLowerCase();
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word-boundary match, trying both singular and plural ("filler" must
  // match "Dermal fillers", "facial" must match "Facials"). The trailing
  // boundary is what keeps "thread" from matching "threading".
  const has = (...words: string[]) =>
    words.some((w) =>
      [w, ...(w.endsWith("s") ? [] : [`${w}s`])].some((f) =>
        new RegExp(`\\b${esc(f)}\\b`).test(s),
      ),
    );
  if (
    has(
      "hair removal", "laser hair", "waxing", "wax", "threading",
      "electrolysis", "sugaring", "gentlemax", "diode",
    )
  )
    return "Hair removal";
  if (
    has(
      "brow", "lash", "lashes", "eyebrow", "eyelash", "eyelashes",
      "microblading", "lamination",
    )
  )
    return "Brows & lashes";
  if (
    has(
      "botox", "filler", "xeomin", "daxxify", "juvederm", "sculptra",
      "radiesse", "skinvive", "lip flip", "masseter", "neurotoxin",
      "dermal filler",
    )
  )
    return "Botox & filler";
  if (
    has(
      "ultherapy", "thermage", "oligio", "xerf", "titan", "hifu",
      "thread lift", "pdo", "skin tightening", "liquid facelift",
      "lifting", "facelift", "contouring",
    )
  )
    return "Lifting";
  if (
    has(
      "facial", "laser", "skin", "rejuran", "peel", "microneedling", "prp",
      "hydrafacial", "photon", "pico", "genesis", "morpheus8", "forma",
      "rf microneedling", "resurfacing", "chemical", "meso", "pdrn",
      "exosome", "mts", "ldm", "dermatoxin",
    )
  )
    return "Skin & laser";
  return "Other";
}

function serviceMatchesCategory(service: string, category: string): boolean {
  return classifyService(service) === category;
}

// The first number in the price — for a range like "$100–$150" that's the
// low end, which is what a "from $X" headline should show. (The old version
// stripped all non-digits, turning "$100–$150" into 100150.)
function parsePriceNum(price: string): number | null {
  const m = price.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
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
    const list = CLINICS.filter((c) => {
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
    // Rank: search relevance first, then price low to high.
    // Relevance: name match (3) > treatment match (2) > service match (1).
    // Price: the clinic's lowest comparable price for the current search/filter;
    // clinics with no comparable price sort last, then alphabetical for stability.
    const relevance = (c: SeedClinic) => {
      if (!q) return 0;
      let score = 0;
      if (c.name.toLowerCase().includes(q)) score += 3;
      if (c.prices.some((p) => p.treatment.toLowerCase().includes(q))) score += 2;
      if (c.services.some((s) => s.toLowerCase().includes(q))) score += 1;
      return score;
    };
    const priceOf = (c: SeedClinic) => {
      const low = lowestMatchingPrice(c, query, service);
      return low ? parsePriceNum(low.price) : null;
    };
    return list.sort((a, b) => {
      const rel = relevance(b) - relevance(a);
      if (rel !== 0) return rel;
      const pa = priceOf(a);
      const pb = priceOf(b);
      if (pa !== null && pb !== null && pa !== pb) return pa - pb;
      if (pa === null && pb !== null) return 1;
      if (pa !== null && pb === null) return -1;
      return a.name.localeCompare(b.name);
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
          {t.browseSeedNote.replace("{count}", String(CLINICS.length))}
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
                    {c.neighborhood} ·{" "}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-brand hover:underline"
                    >
                      {c.address} ↗
                    </a>
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

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : c.name)}
                  aria-expanded={open}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand"
                >
                  {open ? t.browseHidePrices : t.browseViewPrices}
                </button>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    {t.browseBookConsult} ↗
                  </a>
                )}
              </div>

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
