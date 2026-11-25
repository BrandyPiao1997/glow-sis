-- GlowSis — Postgres schema for clinic applications.
-- Run once against your database (Vercel Postgres runs it via the
-- Vercel dashboard SQL editor, or: psql "$DATABASE_URL" -f db/schema.sql).
-- The app also creates these tables automatically on first use
-- (see lib/store.ts ensurePostgresSchema), so this file is the
-- canonical, reviewable copy of the schema.

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  clinic_name TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  consultation_contact TEXT NOT NULL DEFAULT '',
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  licensed BOOLEAN NOT NULL DEFAULT FALSE,
  about TEXT NOT NULL DEFAULT '',
  treatments TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  cases_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  price_note BOOLEAN NOT NULL DEFAULT FALSE,
  terms BOOLEAN NOT NULL DEFAULT FALSE,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  services_other TEXT NOT NULL DEFAULT '',
  doctors_count TEXT NOT NULL DEFAULT '',
  applicant_affiliation TEXT NOT NULL DEFAULT '',
  applicant_position TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL DEFAULT '',
  referral_source TEXT NOT NULL DEFAULT '',
  event_support TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  contact_method TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_review', 'live')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_rows (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  treatment_name TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  spec TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_price_rows_application ON price_rows(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);

-- Migrate tables created before these fields existed.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS services JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS services_other TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS doctors_count TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_affiliation TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_position TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS referral_source TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS event_support TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact_method TEXT NOT NULL DEFAULT '';
