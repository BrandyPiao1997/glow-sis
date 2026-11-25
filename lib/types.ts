export type Lang = "en" | "zh" | "ko";
export type Status = "submitted" | "in_review" | "live";
export type PricingModel =
  | "per_unit"
  | "per_cc"
  | "per_area"
  | "per_syringe"
  | "per_session"
  | "per_course"
  | "per_shot"
  | "flat"
  | "consult";

export interface PriceRow {
  id: string;
  treatment_name: string;
  pricing_model: PricingModel | "";
  price: string;
  spec: string;
}

export interface ApplicationInput {
  clinic_name: string;
  address: string;
  neighborhood: string;
  contact_name: string;
  email: string;
  phone: string;
  consultation_contact: string;
  languages: string[];
  licensed: boolean;
  about: string;
  treatments: string;
  hours: string;
  cases_opt_in: boolean;
  price_rows: PriceRow[];
  price_note: boolean;
  terms: boolean;
  // Form fields (all optional at the API level; the form enforces its own).
  business_type: string;
  contact_method: string;
  website: string; // Clinic website (optional).
  services: string[];
  services_other: string;
  doctors_count: string;
  applicant_affiliation: string;
  applicant_position: string;
  entry_type: string;
  referral_source: string;
  event_support: string;
}

export interface Application extends ApplicationInput {
  id: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

export const PRICING_MODELS: PricingModel[] = [
  "per_unit",
  "per_cc",
  "per_area",
  "per_syringe",
  "per_session",
  "per_course",
  "per_shot",
  "flat",
  "consult",
];

export const STATUSES: Status[] = ["submitted", "in_review", "live"];

// ---------------------------------------------------------------------------
// Services Offered — one level only (Brandy's feedback, Nov 25, 2026).
// Saved and shown as the English labels in every language.
// Business types and contact methods are saved as keys for business_type
// (English label) — see lib/i18n.ts businessTypes — and contact_method.
// ---------------------------------------------------------------------------
export const BUSINESS_TYPES = ["med_spa", "dermatology", "brow_lash", "laser_hair", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const SIMPLE_SERVICES = [
  "Botox & filler",
  "Skin & laser",
  "Lifting",
  "Brows & lashes",
  "Hair removal",
  "Other",
] as const;

export const CONTACT_METHODS = ["phone", "wechat", "email"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];
