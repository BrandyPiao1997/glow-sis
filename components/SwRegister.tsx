"use client";

import { useEffect } from "react";

// Registers the PWA service worker once, on the client only.
// Safe to no-op in browsers without service worker support.
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure (e.g. non-HTTPS preview) is non-fatal.
      });
    }
  }, []);
  return null;
}
