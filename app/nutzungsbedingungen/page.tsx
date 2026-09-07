export const metadata = {
  title: "Nutzungsbedingungen – Campus",
};

export default function NutzungsbedingungenPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 text-sm text-zinc-700 dark:text-zinc-300">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Nutzungsbedingungen</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">1. Geltungsbereich</h2>
        <p>
          Diese Nutzungsbedingungen gelten für die Nutzung von Campus, einer
          Plattform für Studierende zum Teilen von Lernmaterialien und zum
          Vernetzen mit Kommiliton:innen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">2. Registrierung</h2>
        <p>
          Für die Nutzung ist ein Konto erforderlich. Du bist dafür verantwortlich,
          wahrheitsgemäße Angaben zu machen und deine Zugangsdaten geheim zu halten.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">3. Inhalte</h2>
        <p>
          Für von dir hochgeladene Inhalte (Dokumente, Bilder, Beiträge) bist du
          selbst verantwortlich. Du darfst nur Inhalte hochladen, an denen du die
          erforderlichen Rechte besitzt, und keine Rechte Dritter verletzen. Campus
          behält sich vor, Inhalte zu entfernen, die gegen diese Bedingungen oder
          geltendes Recht verstoßen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">4. Verhaltensregeln</h2>
        <p>
          Ein respektvoller Umgang miteinander wird vorausgesetzt. Beleidigende,
          diskriminierende oder illegale Inhalte sind nicht gestattet und können zur
          Sperrung des Kontos führen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">5. Verfügbarkeit</h2>
        <p>
          Campus befindet sich in aktiver Entwicklung. Wir übernehmen keine Gewähr
          für eine ununterbrochene Verfügbarkeit der Plattform.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">6. Änderungen</h2>
        <p>
          Wir können diese Nutzungsbedingungen bei Bedarf anpassen. Über wesentliche
          Änderungen informieren wir dich in der App.
        </p>
      </section>

      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
        Hinweis: Dies ist ein allgemeiner Entwurf, ersetzt aber keine rechtliche
        Prüfung durch eine fachkundige Person vor einem öffentlichen Launch.
      </p>
    </main>
  );
}
