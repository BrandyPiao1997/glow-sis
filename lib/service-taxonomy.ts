// Service taxonomy — one shared classifier for browse and the AI chat.
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
export function classifyService(service: string): string {
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
