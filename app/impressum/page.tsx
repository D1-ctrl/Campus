export const metadata = {
  title: "Impressum – Campus",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Impressum</h1>

      <section className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        <p className="font-medium">Angaben gemäß § 5 TMG</p>
        <p>[DEIN VOR- UND NACHNAME]</p>
        <p>[DEINE STRASSE UND HAUSNUMMER]</p>
        <p>[PLZ UND ORT]</p>
        <p>Deutschland</p>
      </section>

      <section className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        <p className="font-medium">Kontakt</p>
        <p>E-Mail: [DEINE-KONTAKT-EMAIL@BEISPIEL.DE]</p>
      </section>

      <section className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        <p className="font-medium">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</p>
        <p>[DEIN VOR- UND NACHNAME, ANSCHRIFT WIE OBEN]</p>
      </section>

      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
        Hinweis: Diese Seite enthält noch Platzhalter. Bevor Campus öffentlich beworben
        wird, müssen die eckigen Klammern durch echte Angaben ersetzt werden – ein
        Impressum ist in Deutschland für öffentlich erreichbare Websites gesetzlich
        vorgeschrieben (§ 5 TMG).
      </p>
    </main>
  );
}
