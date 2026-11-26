"use client";

import { usePathname } from "next/navigation";

// Mobile app shell: bottom tab bar, small screens only (md:hidden).
// Desktop keeps the existing header unchanged.
const TABS = [
  {
    href: "/",
    label: "Browse",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M8 3v18" />
        <path d="M16 3v18" />
        <rect x="3" y="7" width="5" height="6" rx="1" />
        <rect x="16" y="11" width="5" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/ai",
    label: "AI",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 backdrop-blur md:hidden"
      aria-label="App"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-4">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" || pathname === "/browse" : pathname === tab.href;
          return (
            <a
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
