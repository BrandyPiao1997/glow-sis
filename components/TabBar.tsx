"use client";

import { usePathname } from "next/navigation";
import { dicts } from "@/lib/i18n";
import { useSavedLang } from "@/components/site";

// Mobile app shell: bottom tab bar, small screens only (md:hidden).
// Desktop keeps the existing header unchanged.
// Unni-style: exactly 3 tabs, with the center AI tab highlighted by a
// filled 4-point star. Compare still exists at /compare, just unlinked.
export default function TabBar() {
  const pathname = usePathname();
  const { lang } = useSavedLang();
  const t = dicts[lang];

  const homeIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
  // Filled 4-point star, like Unni's center "Unni AI" tab.
  const starIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-ink" aria-hidden>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
    </svg>
  );
  const personIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );

  const tabs = [
    {
      href: "/",
      label: t.tabHome,
      icon: homeIcon,
      active: pathname === "/" || pathname === "/browse",
      center: false,
    },
    {
      href: "/ai",
      label: t.tabAi,
      icon: starIcon,
      active: pathname === "/ai" || pathname.startsWith("/ai/"),
      center: true,
    },
    {
      href: "/profile",
      label: t.tabProfile,
      icon: personIcon,
      active: pathname === "/profile",
      center: false,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 backdrop-blur md:hidden"
      aria-label="App"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-3">
        {tabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              tab.center
                ? `font-bold ${tab.active ? "text-ink" : "text-muted"}`
                : `font-semibold ${tab.active ? "text-brand" : "text-muted"}`
            }`}
          >
            {tab.icon}
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
