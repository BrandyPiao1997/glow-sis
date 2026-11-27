"use client";

import type { Dict } from "@/lib/i18n";

// Simple city picker — location selection is by city only, no
// neighborhoods. Tapping a city selects it and closes the picker.
export default function LocationPicker({
  t,
  cities,
  city,
  onSelectCity,
  onClose,
}: {
  t: Dict;
  cities: string[];
  /** "" = all locations. */
  city: string;
  onSelectCity: (city: string) => void;
  onClose: () => void;
}) {
  const pick = (c: string) => {
    onSelectCity(c);
    onClose();
  };
  const rowCls = (active: boolean) =>
    `block w-full px-5 py-3 text-left text-sm ${
      active ? "bg-brand-soft font-bold text-brand-dark" : "font-medium text-ink hover:bg-cream"
    }`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.browseLocation}
    >
      <button
        type="button"
        aria-label={t.locClose}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-lg font-extrabold">{t.browseLocation}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.locClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted hover:bg-cream hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto py-2">
          <button type="button" onClick={() => pick("")} className={rowCls(city === "")}>
            {t.browseAllLocations}
          </button>
          {cities.map((c) => (
            <button key={c} type="button" onClick={() => pick(c)} className={rowCls(city === c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
