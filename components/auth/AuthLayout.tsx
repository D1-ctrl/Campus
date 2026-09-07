import type { ReactNode } from "react";
import Link from "next/link";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
};

// Login/Registrieren/Onboarding sind bewusst immer hell (nicht Dark-Mode-
// abhaengig) und komplett eigenstaendig gestaltet, unabhaengig vom Rest der App.
export default function AuthLayout({
  title,
  subtitle,
  children,
  maxWidth = "max-w-sm",
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-[#F2F2F2] px-6 py-12">
      <Link href="/" className="mb-10 text-3xl font-bold tracking-tight text-[#252525]">
        Kampus
      </Link>
      <div className={`w-full ${maxWidth} rounded-[28px] bg-white p-8 shadow-sm`}>
        <h1 className="text-center text-xl font-bold text-[#252525]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-center text-sm text-[#727272]">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
