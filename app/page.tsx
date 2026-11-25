"use client";

import { useEffect, useState } from "react";
import { dicts, LANGS, WECHAT_ID } from "@/lib/i18n";
import type { ContactMethod, Lang, Status } from "@/lib/types";
import { BUSINESS_TYPES, CONTACT_METHODS, SIMPLE_SERVICES } from "@/lib/types";

function WeChatCopy({ label, copiedLabel }: { label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = WECHAT_ID;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white border border-line px-3 py-1.5 text-sm font-medium">
      <span className="text-brand font-semibold">{WECHAT_ID}</span>
      <button
        type="button"
        onClick={copy}
        className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
      >
        {copied ? copiedLabel : label}
      </button>
    </span>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-extrabold ${
        checked ? "border-brand bg-brand text-white" : "border-line bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`${className} font-extrabold tracking-tight`}>
      <span className="text-ink">Glow</span>
      <span className="text-brand">Sis</span>
    </span>
  );
}

const LANGUAGE_OPTIONS = ["English", "Chinese", "Korean"] as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("glow-nyc-lang");
    if (saved === "en" || saved === "zh" || saved === "ko") setLang(saved);
  }, []);
  function chooseLang(next: Lang) {
    setLang(next);
    window.localStorage.setItem("glow-nyc-lang", next);
  }

  const t = dicts[lang];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 1. Business name
  const [businessName, setBusinessName] = useState("");
  // 2. City and ZIP
  const [cityZip, setCityZip] = useState("");
  // 3. Business type (pick one)
  const [businessType, setBusinessType] = useState("");
  // 4. Services (pick any, one level only)
  const [services, setServices] = useState<string[]>([]);
  // 5. Your name
  const [contactName, setContactName] = useState("");
  // 6. Best way to reach you
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
  const [contactValue, setContactValue] = useState("");
  // 7. Languages (optional, none selected by default)
  const [languages, setLanguages] = useState<string[]>([]);
  // 8. Price-list checkbox (optional)
  const [priceList, setPriceList] = useState(false);
  // Single required consent checkbox
  const [consent, setConsent] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; status: Status } | null>(null);

  function toggleLanguage(l: string) {
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }
  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (
      !businessName.trim() ||
      !cityZip.trim() ||
      !businessType ||
      services.length === 0 ||
      !contactName.trim()
    ) {
      return setError(t.formRequired);
    }
    if (!contactValue.trim()) return setError(t.formContactRequired);
    if (contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue.trim())) {
      return setError(t.formEmailInvalid);
    }
    if (!consent) return setError(t.formConsentRequired);
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_name: businessName.trim(),
          address: cityZip.trim(),
          neighborhood: "",
          contact_name: contactName.trim(),
          email: contactMethod === "email" ? contactValue.trim() : "",
          phone:
            contactMethod === "phone"
              ? contactValue.trim()
              : contactMethod === "wechat"
                ? `WeChat: ${contactValue.trim()}`
                : "",
          consultation_contact: "",
          languages,
          licensed: true,
          about: "",
          treatments: services.join(", "),
          hours: "",
          cases_opt_in: false,
          price_rows: [],
          price_note: priceList,
          terms: true,
          services,
          services_other: "",
          doctors_count: "",
          applicant_affiliation: "",
          applicant_position: "",
          entry_type: "",
          referral_source: "",
          event_support: "",
          business_type: dicts.en.businessTypes[businessType] ?? businessType,
          contact_method: contactMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || t.formError);
      setSubmitted({ id: data.application.id, status: data.application.status });
      document.getElementById("submitted")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setError(t.formError);
    } finally {
      setSubmitting(false);
    }
  }

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];
  const steps = [
    { n: "01", title: t.step1Title, body: t.step1Body },
    { n: "02", title: t.step2Title, body: t.step2Body },
    { n: "03", title: t.step3Title, body: t.step3Body },
  ];
  const tracker: { key: Status; label: string }[] = [
    { key: "submitted", label: t.statuses.submitted },
    { key: "in_review", label: t.statuses.in_review },
    { key: "live", label: t.statuses.live },
  ];

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";
  const labelCls = "block text-sm font-semibold mb-1.5";
  const pill = (selected: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-medium ${
      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:border-brand"
    }`;

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <a href="#" aria-label="GlowSis">
            <Logo />
          </a>
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
            <a href="#how" className="hover:text-ink">{t.navHow}</a>
            <a href="#faq" className="hover:text-ink">{t.navFaq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => chooseLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    lang === l.code ? "bg-ink text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <a
              href="#apply"
              className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:block"
            >
              {t.navApply}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{t.heroEyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{t.heroSub}</p>
          <p className="mt-6 inline-block rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand-dark">
            {t.heroBadge}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t.heroNote}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#apply" className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark">
              {t.heroCta}
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{t.heroWechatLabel}</span>
            <WeChatCopy label={t.copy} copiedLabel={t.copied} />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 pb-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{t.howTitle}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-white p-5">
                <p className="text-sm font-extrabold text-brand">{s.n}</p>
                <p className="mt-1 font-bold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white">{t.parityNote}</p>
        </section>

        {submitted && (
          <section id="submitted" className="scroll-mt-20 py-6">
            <div className="rounded-3xl border-2 border-brand bg-brand-soft p-6">
              <h2 className="text-xl font-extrabold text-brand-dark">{t.successTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed">{t.successBody}</p>
              <p className="mt-3 text-sm">
                {t.successId}: <span className="font-mono font-bold">{submitted.id}</span>
              </p>
              <h3 className="mt-5 font-bold">{t.trackerTitle}</h3>
              <ol className="mt-3 flex flex-col gap-2 sm:flex-row">
                {tracker.map((s, i) => {
                  const active = tracker.findIndex((x) => x.key === submitted.status) >= i;
                  return (
                    <li
                      key={s.key}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        active ? "border-brand bg-white text-brand-dark" : "border-line bg-white/60 text-muted"
                      }`}
                    >
                      {i + 1}. {s.label}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-3 text-xs text-muted">{t.trackerNote}</p>
            </div>
          </section>
        )}

        <section id="apply" className="scroll-mt-20 py-8">
          <h2 className="text-2xl font-extrabold tracking-tight">{t.applyTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t.applySub}</p>
          <p className="mt-1 text-xs text-muted">{t.applyNote}</p>

          <form onSubmit={submit} className="mt-6 space-y-6 rounded-3xl border border-line bg-white p-5 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="business_name">{t.formBusinessName}</label>
                <input
                  id="business_name"
                  className={inputCls}
                  placeholder={t.formBusinessNamePh}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="city_zip">{t.formCityZip}</label>
                <input
                  id="city_zip"
                  className={inputCls}
                  placeholder={t.formCityZipPh}
                  value={cityZip}
                  onChange={(e) => setCityZip(e.target.value)}
                />
              </div>
            </div>

            <div>
              <span className={labelCls}>{t.formBusinessType}</span>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((b) => (
                  <label key={b} className={pill(businessType === b)}>
                    <input
                      type="radio"
                      className="sr-only"
                      name="business_type"
                      checked={businessType === b}
                      onChange={() => setBusinessType(b)}
                    />
                    {t.businessTypes[b]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className={labelCls}>{t.formServices}</span>
              <div className="flex flex-wrap gap-2">
                {SIMPLE_SERVICES.map((s) => {
                  const on = services.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      aria-pressed={on}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${
                        on ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:border-brand"
                      }`}
                    >
                      <CheckBox checked={on} />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="contact_name">{t.formContactName}</label>
              <input
                id="contact_name"
                className={inputCls}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <span className={labelCls}>{t.formContactMethod}</span>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                <select
                  className={inputCls}
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                  aria-label={t.formContactMethod}
                >
                  {CONTACT_METHODS.map((m) => (
                    <option key={m} value={m}>{t.contactMethods[m]}</option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  type={contactMethod === "email" ? "email" : contactMethod === "phone" ? "tel" : "text"}
                  placeholder={t.contactPh[contactMethod]}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                />
              </div>
            </div>

            <div>
              <span className={labelCls}>{t.formLanguages}</span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <label key={l} className={pill(languages.includes(l))}>
                    <input type="checkbox" className="sr-only" checked={languages.includes(l)} onChange={() => toggleLanguage(l)} />
                    {t.languages[l]}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#d6336c]"
                checked={priceList}
                onChange={(e) => setPriceList(e.target.checked)}
              />
              <span>{t.formPriceList}</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-cream p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#d6336c]"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>{t.formConsent}</span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50 md:w-auto"
            >
              {submitting ? t.formSubmitting : t.formSubmit}
            </button>
          </form>
        </section>

        <section id="faq" className="scroll-mt-20 py-10">
          <h2 className="text-2xl font-extrabold tracking-tight">{t.faqTitle}</h2>
          <div className="mt-5 space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold" aria-expanded={openFaq === i}>
                  <span>{f.q}</span>
                  <span className="text-brand">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <div>
            <Logo className="text-base" />
            <p className="mt-1">{t.footerTag}</p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed">{t.footerNote}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{t.footerWechat}:</span>
            <WeChatCopy label={t.copy} copiedLabel={t.copied} />
          </div>
        </div>
      </footer>
    </div>
  );
}
