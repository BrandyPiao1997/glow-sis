"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { SIMPLE_SERVICES } from "@/lib/types";
import { nearestCity } from "@/lib/city-coords";
import { metroOf } from "@/lib/metros";
import LocationPicker from "@/components/LocationPicker";
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
export function parsePriceNum(price: string | number): number | null {
  // Coerce: a batch once shipped numeric prices (11 instead of "$11") and
  // broke the build here, so never trust the type.
  const m = String(price).replace(/,/g, "").match(/\d+(\.\d+)?/);
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
export function isComparablePrice(p: SeedPrice): boolean {
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
export function lowestMatchingPrice(
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

// ---- Precomputed search data (built once at load, not per keystroke) ----
// classifyService / subTreatmentOf build fresh RegExps on every call, so
// calling them per clinic per keystroke was the expensive part. Each
// distinct service / treatment string is classified exactly once here,
// and every later filter / sort / suggestion pass works off these cheap
// lowercase strings and cached category/sub labels.
interface EnrichedService {
  raw: string;
  lower: string;
  category: string;
  sub: string | null;
}
interface EnrichedPrice {
  raw: SeedPrice;
  lower: string;
  category: string;
  sub: string | null;
  comparable: boolean;
  num: number | null;
}
interface EnrichedClinic {
  clinic: SeedClinic;
  nameLower: string;
  services: EnrichedService[];
  prices: EnrichedPrice[];
}
const ENRICHED_CLINICS: EnrichedClinic[] = (() => {
  const cache = new Map<string, { category: string; sub: string | null }>();
  const metaFor = (name: string) => {
    let m = cache.get(name);
    if (!m) {
      const category = classifyService(name);
      m = { category, sub: subTreatmentOf(name, category) };
      cache.set(name, m);
    }
    return m;
  };
  return CLINICS.map((clinic) => ({
    clinic,
    nameLower: clinic.name.toLowerCase(),
    services: clinic.services.map((raw) => {
      const { category, sub } = metaFor(raw);
      return { raw, lower: raw.toLowerCase(), category, sub };
    }),
    prices: clinic.prices.map((raw) => {
      const { category, sub } = metaFor(raw.treatment);
      return {
        raw,
        lower: raw.treatment.toLowerCase(),
        category,
        sub,
        comparable: isComparablePrice(raw),
        num: parsePriceNum(raw.price),
      };
    }),
  }));
})();
const ALL_SERVICES = [
  ...new Set(ENRICHED_CLINICS.flatMap((e) => e.services.map((s) => s.raw))),
];
const PAGE_SIZE = 30;

export default function BrowseClinics({ t }: { t: Dict }) {
  const [query, setQuery] = useState("");
  // The text the user is typing (updates instantly, so typing never lags)
  // vs. the text the list is actually filtered by (updated 300ms after
  // the user stops typing). 2s would feel broken; 300ms is the usual
  // pause-typing delay.
  const [appliedQuery, setAppliedQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setAppliedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);
  // Deep link from the AI chat: /browse?q=Microneedling pre-fills the
  // search box (the 300ms debounce above then applies it to the list).
  // Read on mount only, from window.location — the server and first
  // client render agree on the empty query, so there is no hydration
  // mismatch, and no Suspense boundary (which useSearchParams would
  // need around the whole list) is required.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (q) {
      const id = setTimeout(() => setQuery(q), 0);
      return () => clearTimeout(id);
    }
  }, []);
  // Infinite scroll: only the first page is rendered; more loads when the
  // sentinel at the bottom of the list scrolls into view. No button.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Metro area filter ("" = all). Clinics are filed under their real
  // municipality, but the picker groups them: Los Angeles covers its
  // dozens of small cities, New York is one municipality.
  const [metro, setMetro] = useState("");
  // Remember the picked metro for the AI tab, which searches near it.
  // Cleared when "All locations" is chosen.
  useEffect(() => {
    try {
      if (metro) window.localStorage.setItem("glow-sis-metro", metro);
      else window.localStorage.removeItem("glow-sis-metro");
    } catch {
      // Storage unavailable — the AI tab just searches nationwide.
    }
  }, [metro]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [service, setService] = useState("");
  const [sub, setSub] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Clinic whose full service-chip list is shown (collapsed cards show 3).
  const [allChips, setAllChips] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "far" | "error">("idle");

  // "Locate me": ask the browser for the user's position once, then pick
  // the nearest city in the data (within 50 miles) and select its metro
  // area. Nothing is stored — it just sets the location filter. Permission
  // denied, timeout, or too far from every city all fall back to picking
  // a city by hand.
  const locateMe = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = nearestCity(pos.coords.latitude, pos.coords.longitude);
        if (found) {
          setMetro(metroOf(found));
          setLocStatus("idle");
        } else {
          setLocStatus("far");
        }
      },
      () => setLocStatus("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Translate a taxonomy/service label into the current language.
  const trLabel = (map: Record<string, string>, key: string) => map[key] ?? key;

  // Most-offered treatments across all clinics, by number of clinics
  // offering each sub-treatment — the default "trending" suggestions
  // shown before the user types anything.
  const popularSubs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of ENRICHED_CLINICS) {
      const seen = new Set<string>();
      for (const s of e.services) if (s.sub) seen.add(s.sub);
      for (const p of e.prices) if (p.sub) seen.add(p.sub);
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
    // Clinic service names (precomputed distinct list, not rebuilt per keystroke).
    for (const s of ALL_SERVICES) {
      const display = trLabel(chipMap, s);
      if (s.toLowerCase().includes(q) || display.toLowerCase().includes(q)) {
        push(s, display, t.browseService);
      }
    }
    // Clinic names.
    for (const e of ENRICHED_CLINICS) {
      if (e.nameLower.includes(q)) {
        push(e.clinic.name, e.clinic.name, "");
      }
    }
    return out;
  }, [query, popularSubs, t]);

  // Second-layer pills for the selected category, built from the data:
  // only sub-treatments at least one clinic actually offers.
  const availableSubs = useMemo(() => {
    if (!service) return [];
    const seen = new Set<string>();
    for (const e of ENRICHED_CLINICS) {
      for (const s of e.services) if (s.sub && s.category === service) seen.add(s.sub);
      for (const p of e.prices) if (p.sub && p.category === service) seen.add(p.sub);
    }
    return (SUB_TREATMENTS[service] ?? [])
      .map((s) => s.label)
      .filter((label) => seen.has(label));
  }, [service]);

  // Metros, most clinics first.
  const allMetros = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of CLINICS) {
      const m = metroOf(c.city);
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, []);

  // Filter + rank in ONE pass per clinic, over the debounced query.
  // The old version re-computed relevance and the lowest matching price
  // inside the sort comparator, so the same expensive work ran O(n log n)
  // times. Here each clinic is scored once, then the sort is a cheap
  // comparison of two numbers.
  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    const chipMap = t.serviceChipNames as Record<string, string>;
    const subMap = t.subTreatmentNames as Record<string, string>;
    const matches = (lower: string, raw: string, sub: string | null) => {
      if (!q) return false;
      if (lower.includes(q)) return true;
      const chip = chipMap[raw];
      if (chip && chip.toLowerCase().includes(q)) return true;
      if (sub) {
        if (sub.toLowerCase().includes(q)) return true;
        const tr = subMap[sub];
        if (tr && tr.toLowerCase().includes(q)) return true;
      }
      return false;
    };
    const out: { clinic: SeedClinic; low: SeedPrice | null; rel: number; priceNum: number | null }[] = [];
    for (const e of ENRICHED_CLINICS) {
      const c = e.clinic;
      if (pricedOnly && c.prices.length === 0) continue;
      if (metro && metroOf(c.city) !== metro) continue;
      if (service && !e.services.some((s) => s.category === service)) continue;
      if (sub && !e.services.some((s) => s.category === service && s.sub === sub) && !e.prices.some((pr) => pr.category === service && pr.sub === sub)) continue;
      let rel = 0;
      if (q) {
        const nameHit = e.nameLower.includes(q);
        const priceHit = e.prices.some((pr) => matches(pr.lower, pr.raw.treatment, pr.sub));
        const serviceHit = e.services.some((sv) => matches(sv.lower, sv.raw, sv.sub));
        if (!nameHit && !priceHit && !serviceHit) continue;
        if (nameHit) rel += 3;
        if (priceHit) rel += 2;
        if (serviceHit) rel += 1;
      }
      // Lowest comparable price for this search/filter, same rule as
      // lowestMatchingPrice: rows matching the service/sub filter, then
      // rows whose treatment matches the query (falling back to all rows
      // when only the clinic name matches, and to none otherwise).
      let rows = e.prices;
      if (service) rows = rows.filter((pr) => pr.category === service);
      if (sub) rows = rows.filter((pr) => pr.sub === sub);
      if (q) {
        const byTreatment = rows.filter((pr) => matches(pr.lower, pr.raw.treatment, pr.sub));
        if (byTreatment.length > 0) rows = byTreatment;
        else if (!e.nameLower.includes(q)) rows = [];
      }
      let low: SeedPrice | null = null;
      let priceNum: number | null = null;
      for (const pr of rows) {
        if (!pr.comparable || pr.num === null) continue;
        if (priceNum === null || pr.num < priceNum) {
          priceNum = pr.num;
          low = pr.raw;
        }
      }
      out.push({ clinic: c, low, rel, priceNum });
    }
    out.sort((a, b) => {
      if (a.rel !== b.rel) return b.rel - a.rel;
      if (a.priceNum !== null && b.priceNum !== null && a.priceNum !== b.priceNum)
        return a.priceNum - b.priceNum;
      if (a.priceNum === null && b.priceNum !== null) return 1;
      if (a.priceNum !== null && b.priceNum === null) return -1;
      return a.clinic.name.localeCompare(b.clinic.name);
    });
    return out;
  }, [appliedQuery, metro, service, sub, pricedOnly, t]);

  // Reset to the first page whenever any filter changes. (Render-time
  // adjustment, per React docs: React re-renders immediately with the
  // reset value before committing, so the list never shows page 2 of an
  // old filter.)
  const filterKey = `${appliedQuery}|${metro}|${service}|${sub}|${pricedOnly}`;
  const [prevFilterKey, setPrevFilterKey] = useState("");
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  // What is actually rendered: the first page of the filtered list.
  const visible = filtered.slice(0, visibleCount);
  // Infinite scroll: when the sentinel at the bottom of the rendered
  // list comes into view (a little early, so the next page is ready by
  // the time the user reaches the bottom), render the next page.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

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
          <label className={labelCls} htmlFor="browse_city">
            {t.browseLocation}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <button
                type="button"
                id="browse_city"
                onClick={() => setPickerOpen(true)}
                aria-label={t.browseLocation}
                className={`${inputCls} flex w-full items-center gap-2 pl-9 pr-9 text-left`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {metro || t.browseAllLocations}
                </span>
              </button>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>
            <button
              type="button"
              onClick={locateMe}
              disabled={locStatus === "locating"}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-cream px-3 py-2.5 text-sm font-semibold text-ink hover:border-brand disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-brand"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9"></circle>
                <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"></circle>
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2"></path>
              </svg>
              {locStatus === "locating" ? t.browseLocating : t.browseUseLocation}
            </button>
          </div>
          {locStatus === "far" && (
            <p className="mt-1.5 text-xs text-muted">{t.browseLocationFar}</p>
          )}
          {locStatus === "error" && (
            <p className="mt-1.5 text-xs text-muted">{t.browseLocationError}</p>
          )}
        </div>

        <div className="relative mt-5">
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

        <div className="mt-5 flex items-end pb-1">
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

      <div className="mt-4 space-y-3 md:space-y-4">
        {visible.map(({ clinic: c, low }) => {
          const open = expanded === c.name;
          return (
            <article
              key={c.name}
              className="rounded-2xl border border-line bg-white p-3.5 md:rounded-3xl md:p-6"
            >
              {/* Compact card (Option A): name + price on one line, address
                  truncated to one line, treatment under it, 3 service chips
                  + a count, small buttons. Phone/website live in the
                  expanded price panel, not the collapsed card. */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-base font-bold md:text-lg">
                  {c.name}
                </h2>
                <div className="shrink-0 text-right">
                  {low ? (
                    <p className="text-base font-extrabold whitespace-nowrap text-brand-dark md:text-lg">
                      {t.browseFrom} {low.price}
                    </p>
                  ) : c.prices.length > 0 ? (
                    <p className="max-w-[160px] text-xs font-medium text-muted md:max-w-[220px] md:text-sm">
                      {t.browseSeePrices}
                    </p>
                  ) : (
                    <p className="max-w-[160px] text-xs font-medium text-muted md:max-w-[220px] md:text-sm">
                      {t.browseNoPrices}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted md:text-sm">
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
              {low && (
                <p className="mt-0.5 truncate text-xs text-muted" title={low.treatment}>
                  {low.treatment}
                </p>
              )}

              <div className="mt-3 md:mt-4">
                <p className="hidden text-sm font-semibold md:block">{t.browseServices}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(allChips === c.name ? c.services : c.services.slice(0, 3)).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark"
                    >
                      {(t.serviceChipNames as Record<string, string>)[s] ?? s}
                    </span>
                  ))}
                  {c.services.length > 3 && allChips !== c.name && (
                    <button
                      type="button"
                      onClick={() => setAllChips(c.name)}
                      className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink"
                    >
                      {t.browseMoreServices.replace("{n}", String(c.services.length - 3))}
                    </button>
                  )}
                  {allChips === c.name && c.services.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setAllChips(null)}
                      className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink"
                    >
                      {t.browseShowLess}
                    </button>
                  )}
                </div>
              </div>

              {c.languages.length > 0 && (
                <p className="mt-2 text-xs text-muted md:mt-3 md:text-sm">
                  {t.browseLanguages}: {c.languages.map((l) => (t.languages as Record<string, string>)[l] ?? l).join(", ")}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : c.name)}
                  aria-expanded={open}
                  className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold hover:border-brand md:px-4 md:py-2 md:text-sm"
                >
                  {open ? t.browseHidePrices : t.browseViewPrices}
                </button>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark md:px-4 md:py-2 md:text-sm"
                  >
                    {t.browseBookConsult} ↗
                  </a>
                )}
              </div>

              {open && (
                <div className="mt-3 rounded-2xl border border-line bg-cream p-4 md:mt-4">
                  {(c.phone || c.website) && (
                    <div className="mb-3 space-y-1 border-b border-line pb-3 text-sm">
                      {c.phone && (
                        <p className="text-muted">
                          {t.browsePhone}:{" "}
                          <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className="font-medium text-ink hover:text-brand">
                            {c.phone}
                          </a>
                        </p>
                      )}
                      {c.website && (
                        <p>
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
                  )}
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

      {/* Infinite-scroll sentinel: when this scrolls into view, the next
          page of results renders. No button, nothing to tap. */}
      {visibleCount < filtered.length && (
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      )}

      {pickerOpen && (
        <LocationPicker
          t={t}
          cities={allMetros}
          city={metro}
          onSelectCity={(c) => setMetro(c)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
