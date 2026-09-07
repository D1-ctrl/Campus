export const metadata = {
  title: "Datenschutzerklärung – Campus",
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 text-sm text-zinc-700 dark:text-zinc-300">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Datenschutzerklärung
        </h1>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Stand: {new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" })}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist die im{" "}
          <a href="/impressum" className="underline">
            Impressum
          </a>{" "}
          genannte Person.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">2. Welche Daten wir verarbeiten</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <span className="font-medium">Account-Daten:</span> E-Mail-Adresse, Anzeigename,
            Benutzername, optional Profilbild, Universität und Studiengang – bei der
            Registrierung und im Profil.
          </li>
          <li>
            <span className="font-medium">Inhalte:</span> von dir hochgeladene Dokumente,
            Bilder, Beiträge, Kommentare, Umfragen und Nachrichten.
          </li>
          <li>
            <span className="font-medium">Nutzungsdaten:</span> z. B. welche Kurse/Gruppen du
            beigetreten bist, Downloads, Bewertungen, Likes.
          </li>
          <li>
            <span className="font-medium">Technische Daten:</span> ein lokal in deinem
            Browser gespeichertes Sitzungs-Token (localStorage) hält dich eingeloggt;
            eine Einstellung für Hell-/Dunkelmodus wird ebenfalls lokal gespeichert.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">3. Hosting & Auftragsverarbeitung</h2>
        <p>
          Diese Anwendung wird bei Vercel Inc. gehostet, Datenbank, Authentifizierung
          und Datei-Speicher laufen über Supabase Inc. Beide Anbieter verarbeiten Daten
          in unserem Auftrag. Mit beiden Anbietern besteht bzw. wird ein
          Auftragsverarbeitungsvertrag (AVV) abgeschlossen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">4. E-Mail-Versand</h2>
        <p>
          Für Bestätigungs- und Sicherheits-E-Mails (z. B. Registrierung,
          Passwort-Zurücksetzen) nutzen wir einen externen E-Mail-Dienstleister
          (Resend). Dabei werden deine E-Mail-Adresse und der E-Mail-Inhalt an diesen
          Dienstleister übermittelt.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">5. Werbung</h2>
        <p>
          Campus zeigt gelegentlich eigene Werbeanzeigen (kein Drittanbieter-Werbenetzwerk,
          kein Tracking durch externe Werbeanbieter). Diese Anzeigen werden aus unserer
          eigenen Datenbank geladen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">6. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung deiner Daten sowie auf Datenübertragbarkeit. Wende dich dazu an
          die im Impressum genannte Kontakt-E-Mail-Adresse. Viele Einstellungen (z. B.
          Profil bearbeiten, Beiträge löschen) kannst du auch direkt in der App selbst
          vornehmen.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-[var(--foreground)]">7. Speicherdauer</h2>
        <p>
          Wir speichern deine Daten, solange dein Konto besteht. Nach Löschung deines
          Kontos werden deine Daten gemäß den gesetzlichen Aufbewahrungspflichten
          entfernt bzw. anonymisiert.
        </p>
      </section>

      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
        Hinweis: Dies ist ein allgemeiner Entwurf auf Basis der tatsächlichen
        App-Funktionen, ersetzt aber keine rechtliche Prüfung durch eine
        fachkundige Person vor einem öffentlichen Launch.
      </p>
    </main>
  );
}
