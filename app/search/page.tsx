"use client";

import { useRouter } from "next/navigation";
import GlobalSearch from "@/components/GlobalSearch";

export default function SearchPage() {
  const router = useRouter();

  return (
    <main className="flex w-full flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Zurück"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg hover:bg-black/[.04] dark:hover:bg-white/10"
        >
          ←
        </button>
        <GlobalSearch alwaysOpen autoFocus />
      </div>
    </main>
  );
}
