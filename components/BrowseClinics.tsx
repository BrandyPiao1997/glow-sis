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
      "botox", "filler", "xeomin", "dysport", "jeuveau", "daxxify", "juvederm", "sculptra",
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

// Second layer: specific treatments within a category. Each sub-treatment
// has keyword matchers, first match wins (specific before generic, e.g.
// "Lip Flip" before "Botox", "Morpheus8" before "Laser"). A name only
// counts for a sub-treatment when it already belongs to that category —
// "Laser hair removal" can never be a Skin & laser sub-treatment.
const SUB_TREATMENTS: Record<string, { label: string; keywords: string[] }[]> = {
  "Botox & filler": [
    { label: "Lip Flip", keywords: ["lip flip"] },
    { label: "Masseter", keywords: ["masseter", "jaw slimming"] },
    {
      label: "Botox",
      keywords: ["botox", "xeomin", "dysport", "jeuveau", "daxxify", "neurotoxin", "dermatoxin"],
    },
    {
      label: "Filler",
      keywords: ["filler", "juvederm", "sculptra", "radiesse", "skinvive"],
    },
  ],
  "Skin & laser": [
    { label: "HydraFacial", keywords: ["hydrafacial"] },
    { label: "Microneedling", keywords: ["microneedling", "mts", "potenza", "sylfirm"] },
    { label: "Morpheus8", keywords: ["morpheus8"] },
    { label: "Pico Laser", keywords: ["pico"] },
    { label: "Rejuran", keywords: ["rejuran", "pdrn"] },
    { label: "Chemical Peel", keywords: ["chemical peel", "peel"] },
    { label: "PRP", keywords: ["prp"] },
    {
      label: "Laser",
      keywords: ["laser", "ipl", "photon", "genesis", "clear + brilliant", "aerolase"],
    },
    { label: "Facial", keywords: ["facial"] },
  ],
  Lifting: [
    { label: "Ultherapy", keywords: ["ultherapy"] },
    { label: "Thermage", keywords: ["thermage"] },
    { label: "HIFU", keywords: ["hifu", "ultraformer"] },
    { label: "Oligio", keywords: ["oligio"] },
    { label: "Thread Lift", keywords: ["thread lift", "pdo"] },
    {
      label: "Skin Tightening",
      keywords: ["skin tightening", "titan", "xerf", "forma"],
    },
    { label: "Facelift", keywords: ["facelift", "liquid facelift", "contouring"] },
  ],
  "Brows & lashes": [
    { label: "Brow Lamination", keywords: ["brow lamination", "lamination"] },
    { label: "Microblading", keywords: ["microblading", "powder brow", "ombre brow"] },
    { label: "Lash Lift", keywords: ["lash lift"] },
    { label: "Lash Tint", keywords: ["lash tint", "lash tinting"] },
    {
      label: "Lash Extensions",
      keywords: ["lash extension", "cluster lash", "classic lash", "volume lash", "hybrid lash"],
    },
    { label: "Brow Tint", keywords: ["brow tint", "brow tinting"] },
  ],
  "Hair removal": [
    { label: "Laser Hair Removal", keywords: ["laser hair", "hair removal"] },
    { label: "Waxing", keywords: ["waxing", "wax"] },
    { label: "Threading", keywords: ["threading"] },
    { label: "Electrolysis", keywords: ["electrolysis"] },
  ],
  Other: [],
};

// The specific treatment a service/price name is, within a category —
// or null when it doesn't match any sub-treatment of that category.
function subTreatmentOf(name: string, category: string): string | null {
  if (classifyService(name) !== category) return null;
  const s = name.toLowerCase();
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (w: string) =>
    [w, ...(w.endsWith("s") ? [] : [`${w}s`])].some((f) =>
      new RegExp(`\\b${esc(f)}\\b`).test(s),
    );
  for (const sub of SUB_TREATMENTS[category] ?? []) {
    if (sub.keywords.some((k) => has(k))) return sub.label;
  }
  return null;
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
  sub: string,
  matchText?: (text: string, q: string) => boolean,
): SeedPrice | null {
  const q = query.trim().toLowerCase();
  let rows = clinic.prices;
  if (service) {
    rows = rows.filter((p) => serviceMatchesCategory(p.treatment, service));
  }
  if (sub) {
    rows = rows.filter((p) => subTreatmentOf(p.treatment, service) === sub);
  }
  if (q) {
    const matches = (text: string) =>
      matchText ? matchText(text, q) : text.toLowerCase().includes(q);
    const byTreatment = rows.filter((p) => matches(p.treatment));
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
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [service, setService] = useState("");
  const [sub, setSub] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Translate a taxonomy/service label into the current language.
  const trLabel = (map: Record<string, string>, key: string) => map[key] ?? key;

  // Does a piece of English data (a service or price-treatment name)
  // match the query in any language? Checks the raw English text, its
  // Chinese/Korean translation, and the sub-treatment it belongs to
  // (also in English and translated) — so typing 肉毒素 or 보톡스 finds
  // Botox rows, and the search box never has to show English.
  const matchText = (text: string, q: string) => {
    const lower = text.toLowerCase();
    if (lower.includes(q)) return true;
    const chipMap = t.serviceChipNames as Record<string, string>;
    const chip = chipMap[text];
    if (chip && chip.toLowerCase().includes(q)) return true;
    const subMap = t.subTreatmentNames as Record<string, string>;
    const label = subTreatmentOf(text, classifyService(text));
    if (label) {
      if (label.toLowerCase().includes(q)) return true;
      const tr = subMap[label];
      if (tr && tr.toLowerCase().includes(q)) return true;
    }
    return false;
  };

  // Most-offered treatments across all clinics, by number of clinics
  // offering each sub-treatment — the default "trending" suggestions
  // shown before the user types anything.
  const popularSubs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of CLINICS) {
      const seen = new Set<string>();
      for (const s of c.services) {
        const label = subTreatmentOf(s, classifyService(s));
        if (label) seen.add(label);
      }
      for (const p of c.prices) {
        const label = subTreatmentOf(p.treatment, classifyService(p.treatment));
        if (label) seen.add(label);
      }
      for (const label of seen) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label]) => label);
  }, []);

  // Autocomplete suggestions for the current query. Each suggestion
  // carries the English value the search actually matches against, and
  // a display label in the current language — so typing in Chinese or
  // Korean still finds the English treatment names in the data.
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const subMap = t.subTreatmentNames as Record<string, string>;
    const chipMap = t.serviceChipNames as Record<string, string>;
    const out: { value: string; display: string; kind: string }[] = [];
    const seen = new Set<string>();
    const push = (value: string, display: string, kind: string) => {
      if (seen.has(value) || out.length >= 8) return;
      seen.add(value);
      out.push({ value, display, kind });
    };
    if (!q) {
      for (const label of popularSubs) {
        push(label, trLabel(subMap, label), t.browseTreatment);
      }
      return out;
    }
    // Sub-treatments first (match English or translated label).
    for (const cat of Object.keys(SUB_TREATMENTS)) {
      for (const s of SUB_TREATMENTS[cat]) {
        const display = trLabel(subMap, s.label);
        if (
          s.label.toLowerCase().includes(q) ||
          display.toLowerCase().includes(q)
        ) {
          push(s.label, display, t.browseTreatment);
        }
      }
    }
    // Clinic service names.
    const services = new Set<string>();
    for (const c of CLINICS) for (const s of c.services) services.add(s);
    for (const s of services) {
      const display = trLabel(chipMap, s);
      if (s.toLowerCase().includes(q) || display.toLowerCase().includes(q)) {
        push(s, display, t.browseService);
      }
    }
    // Clinic names.
    for (const c of CLINICS) {
      if (c.name.toLowerCase().includes(q)) {
        push(c.name, c.name, "");
      }
    }
    return out;
  }, [query, popularSubs, t]);

  // Second-layer pills for the selected category, built from the data:
  // only sub-treatments at least one clinic actually offers.
  const availableSubs = useMemo(() => {
    if (!service) return [];
    const seen = new Set<string>();
    for (const c of CLINICS) {
      for (const s of c.services) {
        const label = subTreatmentOf(s, service);
        if (label) seen.add(label);
      }
      for (const p of c.prices) {
        const label = subTreatmentOf(p.treatment, service);
        if (label) seen.add(label);
      }
    }
    return (SUB_TREATMENTS[service] ?? [])
      .map((s) => s.label)
      .filter((label) => seen.has(label));
  }, [service]);

  // Cities, most clinics first; neighborhoods only within the chosen city.
  const allCities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of CLINICS) counts.set(c.city, (counts.get(c.city) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, []);

  const cityNeighborhoods = useMemo(
    () =>
      city
        ? [...new Set(CLINICS.filter((c) => c.city === city).map((c) => c.neighborhood))].sort()
        : [],
    [city],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = CLINICS.filter((c) => {
      if (pricedOnly && c.prices.length === 0) return false;
      if (city && c.city !== city) return false;
      if (neighborhood && c.neighborhood !== neighborhood) return false;
      if (service && !c.services.some((s) => serviceMatchesCategory(s, service)))
        return false;
      if (sub) {
        const hasSub =
          c.services.some((s) => subTreatmentOf(s, service) === sub) ||
          c.prices.some((p) => subTreatmentOf(p.treatment, service) === sub);
        if (!hasSub) return false;
      }
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          c.services.some((s) => matchText(s, q)) ||
          c.prices.some((p) => matchText(p.treatment, q));
        if (!hit) return false;
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
      if (c.prices.some((p) => matchText(p.treatment, q))) score += 2;
      if (c.services.some((s) => matchText(s, q))) score += 1;
      return score;
    };
    const priceOf = (c: SeedClinic) => {
      const low = lowestMatchingPrice(c, query, service, sub, matchText);
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
  }, [query, city, neighborhood, service, sub, pricedOnly, t]);

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
        <div className="relative">
          <label className={labelCls} htmlFor="browse_search">
            {t.browseTitle}
          </label>
          <input
            id="browse_search"
            className={inputCls}
            type="search"
            placeholder={t.browseSearchPh}
            value={query}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(-1);
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, -1));
              } else if (e.key === "Enter" && activeIdx >= 0) {
                e.preventDefault();
                setQuery(suggestions[activeIdx].display);
                setSearchFocused(false);
              } else if (e.key === "Escape") {
                setSearchFocused(false);
              }
            }}
          />
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
              <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted">
                {query.trim() ? t.browseSuggestions : t.browseTrending}
              </p>
              <ul>
                {suggestions.map((s, i) => (
                  <li key={s.value}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(s.display);
                        setSearchFocused(false);
                      }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                        i === activeIdx ? "bg-brand-soft" : "hover:bg-cream"
                      }`}
                    >
                      <span className="font-medium">{s.display}</span>
                      {s.kind && (
                        <span className="shrink-0 text-xs text-muted">{s.kind}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="browse_city">
              {t.browseCity}
            </label>
            <select
              id="browse_city"
              className={inputCls}
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setNeighborhood("");
              }}
            >
              <option value="">{t.browseAll}</option>
              {allCities.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="browse_neighborhood">
              {t.browseNeighborhood}
            </label>
            <select
              id="browse_neighborhood"
              className={inputCls}
              value={neighborhood}
              disabled={!city}
              onChange={(e) => setNeighborhood(e.target.value)}
            >
              <option value="">{city ? t.browseAll : t.browseSelectCityFirst}</option>
              {cityNeighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
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
              onClick={() => {
                setService("");
                setSub("");
              }}
              aria-pressed={service === ""}
              className={pill(service === "")}
            >
              {t.browseAll}
            </button>
            {SIMPLE_SERVICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setService(service === s ? "" : s);
                  setSub("");
                }}
                aria-pressed={service === s}
                className={pill(service === s)}
              >
                {(t.serviceNames as Record<string, string>)[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {service !== "" && availableSubs.length > 0 && (
          <div className="mt-4">
            <span className={labelCls}>{t.browseTreatment}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSub("")}
                aria-pressed={sub === ""}
                className={pill(sub === "")}
              >
                {t.browseAll}
              </button>
              {availableSubs.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSub(sub === label ? "" : label)}
                  aria-pressed={sub === label}
                  className={pill(sub === label)}
                >
                  {(t.subTreatmentNames as Record<string, string>)[label] ?? label}
                </button>
              ))}
            </div>
          </div>
        )}
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
          const low = lowestMatchingPrice(c, query, service, sub, matchText);
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
                      {(t.serviceChipNames as Record<string, string>)[s] ?? s}
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
