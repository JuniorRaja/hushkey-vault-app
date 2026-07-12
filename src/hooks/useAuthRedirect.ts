/**
 * useAuthRedirect - Reads auth + onboarding stores and returns the current routing state.
 * Used by App.tsx to decide which top-level view to render.
 */

import { useAuthStore } from "../stores/auth";
import { useOnboardingStore } from "../stores/onboarding";

export type AppView = "loading" | "login" | "onboarding" | "app";

export function useAuthRedirect(): AppView {
  const { isLoading, user, isUnlocked, hasPinSet } = useAuthStore();
  const { isActive: onboardingActive } = useOnboardingStore();

  if (isLoading) return "loading";

  // Not authenticated at all
  if (!user) return "login";

  // Authenticated but onboarding in progress (new user after signup)
  if (onboardingActive) return "onboarding";

  // Authenticated but PIN not yet set — only route to onboarding if the flow
  // is actively in progress (onboardingActive).
  if (!hasPinSet) return "login";

  // Authenticated + PIN set but vault locked
  if (!isUnlocked) return "login";

  // Fully authenticated and unlocked
  return "app";
}
