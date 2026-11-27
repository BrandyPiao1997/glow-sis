"use client";

import type { Dict } from "@/lib/i18n";

// Unni-style location picker: regions on the left, neighborhoods on the
// right with checkboxes. Tapping a city filters to that city right away
// (all of its neighborhoods); checking neighborhoods narrows it further.
// "All of {city}" (nothing checked) means the whole city. Nothing is
// applied on close — the filter updates live as you tap.
export default function LocationPicker({
  t,
  cities,
  neighborhoods,
  city,
  selected,
  onSelectCity,
  onToggleNeighborhood,
  onClose,
}: {
  t: Dict;
  cities: string[];
  /** Neighborhoods of the currently selected city. */
  neighborhoods: string[];
  /** "" = all locations. */
  city: string;
  /** Selected neighborhoods within `city`; empty = the whole city. */
  selected: string[];
  onSelectCity: (city: string) => void;
  onToggleNeighborhood: (n: string) => void;
  onClose: () => void;
}) {
  const cityBtn = (c: string, active: boolean) =>
    `block w-full px-4 py-2.5 text-left text-sm ${
      active ? "bg-white font-bold text-brand-dark" : "font-medium text-muted hover:text-ink"
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
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
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

        <div className="flex min-h-0 flex-1">
          <div className="w-32 shrink-0 overflow-y-auto border-r border-line bg-cream/60 py-2 sm:w-44">
            <button type="button" onClick={() => onSelectCity("")} className={cityBtn("", city === "")}>
              {t.browseAllLocations}
            </button>
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onSelectCity(c)}
                className={cityBtn(c, city === c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            {!city ? (
              <p className="text-sm leading-relaxed text-muted">{t.browseSelectCityFirst}</p>
            ) : (
              <div className="flex flex-col">
                <label className="flex cursor-pointer items-center gap-2.5 border-b border-line py-2.5 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[#d6336c]"
                    checked={selected.length === 0}
                    onChange={() => onToggleNeighborhood("")}
                  />
                  {t.locAllInCity.replace("{city}", city)}
                </label>
                {neighborhoods.map((n) => (
                  <label
                    key={n}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-line py-2.5 text-sm last:border-0"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-[#d6336c]"
                      checked={selected.includes(n)}
                      onChange={() => onToggleNeighborhood(n)}
                    />
                    <span className="min-w-0 truncate">{n}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            {t.locDone}
          </button>
        </div>
      </div>
    </div>
  );
}
