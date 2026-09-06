"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="text-xl font-semibold">Etwas ist schiefgelaufen</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Das war ein unerwarteter Fehler. Versuch es gerne nochmal.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent/90"
      >
        Erneut versuchen
      </button>
    </main>
  );
}
