import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import TabBar from "@/components/TabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlowSis — Find trusted beauty providers",
  description: "GlowSis - help you make the beauty choice with confidence",
  manifest: "/manifest.webmanifest",
  // Icons come from the file conventions: app/icon.tsx (192 + 512) and
  // app/apple-icon.tsx (180). No explicit icons here to avoid duplicates.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GlowSis",
  },
};

export const viewport: Viewport = {
  themeColor: "#d6336c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-16 md:pb-0">
        <SwRegister />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
