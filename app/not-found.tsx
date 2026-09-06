import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Die Seite, die du suchst, gibt es nicht (mehr) oder wurde verschoben.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent/90"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}
