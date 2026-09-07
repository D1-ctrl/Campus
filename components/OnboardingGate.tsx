"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export const AUTH_FLOW_PREFIXES = [
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function OnboardingGate() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.onboarding_completed_at) return;
    if (profile.is_admin) return;
    if (AUTH_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    router.push("/onboarding");
  }, [loading, user, profile, pathname, router]);

  return null;
}
