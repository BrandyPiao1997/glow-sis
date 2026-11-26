// User skin profile — the result of onboarding (AI chat, skin test, or the
// questionnaire fallback). localStorage is the source of truth; the server
// copy (POST /api/profile) is a backup that only exists when the user is
// signed in and Supabase/Postgres is configured.
import type { SkinReport } from "./skin-analysis";

export const PROFILE_KEY = "glow-sis-profile";
export const POST_AUTH_KEY = "glow-sis-post-auth";

export const CONCERNS = [
  "wrinkles",
  "acne",
  "pigmentation",
  "pores",
  "firmness",
  "dryness",
  "redness",
  "dark circles",
] as const;

export const SKIN_TYPES = ["oily", "dry", "combination", "sensitive"] as const;

export const BUDGETS = ["under-100", "100-300", "300-500", "500-plus"] as const;

export const CITIES = ["New York", "Los Angeles", "Other"] as const;

export interface UserProfile {
  concerns: string[];
  skinType: string;
  city: string;
  budget: string;
  skinReport: SkinReport | null;
  /** True once the user finished the chat or tapped "skip to browse". */
  onboarded: boolean;
  source: "chat" | "skin-test" | "questionnaire" | "skip";
  updatedAt: string;
}

export function emptyProfile(): UserProfile {
  return {
    concerns: [],
    skinType: "",
    city: "",
    budget: "",
    skinReport: null,
    onboarded: false,
    source: "chat",
    updatedAt: new Date().toISOString(),
  };
}

export function loadProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return { ...emptyProfile(), ...parsed };
  } catch {
    return null;
  }
}

export function saveProfile(p: UserProfile): UserProfile {
  const next = { ...p, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, etc.) — profile stays in memory.
  }
  return next;
}

/** Best-effort server backup; localStorage stays the source of truth. */
export async function saveProfileServer(
  p: UserProfile,
  userId: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, user_id: userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
