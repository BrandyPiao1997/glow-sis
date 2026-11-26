import { redirect } from "next/navigation";

// Onboarding IS the AI assistant chat (conversational, not a stepped form).
// /onboarding stays as a stable entry point (linked from /profile) that
// sends users to the chat.
export default function OnboardingPage() {
  redirect("/ai");
}
