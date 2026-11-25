"use client";

import { useCallback, useEffect, useState } from "react";
import { WECHAT_ID, dicts } from "@/lib/i18n";
import type { Application, Status } from "@/lib/types";
import { STATUSES } from "@/lib/types";

export default function AdminPage() {
  const t = dicts.en; // Admin is Brandy-only; English UI.
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [devWarning, setDevWarning] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/applications", { headers: { "x-admin-password": pw } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not load applications.");
        setAuthed(false);
        return;
      }
      setApps(data.applications ?? []);
      setDevWarning(data.adminConfigured === false);
      setAuthed(true);
      window.sessionStorage.setItem("glow-admin-pw", pw);
    } catch {
      setError("Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("glow-admin-pw");
    if (saved !== null) {
      setPassword(saved);
      void load(saved);
    }
  }, [load]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    await load(password);
  }

  async function setStatus(id: string, status: Status) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setApps((prev) => prev.map((a) => (a.id === id ? data.application : a)));
    } else {
      setError("Could not update status.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this application? This cannot be undone.")) return;
    const res = await fetch(`/api/applications/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    if (res.ok) setApps((prev) => prev.filter((a) => a.id !== id));
    else setError("Could not delete the application.");
  }

  const logo = (
    <span className="font-extrabold tracking-tight">
      <span className="text-ink">Glow</span>
      <span className="text-brand">Sis</span>
    </span>
  );

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-extrabold">
          {logo} — {t.adminTitle}
        </h1>
        <form onSubmit={unlock} className="mt-6 space-y-4 rounded-3xl border border-line bg-white p-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="admin_pw">
              {t.adminPasswordLabel}
            </label>
            <input
              id="admin_pw"
              type="password"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              placeholder={t.adminPasswordPh}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark">
            {t.adminUnlock}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Password is kept in this browser tab only (sessionStorage) and sent as the x-admin-password header.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            {logo} — {t.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-muted">{t.adminSub}</p>
        </div>
        <a href="/" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand">
          ← Back to site
        </a>
      </div>

      {devWarning && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {t.adminDevWarning}
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p>}
      {loading && <p className="mt-4 text-sm text-muted">Loading…</p>}

      {!loading && apps.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-white p-6 text-sm text-muted">{t.adminEmpty}</p>
      )}

      <div className="mt-6 space-y-4">
        {apps.map((a) => (
          <article key={a.id} className="rounded-3xl border border-line bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{a.clinic_name}</h2>
                <p className="text-sm text-muted">
                  {[a.address, a.business_type].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {a.id} · {t.adminSubmitted}: {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold" htmlFor={`status-${a.id}`}>
                  {t.adminStatus}
                </label>
                <select
                  id={`status-${a.id}`}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
                  value={a.status}
                  onChange={(e) => void setStatus(a.id, e.target.value as Status)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t.statuses[s]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold">{t.adminContact}</p>
                <p className="mt-1 text-muted">
                  {[a.contact_name, a.email, a.phone].filter(Boolean).join(" · ") || "—"}
                </p>
                {a.contact_method && (
                  <p className="mt-1 text-muted">
                    {t.adminContactMethod}: {t.contactMethods[a.contact_method] ?? a.contact_method}
                  </p>
                )}
                {a.website && (
                  <p className="mt-1 text-muted">
                    {t.adminWebsite}:{" "}
                    {a.website.startsWith("http") ? (
                      <a href={a.website} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {a.website} ↗
                      </a>
                    ) : (
                      a.website
                    )}
                  </p>
                )}
                <p className="mt-1 text-muted">
                  {t.formLanguages}: {a.languages.join(", ") || "—"}
                </p>
                <p className="mt-2">
                  {a.licensed ? `✓ ${t.adminLicensed}` : `✗ ${t.adminNotLicensed}`}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t.adminServices}</p>
                {(a.services?.length || a.services_other) ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(a.services ?? []).map((sv) => (
                      <span key={sv} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">{sv}</span>
                    ))}
                    {a.services_other && <span className="text-muted">{a.services_other}</span>}
                  </div>
                ) : (
                  <p className="mt-1 text-muted">—</p>
                )}
                <p className="mt-3 font-semibold">{t.adminPriceRows}</p>
                {a.price_rows.length === 0 ? (
                  <p className="mt-1 text-muted">{a.price_note ? t.adminPriceListPending : t.adminNoPrice}</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-muted">
                    {a.price_rows.map((r) => (
                      <li key={r.id}>
                        {r.treatment_name}
                        {r.pricing_model ? ` — ${t.pricingModels[r.pricing_model]}` : ""}
                        {r.price ? ` — $${r.price}` : ""}
                        {r.spec ? ` (${r.spec})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {a.about && <p className="mt-3 text-sm text-muted">{a.about}</p>}
          </article>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">WeChat: {WECHAT_ID}</p>
    </main>
  );
}
