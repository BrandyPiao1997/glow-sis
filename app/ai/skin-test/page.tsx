"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { SiteFooter, SiteHeader, useSavedLang } from "@/components/site";
import SkinRadar from "@/components/SkinRadar";
import { analyzeSkin, saveSkinReport, type SkinReport } from "@/lib/skin-analysis";

type Step = "capture" | "analyzing" | "report" | "done";

export default function SkinTestPage() {
  const { lang, chooseLang } = useSavedLang();
  const t = dicts[lang];
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [report, setReport] = useState<SkinReport | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBlob(file);
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function analyze() {
    if (!photoBlob) return;
    setStep("analyzing");
    const result = await analyzeSkin(photoBlob);
    setReport(result);
    setStep("report");
  }

  // The report is saved on this device so the AI chat can show it as
  // context. No account, no profile setup — just the result.
  function finishReport() {
    if (!report) return;
    saveSkinReport(report);
    setStep("done");
  }

  const chipCls = (selected: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium ${
      selected ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white hover:border-brand"
    }`;

  const dims: { label: string; value: number }[] = report
    ? [
        { label: t.stSensitivity, value: report.dimensions.sensitivity },
        { label: t.stSkinTone, value: report.dimensions.skinTone },
        { label: t.stSkinTexture, value: report.dimensions.skinTexture },
        { label: t.stSkinAge, value: report.dimensions.skinAge },
      ]
    : [];

  return (
    <div className="flex-1">
      <SiteHeader t={t} lang={lang} chooseLang={chooseLang} active="ai" />
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <div className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => router.push("/ai")}
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            ← {t.aiTitle}
          </button>
        </div>

        <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          {t.stTitle}
        </h1>

        {step === "capture" && (
          <section className="mt-6">
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="font-bold">{t.stGuideTitle}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
                <li>{t.stGuide1}</li>
                <li>{t.stGuide2}</li>
                <li>{t.stGuide3}</li>
              </ul>
              <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs leading-relaxed text-muted">
                {t.stPrivacy}
              </p>
            </div>

            {photoUrl && (
              <div className="mt-6">
                {/* Preview only — the photo is never uploaded or stored. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Selfie preview"
                  className="mx-auto max-h-72 rounded-3xl object-cover"
                />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark"
              >
                {t.stTakePhoto}
              </button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="w-full rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold hover:border-brand"
              >
                {t.stUpload}
              </button>
              {photoBlob && (
                <button
                  type="button"
                  onClick={() => void analyze()}
                  className="w-full rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white hover:bg-black"
                >
                  {t.stAnalyze}
                </button>
              )}
            </div>
          </section>
        )}

        {step === "analyzing" && (
          <section className="mt-16 flex flex-col items-center text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
            <p className="mt-4 text-sm font-semibold">{t.stAnalyzing}</p>
          </section>
        )}

        {step === "report" && report && (
          <section className="mt-6">
            {report.isPlaceholder && (
              <p className="rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-muted">
                {t.stSample}
              </p>
            )}
            <div className="mt-4 rounded-3xl border border-line bg-white p-5 text-center">
              <p className="text-sm font-semibold text-muted">{t.stOverall}</p>
              <p className="mt-1 text-5xl font-extrabold">{report.overall}</p>
              <p className="mt-2 text-sm font-semibold">
                {t.stBetterThan.replace("{pct}", String(report.betterThanPct))}
              </p>
              <div className="mt-4">
                <SkinRadar scores={report.dimensions} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                {dims.map((d) => (
                  <div key={d.label} className="rounded-2xl bg-cream px-3 py-2">
                    <p className="text-xs text-muted">{d.label}</p>
                    <p className="text-lg font-extrabold">{d.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-left">
                <p className="text-sm font-bold">{t.stTopConcerns}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.concerns.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark"
                    >
                      {(t.concernNames as Record<string, string>)[c] ?? c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => finishReport()}
              className="mt-6 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              {t.stContinue}
            </button>
          </section>
        )}

        {step === "done" && (
          <section className="mt-6 rounded-3xl border border-line bg-white p-5 text-center">
            <p className="text-2xl font-extrabold">{t.aiDoneTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.stSaved}</p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="/ai"
                className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-dark"
              >
                {t.stBackToChat}
              </a>
              <a
                href="/browse"
                className="w-full rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold hover:border-brand"
              >
                {t.stBrowse}
              </a>
            </div>
          </section>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted">{t.aiDisclaimer}</p>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
