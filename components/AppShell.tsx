"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AUTH_FLOW_PREFIXES } from "@/components/OnboardingGate";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isAuthRoute = AUTH_FLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (loading) {
    return null;
  }

  // Login/Registrieren/Onboarding haben ihr eigenes, immer helles Design und
  // brauchen weder Sidebar/TopBar noch die "Login/Registrieren"-Kopfzeile.
  if (isAuthRoute) {
    return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
  }

  if (!user) {
    return (
      <>
        <header className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10 md:px-6 md:py-4">
          <Link href="/" className="truncate text-base font-semibold md:text-lg">
            Kampus
          </Link>
          <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm hover:underline">
              Login
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-sm text-white transition-colors hover:bg-accent/90 md:px-4"
            >
              Registrieren
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <MobileTopBar />
        <div className="flex flex-1 flex-col pb-16 md:pb-0">{children}</div>
        <MobileBottomNav />
      </div>
    </div>
  );
}
