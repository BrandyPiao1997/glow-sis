// Skin analysis — Perfect Corp YouCam skin analysis API, via the server
// route POST /api/skin-analysis (the key lives in PERFECTCORP_API_KEY on
// the server and never reaches the browser). The route uploads the photo,
// runs the v2.1 task with 13 SD concerns, polls for the result, and maps
// the scores onto our 4 dimensions (sensitivity, skin tone, skin texture,
// skin age) + top concerns, returning a real SkinReport with
// isPlaceholder: false. On failure analyzeSkin() throws and the skin-test
// page shows an error instead of a fake sample report.
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
  /** True only for a sample report — the UI labels it as such. */
  isPlaceholder: boolean;
}

export async function analyzeSkin(photo: Blob): Promise<SkinReport> {
  const form = new FormData();
  form.append("photo", photo, "selfie.jpg");
  const res = await fetch("/api/skin-analysis", { method: "POST", body: form });
  const started = (await res.json().catch(() => null)) as {
    task_id?: string;
    error?: string;
  } | null;
  if (!res.ok || !started?.task_id) {
    throw new Error(started?.error ?? "analysis_failed");
  }
  // A scan takes about 2 minutes on Perfect Corp's side, so poll the
  // status endpoint instead of waiting on one long request.
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(
      `/api/skin-analysis?task_id=${encodeURIComponent(started.task_id)}`,
    );
    const data = (await poll.json().catch(() => null)) as {
      task_status?: string;
      error?: string;
      overall?: number;
    } | null;
    if (!poll.ok) throw new Error(data?.error ?? "analysis_failed");
    if (data?.task_status === "running") continue;
    if (typeof data?.overall === "number") return data as unknown as SkinReport;
    throw new Error("analysis_failed");
  }
  throw new Error("analysis_timeout");
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
