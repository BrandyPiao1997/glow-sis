// Simple admin protection: a shared ADMIN_PASSWORD env var.
// If it is unset, admin access is allowed but flagged as a dev-only
// warning (see /admin). Set ADMIN_PASSWORD in Vercel before sharing.
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkAdminPassword(candidate: string | null | undefined): boolean {
  if (!adminConfigured()) return true; // dev only — flagged in the UI
  return Boolean(candidate) && candidate === process.env.ADMIN_PASSWORD;
}

// localStorage key for where to return after an OAuth sign-in
// (set by AuthButtons before redirect, read by /auth/callback).
export const POST_AUTH_KEY = "glow-sis-post-auth";
