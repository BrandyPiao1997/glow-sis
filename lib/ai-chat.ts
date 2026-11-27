// Server-only helpers for the AI chat: ground Gemini's answers in real
// clinic data so it never invents prices. The chat calls Gemini through
// /api/ai-chat; the key lives in GEMINI_API_KEY (Vercel env) and never
// reaches the browser.
import seed from "@/data/seed-clinics.json";

type SeedPrice = { treatment: string; price: string | number; unit: string; source_url: string };
type SeedClinic = {
  name: string;
  city: string;
  services: string[];
  prices: SeedPrice[];
};

// Same treatment keywords as the chat's scripted replies (EN/ZH/KO).
const TREATMENT_KEYWORDS: { match: string[]; label: string }[] = [
  { match: ["masseter", "咬肌", "교근"], label: "Masseter" },
  { match: ["lip flip", "翻唇", "립 플립"], label: "Lip Flip" },
  { match: ["hair removal", "脱毛", "제모"], label: "Laser Hair Removal" },
  { match: ["botox", "肉毒素", "보톡스"], label: "Botox" },
  { match: ["filler", "填充", "필러"], label: "Filler" },
  { match: ["rejuran", "丽珠兰", "리쥬란"], label: "Rejuran" },
  { match: ["microneedling", "微针", "마이크로니들링"], label: "Microneedling" },
  { match: ["hydrafacial", "水飞梭", "하이드라페이셜"], label: "HydraFacial" },
  { match: ["chemical peel", "换肤", "필링"], label: "Chemical Peel" },
  { match: ["ultherapy", "超声刀", "울쎄라"], label: "Ultherapy" },
  { match: ["thermage", "热玛吉", "써마지"], label: "Thermage" },
  { match: ["hifu", "하이푸"], label: "HIFU" },
  { match: ["thread lift", "线雕", "실 리프팅"], label: "Thread Lift" },
  { match: ["morpheus8", "모피어스"], label: "Morpheus8" },
  { match: ["pico", "皮秒", "피코"], label: "Pico Laser" },
  { match: ["facial", "面部护理", "페이셜"], label: "Facial" },
  { match: ["lifting", "提拉", "리프팅"], label: "Lifting" },
  { match: ["laser", "激光", "레이저"], label: "Laser" },
  { match: ["prp"], label: "PRP" },
];

function parsePriceNum(price: string | number): number | null {
  const m = String(price)
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

// Same comparability rule as the browse cards: only whole-treatment prices
// (per session/area/syringe, quantified amounts like per 300 shots) count —
// bare per-unit / per-cc / per-shot rates, memberships, consults, and
// member-only rates never ground an answer.
function isComparablePrice(p: SeedPrice): boolean {
  const u = p.unit.toLowerCase();
  const t = p.treatment.toLowerCase();
  if (t.includes("membership") || t.includes("consultation") || t.includes("visit fee"))
    return false;
  if (u.includes("per month") || u.includes("per consultation") || u.includes("per enhancement"))
    return false;
  if (u.includes("member") && !u.includes("non-member")) return false;
  if (/per 0\.5/.test(u)) return false;
  if (/\bper unit\b/.test(u) && !/\bper \d+ units?\b/.test(u)) return false;
  if (/\bper cc\b/.test(u) && !/\bper \d+cc/.test(u)) return false;
  if (/\bper shots?\b/.test(u) && !/\bper \d+ shots?\b/.test(u)) return false;
  if (/\bper lines?\b/.test(u) && !/\bper \d+ lines?\b/.test(u)) return false;
  return true;
}

// Cheapest real prices for the treatment the user is asking about, if any.
// Returns the matched treatment label plus up to 5 fact lines.
export function findTreatmentFacts(message: string): { label: string | null; facts: string[] } {
  const s = message.toLowerCase();
  const hit = TREATMENT_KEYWORDS.find((tk) => tk.match.some((m) => s.includes(m)));
  if (!hit) return { label: null, facts: [] };
  const needle = hit.label.toLowerCase();
  const rows: { num: number; line: string }[] = [];
  for (const c of seed.clinics as SeedClinic[]) {
    for (const p of c.prices) {
      if (!p.treatment.toLowerCase().includes(needle)) continue;
      if (!isComparablePrice(p)) continue;
      const n = parsePriceNum(p.price);
      if (n === null) continue;
      rows.push({
        num: n,
        line: `${c.name} (${c.city}): ${p.treatment} ${p.price}${p.unit ? ` ${p.unit}` : ""}`,
      });
    }
  }
  rows.sort((a, b) => a.num - b.num);
  return { label: hit.label, facts: rows.slice(0, 5).map((r) => r.line) };
}

const LANG_NAME: Record<string, string> = { en: "English", zh: "Chinese", ko: "Korean" };

export function buildSystemPrompt(
  lang: string,
  facts: { label: string | null; facts: string[] },
  report: {
    overall: number;
    dimensions: Record<string, number>;
    concerns: string[];
    betterThanPct: number;
    isPlaceholder?: boolean;
  } | null,
): string {
  const lines = [
    "You are GlowSis's AI assistant, a beauty-treatment marketplace with 1,663 clinics across 30 US metros. " +
      `Answer in ${LANG_NAME[lang] ?? "English"}. Keep answers short: 2-4 sentences, plain language.`,
    "Rules:",
    "- Only quote prices or clinics from the FACTS below. Never invent a price, clinic, or treatment. If no facts match, say prices vary by clinic and suggest browsing the Home tab.",
    "- Never diagnose, never recommend a specific treatment for the user's condition, and never say a treatment is safe or right for them. General information only.",
    "- If asked about booking, say they can book a consultation from the clinic's page.",
    "- Do not repeat any disclaimer; the app already shows one.",
  ];
  if (facts.label) {
    lines.push(
      `FACTS — real prices for ${facts.label} from clinics' own websites (checked Nov 2026):`,
    );
    lines.push(...(facts.facts.length > 0 ? facts.facts.map((f) => `- ${f}`) : ["- (none published)"]));
  } else {
    lines.push("FACTS: no specific treatment matched, so no clinic prices to quote.");
  }
  if (report) {
    lines.push(
      `User's skin-test report${report.isPlaceholder ? " (SAMPLE — the real skin-analysis API is not connected yet, say so if you mention it)" : ""}: ` +
        `overall ${report.overall}/100, dimensions ${JSON.stringify(report.dimensions)}, ` +
        `top concerns: ${report.concerns.join(", ")}, better than ${report.betterThanPct}% of users. ` +
        "You may refer to their top concerns in general terms.",
    );
  }
  return lines.join("\n");
}
