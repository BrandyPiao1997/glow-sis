// Skin analysis — integration point for the Perfect Corp skin analysis API.
// There are NO provider credentials yet, so analyzeSkin() is a clearly-marked
// STUB: it returns a SAMPLE report (isPlaceholder: true) after a short delay
// so the UI flow (capture → analyzing → report → chat context) can be built
// and tested. The report screen labels placeholder results as a sample and
// never presents them as a real scan.
//
// TODO (when credentials exist): replace the body of analyzeSkin() with a
// call to the Perfect Corp skin analysis API
// (https://yce.perfectcorp.com/id/ai-api/products/skin-analysis-api):
// upload the photo, read its 28 diagnostics, map them onto our 4 dimensions
// (sensitivity, skin tone, skin texture, skin age) + top concerns, and
// return a real SkinReport with isPlaceholder: false. The report screen
// renders from a SkinReport object, so this is a one-function change.
export interface SkinDimensionScores {
  sensitivity: number; // 0–100
  skinTone: number; // 0–100
  skinTexture: number; // 0–100
  skinAge: number; // 0–100
}

export interface SkinReport {
  overall: number; // 0–100
  dimensions: SkinDimensionScores;
  /** Concern keys, e.g. "redness" — translated via t.concernNames. */
  concerns: string[];
  /** "Better than X% of users" line from the report screen. */
  betterThanPct: number;
  analyzedAt: string; // ISO timestamp
  /** True while analyzeSkin() is the stub — UI must label it a sample. */
  isPlaceholder: boolean;
}

export async function analyzeSkin(_photo: Blob): Promise<SkinReport> {
  // Simulate the analyzing state; the photo is not uploaded anywhere.
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return {
    overall: 77,
    dimensions: { sensitivity: 79, skinTone: 75, skinTexture: 81, skinAge: 74 },
    concerns: ["redness", "pigmentation", "pores"],
    betterThanPct: 85,
    analyzedAt: new Date().toISOString(),
    isPlaceholder: true,
  };
}

// The last skin-test report, kept in localStorage so the AI chat can show
// it as context. This is the only thing left of the old onboarding profile:
// there is no account setup or profile creation anymore — the report is
// just a saved result on this device.
export const SKIN_REPORT_KEY = "glow-sis-skin-report";

export function loadSkinReport(): SkinReport | null {
  try {
    const raw = window.localStorage.getItem(SKIN_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SkinReport;
  } catch {
    return null;
  }
}

export function saveSkinReport(report: SkinReport): void {
  try {
    window.localStorage.setItem(SKIN_REPORT_KEY, JSON.stringify(report));
  } catch {
    // Storage unavailable — the report just won't persist.
  }
}
