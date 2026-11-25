// Persistent storage for clinic applications.
//
// Postgres when DATABASE_URL is set (production / Vercel Postgres).
// Otherwise a local JSON file under .data/ — LOCAL DEV ONLY, never
// production. See db/schema.sql for the Postgres schema.
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import type { Application, ApplicationInput, PriceRow, Status } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

export function usingPostgres(): boolean {
  return Boolean(getDatabaseUrl());
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl:
        connectionString?.includes("sslmode=require") ||
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return pool;
}

async function ensurePostgresSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
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
      status TEXT NOT NULL DEFAULT 'submitted',
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
    -- Migrate live tables created before these columns existed.
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
  `);
}

function toApplication(row: Record<string, unknown>, priceRows: PriceRow[]): Application {
  return {
    id: row.id as string,
    clinic_name: row.clinic_name as string,
    address: row.address as string,
    neighborhood: (row.neighborhood as string) || "",
    contact_name: (row.contact_name as string) || "",
    email: (row.email as string) || "",
    phone: (row.phone as string) || "",
    consultation_contact: (row.consultation_contact as string) || "",
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    licensed: Boolean(row.licensed),
    about: (row.about as string) || "",
    treatments: (row.treatments as string) || "",
    hours: (row.hours as string) || "",
    cases_opt_in: Boolean(row.cases_opt_in),
    price_note: Boolean(row.price_note),
    terms: Boolean(row.terms),
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    services_other: (row.services_other as string) || "",
    doctors_count: (row.doctors_count as string) || "",
    applicant_affiliation: (row.applicant_affiliation as string) || "",
    applicant_position: (row.applicant_position as string) || "",
    entry_type: (row.entry_type as string) || "",
    referral_source: (row.referral_source as string) || "",
    event_support: (row.event_support as string) || "",
    business_type: (row.business_type as string) || "",
    contact_method: (row.contact_method as string) || "", 
    price_rows: priceRows,
    status: row.status as Status,
    created_at: new Date(row.created_at as string).toISOString(),
    updated_at: new Date(row.updated_at as string).toISOString(),
  };
}

async function listPostgres(): Promise<Application[]> {
  await ensurePostgresSchema();
  const p = getPool();
  const { rows } = await p.query(
    "SELECT * FROM applications ORDER BY created_at DESC, id DESC"
  );
  const out: Application[] = [];
  for (const row of rows) {
    const pr = await p.query(
      "SELECT * FROM price_rows WHERE application_id = $1 ORDER BY sort_order ASC",
      [row.id]
    );
    out.push(
      toApplication(
        row,
        pr.rows.map((r) => ({
          id: r.id as string,
          treatment_name: r.treatment_name as string,
          pricing_model: (r.pricing_model as PriceRow["pricing_model"]) || "",
          price: (r.price as string) || "",
          spec: (r.spec as string) || "",
        }))
      )
    );
  }
  return out;
}

async function createPostgres(input: ApplicationInput): Promise<Application> {
  await ensurePostgresSchema();
  const p = getPool();
  const id = randomUUID();
  const now = new Date().toISOString();
  await p.query(
    `INSERT INTO applications
      (id, clinic_name, address, neighborhood, contact_name, email, phone,
       consultation_contact, languages, licensed, about, treatments, hours,
       cases_opt_in, price_note, terms, services, services_other, doctors_count,
       applicant_affiliation, applicant_position, entry_type, referral_source,
       event_support, business_type, contact_method, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,'submitted',$27,$27)`,
    [
      id,
      input.clinic_name,
      input.address,
      input.neighborhood,
      input.contact_name,
      input.email,
      input.phone,
      input.consultation_contact,
      JSON.stringify(input.languages),
      input.licensed,
      input.about,
      input.treatments,
      input.hours,
      input.cases_opt_in,
      input.price_note,
      input.terms,
      JSON.stringify(input.services ?? []),
      input.services_other ?? "",
      input.doctors_count ?? "",
      input.applicant_affiliation ?? "",
      input.applicant_position ?? "",
      input.entry_type ?? "",
      input.referral_source ?? "",
      input.event_support ?? "",
      input.business_type ?? "",
      input.contact_method ?? "",
      now,
    ]
  );
  const priceRows: PriceRow[] = [];
  for (let i = 0; i < input.price_rows.length; i++) {
    const r = input.price_rows[i];
    const rowId = r.id || randomUUID();
    await p.query(
      `INSERT INTO price_rows (id, application_id, treatment_name, pricing_model, price, spec, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [rowId, id, r.treatment_name, r.pricing_model || "", r.price || "", r.spec || "", i]
    );
    priceRows.push({ ...r, id: rowId });
  }
  return { ...input, id, status: "submitted", created_at: now, updated_at: now, price_rows: priceRows };
}

async function updateStatusPostgres(id: string, status: Status): Promise<Application | null> {
  await ensurePostgresSchema();
  const p = getPool();
  const { rows } = await p.query(
    "UPDATE applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id, status]
  );
  if (rows.length === 0) return null;
  const pr = await p.query(
    "SELECT * FROM price_rows WHERE application_id = $1 ORDER BY sort_order ASC",
    [id]
  );
  return toApplication(
    rows[0],
    pr.rows.map((r) => ({
      id: r.id as string,
      treatment_name: r.treatment_name as string,
      pricing_model: (r.pricing_model as PriceRow["pricing_model"]) || "",
      price: (r.price as string) || "",
      spec: (r.spec as string) || "",
    }))
  );
}

async function deletePostgres(id: string): Promise<boolean> {
  await ensurePostgresSchema();
  const { rowCount } = await getPool().query("DELETE FROM applications WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Local JSON fallback (dev only) ----

async function readJson(): Promise<Application[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Application[]) : [];
  } catch {
    return [];
  }
}

async function writeJson(apps: Application[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(apps, null, 2), "utf-8");
}

// ---- Public API (store-agnostic) ----

export async function listApplications(): Promise<Application[]> {
  if (usingPostgres()) return listPostgres();
  const apps = await readJson();
  return [...apps].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function createApplication(input: ApplicationInput): Promise<Application> {
  if (usingPostgres()) return createPostgres(input);
  const now = new Date().toISOString();
  const app: Application = {
    ...input,
    id: randomUUID(),
    status: "submitted",
    created_at: now,
    updated_at: now,
    price_rows: input.price_rows.map((r) => ({ ...r, id: r.id || randomUUID() })),
  };
  const apps = await readJson();
  apps.push(app);
  await writeJson(apps);
  return app;
}

export async function updateApplicationStatus(
  id: string,
  status: Status
): Promise<Application | null> {
  if (usingPostgres()) return updateStatusPostgres(id, status);
  const apps = await readJson();
  const app = apps.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  app.updated_at = new Date().toISOString();
  await writeJson(apps);
  return app;
}

export async function deleteApplication(id: string): Promise<boolean> {
  if (usingPostgres()) return deletePostgres(id);
  const apps = await readJson();
  const next = apps.filter((a) => a.id !== id);
  if (next.length === apps.length) return false;
  await writeJson(next);
  return true;
}

// ---- Validation (shared by the API route) ----

export function validateApplication(input: unknown): {
  ok: boolean;
  error?: string;
  value?: ApplicationInput;
} {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid body." };
  const b = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const clinic_name = str(b.clinic_name);
  const address = str(b.address);
  const email = str(b.email);
  if (!clinic_name || !address) return { ok: false, error: "Clinic name and address are required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Please enter a valid email address." };
  // A submission must include some way to reach the business.
  if (!str(b.email) && !str(b.phone))
    return { ok: false, error: "Please tell us how to reach you." };
  if (b.licensed !== true) return { ok: false, error: "Licensing confirmation is required." };
  if (b.terms !== true) return { ok: false, error: "Price-parity terms agreement is required." };
  const rawRows = Array.isArray(b.price_rows) ? b.price_rows : [];
  const price_rows: PriceRow[] = [];
  for (const r of rawRows) {
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const treatment_name = str(row.treatment_name);
    if (!treatment_name) continue; // empty rows are dropped, not an error
    price_rows.push({
      id: str(row.id) || randomUUID(),
      treatment_name,
      pricing_model: (row.pricing_model as PriceRow["pricing_model"]) || "",
      price: str(row.price),
      spec: str(row.spec),
    });
  }
  const languages = Array.isArray(b.languages)
    ? (b.languages as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const services = Array.isArray(b.services)
    ? (b.services as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    ok: true,
    value: {
      clinic_name,
      address,
      neighborhood: str(b.neighborhood),
      contact_name: str(b.contact_name),
      email,
      phone: str(b.phone),
      consultation_contact: str(b.consultation_contact),
      languages,
      licensed: true,
      about: str(b.about),
      treatments: str(b.treatments),
      hours: str(b.hours),
      cases_opt_in: b.cases_opt_in === true,
      price_rows,
      price_note: b.price_note === true,
      terms: true,
      services,
      services_other: str(b.services_other),
      doctors_count: str(b.doctors_count),
      applicant_affiliation: str(b.applicant_affiliation),
      applicant_position: str(b.applicant_position),
      entry_type: str(b.entry_type),
      referral_source: str(b.referral_source),
      event_support: str(b.event_support),
      business_type: str(b.business_type),
      contact_method: str(b.contact_method),
    },
  };
}
