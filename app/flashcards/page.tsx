"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function FlashcardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return null;
  }

  if (showComingSoon) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Demnächst verfügbar</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Die KI-Karteikarten-Funktion ist noch in Arbeit. Wir sagen dir Bescheid,
          sobald es losgeht!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">
        Aus Folien werden Fragen – mit nur einem Klick!
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Lade deine Unterlagen hoch oder gib eine URL ein und erhalte sofort
        deinen persönlichen Fragenkatalog.
      </p>

      <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg bg-accent text-center text-white transition-colors hover:bg-accent/90">
        <span className="text-2xl">⬆</span>
        <span className="px-4 text-sm">
          {file ? file.name : "Klicke, um eine Datei hochzuladen"}
        </span>
        <input
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <input
        type="text"
        placeholder="Füge einen Link ein"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
      />

      <button
        onClick={() => setShowComingSoon(true)}
        disabled={!file && !link.trim()}
        className="rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        Fragen generieren
      </button>
    </div>
  );
}
